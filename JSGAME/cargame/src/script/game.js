curlogic = null

class GameObject {
    constructor(element) {
        this.element = element
        this.x = 0
        this.y = 0
        this.speed = 1
    }
    move(x, y) {
        this.x = x
        this.y = y
        this.element.style.left = x + "%";
        this.element.style.top = y + "%";
    }
    
    draw() {
        document.body.appendChild(this.element)
    }
}

class Game {
    init() {
        this.started = false
        this.isOver = false

        // create game object
        var racetrackElement = document.createElement("img")
        racetrackElement.src = Asset.Game.racetrack
        racetrackElement.id = "racetrack"
        racetrackElement.draggable = false

        // create player car
        var player1CarElement = document.createElement("img")
        var player2CarElement = document.createElement("img")
        player1CarElement.src = Asset.Game.car1
        player2CarElement.src = Asset.Game.car2
        player1CarElement.draggable = false
        player2CarElement.draggable = false
        player1CarElement.classList.add("car")
        player2CarElement.classList.add("car")
        
        // convert game object
        this.player1 = new GameObject(player1CarElement)
        this.player2 = new GameObject(player2CarElement)
        this.racetrack = new GameObject(racetrackElement)

        // init position
        this.player1.move(0, 25)
        this.player2.move(0, 50)
        
        // draw object
        this.racetrack.draw()
        this.player1.draw()
        this.player2.draw()

        // show user's label
        var player1MoveLabel = document.createElement("p")
        var player2MoveLabel = document.createElement("p")
        
        player1MoveLabel.style.color = "red"
        player1MoveLabel.innerHTML = "player1 press key `D` to move"
        
        player2MoveLabel.style.color = "red"
        player2MoveLabel.innerHTML = "player2 press key `➜` to move(if not robot)"
        
        document.body.appendChild(player1MoveLabel)
        document.body.appendChild(player2MoveLabel)

        // if(Asset.Audios.bg !== NaN) {
        //     var audio = Audio(Asset.Audios.bg)
        //     audio.loop = true
        //     audio.play()
        // }
    }

    over(winner) {
        this.isOver = true
        var label = document.createElement("h1")
        label.classList.add("overlay-text")
        label.innerHTML = winner + " is winner!"
        document.body.appendChild(label)

        var restartButton = document.createElement("button")
        restartButton.id = "restart"
        restartButton.innerHTML = "restart"
        restartButton.onclick = () => { start(curlogic) }


        var exitButton = document.createElement("button")
        exitButton.id = "exit"
        exitButton.innerHTML = "exit"

        document.body.appendChild(restartButton)
        document.body.appendChild(exitButton)
    }
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function start(logic) {
    // clear child node
    while(document.body.hasChildNodes())
        document.body.removeChild(document.body.firstChild)

    game = new Game()
    game.init()

    // set game bg
    document.body.style.background = 'url("' + Asset.Game.background + '")'

    // create start info element
    var ready = document.createElement("h1")
    var set   = document.createElement("h1")
    var go    = document.createElement("h1")
    ready.classList.add("info-text")
    set  .classList.add("info-text")
    go   .classList.add("info-text")
    ready.innerHTML = "READY!"
    set  .innerHTML = "SET!"
    go   .innerHTML = "GO!"
    
    // show start info
    document.body.appendChild(ready)
    await delay(1000)
    document.body.removeChild(ready)
    document.body.appendChild(set)
    await delay(1000)
    document.body.removeChild(set)
    document.body.appendChild(go)
    await delay(1000)
    document.body.removeChild(go)
    game.started = true

    document.addEventListener("keyup", logic)   
    curlogic = logic

    // on start start robot
    if(logic === PvE_logic) {
        robot_id = -1
        if(robot_id === -1) {
            robot_id = setInterval(start_robot, 55)
            await delay(100)
            clearInterval(robot_id)
        }
    }
}