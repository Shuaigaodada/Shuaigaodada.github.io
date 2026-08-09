import type { PlayingCard as PlayingCardModel } from "../../game/contracts/types";

const suitSymbols = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" } as const;

function cardImagePath(card: PlayingCardModel) {
  const rankCodes: Record<PlayingCardModel["rank"], string> = {
    A: "A",
    2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "T",
  };
  const suitCodes: Record<PlayingCardModel["suit"], string> = {
    hearts: "H", diamonds: "D", clubs: "C", spades: "S",
  };
  const imageRoot = window.location.pathname.includes("/dist/") ? "../images" : "/images";
  return `${imageRoot}/poker-super2-modern-ignis/${rankCodes[card.rank]}${suitCodes[card.suit]}.svg`;
}

interface PlayingCardProps {
  card?: PlayingCardModel;
  hidden?: boolean;
}

export function PlayingCard({ card, hidden = false }: PlayingCardProps) {
  if (!hidden && !card) return null;
  const label = hidden ? "隐藏的扑克牌" : `${card!.rank}${suitSymbols[card!.suit]}`;
  return (
    <div className={`playing-card ${hidden ? "is-hidden" : ""}`} aria-label={label}>
      <div className="card-inner">
        {!hidden && <img className="card-face" src={cardImagePath(card!)} alt={label} />}
        <div className="card-back" aria-hidden={!hidden}>
          <div className="card-back-logo">21</div>
        </div>
      </div>
    </div>
  );
}
