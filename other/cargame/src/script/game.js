class GameObject {
    constructor(element) {
        this.element = element
        this.x = 0
        this.y = 0
        this.speed = 5
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

class PvPMode {
    init() {
        this.started = false
        this.isOver = false

        // create game object
        var racetrackElement = document.createElement("img")
        racetrackElement.src = "./src/image/racetrack.png"
        racetrackElement.id = "racetrack"

        // create player car
        var player1CarElement = document.createElement("img")
        var player2CarElement = document.createElement("img")
        player1CarElement.src = "./src/image/car1.png"
        player2CarElement.src = "./src/image/car2.png"
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
        player1MoveLabel.innerHTML = "press key `D` to move"
        
        player2MoveLabel.style.color = "red"
        player2MoveLabel.innerHTML = "press key `➜` to move"
        
        document.body.appendChild(player1MoveLabel)
        document.body.appendChild(player2MoveLabel)
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
        restartButton.addEventListener("onclick", arguments[1])

        var exitButton = document.createElement("button")
        exitButton.id = "exit"
        exitButton.innerHTML = "exit"
        exitButton.addEventListener("onclick", arguments[2])

        document.body.appendChild(restartButton)
        document.body.appendChild(exitButton)
    }
}

