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
    assert.deepEqual(await allowed.json(), {ok: true, configured: false, model: "gpt-5.6-luna"});

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
