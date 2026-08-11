import assert from "node:assert/strict";
import test from "node:test";
import {handleRequest, validateMessages} from "../worker/index.mjs";

function createEnv(overrides = {}) {
    return {
        OPENAI_MODEL: "gpt-5.6-luna",
        ALLOWED_ORIGINS: "https://shuaigaodada.github.io",
        OPENAI_SAFETY_SALT: "test-salt",
        API_RATE_LIMITER: {limit: async () => ({success: true})},
        ...overrides
    };
}

class FakeD1 {
    constructor() {
        this.rows = [];
    }

    prepare(sql) {
        const database = this;
        return {
            sql,
            parameters: [],
            bind(...parameters) {
                this.parameters = parameters;
                return this;
            },
            async run() {
                if(sql.includes("INSERT INTO user_messages")) {
                    const [id, conversation_id, visitor_id, content, model] = this.parameters;
                    if(!database.rows.some(row => row.id === id))
                        database.rows.push({id, conversation_id, visitor_id, content, model, created_at: "2026-08-11 03:00:00"});
                    return {meta: {changes: 1}};
                }
                if(sql.includes("DELETE FROM user_messages")) {
                    const index = database.rows.findIndex(row => row.id === this.parameters[0]);
                    if(index < 0) return {meta: {changes: 0}};
                    database.rows.splice(index, 1);
                    return {meta: {changes: 1}};
                }
                throw new Error(`Unexpected run: ${sql}`);
            }
        };
    }

    async batch(statements) {
        return statements.map(statement => {
            if(statement.sql.includes("COUNT(*) AS total FROM user_messages"))
                return {results: [{total: this.rows.length}]};
            if(statement.sql.includes("SELECT id, conversation_id"))
                return {results: [...this.rows].reverse()};
            if(statement.sql.includes("COUNT(DISTINCT visitor_id)"))
                return {results: [{total: this.rows.length, today: this.rows.length, visitors: new Set(this.rows.map(row => row.visitor_id)).size}]};
            throw new Error(`Unexpected batch query: ${statement.sql}`);
        });
    }
}

test("Worker validates conversation input", () => {
    assert.deepEqual(validateMessages([{role: "user", content: "你好"}]), {
        messages: [{role: "user", content: "你好"}]
    });
    assert.match(validateMessages([]).error, /非空数组/);
    assert.match(validateMessages([{role: "system", content: "test"}]).error, /格式不正确/);
    assert.match(validateMessages([{role: "assistant", content: "test"}]).error, /最后一条消息/);
});

test("Worker health and CORS only allow configured origins", async () => {
    const env = createEnv();
    const allowed = await handleRequest(new Request("https://worker.example/api/health", {
        headers: {Origin: "https://shuaigaodada.github.io"}
    }), env);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://shuaigaodada.github.io");
    assert.deepEqual(await allowed.json(), {ok: true, configured: false, model: "gpt-5.6-luna", recording: false});

    const blocked = await handleRequest(new Request("https://worker.example/api/health", {
        headers: {Origin: "https://example.com"}
    }), env);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers.get("Access-Control-Allow-Origin"), null);
});

test("Worker enforces request validation and rate limiting", async () => {
    const invalid = await handleRequest(new Request("https://worker.example/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: []})
    }), createEnv({OPENAI_API_KEY: "test-key"}));
    assert.equal(invalid.status, 400);

    const limited = await handleRequest(new Request("https://worker.example/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: [{role: "user", content: "你好"}]})
    }), createEnv({
        OPENAI_API_KEY: "test-key",
        API_RATE_LIMITER: {limit: async () => ({success: false})}
    }));
    assert.equal(limited.status, 429);
});

test("Worker relays typed Responses API events as NDJSON", async t => {
    const originalFetch = globalThis.fetch;
    let upstreamRequest;
    globalThis.fetch = async (url, options) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        upstreamRequest = JSON.parse(options.body);
        return new Response([
            'data: {"type":"response.created"}\n\n',
            'data: {"type":"response.output_text.delta","delta":"你"}\n\n',
            'data: {"type":"response.output_text.delta","delta":"好"}\n\n',
            'data: {"type":"response.completed"}\n\n'
        ].join(""), {headers: {"Content-Type": "text/event-stream"}});
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const response = await handleRequest(new Request("https://worker.example/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "test"
        },
        body: JSON.stringify({messages: [{role: "user", content: "打个招呼"}]})
    }), createEnv({OPENAI_API_KEY: "test-key"}));

    assert.equal(response.status, 200);
    assert.match(response.headers.get("Content-Type"), /application\/x-ndjson/);
    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(events, [
        {type: "delta", delta: "你"},
        {type: "delta", delta: "好"}
    ]);
    assert.equal(upstreamRequest.model, "gpt-5.6-luna");
    assert.equal(upstreamRequest.store, false);
    assert.equal(upstreamRequest.stream, true);
    assert.deepEqual(upstreamRequest.reasoning, {effort: "low", context: "current_turn"});
});

test("Worker emits only one client error for a failed stream", async t => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response([
        'data: {"type":"error","code":"credit_balance_exhausted","error":{"type":"insufficient_quota"}}\n\n',
        'data: {"type":"response.failed","response":{"error":{"code":"credit_balance_exhausted"}}}\n\n'
    ].join(""), {headers: {"Content-Type": "text/event-stream"}});
    t.after(() => { globalThis.fetch = originalFetch; });

    const response = await handleRequest(new Request("https://worker.example/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: [{role: "user", content: "你好"}]})
    }), createEnv({OPENAI_API_KEY: "test-key"}));

    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(events, [{type: "error", error: "AI 服务返回了一个错误。"}]);
});

test("Worker records one user message and protects admin listing and deletion", async t => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response([
        'data: {"type":"response.output_text.delta","delta":"收到"}\n\n'
    ].join(""), {headers: {"Content-Type": "text/event-stream"}});
    t.after(() => { globalThis.fetch = originalFetch; });

    const database = new FakeD1();
    const env = createEnv({
        OPENAI_API_KEY: "test-key",
        ADMIN_TOKEN: "a-long-admin-token",
        MESSAGE_DB: database
    });
    const pending = [];
    const response = await handleRequest(new Request("https://worker.example/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1"},
        body: JSON.stringify({
            messages: [{role: "user", content: "请记录这条消息"}],
            conversationId: "conversation_1234",
            messageId: "message_12345678"
        })
    }), env, {waitUntil(promise) { pending.push(promise); }});
    assert.equal(response.status, 200);
    await Promise.all(pending);
    assert.equal(database.rows.length, 1);
    assert.equal(database.rows[0].content, "请记录这条消息");
    assert.notEqual(database.rows[0].visitor_id, "192.0.2.1");

    const unauthorized = await handleRequest(new Request("https://worker.example/api/admin/messages"), env);
    assert.equal(unauthorized.status, 401);

    const list = await handleRequest(new Request("https://worker.example/api/admin/messages", {
        headers: {Authorization: "Bearer a-long-admin-token"}
    }), env);
    assert.equal(list.status, 200);
    const payload = await list.json();
    assert.equal(payload.messages.length, 1);
    assert.deepEqual(payload.stats, {total: 1, today: 1, visitors: 1});

    const removed = await handleRequest(new Request(`https://worker.example/api/admin/messages/${payload.messages[0].id}`, {
        method: "DELETE",
        headers: {Authorization: "Bearer a-long-admin-token"}
    }), env);
    assert.equal(removed.status, 200);
    assert.equal(database.rows.length, 0);
});
