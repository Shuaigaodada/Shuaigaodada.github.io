import { useState } from "react";
import { BattleScreen } from "../components/game/BattleScreen";
import { HellBlackjackDemo } from "../components/game/HellBlackjackDemo";
import { LobbyScreen } from "../components/lobby/LobbyScreen";

export default function App() {
  const [tableId, setTableId] = useState(() => new URLSearchParams(window.location.search).get("table"));
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
  const isExperimentalTable = tableNumber >= 6 && tableNumber <= 10;

  if (!tableId) return <LobbyScreen onEnterTable={enterTable} />;
  return isExperimentalTable
    ? <HellBlackjackDemo tableId={tableId} onExit={leaveTable} />
    : <BattleScreen tableId={tableId} onExit={leaveTable} />;
}
