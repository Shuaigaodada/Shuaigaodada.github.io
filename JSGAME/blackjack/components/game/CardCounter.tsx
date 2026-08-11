import { useMemo, useState } from "react";
import type { PlayingCard as Card, Rank, Suit } from "../../game/contracts/types";

const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const suitSymbols: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export function CardCounter({ cards }: { cards: Card[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const remainingSuits = useMemo(() => {
    const entries = ranks.map((rank) => [
      rank,
      new Set(cards.filter((card) => card.rank === rank).map((card) => card.suit)),
    ] as const);
    return new Map<Rank, Set<Suit>>(entries);
  }, [cards]);

  return (
    <aside className={`card-counter ${collapsed ? "is-collapsed" : ""}`} aria-label="剩余牌记牌器">
      <button
        className="card-counter__toggle"
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "展开记牌器" : "收起记牌器"}
      >
        {collapsed ? "›" : "‹"}
      </button>
      {!collapsed && (
        <div className="card-counter__body">
          <div className="card-counter__title"><span>剩余花色</span><b>{cards.length} 张</b></div>
          <div className="card-counter__grid">
            {ranks.map((rank) => {
              const available = remainingSuits.get(rank) ?? new Set<Suit>();
              return (
                <div className={`card-counter__item ${available.size === 0 ? "is-empty" : ""}`} key={rank}>
                  <strong className="card-counter__rank">{rank}</strong>
                  <div className="card-counter__suits" aria-label={`${rank} 剩余 ${available.size} 张`}>
                    {suits.filter((suit) => available.has(suit)).map((suit) => (
                      <span className={`card-counter__suit card-counter__suit--${suit}`} key={suit}>{suitSymbols[suit]}</span>
                    ))}
                    {available.size === 0 && <span className="card-counter__none">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
