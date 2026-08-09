import type { GameCommand, GameGateway, GameState, Player, PlayingCard } from "../game/contracts/types";
import { LocalGameGateway } from "./LocalGameGateway";

const DEFAULT_SERVER = "https://blackjack-duel.laogao0113.workers.dev";

interface RemotePlayer {
  id: string;
  name: string;
  avatarData?: string | null;
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

export class WebSocketGameGateway implements GameGateway {
  readonly mode = "remote" as const;
  private state: GameState = new LocalGameGateway().getState();
  private listeners = new Set<(state: GameState) => void>();
  private socket!: WebSocket;
  private reconnectTimer: number | null = null;
  private stateSyncTimer: number | null = null;
  private readonly tableId: string;
  private readonly clientId: string;
  private readonly apiBaseUrl: string;
  private readonly socketBaseUrl: string;

  constructor(tableId = "demo-table") {
    this.tableId = tableId;
    this.clientId = sessionStorage.getItem("blackjack-client-id") ?? createClientId();
    sessionStorage.setItem("blackjack-client-id", this.clientId);
    // 可通过 ?server=https://... 覆盖为本地或测试服务；默认使用已部署的 Worker。
    const requestedServer = new URLSearchParams(window.location.search).get("server")?.replace(/\/$/, "");
    this.apiBaseUrl = requestedServer && /^https?:\/\//.test(requestedServer)
      ? requestedServer
      : DEFAULT_SERVER;
    this.socketBaseUrl = this.apiBaseUrl.replace(/^http/, "ws");
    this.state = { ...this.state, message: "正在连接游戏服务器…" };
    this.connect();
    // 正常状态完全由 WebSocket 推送；仅在断线重连时低频轮询兜底，避免
    // 每秒请求一次而快速消耗 Workers 免费额度。
  }

  private connect() {
    const authToken = localStorage.getItem("blackjack-auth-token");
    this.socket = new WebSocket(`${this.socketBaseUrl}/ws/tables/${this.tableId}?client_id=${this.clientId}${authToken ? `&auth_token=${encodeURIComponent(authToken)}` : ""}`);
    this.socket.addEventListener("message", (event) => this.receive(event.data));
    this.socket.addEventListener("open", () => {
      this.stopFallbackSync();
      this.update({ ...this.state, message: "已连接服务器，正在同步牌桌…" });
      void this.fetchState();
    });
    this.socket.addEventListener("close", () => {
      this.startFallbackSync();
      this.update({ ...this.state, message: "与服务器断开，正在重连…" });
      if (this.reconnectTimer === null) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 1000);
      }
    });
    this.socket.addEventListener("error", () => this.update({ ...this.state, message: "无法连接游戏服务器，请稍后重试。" }));
  }

  getState = () => this.state;

  subscribe = (listener: (state: GameState) => void) => {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  };

  sendAction = (action: GameCommand["type"], amount?: number) => {
    if (this.socket.readyState !== WebSocket.OPEN) {
      this.update({ ...this.state, message: "服务器尚未连接，请稍后重试。" });
      return;
    }
    this.socket.send(JSON.stringify(amount === undefined ? { type: action } : { type: action, amount }));
    window.setTimeout(() => void this.fetchState(), 180);
  };

  private receive(raw: string) {
    const event = JSON.parse(raw) as { type: string; payload: RemoteTableState | { message: string } };
    if (event.type === "TABLE_STATE") this.update(this.toGameState(event.payload as RemoteTableState));
    if (event.type === "ERROR") this.update({ ...this.state, message: (event.payload as { message: string }).message });
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

  private async fetchState() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/tables/${this.tableId}/state?client_id=${encodeURIComponent(this.clientId)}`);
      if (response.ok) this.update(this.toGameState(await response.json() as RemoteTableState));
    } catch {
      // WebSocket 的自动重连仍会继续；此处不额外覆盖已有连接提示。
    }
  }

  private startFallbackSync() {
    if (this.stateSyncTimer !== null) return;
    this.stateSyncTimer = window.setInterval(() => void this.fetchState(), 5_000);
  }

  private stopFallbackSync() {
    if (this.stateSyncTimer === null) return;
    window.clearInterval(this.stateSyncTimer);
    this.stateSyncTimer = null;
  }

  private update(state: GameState) {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }
}
