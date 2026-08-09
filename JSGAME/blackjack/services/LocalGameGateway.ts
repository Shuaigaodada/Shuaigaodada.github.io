import { createDeck, handValue } from "../game/data/cards";
import type { GameCommand, GameGateway, GameState, Player, PlayingCard } from "../game/contracts/types";

const draw = (deck: PlayingCard[]) => deck.shift()!;
const INITIAL_BANKROLL = 500;

function createPlayer(id: string, name: string, seatIndex: 0 | 1): Player {
  return { id, name, seatIndex, hand: [], hasStood: false, isBusted: false, bankroll: INITIAL_BANKROLL, bet: 0, requestedBet: 0 };
}

function createInitialState(): GameState {
  return {
    players: [createPlayer("player-a", "玩家 A", 0), createPlayer("player-b", "玩家 B", 1)],
    activePlayerId: null,
    bettingPlayerId: null,
    currentBet: 0,
    revealedPlayerId: null,
  viewerPlayerId: null,
  nextRoundConfirmations: 0,
  nextRoundConfirmed: false,
  turnSecondsRemaining: 0,
    status: "betting",
    message: "请选择筹码并确认下注。",
    round: 1,
    deck: createDeck(),
    winnerId: null,
  };
}

export class LocalGameGateway implements GameGateway {
  readonly mode = "local" as const;
  private state = createInitialState();
  private listeners = new Set<(state: GameState) => void>();

  getState = () => this.state;

  subscribe = (listener: (state: GameState) => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  sendAction = (action: GameCommand["type"], amount?: number) => {
    if (action === "PLACE_BET") this.placeBet(amount ?? 0);
    else if (action === "NEXT_ROUND") this.nextRound();
    else if (this.state.status === "playing") {
      if (action === "HIT") this.hit();
      if (action === "STAND") this.stand();
      if (action === "DOUBLE") this.notify("Double 规则尚未确定，当前为演示按钮。");
    }
  };

  private placeBet(amount: number) {
    if (this.state.status !== "betting") return;
    const [a, b] = this.state.players;
    if (!Number.isInteger(amount) || amount <= 0) return this.notify("请至少下注一枚筹码。");
    if (amount > a.bankroll || amount > b.bankroll) return this.notify("双方赌资不足，无法匹配这笔下注。");
    if (this.state.deck.length < 2) return this.deckEmpty();
    a.bankroll -= amount;
    b.bankroll -= amount;
    a.bet = amount;
    b.bet = amount;
    a.hand = [draw(this.state.deck)];
    b.hand = [draw(this.state.deck)];
    this.state = { ...this.state, activePlayerId: a.id, status: "playing", message: "玩家 A 先行动。", winnerId: null };
    this.emit();
  }

  private nextRound() {
    if (this.state.status !== "finished") return;
    if (this.state.deck.length < 2) return this.deckEmpty();
    const [a, b] = this.state.players;
    a.hand = [];
    b.hand = [];
    a.hasStood = false;
    b.hasStood = false;
    a.isBusted = false;
    b.isBusted = false;
    a.bet = 0;
    b.bet = 0;
    this.state = { ...this.state, activePlayerId: null, status: "betting", round: this.state.round + 1, winnerId: null, message: "请选择下一局的筹码；牌堆不会洗牌。" };
    this.emit();
  }

  private hit() {
    const player = this.activePlayer();
    if (!player || this.state.deck.length === 0) return this.deckEmpty();
    player.hand.push(draw(this.state.deck));
    const value = handValue(player.hand);
    if (value > 21) {
      player.isBusted = true;
      player.hasStood = true;
      this.finish(this.otherPlayer(player).id, `${player.name} 爆牌，另一方获胜。`);
      return;
    }
    if (player.hand.length === 5) {
      player.hasStood = true;
      this.notify(`${player.name} 已有五张牌，自动停牌。`);
      this.nextTurn(player);
      return;
    }
    this.nextTurn(player);
  }

  private stand() {
    const player = this.activePlayer();
    if (!player) return;
    player.hasStood = true;
    this.notify(`${player.name} 选择停牌。`);
    this.nextTurn(player);
  }

  private nextTurn(previous: Player) {
    const other = this.otherPlayer(previous);
    if (!other.hasStood) {
      this.state.activePlayerId = other.id;
      this.notify(`${other.name} 的回合`);
    } else if (!previous.hasStood) {
      this.state.activePlayerId = previous.id;
      this.notify(`${previous.name} 的回合`);
    } else this.resolveRound();
  }

  private resolveRound() {
    const [a, b] = this.state.players;
    const aValue = handValue(a.hand);
    const bValue = handValue(b.hand);
    const winnerId = aValue === bValue ? null : aValue > bValue ? a.id : b.id;
    this.finish(winnerId, winnerId ? `${this.findPlayer(winnerId).name} 获胜。` : "本局同点，暂记为平局。");
  }

  private finish(winnerId: string | null, message: string) {
    const [a, b] = this.state.players;
    const pot = a.bet + b.bet;
    if (winnerId) this.findPlayer(winnerId).bankroll += pot;
    else {
      a.bankroll += a.bet;
      b.bankroll += b.bet;
    }
    this.state = { ...this.state, status: "finished", activePlayerId: null, winnerId, message };
    this.emit();
  }

  private deckEmpty() {
    this.state = { ...this.state, status: "deck-empty", activePlayerId: null, message: "牌堆不足以开始下一局；本地演示不会自动洗牌。" };
    this.emit();
  }

  private activePlayer() { return this.state.players.find((player) => player.id === this.state.activePlayerId); }
  private otherPlayer(player: Player) { return this.state.players.find((item) => item.id !== player.id)!; }
  private findPlayer(id: string) { return this.state.players.find((player) => player.id === id)!; }
  private notify(message: string) { this.state = { ...this.state, message }; this.emit(); }
  private emit() { this.listeners.forEach((listener) => listener(this.state)); }
}
