import { useMemo } from "react";
import type { CSSProperties } from "react";

export const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 2000] as const;

interface BettingChipsProps {
  amount: number;
  winnerId: string | null;
  pendingTopAmount?: number;
  pendingBottomAmount?: number;
  totalAmount?: number;
}

interface BankrollStacksProps {
  playerABankroll: number;
  playerBBankroll: number;
}

export function splitIntoChips(amount: number) {
  let remaining = amount;
  const chips: number[] = [];
  // 每一万使用较丰富的混合面额展示，并形成多组同面额筹码堆。
  while (remaining >= 10_000) {
    chips.push(2000, 2000, 2000, 1000, 1000, 500, 500, 200, 200, 200, 100, 100, 50, 50, 25, 25, 25, 25);
    remaining -= 10_000;
  }
  [...CHIP_VALUES].reverse().forEach((value) => {
    while (remaining >= value) {
      chips.push(value);
      remaining -= value;
    }
  });
  return chips;
}

function ChipBundle({ player, chips }: { player: "a" | "b"; chips: number[] }) {
  return (
    <div className={`chip-bundle chip-bundle--${player}`}>
      <span className="chip-bundle__amount">{chips.reduce((sum, chip) => sum + chip, 0)} $</span>
      {chips.map((value, index) => (
        <span className="bet-chip" style={{ "--chip-index": index, "--chip-value": value, backgroundColor: chipColor(value) } as CSSProperties} key={`${value}-${index}`}>{value >= 1000 ? `${value / 1000}K` : value}</span>
      ))}
    </div>
  );
}

export function BettingChips({ amount, winnerId, pendingTopAmount = 0, pendingBottomAmount = 0, totalAmount }: BettingChipsProps) {
  if (!amount && !pendingTopAmount && !pendingBottomAmount) return null;
  const total = totalAmount ?? (amount ? amount * 2 : pendingTopAmount + pendingBottomAmount);
  const totalLabel = <span className="betting-chips__total">总赌资 <b>{total.toLocaleString()} $</b></span>;
  if (!amount) {
    return (
      <div className="betting-chips betting-chips--pending" aria-label="正在推入的下注筹码">
        {totalLabel}
        {pendingTopAmount > 0 && <ChipBundle player="b" chips={splitIntoChips(pendingTopAmount)} />}
        {pendingBottomAmount > 0 && <ChipBundle player="a" chips={splitIntoChips(pendingBottomAmount)} />}
      </div>
    );
  }
  const chips = splitIntoChips(amount);
  const winnerClass = winnerId === "player-a" ? "is-won-a" : winnerId === "player-b" ? "is-won-b" : "";
  return <div className={`betting-chips ${winnerClass}`} aria-label="双方下注筹码">{totalLabel}<ChipBundle player="b" chips={chips} /><ChipBundle player="a" chips={chips} /></div>;
}

function BankrollStack({ player, amount }: { player: "a" | "b"; amount: number }) {
  const layout = useMemo(() => createBankrollLayout(amount), [amount]);
  const chipsByValue = layout.reduce((groups, chip) => {
    groups.set(chip.value, [...(groups.get(chip.value) ?? []), chip]);
    return groups;
  }, new Map<number, BankrollChip[]>());
  return (
    <div className={`bankroll-stack bankroll-stack--${player}`}>
      <span className="bankroll-stack__label">{player === "a" ? "玩家 A 赌资" : "玩家 B 赌资"} · {amount.toLocaleString()} $</span>
      <div className="chip-rack">
        {[...chipsByValue.entries()].map(([chip, stack]) => (
          <div className="chip-rack__slot" key={chip}>
            {stack.map((item, chipIndex) => {
              const pileIndex = Math.floor(chipIndex / 30);
              const bottom = (chipIndex % 30) * 1.8 + item.offsetY;
              return <span className="bankroll-stack__chip" style={{ left: `calc(50% + ${pileIndex * 9 + item.offsetX}px)`, bottom, backgroundColor: chipColor(chip), transform: `translateX(-50%) rotate(${item.rotation}deg)` } as CSSProperties} key={chipIndex}>{chip >= 1000 ? `${chip / 1000}K` : chip}</span>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BankrollChip {
  value: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

function chipColor(value: number) {
  if (value >= 1000) return "#a63733";
  if (value >= 500) return "#c69738";
  if (value >= 200) return "#285f81";
  if (value >= 100) return "#477d45";
  if (value >= 50) return "#735292";
  return "#b3762d";
}

function createBankrollLayout(amount: number): BankrollChip[] {
  if (amount <= 0) return [];
  const targetCount = Math.min(amount, 50 + Math.floor(Math.random() * 51));
  const values = createExactChipCombination(amount, targetCount);
  return values.map((value) => ({ value, offsetX: Math.random() * 3 - 1.5, offsetY: Math.random() * 3 - 1.5, rotation: Math.random() * 4 - 2 }));
}

function createExactChipCombination(amount: number, count: number) {
  // 托盘只有 8 个槽位，选用 6 个代表性面额，避免生成过多筹码种类挤出托盘。
  const denominations = [1, 5, 25, 100, 500, 2000];
  const possible = Array.from({ length: count + 1 }, () => new Uint8Array(amount + 1));
  possible[0][0] = 1;
  for (let chipCount = 1; chipCount <= count; chipCount += 1) {
    for (let total = 1; total <= amount; total += 1) {
      possible[chipCount][total] = denominations.some((value) => value <= total && possible[chipCount - 1][total - value]) ? 1 : 0;
    }
  }
  if (!possible[count][amount]) return splitIntoChips(amount);
  const chips: number[] = [];
  const displayLimits: Record<number, number> = { 1: 3, 5: 5, 25: 12, 100: 25, 500: 20, 2000: 6 };
  const displayCounts = new Map<number, number>();
  let remaining = amount;
  for (let chipCount = count; chipCount > 0; chipCount -= 1) {
    const candidates = denominations.filter((value) => value <= remaining && possible[chipCount - 1][remaining - value]);
    const withinLimit = candidates.filter((value) => (displayCounts.get(value) ?? 0) < displayLimits[value]);
    const pool = withinLimit.length ? withinLimit : candidates;
    const lowestCount = Math.min(...pool.map((value) => displayCounts.get(value) ?? 0));
    const balancedCandidates = pool.filter((value) => (displayCounts.get(value) ?? 0) <= lowestCount + 1);
    const value = balancedCandidates[Math.floor(Math.random() * balancedCandidates.length)];
    chips.push(value);
    displayCounts.set(value, (displayCounts.get(value) ?? 0) + 1);
    remaining -= value;
  }
  return chips;
}

export function BankrollStacks({ playerABankroll, playerBBankroll }: BankrollStacksProps) {
  return <div className="bankroll-stacks" aria-label="双方完整赌资"><BankrollStack player="b" amount={playerBBankroll} /><BankrollStack player="a" amount={playerABankroll} /></div>;
}
