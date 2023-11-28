async function PvP_logic(event) {
    if(!game.started || game.isOver) return;
    if(event.key === "d" || event.key == "D") {
        if(game.player1.x <= 80) 
            game.player1.move(game.player1.x + game.player1.speed, game.player1.y)
        else {
            game.over("player1")
            document.removeEventListener("keyup", curlogic)
        }
    }
    if(event.key == "ArrowRight") {
        if(game.player2.x <= 80)
            game.player2.move(game.player2.x + game.player2.speed, game.player2.y)
        else {
            game.over("player2")
            document.removeEventListener("keyup", curlogic)
        }
    }
}

