import { DurableObject } from "cloudflare:workers";

export interface Env {
  BLACKJACK_TABLE: DurableObjectNamespace;
  blackjack_users: D1Database;
}

type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
type Status = "waiting" | "betting" | "playing" | "finished" | "deck-empty";
type CommandType = "SIT_DOWN" | "PLACE_BET" | "CALL" | "ALL_IN" | "FOLD" | "NEXT_ROUND" | "HIT" | "HIT_PREVIEW" | "HIT_COMMIT" | "STAND" | "DOUBLE" | "LEAVE_SEAT" | "CALL_BOT";

interface Card { id: string; rank: Rank; suit: Suit; }
interface Player { id: string; name: string; avatarData?: string | null; userId?: string | null; seatIndex: 0 | 1; clientId: string | null; isBot?: boolean; bankroll: number; bet: number; requestedBet: number; hand: Card[]; hasStood: boolean; isBusted: boolean; }
interface TableState {
  players: [Player, Player]; deck: Card[]; status: Status; activePlayerId: string | null;
  bettingPlayerId: string | null; currentBet: number; revealedPlayerId: string | null;
  nextRoundReadyPlayerIds: string[]; pendingHitPlayerId: string | null; winnerId: string | null;
  message: string; round: number; turnDeadline: number | null;
}
interface Command { type: CommandType; amount?: number; }

const CHIP_START = 500;
const TURN_LIMIT_MS = 60_000;
const DEFAULT_PLAYER_NAMES = ["玩家 A", "玩家 B"] as const;
const BOT_CLIENT_PREFIX = "bot:";
// 第一阶段只创建 5 个可用对局；大厅保留 20 个视觉桌位，日后扩容时修改此值即可。
const OPEN_TABLE_LIMIT = 5;
const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const bytes = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const text = new TextEncoder();
const digest = async (value: string) => bytes(new Uint8Array(await crypto.subtle.digest("SHA-256", text.encode(value))));
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", text.encode(password), "PBKDF2", false, ["deriveBits"]);
  return bytes(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: text.encode(salt), iterations: 100_000 }, key, 256)));
}
const response = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
async function authenticated(request: Request, env: Env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return env.blackjack_users.prepare("SELECT u.id, u.account, u.email, u.display_name AS displayName, u.avatar_data AS avatarData, u.bankroll, u.play_seconds AS playSeconds FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? ").bind(await digest(token), Date.now()).first();
}
async function authApi(request: Request, env: Env, path: string) {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (path === "/api/auth/me") { const user = await authenticated(request, env); return user ? response({ user }) : response({ message: "请先登录。" }, 401); }
  if (path === "/api/auth/profile") {
    const user = await authenticated(request, env); if (!user) return response({ message: "请先登录。" }, 401);
    if (request.method === "GET") return response({ user });
    const body = await request.json<{ displayName?: string; avatarData?: string | null }>();
    const name = body.displayName?.trim().slice(0, 20) || String(user.displayName);
    const avatar = body.avatarData && body.avatarData.length <= 140_000 ? body.avatarData : null;
    await env.blackjack_users.prepare("UPDATE users SET display_name=?, avatar_data=? WHERE id=?").bind(name, avatar, user.id).run();
    return response({ user: { ...user, displayName: name, avatarData: avatar } });
  }
  if (path === "/api/auth/claim-bankroll") {
    const user = await authenticated(request, env); if (!user) return response({ message: "请先登录。" }, 401);
    const result = await env.blackjack_users.prepare("UPDATE users SET bankroll=bankroll+100 WHERE id=? AND bankroll<100").bind(user.id).run();
    const updated = await authenticated(request, env);
    if (!result.meta.changes) return response({ message: "赌资不少于 100，暂不能领取。", user: updated }, 400);
    return response({ message: "已领取 100 赌资。", user: updated });
  }
  const body = await request.json<{ account?: string; email?: string; password?: string; displayName?: string; avatarData?: string }>();
  const account = body.account?.trim(); const password = body.password ?? "";
  if (path === "/api/auth/register") {
    if (!account || account.length < 3 || !body.email?.includes("@") || !password || password.length < 6) return response({ message: "请填写用户名、有效邮箱和至少 6 位密码。" }, 400);
    const salt = bytes(crypto.getRandomValues(new Uint8Array(16))); const id = crypto.randomUUID(); const name = body.displayName?.trim().slice(0, 20) || account;
    try { await env.blackjack_users.prepare("INSERT INTO users (id,account,email,password_hash,password_salt,display_name,avatar_data,bankroll,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, account, body.email.trim().toLowerCase(), await passwordHash(password, salt), salt, name, null, CHIP_START, Date.now()).run(); }
    catch { return response({ message: "用户名或邮箱已存在。" }, 409); }
  }
  const row = await env.blackjack_users.prepare("SELECT id,password_hash,password_salt,display_name AS displayName,avatar_data AS avatarData,account,email,bankroll,play_seconds AS playSeconds FROM users WHERE account=?").bind(account).first<{ id:string; password_hash:string; password_salt:string; displayName:string; avatarData:string|null; account:string; email:string; bankroll:number; playSeconds:number }>();
  if (!row || row.password_hash !== await passwordHash(password, row.password_salt)) return response({ message: "账号或密码错误。" }, 401);
  const token = bytes(crypto.getRandomValues(new Uint8Array(32))); await env.blackjack_users.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token), row.id, Date.now() + 30 * 86400_000).run();
  return response({ token, user: { id: row.id, account: row.account, displayName: row.displayName, avatarData: row.avatarData } });
}

function deck(): Card[] {
  const cards = suits.flatMap((suit) => ranks.map((rank) => ({ id: `${rank}-${suit}`, rank, suit })));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
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

export class BlackjackTable extends DurableObject<Env> {
  private table: TableState | null = null;

  constructor(ctx: DurableObjectState, env: Env) { super(ctx, env); }

  private async load() {
    if (!this.table) {
      this.table = await this.ctx.storage.get<TableState>("table") ?? initialState();
      // 兼容部署前已经持久化的空座资料和等待文案。
      for (const player of this.table.players) if (!player.clientId) this.resetSeat(player);
      if (this.table.status === "waiting") this.table.message = this.waitingMessage();
    }
    return this.table;
  }

  private async save() { await this.ctx.storage.put("table", this.table!); }
  private playerFor(clientId: string) { return this.table!.players.find((player) => player.clientId === clientId) ?? null; }
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
        return { ...player, hand: cards, hiddenCardCount: canSee ? 0 : Math.max(0, player.hand.length - cards.length) };
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
    const clientId = url.searchParams.get("client_id");
    if (url.pathname === "/state") return Response.json(this.stateFor(clientId));
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket" || !clientId) return new Response("WebSocket required", { status: 400 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.serializeAttachment({ clientId, token: url.searchParams.get("auth_token") });
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "JOINED", payload: { tableId: this.ctx.id.toString(), clientId, playerId: this.playerFor(clientId)?.id ?? null } }));
      await this.broadcast();
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === "/command" && request.method === "POST" && clientId) {
      await this.handle(clientId, await request.json() as Command, url.searchParams.get("auth_token"));
      await this.save();
      await this.broadcast();
      return Response.json(this.stateFor(clientId));
    }
    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.load();
    const { clientId, token } = ws.deserializeAttachment() as { clientId: string; token?: string | null };
    try {
      await this.handle(clientId, JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)) as Command, token);
      await this.save();
      await this.broadcast();
    } catch { ws.send(JSON.stringify({ type: "ERROR", payload: { message: "无效的游戏命令。" } })); }
  }

  async webSocketClose(ws: WebSocket) { ws.close(); }

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

  private async handle(clientId: string, command: Command, token?: string | null) {
    const table = this.table!;
    if (command.type === "SIT_DOWN") { await this.join(clientId, token); await this.advanceBots(); return; }
    if (command.type === "LEAVE_SEAT") { const player = this.playerFor(clientId); if (player) await this.leave(player); return; }
    const player = this.playerFor(clientId);
    if (!player) { table.message = "请先点击坐下。"; return; }
    if (command.type === "CALL_BOT") await this.callBot(player);
    else if (command.type === "PLACE_BET") this.placeBet(player, command.amount ?? 0);
    else if (command.type === "CALL") await this.call(player);
    else if (command.type === "ALL_IN") await this.allIn(player);
    else if (command.type === "FOLD") await this.fold(player);
    else if (command.type === "NEXT_ROUND") await this.nextRound(player);
    else if (command.type === "HIT") await this.hit(player);
    else if (command.type === "HIT_PREVIEW") await this.previewHit(player);
    else if (command.type === "HIT_COMMIT") await this.commitHit(player);
    else if (command.type === "STAND") await this.stand(player);
    await this.advanceBots();
  }

  private async join(clientId: string, token?: string | null) {
    const table = this.table!;
    if (this.playerFor(clientId)) return;
    const seat = table.players.find((player) => player.clientId === null);
    if (!seat) { table.message = "牌桌座位已满，你正在观战。"; return; }
    if (!token) { table.message = "请先登录后再入座。"; return; }
    const user = await this.env.blackjack_users.prepare("SELECT u.id, u.display_name AS displayName, u.avatar_data AS avatarData, u.bankroll FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").bind(await digest(token), Date.now()).first<{ id: string; displayName: string; avatarData: string | null; bankroll: number }>();
    if (!user) { table.message = "登录已过期，请重新登录。"; return; }
    seat.clientId = clientId; seat.userId = user.id; seat.name = user.displayName; seat.avatarData = user.avatarData; seat.bankroll = user.bankroll; seat.isBot = false;
    if (table.players.every((player) => player.clientId)) {
      table.status = "betting";
      table.bettingPlayerId = table.players[Math.floor(Math.random() * 2)].id;
      table.currentBet = 0;
      table.message = `随机选择 ${this.byId(table.bettingPlayerId)!.name} 先下底注。`;
    } else {
      table.status = "waiting";
      table.message = "等待一名玩家进入房间。";
    }
  }

  private async leave(player: Player) {
    await this.persistPlayerBankroll(player);
    this.resetSeat(player);
    if (!this.table!.players.some((seat) => seat.clientId && !seat.isBot)) {
      for (const seat of this.table!.players) if (seat.isBot) this.resetSeat(seat);
    }
    Object.assign(this.table!, { status: "waiting", bettingPlayerId: null, currentBet: 0, revealedPlayerId: null, nextRoundReadyPlayerIds: [], message: this.waitingMessage() });
    void this.setTurn(null);
  }

  private resetSeat(player: Player) {
    Object.assign(player, {
      clientId: null, isBot: false, name: DEFAULT_PLAYER_NAMES[player.seatIndex], avatarData: null,
      userId: null, bankroll: CHIP_START, bet: 0, requestedBet: 0, hand: [], hasStood: false, isBusted: false,
    });
  }

  private async persistPlayerBankroll(player: Player) {
    if (player.userId && !player.isBot) await this.env.blackjack_users.prepare("UPDATE users SET bankroll=? WHERE id=?").bind(player.bankroll, player.userId).run();
  }

  private async persistAllPlayerBankrolls() {
    await Promise.all(this.table!.players.map((player) => this.persistPlayerBankroll(player)));
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
    Object.assign(seat, { clientId: `${BOT_CLIENT_PREFIX}${seat.id}`, isBot: true, name: "人机", avatarData: null });
    table.status = "betting";
    table.bettingPlayerId = table.players[Math.floor(Math.random() * 2)].id;
    table.currentBet = 0;
    table.message = `${this.byId(table.bettingPlayerId)!.name} 先下底注。`;
  }

  private async advanceBots() {
    const table = this.table!;
    for (let step = 0; step < 12; step++) {
      const bettingBot = table.status === "betting" ? this.byId(table.bettingPlayerId) : null;
      if (bettingBot?.isBot) {
        if (table.currentBet === 0) this.placeBet(bettingBot, Math.min(100, bettingBot.bankroll));
        else if (table.currentBet <= bettingBot.bankroll) await this.call(bettingBot);
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

  private placeBet(player: Player, amount: number) {
    const table = this.table!;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id) return;
    if (amount <= 0 || amount > player.bankroll || (table.currentBet && amount <= table.currentBet)) { table.message = "请输入有效且更高的下注金额。"; return; }
    player.requestedBet = amount; table.currentBet = amount; const other = this.other(player); table.bettingPlayerId = other.id;
    table.message = `${player.name} ${other.requestedBet ? "加注到" : "下了底注"} ${amount} $，轮到 ${other.name} 跟注、加注或退出。`;
  }

  private async call(player: Player) {
    const table = this.table!;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id || !table.currentBet || table.currentBet > player.bankroll) return;
    player.requestedBet = table.currentBet; await this.startRound(this.other(player), player);
  }

  private async allIn(player: Player) {
    const table = this.table!;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id || !table.currentBet || player.bankroll >= table.currentBet) return;
    player.requestedBet = player.bankroll; table.currentBet = player.bankroll; await this.startRound(this.other(player), player);
  }

  private async fold(player: Player) {
    const table = this.table!;
    if (table.status !== "betting" || table.bettingPlayerId !== player.id) return;
    await this.finish(this.other(player).id, `${player.name} 选择退出，对方获胜。`);
  }

  private async startRound(first: Player, revealed: Player) {
    const table = this.table!;
    if (table.deck.length < 2) table.deck = deck();
    for (const player of table.players) Object.assign(player, { bankroll: player.bankroll - table.currentBet, bet: table.currentBet, requestedBet: 0, hand: [table.deck.pop()!], hasStood: false, isBusted: false });
    await this.persistAllPlayerBankrolls();
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
    table.bettingPlayerId = table.players[Math.floor(Math.random() * 2)].id;
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
    if (value(player.hand) > 21) { player.isBusted = true; player.hasStood = true; await this.finish(this.other(player).id, `${player.name} 爆牌，另一方获胜。`); return; }
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
    if (winnerId) this.byId(winnerId)!.bankroll += pot; else for (const player of table.players) player.bankroll += player.bet;
    await this.persistAllPlayerBankrolls();
    Object.assign(table, { status: "finished", winnerId, message }); await this.setTurn(null);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (url.pathname === "/health") return response({ status: "ok" });
    if (url.pathname === "/api/auth/me" || url.pathname === "/api/auth/profile" || url.pathname === "/api/auth/login" || url.pathname === "/api/auth/register" || url.pathname === "/api/auth/claim-bankroll") return authApi(request, env, url.pathname);
    const match = url.pathname.match(/^\/(?:api\/)?tables\/([^/]+)\/(state|command)$/) ?? url.pathname.match(/^\/ws\/tables\/([^/]+)$/);
    if (!match) return new Response("Not found", { status: 404 });
    const tableId = decodeURIComponent(match[1]);
    if (!new RegExp(`^table-[1-${OPEN_TABLE_LIMIT}]$`).test(tableId)) {
      return Response.json({ message: "该牌桌尚未开放。" }, { status: 403 });
    }
    const stub = env.BLACKJACK_TABLE.get(env.BLACKJACK_TABLE.idFromName(tableId));
    const isWebSocket = url.pathname.startsWith("/ws/");
    const destination = isWebSocket ? "/ws" : url.pathname.endsWith("/state") ? "/state" : "/command";
    return stub.fetch(new Request(`https://table.internal${destination}${url.search}`, request));
  },
} satisfies ExportedHandler<Env>;
