# Shuaigaodada.github.io
一些游戏和作业\([访问](https://shuaigaodada.github.io)\)

## Git 上传范围

- 上传：网页和源码、网站图片与 SVG、文档、测试、数据库迁移 SQL、依赖清单与锁文件、不含密钥的配置及 `.env.example`。
- `JSGAME/blackjack/dist/` 是 GitHub Pages 使用的静态发布目录，必须上传；其例外规则位于 `JSGAME/blackjack/.gitignore`。修改前端后先在该目录运行 `npm.cmd run build`。
- 不上传：依赖目录、构建缓存、日志、真实环境变量和私钥、本地数据库、编辑器设置、系统文件，以及根目录下的 `.codex-*` 调试文件和工作树、`.backend-sync/`、`.tmp/`。
- `.gitignore` 不会自动移除已经跟踪的文件；这类文件需用 `git rm --cached -- <路径>` 取消跟踪，本地文件仍保留。

GitHub Pages 当前从 `main` 分支的仓库根目录发布。推送开发分支只上传代码，合并到 `main` 后才会更新网站；仓库中的后端源码还需部署到对应服务才能运行。
