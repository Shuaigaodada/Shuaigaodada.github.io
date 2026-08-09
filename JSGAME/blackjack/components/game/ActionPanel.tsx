interface ActionPanelProps {
  mode: "waiting" | "betting" | "playing" | "finished" | "deck-empty";
  enabled: boolean;
  bet: number;
  bankroll: number;
  previousBet: number;
  bettingTurn: boolean;
  currentBet: number;
  onAction: (action: "STAND" | "DOUBLE") => void;
  onSetBet: (value: number) => void;
  onUsePreviousBet: () => void;
  onConfirmBet: () => void;
  onCall: () => void;
  onAllIn: () => void;
  onFold: () => void;
  onContinue: () => void;
  seated: boolean;
  onSitDown: () => void;
  onCallBot: () => void;
  nextRoundConfirmations: number;
  nextRoundConfirmed: boolean;
}

export function ActionPanel({ mode, enabled, bet, bankroll, previousBet, bettingTurn, currentBet, onAction, onSetBet, onUsePreviousBet, onConfirmBet, onCall, onAllIn, onFold, onContinue, seated, onSitDown, onCallBot, nextRoundConfirmations, nextRoundConfirmed }: ActionPanelProps) {
  if (mode === "waiting") return <nav className="action-panel">{seated ? <><span className="deck-empty-note">已入座，等待另一名玩家加入。</span><button className="action action--double" type="button" onClick={onCallBot}>呼叫人机</button></> : <button className="action action--hit" type="button" onClick={onSitDown}>坐下</button>}</nav>;
  if (mode === "betting") {
    return (
      <nav className="action-panel action-panel--betting" aria-label="下注操作">
        <span className="bet-label">{currentBet ? `当前底注 ${currentBet.toLocaleString()} $` : "本局底注"}</span>
        <input className="bet-input" aria-label={currentBet ? "加注金额" : "底注金额"} type="number" min="1" max={currentBet ? Math.max(0, bankroll - currentBet) : bankroll} step="1" value={bet || ""} placeholder={currentBet ? "输入加注金额" : "输入底注金额"} onChange={(event) => onSetBet(Number(event.target.value) || 0)} disabled={!bettingTurn} />
        <span className="bet-available">可用 {bankroll.toLocaleString()} $</span>
        <button className="action action--reuse" type="button" onClick={onUsePreviousBet} disabled={!bettingTurn || !previousBet || previousBet > (currentBet ? bankroll - currentBet : bankroll)}>使用上把赌资</button>
        {currentBet > 0 && <button className="action action--stand" type="button" onClick={onFold} disabled={!bettingTurn}>退出</button>}
        {currentBet > bankroll && <button className="action action--double" type="button" onClick={onAllIn} disabled={!bettingTurn || bankroll <= 0}>All-in {bankroll.toLocaleString()} $</button>}
        {currentBet > 0 && <button className="action action--hit" type="button" onClick={onCall} disabled={!bettingTurn || currentBet > bankroll}>跟注 {currentBet.toLocaleString()} $</button>}
        <button className={`action action--double ${currentBet ? "action--raise" : ""}`} type="button" onClick={onConfirmBet} disabled={!bettingTurn || !bet || bet > (currentBet ? bankroll - currentBet : bankroll)}>{currentBet ? `加注 ${(currentBet + bet).toLocaleString()} $` : "确认底注"}</button>
      </nav>
    );
  }
  if (mode === "finished") return <nav className="action-panel"><button className="action action--hit" type="button" onClick={onContinue} disabled={nextRoundConfirmed}>{nextRoundConfirmed ? "已确认" : "继续下一局"}</button>{nextRoundConfirmations > 0 && <span className="next-round-wait">等待确认 {nextRoundConfirmations}/2</span>}</nav>;
  if (mode === "deck-empty") return <nav className="action-panel"><span className="deck-empty-note">牌堆不足，准备重新洗牌。</span><button className="action action--hit" type="button" onClick={onContinue}>洗牌并继续</button></nav>;
  return (
    <nav className="action-panel" aria-label="游戏操作">
      <button className="action action--stand" disabled={!enabled} onClick={() => onAction("STAND")}>停牌 <kbd>S</kbd></button>
      <button className="action action--double" disabled={!enabled} onClick={() => onAction("DOUBLE")}>Double <kbd>D</kbd></button>
    </nav>
  );
}
