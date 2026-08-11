const PRODUCTION_API_BASES = [
    "https://blackjack-duel.laogao0113.workers.dev/api/lggpt",
    "https://laogao-gpt-api.laogao0113.workers.dev/api"
];
const API_BASES = location.hostname === "shuaigaodada.github.io" ? PRODUCTION_API_BASES : ["/api"];
const TOKEN_KEY = "laogao-gpt-admin-token";

const elements = {
    loginPanel: document.getElementById("login-panel"),
    loginForm: document.getElementById("login-form"),
    token: document.getElementById("admin-token"),
    loginError: document.getElementById("login-error"),
    dashboard: document.getElementById("dashboard"),
    headerActions: document.getElementById("header-actions"),
    refresh: document.getElementById("refresh-button"),
    logout: document.getElementById("logout-button"),
    searchForm: document.getElementById("search-form"),
    search: document.getElementById("search-input"),
    list: document.getElementById("message-list"),
    empty: document.getElementById("empty-state"),
    loading: document.getElementById("loading"),
    error: document.getElementById("dashboard-error"),
    summary: document.getElementById("result-summary"),
    total: document.getElementById("stat-total"),
    today: document.getElementById("stat-today"),
    visitors: document.getElementById("stat-visitors"),
    previous: document.getElementById("previous-page"),
    next: document.getElementById("next-page"),
    pageLabel: document.getElementById("page-label")
};

let adminToken = sessionStorage.getItem(TOKEN_KEY) || "";
let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let activeApiBaseIndex = 0;

async function fetchApi(path, options = {}) {
    let lastError;
    const indexes = [activeApiBaseIndex, ...API_BASES.map((_, index) => index)
        .filter(index => index !== activeApiBaseIndex)];
    for(const index of indexes) {
        try {
            const response = await fetch(`${API_BASES[index]}${path}`, options);
            activeApiBaseIndex = index;
            return response;
        } catch(error) {
            lastError = error;
        }
    }
    throw lastError || new Error("所有后端线路均不可用。");
}

function showLogin(message = "") {
    elements.loginPanel.hidden = false;
    elements.dashboard.hidden = true;
    elements.headerActions.hidden = true;
    elements.loginError.textContent = message;
    elements.loginError.hidden = !message;
    elements.token.focus();
}

function showDashboard() {
    elements.loginPanel.hidden = true;
    elements.dashboard.hidden = false;
    elements.headerActions.hidden = false;
}

async function apiRequest(path, options = {}) {
    const response = await fetchApi(path, {
        ...options,
        headers: {"Authorization": `Bearer ${adminToken}`, "Accept": "application/json", ...options.headers}
    });
    if(response.status === 401) {
        adminToken = "";
        sessionStorage.removeItem(TOKEN_KEY);
        throw Object.assign(new Error("管理员令牌无效，请重新输入。"), {unauthorized: true});
    }
    if(!response.ok) {
        let message = `请求失败（${response.status}）`;
        try { message = (await response.json()).error || message; } catch(error) { /* 非 JSON 响应 */ }
        throw new Error(message);
    }
    return response.json();
}

function formatDate(value) {
    if(!value) return "—";
    const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium", timeStyle: "short", hour12: false
    }).format(date);
}

function createMessageCard(message) {
    const article = document.createElement("article");
    article.className = "message-card";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    const visitor = document.createElement("span");
    visitor.className = "visitor-id";
    visitor.title = message.visitor_id;
    visitor.textContent = `访客 ${message.visitor_id.slice(0, 12)}…`;
    const time = document.createElement("time");
    time.dateTime = message.created_at;
    time.textContent = formatDate(message.created_at);
    meta.append(visitor, time);

    const content = document.createElement("p");
    content.className = "message-content";
    content.textContent = message.content;
    const footer = document.createElement("div");
    footer.className = "message-footer";
    const details = document.createElement("span");
    details.textContent = `${message.model} · 对话 ${message.conversation_id.slice(0, 8)}…`;
    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.dataset.messageId = message.id;
    remove.textContent = "删除";
    footer.append(details, remove);
    article.append(meta, content, footer);
    return article;
}

async function loadMessages() {
    elements.loading.hidden = false;
    elements.error.hidden = true;
    elements.list.replaceChildren();
    elements.empty.hidden = true;
    try {
        const params = new URLSearchParams({page: currentPage, pageSize: 25});
        if(currentSearch) params.set("search", currentSearch);
        const data = await apiRequest(`/admin/messages?${params}`);
        showDashboard();
        sessionStorage.setItem(TOKEN_KEY, adminToken);
        elements.total.textContent = data.stats.total.toLocaleString("zh-CN");
        elements.today.textContent = data.stats.today.toLocaleString("zh-CN");
        elements.visitors.textContent = data.stats.visitors.toLocaleString("zh-CN");
        totalPages = data.pagination.pages;
        currentPage = Math.min(data.pagination.page, totalPages);
        elements.summary.textContent = `共 ${data.pagination.total} 条结果`;
        elements.pageLabel.textContent = `第 ${currentPage} / ${totalPages} 页`;
        elements.previous.disabled = currentPage <= 1;
        elements.next.disabled = currentPage >= totalPages;
        for(const message of data.messages) elements.list.appendChild(createMessageCard(message));
        elements.empty.hidden = data.messages.length > 0;
    } catch(error) {
        if(error.unauthorized) return showLogin(error.message);
        if(elements.dashboard.hidden) return showLogin(error.message || "读取消息失败。");
        elements.error.textContent = error.message || "读取消息失败。";
        elements.error.hidden = false;
    } finally {
        elements.loading.hidden = true;
    }
}

elements.loginForm.addEventListener("submit", event => {
    event.preventDefault();
    adminToken = elements.token.value.trim();
    if(adminToken) loadMessages();
});

elements.searchForm.addEventListener("submit", event => {
    event.preventDefault();
    currentSearch = elements.search.value.trim();
    currentPage = 1;
    loadMessages();
});

elements.list.addEventListener("click", async event => {
    const button = event.target.closest("[data-message-id]");
    if(!button || !confirm("确定永久删除这条消息记录吗？")) return;
    button.disabled = true;
    try {
        await apiRequest(`/admin/messages/${encodeURIComponent(button.dataset.messageId)}`, {method: "DELETE"});
        await loadMessages();
    } catch(error) {
        if(error.unauthorized) return showLogin(error.message);
        elements.error.textContent = error.message || "删除失败。";
        elements.error.hidden = false;
        button.disabled = false;
    }
});

elements.previous.addEventListener("click", () => { if(currentPage > 1) { currentPage--; loadMessages(); } });
elements.next.addEventListener("click", () => { if(currentPage < totalPages) { currentPage++; loadMessages(); } });
elements.refresh.addEventListener("click", loadMessages);
elements.logout.addEventListener("click", () => {
    adminToken = "";
    sessionStorage.removeItem(TOKEN_KEY);
    elements.token.value = "";
    showLogin();
});

if(adminToken) loadMessages();
else showLogin();
