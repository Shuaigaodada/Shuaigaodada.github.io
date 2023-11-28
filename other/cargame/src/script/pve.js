var robot_id = -1
var difficulty = {
    "newbie": {min: 500, max: 1000},
    "simple": {min: 450,  max: 1000},
    "real"  : {min: 95,  max: 175},
    "hard"  : {min: 75,  max: 115},
    "hell"  : {min: 50,   max: 90},
    "????"  : "????"
}
function robot_random(range) {
    if(range === "????")
        return Math.random() * 21451 / 1 / 1 / 4 / 5 / 1 / 4
    return (Math.random() * (range.max - range.min) + range.min)
}
async function robot_move() {
    if(game.player2.x <= 80) {
        game.player2.move(game.player2.x + game.player2.speed, game.player2.y)
        // if(Asset.Audios.player2 !== NaN) {
        //     var audio = Audio(Asset.Audios.player2)
        //     audio.play()
        // }
    }
    else {
        game.over("player2")
        document.removeEventListener("keyup", curlogic)
        clearInterval(robot_id)
    }
}
async function start_robot() {
    while(!game.isOver) {
        await delay(robot_random(difficulty["real"]))
        await robot_move()
    }
}
async function PvE_logic(event) {
    if(!game.started || game.isOver) return;

    if(event.key === "d" || event.key === "D") {
        if(game.player1.x <= 80) {
            game.player1.move(game.player1.x + game.player1.speed, game.player1.y)
            // if(Asset.Audios.player1 !== NaN) {
            //     var audio = Audio(Asset.Audios.player1)
            //     audio.play()
            // }
        }
        else {
            game.over("player1")
            document.removeEventListener("keyup", curlogic)
            clearInterval(robot_id)
        }
    }

}