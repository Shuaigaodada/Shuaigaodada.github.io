export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";

export interface PlayingCard {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface Player {
  id: string;
  name: string;
  avatarData?: string | null;
  isBot?: boolean;
  seatIndex: 0 | 1;
  hand: PlayingCard[];
  hasStood: boolean;
  isBusted: boolean;
  bankroll: number;
  bet: number;
  requestedBet: number;
}

export type RoundStatus = "waiting" | "betting" | "playing" | "showdown" | "finished" | "deck-empty";

export interface GameState {
  players: [Player, Player];
  activePlayerId: string | null;
  bettingPlayerId: string | null;
  currentBet: number;
  revealedPlayerId: string | null;
  viewerPlayerId: string | null;
  nextRoundConfirmations: number;
  nextRoundConfirmed: boolean;
  turnSecondsRemaining: number;
  status: RoundStatus;
  message: string;
  round: number;
  deck: PlayingCard[];
  winnerId: string | null;
}

export type GameCommand =
  | { type: "SIT_DOWN" }
  | { type: "LEAVE_SEAT" }
  | { type: "READY" }
  | { type: "HIT" }
  | { type: "HIT_PREVIEW" }
  | { type: "HIT_COMMIT" }
  | { type: "STAND" }
  | { type: "PLACE_BET"; amount: number }
  | { type: "CALL" }
  | { type: "ALL_IN" }
  | { type: "FOLD" }
  | { type: "NEXT_ROUND" }
  | { type: "CALL_BOT" };

export type GameEvent =
  | { type: "ROUND_STARTED" }
  | { type: "CARD_DEALT"; playerId: string }
  | { type: "TURN_CHANGED"; playerId: string }
  | { type: "PLAYER_STOOD"; playerId: string }
  | { type: "PLAYER_BUSTED"; playerId: string }
  | { type: "ROUND_ENDED"; winnerId: string | null }
  | { type: "ERROR"; message: string };

export interface GameGateway {
  readonly mode: "local" | "remote";
  getState(): GameState;
  sendAction(action: GameCommand["type"], amount?: number): void;
  subscribe(listener: (state: GameState) => void): () => void;
}
