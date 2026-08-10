export interface BetCommit {
  target: number;
  delta: number;
}

export function calculateRaise(available: number, committed: number, currentBet: number, target: number): BetCommit | null {
  if (![available, committed, currentBet, target].every(Number.isSafeInteger)) return null;
  if (available < 0 || committed < 0 || currentBet < 0 || target <= currentBet || target < committed) return null;
  const delta = target - committed;
  return delta <= available ? { target, delta } : null;
}

export function calculateShortAllIn(available: number, committed: number, opponentCommitted: number) {
  if (![available, committed, opponentCommitted].every(Number.isSafeInteger) || available <= 0 || committed < 0 || opponentCommitted < 0) return null;
  const matchedTotal = available + committed;
  return { matchedTotal, uncalledRefund: Math.max(0, opponentCommitted - matchedTotal) };
}
