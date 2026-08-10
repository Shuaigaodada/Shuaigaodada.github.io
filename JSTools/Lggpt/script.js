const PRODUCTION_API_BASE = "https://laogao-gpt-api.laogao0113.workers.dev/api";
const API_BASE = location.hostname === "shuaigaodada.github.io" ? PRODUCTION_API_BASE : "/api";
const MAX_HISTORY = 20;
const STORAGE_KEY = "laogao-gpt-session-v2";

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
    modelName: document.getElementById("model-name"),
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    openSidebar: document.getElementById("open-sidebar"),
    closeSidebar: document.getElementById("close-sidebar")
};

let conversation = loadConversation();
let activeController = null;
let isGenerating = false;
let canRetry = false;

function loadConversation() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        if(!Array.isArray(saved)) return [];
        return saved
            .filter(message => ["user", "assistant"].includes(message.role) && typeof message.content === "string")
            .slice(-MAX_HISTORY);
    } catch(error) {
        return [];
    }
}

function saveConversation() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversation.slice(-MAX_HISTORY)));
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
        const response = await fetch(`${API_BASE}/health`, {headers: {"Accept": "application/json"}});
        if(!response.ok) throw new Error("Service unavailable");
        const data = await response.json();
        elements.modelName.textContent = data.model || "AI Assistant";
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
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: {"Content-Type": "application/json", "Accept": "application/x-ndjson"},
            body: JSON.stringify({messages: conversation.slice(-MAX_HISTORY)}),
            signal: activeController.signal
        });

        if(!response.ok) {
            const message = await readError(response);
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }
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
    conversation.push({role: "user", content: message});
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

renderConversation();
updateComposerState();
checkService();
