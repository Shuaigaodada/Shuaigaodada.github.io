# Shuaigaodada.github.io

个人 Web 实验室 GAO LAB：把自写小游戏、学习文档、前端练习和几个后端小服务放在同一个 GitHub Pages 站点里（[访问](https://shuaigaodada.github.io)）。

## 简介

根目录 `index.html` 是站点首页「GAO LAB — Web 实验室」，用卡片导航到三块内容：

- **精选游戏** (`JSGAME/`)：Flappy Bird、Blackjack Duel、贪吃蛇、点击挑战，另有 2D 游戏引擎、赛车、植物大战僵尸等实验目录。
- **学习文档** (`learn/`)：纯静态的摄影与视频基础文档站，带全文搜索、主题切换和 Canvas 交互实验。
- **课程练习** (`asd-projects/`)：Canvas 形状、调试、排序、图像滤镜、随机漫步等课程练习页面。

此外还有：

- `JSTools/Lggpt/`：Laogao GPT —— 带登录、每日额度、流式输出的 AI 聊天页，含 Express 本地服务、Cloudflare Worker 版本和 CloudBase 国内代理。
- `JSTools/loginExm/`：登录示例页。
- `JSGAME/blackjack/`：React + Vite + TypeScript 的二十一点对战前端，`dist/` 为线上静态发布产物。
- `desc/`：关于我页面。

站点本身不需要构建：`main` 分支根目录直接由 GitHub Pages 托管，浏览器打开静态文件即可。只有 `JSGAME/blackjack/` 需要 `npm.cmd run build` 生成 `dist/`。

## 目录结构

```
Main/
├─ index.html            # 站点首页（GAO LAB 导航）
├─ package.json          # 根脚本：Lggpt 本地服务、Worker 开发/部署、测试
├─ robots.txt
├─ JSGAME/
│  ├─ blackjack/         # React+Vite 二十一点对战（dist/ 为 Pages 发布目录）
│  ├─ 2dGameEngine/ cargame/ flappybird/ snake/ Plant-vs.-Zombie/ test/
│  ├─ box_bounces.html clicker.html
├─ JSTools/
│  ├─ Lggpt/             # AI 聊天页：index.html/script.js/admin.html、server.js、worker/、cloudbase-proxy/、migrations/
│  └─ loginExm/          # 登录示例
├─ learn/                # 静态学习文档站：articles/、articles.json、app.js、labs.js、markdown.js、theme.js、tests.mjs
├─ asd-projects/         # 课程练习页面（含一个 unzip.py）
├─ desc/                 # 关于我
└─ README.md
```

## 环境要求

- 静态页面（首页、小游戏、`learn/`、`asd-projects/`、`desc/`）：任意现代浏览器，无需依赖。
- 本地预览推荐 Python 3（`python -m http.server`），因为 `learn/` 用 HTTP fetch 加载文章，直接双击 HTML 会失败。
- 构建/后端：Node.js ≥ 18（`package.json` 的 `engines`），用 `npm.cmd install` 在仓库根目录安装依赖。
- Lggpt 的 Worker/CloudBase 部署需要 Cloudflare 账号与 `wrangler`（已在 devDependencies）、或腾讯云 CloudBase CLI；相关密钥只放环境变量或平台 secret。

## 启动方式（Windows PowerShell）

### 整站在本地预览

```powershell
cd E:\Projects\Shuaigaodada.github.io\Main
python -m http.server 4177 --bind 127.0.0.1
```

打开 <http://127.0.0.1:4177/> 看首页，学习文档在 <http://127.0.0.1:4177/learn/>。不要直接双击 `index.html` 或 `learn/index.html`。

### Blackjack 前端

```powershell
npm.cmd install --prefix JSGAME/blackjack
npm.cmd run dev --prefix JSGAME/blackjack -- --host 127.0.0.1 --port 5173
```

改动后必须重新构建 Pages 用的产物：

```powershell
npm.cmd run build --prefix JSGAME/blackjack
```

### Lggpt 本地服务

```powershell
cd E:\Projects\Shuaigaodada.github.io\Main
npm.cmd install
$env:OPENAI_API_KEY="your_openai_api_key"
$env:OPENAI_SAFETY_SALT="a-long-random-private-value"
$env:ADMIN_TOKEN="a-long-random-admin-token"
npm.cmd run lggpt
```

聊天页 <http://localhost:3000/JSTools/Lggpt/>，管理页 <http://localhost:3000/JSTools/Lggpt/admin.html>。可选 `$env:OPENAI_MODEL` 覆盖默认模型。

Cloudflare Worker 相关脚本（可选）：`npm.cmd run dev:lggpt:worker`、`npm.cmd run deploy:lggpt:dry`、`npm.cmd run deploy:lggpt`，部署前用 `npx.cmd wrangler secret put ...` 写入密钥，细节见 `JSTools/Lggpt/README.md`。

## 使用方法

- **看站点**：直接访问线上 <https://shuaigaodada.github.io>；本地预览时从首页卡片进入各游戏、学习和练习页面。
- **改前端**：静态页改完刷新即可看到；`JSGAME/blackjack/` 改完先跑 `npm.cmd run build --prefix JSGAME/blackjack`，再提交 `dist/`。
- **写学习文档**：在 `learn/articles/` 加 UTF-8 Markdown，同步更新 `learn/articles.json` 的 id、标题、摘要、分类、关键词与关联文章，规则见 `learn/README.md`。
- **验证**：

```powershell
node --test learn/tests.mjs
npm.cmd test --prefix JSGAME/blackjack
npm.cmd run test:lggpt
```

Blackjack 的双人联调需要先启动 `node JSTools/Lggpt/cloudbase-proxy/duel-test-server.mjs`，再运行 `node JSGAME/blackjack/tests/awakened-ui.mjs`，说明见 `JSGAME/blackjack/README.md`。

- **上线**：推送到 `main` 后由 GitHub Pages 从根目录发布；后端代码（Lggpt 的 Worker / CloudBase 代理、Blackjack 对战服务）需要另行部署到对应平台才会生效。

## 已知限制

- `learn/` 的文章靠 fetch 加载，必须经 HTTP 访问；文件协议（`file://`）下会显示加载失败。
- 首页的游戏和练习是纯静态页面，无构建、无测试；只有 `learn/`、`blackjack/`、`Lggpt/` 带自动化检查，其余需人工浏览。
- `JSGAME/blackjack` 的对战、资金、座位依赖 `JSTools/Lggpt/cloudbase-proxy/` 的后端与数据库迁移；只上传前端无法让新模式可用，发布顺序见该目录 README。
- Lggpt 本地 Express 服务把最近 5000 条消息存在内存里，重启即清空；线上 Worker 用 D1 持久化。
- 密钥、`.env`、依赖目录、构建缓存、本地数据库都不入库；`JSGAME/blackjack/dist/` 是例外，必须提交。
- 仓库根目录可能残留 `.codex-*`、`.backend-sync/`、`.tmp/` 等本地调试产物，它们不参与发布。

## Git 上传范围

- 上传：网页和源码、网站图片与 SVG、文档、测试、数据库迁移 SQL、依赖清单与锁文件、不含密钥的配置及 `.env.example`。
- `JSGAME/blackjack/dist/` 是 GitHub Pages 使用的静态发布目录，必须上传；其例外规则位于 `JSGAME/blackjack/.gitignore`。修改前端后先在该目录运行 `npm.cmd run build`。
- 不上传：依赖目录、构建缓存、日志、真实环境变量和私钥、本地数据库、编辑器设置、系统文件，以及根目录下的 `.codex-*` 调试文件和工作树、`.backend-sync/`、`.tmp/`。
- `.gitignore` 不会自动移除已经跟踪的文件；这类文件需用 `git rm --cached -- <路径>` 取消跟踪，本地文件仍保留。

GitHub Pages 当前从 `main` 分支的仓库根目录发布。推送开发分支只上传代码，合并到 `main` 后才会更新网站；仓库中的后端源码还需部署到对应服务才能运行。
