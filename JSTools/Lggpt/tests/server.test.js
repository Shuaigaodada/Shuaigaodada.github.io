const assert = require("node:assert/strict");
const test = require("node:test");

delete process.env.OPENAI_API_KEY;
const {app, validateMessages} = require("../server");

test("validates conversation input", () => {
    assert.deepEqual(validateMessages([{role: "user", content: "你好"}]), {
        messages: [{role: "user", content: "你好"}]
    });
    assert.match(validateMessages([]).error, /非空数组/);
    assert.match(validateMessages([{role: "system", content: "test"}]).error, /格式不正确/);
    assert.match(validateMessages([{role: "assistant", content: "test"}]).error, /最后一条消息/);
    assert.match(validateMessages([{role: "user", content: "x".repeat(4001)}]).error, /4000/);
});

test("serves the app and reports missing server configuration", async t => {
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const page = await fetch(`${baseUrl}/JSTools/Lggpt/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-security-policy"), /script-src 'self'/);
    assert.match(await page.text(), /Laogao GPT/);

    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
        ok: true,
        configured: false,
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna"
    });

    const invalid = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: []})
    });
    assert.equal(invalid.status, 400);

    const unconfigured = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: [{role: "user", content: "你好"}]})
    });
    assert.equal(unconfigured.status, 503);
    assert.match((await unconfigured.json()).error, /OPENAI_API_KEY/);
});

test("relays typed Responses API text events as NDJSON", async t => {
    const originalFetch = global.fetch;
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    let upstreamRequest;

    global.fetch = async (url, options) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        upstreamRequest = JSON.parse(options.body);
        const stream = [
            'data: {"type":"response.created"}\n\n',
            'data: {"type":"response.output_text.delta","delta":"你"}\n\n',
            'data: {"type":"response.output_text.delta","delta":"好"}\n\n',
            'data: {"type":"response.completed"}\n\n'
        ].join("");
        return new Response(stream, {
            status: 200,
            headers: {"Content-Type": "text/event-stream"}
        });
    };

    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(async () => {
        global.fetch = originalFetch;
        if(originalKey === undefined) delete process.env.OPENAI_API_KEY;
        else process.env.OPENAI_API_KEY = originalKey;
        await new Promise(resolve => server.close(resolve));
    });

    const address = server.address();
    const response = await originalFetch(`http://127.0.0.1:${address.port}/api/chat`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: [{role: "user", content: "打个招呼"}]})
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/x-ndjson/);
    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(events, [
        {type: "delta", delta: "你"},
        {type: "delta", delta: "好"}
    ]);
    assert.equal(upstreamRequest.store, false);
    assert.equal(upstreamRequest.stream, true);
    assert.deepEqual(upstreamRequest.input, [{role: "user", content: "打个招呼"}]);
});
