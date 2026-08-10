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
