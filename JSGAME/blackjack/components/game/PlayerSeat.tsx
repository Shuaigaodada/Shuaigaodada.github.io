import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { handValue } from "../../game/data/cards";
import type { Player, PlayingCard as PlayingCardModel } from "../../game/contracts/types";
import { PlayingCard } from "./PlayingCard";

interface PlayerSeatProps {
  player: Player;
  active: boolean;
  winner: boolean;
  position: "top" | "bottom";
  hiddenCardIndexes?: number[];
  pendingCardId?: string;
  pendingCard?: PlayingCardModel;
  pendingCardHidden?: boolean;
  reservePendingCard?: boolean;
  animatePendingCard?: boolean;
  hideIncomingCard?: boolean;
  pendingHandSizeBefore?: number;
  disableLayoutAnimation?: boolean;
  visibleHandCount?: number;
  arrivingCardId?: string;
  forceHiddenCardId?: string;
  showdownCardIds?: string[];
  onCardDrop?: () => void;
}

export function PlayerSeat({
  player, active, winner, position, hiddenCardIndexes = [], pendingCardId, pendingCard,
  pendingCardHidden = false, reservePendingCard = false, animatePendingCard = false,
  hideIncomingCard = false, pendingHandSizeBefore = 0, disableLayoutAnimation = false,
  visibleHandCount, arrivingCardId, forceHiddenCardId, showdownCardIds = [], onCardDrop,
}: PlayerSeatProps) {
  const defaultAvatar = `${window.location.pathname.includes("/dist/") ? "../images" : "/images"}/default.png`;
  const slotRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositions = useRef(new Map<string, DOMRect>());
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState(60);

  useEffect(() => {
    if (!active) return;
    setTurnSecondsRemaining(60);
    const timer = window.setInterval(() => setTurnSecondsRemaining((seconds) => Math.max(0, seconds - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [active, player.id]);

  useLayoutEffect(() => {
    const nextPositions = new Map<string, DOMRect>();
    slotRefs.current.forEach((element, cardId) => {
      const nextPosition = element.getBoundingClientRect();
      const previousPosition = previousPositions.current.get(cardId);
      if (previousPosition && !disableLayoutAnimation) {
        const offsetX = previousPosition.left - nextPosition.left;
        if (offsetX) {
          element.animate(
            [{ transform: `translateX(${offsetX}px)` }, { transform: "translateX(0)" }],
            { duration: 460, easing: "cubic-bezier(.2, .8, .2, 1)" },
          );
        }
      }
      nextPositions.set(cardId, nextPosition);
    });
    previousPositions.current = nextPositions;
  }, [player.hand.length, pendingCardId, reservePendingCard, disableLayoutAnimation, visibleHandCount]);

  const handBeforeIncoming = hideIncomingCard && player.hand.length > pendingHandSizeBefore
    ? player.hand.slice(0, -1)
    : player.hand;
  const visibleHand = visibleHandCount === undefined
    ? handBeforeIncoming
    : handBeforeIncoming.slice(0, visibleHandCount);
  const scoreHand = forceHiddenCardId
    ? visibleHand.filter((card) => card.id !== forceHiddenCardId)
    : visibleHand;
  const value = handValue(scoreHand);
  const status = player.isBusted ? "爆牌" : winner ? "获胜" : player.hasStood ? "已停牌" : active ? "行动中" : "等待中";
  const score = hiddenCardIndexes.length > 0 ? "?" : value;
  const scoreProgress = hiddenCardIndexes.length > 0 ? 0 : Math.min(value, 21) / 21 * 360;
  const scoreStyle = {
    "--score-progress": `${scoreProgress}deg`,
    "--score-color": player.isBusted ? "#d95449" : "#e8c15e",
  } as CSSProperties;
  const cardsToRender = reservePendingCard && pendingCard && !visibleHand.some((card) => card.id === pendingCard.id)
    ? [...visibleHand, pendingCard]
    : visibleHand;

  return (
    <section className={`player-seat player-seat--${position} ${active ? "is-active" : ""} ${winner ? "is-winner" : ""} ${player.hasStood && !player.isBusted ? "is-stood" : ""} ${player.isBusted ? "is-busted" : ""}`}>
      <div className="player-header">
        <div className="avatar">{player.avatarData ? <img src={player.avatarData} alt="" /> : <img src={defaultAvatar} alt="" />}</div>
        {winner && <span className="winner-crown" aria-label="本局获胜"><svg viewBox="0 0 120 90" aria-hidden="true"><path d="M12 68 5 20l28 19L48 8l12 31L72 8l15 31 28-19-7 48H12Z" /><path d="M17 74h86v10H17z" /><circle cx="60" cy="42" r="7" /></svg></span>}
        {player.hasStood && !player.isBusted && <span className="stood-flag">已停牌</span>}
        {player.isBusted && <span className="busted-flag">爆牌</span>}
        <div><strong>{player.name}</strong><span>{status} · 赌资 {player.bankroll.toLocaleString()} $</span></div>
        {active && <output className="turn-timer" aria-label={`剩余 ${turnSecondsRemaining} 秒`}>{turnSecondsRemaining}s</output>}
        <output className={`score ${hiddenCardIndexes.length > 0 ? "is-hidden" : ""}`} style={scoreStyle}><span>{score}</span></output>
      </div>
      <div className="hand" aria-label={`${player.name}的手牌`} onDragOver={(event) => event.preventDefault()} onDrop={onCardDrop}>
        {cardsToRender.map((card, index) => {
          const reserved = card.id === pendingCardId && reservePendingCard;
          if (card.id === pendingCardId && !reserved) return null;
          const hidden = hiddenCardIndexes.includes(index) || (reserved && pendingCardHidden) || card.id === forceHiddenCardId;
          const arriving = (reserved && animatePendingCard) || card.id === arrivingCardId;
          return (
            <div className={`hand-card-slot ${reserved ? "is-reserved" : ""} ${arriving ? "is-arriving" : ""} ${showdownCardIds.includes(card.id) ? "is-showdown-card" : ""}`} data-card-id={card.id} key={card.id} ref={(element) => {
              if (element) slotRefs.current.set(card.id, element);
              else slotRefs.current.delete(card.id);
            }}>
              <PlayingCard card={hidden ? undefined : card} hidden={hidden} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
