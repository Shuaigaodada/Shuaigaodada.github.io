const PRODUCTION_API_BASES = [
    "https://laogao-gpt-api.laogao0113.workers.dev/api",
    "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/api"
];
const IS_LOCAL_PREVIEW = ["localhost", "127.0.0.1"].includes(location.hostname);
const API_BASES = IS_LOCAL_PREVIEW ? ["/api"] : PRODUCTION_API_BASES;
const AUTH_API_BASE = API_BASES.length > 1 ? API_BASES[1] : API_BASES[0];
const MAX_HISTORY = 20;
const STORAGE_KEY = "laogao-gpt-session-v2";
const CONVERSATION_ID_KEY = "laogao-gpt-conversation-id-v1";
const MODEL_KEY = "laogao-gpt-model-v1";
const AUTH_TOKEN_KEY = "laogao-gpt-auth-token-v1";
const MODEL_OPTIONS = {
    "deepseek-v4-flash": {provider: "deepseek", apiIndex: 1},
    "gpt-5.6-luna": {provider: "openai", apiIndex: 0},
    "gpt-5-mini": {provider: "openai", apiIndex: 0},
    "gpt-5-nano": {provider: "openai", apiIndex: 0}
};

const elements = {
    messages: document.getElementById("messages"),
    welcome: document.getElementById("welcome"),
    form: document.getElementById("message-form"),
    input: document.getElementById("message-input"),
    send: document.getElementById("send-button"),
    stop: document.getElementById("stop-button"),
    counter: document.getElementById("character-count"),
    newChat: document.getElementById("new-chat"),
    title: document.getElementById("conversation-title"),
    errorBanner: document.getElementById("error-banner"),
    errorMessage: document.getElementById("error-message"),
    retry: document.getElementById("retry-button"),
    statusDot: document.getElementById("status-dot"),
    connectionText: document.getElementById("connection-text"),
    modelSelect: document.getElementById("model-select"),
    modelNetworkNotice: document.getElementById("model-network-notice"),
    authForm: document.getElementById("auth-form"),
    authEmail: document.getElementById("auth-email"),
    authPhone: document.getElementById("auth-phone"),
    authEmailField: document.getElementById("auth-email-field"),
    authPhoneField: document.getElementById("auth-phone-field"),
    emailMethod: document.getElementById("email-method"),
    phoneMethod: document.getElementById("phone-method"),
    authCode: document.getElementById("auth-code"),
    sendCodeButton: document.getElementById("send-code-button"),
    authDisplayName: document.getElementById("auth-display-name"),
    authTitle: document.getElementById("auth-title"),
    authCopy: document.getElementById("auth-copy"),
    authError: document.getElementById("auth-error"),
    authSubmit: document.getElementById("auth-submit"),
    signedInEmail: document.getElementById("signed-in-email"),
    logoutButton: document.getElementById("logout-button"),
    quotaBadge: document.getElementById("quota-badge"),
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    openSidebar: document.getElementById("open-sidebar"),
    closeSidebar: document.getElementById("close-sidebar")
};

let conversation = loadConversation();
let conversationId = loadConversationId();
let activeController = null;
let isGenerating = false;
let canRetry = false;
let selectedModel = loadSelectedModel();
let authToken = loadAuthToken();
let currentUser = null;
let loginVerificationId = "";
let authMethod = "email";
let resendTimer = null;
let currentQuota = {limit: 50, used: 0, remaining: 50};

async function fetchApi(path, options = {}) {
    const {timeoutMs = 30000, model = selectedModel, ...fetchOptions} = options;
    let lastError;
    const productionIndex = MODEL_OPTIONS[model]?.apiIndex ?? MODEL_OPTIONS["deepseek-v4-flash"].apiIndex;
    const indexes = API_BASES.length > 1 ? [productionIndex] : [0];
    for(const index of indexes) {
        const timeoutController = new AbortController();
        const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
        const signal = fetchOptions.signal
            ? AbortSignal.any([fetchOptions.signal, timeoutController.signal])
            : timeoutController.signal;
        try {
            const headers = new Headers(fetchOptions.headers);
            if(authToken) headers.set("Authorization", `Bearer ${authToken}`);
            const response = await fetch(`${API_BASES[index]}${path}`, {...fetchOptions, headers, signal});
            return response;
        } catch(error) {
            if(fetchOptions.signal?.aborted) throw error;
            lastError = error;
        } finally {
            clearTimeout(timeout);
        }
    }
    throw lastError || new Error("所有后端线路均不可用。");
}

function loadSelectedModel() {
    try {
        const saved = localStorage.getItem(MODEL_KEY);
        return saved && MODEL_OPTIONS[saved] ? saved : "deepseek-v4-flash";
    } catch(error) {
        return "deepseek-v4-flash";
    }
}

function updateModelSelection() {
    elements.modelSelect.value = selectedModel;
    elements.modelNetworkNotice.hidden = MODEL_OPTIONS[selectedModel].provider !== "openai";
}

async function selectModel(model) {
    if(!MODEL_OPTIONS[model] || model === selectedModel) return;
    if(activeController) activeController.abort();
    selectedModel = model;
    try { localStorage.setItem(MODEL_KEY, selectedModel); } catch(error) { /* Storage may be unavailable. */ }
    updateModelSelection();
    await checkService();
}

function loadAuthToken() {
    try { return localStorage.getItem(AUTH_TOKEN_KEY) || ""; }
    catch(error) { return ""; }
}

function saveAuthToken(token) {
    authToken = token;
    try {
        if(token) localStorage.setItem(AUTH_TOKEN_KEY, token);
        else localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch(error) { /* Storage may be unavailable. */ }
}

function updateQuota(quota = currentQuota) {
    currentQuota = quota || currentQuota;
    elements.quotaBadge.textContent = `今日剩余 ${currentQuota.remaining} / ${currentQuota.limit}`;
}

function showAuth(user, quota) {
    currentUser = user;
    elements.signedInEmail.textContent = user.email || user.phoneNumber || user.displayName;
    updateQuota(quota);
    document.body.classList.remove("auth-pending", "auth-required");
    document.body.classList.add("authenticated");
}

function requireAuth(message = "") {
    currentUser = null;
    document.body.classList.remove("auth-pending", "authenticated");
    document.body.classList.add("auth-required");
    elements.authError.textContent = message;
    elements.authError.hidden = !message;
}

async function authRequest(path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if(options.body) headers.set("Content-Type", "application/json");
    if(authToken) headers.set("Authorization", `Bearer ${authToken}`);
    const response = await fetch(`${AUTH_API_BASE}${path}`, {...options, headers});
    let payload = {};
    try { payload = await response.json(); } catch(error) { /* Handled below. */ }
    if(!response.ok) throw Object.assign(new Error(payload.error || "登录服务暂时不可用。"), {status: response.status});
    return payload;
}

async function initializeAuth() {
    if(!authToken) {
        requireAuth();
        return;
    }
    try {
        const payload = await authRequest("/auth/me");
        showAuth(payload.user, payload.quota);
        await checkService();
    } catch(error) {
        saveAuthToken("");
        requireAuth(error.status === 401 ? "登录已过期，请重新登录。" : "暂时无法连接登录服务。请稍后重试。");
    }
}

function showAuthError(message = "") {
    elements.authError.textContent = message;
    elements.authError.hidden = !message;
}

function startResendCountdown(seconds = 60) {
    if(resendTimer) clearInterval(resendTimer);
    let remaining = seconds;
    elements.sendCodeButton.disabled = true;
    elements.sendCodeButton.textContent = `${remaining} 秒后重发`;
    resendTimer = setInterval(() => {
        remaining -= 1;
        if(remaining <= 0) {
            clearInterval(resendTimer);
            resendTimer = null;
            elements.sendCodeButton.disabled = false;
            elements.sendCodeButton.textContent = "重新发送";
            return;
        }
        elements.sendCodeButton.textContent = `${remaining} 秒后重发`;
    }, 1000);
}

function setAuthMethod(method) {
    if(!["email", "phone"].includes(method) || authMethod === method) return;
    authMethod = method;
    loginVerificationId = "";
    if(resendTimer) clearInterval(resendTimer);
    resendTimer = null;
    elements.authEmail.readOnly = false;
    elements.authPhone.readOnly = false;
    elements.authCode.value = "";
    elements.authCode.disabled = true;
    elements.authSubmit.disabled = true;
    elements.sendCodeButton.disabled = false;
    elements.sendCodeButton.textContent = "获取验证码";
    elements.authEmailField.hidden = method !== "email";
    elements.authPhoneField.hidden = method !== "phone";
    elements.authEmail.required = method === "email";
    elements.authPhone.required = method === "phone";
    elements.emailMethod.classList.toggle("active", method === "email");
    elements.phoneMethod.classList.toggle("active", method === "phone");
    elements.emailMethod.setAttribute("aria-pressed", String(method === "email"));
    elements.phoneMethod.setAttribute("aria-pressed", String(method === "phone"));
    showAuthError();
}

async function sendVerificationCode() {
    const identityInput = authMethod === "email" ? elements.authEmail : elements.authPhone;
    if(!identityInput.reportValidity()) return;
    elements.sendCodeButton.disabled = true;
    showAuthError();
    try {
        const payload = await authRequest("/auth/send-code", {
            method: "POST",
            body: JSON.stringify(authMethod === "email"
                ? {email: elements.authEmail.value}
                : {phoneNumber: elements.authPhone.value})
        });
        loginVerificationId = payload.verificationId;
        identityInput.readOnly = true;
        elements.authCode.disabled = false;
        elements.authSubmit.disabled = false;
        elements.authCode.focus();
        startResendCountdown(60);
    } catch(error) {
        showAuthError(error.message);
        elements.sendCodeButton.disabled = false;
    }
}

async function submitAuth(event) {
    event.preventDefault();
    elements.authSubmit.disabled = true;
    elements.authError.hidden = true;
    try {
        if(!loginVerificationId) throw new Error("请先获取验证码。");
        const payload = await authRequest("/auth/verify-code", {
            method: "POST",
            body: JSON.stringify({
                verificationId: loginVerificationId,
                code: elements.authCode.value,
                displayName: elements.authDisplayName.value
            })
        });
        saveAuthToken(payload.token);
        showAuth(payload.user, payload.quota);
        elements.authCode.value = "";
        await checkService();
    } catch(error) {
        elements.authError.textContent = error.message;
        elements.authError.hidden = false;
    } finally {
        elements.authSubmit.disabled = false;
    }
}

async function logout() {
    try { await authRequest("/auth/logout", {method: "POST"}); } catch(error) { /* Local logout still succeeds. */ }
    saveAuthToken("");
    requireAuth();
}

function loadConversation() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        if(!Array.isArray(saved)) return [];
        return saved
            .filter(message => ["user", "assistant"].includes(message.role) && typeof message.content === "string")
            .map(message => ({
                role: message.role,
                content: message.content,
                ...(message.role === "user" ? {id: normalizeClientId(message.id)} : {})
            }))
            .slice(-MAX_HISTORY);
    } catch(error) {
        return [];
    }
}

function createClientId() {
    return crypto.randomUUID();
}

function normalizeClientId(value) {
    return typeof value === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(value) ? value : createClientId();
}

function loadConversationId() {
    try {
        return normalizeClientId(sessionStorage.getItem(CONVERSATION_ID_KEY));
    } catch(error) {
        return createClientId();
    }
}

function saveConversation() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversation.slice(-MAX_HISTORY)));
        sessionStorage.setItem(CONVERSATION_ID_KEY, conversationId);
    } catch(error) {
        // 隐私模式或存储空间不足时仍可继续当前对话
    }
}

function setConnection(status, text) {
    elements.statusDot.className = `status-dot ${status}`;
    elements.connectionText.textContent = text;
}

async function checkService() {
    try {
        const response = await fetchApi("/health", {headers: {"Accept": "application/json"}, timeoutMs: 4000});
        if(!response.ok) throw new Error("Service unavailable");
        const data = await response.json();
        if(data.configured) setConnection("online", "服务已连接");
        else setConnection("offline", "服务尚未配置");
    } catch(error) {
        setConnection("offline", "后端服务未连接");
    }
}

function updateConversationTitle() {
    const firstMessage = conversation.find(message => message.role === "user");
    elements.title.textContent = firstMessage
        ? firstMessage.content.replace(/\s+/g, " ").slice(0, 24) || "新的对话"
        : "新的对话";
}

function formatTime(date = new Date()) {
    return new Intl.DateTimeFormat("zh-CN", {hour: "2-digit", minute: "2-digit", hour12: false}).format(date);
}

function appendInlineContent(container, text) {
    const tokenPattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
    let lastIndex = 0;
    let match;

    while((match = tokenPattern.exec(text)) !== null) {
        if(match.index > lastIndex)
            container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));

        const token = match[0];
        if(token.startsWith("`")) {
            const code = document.createElement("code");
            code.className = "inline-code";
            code.textContent = token.slice(1, -1);
            container.appendChild(code);
        } else {
            const strong = document.createElement("strong");
            strong.textContent = token.slice(2, -2);
            container.appendChild(strong);
        }
        lastIndex = tokenPattern.lastIndex;
    }

    if(lastIndex < text.length)
        container.appendChild(document.createTextNode(text.slice(lastIndex)));
}

function renderTextBlocks(container, text) {
    const lines = text.replace(/\r/g, "").split("\n");
    let paragraph = [];
    let list = null;
    let listType = null;

    const flushParagraph = () => {
        if(!paragraph.length) return;
        const element = document.createElement("p");
        paragraph.forEach((line, index) => {
            if(index) element.appendChild(document.createElement("br"));
            appendInlineContent(element, line);
        });
        container.appendChild(element);
        paragraph = [];
    };

    const flushList = () => {
        if(list) container.appendChild(list);
        list = null;
        listType = null;
    };

    for(const line of lines) {
        const unordered = line.match(/^\s*[-*]\s+(.+)$/);
        const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
        const heading = line.match(/^(#{1,3})\s+(.+)$/);

        if(unordered || ordered) {
            flushParagraph();
            const type = unordered ? "ul" : "ol";
            if(listType !== type) {
                flushList();
                list = document.createElement(type);
                listType = type;
            }
            const item = document.createElement("li");
            appendInlineContent(item, (unordered || ordered)[1]);
            list.appendChild(item);
        } else if(heading) {
            flushParagraph();
            flushList();
            const element = document.createElement(`h${Math.min(heading[1].length + 2, 5)}`);
            appendInlineContent(element, heading[2]);
            container.appendChild(element);
        } else if(!line.trim()) {
            flushParagraph();
            flushList();
        } else {
            flushList();
            paragraph.push(line);
        }
    }

    flushParagraph();
    flushList();
}

function createCodeBlock(language, code) {
    const wrapper = document.createElement("div");
    wrapper.className = "code-block";

    const header = document.createElement("div");
    header.className = "code-header";
    const languageLabel = document.createElement("span");
    languageLabel.textContent = language || "text";
    const copyButton = document.createElement("button");
    copyButton.className = "copy-code";
    copyButton.type = "button";
    copyButton.textContent = "复制";
    copyButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(code);
            copyButton.textContent = "已复制";
            setTimeout(() => { copyButton.textContent = "复制"; }, 1200);
        } catch(error) {
            copyButton.textContent = "复制失败";
        }
    });
    header.append(languageLabel, copyButton);

    const pre = document.createElement("pre");
    const codeElement = document.createElement("code");
    codeElement.textContent = code.replace(/\n$/, "");
    pre.appendChild(codeElement);
    wrapper.append(header, pre);
    return wrapper;
}

function renderSafeContent(container, content) {
    container.replaceChildren();
    const fencePattern = /```([\w.+-]*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while((match = fencePattern.exec(content)) !== null) {
        if(match.index > lastIndex)
            renderTextBlocks(container, content.slice(lastIndex, match.index));
        container.appendChild(createCodeBlock(match[1], match[2]));
        lastIndex = fencePattern.lastIndex;
    }

    if(lastIndex < content.length)
        renderTextBlocks(container, content.slice(lastIndex));
}

function createTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.setAttribute("aria-label", "正在生成回复");
    indicator.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    return indicator;
}

function createMessageElement(role, content, pending = false) {
    const row = document.createElement("article");
    row.className = `message-row ${role}`;

    const inner = document.createElement("div");
    inner.className = "message-inner";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "YOU" : "G";
    avatar.setAttribute("aria-hidden", "true");

    const body = document.createElement("div");
    body.className = "message-body";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    const author = document.createElement("strong");
    author.textContent = role === "user" ? "你" : "Laogao GPT";
    const time = document.createElement("time");
    time.textContent = formatTime();
    meta.append(author, time);

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    if(pending) messageContent.appendChild(createTypingIndicator());
    else renderSafeContent(messageContent, content);
    body.append(meta, messageContent);
    inner.append(avatar, body);
    row.appendChild(inner);
    return {row, content: messageContent};
}

function scrollToBottom(behavior = "smooth") {
    requestAnimationFrame(() => {
        elements.messages.scrollTo({top: elements.messages.scrollHeight, behavior});
    });
}

function renderConversation() {
    elements.messages.replaceChildren();
    if(!conversation.length) {
        elements.messages.appendChild(elements.welcome);
    } else {
        for(const message of conversation)
            elements.messages.appendChild(createMessageElement(message.role, message.content).row);
    }
    updateConversationTitle();
    scrollToBottom("auto");
}

function setGenerating(value) {
    isGenerating = value;
    elements.input.disabled = value;
    elements.send.hidden = value;
    elements.stop.hidden = !value;
    updateComposerState();
}

function updateComposerState() {
    const length = elements.input.value.length;
    elements.counter.textContent = `${length} / 4000`;
    elements.counter.classList.toggle("near-limit", length > 3600);
    elements.send.disabled = isGenerating || !elements.input.value.trim();
    elements.input.style.height = "auto";
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 180)}px`;
}

function showError(message, retry = true) {
    elements.errorMessage.textContent = message;
    elements.retry.hidden = !retry;
    elements.errorBanner.hidden = false;
    canRetry = retry;
}

function hideError() {
    elements.errorBanner.hidden = true;
    canRetry = false;
}

function getFriendlyError(error) {
    if(error.name === "AbortError") return "已停止生成。";
    if(error.status === 429) return "请求过于频繁，请稍后再试。";
    if(error.status === 503) return "服务尚未配置，请先在服务端设置 OPENAI_API_KEY。";
    if(error.status === 400) return error.message || "消息格式不正确。";
    if(error.message === "Failed to fetch") return "无法连接后端服务，请确认 Lggpt 服务已经启动。";
    return error.message || "生成回复时出现问题，请重试。";
}

async function readError(response) {
    try {
        const data = await response.json();
        return data.error || `请求失败（${response.status}）`;
    } catch(error) {
        return `请求失败（${response.status}）`;
    }
}

async function requestAssistant() {
    if(isGenerating || !conversation.length) return;
    hideError();
    setGenerating(true);
    activeController = new AbortController();

    const assistant = createMessageElement("assistant", "", true);
    elements.messages.appendChild(assistant.row);
    scrollToBottom();
    let output = "";
    let renderFrame = null;

    const updateOutput = () => {
        renderFrame = null;
        renderSafeContent(assistant.content, output);
        scrollToBottom("auto");
    };

    try {
        const lastUserMessage = [...conversation].reverse().find(message => message.role === "user");
        const response = await fetchApi("/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json", "Accept": "application/x-ndjson"},
            body: JSON.stringify({
                messages: conversation.slice(-MAX_HISTORY),
                conversationId,
                messageId: lastUserMessage?.id,
                model: selectedModel
            }),
            signal: activeController.signal
        });

        if(!response.ok) {
            const message = await readError(response);
            if(response.status === 401) {
                saveAuthToken("");
                requireAuth(message);
            }
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }
        const remaining = Number(response.headers.get("X-Daily-Remaining"));
        const limit = Number(response.headers.get("X-Daily-Limit"));
        if(Number.isFinite(remaining) && Number.isFinite(limit))
            updateQuota({limit, remaining, used: Math.max(0, limit - remaining)});
        if(!response.body) throw new Error("浏览器不支持流式响应。");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while(true) {
            const {value, done} = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), {stream: !done});
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for(const line of lines) {
                if(!line.trim()) continue;
                const event = JSON.parse(line);
                if(event.type === "delta") {
                    output += event.delta;
                    if(!renderFrame) renderFrame = requestAnimationFrame(updateOutput);
                } else if(event.type === "error") {
                    throw new Error(event.error || "生成回复失败。 ");
                }
            }
            if(done) break;
        }

        if(renderFrame) cancelAnimationFrame(renderFrame);
        if(!output.trim()) throw new Error("服务没有返回内容，请重试。");
        renderSafeContent(assistant.content, output);
        conversation.push({role: "assistant", content: output});
        conversation = conversation.slice(-MAX_HISTORY);
        saveConversation();
    } catch(error) {
        if(renderFrame) cancelAnimationFrame(renderFrame);
        if(error.name === "AbortError" && output.trim()) {
            renderSafeContent(assistant.content, output);
            conversation.push({role: "assistant", content: output});
            conversation = conversation.slice(-MAX_HISTORY);
            saveConversation();
        } else {
            assistant.row.remove();
            if(error.name !== "AbortError") showError(getFriendlyError(error));
        }
    } finally {
        activeController = null;
        setGenerating(false);
        elements.input.focus();
        scrollToBottom();
    }
}

async function sendMessage(text) {
    const message = text.trim();
    if(!message || isGenerating) return;

    if(!conversation.length) elements.messages.replaceChildren();
    conversation.push({role: "user", content: message, id: createClientId()});
    conversation = conversation.slice(-MAX_HISTORY);
    saveConversation();
    updateConversationTitle();
    elements.messages.appendChild(createMessageElement("user", message).row);
    elements.input.value = "";
    updateComposerState();
    scrollToBottom();
    await requestAssistant();
}

function newConversation() {
    if(activeController) activeController.abort();
    conversation = [];
    conversationId = createClientId();
    saveConversation();
    hideError();
    renderConversation();
    elements.input.value = "";
    updateComposerState();
    elements.input.focus();
    closeSidebar();
}

function openSidebar() {
    elements.sidebar.classList.add("open");
    elements.sidebarBackdrop.hidden = false;
}

function closeSidebar() {
    elements.sidebar.classList.remove("open");
    elements.sidebarBackdrop.hidden = true;
}

elements.form.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(elements.input.value);
});
elements.modelSelect.addEventListener("change", () => selectModel(elements.modelSelect.value));
elements.authForm.addEventListener("submit", submitAuth);
elements.sendCodeButton.addEventListener("click", sendVerificationCode);
elements.emailMethod.addEventListener("click", () => setAuthMethod("email"));
elements.phoneMethod.addEventListener("click", () => setAuthMethod("phone"));
elements.authEmail.addEventListener("input", () => {
    if(!elements.authEmail.readOnly) loginVerificationId = "";
});
elements.authPhone.addEventListener("input", () => {
    if(!elements.authPhone.readOnly) loginVerificationId = "";
});
elements.logoutButton.addEventListener("click", logout);

elements.input.addEventListener("input", updateComposerState);
elements.input.addEventListener("keydown", event => {
    if(event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        elements.form.requestSubmit();
    }
});

elements.stop.addEventListener("click", () => activeController && activeController.abort());
elements.newChat.addEventListener("click", newConversation);
elements.retry.addEventListener("click", () => {
    if(canRetry) requestAssistant();
});
elements.openSidebar.addEventListener("click", openSidebar);
elements.closeSidebar.addEventListener("click", closeSidebar);
elements.sidebarBackdrop.addEventListener("click", closeSidebar);

for(const button of document.querySelectorAll(".suggestion")) {
    button.addEventListener("click", () => {
        elements.input.value = button.dataset.prompt || "";
        updateComposerState();
        elements.input.focus();
    });
}

updateModelSelection();
renderConversation();
updateComposerState();
initializeAuth();
