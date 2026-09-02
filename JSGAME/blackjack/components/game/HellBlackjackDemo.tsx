import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

import breakIcon from "../../images/ui-icons/break.svg";
import devourIcon from "../../images/ui-icons/devour.svg";
import exploitIcon from "../../images/ui-icons/exploit.svg";
import hollowIcon from "../../images/ui-icons/hollow.svg";
import igniteIcon from "../../images/ui-icons/ignite.svg";
import insightIcon from "../../images/ui-icons/insight.svg";
import whisperIcon from "../../images/ui-icons/whisper.svg";
import clubIcon from "../../images/ui-icons/suits/club.svg";
import diamondIcon from "../../images/ui-icons/suits/diamond.svg";
import flameIcon from "../../images/ui-icons/suits/flame.svg";
import greedIcon from "../../images/ui-icons/suits/greed.svg";
import heartIcon from "../../images/ui-icons/suits/heart.svg";
import spadeIcon from "../../images/ui-icons/suits/spade.svg";
import teethIcon from "../../images/ui-icons/suits/teeth.svg";
import tumorIcon from "../../images/ui-icons/suits/tumor.svg";
import { getGameServer } from "../../services/serverConfig";
import "./HellBlackjackDemo.css";

interface HellBlackjackDemoProps {
  tableId: string;
  onExit: () => void;
}

type Suit = "heart" | "diamond" | "spade" | "club" | "flame" | "greed" | "tumor" | "teeth";
type Phase = "choose" | "place" | "skill" | "opponent" | "stood";

interface DemoCard {
  id: string;
  rank: string;
  suit: Suit;
  suitName: string;
  points: number[];
  activePoint: number;
  skillName: string;
  skillText: string;
  skillIcon: string;
  forced?: boolean;
}

interface DraggedCard {
  card: DemoCard;
  x: number;
  y: number;
  settling: boolean;
}

const suitIcons: Record<Suit, string> = {
  heart: heartIcon,
  diamond: diamondIcon,
  spade: spadeIcon,
  club: clubIcon,
  flame: flameIcon,
  greed: greedIcon,
  tumor: tumorIcon,
  teeth: teethIcon,
};

const demoDeck: DemoCard[] = [
  { id: "tumor-5", rank: "5", suit: "tumor", suitName: "肿瘤", points: [5], activePoint: 0, skillName: "吞噬 · 剥削 2", skillText: "吞掉叠入的牌，并迫使对手增加 2 枚筹码。", skillIcon: devourIcon },
  { id: "spade-4", rank: "4", suit: "spade", suitName: "黑桃", points: [4, -4], activePoint: 0, skillName: "破损", skillText: "在正点数与负点数之间切换。", skillIcon: breakIcon },
  { id: "flame-2", rank: "2", suit: "flame", suitName: "火焰", points: [2], activePoint: 0, skillName: "点燃", skillText: "第二次点燃时移除目标牌。", skillIcon: igniteIcon },
  { id: "greed-7", rank: "7", suit: "greed", suitName: "贪婪", points: [7, 0], activePoint: 0, skillName: "洞察 2", skillText: "查看并重排己方牌堆顶部 2 张牌。", skillIcon: insightIcon },
  { id: "club-5", rank: "5", suit: "club", suitName: "梅花", points: [5], activePoint: 0, skillName: "剥削 4", skillText: "迫使对手额外投入 4 枚筹码。", skillIcon: exploitIcon },
  { id: "heart-3", rank: "3", suit: "heart", suitName: "红心", points: [3, 0], activePoint: 0, skillName: "多重点数 · 空壳", skillText: "可叠放在已有牌位，并选择当前点数。", skillIcon: hollowIcon },
  { id: "diamond-8", rank: "8", suit: "diamond", suitName: "方块", points: [0, 2, 5], activePoint: 2, skillName: "低语", skillText: "有牌叠入时触发；每回合至多一次。", skillIcon: whisperIcon },
  { id: "teeth-6", rank: "6", suit: "teeth", suitName: "牙齿", points: [6], activePoint: 0, skillName: "强制 · 减值 3", skillText: "相邻两侧牌的所有点数降低 3。", skillIcon: breakIcon, forced: true },
];

const cloneCard = (card: DemoCard, suffix: number): DemoCard => ({ ...card, id: `${card.id}-${suffix}` });

function AwakenedCard({ card, compact = false, selected = false }: { card: DemoCard; compact?: boolean; selected?: boolean }) {
  return (
    <article className={`hell-card hell-card--${card.suit}${compact ? " is-compact" : ""}${selected ? " is-selected" : ""}`}>
      <div className="hell-card__wash" />
      <header className="hell-card__points" aria-label={`点数 ${card.points.join(" 或 ")}`}>
        {card.points.map((point, index) => (
          <span className={index === card.activePoint ? "is-active" : ""} key={`${card.id}-${point}-${index}`}>{point}</span>
        ))}
      </header>
      <img className="hell-card__suit" src={suitIcons[card.suit]} alt={card.suitName} />
      <div className="hell-card__rank">{card.rank}</div>
      <footer>
        <strong>{card.skillName}</strong>
        {!compact && <p>{card.skillText}</p>}
      </footer>
    </article>
  );
}

function CardSlot({ card, index, active, onClick, deciding, onUseSkill, onSkipSkill }: {
  card?: DemoCard;
  index: number;
  active?: boolean;
  onClick?: () => void;
  deciding?: boolean;
  onUseSkill?: () => void;
  onSkipSkill?: () => void;
}) {
  return (
    <div className={`hell-slot-wrap${deciding ? " is-deciding" : ""}`}>
      {deciding && <button className="hell-skill-choice hell-skill-choice--use" type="button" onClick={onUseSkill}>发动技能</button>}
      <button type="button" data-hell-slot-index={index} className={`hell-slot${card ? " is-filled" : ""}${active ? " is-target" : ""}`} onClick={onClick} disabled={!active}>
        <span className="hell-slot__number">{String(index + 1).padStart(2, "0")}</span>
        {card ? <AwakenedCard card={card} compact /> : <span className="hell-slot__empty">空牌位</span>}
      </button>
      {deciding && <button className="hell-skill-choice hell-skill-choice--skip" type="button" disabled={card?.forced} onClick={onSkipSkill}>{card?.forced ? "强制发动" : "跳过技能"}</button>}
    </div>
  );
}

export function HellBlackjackDemo({ tableId, onExit }: HellBlackjackDemoProps) {
  const tableNumber = Number(tableId.replace("table-", "")) || 6;
  const deck = useMemo(() => Array.from({ length: 40 }, (_, index) => cloneCard(demoDeck[index % demoDeck.length], index)), []);
  const [drawIndex, setDrawIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("choose");
  const [drawn, setDrawn] = useState<DemoCard | null>(null);
  const [draggedCard, setDraggedCard] = useState<DraggedCard | null>(null);
  const [skillSlotIndex, setSkillSlotIndex] = useState<number | null>(null);
  const [playerBoard, setPlayerBoard] = useState<Array<DemoCard | undefined>>(() => [undefined, undefined, undefined, undefined, undefined]);
  const [opponentBoard, setOpponentBoard] = useState<Array<DemoCard | undefined>>(() => [undefined, undefined, undefined, undefined, undefined]);
  const [sleeve, setSleeve] = useState<DemoCard[]>([]);
  const [seconds, setSeconds] = useState(180);
  const [message, setMessage] = useState("点击左侧牌堆摸牌。首次行动不能停牌。");
  const [hasPlayed, setHasPlayed] = useState(false);
  const [round, setRound] = useState(1);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const dragPointerRef = useRef<number | null>(null);
  const dropTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2_500);
    void fetch(`${getGameServer()}/health`, { cache: "no-store", signal: controller.signal })
      .then((response) => setBackendStatus(response.ok ? "online" : "offline"))
      .catch(() => setBackendStatus("offline"))
      .finally(() => window.clearTimeout(timer));
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (phase === "opponent" || phase === "stood") return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (seconds !== 0 || phase === "opponent" || phase === "stood") return;
    if (drawn) {
      const open = playerBoard.findIndex((card) => !card);
      const target = open >= 0 ? open : Math.floor(Math.random() * playerBoard.length);
      setPlayerBoard((board) => board.map((card, index) => index === target ? drawn : card));
      setDrawn(null);
      setMessage("行动超时：已将摸出的牌随机放入合法牌位。");
    } else {
      setMessage("行动超时：已自动停牌。");
    }
    setPhase("opponent");
  }, [drawn, phase, playerBoard, seconds]);

  useEffect(() => {
    if (phase !== "opponent") return;
    const timer = window.setTimeout(() => {
      const nextCard = cloneCard(demoDeck[(drawIndex + 3) % demoDeck.length], 200 + drawIndex);
      setOpponentBoard((board) => {
        const open = board.findIndex((card) => !card);
        return board.map((card, index) => index === (open >= 0 ? open : 0) ? nextCard : card);
      });
      setPhase("choose");
      setSeconds(180);
      setMessage("对手已出牌。点击左侧牌堆摸牌，或选择停牌。");
    }, 1_650);
    return () => window.clearTimeout(timer);
  }, [drawIndex, phase]);

  const drawCard = () => {
    const card = deck[drawIndex % deck.length];
    setDrawn(card);
    setDrawIndex((value) => value + 1);
    setPhase("place");
    setMessage("点击一个牌位出牌，或点击袖口区域藏牌。");
  };

  const beginDragFromDeck = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase !== "choose" || draggedCard) return;
    event.preventDefault();
    const card = deck[drawIndex % deck.length];
    if (!card) return;
    dragPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawn(card);
    setDrawIndex((value) => value + 1);
    setPhase("place");
    setDraggedCard({ card, x: event.clientX, y: event.clientY, settling: false });
    setMessage("按住牌拖到牌位出牌，或拖到袖口藏牌。");
  };

  const moveDraggedCard = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragPointerRef.current !== event.pointerId) return;
    event.preventDefault();
    setDraggedCard((value) => value && !value.settling ? { ...value, x: event.clientX, y: event.clientY } : value);
  };

  const settleDraggedCard = (target: HTMLElement, finish: () => void) => {
    const bounds = target.getBoundingClientRect();
    setDraggedCard((value) => value ? {
      ...value,
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      settling: true,
    } : value);
    dropTimerRef.current = window.setTimeout(() => {
      finish();
      setDraggedCard(null);
      dropTimerRef.current = null;
    }, 320);
  };

  const releaseDraggedCard = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragPointerRef.current !== event.pointerId || !draggedCard) return;
    event.preventDefault();
    dragPointerRef.current = null;
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const slot = target?.closest<HTMLElement>("[data-hell-slot-index]");
    const sleeveTarget = target?.closest<HTMLElement>("[data-hell-sleeve]");
    if (slot) {
      const index = Number(slot.dataset.hellSlotIndex);
      if (Number.isInteger(index) && !playerBoard[index]) {
        settleDraggedCard(slot, () => placeCard(index, draggedCard.card));
        return;
      }
    }
    if (sleeveTarget && sleeve.length < 3) {
      settleDraggedCard(sleeveTarget, () => hideCard(draggedCard.card));
      return;
    }
    // Invalid drops return the card to the deck instead of leaving a detached
    // "current card" panel on the table.
    setDraggedCard(null);
    setDrawn(null);
    setDrawIndex((value) => Math.max(0, value - 1));
    setPhase("choose");
    setMessage("没有放到有效区域，牌已返回牌堆。请按住牌堆拖到牌位或袖口。");
  };

  const placeCard = (index: number, cardToPlace: DemoCard | null = drawn) => {
    if (!cardToPlace) return;
    setPlayerBoard((board) => board.map((card, slotIndex) => slotIndex === index ? cardToPlace : card));
    setDrawn(null);
    setHasPlayed(true);
    setSkillSlotIndex(index);
    setPhase("skill");
    setMessage(cardToPlace.forced ? "此牌为强制效果，将立即发动。" : `是否发动「${cardToPlace.skillName}」？`);
  };

  const hideCard = (cardToHide: DemoCard | null = drawn) => {
    if (!cardToHide || sleeve.length >= 3) return;
    setSleeve((cards) => [...cards, cardToHide]);
    setDrawn(null);
    setDraggedCard(null);
    setPhase("choose");
    setMessage("牌已藏入袖口。继续点击左侧牌堆摸牌，或在允许时停牌。");
  };

  const finishSkill = (useSkill: boolean) => {
    setMessage(useSkill ? "技能已发动。正在等待对手行动…" : "已跳过技能。正在等待对手行动…");
    setSkillSlotIndex(null);
    setPhase("opponent");
  };

  const stand = () => {
    setPhase("stood");
    setMessage("你已停牌。Demo 中可开始下一回合继续体验。");
  };

  const nextRound = () => {
    setRound((value) => value + 1);
    setPhase("choose");
    setSeconds(180);
    setDrawn(null);
    setDraggedCard(null);
    setSkillSlotIndex(null);
    setHasPlayed(false);
    setMessage("新回合开始。先后手已轮换，场上牌进入各自弃牌堆。");
    setPlayerBoard([undefined, undefined, undefined, undefined, undefined]);
    setOpponentBoard([undefined, undefined, undefined, undefined, undefined]);
  };

  const playerScore = playerBoard.reduce((sum, card) => sum + (card ? card.points[card.activePoint] : 0), 0);
  const opponentScore = opponentBoard.reduce((sum, card) => sum + (card ? card.points[card.activePoint] : 0), 0);

  return (
    <main className="hell-demo">
      <header className="hell-demo__header">
        <button type="button" onClick={onExit}>← 大厅</button>
        <div><span>AWAKENED DUEL · EXPERIMENT</span><h1>地狱 BLACKJACK</h1></div>
        <div className="hell-demo__round"><span>实验桌 {String(tableNumber).padStart(2, "0")}</span><b>第 {round} 回合 · 后端{backendStatus === "online" ? "已连接" : backendStatus === "offline" ? "未连接" : "检查中"}</b></div>
      </header>

      <section className="hell-board">
        <button type="button" className="hell-deck hell-deck--opponent" disabled aria-label="对手牌堆">
          <span className="hell-deck__stack"><i /><i /><i /><em>∞</em></span>
          <strong>对手牌堆 · {Math.max(0, 40 - opponentBoard.filter(Boolean).length)}</strong><small>弃牌 {opponentBoard.filter(Boolean).length}</small>
        </button>
        <div className="hell-player hell-player--opponent">
          <div className="hell-player__meta"><span>对手</span><b>{opponentScore}</b><small>筹码 13 / 15</small></div>
          <div className="hell-slots">{opponentBoard.map((card, index) => <CardSlot card={card} index={index} key={`opponent-${index}`} />)}</div>
        </div>

        <section className="hell-center">
          <div className="hell-pot"><span>公共奖池</span><div>{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div><b>7 / 15</b></div>
          <div className="hell-status"><span>当前状态</span><strong>{message}</strong><small>筹码价值 5 · 总付款 75</small></div>
          <div className="hell-timer" style={{ "--timer": `${seconds / 180 * 360}deg` } as React.CSSProperties}><b>{seconds}</b><span>秒</span></div>
          <button className="hell-stand" type="button" disabled={!hasPlayed || phase !== "choose"} onClick={stand}>停牌</button>
        </section>

        <button
          type="button"
          className="hell-deck hell-deck--player"
          disabled={phase !== "choose"}
          onClick={(event) => {
            // Pointer-capable browsers draw on pointerdown so the card can be
            // dragged immediately. Keep click as the keyboard fallback.
            if (event.detail === 0) drawCard();
          }}
          onPointerDown={beginDragFromDeck}
          onPointerMove={moveDraggedCard}
          onPointerUp={releaseDraggedCard}
          onPointerCancel={releaseDraggedCard}
          aria-label="按住我的牌堆摸牌并拖动"
        >
          <span className="hell-deck__stack"><i /><i /><i /><em>∞</em></span>
          <strong>我的牌堆 · {Math.max(0, 40 - drawIndex)}</strong><small>弃牌 {Math.max(0, drawIndex - sleeve.length)}</small>
        </button>
        <div className="hell-player hell-player--self">
          <div className="hell-player__meta"><span>你</span><b>{playerScore}</b><small>筹码 15 / 15</small></div>
          <div className="hell-slots">{playerBoard.map((card, index) => (
            <CardSlot
              card={card}
              index={index}
              active={phase === "place"}
              deciding={phase === "skill" && skillSlotIndex === index}
              onClick={() => placeCard(index)}
              onUseSkill={() => finishSkill(true)}
              onSkipSkill={() => finishSkill(false)}
              key={`player-${index}`}
            />
          ))}</div>
          <button type="button" data-hell-sleeve className={`hell-sleeve${phase === "place" ? " is-target" : ""}`} disabled={phase !== "place" || sleeve.length >= 3} onClick={() => hideCard()}><span>袖口 {sleeve.length} / 3</span>{[0, 1, 2].map((index) => <i className={sleeve[index] ? "is-filled" : ""} key={index}>{sleeve[index]?.rank ?? ""}</i>)}</button>
        </div>

        {draggedCard && (
          <div
            className={`hell-dragged-card${draggedCard.settling ? " is-settling" : ""}`}
            style={{ left: draggedCard.x, top: draggedCard.y }}
            aria-hidden="true"
          >
            <span className="hell-dragged-card__back"><i /></span>
          </div>
        )}

        {phase === "stood" && <button className="hell-next-round" type="button" onClick={nextRound}>下一回合</button>}
      </section>
      <div className={`hell-demo__notice is-${backendStatus}`}>本地规则与视觉 Demo · {backendStatus === "online" ? "本地后端在线" : "请启动本地后端 :8787"} · 不扣除真实赌资</div>
    </main>
  );
}
