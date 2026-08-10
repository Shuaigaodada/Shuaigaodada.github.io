import type { GameCommand, GameGateway, GameState, Player, PlayingCard } from "../game/contracts/types";
import { getAuthToken } from "./authSession";
import { getGameServer } from "./serverConfig";

interface RemotePlayer {
  id: string;
  name: string;
  avatarData?: string | null;
  isBot?: boolean;
  seatIndex: 0 | 1;
  hand: PlayingCard[];
  hiddenCardCount: number;
  hasStood: boolean;
  isBusted: boolean;
  bankroll: number;
  bet: number;
  requestedBet: number;
}

interface RemoteTableState {
  players: RemotePlayer[];
  activePlayerId: string | null;
  bettingPlayerId: string | null;
  currentBet: number;
  revealedPlayerId: string | null;
  viewerPlayerId: string | null;
  nextRoundConfirmations: number;
  nextRoundConfirmed: boolean;
  turnSecondsRemaining: number;
  status: GameState["status"];
  message: string;
  round: number;
  deckCount: number;
  winnerId: string | null;
}

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // HTTP 的局域网 / Radmin VPN 地址不一定属于浏览器的安全上下文，
  // 因此不能假定 randomUUID 可用。这里的随机标识仅用于本地牌桌区分连接。
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createConnectingState(): GameState {
  const player = (id: string, name: string, seatIndex: 0 | 1): Player => ({
    id, name, seatIndex, hand: [], hasStood: false, isBusted: false,
    bankroll: 0, bet: 0, requestedBet: 0,
  });
  return {
    players: [player("player-a", "玩家 A", 0), player("player-b", "玩家 B", 1)],
    activePlayerId: null, bettingPlayerId: null, currentBet: 0, revealedPlayerId: null,
    viewerPlayerId: null, nextRoundConfirmations: 0, nextRoundConfirmed: false,
    turnSecondsRemaining: 0, status: "waiting", message: "正在连接游戏服务器…",
    round: 1, deck: [], winnerId: null,
  };
}

export class WebSocketGameGateway implements GameGateway {
  readonly mode = "remote" as const;
  private state: GameState = createConnectingState();
  private listeners = new Set<(state: GameState) => void>();
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private disposeTimer: number | null = null;
  private reconnectAttempts = 0;
  private started = false;
  private disposed = false;
  private readonly tableId: string;
  private readonly clientId: string;
  private readonly apiBaseUrl: string;
  private readonly socketBaseUrl: string;

  constructor(tableId = "demo-table") {
    this.tableId = tableId;
    this.clientId = sessionStorage.getItem("blackjack-client-id") ?? createClientId();
    sessionStorage.setItem("blackjack-client-id", this.clientId);
    this.apiBaseUrl = getGameServer();
    this.socketBaseUrl = this.apiBaseUrl.replace(/^http/, "ws");
    this.state = { ...this.state, message: "正在连接游戏服务器…" };
    // 正常状态完全由 WebSocket 推送；仅在断线重连时低频轮询兜底，避免
    // 每秒请求一次而快速消耗 Workers 免费额度。
  }

  private async connect() {
    if (this.disposed) return;
    const authToken = getAuthToken();
    let ticket = "";
    if (authToken) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/auth/ws-ticket`, { method: "POST", headers: { Authorization: `Bearer ${authToken}` } });
        if (response.ok) ticket = String((await response.json() as { ticket: string }).ticket);
      } catch {
        this.scheduleReconnect();
        return;
      }
    }
    if (this.disposed) return;
    const socket = new WebSocket(`${this.socketBaseUrl}/ws/tables/${this.tableId}?client_id=${encodeURIComponent(this.clientId)}${ticket ? `&ticket=${encodeURIComponent(ticket)}` : ""}`);
    this.socket = socket;
    socket.addEventListener("message", (event) => this.receive(event.data));
    socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.update({ ...this.state, message: "已连接服务器，正在同步牌桌…" });
    });
    socket.addEventListener("close", () => {
      if (this.disposed || this.socket !== socket) return;
      this.update({ ...this.state, message: "与服务器断开，正在重连…" });
      this.scheduleReconnect();
    });
    socket.addEventListener("error", () => this.update({ ...this.state, message: "无法连接游戏服务器，请稍后重试。" }));
  }

  private scheduleReconnect() {
    if (this.disposed || this.reconnectTimer !== null) return;
    const baseDelay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempts++);
    const delay = baseDelay + Math.floor(Math.random() * Math.min(1_000, baseDelay / 4));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  getState = () => this.state;

  subscribe = (listener: (state: GameState) => void) => {
    if (this.disposeTimer !== null) {
      window.clearTimeout(this.disposeTimer);
      this.disposeTimer = null;
    }
    if (!this.started) {
      this.started = true;
      void this.connect();
    }
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  };

  sendAction = (action: GameCommand["type"], amount?: number) => {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.update({ ...this.state, message: "服务器尚未连接，请稍后重试。" });
      return;
    }
    const commandId = createClientId();
    this.socket.send(JSON.stringify(amount === undefined ? { type: action, commandId } : { type: action, amount, commandId }));
  };

  private receive(raw: string) {
    try {
      const event = JSON.parse(raw) as { type: string; payload: RemoteTableState | { message: string } };
      if (event.type === "TABLE_STATE") this.update(this.toGameState(event.payload as RemoteTableState));
      if (event.type === "ERROR") this.update({ ...this.state, message: (event.payload as { message: string }).message });
    } catch {
      this.update({ ...this.state, message: "服务器返回了无法识别的数据。" });
    }
  }

  private toGameState(remote: RemoteTableState): GameState {
    const players = remote.players.map((player) => ({
      ...player,
      hand: [
        ...player.hand,
        ...Array.from({ length: player.hiddenCardCount }, (_, index) => ({ id: `hidden-${player.id}-${index}`, rank: "A" as const, suit: "spades" as const })),
      ],
    })) as unknown as [Player, Player];
    return {
      players,
      activePlayerId: remote.activePlayerId,
      bettingPlayerId: remote.bettingPlayerId,
      currentBet: remote.currentBet,
      revealedPlayerId: remote.revealedPlayerId,
      viewerPlayerId: remote.viewerPlayerId,
      nextRoundConfirmations: remote.nextRoundConfirmations,
      nextRoundConfirmed: remote.nextRoundConfirmed,
      turnSecondsRemaining: remote.turnSecondsRemaining,
      status: remote.status,
      message: remote.message,
      round: remote.round,
      deck: Array.from({ length: remote.deckCount }, (_, index) => ({ id: `deck-${index}`, rank: "A" as const, suit: "spades" as const })),
      winnerId: remote.winnerId,
    };
  }

  private update(state: GameState) {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  dispose() {
    if (this.disposeTimer !== null) return;
    // React StrictMode immediately subscribes again after its development-only
    // cleanup pass. Deferring disposal lets that subscription cancel teardown.
    this.disposeTimer = window.setTimeout(() => {
      this.disposeTimer = null;
      if (this.listeners.size > 0) return;
      this.disposed = true;
      if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.socket?.close(1000, "leaving table");
      this.socket = null;
      this.listeners.clear();
    }, 0);
  }
}
