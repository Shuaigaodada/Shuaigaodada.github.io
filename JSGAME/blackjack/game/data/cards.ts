import type { PlayingCard, Rank, Suit } from "../contracts/types";

const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export function createDeck(): PlayingCard[] {
  const deck = suits.flatMap((suit) =>
    ranks.map((rank) => ({ id: `${rank}-${suit}`, rank, suit })),
  );
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
  }
  return deck;
}

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
