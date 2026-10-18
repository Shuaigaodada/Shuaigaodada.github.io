# Blackjack

牌桌：1–5 为原自由 21 点；6–10 为 80 张觉醒牌真人对决；11–15 为传统 Blackjack，两位真人轮流坐庄。手机竖屏显示旋转提示，横屏恢复原牌局。

卡面左上角显示小号点数，多候选值按上、右、下、左排列，以 X 分隔并高亮采用值。中央花色数量等于采用值的绝对值（0 不画花色），1–10 使用普通扑克牌点阵；技能文字完整显示，点击牌位可展开整个牌堆。

传统桌采用 52 张牌、S17、自然 3:2、平局退注、加倍、最多四手分牌、分 A 只补一张、保险 2:1、晚投降。每回合重新洗牌。觉醒规则见 [规则文档](game/PVP_AWAKENED_CARD_RULES.md)。

## 本地验证

从仓库根目录执行：

```powershell
npm.cmd test --prefix JSGAME/blackjack
npm.cmd test --prefix JSTools/Lggpt/cloudbase-proxy
npm.cmd run build --prefix JSGAME/blackjack
```

浏览器验证先在两个终端分别启动：

```powershell
node JSTools/Lggpt/cloudbase-proxy/duel-test-server.mjs
npm.cmd run dev --prefix JSGAME/blackjack -- --host 127.0.0.1 --port 5173
```

然后执行 `node JSGAME/blackjack/tests/awakened-ui.mjs`。Playwright 不在默认模块目录时，将 `PLAYWRIGHT_MODULE` 设为它的 `index.mjs` 绝对路径。测试使用独立浏览器身份检查双人同步、回合结算、手机方向及全部 80 张技能牌的文字和花色数量。`tests/duel-login.html` 仅用于本地测试身份，不连接真实账号。

可选数据库检查：将 `PGLITE_MODULE` 设为已安装的 `@electric-sql/pglite/dist/index.js` 路径，执行 `node JSTools/Lggpt/cloudbase-proxy/duel-db-check.mjs`，验证迁移、资金回滚、牌局版本冲突及跨桌座位限制。

## 发布状态与顺序

当前修改已完成本地验证，尚未发布到线上。新模式统一由腾讯后端提供，不能只上传前端。

1. 在现有数据库应用 `JSTools/Lggpt/cloudbase-proxy/migrations/0008_blackjack_duel_state.sql`。
2. 部署该目录的后端 Docker 镜像，包含新规则模块。
3. 验证真实登录、入座、断线恢复和资金结算，再发布前端 `dist` 到 Pages 使用的 `main` 分支。

初始分牌使用固定权重；规则文档中的胜率驱动自动调权尚未启用。腾讯新旧牌桌共享数据库座位锁，入座时禁止领取救济筹码。Cloudflare 旧桌使用其独立钱包。

腾讯旧规则牌局仍在内存中，进程意外停止后保留 `blackjack_legacy_seats` 锁，防止旧进程恢复时覆盖其他牌桌的余额。管理员须确认旧进程已停止、核对未结算下注后释放该锁；新模式通过数据库牌局状态恢复，不需要此操作。
