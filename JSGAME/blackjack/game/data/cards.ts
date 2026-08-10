import type { PlayingCard } from "../contracts/types";

export function cardValue(card: PlayingCard): number {
  if (card.rank === "A") return 11;
  return Number(card.rank);
}

export function handValue(cards: PlayingCard[]): number {
  let value = cards.reduce((total, card) => total + cardValue(card), 0);
  let aces = cards.filter((card) => card.rank === "A").length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
}

export function isNaturalBlackjack(cards: PlayingCard[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

export function compareHands(left: PlayingCard[], right: PlayingCard[]): number {
  const totalDifference = handValue(left) - handValue(right);
  if (totalDifference !== 0) return Math.sign(totalDifference);

  const leftRanks = left.map(cardValue).sort((a, b) => b - a);
  const rightRanks = right.map(cardValue).sort((a, b) => b - a);
  const comparedLength = Math.max(leftRanks.length, rightRanks.length);
  for (let index = 0; index < comparedLength; index += 1) {
    const rankDifference = (leftRanks[index] ?? 0) - (rightRanks[index] ?? 0);
    if (rankDifference !== 0) return Math.sign(rankDifference);
  }
  return 0;
}
