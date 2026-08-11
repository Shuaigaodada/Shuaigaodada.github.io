# Cloudflare 长期免费后端

这是原 `server/` 的 Cloudflare Workers + Durable Objects 改写版；原 Python/FastAPI 后端没有修改，可以继续本地运行。

## 部署

1. 安装 Node.js 20+，进入本目录后执行 `npm install`。
2. 执行 `npx wrangler login`，在浏览器授权 Cloudflare。
3. 本地测试：`npm run dev`。
4. 部署：`npm run deploy`。首次部署会创建 Durable Object 的 SQLite 存储与迁移。

部署完成会得到 `https://blackjack-duel.<你的账号>.workers.dev`。前端地址改为：

```
https://你的前端地址/?server=https://blackjack-duel.<你的账号>.workers.dev
```

该 Worker 保持原有 API：`/health`、`/api/tables/{tableId}/state` 和 `/ws/tables/{tableId}`。每个 `tableId` 由一个 Durable Object 保存房间状态；WebSocket、双人确认下一局及 60 秒超时自动停牌均由它处理。

`/api/lggpt/*` 通过 Service Binding 转发到 `laogao-gpt-api`，用于给 GitHub Pages 上的 Lggpt 提供备用访问线路，不在 Blackjack Worker 中保存 OpenAI 密钥。

大厅当前只允许 `table-1` 到 `table-5`，因此最多同时进行 5 个对局；前端已经预留 20 张桌位。需要扩容时，将 `src/index.ts` 中的 `OPEN_TABLE_LIMIT` 调高后重新部署。
