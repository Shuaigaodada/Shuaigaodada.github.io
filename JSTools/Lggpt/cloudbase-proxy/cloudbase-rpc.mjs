const FUNCTION_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

function rpcError(message, status = 502) {
    return Object.assign(new Error(message), {status});
}

export async function callCloudBaseRpc({
    envId,
    apiKey,
    functionName,
    params = {},
    timeoutMs = 8_000,
    fetchImpl = fetch
}) {
    if(!envId) throw rpcError("CloudBase environment is not configured.", 503);
    if(!apiKey) throw rpcError("CloudBase API key is not configured.", 503);
    if(!FUNCTION_NAME_PATTERN.test(functionName)) throw rpcError("Invalid database function name.", 500);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(
            `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest/rpc/${functionName}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(params),
                signal: controller.signal
            }
        );
        const payload = await response.json().catch(() => null);
        if(!response.ok) {
            const message = payload?.message || payload?.error || payload?.code || `CloudBase RPC failed with ${response.status}.`;
            throw rpcError(String(message));
        }
        if(payload === null || payload === undefined) throw rpcError("CloudBase RPC returned an empty response.");
        return payload;
    } catch(error) {
        if(error?.name === "AbortError") throw rpcError("CloudBase RPC timed out.", 504);
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
