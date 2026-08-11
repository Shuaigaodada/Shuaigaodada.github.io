const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_ALLOWED_ORIGINS = "https://shuaigaodada.github.io";
const MAX_BODY_BYTES = 40 * 1024;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_TOTAL_LENGTH = 24000;
const MAX_ADMIN_PAGE_SIZE = 100;
const RECORD_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

class RequestError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function getAllowedOrigins(env) {
    return new Set((env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean));
}

function getCorsHeaders(request, env) {
    const origin = request.headers.get("Origin");
    const headers = new Headers({
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Max-Age": "86400"
    });

    if(origin && getAllowedOrigins(env).has(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Vary", "Origin");
    }
    return headers;
}

function getBearerToken(request) {
    const authorization = request.headers.get("Authorization") || "";
    return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

async function secretsMatch(actual, expected) {
    if(!actual || !expected) return false;
    const encoder = new TextEncoder();
    const [actualHash, expectedHash] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(actual)),
        crypto.subtle.digest("SHA-256", encoder.encode(expected))
    ]);
    const actualBytes = new Uint8Array(actualHash);
    const expectedBytes = new Uint8Array(expectedHash);
    let difference = 0;
    for(let index = 0; index < actualBytes.length; index++)
        difference |= actualBytes[index] ^ expectedBytes[index];
    return difference === 0;
}

async function requireAdmin(request, env) {
    if(!env.ADMIN_TOKEN)
        return jsonResponse(request, env, {error: "管理员令牌尚未配置。"}, 503);
    if(!await secretsMatch(getBearerToken(request), env.ADMIN_TOKEN))
        return jsonResponse(request, env, {error: "管理员身份验证失败。"}, 401, {"WWW-Authenticate": "Bearer"});
    return null;
}

function isOriginAllowed(request, env) {
    const origin = request.headers.get("Origin");
    return !origin || getAllowedOrigins(env).has(origin);
}

function setSecurityHeaders(headers) {
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function createResponse(request, env, body, init = {}) {
    const headers = new Headers(init.headers);
    for(const [name, value] of getCorsHeaders(request, env)) headers.set(name, value);
    setSecurityHeaders(headers);
    return new Response(body, {...init, headers});
}

function jsonResponse(request, env, data, status = 200, extraHeaders = {}) {
    return createResponse(request, env, JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...extraHeaders
        }
    });
}

export function validateMessages(value) {
    if(!Array.isArray(value) || !value.length)
        return {error: "messages 必须是非空数组。"};
    if(value.length > MAX_MESSAGES)
        return {error: `最多保留 ${MAX_MESSAGES} 条消息。`};

    let totalLength = 0;
    const messages = [];
    for(const message of value) {
        if(!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string")
            return {error: "消息格式不正确。"};

        const content = message.content.trim();
        if(!content || content.length > MAX_MESSAGE_LENGTH)
            return {error: `每条消息必须在 1 到 ${MAX_MESSAGE_LENGTH} 个字符之间。`};

        totalLength += content.length;
        if(totalLength > MAX_TOTAL_LENGTH)
            return {error: "当前对话内容过长，请开始一个新对话。"};
        messages.push({role: message.role, content});
    }

    if(messages[messages.length - 1].role !== "user")
        return {error: "最后一条消息必须来自用户。"};
    return {messages};
}

async function readJsonBody(request) {
    const declaredLength = Number(request.headers.get("Content-Length"));
    if(Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES)
        throw new RequestError(413, "请求内容过大。");
    if(!request.body) throw new RequestError(400, "请求内容不能为空。");

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";

    while(true) {
        const {value, done} = await reader.read();
        if(done) break;
        size += value.byteLength;
        if(size > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new RequestError(413, "请求内容过大。");
        }
        text += decoder.decode(value, {stream: true});
    }
    text += decoder.decode();

    try {
        return JSON.parse(text);
    } catch(error) {
        throw new RequestError(400, "请求内容不是有效的 JSON。");
    }
}

async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function createSafetyIdentifier(request, env) {
    const salt = env.OPENAI_SAFETY_SALT || "laogao-gpt";
    const address = request.headers.get("CF-Connecting-IP") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    return sha256(`${salt}|${address}|${userAgent}`);
}

function normalizeRecordId(value) {
    return typeof value === "string" && RECORD_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

async function recordUserMessage(env, body, messages, visitorId) {
    if(!env.MESSAGE_DB) return;
    const lastMessage = messages[messages.length - 1];
    const id = await sha256(`${visitorId}|${normalizeRecordId(body.messageId)}`);
    await env.MESSAGE_DB.prepare(`
        INSERT INTO user_messages (id, conversation_id, visitor_id, content, model)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
    `).bind(
        id,
        normalizeRecordId(body.conversationId),
        visitorId,
        lastMessage.content,
        env.OPENAI_MODEL || DEFAULT_MODEL
    ).run();
}

function escapeLike(value) {
    return value.replace(/[\\%_]/g, character => `\\${character}`);
}

async function handleAdminMessages(request, env, url) {
    const authError = await requireAdmin(request, env);
    if(authError) return authError;
    if(!env.MESSAGE_DB)
        return jsonResponse(request, env, {error: "消息数据库尚未配置。"}, 503);

    if(request.method === "GET") {
        const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1));
        const pageSize = Math.max(1, Math.min(MAX_ADMIN_PAGE_SIZE, Number.parseInt(url.searchParams.get("pageSize") || "25", 10) || 25));
        const search = (url.searchParams.get("search") || "").trim().slice(0, 200);
        const where = search ? "WHERE content LIKE ? ESCAPE '\\' OR visitor_id = ?" : "";
        const parameters = search ? [`%${escapeLike(search)}%`, search] : [];
        const [countResult, messagesResult, statsResult] = await env.MESSAGE_DB.batch([
            env.MESSAGE_DB.prepare(`SELECT COUNT(*) AS total FROM user_messages ${where}`).bind(...parameters),
            env.MESSAGE_DB.prepare(`
                SELECT id, conversation_id, visitor_id, content, model, created_at
                FROM user_messages ${where}
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?
            `).bind(...parameters, pageSize, (page - 1) * pageSize),
            env.MESSAGE_DB.prepare(`
                SELECT COUNT(*) AS total,
                    SUM(CASE WHEN created_at >= datetime('now', 'start of day') THEN 1 ELSE 0 END) AS today,
                    COUNT(DISTINCT visitor_id) AS visitors
                FROM user_messages
            `)
        ]);
        const total = Number(countResult.results[0]?.total || 0);
        const stats = statsResult.results[0] || {};
        return jsonResponse(request, env, {
            messages: messagesResult.results,
            pagination: {page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize))},
            stats: {
                total: Number(stats.total || 0),
                today: Number(stats.today || 0),
                visitors: Number(stats.visitors || 0)
            }
        });
    }

    const id = decodeURIComponent(url.pathname.slice("/api/admin/messages/".length));
    if(request.method === "DELETE" && RECORD_ID_PATTERN.test(id)) {
        const result = await env.MESSAGE_DB.prepare("DELETE FROM user_messages WHERE id = ?").bind(id).run();
        if(!result.meta.changes)
            return jsonResponse(request, env, {error: "消息不存在。"}, 404);
        return jsonResponse(request, env, {ok: true});
    }
    return jsonResponse(request, env, {error: "接口不存在。"}, 404);
}

function createEventStream(upstreamBody) {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    let errorEmitted = false;

    const emitError = (message, controller) => {
        if(errorEmitted) return;
        errorEmitted = true;
        controller.enqueue(encoder.encode(`${JSON.stringify({type: "error", error: message})}\n`));
    };

    const emitBlock = (block, controller) => {
        const data = block.split(/\r?\n/)
            .filter(line => line.startsWith("data:"))
            .map(line => line.slice(5).trimStart())
            .join("\n")
            .trim();
        if(!data || data === "[DONE]") return;

        let event;
        try {
            event = JSON.parse(data);
        } catch(error) {
            return;
        }

        if(event.type === "response.output_text.delta" && typeof event.delta === "string")
            controller.enqueue(encoder.encode(`${JSON.stringify({type: "delta", delta: event.delta})}\n`));
        else if(event.type === "response.failed") {
            console.error(JSON.stringify({
                event: "openai_stream_failed",
                code: event.response?.error?.code || "unknown",
                errorType: event.response?.error?.type || "unknown"
            }));
            emitError("AI 未能完成本次回复。", controller);
        } else if(event.type === "error") {
            console.error(JSON.stringify({
                event: "openai_stream_error",
                code: event.code || event.error?.code || "unknown",
                errorType: event.error?.type || "unknown"
            }));
            emitError("AI 服务返回了一个错误。", controller);
        }
    };

    const transform = new TransformStream({
        transform(chunk, controller) {
            buffer += decoder.decode(chunk, {stream: true});
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() || "";
            for(const block of blocks) emitBlock(block, controller);
        },
        flush(controller) {
            buffer += decoder.decode();
            if(buffer.trim()) emitBlock(buffer, controller);
        }
    });
    return upstreamBody.pipeThrough(transform);
}

async function handleChat(request, env, ctx) {
    if(!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))
        return jsonResponse(request, env, {error: "Content-Type 必须是 application/json。"}, 415);

    let body;
    try {
        body = await readJsonBody(request);
    } catch(error) {
        if(error instanceof RequestError)
            return jsonResponse(request, env, {error: error.message}, error.status);
        throw error;
    }

    const validation = validateMessages(body && body.messages);
    if(validation.error) return jsonResponse(request, env, {error: validation.error}, 400);
    if(!env.OPENAI_API_KEY)
        return jsonResponse(request, env, {error: "服务端尚未配置 OPENAI_API_KEY。"}, 503);

    const safetyIdentifier = await createSafetyIdentifier(request, env);
    const rateLimit = await env.API_RATE_LIMITER.limit({key: safetyIdentifier});
    if(!rateLimit.success)
        return jsonResponse(request, env, {error: "请求过于频繁，请稍后再试。"}, 429, {"Retry-After": "60"});

    const recording = recordUserMessage(env, body, validation.messages, safetyIdentifier)
        .catch(error => console.error(JSON.stringify({event: "message_record_failed", message: error.message})));
    if(ctx?.waitUntil) ctx.waitUntil(recording);
    else await recording;

    const upstream = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: env.OPENAI_MODEL || DEFAULT_MODEL,
            instructions: "你是 Laogao GPT，一位友好、准确的中文 AI 助手。直接回答问题；遇到代码时给出清晰、可运行的方案；不确定时明确说明。",
            input: validation.messages,
            max_output_tokens: 2000,
            reasoning: {effort: "low", context: "current_turn"},
            stream: true,
            store: false,
            safety_identifier: safetyIdentifier
        })
    });

    if(!upstream.ok) {
        const status = [400, 401, 403, 429].includes(upstream.status) ? upstream.status : 502;
        console.error(JSON.stringify({event: "openai_error", status: upstream.status}));
        return jsonResponse(request, env, {error: "AI 服务暂时不可用，请稍后重试。"}, status);
    }
    if(!upstream.body)
        return jsonResponse(request, env, {error: "AI 服务没有返回响应流。"}, 502);

    return createResponse(request, env, createEventStream(upstream.body), {
        status: 200,
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform"
        }
    });
}

export async function handleRequest(request, env, ctx) {
    if(!isOriginAllowed(request, env))
        return jsonResponse(request, env, {error: "不允许的请求来源。"}, 403);
    if(request.method === "OPTIONS")
        return createResponse(request, env, null, {status: 204});

    const url = new URL(request.url);
    const {pathname} = url;
    if(pathname === "/api/health" && request.method === "GET") {
        return jsonResponse(request, env, {
            ok: true,
            configured: Boolean(env.OPENAI_API_KEY),
            model: env.OPENAI_MODEL || DEFAULT_MODEL,
            recording: Boolean(env.MESSAGE_DB)
        });
    }
    if(pathname === "/api/admin/messages" || pathname.startsWith("/api/admin/messages/")) {
        try {
            return await handleAdminMessages(request, env, url);
        } catch(error) {
            console.error(JSON.stringify({event: "admin_api_error", message: error.message}));
            return jsonResponse(request, env, {error: "无法读取消息记录。"}, 500);
        }
    }
    if(pathname === "/api/chat" && request.method === "POST") {
        try {
            return await handleChat(request, env, ctx);
        } catch(error) {
            console.error(JSON.stringify({event: "worker_error", message: error.message}));
            return jsonResponse(request, env, {error: "服务暂时不可用，请稍后重试。"}, 502);
        }
    }
    return jsonResponse(request, env, {error: "接口不存在。"}, 404);
}

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env, ctx);
    }
};
