const PRODUCTION_API_BASES = [
    "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/api",
    "https://laogao-gpt-api.laogao0113.workers.dev/api"
];
const IS_LOCAL_PREVIEW = ["localhost", "127.0.0.1"].includes(location.hostname);
const API_BASES = IS_LOCAL_PREVIEW ? ["/api"] : PRODUCTION_API_BASES;
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
    messagesTab: document.getElementById("messages-tab"),
    usersTab: document.getElementById("users-tab"),
    messagesView: document.getElementById("messages-view"),
    usersView: document.getElementById("users-view"),
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
    pageLabel: document.getElementById("page-label"),
    userSearchForm: document.getElementById("user-search-form"),
    userSearch: document.getElementById("user-search-input"),
    userList: document.getElementById("user-list"),
    userEmpty: document.getElementById("user-empty-state"),
    userLoading: document.getElementById("user-loading"),
    userError: document.getElementById("user-dashboard-error"),
    userSummary: document.getElementById("user-result-summary"),
    userTotal: document.getElementById("stat-users"),
    userDisabled: document.getElementById("stat-disabled-users"),
    userPrevious: document.getElementById("user-previous-page"),
    userNext: document.getElementById("user-next-page"),
    userPageLabel: document.getElementById("user-page-label")
};

let adminToken = sessionStorage.getItem(TOKEN_KEY) || "";
let activeView = "messages";
let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let userPage = 1;
let userTotalPages = 1;
let userSearch = "";
let activeApiBaseIndex = 0;

async function fetchApi(path, options = {}) {
    const {timeoutMs = 20000, ...fetchOptions} = options;
    let lastError;
    const indexes = [activeApiBaseIndex, ...API_BASES.map((_, index) => index)
        .filter(index => index !== activeApiBaseIndex)];
    for(const index of indexes) {
        const timeoutController = new AbortController();
        const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
        try {
            const response = await fetch(`${API_BASES[index]}${path}`, {...fetchOptions, signal: timeoutController.signal});
            activeApiBaseIndex = index;
            return response;
        } catch(error) {
            lastError = error;
        } finally {
            clearTimeout(timeout);
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
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${adminToken}`);
    headers.set("Accept", "application/json");
    if(options.body) headers.set("Content-Type", "application/json");
    const response = await fetchApi(path, {...options, headers});
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

function field(labelText, className, value, type = "text") {
    const label = document.createElement("label");
    label.append(labelText);
    const input = document.createElement("input");
    input.className = className;
    input.type = type;
    input.value = value;
    if(type === "number") {
        input.min = "0";
        input.max = "500";
        input.step = "1";
    }
    label.append(input);
    return label;
}

function actionButton(text, action, className = "secondary-button") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.userAction = action;
    button.textContent = text;
    return button;
}

function createUserCard(user) {
    const article = document.createElement("article");
    article.className = `user-card${user.disabled ? " disabled" : ""}`;
    article.dataset.userId = user.id;

    const heading = document.createElement("div");
    heading.className = "user-heading";
    const identity = document.createElement("div");
    const account = document.createElement("strong");
    account.textContent = user.email || user.phoneNumber || "未设置登录账号";
    const created = document.createElement("span");
    created.textContent = `注册于 ${formatDate(user.createdAt)} · ID ${user.id.slice(0, 8)}…`;
    identity.append(account, document.createElement("br"), created);
    const status = document.createElement("span");
    status.className = `status-pill${user.disabled ? " disabled" : ""}`;
    status.textContent = user.disabled ? "已禁用" : "正常";
    heading.append(identity, status);

    const fields = document.createElement("div");
    fields.className = "user-fields";
    fields.append(
        field("昵称", "user-display-name", user.displayName),
        field("每日额度", "user-daily-limit", user.dailyLimit, "number"),
        field("今日已用", "user-used-today", user.usedToday, "number"),
        field("Blackjack 赌资", "user-blackjack-bankroll", user.blackjackBankroll, "number"),
        field("Blackjack 时长（秒）", "user-blackjack-play-seconds", user.blackjackPlaySeconds, "number")
    );

    const actions = document.createElement("div");
    actions.className = "user-actions";
    actions.append(
        actionButton("重置今日用量", "reset"),
        actionButton(user.disabled ? "启用账号" : "禁用账号", "toggle", user.disabled ? "primary-button" : "danger-button"),
        actionButton("保存修改", "save", "primary-button"),
        actionButton("删除账号", "delete", "danger-button")
    );
    article.append(heading, fields, actions);
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

async function loadUsers() {
    elements.userLoading.hidden = false;
    elements.userError.hidden = true;
    elements.userList.replaceChildren();
    elements.userEmpty.hidden = true;
    try {
        const params = new URLSearchParams({page: userPage, pageSize: 25});
        if(userSearch) params.set("search", userSearch);
        const data = await apiRequest(`/admin/users?${params}`);
        elements.userTotal.textContent = data.stats.total.toLocaleString("zh-CN");
        elements.userDisabled.textContent = data.stats.disabled.toLocaleString("zh-CN");
        userTotalPages = data.pagination.pages;
        userPage = Math.min(data.pagination.page, userTotalPages);
        elements.userSummary.textContent = `共 ${data.pagination.total} 个用户`;
        elements.userPageLabel.textContent = `第 ${userPage} / ${userTotalPages} 页`;
        elements.userPrevious.disabled = userPage <= 1;
        elements.userNext.disabled = userPage >= userTotalPages;
        for(const user of data.users) elements.userList.appendChild(createUserCard(user));
        elements.userEmpty.hidden = data.users.length > 0;
    } catch(error) {
        if(error.unauthorized) return showLogin(error.message);
        elements.userError.textContent = error.message || "读取用户失败。";
        elements.userError.hidden = false;
    } finally {
        elements.userLoading.hidden = true;
    }
}

function switchView(view) {
    activeView = view;
    const users = view === "users";
    elements.messagesView.hidden = users;
    elements.usersView.hidden = !users;
    elements.messagesTab.classList.toggle("active", !users);
    elements.usersTab.classList.toggle("active", users);
    if(users) loadUsers();
    else loadMessages();
}

async function manageUser(button) {
    const card = button.closest("[data-user-id]");
    if(!card) return;
    const userId = card.dataset.userId;
    const action = button.dataset.userAction;
    const displayName = card.querySelector(".user-display-name").value.trim();
    const dailyLimit = Number(card.querySelector(".user-daily-limit").value);
    const usedToday = Number(card.querySelector(".user-used-today").value);
    const blackjackBankroll = Number(card.querySelector(".user-blackjack-bankroll").value);
    const blackjackPlaySeconds = Number(card.querySelector(".user-blackjack-play-seconds").value);
    let options;
    if(action === "save") options = {method: "PATCH", body: JSON.stringify({displayName, dailyLimit, usedToday, blackjackBankroll, blackjackPlaySeconds})};
    if(action === "reset") {
        if(!confirm("确定将该用户今日用量重置为 0 吗？")) return;
        options = {method: "PATCH", body: JSON.stringify({usedToday: 0})};
    }
    if(action === "toggle") {
        const disabled = card.classList.contains("disabled");
        if(!disabled && !confirm("禁用后该用户的现有会话会立即失效，确定继续吗？")) return;
        options = {method: "PATCH", body: JSON.stringify({disabled: !disabled})};
    }
    if(action === "delete") {
        if(!confirm("确定永久删除该账号吗？消息记录会保留但不再关联账号。")) return;
        options = {method: "DELETE"};
    }
    if(!options) return;
    button.disabled = true;
    try {
        await apiRequest(`/admin/users/${encodeURIComponent(userId)}`, options);
        await loadUsers();
    } catch(error) {
        if(error.unauthorized) return showLogin(error.message);
        elements.userError.textContent = error.message || "更新用户失败。";
        elements.userError.hidden = false;
        button.disabled = false;
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
elements.userSearchForm.addEventListener("submit", event => {
    event.preventDefault();
    userSearch = elements.userSearch.value.trim();
    userPage = 1;
    loadUsers();
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
elements.userList.addEventListener("click", event => {
    const button = event.target.closest("[data-user-action]");
    if(button) manageUser(button);
});
elements.messagesTab.addEventListener("click", () => switchView("messages"));
elements.usersTab.addEventListener("click", () => switchView("users"));
elements.previous.addEventListener("click", () => { if(currentPage > 1) { currentPage--; loadMessages(); } });
elements.next.addEventListener("click", () => { if(currentPage < totalPages) { currentPage++; loadMessages(); } });
elements.userPrevious.addEventListener("click", () => { if(userPage > 1) { userPage--; loadUsers(); } });
elements.userNext.addEventListener("click", () => { if(userPage < userTotalPages) { userPage++; loadUsers(); } });
elements.refresh.addEventListener("click", () => activeView === "users" ? loadUsers() : loadMessages());
elements.logout.addEventListener("click", () => {
    adminToken = "";
    sessionStorage.removeItem(TOKEN_KEY);
    elements.token.value = "";
    showLogin();
});

if(adminToken) loadMessages();
else showLogin();
