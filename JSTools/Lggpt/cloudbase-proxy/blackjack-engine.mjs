import { randomInt, randomUUID } from "node:crypto";

const CHIP_START = 500;
const BOT_BANKROLL = Number.MAX_SAFE_INTEGER;
const TURN_LIMIT_MS = 60_000;
const OPEN_TABLE_LIMIT = 5;
const BOT_CLIENT_PREFIX = "bot:";
const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

function freshDeck() {
    const cards = suits.flatMap(suit => ranks.map(rank => ({id: `${rank}-${suit}`, rank, suit})));
    for(let index = cards.length - 1; index > 0; index--) {
        const other = randomInt(index + 1);
        [cards[index], cards[other]] = [cards[other], cards[index]];
    }
    return cards;
}

function handValue(hand) {
    let total = hand.reduce((sum, card) => sum + (card.rank === "A" ? 11 : Number(card.rank)), 0);
    let aces = hand.filter(card => card.rank === "A").length;
    while(total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return total;
}

function compareHands(left, right) {
    const totalDifference = handValue(left) - handValue(right);
    if(totalDifference) return Math.sign(totalDifference);
    const leftRanks = left.map(card => card.rank === "A" ? 11 : Number(card.rank)).sort((a, b) => b - a);
    const rightRanks = right.map(card => card.rank === "A" ? 11 : Number(card.rank)).sort((a, b) => b - a);
    for(let index = 0; index < Math.max(leftRanks.length, rightRanks.length); index++) {
        const difference = (leftRanks[index] || 0) - (rightRanks[index] || 0);
        if(difference) return Math.sign(difference);
    }
    return 0;
}

function newPlayer(id, name, seatIndex) {
    return {
        id, name, seatIndex, avatarData: null, userId: null, clientId: null, isBot: false,
        bankroll: CHIP_START, bet: 0, requestedBet: 0, hand: [], hasStood: false, isBusted: false
    };
}

function initialTable(tableId) {
    return {
        tableId,
        players: [newPlayer("player-a", "玩家 A", 0), newPlayer("player-b", "玩家 B", 1)],
        deck: freshDeck(), status: "waiting", activePlayerId: null, bettingPlayerId: null,
        currentBet: 0, revealedPlayerId: null, nextRoundReadyPlayerIds: [], pendingHitPlayerId: null,
        winnerId: null, message: "等待两名玩家进入房间。", round: 1, turnDeadline: null,
        processedCommands: new Set(), turnTimer: null
    };
}

function validTableId(tableId) {
    const match = /^table-(\d+)$/.exec(tableId);
    return Boolean(match && Number(match[1]) >= 1 && Number(match[1]) <= OPEN_TABLE_LIMIT);
}

function calculateRaise(available, committed, currentBet, target) {
    if(![available, committed, currentBet, target].every(Number.isSafeInteger)) return null;
    if(available < 0 || committed < 0 || currentBet < 0 || target <= currentBet || target < committed) return null;
    const delta = target - committed;
    return delta <= available ? {target, delta} : null;
}

export class MainlandBlackjackEngine {
    constructor({consumeTicket, updateBankroll, onStateChange} = {}) {
        this.tables = new Map();
        this.connections = new Map();
        this.consumeTicket = consumeTicket || (async () => null);
        this.updateBankroll = updateBankroll || (async () => undefined);
        this.onStateChange = onStateChange || (async () => undefined);
    }

    isValidTable(tableId) { return validTableId(tableId); }

    getTable(tableId) {
        if(!validTableId(tableId)) throw Object.assign(new Error("该牌桌尚未开放。"), {status: 403});
        if(!this.tables.has(tableId)) this.tables.set(tableId, initialTable(tableId));
        return this.tables.get(tableId);
    }

    stateFor(tableId, clientId = null) {
        const table = this.getTable(tableId);
        const viewer = clientId ? this.playerFor(table, clientId) : null;
        const ordered = viewer ? [viewer, this.other(table, viewer)] : table.players;
        return {
            players: ordered.map(player => {
                const canSee = viewer?.id === player.id || table.status === "finished";
                const cards = canSee ? player.hand : player.id === table.revealedPlayerId ? player.hand.slice(0, 1) : [];
                return {
                    id: player.id, name: player.name, avatarData: player.avatarData, isBot: Boolean(player.isBot),
                    seatIndex: player.seatIndex, hand: cards, hiddenCardCount: canSee ? 0 : Math.max(0, player.hand.length - cards.length),
                    hasStood: player.hasStood, isBusted: player.isBusted,
                    bankroll: player.isBot ? CHIP_START : player.bankroll,
                    bet: player.bet, requestedBet: player.requestedBet
                };
            }),
            viewerPlayerId: viewer?.id || null, activePlayerId: table.activePlayerId,
            bettingPlayerId: table.bettingPlayerId, currentBet: table.currentBet,
            revealedPlayerId: table.revealedPlayerId,
            nextRoundConfirmations: table.nextRoundReadyPlayerIds.length,
            nextRoundConfirmed: Boolean(viewer && table.nextRoundReadyPlayerIds.includes(viewer.id)),
            turnSecondsRemaining: table.turnDeadline ? Math.max(0, Math.ceil((table.turnDeadline - Date.now()) / 1000)) : 0,
            status: table.status, message: table.message, round: table.round,
            deckCount: table.deck.length, winnerId: table.winnerId, authority: "tencent"
        };
    }

    addConnection(tableId, clientId, send) {
        this.getTable(tableId);
        const tableConnections = this.connections.get(tableId) || new Set();
        const connection = {clientId, send};
        tableConnections.add(connection);
        this.connections.set(tableId, tableConnections);
        send({type: "JOINED", payload: {tableId, clientId, playerId: this.playerFor(this.getTable(tableId), clientId)?.id || null, authority: "tencent"}});
        this.broadcast(tableId);
        return () => {
            tableConnections.delete(connection);
            if(!tableConnections.size) this.connections.delete(tableId);
            windowlessTimeout(() => this.disconnectIfGone(tableId, clientId), 8_000);
        };
    }

    disconnectIfGone(tableId, clientId) {
        const hasReplacement = [...(this.connections.get(tableId) || [])].some(connection => connection.clientId === clientId);
        if(hasReplacement) return;
        const table = this.getTable(tableId);
        const player = this.playerFor(table, clientId);
        if(!player) return;
        this.leave(table, player).then(() => this.commit(table));
    }

    async command(tableId, clientId, command, ticket = null) {
        const table = this.getTable(tableId);
        if(!command || typeof command.type !== "string") throw Object.assign(new Error("无效的游戏命令。"), {status: 400});
        const commandId = typeof command.commandId === "string" ? command.commandId.slice(0, 100) : randomUUID();
        const dedupeKey = `${clientId}:${commandId}`;
        if(table.processedCommands.has(dedupeKey)) return this.stateFor(tableId, clientId);
        table.processedCommands.add(dedupeKey);
        if(table.processedCommands.size > 256) table.processedCommands.delete(table.processedCommands.values().next().value);

        if(command.type === "SIT_DOWN") await this.join(table, clientId, ticket);
        else if(command.type === "LEAVE_SEAT") {
            const player = this.playerFor(table, clientId);
            if(player) await this.leave(table, player);
        } else {
            const player = this.playerFor(table, clientId);
            if(!player) table.message = "请先点击坐下。";
            else if(command.type === "CALL_BOT") await this.callBot(table, player);
            else if(command.type === "PLACE_BET") await this.placeBet(table, player, command.amount);
            else if(command.type === "CALL") await this.call(table, player);
            else if(command.type === "ALL_IN") await this.allIn(table, player);
            else if(command.type === "FOLD") await this.fold(table, player);
            else if(command.type === "NEXT_ROUND") await this.nextRound(table, player);
            else if(command.type === "HIT") await this.hit(table, player);
            else if(command.type === "HIT_PREVIEW") await this.previewHit(table, player);
            else if(command.type === "HIT_COMMIT") await this.commitHit(table, player);
            else if(command.type === "STAND") await this.stand(table, player);
        }
        await this.advanceBots(table);
        await this.commit(table);
        return this.stateFor(tableId, clientId);
    }

    async commit(table) {
        await this.onStateChange(table.tableId, this.serializableState(table));
        this.broadcast(table.tableId);
    }

    serializableState(table) {
        return JSON.parse(JSON.stringify({...table, processedCommands: undefined, turnTimer: undefined}));
    }

    broadcast(tableId) {
        for(const connection of this.connections.get(tableId) || []) {
            try { connection.send({type: "TABLE_STATE", payload: this.stateFor(tableId, connection.clientId)}); }
            catch { /* The WebSocket close handler removes stale connections. */ }
        }
    }

    playerFor(table, clientId) { return table.players.find(player => player.clientId === clientId) || null; }
    playerForUser(table, userId) { return table.players.find(player => player.userId === userId) || null; }
    byId(table, playerId) { return table.players.find(player => player.id === playerId) || null; }
    other(table, player) { return table.players.find(item => item.id !== player.id); }

    async join(table, clientId, ticket) {
        if(this.playerFor(table, clientId)) return;
        const user = ticket ? await this.consumeTicket(ticket) : null;
        if(!user) { table.message = "登录凭证已过期，请返回大厅后重试。"; return; }
        const existing = this.playerForUser(table, user.id);
        if(existing) { existing.clientId = clientId; existing.bankroll = user.bankroll; return; }
        const seat = table.players.find(player => player.clientId === null);
        if(!seat) { table.message = "牌桌座位已满，你正在观战。"; return; }
        Object.assign(seat, {
            clientId, userId: user.id, name: user.displayName || "GAO 玩家", avatarData: user.avatarData || null,
            bankroll: Number.isSafeInteger(user.bankroll) ? user.bankroll : CHIP_START, isBot: false
        });
        if(table.players.every(player => player.clientId)) {
            table.status = "betting";
            table.bettingPlayerId = table.players[randomInt(table.players.length)].id;
            table.currentBet = 0;
            table.message = `随机选择 ${this.byId(table, table.bettingPlayerId).name} 先下底注。`;
        } else {
            table.status = "waiting";
            table.message = "等待一名玩家进入房间。";
        }
    }

    resetSeat(player) {
        Object.assign(player, {
            clientId: null, userId: null, isBot: false, name: player.seatIndex === 0 ? "玩家 A" : "玩家 B",
            avatarData: null, bankroll: CHIP_START, bet: 0, requestedBet: 0, hand: [], hasStood: false, isBusted: false
        });
    }

    async leave(table, player) {
        if((table.status === "betting" || table.status === "playing") && table.players.some(seat => seat.bet > 0)) {
            await this.finish(table, this.other(table, player).id, `${player.name} 离开牌桌，对方获得底池。`);
        }
        this.resetSeat(player);
        if(!table.players.some(seat => seat.clientId && !seat.isBot)) {
            for(const seat of table.players) if(seat.isBot) this.resetSeat(seat);
        }
        Object.assign(table, {
            status: "waiting", activePlayerId: null, bettingPlayerId: null, currentBet: 0,
            revealedPlayerId: null, nextRoundReadyPlayerIds: [], pendingHitPlayerId: null,
            turnDeadline: null, message: table.players.some(seat => seat.clientId) ? "等待一名玩家进入房间。" : "等待两名玩家进入房间。"
        });
        this.clearTurnTimer(table);
    }

    async changeWallet(player, amount) {
        if(!Number.isSafeInteger(amount) || amount === 0 || player.isBot) return;
        const next = player.bankroll + amount;
        if(next < 0) throw new Error("赌资不足。");
        player.bankroll = next;
        if(player.userId) await this.updateBankroll(player.userId, next);
    }

    async callBot(table, player) {
        if(table.status !== "waiting" || player.isBot) return;
        const seat = table.players.find(item => item.clientId === null);
        if(!seat) return;
        Object.assign(seat, {clientId: `${BOT_CLIENT_PREFIX}${seat.id}`, isBot: true, name: "人机", avatarData: null, bankroll: BOT_BANKROLL});
        table.status = "betting";
        table.bettingPlayerId = table.players[randomInt(table.players.length)].id;
        table.message = `${this.byId(table, table.bettingPlayerId).name} 先下底注。`;
    }

    async advanceBots(table) {
        for(let step = 0; step < 12; step++) {
            const bettingBot = table.status === "betting" ? this.byId(table, table.bettingPlayerId) : null;
            if(bettingBot?.isBot) {
                if(table.currentBet === 0) await this.placeBet(table, bettingBot, 100);
                else await this.call(table, bettingBot);
                continue;
            }
            const activeBot = table.status === "playing" ? this.byId(table, table.activePlayerId) : null;
            if(activeBot?.isBot) {
                if(handValue(activeBot.hand) < 17 && table.deck.length) await this.hit(table, activeBot);
                else await this.stand(table, activeBot);
                continue;
            }
            if(table.status === "finished" || table.status === "deck-empty") {
                const bot = table.players.find(item => item.isBot);
                if(bot && !table.nextRoundReadyPlayerIds.includes(bot.id)) { await this.nextRound(table, bot); continue; }
            }
            break;
        }
    }

    async placeBet(table, player, amount) {
        if(table.status !== "betting" || table.bettingPlayerId !== player.id) return;
        const commit = calculateRaise(player.bankroll, player.bet, table.currentBet, Number(amount));
        if(!commit) { table.message = "请输入有效且更高的下注金额。"; return; }
        await this.changeWallet(player, -commit.delta);
        player.bet = Number(amount); player.requestedBet = Number(amount);
        table.currentBet = Number(amount);
        const other = this.other(table, player);
        table.bettingPlayerId = other.id;
        table.message = `${player.name} 下注 ${amount} $，轮到 ${other.name}。`;
    }

    async call(table, player) {
        const delta = table.currentBet - player.bet;
        if(table.status !== "betting" || table.bettingPlayerId !== player.id || !table.currentBet || delta > player.bankroll) return;
        await this.changeWallet(player, -delta);
        player.bet = table.currentBet; player.requestedBet = table.currentBet;
        await this.startRound(table, this.other(table, player), player);
    }

    async allIn(table, player) {
        const callDelta = table.currentBet - player.bet;
        if(table.status !== "betting" || table.bettingPlayerId !== player.id || !table.currentBet || player.bankroll >= callDelta || player.bankroll <= 0) return;
        const available = player.bankroll;
        const matchedTotal = available + player.bet;
        const opponent = this.other(table, player);
        const refund = Math.max(0, opponent.bet - matchedTotal);
        await this.changeWallet(player, -available);
        player.bet = matchedTotal; player.requestedBet = matchedTotal;
        if(refund) {
            opponent.bet -= refund; opponent.requestedBet = opponent.bet;
            await this.changeWallet(opponent, refund);
        }
        table.currentBet = matchedTotal;
        await this.startRound(table, opponent, player);
    }

    async fold(table, player) {
        if(table.status === "betting" && table.bettingPlayerId === player.id)
            await this.finish(table, this.other(table, player).id, `${player.name} 选择退出，对方获胜。`);
    }

    async startRound(table, first, revealed) {
        if(table.deck.length < 2) table.deck = freshDeck();
        for(const player of table.players) Object.assign(player, {requestedBet: 0, hand: [table.deck.pop()], hasStood: false, isBusted: false});
        Object.assign(table, {
            status: "playing", bettingPlayerId: null, currentBet: 0, revealedPlayerId: revealed.id,
            pendingHitPlayerId: null, winnerId: null, message: `${revealed.name} 跟注成功，${first.name} 先行动。`
        });
        this.setTurn(table, first.id);
    }

    async nextRound(table, player) {
        if(table.status !== "finished" && table.status !== "deck-empty") return;
        if(!table.nextRoundReadyPlayerIds.includes(player.id)) table.nextRoundReadyPlayerIds.push(player.id);
        if(table.nextRoundReadyPlayerIds.length < 2) { table.message = `等待另一位玩家确认下一局（${table.nextRoundReadyPlayerIds.length}/2）。`; return; }
        if(table.deck.length < 2) table.deck = freshDeck();
        for(const seated of table.players) Object.assign(seated, {bet: 0, requestedBet: 0, hand: [], hasStood: false, isBusted: false});
        Object.assign(table, {
            status: "betting", winnerId: null, pendingHitPlayerId: null, currentBet: 0,
            revealedPlayerId: null, nextRoundReadyPlayerIds: [], round: table.round + 1
        });
        table.bettingPlayerId = table.players[randomInt(table.players.length)].id;
        table.message = `随机选择 ${this.byId(table, table.bettingPlayerId).name} 先下底注。`;
        this.setTurn(table, null);
    }

    async hit(table, player) {
        if(table.status !== "playing" || table.activePlayerId !== player.id) return;
        if(!table.deck.length) { table.status = "deck-empty"; table.message = "牌堆已用尽，请重新洗牌。"; this.setTurn(table, null); return; }
        player.hand.push(table.deck.pop());
        await this.resolveHit(table, player);
    }

    async previewHit(table, player) {
        if(table.status !== "playing" || table.activePlayerId !== player.id || table.pendingHitPlayerId) return;
        if(!table.deck.length) { table.status = "deck-empty"; table.message = "牌堆已用尽，请重新洗牌。"; this.setTurn(table, null); return; }
        player.hand.push(table.deck.pop());
        table.pendingHitPlayerId = player.id;
        table.message = `${player.name} 正在摸牌…`;
    }

    async commitHit(table, player) {
        if(table.status !== "playing" || table.activePlayerId !== player.id || table.pendingHitPlayerId !== player.id) return;
        table.pendingHitPlayerId = null;
        await this.resolveHit(table, player);
    }

    async resolveHit(table, player) {
        const score = handValue(player.hand);
        if(score > 21) { player.isBusted = true; player.hasStood = true; await this.finish(table, this.other(table, player).id, `${player.name} 爆牌，另一方获胜。`); return; }
        if(score === 21) { player.hasStood = true; await this.nextTurn(table, player, `${player.name} 达到 21 点，自动停牌。`); return; }
        if(player.hand.length >= 5) player.hasStood = true;
        await this.nextTurn(table, player, player.hasStood ? `${player.name} 已有五张牌，自动停牌。` : undefined);
    }

    async stand(table, player) {
        if(table.status !== "playing" || table.activePlayerId !== player.id) return;
        player.hasStood = true;
        await this.nextTurn(table, player, `${player.name} 选择停牌。`);
    }

    async nextTurn(table, previous, message) {
        const other = this.other(table, previous);
        if(!other.hasStood) { this.setTurn(table, other.id); table.message = message ? `${message} 轮到 ${other.name}。` : `轮到 ${other.name}。`; }
        else if(!previous.hasStood) { this.setTurn(table, previous.id); table.message = `轮到 ${previous.name}。`; }
        else await this.resolveRound(table);
    }

    async resolveRound(table) {
        const comparison = compareHands(table.players[0].hand, table.players[1].hand);
        const winnerId = comparison === 0 ? null : comparison > 0 ? table.players[0].id : table.players[1].id;
        await this.finish(table, winnerId, winnerId ? `${this.byId(table, winnerId).name} 获胜。` : "本局点数与牌面相同，平局。");
    }

    async finish(table, winnerId, message) {
        const pot = table.players.reduce((sum, player) => sum + player.bet, 0);
        if(winnerId) await this.changeWallet(this.byId(table, winnerId), pot);
        else for(const player of table.players) if(player.bet) await this.changeWallet(player, player.bet);
        Object.assign(table, {status: "finished", winnerId, message, pendingHitPlayerId: null});
        this.setTurn(table, null);
    }

    clearTurnTimer(table) {
        if(table.turnTimer) clearTimeout(table.turnTimer);
        table.turnTimer = null;
    }

    setTurn(table, playerId) {
        this.clearTurnTimer(table);
        table.activePlayerId = playerId;
        table.turnDeadline = playerId ? Date.now() + TURN_LIMIT_MS : null;
        if(!playerId) return;
        table.turnTimer = windowlessTimeout(async () => {
            if(table.activePlayerId !== playerId || table.status !== "playing") return;
            const player = this.byId(table, playerId);
            if(!player) return;
            player.hasStood = true;
            await this.nextTurn(table, player, `${player.name} 行动超时，自动停牌。`);
            await this.advanceBots(table);
            await this.commit(table);
        }, TURN_LIMIT_MS + 25);
    }
}

function windowlessTimeout(callback, delay) {
    const timer = setTimeout(callback, delay);
    timer.unref?.();
    return timer;
}

export const blackjackRules = {freshDeck, handValue, compareHands, calculateRaise};
