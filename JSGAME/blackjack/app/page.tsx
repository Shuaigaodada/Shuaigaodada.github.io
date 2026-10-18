import { useEffect, useState } from "react";
import { BattleScreen } from "../components/game/BattleScreen";
import { DuelTable } from "../components/game/DuelTable";
import { LobbyScreen } from "../components/lobby/LobbyScreen";

export default function App() {
  const [tableId, setTableId] = useState(() => new URLSearchParams(window.location.search).get("table"));
  useEffect(() => {
    const syncTable = () => setTableId(new URLSearchParams(window.location.search).get("table"));
    window.addEventListener("popstate", syncTable);
    return () => window.removeEventListener("popstate", syncTable);
  }, []);
  const enterTable = (nextTableId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("table", nextTableId);
    window.history.pushState({}, "", url);
    setTableId(nextTableId);
  };
  const leaveTable = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("table");
    window.history.pushState({}, "", url);
    setTableId(null);
  };
  const tableNumber = Number(tableId?.replace("table-", ""));
  const isExperimentalTable = tableNumber >= 6 && tableNumber <= 15;

  const screen = !tableId ? <LobbyScreen onEnterTable={enterTable} /> : isExperimentalTable
    ? <DuelTable key={tableId} tableId={tableId} onExit={leaveTable} />
    : <BattleScreen key={tableId} tableId={tableId} onExit={leaveTable} />;
  return <>
    <div className="blackjack-content">{screen}</div>
    <div className="blackjack-rotate" role="status">
      <span className="blackjack-rotate__phone" aria-hidden="true">↻</span>
      <h1>请旋转至横屏</h1>
      <p>Blackjack 需要横屏游玩<br />旋转手机后即可继续当前牌局</p>
    </div>
  </>;
}
