import assert from "node:assert/strict";
import test from "node:test";
import {MainlandBlackjackEngine, blackjackRules} from "./blackjack-engine.mjs";

test("mainland deck uses 40 unique cards", () => {
    const deck = blackjackRules.freshDeck();
    assert.equal(deck.length, 40);
    assert.equal(new Set(deck.map(card => card.id)).size, 40);
});

test("mainland engine owns a complete two-player round", async () => {
    const tickets = new Map([
        ["ticket-a", {id: "user-a", displayName: "Alice", bankroll: 500}],
        ["ticket-b", {id: "user-b", displayName: "Bob", bankroll: 500}]
    ]);
    const balances = new Map();
    const eventsA = [];
    const eventsB = [];
    const engine = new MainlandBlackjackEngine({
        consumeTicket: async ticket => {
            const user = tickets.get(ticket) || null;
            tickets.delete(ticket);
            return user;
        },
        updateBankroll: async (userId, bankroll) => balances.set(userId, bankroll)
    });
    engine.addConnection("table-1", "client-a", event => eventsA.push(event));
    engine.addConnection("table-1", "client-b", event => eventsB.push(event));

    await engine.command("table-1", "client-a", {type: "SIT_DOWN", commandId: "sit-down-a"}, "ticket-a");
    await engine.command("table-1", "client-b", {type: "SIT_DOWN", commandId: "sit-down-b"}, "ticket-b");
    let stateA = engine.stateFor("table-1", "client-a");
    assert.equal(stateA.authority, "tencent");
    assert.equal(stateA.status, "betting");
    assert.equal(stateA.viewerPlayerId, "player-a");

    const firstClient = stateA.bettingPlayerId === "player-a" ? "client-a" : "client-b";
    const secondClient = firstClient === "client-a" ? "client-b" : "client-a";
    await engine.command("table-1", firstClient, {type: "PLACE_BET", amount: 20, commandId: "place-bet-20"});
    await engine.command("table-1", firstClient, {type: "PLACE_BET", amount: 20, commandId: "place-bet-20"});
    await engine.command("table-1", secondClient, {type: "CALL", commandId: "call-bet-20"});

    stateA = engine.stateFor("table-1", "client-a");
    const stateB = engine.stateFor("table-1", "client-b");
    assert.equal(stateA.status, "playing");
    assert.equal(stateA.players[0].hand.length, 1);
    assert.equal(stateA.players[1].hand.length + stateA.players[1].hiddenCardCount, 1);
    assert.equal(stateB.players[0].hand.length, 1);
    assert.equal(stateB.players[1].hand.length + stateB.players[1].hiddenCardCount, 1);
    assert.equal(stateA.deckCount, 38);
    assert.equal(balances.get("user-a"), 480);
    assert.equal(balances.get("user-b"), 480);
    assert.ok(eventsA.some(event => event.type === "TABLE_STATE"));
    assert.ok(eventsB.some(event => event.type === "TABLE_STATE"));
});

test("mainland engine rejects unopened tables and expired tickets", async () => {
    const engine = new MainlandBlackjackEngine();
    assert.throws(() => engine.stateFor("table-20", "client-a"), /尚未开放/);
    const state = await engine.command("table-1", "client-a", {type: "SIT_DOWN", commandId: "expired-ticket"}, "missing");
    assert.equal(state.viewerPlayerId, null);
    assert.match(state.message, /登录凭证已过期/);
});

test("mainland engine refills an empty deck without losing bets and does not auto-stand on 21", async () => {
    const engine = new MainlandBlackjackEngine();
    const table = engine.getTable("table-1");
    const [a, b] = table.players;
    Object.assign(a, {clientId: "client-a", bankroll: 480, bet: 20, hand: [{id: "10-hearts", rank: "10", suit: "hearts"}], hasStood: false});
    Object.assign(b, {clientId: "client-b", bankroll: 480, bet: 20, hand: [{id: "9-spades", rank: "9", suit: "spades"}], hasStood: false});
    Object.assign(table, {status: "playing", activePlayerId: a.id, deck: [], turnDeadline: null});

    engine.refillDuringRound(table);
    const aceIndex = table.deck.findIndex(card => card.id === "A-clubs");
    table.deck.push(table.deck.splice(aceIndex, 1)[0]);
    await engine.hit(table, a);

    assert.equal(a.bankroll, 480);
    assert.equal(b.bankroll, 480);
    assert.equal(a.bet, 20);
    assert.equal(a.hasStood, false);
    assert.equal(table.status, "playing");
    assert.equal(table.activePlayerId, b.id);
    assert.ok(table.deck.length > 0);
});
