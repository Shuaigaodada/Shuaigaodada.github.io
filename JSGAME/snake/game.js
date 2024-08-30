var SCORE = 0;
var gameCanvas = document.getElementById("gameCanvas");

const SNAKE_HEAD_COLOR = "darkgreen";
const SNAKE_BODY_COLOR = "green";
const FOOD_COLOR = "red";

const BLOCK_WIDTH = 20;
const BLOCK_HEIGHT = 20;

const SNAKE_SPEED = 90;
const ADD_LENGTH = 3;

var MOVE_ID;
// using Map class to draw and split map
// using map.fill() to fill a block
// using map.unfill() to unfill a block
// using map.create_apple() to create a apple
// using map.clear() to clear the map
// using map.random_pos() to get a random position
// using map.map to get the map array
class Map {
    // 设置一个块的大小
    constructor(block_width, block_height) {
        this.block_width = block_width;
        this.block_height = block_height;
        this.gameCanvas = gameCanvas;
        this.ctx = gameCanvas.getContext("2d");
        this.map = [];
        this.apple = null;

        this.split_map();
    }

    split_map() {
        let yi = 0; // y index
        for(var y = 0; y < this.gameCanvas.height; y += this.block_height, yi++) {
            this.map.push([]);
            for(var x = 0; x < this.gameCanvas.width; x += this.block_width) {
                this.map[yi].push([x, y]);
            }
        }
    }

    unfill(x, y) {
        this.ctx.clearRect(this.map[y][x][0], this.map[y][x][1], this.block_width, this.block_height);
    }

    create_apple() {
        let pos;
        while(1) {
            // we need to check the apple's position is not in the snake's body
            pos = this.random_pos();
            let flag = true;
            for(let i = 0; i < snake.body.length; i++) {
                if(pos[0] === snake.body[i][0] && pos[1] === snake.body[i][1]) {
                    flag = false;
                    break;
                }
            }
            if(flag) break;
        }

        this.apple = pos;
        // create a apple
        // we dont need to destroy apple, snake will overlap it
        this.fill(FOOD_COLOR, pos[0], pos[1]);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
    }

    random_pos() {
        let x = Math.floor(Math.random() * this.map[0].length);
        let y = Math.floor(Math.random() * this.map.length);
        return [x, y];
    }

    fill(color, x, y) {
        this.ctx.fillStyle = color;
        let pos_x = this.map[y][x][0];
        let pos_y = this.map[y][x][1];
        this.ctx.fillRect(pos_x, pos_y, this.block_width-1, this.block_height-1);
    }
}
class SNAKE {
    constructor() {
        this.body = [];
        this.direction = [0, 0];
        this.changed_dire = false;
    }

    move() {
        this.changed_dire = false;
        
        this.head = this.body[0];
        let new_head = [this.head[0] + this.direction[0], this.head[1] + this.direction[1]];
        this.body.unshift(new_head);
        let tail = this.body.pop();
        if(this.check() === false) {
            over_game();
            return;
        }
        map.unfill(tail[0], tail[1]);
        this.draw();
    }

    check() {
        if(this.body[0][0] < 0 || this.body[0][0] >= map.map[0].length || this.body[0][1] < 0 || this.body[0][1] >= map.map.length) {
            return false;
        }
        for(let i = 1; i < this.body.length; i++) {
            if(this.body[0][0] === this.body[i][0] && this.body[0][1] === this.body[i][1]) {
                return false;
            }
        }

        if(this.body[0][0] === map.apple[0] && this.body[0][1] === map.apple[1]) {
            map.create_apple();
            SCORE += 1;
            let tail = this.body[this.body.length - 1];
            
            for(let i = 0; i < ADD_LENGTH; i++)
                this.body.push(tail);
            
            console.log(SCORE);
        }

        return true;
    }

    draw() {
        for(let i = 0; i < this.body.length; i++) {
            let color = i === 0 ? SNAKE_HEAD_COLOR : SNAKE_BODY_COLOR;
            map.fill(color, this.body[i][0], this.body[i][1]);
        }
    }

    keyEvent(event) {
        if(this.changed_dire) return;
        let lock_dire = true;


        if(event.key === "w") {
            if(this.direction[1] === 1) return;
            if(this.direction[0] === 0 && this.direction[1] === -1) 
                lock_dire = false;
            this.direction = [0, -1];
        } else if(event.key === "s") {
            if(this.direction[1] === -1) return;
            if(this.direction[0] === 0 && this.direction[1] === 1) 
                lock_dire = false;
            this.direction = [0, 1];
        } else if(event.key === "a") {
            if(this.direction[0] === 1) return;
            if(this.direction[0] === -1 && this.direction[1] === 0) 
                lock_dire = false;
            this.direction = [-1, 0];
        } else if(event.key === "d") {
            if(this.direction[0] === -1) return;
            if(this.direction[0] === 1 && this.direction[1] === 0) 
                lock_dire = false;
            this.direction = [1, 0];
        }

        this.changed_dire = lock_dire;
    }
}



function init_game() {
    map.clear();
    snake.body = [map.random_pos()];
    snake.direction = [0, 0];

    snake.draw();
    map.create_apple();
    window.addEventListener("keydown", (event) => {
        if(MOVE_ID === undefined) {
            MOVE_ID = setInterval(() => {
                snake.move();
            }, SNAKE_SPEED);
        }
        snake.keyEvent(event);
    });
}
function over_game() {
    clearInterval(MOVE_ID);
    window.removeEventListener("keydown", init_game);
    MOVE_ID = undefined;
    alert("Game Over!");
    init_game();
}


const map = new Map(20, 20);
const snake = new SNAKE();
init_game();


