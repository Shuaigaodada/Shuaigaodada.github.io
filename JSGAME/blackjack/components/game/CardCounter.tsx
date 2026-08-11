import { useMemo, useState } from "react";
import type { PlayingCard as Card, Rank } from "../../game/contracts/types";
import { PlayingCard } from "./PlayingCard";

const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export function CardCounter({ cards }: { cards: Card[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const counts = useMemo(() => new Map(ranks.map((rank) => [rank, cards.filter((card) => card.rank === rank).length])), [cards]);

  return (
    <aside className={`card-counter ${collapsed ? "is-collapsed" : ""}`} aria-label="剩余牌记牌器">
      <button className="card-counter__toggle" type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={collapsed ? "展开记牌器" : "收起记牌器"}>
        {collapsed ? "›" : "‹"}
      </button>
      {!collapsed && <div className="card-counter__body">
        <div className="card-counter__title"><span>剩余牌</span><b>{cards.length}</b></div>
        <div className="card-counter__grid">
          {ranks.map((rank) => <div className={`card-counter__item ${(counts.get(rank) ?? 0) === 0 ? "is-empty" : ""}`} key={rank}>
            <PlayingCard card={{ id: `counter-${rank}`, rank, suit: "spades" }} />
            <strong>{counts.get(rank) ?? 0}</strong>
          </div>)}
        </div>
      </div>}
    </aside>
  );
}
