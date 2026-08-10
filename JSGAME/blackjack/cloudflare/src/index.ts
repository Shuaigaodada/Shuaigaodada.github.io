import { DurableObject } from "cloudflare:workers";
import { calculateRaise, calculateShortAllIn } from "../../game/economy/betting";

type AppEnv = Cloudflare.Env;

type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
type Status = "waiting" | "betting" | "playing" | "finished" | "deck-empty";
type CommandType = "SIT_DOWN" | "PLACE_BET" | "CALL" | "ALL_IN" | "FOLD" | "NEXT_ROUND" | "HIT" | "HIT_PREVIEW" | "HIT_COMMIT" | "STAND" | "LEAVE_SEAT" | "CALL_BOT";

interface Card { id: string; rank: Rank; suit: Suit; }
interface Player { id: string; name: string; avatarData?: string | null; userId?: string | null; seatIndex: 0 | 1; clientId: string | null; isBot?: boolean; bankroll: number; bet: number; requestedBet: number; hand: Card[]; hasStood: boolean; isBusted: boolean; }
interface TableState {
  players: [Player, Player]; deck: Card[]; status: Status; activePlayerId: string | null;
  bettingPlayerId: string | null; currentBet: number; revealedPlayerId: string | null;
  nextRoundReadyPlayerIds: string[]; pendingHitPlayerId: string | null; winnerId: string | null;
  message: string; round: number; turnDeadline: number | null; tableId?: string;
}
interface Command { type: CommandType; amount?: number; commandId?: string; }
interface UserRow {
  id: string; account: string; email: string; displayName: string; avatarData: string | null;
  bankroll: number; playSeconds: number; password_hash?: string; password_salt?: string;
}

const CHIP_START = 500;
const BOT_BANKROLL = Number.MAX_SAFE_INTEGER;
const TURN_LIMIT_MS = 60_000;
const DEFAULT_PLAYER_NAMES = ["玩家 A", "玩家 B"] as const;
const BOT_CLIENT_PREFIX = "bot:";
// 第一阶段只创建 5 个可用对局；大厅保留 20 个视觉桌位，日后扩容时修改此值即可。
const OPEN_TABLE_LIMIT = 5;
const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const GAME_TYPE = "blackjack";
const AUTH_WINDOW_MS = 15 * 60_000;
const AUTH_ATTEMPT_LIMIT = 10;
const MAX_COMMAND_BYTES = 2_048;
const bytes = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const fromBytes = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const text = new TextEncoder();
const digest = async (value: string) => bytes(new Uint8Array(await crypto.subtle.digest("SHA-256", text.encode(value))));
const timingSafeEqual = (left: Uint8Array, right: Uint8Array) => {
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean };
  return left.byteLength === right.byteLength && subtle.timingSafeEqual(left, right);
};
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", text.encode(password), "PBKDF2", false, ["deriveBits"]);
  return bytes(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: text.encode(salt), iterations: 100_000 }, key, 256)));
}
function corsHeaders(request: Request, env: AppEnv) {
  const origin = request.headers.get("Origin");
  const allowed = new Set(env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean));
  let localDevelopmentOrigin = false;
  if (origin) {
    try {
      const parsed = new URL(origin);
      // A locally served Wrangler Worker may be reached from localhost, LAN or VPN addresses.
      // The production Worker is HTTPS, so this does not broaden its origin policy.
      localDevelopmentOrigin = new URL(request.url).protocol === "http:" && parsed.protocol === "http:";
    } catch { /* Invalid origins remain blocked. */ }
  }
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && (allowed.has(origin) || localDevelopmentOrigin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
const response = (request: Request, env: AppEnv, data: unknown, status = 200) => Response.json(data, { status, headers: corsHeaders(request, env) });
const publicUser = (row: UserRow) => ({
  id: row.id, account: row.account, email: row.email, displayName: row.displayName,
  avatarData: row.avatarData, bankroll: row.bankroll, playSeconds: row.playSeconds,
});
async function authenticated(request: Request, env: AppEnv) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return env.blackjack_users.prepare("SELECT u.id, u.account, u.email, u.display_name AS displayName, u.avatar_data AS avatarData, u.bankroll, u.play_seconds AS playSeconds FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?")
    .bind(await digest(token), Date.now()).first<UserRow>();
}
async function enforceAuthRateLimit(request: Request, env: AppEnv) {
  const key = request.headers.get("CF-Connecting-IP") ?? "local";
  const now = Date.now();
  await env.blackjack_users.prepare(`INSERT INTO auth_rate_limits (key, window_started, attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET
      window_started=CASE WHEN ?-window_started>=? THEN ? ELSE window_started END,
      attempts=CASE WHEN ?-window_started>=? THEN 1 ELSE attempts+1 END`)
    .bind(key, now, now, AUTH_WINDOW_MS, now, now, AUTH_WINDOW_MS).run();
  const limit = await env.blackjack_users.prepare("SELECT attempts FROM auth_rate_limits WHERE key=? AND window_started>?")
    .bind(key, now - AUTH_WINDOW_MS).first<{ attempts: number }>();
  return (limit?.attempts ?? 0) <= AUTH_ATTEMPT_LIMIT;
}
async function authApi(request: Request, env: AppEnv, path: string) {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request, env) });
  if (path === "/api/auth/me") {
    if (request.method !== "GET") return response(request, env, { message: "Method not allowed" }, 405);
    const user = await authenticated(request, env);
    return user ? response(request, env, { user: publicUser(user) }) : response(request, env, { message: "请先登录。" }, 401);
  }
  if (path === "/api/auth/profile") {
    if (request.method !== "GET" && request.method !== "POST") return response(request, env, { message: "Method not allowed" }, 405);
    const user = await authenticated(request, env); if (!user) return response(request, env, { message: "请先登录。" }, 401);
    if (request.method === "GET") return response(request, env, { user: publicUser(user) });
    const body = await request.json<{ displayName?: string; avatarData?: string | null }>();
    const name = body.displayName?.trim().slice(0, 20) || String(user.displayName);
    const avatar = body.avatarData && body.avatarData.length <= 140_000 ? body.avatarData : null;
    await env.blackjack_users.prepare("UPDATE users SET display_name=?, avatar_data=? WHERE id=?").bind(name, avatar, user.id).run();
    return response(request, env, { user: publicUser({ ...user, displayName: name, avatarData: avatar }) });
  }
  if (path === "/api/auth/claim-bankroll") {
    if (request.method !== "POST") return response(request, env, { message: "Method not allowed" }, 405);
    const user = await authenticated(request, env); if (!user) return response(request, env, { message: "请先登录。" }, 401);
    const active = await env.blackjack_users.prepare("SELECT 1 AS active FROM active_game_sessions WHERE user_id=?").bind(user.id).first();
    if (active) return response(request, env, { message: "请先离开当前牌桌再领取赌资。" }, 409);
    const transactionId = crypto.randomUUID();
    const [result] = await env.blackjack_users.batch([
      env.blackjack_users.prepare(`UPDATE users SET bankroll=bankroll+100 WHERE id=? AND bankroll<100
        AND NOT EXISTS (SELECT 1 FROM active_game_sessions WHERE user_id=?)`).bind(user.id, user.id),
      env.blackjack_users.prepare(`INSERT INTO wallet_transactions
        (id,user_id,game_type,table_id,round_id,type,amount,balance_after,idempotency_key,created_at)
        SELECT ?,id,'platform',NULL,NULL,'bonus',100,bankroll,?,? FROM users WHERE id=? AND changes()=1`)
        .bind(transactionId, `bonus:${transactionId}`, Date.now(), user.id),
    ]);
    const updated = await authenticated(request, env);
    if (!result.meta.changes) return response(request, env, { message: "赌资不少于 100，暂不能领取。", user: updated && publicUser(updated) }, 400);
    return response(request, env, { message: "已领取 100 赌资。", user: updated && publicUser(updated) });
  }
  if (path === "/api/auth/ws-ticket") {
    if (request.method !== "POST") return response(request, env, { message: "Method not allowed" }, 405);
    const user = await authenticated(request, env); if (!user) return response(request, env, { message: "请先登录。" }, 401);
    const ticket = bytes(crypto.getRandomValues(new Uint8Array(32)));
    await env.blackjack_users.batch([
      env.blackjack_users.prepare("DELETE FROM websocket_tickets WHERE expires_at<=?").bind(Date.now()),
      env.blackjack_users.prepare("INSERT INTO websocket_tickets (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(ticket), user.id, Date.now() + 60_000),
    ]);
    return response(request, env, { ticket });
  }
  if (path === "/api/auth/logout") {
    if (request.method !== "POST") return response(request, env, { message: "Method not allowed" }, 405);
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (token) await env.blackjack_users.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
    return response(request, env, { ok: true });
  }
  if (request.method !== "POST") return response(request, env, { message: "Method not allowed" }, 405);
  if (!await enforceAuthRateLimit(request, env)) return response(request, env, { message: "尝试次数过多，请稍后再试。" }, 429);
  const body = await request.json<{ account?: string; email?: string; password?: string; displayName?: string; avatarData?: string }>();
  const account = body.account?.trim(); const password = body.password ?? "";
  if (path === "/api/auth/register") {
    if (!account || account.length < 3 || !body.email?.includes("@") || password.length < 10) return response(request, env, { message: "请填写用户名、有效邮箱和至少 10 位密码。" }, 400);
    const salt = bytes(crypto.getRandomValues(new Uint8Array(16))); const id = crypto.randomUUID(); const name = body.displayName?.trim().slice(0, 20) || account;
    try { await env.blackjack_users.prepare("INSERT INTO users (id,account,email,password_hash,password_salt,display_name,avatar_data,bankroll,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, account, body.email.trim().toLowerCase(), await passwordHash(password, salt), salt, name, null, CHIP_START, Date.now()).run(); }
    catch { return response(request, env, { message: "用户名或邮箱已存在。" }, 409); }
  }
  const row = await env.blackjack_users.prepare("SELECT id,password_hash,password_salt,display_name AS displayName,avatar_data AS avatarData,account,email,bankroll,play_seconds AS playSeconds FROM users WHERE account=?").bind(account).first<UserRow>();
  const calculated = await passwordHash(password, row?.password_salt ?? "missing-account-constant-work-salt");
  if (!row || !row.password_hash || !timingSafeEqual(fromBytes(row.password_hash), fromBytes(calculated))) return response(request, env, { message: "账号或密码错误。" }, 401);
  const token = bytes(crypto.getRandomValues(new Uint8Array(32))); await env.blackjack_users.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token), row.id, Date.now() + 30 * 86400_000).run();
  return response(request, env, { token, user: publicUser(row) });
}

function deck(): Card[] {
  const cards = suits.flatMap((suit) => ranks.map((rank) => ({ id: `${rank}-${suit}`, rank, suit })));
  for (let i = cards.length - 1; i > 0; i--) {
    const limit = Math.floor(0x1_0000_0000 / (i + 1)) * (i + 1);
    const sample = new Uint32Array(1);
    do crypto.getRandomValues(sample); while (sample[0] >= limit);
    const j = sample[0] % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function secureIndex(length: number) {
  if (!Number.isInteger(length) || length <= 0) throw new Error("Invalid random range");
  const limit = Math.floor(0x1_0000_0000 / length) * length;
  const sample = new Uint32Array(1);
  do crypto.getRandomValues(sample); while (sample[0] >= limit);
  return sample[0] % length;
}

function newPlayer(id: string, name: string, seatIndex: 0 | 1): Player {
  return { id, name, avatarData: null, seatIndex, clientId: null, isBot: false, bankroll: CHIP_START, bet: 0, requestedBet: 0, hand: [], hasStood: false, isBusted: false };
}

function initialState(): TableState {
  return {
    players: [newPlayer("player-a", DEFAULT_PLAYER_NAMES[0], 0), newPlayer("player-b", DEFAULT_PLAYER_NAMES[1], 1)], deck: deck(),
    status: "waiting", activePlayerId: null, bettingPlayerId: null, currentBet: 0, revealedPlayerId: null,
    nextRoundReadyPlayerIds: [], pendingHitPlayerId: null, winnerId: null, round: 1, turnDeadline: null,
    message: "等待两名玩家进入房间。",
  };
}

function value(hand: Card[]) {
  let total = hand.reduce((sum, card) => sum + (card.rank === "A" ? 11 : Number(card.rank)), 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (total > 21 && aces) { total -= 10; aces--; }
  return total;
}

export class BlackjackTable extends DurableObject<AppEnv> {
  private table: TableState | null = null;

  constructor(ctx: DurableObjectState, env: AppEnv) { super(ctx, env); }

  private async load() {
    if (!this.table) {
      this.table = await this.ctx.storage.get<TableState>("table") ?? initialState();
      // Existing local/remote Durable Object state may still contain the old
      // 52-card deck. Remove face cards once when that state is loaded.
      const allowedRanks = new Set<string>(ranks);
      const oldDeckLength = this.table.deck.length;
      this.table.deck = this.table.deck.filter((card) => allowedRanks.has(card.rank));
      let stateChanged = this.table.deck.length !== oldDeckLength;
      for (const player of this.table.players) {
        const oldHandLength = player.hand.length;
        player.hand = player.hand.filter((card) => allowedRanks.has(card.rank));
        stateChanged ||= player.hand.length !== oldHandLength;
        if (player.isBot && player.bankroll !== BOT_BANKROLL) {
          player.bankroll = BOT_BANKROLL;
          stateChanged = true;
        }
      }
      // 兼容部署前已经持久化的空座资料和等待文案。
      for (const player of this.table.players) if (!player.clientId) this.resetSeat(player);
      if (this.table.status === "waiting") this.table.message = this.waitingMessage();
      if (stateChanged) await this.save();
    }
    return this.table;
  }

  private async save() { await this.ctx.storage.put("table", this.table!); }
  private playerFor(clientId: string) { return this.table!.players.find((player) => player.clientId === clientId) ?? null; }
  private playerForUser(userId: string) { return this.table!.players.find((player) => player.userId === userId) ?? null; }
  private byId(id: string | null) { return this.table!.players.find((player) => player.id === id) ?? null; }
  private other(player: Player) { return this.table!.players.find((item) => item.id !== player.id)!; }

  private async setTurn(playerId: string | null) {
    const table = this.table!;
    table.activePlayerId = playerId;
    table.turnDeadline = playerId ? Date.now() + TURN_LIMIT_MS : null;
    if (table.turnDeadline) await this.ctx.storage.setAlarm(table.turnDeadline);
    else await this.ctx.storage.deleteAlarm();
  }

  private stateFor(clientId: string | null) {
    const table = this.table!;
    const viewer = clientId ? this.playerFor(clientId) : null;
    const ordered = viewer ? [viewer, this.other(viewer)] : table.players;
    return {
      players: ordered.map((player) => {
        const canSee = viewer?.id === player.id || table.status === "finished";
        const cards = canSee ? player.hand : player.id === table.revealedPlayerId ? player.hand.slice(0, 1) : [];
        return {
          id: player.id, name: player.name, avatarData: player.avatarData, seatIndex: player.seatIndex, isBot: Boolean(player.isBot),
          hand: cards, hiddenCardCount: canSee ? 0 : Math.max(0, player.hand.length - cards.length),
          // Keep the wire value bounded so clients cached before the isBot UI existed
          // never try to render Number.MAX_SAFE_INTEGER as millions of chips.
          hasStood: player.hasStood, isBusted: player.isBusted, bankroll: player.isBot ? CHIP_START : player.bankroll,
          bet: player.bet, requestedBet: player.requestedBet,
        };
      }),
      viewerPlayerId: viewer?.id ?? null, activePlayerId: table.activePlayerId, bettingPlayerId: table.bettingPlayerId,
      currentBet: table.currentBet, revealedPlayerId: table.revealedPlayerId,
      nextRoundConfirmations: table.nextRoundReadyPlayerIds.length,
      nextRoundConfirmed: Boolean(viewer && table.nextRoundReadyPlayerIds.includes(viewer.id)),
      turnSecondsRemaining: table.turnDeadline ? Math.max(0, Math.ceil((table.turnDeadline - Date.now()) / 1000)) : 0,
      status: table.status, message: table.message, round: table.round, deckCount: table.deck.length, winnerId: table.winnerId,
    };
  }

  private async broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as { clientId: string } | null;
      ws.send(JSON.stringify({ type: "TABLE_STATE", payload: this.stateFor(attachment?.clientId ?? null) }));
    }
  }

  async fetch(request: Request): Promise<Response> {
    await this.load();
    const url = new URL(request.url);
    const requestedTableId = url.searchParams.get("table_id");
    if (requestedTableId && !this.table!.tableId) this.table!.tableId = requestedTableId;
    const clientId = url.searchParams.get("client_id");
    if (url.pathname === "/state") return Response.json(this.stateFor(null));
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket" || !clientId) return new Response("WebSocket required", { status: 400 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.serializeAttachment({ clientId, ticket: url.searchParams.get("ticket") });
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "JOINED", payload: { tableId: this.ctx.id.toString(), clientId, playerId: this.playerFor(clientId)?.id ?? null } }));
      await this.broadcast();
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === "/command" && request.method === "POST" && clientId) {
      await this.handle(clientId, await request.json() as Command, url.searchParams.get("ticket"));
      await this.save();
      await this.broadcast();
      return Response.json(this.stateFor(clientId));
    }
    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.load();
    const attachment = ws.deserializeAttachment() as { clientId: string; ticket?: string | null };
    try {
      const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
      if (text.encode(raw).byteLength > MAX_COMMAND_BYTES) throw new Error("Command is too large");
      const command = JSON.parse(raw) as Command;
      await this.handle(attachment.clientId, command, attachment.ticket);
      if (command.type === "SIT_DOWN") {
        attachment.ticket = null;
        ws.serializeAttachment(attachment);
      }
      await this.save();
      await this.broadcast();
    } catch { ws.send(JSON.stringify({ type: "ERROR", payload: { message: "无效的游戏命令。" } })); }
  }

  async webSocketClose(ws: WebSocket) {
    await this.load();
    const attachment = ws.deserializeAttachment() as { clientId?: string } | null;
    const clientId = attachment?.clientId;
    const hasReplacement = clientId && this.ctx.getWebSockets().some((candidate) => {
      if (candidate === ws) return false;
      return (candidate.deserializeAttachment() as { clientId?: string } | null)?.clientId === clientId;
    });
    const player = clientId && !hasReplacement ? this.playerFor(clientId) : null;
    if (player) {
      await this.leave(player);
      await this.save();
      await this.broadcast();
    }
    ws.close();
  }

  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws); }

  async alarm() {
    await this.load();
    const table = this.table!;
    if (table.status !== "playing" || !table.turnDeadline || Date.now() < table.turnDeadline) return;
    const player = this.byId(table.activePlayerId);
    if (!player) return;
    player.hasStood = true;
    await this.nextTurn(player, `${player.name} 行动超时，自动停牌。`);
    await this.advanceBots();
    await this.save();
    await this.broadcast();
  }

  private async handle(clientId: string, command: Command, ticket?: string | null) {
    const table = this.table!;
    if (!command || typeof command.type !== "string") throw new Error("Invalid command");
    if (command.type === "SIT_DOWN") { await this.join(clientId, ticket); await this.advanceBots(); return; }
    if (command.type === "LEAVE_SEAT") { const player = this.playerFor(clientId); if (player) await this.leave(player); return; }
    const player = this.playerFor(clientId);
    if (!player) { table.message = "请先点击坐下。"; return; }
    if (command.type === "CALL_BOT") await this.callBot(player);
    else if (command.type === "PLACE_BET") await this.placeBet(player, command.amount ?? 0, command.commandId);
    else if (command.type === "CALL") await this.call(player, command.commandId);
    else if (command.type === "ALL_IN") await this.allIn(player, command.commandId);
    else if (command.type === "FOLD") await this.fold(player);
    else if (command.type === "NEXT_ROUND") await this.nextRound(player);
    else if (command.type === "HIT") await this.hit(player);
    else if (command.type === "HIT_PREVIEW") await this.previewHit(player);
    else if (command.type === "HIT_COMMIT") await this.commitHit(player);
    else if (command.type === "STAND") await this.stand(player);
    await this.advanceBots();
  }

  private async join(clientId: string, ticket?: string | null) {
    const table = this.table!;
    if (this.playerFor(clientId)) return;
    if (!ticket) { table.message = "登录凭证已过期，请返回大厅后重试。"; return; }
    const ticketHash = await digest(ticket);
    const user = await this.env.blackjack_users.prepare(`SELECT u.id,u.display_name AS displayName,u.avatar_data AS avatarData,u.bankroll
      FROM websocket_tickets t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>?`)
      .bind(ticketHash, Date.now()).first<{ id: string; displayName: string; avatarData: string | null; bankroll: number }>();
    if (!user) { table.message = "登录已过期，请重新登录。"; return; }
    const consumed = await this.env.blackjack_users.prepare("DELETE FROM websocket_tickets WHERE token_hash=? AND expires_at>?").bind(ticketHash, Date.now()).run();
    if (!consumed.meta.changes) { table.message = "登录凭证已被使用，请返回大厅后重试。"; return; }
    const currentSeat = this.playerForUser(user.id);
    if (currentSeat) { currentSeat.clientId = clientId; currentSeat.bankroll = user.bankroll; return; }
    const seat = table.players.find((player) => player.clientId === null);
    if (!seat) { table.message = "牌桌座位已满，你正在观战。"; return; }
    const tableId = table.tableId ?? this.ctx.id.toString();
    const active = await this.env.blackjack_users.prepare("SELECT game_type AS gameType,table_id AS tableId FROM active_game_sessions WHERE user_id=?").bind(user.id).first<{ gameType: string; tableId: string }>();
    if (active && (active.gameType !== GAME_TYPE || active.tableId !== tableId)) { table.message = "该账号已在另一张牌桌中。"; return; }
    if (!active) {
      try {
        const now = Date.now();
        await this.env.blackjack_users.prepare("INSERT INTO active_game_sessions (user_id,game_type,table_id,seat_id,started_at,updated_at) VALUES (?,?,?,?,?,?)")
          .bind(user.id, GAME_TYPE, tableId, seat.id, now, now).run();
      } catch { table.message = "该账号刚刚在另一张牌桌入座。"; return; }
    }
    seat.clientId = clientId; seat.userId = user.id; seat.name = user.displayName; seat.avatarData = user.avatarData; seat.bankroll = user.bankroll; seat.isBot = false;
    if (table.players.every((player) => player.clientId)) {
      table.status = "betting";
      table.bettingPlayerId = table.players[secureIndex(table.players.length)].id;
      table.currentBet = 0;
      table.message = `随机选择 ${this.byId(table.bettingPlayerId)!.name} 先下底注。`;
    } else {
      table.status = "waiting";
      table.message = "等待一名玩家进入房间。";
    }
  }

  private async leave(player: Player) {
    if ((this.table!.status === "betting" || this.table!.status === "playing") && this.table!.players.some((seat) => seat.bet > 0)) {
      await this.finish(this.other(player).id, `${player.name} 离开牌桌，对方获得底池。`);
    }
    if (player.userId) {
      const tableId = this.table!.tableId ?? this.ctx.id.toString();
      const session = await this.env.blackjack_users.prepare("SELECT started_at AS startedAt FROM active_game_sessions WHERE user_id=? AND game_type=? AND table_id=?")
        .bind(player.userId, GAME_TYPE, tableId).first<{ startedAt: number }>();
      const playedSeconds = session ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)) : 0;
      await this.env.blackjack_users.batch([
        this.env.blackjack_users.prepare("UPDATE users SET play_seconds=play_seconds+? WHERE id=?").bind(playedSeconds, player.userId),
        this.env.blackjack_users.prepare("DELETE FROM active_game_sessions WHERE user_id=? AND game_type=? AND table_id=?").bind(player.userId, GAME_TYPE, tableId),
      ]);
    }
    this.resetSeat(player);
    if (!this.table!.players.some((seat) => seat.clientId && !seat.isBot)) {
      for (const seat of this.table!.players) if (seat.isBot) this.resetSeat(seat);
    }
    Object.assign(this.table!, { status: "waiting", bettingPlayerId: null, currentBet: 0, revealedPlayerId: null, nextRoundReadyPlayerIds: [], message: this.waitingMessage() });
    await this.setTurn(null);
  }

  private resetSeat(player: Player) {
    Object.assign(player, {
      clientId: null, isBot: false, name: DEFAULT_PLAYER_NAMES[player.seatIndex], avatarData: null,
      userId: null, bankroll: CHIP_START, bet: 0, requestedBet: 0, hand: [], hasStood: false, isBusted: false,
    });
  }

  private async changeWallet(player: Player, amount: number, type: string, idempotencyKey: string) {
    if (!Number.isInteger(amount) || amount === 0) return;
    if (player.isBot) return;
    if (!player.userId) { player.bankroll += amount; return; }
    const existing = await this.env.blackjack_users.prepare("SELECT balance_after AS balanceAfter FROM wallet_transactions WHERE idempotency_key=?")
      .bind(idempotencyKey).first<{ balanceAfter: number }>();
    if (existing) { player.bankroll = existing.balanceAfter; return; }
    const tableId = this.table!.tableId ?? this.ctx.id.toString();
    const wallet = await this.env.blackjack_users.prepare(`SELECT u.bankroll FROM users u JOIN active_game_sessions a ON a.user_id=u.id
      WHERE u.id=? AND a.game_type=? AND a.table_id=?`).bind(player.userId, GAME_TYPE, tableId).first<{ bankroll: number }>();
    if (!wallet) throw new Error("Wallet session is not active");
    const nextBalance = wallet.bankroll + amount;
    if (nextBalance < 0) throw new Error("Insufficient bankroll");
    const transactionId = crypto.randomUUID();
    await this.env.blackjack_users.batch([
      this.env.blackjack_users.prepare("UPDATE users SET bankroll=? WHERE id=?").bind(nextBalance, player.userId),
      this.env.blackjack_users.prepare(`INSERT INTO wallet_transactions
        (id,user_id,game_type,table_id,round_id,type,amount,balance_after,idempotency_key,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(transactionId, player.userId, GAME_TYPE, tableId, `${tableId}:${this.table!.round}`, type, amount, nextBalance, idempotencyKey, Date.now()),
      this.env.blackjack_users.prepare("UPDATE active_game_sessions SET updated_at=? WHERE user_id=?").bind(Date.now(), player.userId),
    ]);
    player.bankroll = nextBalance;
  }

  private actionKey(action: string, player: Player, commandId: string | undefined, discriminator = "") {
    const safeCommandId = commandId && /^[a-zA-Z0-9:-]{8,100}$/.test(commandId) ? commandId : crypto.randomUUID();
    const tableId = this.table!.tableId ?? this.ctx.id.toString();
    return `${action}:${tableId}:${this.table!.round}:${player.id}:${safeCommandId}:${discriminator}`;
  }

  private waitingMessage() {
    return this.table!.players.some((player) => player.clientId)
      ? "等待一名玩家进入房间。"
      : "等待两名玩家进入房间。";
  }

  private async callBot(player: Player) {
    const table = this.table!;
    if (table.status !== "waiting" || player.isBot) return;
    const seat = table.players.find((item) => item.clientId === null);
    if (!seat) return;
    Object.assign(seat, { clientId: `${BOT_CLIENT_PREFIX}${seat.id}`, isBot: true, name: "人机", avatarData: null, bankroll: BOT_BANKROLL });
    table.status = "betting";
    table.bettingPlayerId = table.players[secureIndex(table.players.length)].id;
    table.currentBet = 0;
    table.message = `${this.byId(table.bettingPlayerId)!.name} 先下底注。`;
  }

  private async advanceBots() {
    const table = this.table!;
    for (let step = 0; step < 12; step++) {
      const bettingBot = table.status === "betting" ? this.byId(table.bettingPlayerId) : null;
      if (bettingBot?.isBot) {
        if (table.currentBet === 0) await this.placeBet(bettingBot, Math.min(100, bettingBot.bankroll));
        else if (table.currentBet - bettingBot.bet <= bettingBot.bankroll) await this.call(bettingBot);
        else await this.fold(bettingBot);
        continue;
      }
      const activeBot = table.status === "playing" ? this.byId(table.activePlayerId) : null;
      if (activeBot?.isBot) {
        if (value(activeBot.hand) < 17 && table.deck.length) await this.hit(activeBot);
        else await this.stand(activeBot);
        continue;
      }
      if (table.status === "finished" || table.status === "deck-empty") {
        const bot = table.players.find((item) => item.isBot);
        if (bot && !table.nextRoundReadyPlayerIds.includes(bot.id)) {
          await this.nextRound(bot);
          continue;
        }
      }
      break;
    }
  }

  private async placeBet(player: Player, amount: number, commandId: string = crypto.randomUUID()) {
    const table = this.table!;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id) return;
    const commit = calculateRaise(player.bankroll, player.bet, table.currentBet, amount);
    if (!commit) { table.message = "请输入有效且更高的下注金额。"; return; }
    const { delta } = commit;
    await this.changeWallet(player, -delta, "bet", this.actionKey("bet", player, commandId, String(amount)));
    player.bet = amount; player.requestedBet = amount;
    table.currentBet = amount; const other = this.other(player); table.bettingPlayerId = other.id;
    table.message = `${player.name} ${other.requestedBet ? "加注到" : "下了底注"} ${amount} $，轮到 ${other.name} 跟注、加注或退出。`;
  }

  private async call(player: Player, commandId: string = crypto.randomUUID()) {
    const table = this.table!;
    const delta = table.currentBet - player.bet;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id || !table.currentBet || delta > player.bankroll) return;
    if (delta > 0) await this.changeWallet(player, -delta, "call", this.actionKey("call", player, commandId, String(table.currentBet)));
    player.bet = table.currentBet; player.requestedBet = table.currentBet;
    await this.startRound(this.other(player), player);
  }

  private async allIn(player: Player, commandId: string = crypto.randomUUID()) {
    const table = this.table!;
    const callDelta = table.currentBet - player.bet;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id || !table.currentBet || player.bankroll >= callDelta || player.bankroll <= 0) return;
    const allIn = calculateShortAllIn(player.bankroll, player.bet, this.other(player).bet);
    if (!allIn) return;
    const { matchedTotal, uncalledRefund: refund } = allIn;
    await this.changeWallet(player, -player.bankroll, "all_in", this.actionKey("all-in", player, commandId, String(matchedTotal)));
    player.bet = matchedTotal; player.requestedBet = matchedTotal;
    const opponent = this.other(player);
    if (refund) {
      opponent.bet -= refund;
      opponent.requestedBet = opponent.bet;
      await this.changeWallet(opponent, refund, "uncalled_bet_refund", this.actionKey("all-in-refund", opponent, commandId, String(refund)));
    }
    table.currentBet = matchedTotal;
    await this.startRound(opponent, player);
  }

  private async fold(player: Player) {
    const table = this.table!;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id) return;
    await this.finish(this.other(player).id, `${player.name} 选择退出，对方获胜。`);
  }

  private async startRound(first: Player, revealed: Player) {
    const table = this.table!;
    if (table.deck.length < 2) table.deck = deck();
    for (const player of table.players) Object.assign(player, { requestedBet: 0, hand: [table.deck.pop()!], hasStood: false, isBusted: false });
    Object.assign(table, { status: "playing", bettingPlayerId: null, currentBet: 0, revealedPlayerId: revealed.id, winnerId: null, message: `${revealed.name} 跟注成功，${first.name} 先行动。` });
    await this.setTurn(first.id);
  }

  private async nextRound(player: Player) {
    const table = this.table!;
    if (table.status !== "finished" && table.status !== "deck-empty") return;
    if (!table.nextRoundReadyPlayerIds.includes(player.id)) table.nextRoundReadyPlayerIds.push(player.id);
    if (table.nextRoundReadyPlayerIds.length < 2) { table.message = `等待另一位玩家确认下一局（${table.nextRoundReadyPlayerIds.length}/2）。`; return; }
    if (table.deck.length < 2) table.deck = deck();
    for (const seated of table.players) Object.assign(seated, { bet: 0, requestedBet: 0, hand: [], hasStood: false, isBusted: false });
    Object.assign(table, { status: "betting", winnerId: null, pendingHitPlayerId: null, currentBet: 0, revealedPlayerId: null, nextRoundReadyPlayerIds: [], round: table.round + 1 });
    table.bettingPlayerId = table.players[secureIndex(table.players.length)].id;
    table.message = `随机选择 ${this.byId(table.bettingPlayerId)!.name} 先下底注。`;
    await this.setTurn(null);
  }

  private async hit(player: Player) {
    const table = this.table!;
    if (table.status !== "playing" || table.activePlayerId !== player.id) return;
    if (!table.deck.length) { table.status = "deck-empty"; await this.setTurn(null); table.message = "牌堆已用尽，请重新洗牌。"; return; }
    player.hand.push(table.deck.pop()!);
    await this.resolveHit(player);
  }

  private async previewHit(player: Player) {
    const table = this.table!;
    if (table.status !== "playing" || table.activePlayerId !== player.id || table.pendingHitPlayerId) return;
    if (!table.deck.length) { table.status = "deck-empty"; await this.setTurn(null); table.message = "牌堆已用尽，请重新洗牌。"; return; }
    player.hand.push(table.deck.pop()!);
    table.pendingHitPlayerId = player.id;
    table.message = `${player.name} 正在摸牌…`;
  }

  private async commitHit(player: Player) {
    const table = this.table!;
    if (table.status !== "playing" || table.activePlayerId !== player.id || table.pendingHitPlayerId !== player.id) return;
    table.pendingHitPlayerId = null;
    await this.resolveHit(player);
  }

  private async resolveHit(player: Player) {
    const handScore = value(player.hand);
    if (handScore > 21) { player.isBusted = true; player.hasStood = true; await this.finish(this.other(player).id, `${player.name} 爆牌，另一方获胜。`); return; }
    if (handScore === 21) {
      player.hasStood = true;
      await this.nextTurn(player, player.hand.length === 2 ? `${player.name} Blackjack！自动停牌。` : `${player.name} 达到 21 点，自动停牌。`);
      return;
    }
    if (player.hand.length >= 5) player.hasStood = true;
    await this.nextTurn(player, player.hasStood ? `${player.name} 已有五张牌，自动停牌。` : undefined);
  }

  private async stand(player: Player) {
    if (this.table!.status !== "playing" || this.table!.activePlayerId !== player.id) return;
    player.hasStood = true; await this.nextTurn(player, `${player.name} 选择停牌。`);
  }

  private async nextTurn(previous: Player, message?: string) {
    const other = this.other(previous);
    if (!other.hasStood) { await this.setTurn(other.id); this.table!.message = message ? `${message} 轮到 ${other.name}。` : `轮到 ${other.name}。`; }
    else if (!previous.hasStood) { await this.setTurn(previous.id); this.table!.message = `轮到 ${previous.name}。`; }
    else await this.resolveRound();
  }

  private async resolveRound() {
    const [a, b] = this.table!.players; const av = value(a.hand); const bv = value(b.hand);
    await this.finish(av === bv ? null : av > bv ? a.id : b.id, av === bv ? "本局同点，平局。" : `${this.byId(av > bv ? a.id : b.id)!.name} 获胜。`);
  }

  private async finish(winnerId: string | null, message: string) {
    const table = this.table!; const pot = table.players.reduce((sum, player) => sum + player.bet, 0);
    if (winnerId) {
      const winner = this.byId(winnerId)!;
      await this.changeWallet(winner, pot, "payout", `payout:${table.tableId ?? this.ctx.id.toString()}:${table.round}:${winner.id}`);
    } else {
      for (const player of table.players) {
        if (player.bet) await this.changeWallet(player, player.bet, "refund", `refund:${table.tableId ?? this.ctx.id.toString()}:${table.round}:${player.id}`);
      }
    }
    Object.assign(table, { status: "finished", winnerId, message }); await this.setTurn(null);
  }
}

async function handleRequest(request: Request, env: AppEnv): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const accessHeaders = corsHeaders(request, env);
    if (origin && !accessHeaders["Access-Control-Allow-Origin"]) return Response.json({ message: "Origin not allowed" }, { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { headers: accessHeaders });
    if (url.pathname === "/health") return response(request, env, { status: "ok" });
    if (["/api/auth/me", "/api/auth/profile", "/api/auth/login", "/api/auth/register", "/api/auth/claim-bankroll", "/api/auth/ws-ticket", "/api/auth/logout"].includes(url.pathname)) return authApi(request, env, url.pathname);
    const match = url.pathname.match(/^\/(?:api\/)?tables\/([^/]+)\/(state|command)$/) ?? url.pathname.match(/^\/ws\/tables\/([^/]+)$/);
    if (!match) return new Response("Not found", { status: 404 });
    const tableId = decodeURIComponent(match[1]);
    const tableNumber = /^table-(\d+)$/.exec(tableId)?.[1];
    if (!tableNumber || Number(tableNumber) < 1 || Number(tableNumber) > OPEN_TABLE_LIMIT) {
      return response(request, env, { message: "该牌桌尚未开放。" }, 403);
    }
    const stub = env.BLACKJACK_TABLE.getByName(tableId);
    const isWebSocket = url.pathname.startsWith("/ws/");
    const destination = isWebSocket ? "/ws" : url.pathname.endsWith("/state") ? "/state" : "/command";
    const internalUrl = new URL(`https://table.internal${destination}${url.search}`);
    internalUrl.searchParams.set("table_id", tableId);
    const proxied = await stub.fetch(new Request(internalUrl, request));
    if (isWebSocket) return proxied;
    const headers = new Headers(proxied.headers);
    Object.entries(accessHeaders).forEach(([key, value]) => headers.set(key, value));
    return new Response(proxied.body, { status: proxied.status, statusText: proxied.statusText, headers });
}

export default {
  async fetch(request, env): Promise<Response> {
    try { return await handleRequest(request, env); }
    catch (error) {
      console.error(JSON.stringify({ event: "request_error", method: request.method, path: new URL(request.url).pathname, error: error instanceof Error ? error.message : String(error) }));
      return response(request, env, { message: "服务器暂时无法处理该请求。" }, 500);
    }
  },
} satisfies ExportedHandler<AppEnv>;
