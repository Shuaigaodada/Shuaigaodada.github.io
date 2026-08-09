# 双人 21 点后端

这是为未来联机版本准备的 Python 后端骨架，技术栈为 FastAPI + WebSocket。

当前已提供：

- `GET /health`：后端健康检查。
- `WS /ws/tables/{table_id}?client_id=...`：进入指定牌桌的 WebSocket 入口。
- `JOINED`、`TABLE_STATE`、`ERROR` 事件格式。
- 与前端一致的 `SIT_DOWN`、`LEAVE_SEAT`、`READY`、`HIT`、`STAND`、`DOUBLE` 命令校验。
- 观战者、玩家的状态投影入口；未来隐藏手牌必须由服务器在此处过滤，不能把真实牌发送到客户端后再遮挡。

## 本地运行

在项目根目录执行：

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

然后访问 `http://127.0.0.1:8000/health`。看到 `{"status":"ok"}` 即代表服务已启动。

当前前端仍使用本地模拟，不会自动连接该服务。下一步会新增 `WebSocketGameGateway`，再将它与此 WebSocket 协议接通。
