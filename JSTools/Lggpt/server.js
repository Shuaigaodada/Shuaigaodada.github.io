const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const MAX_MESSAGES = 20;
const MAX_USER_MESSAGE_LENGTH = 4000;
const MAX_ASSISTANT_MESSAGE_LENGTH = 12000;
const MAX_TOTAL_LENGTH = 32000;
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_REQUESTS = Number(process.env.RATE_LIMIT_REQUESTS) || 12;
const requestCounts = new Map();
const messageRecords = [];
const MAX_LOCAL_RECORDS = 5000;
const RECORD_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

app.disable("x-powered-by");
if(process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(express.json({limit: "40kb"}));

function setCommonHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

app.use((req, res, next) => {
    setCommonHeaders(res);
    next();
});

function rateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip;
    const record = requestCounts.get(key);

    if(!record || now >= record.resetAt) {
        requestCounts.set(key, {count: 1, resetAt: now + RATE_LIMIT_WINDOW});
        res.setHeader("RateLimit-Remaining", Math.max(0, RATE_LIMIT_REQUESTS - 1));
        return next();
    }

    if(record.count >= RATE_LIMIT_REQUESTS) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        res.setHeader("Retry-After", retryAfter);
        res.setHeader("RateLimit-Remaining", 0);
        return res.status(429).json({error: "请求过于频繁，请稍后再试。"});
    }

    record.count++;
    res.setHeader("RateLimit-Remaining", Math.max(0, RATE_LIMIT_REQUESTS - record.count));
    next();
}

function validateMessages(value) {
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
        const messageLimit = message.role === "assistant" ? MAX_ASSISTANT_MESSAGE_LENGTH : MAX_USER_MESSAGE_LENGTH;
        if(!content || content.length > messageLimit)
            return {error: `${message.role === "assistant" ? "AI 历史回复" : "用户消息"}必须在 1 到 ${messageLimit} 个字符之间。`};

        totalLength += content.length;
        if(totalLength > MAX_TOTAL_LENGTH)
            return {error: "当前对话内容过长，请开始一个新对话。"};
        messages.push({role: message.role, content});
    }

    if(messages[messages.length - 1].role !== "user")
        return {error: "最后一条消息必须来自用户。"};
    return {messages};
}

function createSafetyIdentifier(req) {
    const salt = process.env.OPENAI_SAFETY_SALT || "laogao-gpt";
    const fingerprint = `${req.ip}|${req.get("user-agent") || "unknown"}`;
    return crypto.createHash("sha256").update(`${salt}|${fingerprint}`).digest("hex");
}

function normalizeRecordId(value) {
    return typeof value === "string" && RECORD_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

function secretsMatch(actual, expected) {
    if(!actual || !expected) return false;
    const actualHash = crypto.createHash("sha256").update(actual).digest();
    const expectedHash = crypto.createHash("sha256").update(expected).digest();
    return crypto.timingSafeEqual(actualHash, expectedHash);
}

function requireAdmin(req, res, next) {
    res.setHeader("Cache-Control", "no-store");
    if(!process.env.ADMIN_TOKEN)
        return res.status(503).json({error: "管理员令牌尚未配置。"});
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if(!secretsMatch(token, process.env.ADMIN_TOKEN)) {
        res.setHeader("WWW-Authenticate", "Bearer");
        return res.status(401).json({error: "管理员身份验证失败。"});
    }
    next();
}

function recordUserMessage(body, messages, visitorId) {
    const clientMessageId = normalizeRecordId(body.messageId);
    const id = crypto.createHash("sha256").update(`${visitorId}|${clientMessageId}`).digest("hex");
    if(messageRecords.some(record => record.id === id)) return;
    messageRecords.unshift({
        id,
        conversation_id: normalizeRecordId(body.conversationId),
        visitor_id: visitorId,
        content: messages[messages.length - 1].content,
        model: MODEL,
        created_at: new Date().toISOString()
    });
    if(messageRecords.length > MAX_LOCAL_RECORDS) messageRecords.length = MAX_LOCAL_RECORDS;
}

function writeEvent(res, event) {
    if(!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
}

app.get("/api/health", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
        ok: true,
        configured: Boolean(process.env.OPENAI_API_KEY),
        model: MODEL,
        recording: true
    });
});

app.get("/api/admin/messages", requireAdmin, (req, res) => {
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page || "1", 10) || 1));
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(req.query.pageSize || "25", 10) || 25));
    const search = String(req.query.search || "").trim().slice(0, 200).toLowerCase();
    const filtered = search
        ? messageRecords.filter(record => record.content.toLowerCase().includes(search) || record.visitor_id === search)
        : messageRecords;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    res.setHeader("Cache-Control", "no-store");
    res.json({
        messages: filtered.slice((page - 1) * pageSize, page * pageSize),
        pagination: {
            page,
            pageSize,
            total: filtered.length,
            pages: Math.max(1, Math.ceil(filtered.length / pageSize))
        },
        stats: {
            total: messageRecords.length,
            today: messageRecords.filter(record => new Date(record.created_at) >= today).length,
            visitors: new Set(messageRecords.map(record => record.visitor_id)).size
        }
    });
});

app.delete("/api/admin/messages/:id", requireAdmin, (req, res) => {
    if(!RECORD_ID_PATTERN.test(req.params.id)) return res.status(404).json({error: "消息不存在。"});
    const index = messageRecords.findIndex(record => record.id === req.params.id);
    if(index < 0) return res.status(404).json({error: "消息不存在。"});
    messageRecords.splice(index, 1);
    res.setHeader("Cache-Control", "no-store");
    res.json({ok: true});
});

app.post("/api/chat", rateLimit, async (req, res) => {
    const validation = validateMessages(req.body && req.body.messages);
    if(validation.error) return res.status(400).json({error: validation.error});
    if(!process.env.OPENAI_API_KEY)
        return res.status(503).json({error: "服务端尚未配置 OPENAI_API_KEY。"});

    const visitorId = createSafetyIdentifier(req);
    recordUserMessage(req.body, validation.messages, visitorId);

    const controller = new AbortController();
    res.on("close", () => {
        if(!res.writableEnded) controller.abort();
    });

    try {
        const upstream = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                instructions: "你是 Laogao GPT，一位友好、准确的中文 AI 助手。直接回答问题；遇到代码时给出清晰、可运行的方案；不确定时明确说明。",
                input: validation.messages,
                max_output_tokens: 2000,
                stream: true,
                store: false,
                safety_identifier: visitorId
            }),
            signal: controller.signal
        });

        if(!upstream.ok) {
            let detail = "";
            try {
                const data = await upstream.json();
                detail = data.error && data.error.message ? data.error.message : "";
            } catch(error) {
                // 上游不一定返回 JSON
            }
            const status = [400, 401, 403, 429].includes(upstream.status) ? upstream.status : 502;
            const message = process.env.NODE_ENV === "development" && detail
                ? `AI 服务错误：${detail}`
                : "AI 服务暂时不可用，请稍后重试。";
            return res.status(status).json({error: message});
        }

        if(!upstream.body) return res.status(502).json({error: "AI 服务没有返回响应流。"});

        res.status(200);
        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while(true) {
            const {value, done} = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), {stream: !done});
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";

            for(const line of lines) {
                if(!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if(!data || data === "[DONE]") continue;

                let event;
                try {
                    event = JSON.parse(data);
                } catch(error) {
                    continue;
                }

                if(event.type === "response.output_text.delta" && typeof event.delta === "string")
                    writeEvent(res, {type: "delta", delta: event.delta});
                else if(event.type === "response.failed")
                    writeEvent(res, {type: "error", error: "AI 未能完成本次回复。"});
                else if(event.type === "error")
                    writeEvent(res, {type: "error", error: "AI 服务返回了一个错误。"});
            }
            if(done) break;
        }
        res.end();
    } catch(error) {
        if(error.name === "AbortError") return;
        if(res.headersSent) {
            writeEvent(res, {type: "error", error: "响应流意外中断，请重试。"});
            return res.end();
        }
        res.status(502).json({error: "无法连接 AI 服务，请稍后重试。"});
    }
});

const projectRoot = path.resolve(__dirname, "..", "..");
app.use("/JSTools/Lggpt", express.static(__dirname, {
    index: "index.html",
    setHeaders(res) {
        res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
        res.setHeader("Cache-Control", "no-cache");
    }
}));
app.use(express.static(projectRoot));
app.get("/", (req, res) => res.redirect("/JSTools/Lggpt/"));

app.use((error, req, res, next) => {
    if(error instanceof SyntaxError && error.status === 400 && "body" in error)
        return res.status(400).json({error: "请求内容不是有效的 JSON。"});
    next(error);
});

if(require.main === module) {
    app.listen(PORT, () => {
        console.log(`Laogao GPT is running at http://localhost:${PORT}/JSTools/Lggpt/`);
        if(!process.env.OPENAI_API_KEY)
            console.warn("OPENAI_API_KEY is not configured. Chat requests will be disabled.");
    });
}

module.exports = {app, validateMessages};
