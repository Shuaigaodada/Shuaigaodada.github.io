# Laogao GPT

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
