import assert from "node:assert/strict";
import test from "node:test";
import {callCloudBaseRpc} from "./cloudbase-rpc.mjs";

test("CloudBase RPC uses the supported PostgREST endpoint", async () => {
    let captured;
    const result = await callCloudBaseRpc({
        envId: "example-env",
        apiKey: "test-key",
        functionName: "claim_blackjack_table_route",
        params: {p_table_id: "table-1", p_user_id: "user-1", p_tencent_ms: 20, p_cloudflare_ms: 80},
        fetchImpl: async (url, options) => {
            captured = {url, options};
            return new Response(JSON.stringify({status: "assigned", authority: "tencent"}), {
                status: 200, headers: {"Content-Type": "application/json"}
            });
        }
    });

    assert.equal(captured.url, "https://example-env.api.tcloudbasegateway.com/v1/rdb/rest/rpc/claim_blackjack_table_route");
    assert.equal(captured.options.method, "POST");
    assert.equal(captured.options.headers.Authorization, "Bearer test-key");
    assert.deepEqual(JSON.parse(captured.options.body), {
        p_table_id: "table-1", p_user_id: "user-1", p_tencent_ms: 20, p_cloudflare_ms: 80
    });
    assert.deepEqual(result, {status: "assigned", authority: "tencent"});
});

test("CloudBase RPC surfaces upstream errors", async () => {
    await assert.rejects(() => callCloudBaseRpc({
        envId: "example-env",
        apiKey: "test-key",
        functionName: "claim_blackjack_table_route",
        fetchImpl: async () => new Response(JSON.stringify({message: "function failed"}), {
            status: 400, headers: {"Content-Type": "application/json"}
        })
    }), /function failed/);
});
