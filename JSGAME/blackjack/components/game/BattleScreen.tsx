import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GameState } from "../../game/contracts/types";
import { WebSocketGameGateway } from "../../services/WebSocketGameGateway";
import { ActionPanel } from "./ActionPanel";
import { BankrollStacks, BettingChips } from "./BettingChips";
import { DeckPile } from "./DeckPile";
import { PlayerSeat } from "./PlayerSeat";
import { PlayingCard } from "./PlayingCard";

interface PendingDeal {
  card: GameState["players"][number]["hand"][number];
  playerId: string;
  revealed: boolean;
  dragging: boolean;
  settling: boolean;
  arrived: boolean;
  handSizeBefore: number;
  serverCardReceived?: boolean;
  x?: number;
  y?: number;
}

interface OpeningDeal {
  playerId: string;
  cardId: string;
}

interface BattleScreenProps {
  tableId: string;
  onExit: () => void;
}

function highestCardId(hand: GameState["players"][number]["hand"]) {
  const cardValue = (rank: string) => rank === "A" ? 11 : Number(rank);
  return hand.reduce<{ id: string; value: number } | null>((highest, card) => {
    const value = cardValue(card.rank);
    return !highest || value > highest.value ? { id: card.id, value } : highest;
  }, null);
}

export function BattleScreen({ tableId, onExit: returnToLobby }: BattleScreenProps) {
  const gateway = useMemo(() => new WebSocketGameGateway(tableId), [tableId]);
  const [game, setGame] = useState<GameState>(() => gateway.getState());
  const [pendingDeal, setPendingDeal] = useState<PendingDeal | null>(null);
  const [openingStep, setOpeningStep] = useState(-1);
  const [selectedBet, setSelectedBet] = useState(0);
  const [previousBet, setPreviousBet] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showdownRevealCount, setShowdownRevealCount] = useState<number | null>(null);
  const [tableTime, setTableTime] = useState(() => new Date());
  const tableFeltRef = useRef<HTMLDivElement>(null);
  const drawLockRef = useRef(false);
  const dragReleaseLockRef = useRef(false);
  const previousStatusRef = useRef<GameState["status"]>(gateway.getState().status);
  const previousDeckCountRef = useRef(gateway.getState().deck.length);

  const onExit = () => {
    gateway.sendAction("LEAVE_SEAT");
    window.setTimeout(returnToLobby, 120);
  };

  useEffect(() => {
    const unsubscribe = gateway.subscribe(setGame);
    return () => { unsubscribe(); gateway.dispose(); };
  }, [gateway]);
  useEffect(() => {
    const timer = window.setInterval(() => setTableTime(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (game.status !== "finished") {
      setShowdownRevealCount(null);
      return;
    }
    setShowdownRevealCount(0);
  }, [game.status, game.round]);
  useEffect(() => {
    if (game.status !== "finished" || showdownRevealCount === null) return;
    const cardCount = game.players[1].hand.length;
    if (showdownRevealCount >= cardCount) return;
    const timer = window.setTimeout(() => setShowdownRevealCount((count) => (count ?? 0) + 1), 480);
    return () => window.clearTimeout(timer);
  }, [game.status, game.players, showdownRevealCount]);
  useEffect(() => {
    if (game.status === "betting") setSelectedBet(0);
  }, [game.round, game.status]);
  useEffect(() => {
    const lastConfirmedBet = game.players[0].bet;
    if (lastConfirmedBet > 0) setPreviousBet(lastConfirmedBet);
  }, [game.players]);
  useEffect(() => {
    const needsShuffleAnimation = game.status === "betting"
      && previousDeckCountRef.current < 2
      && game.deck.length >= 40;
    previousDeckCountRef.current = game.deck.length;
    if (!needsShuffleAnimation) return;
    setIsShuffling(true);
    const timer = window.setTimeout(() => setIsShuffling(false), 1_650);
    return () => window.clearTimeout(timer);
  }, [game.deck.length, game.status]);

  const openingQueue = useMemo<OpeningDeal[]>(() => {
    const [a, b] = game.players;
    return [
      a.hand[0] && { playerId: a.id, cardId: a.hand[0].id },
      b.hand[0] && { playerId: b.id, cardId: b.hand[0].id },
      a.hand[1] && { playerId: a.id, cardId: a.hand[1].id },
      b.hand[1] && { playerId: b.id, cardId: b.hand[1].id },
    ].filter((deal): deal is OpeningDeal => Boolean(deal));
  }, [game.players]);

  useLayoutEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (previousStatus === "betting" && game.status === "playing" && openingQueue.length === 2) {
      setOpeningStep(0);
    }
    if (game.status !== "playing") setOpeningStep(-1);
    previousStatusRef.current = game.status;
  }, [game.status, game.round, openingQueue.length]);

  const openingDeal = openingStep >= 0 ? openingQueue[openingStep] : undefined;
  const isOpeningDeal = openingDeal !== undefined;
  const openingDealKey = openingDeal ? `${openingDeal.playerId}:${openingDeal.cardId}` : "";

  useEffect(() => {
    if (!openingDeal) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const deck = document.querySelector<HTMLElement>("[data-deck-pile]");
      const slot = document.querySelector<HTMLElement>(`[data-card-id="${openingDeal.cardId}"]`);
      const card = slot?.querySelector<HTMLElement>(".playing-card");
      if (!deck || !card) {
        setOpeningStep((step) => step + 1 >= openingQueue.length ? -1 : step + 1);
        return;
      }
      const source = deck.getBoundingClientRect();
      const target = card.getBoundingClientRect();
      card.style.visibility = "visible";
      card.animate(
        [
          { transform: `translate(${source.left + source.width / 2 - (target.left + target.width / 2)}px, ${source.top + source.height / 2 - (target.top + target.height / 2)}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 460, easing: "cubic-bezier(.2, .78, .24, 1)", fill: "both" },
      ).finished.then(() => {
        window.setTimeout(() => setOpeningStep((step) => step + 1 >= openingQueue.length ? -1 : step + 1), 110);
      });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [openingDealKey, openingQueue.length]);

  const finishDeal = () => {
    if (!drawLockRef.current) return;
    if (gateway.mode === "remote") return;
    drawLockRef.current = false;
    dragReleaseLockRef.current = false;
    setPendingDeal(null);
    // 牌完全落入手牌后，才正式提交摸牌并切换回合。
    gateway.sendAction("HIT");
  };

  const toTablePoint = (point: { x: number; y: number }) => {
    const tableBounds = tableFeltRef.current?.getBoundingClientRect();
    return tableBounds
      ? { x: point.x - tableBounds.left, y: point.y - tableBounds.top }
      : point;
  };

  const drawFromDeck = (point?: { x: number; y: number }) => {
    const playerId = game.activePlayerId;
    if (!playerId || playerId !== game.viewerPlayerId || pendingDeal || drawLockRef.current) return;
    drawLockRef.current = true;
    dragReleaseLockRef.current = Boolean(point);

    // 联网模式不能提前得知真实牌面，因此拖动的是一张临时牌背。
    // 只有落入手牌区并完成动画后，才向服务端发送 HIT。
    const card = gateway.mode === "remote"
      ? { id: `pending-${Date.now()}`, rank: "A" as const, suit: "spades" as const }
      : game.deck[0];
    if (!card) {
      drawLockRef.current = false;
      dragReleaseLockRef.current = false;
      return;
    }
    const tablePoint = point ? toTablePoint(point) : undefined;
    const shouldReveal = false;
    const handSizeBefore = game.players.find((player) => player.id === playerId)?.hand.length ?? 0;
    setPendingDeal({ card, playerId, revealed: false, dragging: Boolean(point), settling: false, arrived: false, handSizeBefore, x: tablePoint?.x, y: tablePoint?.y });
    // 先向后端预取真实牌；后端此时不判爆牌、不切换回合。
    if (gateway.mode === "remote") gateway.sendAction("HIT_PREVIEW");
    if (shouldReveal) window.setTimeout(() => setPendingDeal((deal) => deal && { ...deal, revealed: true }), 120);
    if (!point) window.setTimeout(finishDeal, 850);
  };

  const performAction = (action: "STAND") => {
    if (game.activePlayerId !== game.viewerPlayerId) return;
    gateway.sendAction(action);
  };

  const movePendingCard = (point: { x: number; y: number }) => {
    const tablePoint = toTablePoint(point);
    setPendingDeal((deal) => deal?.dragging ? { ...deal, x: tablePoint.x, y: tablePoint.y } : deal);
  };

  const releasePendingCard = (point: { x: number; y: number }) => {
    if (!dragReleaseLockRef.current) return;
    dragReleaseLockRef.current = false;
    const tablePoint = toTablePoint(point);
    setPendingDeal((deal) => deal && { ...deal, dragging: false, settling: true, x: tablePoint.x, y: tablePoint.y });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const slot = document.querySelector<HTMLElement>(`[data-card-id="${pendingDeal?.card.id}"]`);
      const cardElement = slot?.querySelector<HTMLElement>(".playing-card");
      if (!cardElement) {
        if (gateway.mode === "remote") setPendingDeal((deal) => deal && { ...deal, arrived: true });
        else finishDeal();
        return;
      }
      const target = cardElement.getBoundingClientRect();
      cardElement.style.visibility = "visible";
      cardElement.animate(
        [
          { transform: `translate(${point.x - (target.left + target.width / 2)}px, ${point.y - (target.top + target.height / 2)}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 720, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "both" },
      ).finished.then(() => {
        if (gateway.mode === "remote") setPendingDeal((deal) => deal && { ...deal, arrived: true });
        else window.setTimeout(finishDeal, 220);
      });
    }));
  };

  useLayoutEffect(() => {
    if (!pendingDeal?.settling || !pendingDeal.arrived || pendingDeal.serverCardReceived) return;
    const player = game.players.find((item) => item.id === pendingDeal.playerId);
    if (!player || player.hand.length <= pendingDeal.handSizeBefore) return;
    const actualCard = player.hand.at(-1);
    if (!actualCard) return;
    setPendingDeal((deal) => deal && { ...deal, card: actualCard, serverCardReceived: true, revealed: false });
    requestAnimationFrame(() => setPendingDeal((deal) => deal?.serverCardReceived ? { ...deal, revealed: true } : deal));
    window.setTimeout(() => {
      // 真实牌已经在原位置翻开，再让后端结算这一次摸牌与下一回合。
      gateway.sendAction("HIT_COMMIT");
      drawLockRef.current = false;
      setPendingDeal(null);
    }, 520);
  }, [game.players, pendingDeal]);

  useEffect(() => {
    const shortcuts: Record<string, "STAND"> = { s: "STAND" };
    const onKeyDown = (event: KeyboardEvent) => {
      const action = shortcuts[event.key.toLowerCase()];
      if (action && game.status === "playing" && game.activePlayerId === game.viewerPlayerId && !pendingDeal) performAction(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.status, pendingDeal, performAction]);

  const [self, opponent] = game.players;
  const opponentHiddenCardIndexes = game.status === "finished"
    ? opponent.hand.map((_, index) => index >= (showdownRevealCount ?? 0) ? index : -1).filter((index) => index >= 0)
    : opponent.hand.map((card, index) => card.id.startsWith("hidden-") || index > 0 ? index : -1)
    .filter((index) => index >= 0);
  const showdownCardIds = (() => {
    if (game.status !== "finished" || game.winnerId !== null) return { self: [], opponent: [] };
    const selfHighest = highestCardId(self.hand);
    const opponentHighest = highestCardId(opponent.hand);
    if (!selfHighest || !opponentHighest) return { self: [], opponent: [] };
    if (selfHighest.value > opponentHighest.value) return { self: [selfHighest.id], opponent: [] };
    if (opponentHighest.value > selfHighest.value) return { self: [], opponent: [opponentHighest.id] };
    return { self: [selfHighest.id], opponent: [opponentHighest.id] };
  })();
  const openingVisibleCount = (playerId: string) => isOpeningDeal
    ? openingQueue.slice(0, openingStep + 1).filter((deal) => deal.playerId === playerId).length
    : undefined;
  const formattedTime = tableTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <main className="game-page">
      <header className="masthead"><button className="lobby-return" type="button" onClick={onExit}>‹ 大厅</button><span className="brand-mark">21</span><div><p>PRIVATE TABLE · {tableId.replace("table-", "").padStart(2, "0")}</p><h1>BLACKJACK</h1></div><time className="table-clock">{formattedTime}</time><span className="round">第 {game.round} 局</span></header>
      <button className="stand-up" type="button" onClick={onExit}>站起</button>
      <div className="table-frame">
        <div className={`table-felt ${game.status === "betting" ? "table-felt--betting" : ""}`} ref={tableFeltRef}>
          <PlayerSeat player={opponent} active={game.status === "playing" && game.activePlayerId === opponent.id} winner={game.status === "finished" && game.winnerId === opponent.id} showHandState={game.status !== "betting" && game.status !== "waiting"} turnSeconds={game.activePlayerId === opponent.id ? game.turnSecondsRemaining : 0} position="top" hiddenCardIndexes={opponentHiddenCardIndexes} pendingCardId={pendingDeal?.playerId === opponent.id ? pendingDeal.card.id : undefined} pendingCard={pendingDeal?.playerId === opponent.id ? pendingDeal.card : undefined} pendingCardHidden={pendingDeal?.playerId === opponent.id && game.status !== "finished"} reservePendingCard={pendingDeal?.playerId === opponent.id && pendingDeal.settling} animatePendingCard={pendingDeal?.playerId === opponent.id && pendingDeal.settling && !pendingDeal.serverCardReceived} hideIncomingCard={pendingDeal?.playerId === opponent.id && !pendingDeal.revealed} pendingHandSizeBefore={pendingDeal?.playerId === opponent.id ? pendingDeal.handSizeBefore : 0} disableLayoutAnimation={pendingDeal?.playerId === opponent.id && !pendingDeal.revealed} visibleHandCount={openingVisibleCount(opponent.id)} arrivingCardId={openingDeal?.playerId === opponent.id ? openingDeal.cardId : undefined} forceHiddenCardId={openingDeal?.playerId === opponent.id ? openingDeal.cardId : undefined} showdownCardIds={showdownCardIds.opponent} />
          <section className="table-center" aria-live="polite">
            <span className="center-label">当前状态</span>
            <strong>{game.message}</strong>
            <div className="pot"><span>底池 <b>{self.bet + opponent.bet} $</b></span></div>
          </section>
          <PlayerSeat player={self} active={game.status === "playing" && game.activePlayerId === self.id} winner={game.status === "finished" && game.winnerId === self.id} showHandState={game.status !== "betting" && game.status !== "waiting"} turnSeconds={game.activePlayerId === self.id ? game.turnSecondsRemaining : 0} position="bottom" pendingCardId={pendingDeal?.playerId === self.id ? pendingDeal.card.id : undefined} pendingCard={pendingDeal?.playerId === self.id ? pendingDeal.card : undefined} pendingCardHidden={pendingDeal?.playerId === self.id && !pendingDeal.revealed} reservePendingCard={pendingDeal?.playerId === self.id && pendingDeal.settling} animatePendingCard={pendingDeal?.playerId === self.id && pendingDeal.settling && !pendingDeal.serverCardReceived} hideIncomingCard={pendingDeal?.playerId === self.id && !pendingDeal.revealed} pendingHandSizeBefore={pendingDeal?.playerId === self.id ? pendingDeal.handSizeBefore : 0} disableLayoutAnimation={pendingDeal?.playerId === self.id && !pendingDeal.revealed} visibleHandCount={openingVisibleCount(self.id)} arrivingCardId={openingDeal?.playerId === self.id ? openingDeal.cardId : undefined} forceHiddenCardId={openingDeal?.playerId === self.id ? openingDeal.cardId : undefined} showdownCardIds={showdownCardIds.self} />
          <DeckPile disabled={isShuffling || isOpeningDeal || game.status !== "playing" || game.activePlayerId !== game.viewerPlayerId || (pendingDeal !== null && !pendingDeal.dragging)} remaining={game.deck.length} shuffling={isShuffling} onDraw={drawFromDeck} onMove={movePendingCard} onRelease={releasePendingCard} />
          <BankrollStacks playerABankroll={self.bankroll} playerBBankroll={opponent.bankroll} />
          <BettingChips topAmount={opponent.bet} bottomAmount={self.bet} winnerPosition={game.status === "finished" ? game.winnerId === self.id ? "bottom" : game.winnerId === opponent.id ? "top" : null : null} />
          {pendingDeal && !pendingDeal.settling && (
            <div className={`dealt-card dealt-card--${pendingDeal.playerId === opponent.id ? "top" : "bottom"} ${pendingDeal.dragging ? "is-dragging" : ""}`} style={pendingDeal.dragging ? { left: pendingDeal.x, top: pendingDeal.y } : undefined}>
              <PlayingCard card={pendingDeal.revealed ? pendingDeal.card : undefined} hidden={!pendingDeal.revealed} />
            </div>
          )}
        </div>
      </div>
      <ActionPanel
        mode={game.status}
        enabled={!isOpeningDeal && game.status === "playing" && game.activePlayerId === game.viewerPlayerId && pendingDeal === null}
        bet={selectedBet}
        bankroll={self.bankroll}
        committedBet={self.bet}
        previousBet={previousBet}
        bettingTurn={game.bettingPlayerId === self.id}
        currentBet={game.currentBet}
        onAction={performAction}
        onSetBet={(value) => setSelectedBet(Math.min(Math.max(0, Math.floor(value)), game.currentBet ? Math.max(0, self.bankroll - Math.max(0, game.currentBet - self.bet)) : self.bankroll))}
        onUsePreviousBet={() => setSelectedBet(Math.min(previousBet, game.currentBet ? Math.max(0, self.bankroll - Math.max(0, game.currentBet - self.bet)) : self.bankroll))}
        onConfirmBet={() => {
          gateway.sendAction("PLACE_BET", game.currentBet ? game.currentBet + selectedBet : selectedBet);
          setSelectedBet(0);
        }}
        onCall={() => gateway.sendAction("CALL")}
        onAllIn={() => gateway.sendAction("ALL_IN")}
        onFold={() => gateway.sendAction("FOLD")}
        onContinue={() => gateway.sendAction("NEXT_ROUND")}
        seated={game.viewerPlayerId !== null}
        onSitDown={() => gateway.sendAction("SIT_DOWN")}
        onCallBot={() => gateway.sendAction("CALL_BOT")}
        nextRoundConfirmations={game.nextRoundConfirmations}
        nextRoundConfirmed={game.nextRoundConfirmed}
      />
    </main>
  );
}
