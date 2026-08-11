import http from "node:http";
import {createHash, randomBytes, randomUUID, timingSafeEqual} from "node:crypto";
import cloudbase from "@cloudbase/node-sdk";

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const ENV_ID = process.env.TCB_ENV_ID || "laogao-github-pages-d4bk62ce3432";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const ALLOWED_MODELS = new Set(["deepseek-v4-flash"]);
const DEFAULT_DAILY_QUOTA = 50;
const MAX_DAILY_QUOTA = 500;
const SESSION_DAYS = 30;
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;
const EMAIL_CODE_TTL_SECONDS = 600;
const CLOUDBASE_AUTH_URL = `https://${ENV_ID}.api.tcloudbasegateway.com/auth/v1`;
const ALLOWED_ORIGINS = new Set([
    "https://shuaigaodada.github.io",
    "http://127.0.0.1:3000",
    "http://localhost:3000"
]);
const RECORD_ID_PATTERN = /^[a-f0-9-]{32,64}$/i;
const rateLimits = new Map();

let cloudbaseApp;
let database;

function getApp() {
    cloudbaseApp ||= cloudbase.init({env: ENV_ID, timeout: 120000});
    return cloudbaseApp;
}

function getDatabase() {
    database ||= getApp().rdb({database: "public"});
    return database;
}

function resolveModel(value) {
    return typeof value === "string" && ALLOWED_MODELS.has(value) ? value : MODEL;
}

async function createDeepSeekResponse(messages, model, signal) {
    if(!process.env.DEEPSEEK_API_KEY)
        throw Object.assign(new Error("DeepSeek API 密钥尚未配置。"), {status: 503});

    const upstream = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages: [
                {role: "system", content: "你是 Laogao GPT，一位友好、准确的中文 AI 助手。直接回答问题；遇到代码时给出清晰、可运行的方案；不确定时明确说明。"},
                ...messages
            ],
            thinking: {type: "disabled"},
            max_tokens: 2000,
            stream: false
        }),
        signal
    });

    if(!upstream.ok) {
        const detail = (await upstream.text()).slice(0, 500);
        console.error("deepseek_request_failed", upstream.status, detail);
        throw Object.assign(new Error("DeepSeek 暂时无法完成请求。"), {status: 502});
    }
    const payload = await upstream.json();
    const content = payload.choices?.[0]?.message?.content;
    if(typeof content !== "string" || !content.trim())
        throw Object.assign(new Error("DeepSeek 未返回响应内容。"), {status: 502});
    return content;
}

function setCorsHeaders(response, origin) {
    if(ALLOWED_ORIGINS.has(origin)) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Vary", "Origin");
    }
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.setHeader("Access-Control-Expose-Headers", "X-Daily-Limit, X-Daily-Remaining");
    response.setHeader("Access-Control-Max-Age", "86400");
    response.setHeader("X-Content-Type-Options", "nosniff");
}

function sendJson(response, status, payload, origin = "") {
    setCorsHeaders(response, origin);
    response.writeHead(status, {"Content-Type": "application/json; charset=utf-8"});
    response.end(JSON.stringify(payload));
}

async function readJson(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if(size > 64 * 1024) throw Object.assign(new Error("请求内容过大。"), {status: 413});
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch(error) {
        throw Object.assign(new Error("请求内容不是有效的 JSON。"), {status: 400});
    }
}

function validateMessages(input) {
    if(!Array.isArray(input) || !input.length || input.length > MAX_MESSAGES)
        throw Object.assign(new Error(`messages 必须是包含 1 到 ${MAX_MESSAGES} 条消息的数组。`), {status: 400});
    const messages = input.map(message => {
        if(!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string")
            throw Object.assign(new Error("消息格式不正确。"), {status: 400});
        const content = message.content.trim();
        if(!content || content.length > MAX_CONTENT_LENGTH)
            throw Object.assign(new Error(`单条消息必须为 1 到 ${MAX_CONTENT_LENGTH} 个字符。`), {status: 400});
        return {role: message.role, content};
    });
    if(messages.at(-1).role !== "user")
        throw Object.assign(new Error("最后一条消息必须来自用户。"), {status: 400});
    return messages;
}

function hash(value) {
    return createHash("sha256").update(value).digest("hex");
}

function bearerToken(request) {
    const authorization = request.headers.authorization || "";
    return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function normalizeEmail(value) {
    const email = typeof value === "string" ? value.trim().toLowerCase() : "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : "";
}

function normalizePhoneNumber(value) {
    const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
    const mainland = digits.startsWith("86") && digits.length === 13 ? digits.slice(2) : digits;
    return /^1[3-9]\d{9}$/.test(mainland) ? `+86 ${mainland}` : "";
}

function databaseResult(result, fallback) {
    if(result.error) throw new Error(result.error.message || fallback);
    return result.data || [];
}

async function findUserByEmail(email) {
    const result = await getDatabase().from("app_users")
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at")
        .eq("email", email).limit(1);
    return databaseResult(result, "读取用户失败。")[0] || null;
}

async function findUserByPhoneNumber(phoneNumber) {
    const result = await getDatabase().from("app_users")
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at")
        .eq("phone_number", phoneNumber).limit(1);
    return databaseResult(result, "读取用户失败。")[0] || null;
}

async function cloudbaseAuthRequest(path, body) {
    const response = await fetch(`${CLOUDBASE_AUTH_URL}${path}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
    });
    let payload = {};
    try { payload = await response.json(); } catch(error) { /* Report a generic delivery error below. */ }
    if(!response.ok || payload.error) {
        const description = payload.error_description || payload.message || payload.error;
        const error = new Error(description || "验证码服务暂时不可用。");
        error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
        error.code = payload.error || "email_verification_failed";
        throw error;
    }
    return payload;
}

async function sendLoginVerification({email = null, phoneNumber = null}) {
    const identity = email ? {email} : {phone_number: phoneNumber};
    const payload = await cloudbaseAuthRequest("/verification", {...identity, target: "ANY"});
    if(typeof payload.verification_id !== "string" || !payload.verification_id)
        throw Object.assign(new Error("验证码服务未返回有效凭据。"), {status: 502});
    const expiresIn = Math.min(EMAIL_CODE_TTL_SECONDS, Math.max(60, Number(payload.expires_in) || EMAIL_CODE_TTL_SECONDS));
    const cleanup = getDatabase().from("email_verifications").delete();
    const cleanupResult = email ? await cleanup.eq("email", email) : await cleanup.eq("phone_number", phoneNumber);
    databaseResult(cleanupResult, "清理旧验证码凭据失败。");
    const result = await getDatabase().from("email_verifications").insert({
        verification_id: payload.verification_id,
        email,
        phone_number: phoneNumber,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
    });
    databaseResult(result, "保存验证码凭据失败。");
    return {verificationId: payload.verification_id, expiresIn};
}

async function verifyLoginAndCreateSession(verificationId, verificationCode, displayName) {
    const lookup = await getDatabase().from("email_verifications")
        .select("email, phone_number, expires_at")
        .eq("verification_id", verificationId)
        .gt("expires_at", new Date().toISOString())
        .limit(1);
    const pending = databaseResult(lookup, "读取验证码凭据失败。")[0];
    if(!pending) throw Object.assign(new Error("验证码已过期，请重新获取。"), {status: 400});

    await cloudbaseAuthRequest("/verification/verify", {
        verification_id: verificationId,
        verification_code: verificationCode
    });
    const removed = await getDatabase().from("email_verifications").delete().eq("verification_id", verificationId);
    databaseResult(removed, "清理验证码凭据失败。");

    let user = pending.email
        ? await findUserByEmail(pending.email)
        : await findUserByPhoneNumber(pending.phone_number);
    if(!user) {
        const name = (typeof displayName === "string" ? displayName.trim() : "").slice(0, 30)
            || (pending.email ? pending.email.split("@")[0].slice(0, 30) : `手机用户${pending.phone_number.slice(-4)}`);
        const created = await getDatabase().from("app_users").insert({
            id: randomUUID(),
            email: pending.email,
            phone_number: pending.phone_number,
            display_name: name,
            password_salt: randomBytes(16).toString("base64url"),
            password_hash: randomBytes(64).toString("base64url")
        });
        databaseResult(created, "创建用户失败。");
        user = pending.email
            ? await findUserByEmail(pending.email)
            : await findUserByPhoneNumber(pending.phone_number);
    }
    if(user.is_disabled)
        throw Object.assign(new Error("该账号已被管理员禁用。"), {status: 403});
    const token = await createSession(user.id);
    return {token, user: publicUser(user), quota: await quotaStatus(user)};
}

async function findUserById(id) {
    const result = await getDatabase().from("app_users")
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at").eq("id", id).limit(1);
    return databaseResult(result, "读取用户失败。")[0] || null;
}

async function createSession(userId) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
    const result = await getDatabase().from("app_sessions").insert({
        token_hash: hash(token), user_id: userId, expires_at: expiresAt
    });
    databaseResult(result, "创建登录会话失败。");
    return token;
}

async function authenticatedUser(request) {
    const token = bearerToken(request);
    if(!token) return null;
    const sessionResult = await getDatabase().from("app_sessions")
        .select("user_id, expires_at")
        .eq("token_hash", hash(token))
        .gt("expires_at", new Date().toISOString())
        .limit(1);
    const session = databaseResult(sessionResult, "读取登录会话失败。")[0];
    return session ? findUserById(session.user_id) : null;
}

async function quotaStatus(user) {
    const today = quotaDate();
    const result = await getDatabase().from("daily_usage")
        .select("request_count").eq("user_id", user.id).eq("usage_date", today).limit(1);
    const used = Number(databaseResult(result, "读取额度失败。")[0]?.request_count || 0);
    const limit = Number(user.daily_limit ?? DEFAULT_DAILY_QUOTA);
    return {limit, used, remaining: Math.max(0, limit - used)};
}

function quotaDate() {
    return new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Shanghai"}).format(new Date());
}

async function consumeQuota(user) {
    const current = await quotaStatus(user);
    if(current.remaining <= 0) return {allowed: false, ...current};
    const used = current.used + 1;
    const result = await getDatabase().from("daily_usage").upsert({
        user_id: user.id,
        usage_date: quotaDate(),
        request_count: used,
        updated_at: new Date().toISOString()
    }, {onConflict: "user_id,usage_date"});
    databaseResult(result, "更新额度失败。");
    return {
        allowed: true,
        limit: current.limit,
        used,
        remaining: Math.max(0, current.limit - used)
    };
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
        displayName: user.display_name,
        dailyLimit: Number(user.daily_limit ?? DEFAULT_DAILY_QUOTA),
        disabled: Boolean(user.is_disabled)
    };
}

function getVisitorId(request) {
    const address = String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim();
    const userAgent = request.headers["user-agent"] || "unknown";
    return hash(`${process.env.SAFETY_SALT || ENV_ID}|${address}|${userAgent}`);
}

function isRateLimited(visitorId) {
    const now = Date.now();
    const recent = (rateLimits.get(visitorId) || []).filter(time => now - time < 60000);
    recent.push(now);
    rateLimits.set(visitorId, recent);
    return recent.length > 20;
}

function normalizeRecordId(value) {
    return typeof value === "string" && RECORD_ID_PATTERN.test(value) ? value : randomUUID();
}

function tokenMatches(actual, expected) {
    if(!actual || !expected) return false;
    const left = Buffer.from(actual);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
}

function requireAdmin(request) {
    const authorization = request.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if(!process.env.ADMIN_TOKEN) throw Object.assign(new Error("管理员令牌尚未配置。"), {status: 503});
    if(!tokenMatches(token, process.env.ADMIN_TOKEN)) throw Object.assign(new Error("管理员令牌无效。"), {status: 401});
}

async function recordMessage(body, messages, visitorId, model, userId) {
    const db = getDatabase();
    const messageId = normalizeRecordId(body.messageId);
    const {error} = await db.from("user_messages").upsert({
        id: hash(`${visitorId}|${messageId}`),
        conversation_id: normalizeRecordId(body.conversationId),
        visitor_id: visitorId,
        user_id: userId,
        content: messages.at(-1).content,
        model
    }, {onConflict: "id", ignoreDuplicates: true});
    if(error) throw new Error(error.message || "消息记录失败。");
}

async function getAllMessages() {
    const db = getDatabase();
    const {data, error} = await db.from("user_messages")
        .select("id, conversation_id, visitor_id, user_id, content, model, created_at")
        .order("created_at", {ascending: false})
        .limit(5000);
    if(error) throw new Error(error.message || "读取消息失败。");
    return data || [];
}

async function getAllUsers() {
    const db = getDatabase();
    const usersResult = await db.from("app_users")
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at")
        .order("created_at", {ascending: false})
        .limit(5000);
    const users = databaseResult(usersResult, "读取用户失败。");
    const usageResult = await db.from("daily_usage")
        .select("user_id, request_count")
        .eq("usage_date", quotaDate())
        .limit(5000);
    const usageByUser = new Map(databaseResult(usageResult, "读取用户额度失败。")
        .map(row => [row.user_id, Number(row.request_count || 0)]));
    return users.map(user => {
        const dailyLimit = Number(user.daily_limit ?? DEFAULT_DAILY_QUOTA);
        const usedToday = usageByUser.get(user.id) || 0;
        return {
            id: user.id,
            email: user.email,
            phoneNumber: user.phone_number,
            displayName: user.display_name,
            dailyLimit,
            usedToday,
            remainingToday: Math.max(0, dailyLimit - usedToday),
            disabled: Boolean(user.is_disabled),
            createdAt: user.created_at
        };
    });
}

async function updateManagedUser(userId, body) {
    const updates = {};
    if(Object.hasOwn(body, "displayName")) {
        const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
        if(!displayName || displayName.length > 30)
            throw Object.assign(new Error("昵称必须为 1 至 30 个字符。"), {status: 400});
        updates.display_name = displayName;
    }
    if(Object.hasOwn(body, "dailyLimit")) {
        if(!Number.isInteger(body.dailyLimit) || body.dailyLimit < 0 || body.dailyLimit > MAX_DAILY_QUOTA)
            throw Object.assign(new Error(`每日额度必须为 0 至 ${MAX_DAILY_QUOTA} 的整数。`), {status: 400});
        updates.daily_limit = body.dailyLimit;
    }
    if(Object.hasOwn(body, "disabled")) {
        if(typeof body.disabled !== "boolean")
            throw Object.assign(new Error("禁用状态必须为布尔值。"), {status: 400});
        updates.is_disabled = body.disabled;
    }
    if(Object.keys(updates).length) {
        const result = await getDatabase().from("app_users").update(updates).eq("id", userId);
        databaseResult(result, "更新用户失败。");
    }
    if(Object.hasOwn(body, "usedToday")) {
        if(!Number.isInteger(body.usedToday) || body.usedToday < 0 || body.usedToday > MAX_DAILY_QUOTA)
            throw Object.assign(new Error(`今日用量必须为 0 至 ${MAX_DAILY_QUOTA} 的整数。`), {status: 400});
        const result = await getDatabase().from("daily_usage").upsert({
            user_id: userId,
            usage_date: quotaDate(),
            request_count: body.usedToday,
            updated_at: new Date().toISOString()
        }, {onConflict: "user_id,usage_date"});
        databaseResult(result, "更新今日用量失败。");
    }
    if(updates.is_disabled === true) {
        const result = await getDatabase().from("app_sessions").delete().eq("user_id", userId);
        databaseResult(result, "注销用户会话失败。");
    }
    const user = await findUserById(userId);
    if(!user) throw Object.assign(new Error("用户不存在。"), {status: 404});
    return {user: publicUser(user), quota: await quotaStatus(user)};
}

async function handleAuth(request, response, url, origin) {
    if(request.method === "POST" && url.pathname === "/api/auth/send-code") {
        const body = await readJson(request);
        const email = normalizeEmail(body.email);
        const phoneNumber = normalizePhoneNumber(body.phoneNumber);
        if((email ? 1 : 0) + (phoneNumber ? 1 : 0) !== 1)
            return sendJson(response, 400, {error: "请输入有效邮箱或中国大陆手机号。"}, origin);
        const user = email ? await findUserByEmail(email) : await findUserByPhoneNumber(phoneNumber);
        if(user?.is_disabled) return sendJson(response, 403, {error: "该账号已被管理员禁用。"}, origin);
        return sendJson(response, 200, await sendLoginVerification({email: email || null, phoneNumber: phoneNumber || null}), origin);
    }

    if(request.method === "POST" && url.pathname === "/api/auth/verify-code") {
        const body = await readJson(request);
        const verificationId = typeof body.verificationId === "string" ? body.verificationId.trim() : "";
        const verificationCode = typeof body.code === "string" ? body.code.trim() : "";
        if(!verificationId || !/^\d{6}$/.test(verificationCode))
            return sendJson(response, 400, {error: "请输入收到的 6 位验证码。"}, origin);
        return sendJson(response, 200,
            await verifyLoginAndCreateSession(verificationId, verificationCode, body.displayName), origin);
    }

    if(request.method === "GET" && url.pathname === "/api/auth/me") {
        const user = await authenticatedUser(request);
        if(!user) return sendJson(response, 401, {error: "请先登录。"}, origin);
        if(user.is_disabled) return sendJson(response, 403, {error: "该账号已被管理员禁用。"}, origin);
        return sendJson(response, 200, {user: publicUser(user), quota: await quotaStatus(user)}, origin);
    }

    if(request.method === "POST" && url.pathname === "/api/auth/logout") {
        const token = bearerToken(request);
        if(token) {
            const result = await getDatabase().from("app_sessions").delete().eq("token_hash", hash(token));
            databaseResult(result, "退出登录失败。");
        }
        return sendJson(response, 200, {ok: true}, origin);
    }

    if(request.method === "POST" && url.pathname === "/api/auth/authorize-chat") {
        const user = await authenticatedUser(request);
        if(!user) return sendJson(response, 401, {error: "登录已过期，请重新登录。"}, origin);
        if(user.is_disabled) return sendJson(response, 403, {error: "该账号已被管理员禁用。"}, origin);
        const quota = await consumeQuota(user);
        if(!quota.allowed) return sendJson(response, 429, {error: "今日对话额度已用完，请明天再来。", quota}, origin);
        return sendJson(response, 200, {user: publicUser(user), quota}, origin);
    }

    return sendJson(response, 405, {error: "请求方法不受支持。"}, origin);
}

async function handleAdmin(request, response, url, origin) {
    requireAdmin(request);
    if(request.method === "GET" && url.pathname === "/api/admin/users") {
        const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
        const pageSize = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("pageSize") || "25", 10) || 25));
        const search = (url.searchParams.get("search") || "").trim().toLowerCase().slice(0, 200);
        const all = await getAllUsers();
        const filtered = search ? all.filter(user =>
            (user.email || "").toLowerCase().includes(search)
            || (user.phoneNumber || "").includes(search)
            || user.displayName.toLowerCase().includes(search)
            || user.id === search
        ) : all;
        const offset = (page - 1) * pageSize;
        return sendJson(response, 200, {
            users: filtered.slice(offset, offset + pageSize),
            pagination: {page, pageSize, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / pageSize))},
            stats: {total: all.length, disabled: all.filter(user => user.disabled).length}
        }, origin);
    }

    const userMatch = url.pathname.match(/^\/api\/admin\/users\/([a-f0-9-]{32,64})$/i);
    if(userMatch && request.method === "PATCH")
        return sendJson(response, 200, await updateManagedUser(userMatch[1], await readJson(request)), origin);
    if(userMatch && request.method === "DELETE") {
        const result = await getDatabase().from("app_users").delete({count: "exact"}).eq("id", userMatch[1]);
        if(result.error) throw new Error(result.error.message || "删除用户失败。");
        if(!result.count) return sendJson(response, 404, {error: "用户不存在。"}, origin);
        return sendJson(response, 200, {ok: true}, origin);
    }

    if(request.method === "GET" && url.pathname === "/api/admin/messages") {
        const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
        const pageSize = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("pageSize") || "25", 10) || 25));
        const search = (url.searchParams.get("search") || "").trim().toLowerCase().slice(0, 200);
        const all = await getAllMessages();
        const filtered = search ? all.filter(message => message.content.toLowerCase().includes(search) || message.visitor_id === search) : all;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const offset = (page - 1) * pageSize;
        return sendJson(response, 200, {
            messages: filtered.slice(offset, offset + pageSize),
            pagination: {page, pageSize, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / pageSize))},
            stats: {
                total: all.length,
                today: all.filter(message => new Date(message.created_at) >= today).length,
                visitors: new Set(all.map(message => message.visitor_id)).size
            }
        }, origin);
    }

    const id = decodeURIComponent(url.pathname.slice("/api/admin/messages/".length));
    if(request.method === "DELETE" && RECORD_ID_PATTERN.test(id)) {
        const db = getDatabase();
        const {count, error} = await db.from("user_messages").delete({count: "exact"}).eq("id", id);
        if(error) throw new Error(error.message || "删除消息失败。");
        if(!count) return sendJson(response, 404, {error: "消息不存在。"}, origin);
        return sendJson(response, 200, {ok: true}, origin);
    }
    return sendJson(response, 404, {error: "接口不存在。"}, origin);
}

async function handleChat(request, response, origin) {
    if(!request.headers["content-type"]?.toLowerCase().startsWith("application/json"))
        return sendJson(response, 415, {error: "Content-Type 必须是 application/json。"}, origin);
    const body = await readJson(request);
    const messages = validateMessages(body.messages);
    const model = resolveModel(body.model);
    const visitorId = getVisitorId(request);
    if(isRateLimited(visitorId)) return sendJson(response, 429, {error: "请求过于频繁，请稍后再试。"}, origin);
    const user = await authenticatedUser(request);
    if(!user) return sendJson(response, 401, {error: "请先使用邮箱登录。"}, origin);
    if(user.is_disabled) return sendJson(response, 403, {error: "该账号已被管理员禁用。"}, origin);
    const quota = await consumeQuota(user);
    if(!quota.allowed) return sendJson(response, 429, {error: "今日对话额度已用完，请明天再来。", quota}, origin);

    await recordMessage(body, messages, visitorId, model, user.id).catch(error => console.error("message_record_failed", error));
    const controller = new AbortController();
    const content = await createDeepSeekResponse(messages, model, controller.signal);

    setCorsHeaders(response, origin);
    response.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-Daily-Limit": String(quota.limit),
        "X-Daily-Remaining": String(quota.remaining)
    });
    response.end(`${JSON.stringify({type: "delta", delta: content})}\n`);
}

async function handleRequest(request, response) {
    const origin = request.headers.origin || "";
    const url = new URL(request.url || "/", "http://localhost");
    if(origin && !ALLOWED_ORIGINS.has(origin)) return sendJson(response, 403, {error: "不允许的请求来源。"}, origin);
    if(request.method === "OPTIONS") {
        setCorsHeaders(response, origin);
        response.writeHead(204);
        return response.end();
    }
    if(url.pathname === "/healthz") return sendJson(response, 200, {ok: true, env: ENV_ID}, origin);
    if(url.pathname === "/api/health" && request.method === "GET")
        return sendJson(response, 200, {
            ok: true,
            configured: Boolean(process.env.DEEPSEEK_API_KEY),
            authDatabaseConfigured: Boolean(process.env.CLOUDBASE_APIKEY),
            emailVerification: "cloudbase-auth-v2",
            provider: "deepseek",
            model: MODEL,
            models: [...ALLOWED_MODELS],
            recording: true
        }, origin);
    if(url.pathname.startsWith("/api/auth/")) return handleAuth(request, response, url, origin);
    if(url.pathname === "/api/chat" && request.method === "POST") return handleChat(request, response, origin);
    if(url.pathname === "/api/admin/messages" || url.pathname.startsWith("/api/admin/messages/")
        || url.pathname === "/api/admin/users" || url.pathname.startsWith("/api/admin/users/"))
        return handleAdmin(request, response, url, origin);
    return sendJson(response, 404, {error: "接口不存在。"}, origin);
}

const server = http.createServer((request, response) => {
    handleRequest(request, response).catch(error => {
        console.error("request_failed", error);
        if(!response.headersSent) sendJson(response, error.status || 500, {error: error.status ? error.message : "服务内部错误。"}, request.headers.origin || "");
        else response.end(`${JSON.stringify({type: "error", error: "服务内部错误。"})}\n`);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Lggpt CloudBase backend listening on ${PORT}`);
});
