import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .contracts import GameCommand, ServerEvent
from .table_manager import TableManager

tables = TableManager()


@asynccontextmanager
async def lifespan(_: FastAPI):
    async def watch_turn_timeouts() -> None:
        while True:
            await asyncio.sleep(1)
            await tables.expire_turns()

    timeout_task = asyncio.create_task(watch_turn_timeouts())
    try:
        yield
    finally:
        timeout_task.cancel()
        try:
            await timeout_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="双人 21 点 API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    # 本地 / Radmin VPN 测试不使用 Cookie 身份验证，可接受任意来源的开发页面。
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tables/{table_id}/state")
async def table_state(table_id: str, client_id: str | None = None) -> dict:
    return tables.public_state(table_id, client_id)


@app.websocket("/ws/tables/{table_id}")
async def table_websocket(websocket: WebSocket, table_id: str) -> None:
    client_id = websocket.query_params.get("client_id")
    if not client_id:
        await websocket.close(code=1008, reason="缺少 client_id")
        return

    await tables.connect(table_id, client_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            try:
                command = GameCommand.model_validate(data)
            except ValidationError:
                await websocket.send_json(ServerEvent(type="ERROR", payload={"message": "无效的游戏命令"}).model_dump())
                continue
            await tables.handle_command(table_id, client_id, command)
    except WebSocketDisconnect:
        tables.disconnect(table_id, client_id)
