from typing import Literal

from pydantic import BaseModel, Field


class GameCommand(BaseModel):
    """客户端传入的游戏命令。具体规则会在服务端统一验证。"""

    type: Literal[
        "SIT_DOWN", "LEAVE_SEAT", "READY", "HIT", "HIT_PREVIEW", "HIT_COMMIT",
        "STAND", "DOUBLE", "PLACE_BET", "CALL", "ALL_IN", "FOLD", "NEXT_ROUND", "CALL_BOT",
    ]
    seat_index: int | None = Field(default=None, alias="seatIndex")
    amount: int | None = None

    model_config = {"populate_by_name": True}


class ServerEvent(BaseModel):
    """服务端发往 WebSocket 客户端的统一事件外壳。"""

    type: str
    payload: dict = Field(default_factory=dict)
