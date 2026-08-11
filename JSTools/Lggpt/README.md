# Laogao GPT

## 邮箱验证码登录与用户管理

- 登录页使用 CloudBase Authentication v2 邮箱验证码，首次验证自动创建账号。
- 在 CloudBase 控制台的“身份认证 → 登录方式”中启用“邮箱验证码”，并配置发件身份和包含 `{{.VerificationCode}}` 的邮件模板。
- 验证码有效期 10 分钟，同一邮箱 60 秒内只能发送一次。
- 管理页面 `admin.html` 可以搜索用户、修改昵称、每日额度和今日用量，也可以立即禁用、启用或删除账号。
- 国内 DeepSeek 与海外 ChatGPT 共用同一登录状态和每日额度。

一个带安全服务端代理、连续对话和流式输出的轻量 AI 聊天页面。

## 本地启动

1. 确保已安装 Node.js 18 或更高版本。
2. 在项目根目录安装依赖：`npm.cmd install`
3. 设置环境变量 `OPENAI_API_KEY`。
4. 设置管理员令牌 `ADMIN_TOKEN`。
5. 可选设置 `OPENAI_MODEL`，默认使用 `gpt-5.6-luna`。
6. 运行：`npm.cmd run lggpt`
7. 打开聊天页：`http://localhost:3000/JSTools/Lggpt/`
8. 打开管理页：`http://localhost:3000/JSTools/Lggpt/admin.html`

PowerShell 示例：

```powershell
$env:OPENAI_API_KEY="your_openai_api_key"
$env:OPENAI_SAFETY_SALT="a-long-random-private-value"
$env:ADMIN_TOKEN="a-long-random-admin-token"
npm.cmd run lggpt
```

本地 Express 服务会在进程内记录最近 5000 条消息，重启后清空；线上 Worker 使用 D1 持久化。记录中只保留经过加盐哈希的访客标识，不保存原始 IP。管理员令牌仅保存在管理页面当前标签页的 `sessionStorage` 中。

### CloudBase 国内入口

`cloudbase-proxy` 是可部署到腾讯云 CloudBase Run 的国内后端，使用 DeepSeek API，并将邮箱账号、每日额度和用户消息写入 CloudBase PostgreSQL。海外 ChatGPT 请求仍由 Cloudflare Worker 处理，两条线路通过 CloudBase 共用登录状态和每日额度。

```powershell
tcb cloudrun deploy -e laogao-github-pages-d4bk62ce3432 -s laogao-gpt-proxy --port 8080 --source JSTools/Lggpt/cloudbase-proxy
```

在 CloudBase 服务端环境变量中设置 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL` 和 `ADMIN_TOKEN`，同时通过控制台的“API key 设置”注入 `CLOUDBASE_APIKEY`。不要把任何服务端密钥放进前端配置。

不要把真实密钥写入 `script.js`、提交到 Git，或部署到 GitHub Pages 的静态文件中。

## Cloudflare Worker 部署

项目保留了 Express 本地服务，并在 `worker/index.mjs` 中提供 Cloudflare Worker 版本的 API。

1. 登录 Cloudflare：`npx.cmd wrangler login`
2. 交互式设置 OpenAI 密钥：`npx.cmd wrangler secret put OPENAI_API_KEY --config JSTools/Lggpt/wrangler.jsonc`
3. 可选设置安全标识盐值：`npx.cmd wrangler secret put OPENAI_SAFETY_SALT --config JSTools/Lggpt/wrangler.jsonc`
4. 交互式设置管理员令牌：`npx.cmd wrangler secret put ADMIN_TOKEN --config JSTools/Lggpt/wrangler.jsonc`
5. 验证配置：`npm.cmd run deploy:lggpt:dry`
6. 首次部署（Wrangler 会自动预配 `laogao-gpt-messages` D1 数据库）：`npm.cmd run deploy:lggpt`
7. 应用数据库迁移：`npx.cmd wrangler d1 migrations apply laogao-gpt-messages --remote --config JSTools/Lggpt/wrangler.jsonc`

Worker 使用 Cloudflare Rate Limiting binding，每个匿名访问者每分钟最多请求 12 次。允许访问 API 的网页来源配置在 `wrangler.jsonc` 的 `ALLOWED_ORIGINS` 中。

完整页面与 API 已同域部署到 `https://laogao-gpt-api.laogao0113.workers.dev`。GitHub Pages 版本的前端会使用该地址下的 `/api`，本地开发仍使用本地同源 `/api`。管理页位于 `/JSTools/Lggpt/admin.html`，支持统计、内容搜索、分页和单条删除。不要把真实密钥写入代码、Wrangler 配置或 Git 仓库。

GitHub Pages 版本会优先通过 `blackjack-duel.laogao0113.workers.dev/api/lggpt` 网关访问服务，并在网络错误时回退到原始 Lggpt Worker。网关通过 Cloudflare Service Binding 内部转发，不持有或复制 OpenAI 密钥。
