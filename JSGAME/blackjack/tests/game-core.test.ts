import test from "node:test";
import assert from "node:assert/strict";

import { calculateRaise, calculateShortAllIn } from "../game/economy/betting.ts";
import { compareHands, handValue, isNaturalBlackjack } from "../game/data/cards.ts";

const card = (rank: "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10") => ({ id: rank, rank, suit: "spades" as const });

test("Ace value falls from 11 to 1 without making a hand bust", () => {
  assert.equal(handValue([card("A"), card("A"), card("9")]), 21);
  assert.equal(handValue([card("A"), card("10"), card("10")]), 21);
});

test("only a two-card 21 is a natural blackjack", () => {
  assert.equal(isNaturalBlackjack([card("A"), card("10")]), true);
  assert.equal(isNaturalBlackjack([card("7"), card("7"), card("7")]), false);
});

test("equal totals are decided by the highest cards with Ace high", () => {
  assert.equal(compareHands([card("2"), card("A"), card("5")], [card("6"), card("9"), card("3")]), 1);
  assert.equal(compareHands([card("9"), card("6"), card("3")], [card("2"), card("A"), card("5")]), -1);
  assert.equal(compareHands([card("A"), card("5"), card("2")], [card("2"), card("5"), card("A")]), 0);
});

test("a raise commits only the amount not already in the pot", () => {
  assert.deepEqual(calculateRaise(90, 10, 20, 30), { target: 30, delta: 20 });
  assert.equal(calculateRaise(10, 10, 20, 30), null);
  assert.equal(calculateRaise(100, 10, 20, 20), null);
});

test("short all-in refunds the unmatched part of the opponent bet", () => {
  assert.deepEqual(calculateShortAllIn(15, 5, 40), { matchedTotal: 20, uncalledRefund: 20 });
});
