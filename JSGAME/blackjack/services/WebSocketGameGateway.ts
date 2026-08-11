import type { GameCommand, GameGateway, GameState, Player, PlayingCard } from "../game/contracts/types";
import {
  clearRegionalAuthToken, getRegionalAuthToken, getUnifiedAuthToken, setRegionalAuthToken,
} from "./authSession";
import { getGameServer, selectGameServer } from "./serverConfig";

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
  remainingCards?: PlayingCard[];
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
  private connectDeadline: number | null = null;
  private pollTimer: number | null = null;
  private polling = false;
  private pollInFlight = false;
  private ticket = "";
  private disposeTimer: number | null = null;
  private reconnectAttempts = 0;
  private started = false;
  private disposed = false;
  private readonly tableId: string;
  private readonly clientId: string;
  private apiBaseUrl: string;
  private socketBaseUrl: string;
  private webSocketFailures = 0;

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
    if (!this.polling) {
      this.apiBaseUrl = await selectGameServer(this.tableId);
      this.socketBaseUrl = this.apiBaseUrl.replace(/^http/, "ws");
    }
    let authToken = getRegionalAuthToken(this.apiBaseUrl);
    let ticket = "";
    const requestTicket = async (token: string) => fetch(`${this.apiBaseUrl}/api/auth/ws-ticket`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (authToken) {
      try {
        let response = await requestTicket(authToken);
        if (!response.ok) {
          clearRegionalAuthToken(this.apiBaseUrl);
          authToken = null;
        } else ticket = String((await response.json() as { ticket: string }).ticket);
      } catch {
        this.scheduleReconnect();
        return;
      }
    }
    if (!authToken) {
      const sharedToken = getUnifiedAuthToken();
      if (sharedToken) {
        try {
          const exchange = await fetch(`${this.apiBaseUrl}/api/auth/sso`, {
            method: "POST", headers: { Authorization: `Bearer ${sharedToken}`, Accept: "application/json" },
          });
          if (!exchange.ok) throw new Error("regional session exchange failed");
          authToken = String((await exchange.json() as { token: string }).token);
          setRegionalAuthToken(this.apiBaseUrl, authToken);
          const response = await requestTicket(authToken);
          if (!response.ok) throw new Error("regional ticket request failed");
          ticket = String((await response.json() as { ticket: string }).ticket);
        } catch {
          this.update({ ...this.state, message: "登录状态同步失败，请返回大厅重新登录。" });
          this.scheduleReconnect();
          return;
        }
      }
    }
    if (this.disposed) return;
    const socket = new WebSocket(`${this.socketBaseUrl}/ws/tables/${this.tableId}?client_id=${encodeURIComponent(this.clientId)}${ticket ? `&ticket=${encodeURIComponent(ticket)}` : ""}`);
    this.socket = socket;
    this.connectDeadline = window.setTimeout(() => {
      if (this.socket !== socket || socket.readyState === WebSocket.OPEN) return;
      this.handleSocketFailure(socket, ticket);
      try { socket.close(); } catch { /* Some older browsers reject close() while CONNECTING. */ }
    }, 7_000);
    socket.addEventListener("message", (event) => { if (this.socket === socket) this.receive(event.data); });
    socket.addEventListener("open", () => {
      if (this.socket !== socket) { socket.close(1000, "superseded route"); return; }
      if (this.connectDeadline !== null) window.clearTimeout(this.connectDeadline);
      this.connectDeadline = null;
      this.reconnectAttempts = 0;
      this.webSocketFailures = 0;
      this.update({ ...this.state, message: "已连接服务器，正在同步牌桌…" });
    });
    socket.addEventListener("close", () => {
      this.handleSocketFailure(socket, ticket);
    });
    socket.addEventListener("error", () => {
      this.update({ ...this.state, message: "实时线路不可用，正在切换备用线路…" });
      this.handleSocketFailure(socket, ticket);
      try { socket.close(); } catch { /* Older browsers can reject close() while CONNECTING. */ }
    });
  }

  private handleSocketFailure(socket: WebSocket, ticket: string) {
    if (this.disposed || this.socket !== socket) return;
    if (this.connectDeadline !== null) window.clearTimeout(this.connectDeadline);
    this.connectDeadline = null;
    this.socket = null;
    this.webSocketFailures += 1;
    if (this.webSocketFailures >= 1) {
      // The table authority is fixed for the whole match. Falling back to the
      // other region would create a second table with the same visible number.
      void this.startPollingFallback(ticket);
      return;
    }
    this.update({ ...this.state, message: "与服务器断开，正在重连…" });
    this.scheduleReconnect();
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

  private async startPollingFallback(ticket: string) {
    if (this.disposed || this.polling) return;
    this.polling = true;
    this.ticket = ticket;
    await this.pollState();
    if (!this.disposed) this.pollTimer = window.setInterval(() => void this.pollState(), 1_200);
  }

  sendAction = (action: GameCommand["type"], amount?: number) => {
    if (this.polling) {
      const commandId = createClientId();
      const query = new URLSearchParams({ client_id: this.clientId });
      if (this.ticket) query.set("ticket", this.ticket);
      const body = amount === undefined ? { type: action, commandId } : { type: action, amount, commandId };
      void fetch(`${this.apiBaseUrl}/api/tables/${this.tableId}/command?${query}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then(async (response) => {
        if (!response.ok) throw new Error("command failed");
        if (action === "SIT_DOWN") this.ticket = "";
        this.update(this.toGameState(await response.json() as RemoteTableState));
      }).catch(() => this.update({ ...this.state, message: "无法连接游戏服务器，请稍后重试。" }));
      return;
    }
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.update({ ...this.state, message: "服务器尚未连接，请稍后重试。" });
      return;
    }
    const commandId = createClientId();
    this.socket.send(JSON.stringify(amount === undefined ? { type: action, commandId } : { type: action, amount, commandId }));
  };

  private async pollState() {
    if (this.disposed || this.pollInFlight) return;
    this.pollInFlight = true;
    try {
      const query = new URLSearchParams({ client_id: this.clientId });
      const response = await fetch(`${this.apiBaseUrl}/api/tables/${this.tableId}/state?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("state failed");
      this.update(this.toGameState(await response.json() as RemoteTableState));
    } catch {
      this.update({ ...this.state, message: "国内联机线路正在重连…" });
    } finally {
      this.pollInFlight = false;
    }
  }

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
      deck: remote.remainingCards ?? Array.from({ length: remote.deckCount }, (_, index) => ({ id: `deck-${index}`, rank: "A" as const, suit: "spades" as const })),
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
      if (this.connectDeadline !== null) window.clearTimeout(this.connectDeadline);
      if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
      this.reconnectTimer = null;
      this.connectDeadline = null;
      this.pollTimer = null;
      this.socket?.close(1000, "leaving table");
      this.socket = null;
      this.listeners.clear();
    }, 0);
  }
}
