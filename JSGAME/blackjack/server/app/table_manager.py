from __future__ import annotations

import random
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import WebSocket

from .contracts import GameCommand, ServerEvent

SUITS = ("hearts", "diamonds", "clubs", "spades")
RANKS = ("A", "2", "3", "4", "5", "6", "7", "8", "9", "10")
CHIP_START = 500
TURN_LIMIT_SECONDS = 60
DEFAULT_PLAYER_NAMES = ("玩家 A", "玩家 B")
BOT_CLIENT_PREFIX = "bot:"


def fresh_deck() -> list[dict[str, str]]:
    deck = [{"id": f"{rank}-{suit}", "rank": rank, "suit": suit} for suit in SUITS for rank in RANKS]
    random.SystemRandom().shuffle(deck)
    return deck


def hand_value(cards: list[dict[str, str]]) -> int:
    value = sum(11 if card["rank"] == "A" else int(card["rank"]) for card in cards)
    aces = sum(card["rank"] == "A" for card in cards)
    while value > 21 and aces:
        value -= 10
        aces -= 1
    return value


@dataclass
class PlayerState:
    id: str
    name: str
    seat_index: int
    client_id: str | None = None
    avatar_data: str | None = None
    is_bot: bool = False
    bankroll: int = CHIP_START
    bet: int = 0
    requested_bet: int = 0
    hand: list[dict[str, str]] = field(default_factory=list)
    has_stood: bool = False
    is_busted: bool = False


@dataclass
class GameTable:
    table_id: str
    players: list[PlayerState] = field(default_factory=lambda: [
        PlayerState("player-a", DEFAULT_PLAYER_NAMES[0], 0),
        PlayerState("player-b", DEFAULT_PLAYER_NAMES[1], 1),
    ])
    deck: list[dict[str, str]] = field(default_factory=fresh_deck)
    status: str = "waiting"
    active_player_id: str | None = None
    message: str = "等待两名玩家进入房间。"
    round: int = 1
    winner_id: str | None = None
    pending_hit_player_id: str | None = None
    betting_player_id: str | None = None
    current_bet: int = 0
    revealed_player_id: str | None = None
    next_round_ready_player_ids: set[str] = field(default_factory=set)
    turn_deadline: float | None = None

    def join(self, client_id: str) -> PlayerState | None:
        current = self.player_for_client(client_id)
        if current:
            return current
        seat = next((player for player in self.players if player.client_id is None), None)
        if seat is None:
            return None
        seat.client_id = client_id
        seat.is_bot = False
        if all(player.client_id for player in self.players):
            self.status = "betting"
            opener = random.choice(self.players)
            self.betting_player_id = opener.id
            self.current_bet = 0
            self.message = f"随机选择 {opener.name} 先下底注。"
        else:
            self.status = "waiting"
            self.message = "等待一名玩家进入房间。"
        return seat

    def handle(self, client_id: str, command: GameCommand) -> None:
        player = self.player_for_client(client_id)
        if command.type == "LEAVE_SEAT" and player:
            self.leave(player)
            return
        if command.type == "CALL_BOT" and player:
            self.call_bot(player)
            return
        if player is None:
            self.message = "牌桌座位已满，你正在观战。"
            return
        if command.type == "PLACE_BET":
            self.place_bet(player, command.amount or 0)
        elif command.type == "CALL":
            self.call(player)
        elif command.type == "ALL_IN":
            self.all_in(player)
        elif command.type == "FOLD":
            self.fold(player)
        elif command.type == "NEXT_ROUND":
            self.next_round(player)
        elif command.type == "HIT_PREVIEW":
            self.preview_hit(player)
        elif command.type == "HIT_COMMIT":
            self.commit_hit(player)
        elif command.type == "HIT":
            self.hit(player)
        elif command.type == "STAND":
            self.stand(player)
        elif command.type == "DOUBLE":
            self.message = "Double 规则尚未确定。"

    def leave(self, player: PlayerState) -> None:
        self.reset_seat(player)
        # 人机仅为发起呼叫的真人服务；真人离桌时一并释放该座位。
        if not any(seat.client_id and not seat.is_bot for seat in self.players):
            for seat in self.players:
                if seat.is_bot:
                    self.reset_seat(seat)
        self.status = "waiting"
        self.active_player_id = None
        self.turn_deadline = None
        self.betting_player_id = None
        self.current_bet = 0
        self.revealed_player_id = None
        self.next_round_ready_player_ids.clear()
        self.message = self.waiting_message()

    def reset_seat(self, player: PlayerState) -> None:
        """释放座位，并恢复大厅中显示的默认玩家资料。"""
        player.client_id = None
        player.name = DEFAULT_PLAYER_NAMES[player.seat_index]
        player.avatar_data = None
        player.is_bot = False
        player.bankroll = CHIP_START
        player.requested_bet = 0
        player.bet = 0
        player.hand = []
        player.has_stood = False
        player.is_busted = False

    def waiting_message(self) -> str:
        seated_count = sum(player.client_id is not None for player in self.players)
        if seated_count == 0:
            return "等待两名玩家进入房间。"
        return "等待一名玩家进入房间。"

    def call_bot(self, player: PlayerState) -> None:
        if self.status != "waiting" or player.is_bot:
            return
        seat = next((item for item in self.players if item.client_id is None), None)
        if seat is None:
            return
        seat.client_id = f"{BOT_CLIENT_PREFIX}{seat.id}"
        seat.name = "人机"
        seat.avatar_data = None
        seat.is_bot = True
        self.status = "betting"
        opener = random.choice(self.players)
        self.betting_player_id = opener.id
        self.current_bet = 0
        self.message = f"{opener.name} 先下底注。"

    def advance_bots(self) -> None:
        """推进所有无需玩家输入的人机回合，直到轮到真人或牌局结束。"""
        for _ in range(12):
            bot = next((player for player in self.players if player.is_bot and player.id == self.betting_player_id), None)
            if bot and self.status == "betting":
                if self.current_bet == 0:
                    self.place_bet(bot, min(100, bot.bankroll))
                elif self.current_bet <= bot.bankroll:
                    self.call(bot)
                else:
                    self.fold(bot)
                continue
            bot = next((player for player in self.players if player.is_bot and player.id == self.active_player_id), None)
            if bot and self.status == "playing":
                if hand_value(bot.hand) < 17 and self.deck:
                    self.hit(bot)
                else:
                    self.stand(bot)
                continue
            if self.status in {"finished", "deck-empty"} and any(player.is_bot for player in self.players):
                bot = next(player for player in self.players if player.is_bot)
                if bot.id not in self.next_round_ready_player_ids:
                    self.next_round(bot)
                    continue
            break

    def place_bet(self, player: PlayerState, amount: int) -> None:
        if self.status != "betting":
            return
        if self.betting_player_id != player.id:
            self.message = "现在轮到对方选择跟注、加注或退出。"
            return
        if amount <= 0 or amount > player.bankroll:
            self.message = "请输入不超过当前赌资的有效下注金额。"
            return
        if self.current_bet and amount <= self.current_bet:
            self.message = f"加注金额必须高于当前的 {self.current_bet} $。"
            return
        player.requested_bet = amount
        self.current_bet = amount
        other = self.other(player)
        self.betting_player_id = other.id
        self.message = f"{player.name} {'下了底注' if not other.requested_bet else '加注到'} {amount} $，轮到 {other.name} 跟注、加注或退出。"

    def call(self, player: PlayerState) -> None:
        if self.status != "betting" or self.betting_player_id != player.id or not self.current_bet:
            return
        if self.current_bet > player.bankroll:
            self.message = "你的赌资不足以跟注，只能加注到可用金额以内或退出。"
            return
        player.requested_bet = self.current_bet
        self.start_round(self.other(player), player)

    def all_in(self, player: PlayerState) -> None:
        if self.status != "betting" or self.betting_player_id != player.id or not self.current_bet:
            return
        if player.bankroll >= self.current_bet:
            self.message = "你的赌资足够跟注，请选择跟注或加注。"
            return
        player.requested_bet = player.bankroll
        self.current_bet = player.bankroll
        self.start_round(self.other(player), player)

    def fold(self, player: PlayerState) -> None:
        if self.status != "betting" or self.betting_player_id != player.id:
            return
        winner = self.other(player)
        self.status = "finished"
        self.active_player_id = None
        self.betting_player_id = None
        self.current_bet = 0
        self.winner_id = winner.id
        self.message = f"{player.name} 选择退出，{winner.name} 不战获胜。"

    def start_round(self, first_player: PlayerState, revealed_player: PlayerState) -> None:
        if len(self.deck) < 2:
            self.deck = fresh_deck()
        for seated_player in self.players:
            seated_player.bankroll -= self.current_bet
            seated_player.bet = self.current_bet
            seated_player.requested_bet = 0
            seated_player.hand = [self.deck.pop()]
            seated_player.has_stood = False
            seated_player.is_busted = False
        self.status = "playing"
        self.active_player_id = first_player.id
        self.turn_deadline = time.monotonic() + TURN_LIMIT_SECONDS
        self.betting_player_id = None
        self.current_bet = 0
        self.revealed_player_id = revealed_player.id
        self.winner_id = None
        self.message = f"{revealed_player.name} 跟注成功，{first_player.name} 先行动。"

    def next_round(self, player: PlayerState) -> None:
        if self.status not in {"finished", "deck-empty"}:
            return
        self.next_round_ready_player_ids.add(player.id)
        if len(self.next_round_ready_player_ids) < len(self.players):
            self.message = f"等待另一位玩家确认下一局（{len(self.next_round_ready_player_ids)}/2）。"
            return
        if len(self.deck) < 2:
            self.deck = fresh_deck()
        for seated_player in self.players:
            seated_player.hand = []
            seated_player.bet = 0
            seated_player.requested_bet = 0
            seated_player.has_stood = False
            seated_player.is_busted = False
        self.status = "betting"
        self.active_player_id = None
        self.winner_id = None
        self.pending_hit_player_id = None
        self.betting_player_id = random.choice(self.players).id
        self.current_bet = 0
        self.revealed_player_id = None
        self.next_round_ready_player_ids.clear()
        self.round += 1
        self.message = f"随机选择 {self.by_id(self.betting_player_id).name} 先下底注。"

    def can_act(self, player: PlayerState) -> bool:
        return self.status == "playing" and self.active_player_id == player.id

    def hit(self, player: PlayerState) -> None:
        if not self.can_act(player):
            return
        if not self.deck:
            self.status = "deck-empty"
            self.active_player_id = None
            self.message = "牌堆已用尽，请重新洗牌。"
            return
        player.hand.append(self.deck.pop())
        self.resolve_hit(player)

    def preview_hit(self, player: PlayerState) -> None:
        if not self.can_act(player) or self.pending_hit_player_id is not None:
            return
        if not self.deck:
            self.status = "deck-empty"
            self.active_player_id = None
            self.message = "牌堆已用尽，请重新洗牌。"
            return
        player.hand.append(self.deck.pop())
        self.pending_hit_player_id = player.id
        self.message = f"{player.name} 正在摸牌……"

    def commit_hit(self, player: PlayerState) -> None:
        if not self.can_act(player) or self.pending_hit_player_id != player.id:
            return
        self.pending_hit_player_id = None
        self.resolve_hit(player)

    def resolve_hit(self, player: PlayerState) -> None:
        if hand_value(player.hand) > 21:
            player.is_busted = True
            player.has_stood = True
            self.finish(self.other(player).id, f"{player.name} 爆牌，另一方获胜。")
            return
        if len(player.hand) >= 5:
            player.has_stood = True
            self.message = f"{player.name} 已有五张牌，自动停牌。"
        self.next_turn(player)

    def stand(self, player: PlayerState) -> None:
        if not self.can_act(player):
            return
        player.has_stood = True
        self.message = f"{player.name} 选择停牌。"
        self.next_turn(player)

    def next_turn(self, previous: PlayerState) -> None:
        other = self.other(previous)
        if not other.has_stood:
            self.active_player_id = other.id
            self.turn_deadline = time.monotonic() + TURN_LIMIT_SECONDS
            self.message = f"轮到 {other.name}。"
        elif not previous.has_stood:
            self.active_player_id = previous.id
            self.turn_deadline = time.monotonic() + TURN_LIMIT_SECONDS
            self.message = f"轮到 {previous.name}。"
        else:
            self.resolve_round()

    def resolve_round(self) -> None:
        a, b = self.players
        a_value, b_value = hand_value(a.hand), hand_value(b.hand)
        winner_id = None if a_value == b_value else a.id if a_value > b_value else b.id
        message = f"{self.by_id(winner_id).name} 获胜。" if winner_id else "本局同点，平局。"
        self.finish(winner_id, message)

    def finish(self, winner_id: str | None, message: str) -> None:
        pot = sum(player.bet for player in self.players)
        if winner_id:
            self.by_id(winner_id).bankroll += pot
        else:
            for player in self.players:
                player.bankroll += player.bet
        self.status = "finished"
        self.active_player_id = None
        self.turn_deadline = None
        self.winner_id = winner_id
        self.message = message

    def expire_turn_if_needed(self) -> bool:
        if self.status != "playing" or self.turn_deadline is None or time.monotonic() < self.turn_deadline:
            return False
        player = self.active_player
        if player is None:
            return False
        player.has_stood = True
        self.message = f"{player.name} 行动超时，自动停牌。"
        self.next_turn(player)
        return True

    def player_for_client(self, client_id: str) -> PlayerState | None:
        return next((player for player in self.players if player.client_id == client_id), None)

    @property
    def active_player(self) -> PlayerState | None:
        return next((player for player in self.players if player.id == self.active_player_id), None)

    def other(self, player: PlayerState) -> PlayerState:
        return next(item for item in self.players if item.id != player.id)

    def by_id(self, player_id: str | None) -> PlayerState:
        return next(player for player in self.players if player.id == player_id)

    def project_for(self, client_id: str | None) -> dict:
        self.expire_turn_if_needed()
        viewer = self.player_for_client(client_id) if client_id else None
        ordered_players = [viewer, self.other(viewer)] if viewer else self.players
        players: list[dict] = []
        for player in ordered_players:
            can_see_hand = viewer is not None and player.id == viewer.id
            round_is_over = self.status == "finished" and viewer is not None
            cards = player.hand if can_see_hand or round_is_over else (
                player.hand[:1] if player.id == self.revealed_player_id else []
            )
            hidden_count = 0 if can_see_hand or round_is_over else max(0, len(player.hand) - len(cards))
            players.append({
                "id": player.id,
                "name": player.name,
                "avatarData": player.avatar_data,
                "seatIndex": player.seat_index,
                "hand": cards,
                "hiddenCardCount": hidden_count,
                "hasStood": player.has_stood,
                "isBusted": player.is_busted,
                "bankroll": player.bankroll,
                "bet": player.bet,
                "requestedBet": player.requested_bet,
            })
        return {
            "players": players,
            "viewerPlayerId": viewer.id if viewer else None,
            "activePlayerId": self.active_player_id,
            "bettingPlayerId": self.betting_player_id,
            "currentBet": self.current_bet,
            "revealedPlayerId": self.revealed_player_id,
            "nextRoundConfirmations": len(self.next_round_ready_player_ids),
            "nextRoundConfirmed": bool(viewer and viewer.id in self.next_round_ready_player_ids),
            "turnSecondsRemaining": max(0, int((self.turn_deadline or time.monotonic()) - time.monotonic() + .999)),
            "status": self.status,
            "message": self.message,
            "round": self.round,
            "deckCount": len(self.deck),
            "winnerId": self.winner_id,
        }


class TableManager:
    def __init__(self) -> None:
        self._clients: dict[str, dict[str, WebSocket]] = defaultdict(dict)
        self._tables: dict[str, GameTable] = {}

    async def connect(self, table_id: str, client_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        table = self._tables.setdefault(table_id, GameTable(table_id))
        self._clients[table_id][client_id] = websocket
        await self._send(websocket, ServerEvent(type="JOINED", payload={"tableId": table_id, "clientId": client_id, "playerId": None}))
        await self._broadcast_state(table_id)

    def public_state(self, table_id: str, client_id: str | None = None) -> dict:
        return self._tables.setdefault(table_id, GameTable(table_id)).project_for(client_id)

    async def expire_turns(self) -> None:
        for table_id, table in self._tables.items():
            if table.expire_turn_if_needed():
                await self._broadcast_state(table_id)

    def disconnect(self, table_id: str, client_id: str) -> None:
        self._clients[table_id].pop(client_id, None)
        if not self._clients[table_id]:
            self._clients.pop(table_id, None)

    async def handle_command(self, table_id: str, client_id: str, command: GameCommand) -> None:
        table = self._tables[table_id]
        if command.type == "SIT_DOWN":
            table.join(client_id)
        else:
            table.handle(client_id, command)
        table.advance_bots()
        await self._broadcast_state(table_id)

    async def _broadcast_state(self, table_id: str) -> None:
        table = self._tables[table_id]
        for client_id, websocket in list(self._clients[table_id].items()):
            await self._send(websocket, ServerEvent(type="TABLE_STATE", payload=table.project_for(client_id)))

    @staticmethod
    async def _send(websocket: WebSocket, event: ServerEvent) -> None:
        await websocket.send_json(event.model_dump())
