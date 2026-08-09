import { PlayingCard } from "./PlayingCard";

interface DeckPileProps {
  disabled: boolean;
  remaining: number;
  shuffling?: boolean;
  onDraw: (point: { x: number; y: number }) => void;
  onMove: (point: { x: number; y: number }) => void;
  onRelease: (point: { x: number; y: number }) => void;
}

export function DeckPile({ disabled, remaining, shuffling = false, onDraw, onMove, onRelease }: DeckPileProps) {
  return (
    <button
      className={`deck-pile ${shuffling ? "is-shuffling" : ""}`}
      data-deck-pile
      data-deck-remaining={remaining}
      type="button"
      disabled={disabled}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        onDraw({ x: bounds.left + bounds.width / 2, y: bounds.top + 77 });
      }}
      onPointerMove={(event) => onMove({ x: event.clientX, y: event.clientY })}
      onPointerUp={(event) => onRelease({ x: event.clientX, y: event.clientY })}
      onPointerCancel={(event) => onRelease({ x: event.clientX, y: event.clientY })}
      aria-label="从牌堆摸一张牌"
    >
      <span className="deck-pile__cards" aria-hidden="true">
        <PlayingCard hidden />
      </span>
      <span className="deck-pile__count">剩余 {remaining} 张</span>
      <span className="deck-pile__label">{shuffling ? "正在洗牌" : "点击摸牌"}</span>
    </button>
  );
}
