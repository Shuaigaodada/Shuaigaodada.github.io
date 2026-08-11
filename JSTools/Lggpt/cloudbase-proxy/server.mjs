import http from "node:http";
import https from "node:https";
import {createHash, randomBytes, randomUUID, timingSafeEqual} from "node:crypto";
import cloudbase from "@cloudbase/node-sdk";
import {WebSocket, WebSocketServer} from "ws";
import {MainlandBlackjackEngine} from "./blackjack-engine.mjs";
import {callCloudBaseRpc} from "./cloudbase-rpc.mjs";

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const ENV_ID = process.env.TCB_ENV_ID || "laogao-github-pages-d4bk62ce3432";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const BLACKJACK_UPSTREAM = process.env.BLACKJACK_UPSTREAM || "https://game-api.laogao.online";
// Mainland DNS occasionally cannot resolve workers.dev correctly. These Cloudflare
// anycast addresses are only a TLS fallback; SNI and Host still target the Worker.
const BLACKJACK_FALLBACK_IPS = (process.env.BLACKJACK_FALLBACK_IPS || "104.21.62.69,172.67.221.15")
    .split(",").map(value => value.trim()).filter(Boolean);
const ALLOWED_MODELS = new Set(["deepseek-v4-flash"]);
const DEFAULT_DAILY_QUOTA = 50;
const MAX_DAILY_QUOTA = 500;
const MAX_BLACKJACK_BANKROLL = 1_000_000_000;
const MAX_BLACKJACK_PLAY_SECONDS = 315_360_000;
const SESSION_DAYS = 30;
const MAX_MESSAGES = 20;
const MAX_USER_CONTENT_LENGTH = 4000;
const MAX_ASSISTANT_CONTENT_LENGTH = 12000;
const EMAIL_CODE_TTL_SECONDS = 600;
const VERIFICATION_COOLDOWN_SECONDS = 60;
const CLOUDBASE_AUTH_URL = `https://${ENV_ID}.api.tcloudbasegateway.com/auth/v1`;
const ALLOWED_ORIGINS = new Set([
    "https://shuaigaodada.github.io",
    "https://laogao.online",
    "https://www.laogao.online",
    "https://laogao.site",
    "https://www.laogao.site",
    "http://127.0.0.1:3000",
    "http://localhost:3000"
]);
const RECORD_ID_PATTERN = /^[a-f0-9-]{32,64}$/i;
const rateLimits = new Map();
const verificationCooldowns = new Map();
const blackjackTickets = new Map();
const blackjackProfiles = new Map();

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
                {role: "system", content: "你是 Laogao GPT，一位友好、准确的中文 AI 助手。直接回答问题；遇到代码时给出清晰、可运行的方案，并将所有代码放入带语言标记的 Markdown 三反引号代码块中；不确定时明确说明。"},
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
        const contentLimit = message.role === "assistant" ? MAX_ASSISTANT_CONTENT_LENGTH : MAX_USER_CONTENT_LENGTH;
        if(!content || content.length > contentLimit)
            throw Object.assign(new Error(`${message.role === "assistant" ? "AI 历史回复" : "用户消息"}必须为 1 到 ${contentLimit} 个字符。`), {status: 400});
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
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at, blackjack_bankroll, blackjack_play_seconds, blackjack_avatar_data")
        .eq("email", email).limit(1);
    return databaseResult(result, "读取用户失败。")[0] || null;
}

async function findUserByPhoneNumber(phoneNumber) {
    const result = await getDatabase().from("app_users")
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at, blackjack_bankroll, blackjack_play_seconds, blackjack_avatar_data")
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
    return {verificationId: payload.verification_id, expiresIn, cooldownSeconds: VERIFICATION_COOLDOWN_SECONDS};
}

async function verificationRetryAfter({email = null, phoneNumber = null}) {
    const identity = email || phoneNumber;
    const localExpiry = verificationCooldowns.get(identity) || 0;
    if(localExpiry > Date.now()) return Math.ceil((localExpiry - Date.now()) / 1000);
    verificationCooldowns.delete(identity);

    let lookup = getDatabase().from("email_verifications").select("created_at");
    lookup = email ? lookup.eq("email", email) : lookup.eq("phone_number", phoneNumber);
    const result = await lookup.order("created_at", {ascending: false}).limit(1);
    const createdAt = databaseResult(result, "Failed to check verification cooldown.")[0]?.created_at;
    if(!createdAt) return 0;
    return Math.max(0, Math.ceil((new Date(createdAt).getTime() + VERIFICATION_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
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
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at, blackjack_bankroll, blackjack_play_seconds, blackjack_avatar_data").eq("id", id).limit(1);
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

function blackjackProfile(user) {
    let profile = blackjackProfiles.get(user.id);
    if(!profile) {
        profile = {
            id: user.id,
            account: user.email || user.phone_number || user.id,
            email: user.email || "",
            phoneNumber: user.phone_number || null,
            displayName: user.display_name || user.email?.split("@")[0] || user.phone_number || "GAO 玩家",
            avatarData: user.blackjack_avatar_data || null,
            bankroll: Number(user.blackjack_bankroll ?? 500),
            playSeconds: Number(user.blackjack_play_seconds ?? 0)
        };
        blackjackProfiles.set(user.id, profile);
    } else if(user.display_name && profile.displayName !== user.display_name) {
        profile.displayName = user.display_name;
    }
    return profile;
}

function cleanupBlackjackTickets() {
    const now = Date.now();
    for(const [ticket, value] of blackjackTickets) if(value.expiresAt <= now) blackjackTickets.delete(ticket);
}

const mainlandBlackjack = new MainlandBlackjackEngine({
    consumeTicket: async ticket => {
        cleanupBlackjackTickets();
        const record = blackjackTickets.get(ticket);
        if(!record || record.expiresAt <= Date.now()) return null;
        blackjackTickets.delete(ticket);
        return record.profile;
    },
    updateBankroll: async (userId, bankroll) => {
        const profile = blackjackProfiles.get(userId);
        if(profile) profile.bankroll = bankroll;
        const result = await getDatabase().from("app_users").update({blackjack_bankroll: bankroll}).eq("id", userId);
        databaseResult(result, "保存 Blackjack 赌资失败。");
    },
    updatePlaySeconds: async (userId, seconds) => {
        if(!Number.isSafeInteger(seconds) || seconds <= 0) return;
        const user = await findUserById(userId);
        if(!user) return;
        const next = Math.min(MAX_BLACKJACK_PLAY_SECONDS, Number(user.blackjack_play_seconds || 0) + seconds);
        databaseResult(await getDatabase().from("app_users").update({blackjack_play_seconds: next}).eq("id", userId), "保存 Blackjack 游玩时长失败。");
        const profile = blackjackProfiles.get(userId);
        if(profile) profile.playSeconds = next;
    }
});

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
        .select("id, email, phone_number, display_name, daily_limit, is_disabled, created_at, blackjack_bankroll, blackjack_play_seconds")
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
            blackjackBankroll: Number(user.blackjack_bankroll ?? 500),
            blackjackPlaySeconds: Number(user.blackjack_play_seconds ?? 0),
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
    if(Object.hasOwn(body, "blackjackBankroll")) {
        if(!Number.isSafeInteger(body.blackjackBankroll) || body.blackjackBankroll < 0 || body.blackjackBankroll > MAX_BLACKJACK_BANKROLL)
            throw Object.assign(new Error(`Blackjack 赌资必须为 0 至 ${MAX_BLACKJACK_BANKROLL} 的整数。`), {status: 400});
        updates.blackjack_bankroll = body.blackjackBankroll;
    }
    if(Object.hasOwn(body, "blackjackPlaySeconds")) {
        if(!Number.isSafeInteger(body.blackjackPlaySeconds) || body.blackjackPlaySeconds < 0 || body.blackjackPlaySeconds > MAX_BLACKJACK_PLAY_SECONDS)
            throw Object.assign(new Error("Blackjack 游玩时长不是有效整数。"), {status: 400});
        updates.blackjack_play_seconds = body.blackjackPlaySeconds;
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
    if(Object.hasOwn(updates, "blackjack_bankroll") || Object.hasOwn(updates, "blackjack_play_seconds") || Object.hasOwn(updates, "display_name")) blackjackProfiles.delete(userId);
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
        const verificationIdentity = {email: email || null, phoneNumber: phoneNumber || null};
        const retryAfter = await verificationRetryAfter(verificationIdentity);
        if(retryAfter > 0)
            return sendJson(response, 429, {error: `请等待 ${retryAfter} 秒后重新获取验证码。`, retryAfter}, origin);
        const cooldownKey = email || phoneNumber;
        verificationCooldowns.set(cooldownKey, Date.now() + VERIFICATION_COOLDOWN_SECONDS * 1000);
        try {
            return sendJson(response, 200, await sendLoginVerification(verificationIdentity), origin);
        } catch(error) {
            verificationCooldowns.delete(cooldownKey);
            throw error;
        }
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

async function handleMainlandBlackjack(request, response, url, origin) {
    const path = url.pathname.slice("/blackjack".length) || "/health";
    if(path === "/health" && request.method === "GET") {
        return sendJson(response, 200, {
            status: "ok", authority: "tencent", region: "mainland", realtime: true,
            upstream: false, now: Date.now()
        }, origin);
    }

    const lobbyJoinMatch = path.match(/^\/api\/lobby\/tables\/([^/]+)\/join$/);
    if(lobbyJoinMatch && request.method === "POST") {
        const user = await authenticatedUser(request);
        if(!user || user.is_disabled) return sendJson(response, 401, {message: "请先登录。"}, origin);
        const tableId = decodeURIComponent(lobbyJoinMatch[1]);
        if(!mainlandBlackjack.isValidTable(tableId)) return sendJson(response, 403, {message: "该牌桌尚未开放。"}, origin);
        const body = await readJson(request);
        const latency = value => Math.min(10_000, Math.max(1, Math.round(Number(value) || 10_000)));
        const route = await callCloudBaseRpc({
            envId: ENV_ID,
            apiKey: process.env.CLOUDBASE_APIKEY,
            functionName: "claim_blackjack_table_route",
            params: {
                p_table_id: tableId,
                p_user_id: user.id,
                p_tencent_ms: latency(body?.latencies?.tencent),
                p_cloudflare_ms: latency(body?.latencies?.cloudflare)
            }
        });
        return sendJson(response, 200, route, origin);
    }

    if(path === "/api/auth/sso" && request.method === "POST") {
        const user = await authenticatedUser(request);
        if(!user || user.is_disabled) return sendJson(response, 401, {message: "统一登录已过期，请重新登录。"}, origin);
        return sendJson(response, 200, {token: bearerToken(request), user: blackjackProfile(user), authority: "tencent"}, origin);
    }
    if(path === "/api/auth/me" && request.method === "GET") {
        const user = await authenticatedUser(request);
        if(!user || user.is_disabled) return sendJson(response, 401, {message: "请先登录。"}, origin);
        return sendJson(response, 200, {user: blackjackProfile(user), authority: "tencent"}, origin);
    }
    if(path === "/api/auth/profile" && (request.method === "GET" || request.method === "POST")) {
        const user = await authenticatedUser(request);
        if(!user || user.is_disabled) return sendJson(response, 401, {message: "请先登录。"}, origin);
        const profile = blackjackProfile(user);
        if(request.method === "POST") {
            const body = await readJson(request);
            const updates = {};
            if(typeof body.displayName === "string" && body.displayName.trim()) {
                profile.displayName = body.displayName.trim().slice(0, 20);
                updates.display_name = profile.displayName;
            }
            if(typeof body.avatarData === "string" && body.avatarData.length <= 140_000) {
                profile.avatarData = body.avatarData;
                updates.blackjack_avatar_data = body.avatarData;
            }
            if(Object.keys(updates).length) databaseResult(await getDatabase().from("app_users").update(updates).eq("id", user.id), "保存 Blackjack 资料失败。");
        }
        return sendJson(response, 200, {user: profile}, origin);
    }
    if(path === "/api/auth/claim-bankroll" && request.method === "POST") {
        const user = await authenticatedUser(request);
        if(!user || user.is_disabled) return sendJson(response, 401, {message: "请先登录。"}, origin);
        const profile = blackjackProfile(user);
        if(profile.bankroll >= 100) return sendJson(response, 400, {message: "赌资不少于 100，暂时不能领取。", user: profile}, origin);
        profile.bankroll += 100;
        databaseResult(await getDatabase().from("app_users").update({blackjack_bankroll: profile.bankroll}).eq("id", user.id), "保存 Blackjack 赌资失败。");
        return sendJson(response, 200, {message: "已领取 100 赌资。", user: profile}, origin);
    }
    if(path === "/api/auth/ws-ticket" && request.method === "POST") {
        const user = await authenticatedUser(request);
        if(!user || user.is_disabled) return sendJson(response, 401, {message: "请先登录。"}, origin);
        cleanupBlackjackTickets();
        const ticket = randomBytes(32).toString("base64url");
        blackjackTickets.set(ticket, {profile: blackjackProfile(user), expiresAt: Date.now() + 60_000});
        return sendJson(response, 200, {ticket, authority: "tencent"}, origin);
    }
    if(path === "/api/auth/logout" && request.method === "POST") return sendJson(response, 200, {ok: true}, origin);

    const tableMatch = path.match(/^\/(?:api\/)?tables\/([^/]+)\/(state|command)$/);
    if(!tableMatch) return sendJson(response, 404, {message: "接口不存在。"}, origin);
    const tableId = decodeURIComponent(tableMatch[1]);
    if(!mainlandBlackjack.isValidTable(tableId)) return sendJson(response, 403, {message: "该牌桌尚未开放。"}, origin);
    const clientId = url.searchParams.get("client_id");
    if(!clientId) return sendJson(response, 400, {message: "缺少客户端标识。"}, origin);
    if(tableMatch[2] === "state" && request.method === "GET")
        return sendJson(response, 200, mainlandBlackjack.stateFor(tableId, clientId), origin);
    if(tableMatch[2] === "command" && request.method === "POST") {
        const state = await mainlandBlackjack.command(tableId, clientId, await readJson(request), url.searchParams.get("ticket"));
        return sendJson(response, 200, state, origin);
    }
    return sendJson(response, 405, {message: "请求方法不受支持。"}, origin);
}

async function proxyBlackjack(request, response, url, origin) {
    const suffix = url.pathname.slice("/blackjack".length) || "/health";
    const target = new URL(suffix + url.search, BLACKJACK_UPSTREAM);
    const headers = new Headers({Accept: request.headers.accept || "application/json"});
    if(request.headers.authorization) headers.set("Authorization", request.headers.authorization);
    if(request.headers["content-type"]) headers.set("Content-Type", request.headers["content-type"]);
    if(origin) headers.set("Origin", origin);
    let body;
    if(request.method !== "GET" && request.method !== "HEAD") {
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
            size += chunk.length;
            if(size > 200_000) throw Object.assign(new Error("请求内容过大。"), {status: 413});
            chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
    }
    let upstream;
    try {
        upstream = await requestBlackjackUpstream(target, request.method, headers, body);
    } catch(error) {
        return sendJson(response, 502, {
            error: "Blackjack 联机服务暂时不可用。",
            detail: String(error?.message || error).slice(0, 500)
        }, origin);
    }
    setCorsHeaders(response, origin);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", upstream.contentType || "application/json; charset=utf-8");
    response.writeHead(upstream.status);
    response.end(upstream.body);
}

async function requestBlackjackUpstream(target, method, headers, body) {
    const failures = [];
    try {
        const result = await fetch(target, {method, headers, body, signal: AbortSignal.timeout(12_000)});
        return {
            status: result.status,
            contentType: result.headers.get("content-type"),
            body: Buffer.from(await result.arrayBuffer())
        };
    } catch (error) {
        failures.push(`dns:${error?.cause?.code || error?.code || error?.message || "failed"}`);
        console.warn("blackjack_dns_request_failed", error?.message || error);
    }

    for(const address of BLACKJACK_FALLBACK_IPS) {
        try {
            return await requestBlackjackByIp(target, method, headers, body, address);
        } catch (error) {
            failures.push(`tls-${address}:${error?.code || error?.message || "failed"}`);
            console.warn("blackjack_ip_request_failed", address, error?.message || error);
        }
    }
    throw new Error(`Blackjack upstream is unavailable (${failures.join("; ")})`);
}

function requestBlackjackByIp(target, method, headers, body, address) {
    const forwardedHeaders = Object.fromEntries(headers.entries());
    forwardedHeaders.host = target.hostname;
    forwardedHeaders["content-length"] = body ? String(body.length) : "0";
    return new Promise((resolve, reject) => {
        const upstreamRequest = https.request({
            hostname: address,
            port: 443,
            servername: target.hostname,
            rejectUnauthorized: true,
            path: `${target.pathname}${target.search}`,
            method,
            headers: forwardedHeaders,
            timeout: 12_000
        }, upstreamResponse => {
            const chunks = [];
            let size = 0;
            upstreamResponse.on("data", chunk => {
                size += chunk.length;
                if(size > 1_000_000) {
                    upstreamRequest.destroy(new Error("Blackjack upstream response is too large"));
                    return;
                }
                chunks.push(chunk);
            });
            upstreamResponse.on("end", () => resolve({
                status: upstreamResponse.statusCode || 502,
                contentType: upstreamResponse.headers["content-type"],
                body: Buffer.concat(chunks)
            }));
        });
        upstreamRequest.on("timeout", () => upstreamRequest.destroy(new Error("Blackjack upstream timed out")));
        upstreamRequest.on("error", reject);
        if(body?.length) upstreamRequest.write(body);
        upstreamRequest.end();
    });
}

function proxyBlackjackWebSocket(request, clientSocket, head) {
    const origin = request.headers.origin || "";
    if(origin && !ALLOWED_ORIGINS.has(origin)) {
        clientSocket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        return;
    }
    const url = new URL(request.url || "/", "https://localhost");
    if(!url.pathname.startsWith("/blackjack/ws/")) {
        clientSocket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        return;
    }
    const suffix = url.pathname.slice("/blackjack".length);
    const target = new URL(suffix + url.search, BLACKJACK_UPSTREAM);
    const addresses = [null, ...BLACKJACK_FALLBACK_IPS];
    let attemptIndex = 0;

    const attempt = () => {
        const address = addresses[attemptIndex++];
        const headers = {...request.headers, host: target.hostname};
        delete headers["content-length"];
        const upstreamRequest = https.request({
            hostname: address || target.hostname,
            port: 443,
            servername: target.hostname,
            rejectUnauthorized: true,
            path: `${target.pathname}${target.search}`,
            method: "GET",
            headers,
            timeout: 12_000
        });
        let upgraded = false;
        upstreamRequest.on("upgrade", (upstreamResponse, upstreamSocket, upstreamHead) => {
            upgraded = true;
            clientSocket.setTimeout(0);
            const statusLine = `HTTP/1.1 ${upstreamResponse.statusCode || 101} ${upstreamResponse.statusMessage || "Switching Protocols"}\r\n`;
            const responseHeaders = [];
            for(let index = 0; index < upstreamResponse.rawHeaders.length; index += 2)
                responseHeaders.push(`${upstreamResponse.rawHeaders[index]}: ${upstreamResponse.rawHeaders[index + 1]}`);
            clientSocket.write(`${statusLine}${responseHeaders.join("\r\n")}\r\n\r\n`);
            if(head?.length) upstreamSocket.write(head);
            if(upstreamHead?.length) clientSocket.write(upstreamHead);
            clientSocket.pipe(upstreamSocket);
            upstreamSocket.pipe(clientSocket);
            const closeBoth = () => { clientSocket.destroy(); upstreamSocket.destroy(); };
            clientSocket.on("error", closeBoth);
            upstreamSocket.on("error", closeBoth);
        });
        upstreamRequest.on("response", upstreamResponse => {
            upstreamResponse.resume();
            if(!upgraded) clientSocket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
        });
        upstreamRequest.on("timeout", () => upstreamRequest.destroy(new Error("Blackjack WebSocket upstream timed out")));
        upstreamRequest.on("error", error => {
            if(upgraded || clientSocket.destroyed) return;
            if(attemptIndex < addresses.length) { attempt(); return; }
            console.error("blackjack_websocket_proxy_failed", error?.message || error);
            clientSocket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
        });
        upstreamRequest.end();
    };
    clientSocket.setTimeout(15_000, () => clientSocket.destroy());
    attempt();
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
    if(url.pathname === "/blackjack" || url.pathname.startsWith("/blackjack/"))
        return handleMainlandBlackjack(request, response, url, origin);
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

const blackjackWebSocketServer = new WebSocketServer({noServer: true, maxPayload: 2_048});

server.on("upgrade", (request, socket, head) => {
    const origin = request.headers.origin || "";
    if(origin && !ALLOWED_ORIGINS.has(origin)) {
        socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        return;
    }
    const url = new URL(request.url || "/", "http://localhost");
    const match = url.pathname.match(/^\/blackjack\/ws\/tables\/([^/]+)$/);
    const tableId = match ? decodeURIComponent(match[1]) : "";
    const clientId = url.searchParams.get("client_id") || "";
    if(!match || !mainlandBlackjack.isValidTable(tableId) || !clientId) {
        socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        return;
    }
    blackjackWebSocketServer.handleUpgrade(request, socket, head, webSocket => {
        let ticket = url.searchParams.get("ticket");
        let commandQueue = Promise.resolve();
        const dispose = mainlandBlackjack.addConnection(tableId, clientId, payload => {
            if(webSocket.readyState === WebSocket.OPEN) webSocket.send(JSON.stringify(payload));
        });
        webSocket.on("message", data => {
            commandQueue = commandQueue.then(async () => {
                const raw = data.toString("utf8");
                if(Buffer.byteLength(raw) > 2_048) throw new Error("游戏命令过大。");
                const command = JSON.parse(raw);
                await mainlandBlackjack.command(tableId, clientId, command, ticket);
                if(command.type === "SIT_DOWN") ticket = null;
            }).catch(error => {
                if(webSocket.readyState === WebSocket.OPEN)
                    webSocket.send(JSON.stringify({type: "ERROR", payload: {message: error?.message || "无效的游戏命令。"}}));
            });
        });
        webSocket.once("close", dispose);
        webSocket.once("error", dispose);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Lggpt CloudBase backend listening on ${PORT}`);
});
