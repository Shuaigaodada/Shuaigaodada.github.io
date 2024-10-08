var SCORE = 0;
var gameCanvas = document.getElementById("gameCanvas");

const SNAKE_HEAD_COLOR_DEFAULT = "#60d136";
const SNAKE_BODY_COLOR_DEFAULT = "green";
const FOOD_COLOR = "red";
const MAP_COLOR = "#171717";
const WHEN_CANT_CHANGE_DIRE_COLOR = "#26ffd4";

var SNAKE_HEAD_COLOR = SNAKE_HEAD_COLOR_DEFAULT;
var SNAKE_BODY_COLOR = SNAKE_BODY_COLOR_DEFAULT;

const BLOCK_WIDTH = 20;
const BLOCK_HEIGHT = 20;

var APPLE_COUNT = 1;
const SNAKE_SPEED = 90;
var ADD_LENGTH = 3;

var MOVE_ID;
const settingButton = document.getElementById("settingButton");



function interpolateColor(color1, color2, factor) {
    if (arguments.length < 3) {
        factor = 0.5;
    }
    var result = color1.slice();
    for (var i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - result[i]));
    }
    return result;
}

function hexToRgb(hex) {
    var bigint = parseInt(hex.slice(1), 16);
    return [bigint >> 16 & 255, bigint >> 8 & 255, bigint & 255];
}

function rgbToHex(rgb) {
    return "#" + rgb.map(function (value) {
        return ("0" + value.toString(16)).slice(-2);
    }).join("");
}

function generateGradientColors(colors, steps) {
    var gradient = [];
    var stepsPerSegment = Math.floor(steps / (colors.length - 1));
    for (var i = 0; i < colors.length - 1; i++) {
        var color1 = hexToRgb(colors[i]);
        var color2 = hexToRgb(colors[i + 1]);
        for (var j = 0; j < stepsPerSegment; j++) {
            var factor = j / stepsPerSegment;
            gradient.push(rgbToHex(interpolateColor(color1, color2, factor)));
        }
    }
    // Ensure the last color is included
    gradient.push(colors[colors.length - 1]);
    return gradient;
}

var colors = [
    "#FF7F00", // Orange
    "#FFFF00", // Yellow
    "#00FF00", // Green
    "#00FFFF", // Cyan
    "#0000FF", // Blue
    "#8B00FF",  // Violet
    "#0000FF",
    "#00FFFF",
    "#00FF00",
    "#FFFF00",
    "#FF7F00",
];
var gradientColors = generateGradientColors(colors, 222);

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
        this.apples = [];

        this.split_map();
    }

    split_map() {
        let yi = 0; // y index
        for (var y = 0; y < this.gameCanvas.height; y += this.block_height, yi++) {
            this.map.push([]);
            for (var x = 0; x < this.gameCanvas.width; x += this.block_width) {
                this.map[yi].push([x, y]);
            }
        }
    }

    draw() {
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                this.fill(MAP_COLOR, x, y);
            }
        }
    }

    unfill(x, y) {
        this.ctx.clearRect(this.map[y][x][0], this.map[y][x][1], this.block_width, this.block_height);
        // redraw the map color
        this.fill(MAP_COLOR, x, y);
    }

    create_apple() {
        if(this.apples.length >= APPLE_COUNT) return;
    
        let pos;
        while (1) {
            // we need to check the apple's position is not in the snake's body
            pos = this.random_pos();
            let flag = true;
            for (let i = 0; i < snake.body.length; i++) {
                if (pos[0] === snake.body[i][0] && pos[1] === snake.body[i][1]) {
                    flag = false;
                    break;
                }
            }
            for (let apple of this.apples) {
                if (pos[0] === apple[0] && pos[1] === apple[1]) {
                    flag = false;
                    break;
                }
            }
            if (flag) break;
        }

        this.apples.push(pos);
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

    fill(color, x, y, sc_w = 2, sc_h = 2) {
        this.ctx.fillStyle = color;

        let pos_x = this.map[y][x][0];
        let pos_y = this.map[y][x][1];
        this.ctx.fillRect(pos_x, pos_y, this.block_width - sc_w, this.block_height - sc_h);
    }
}
class SNAKE {
    constructor() {
        this.body = [];
        this.direction = [0, 0];
        this.cant_change_dire = false;
    }

    update() {
        this.move();
        if (this.check() === false) {
            over_game();
            return;
        }
        this.level_up();
        this.draw();
    }

    move() {
        if (this.cant_change_dire) {
            SNAKE_HEAD_COLOR = WHEN_CANT_CHANGE_DIRE_COLOR;
        } else {
            SNAKE_HEAD_COLOR = SNAKE_HEAD_COLOR_DEFAULT;
        }
        this.cant_change_dire = false;

        this.head = this.body[0];
        let new_head = [this.head[0] + this.direction[0], this.head[1] + this.direction[1]];
        this.body.unshift(new_head);
        let tail = this.body.pop();

        map.unfill(tail[0], tail[1]);
    }

    level_up() {
        // if (this.body.length <= 10) {
        //     SNAKE_BODY_COLOR = SNAKE_BODY_COLOR_DEFAULT;
        // } else if (this.body.length >= 20) {
        //     SNAKE_BODY_COLOR = "#49d100";
        // } else if (this.body.length >= 40) {
        //     SNAKE_BODY_COLOR = "#59ff00";
        // } else if (this.body.length >= 60) {
        //     SNAKE_BODY_COLOR = "#b3ff00";
        // } else if (this.body.length >= 80) {
        //     SNAKE_BODY_COLOR = "#00ff80";
        // } else if (this.body.length >= 110) {
        //     SNAKE_BODY_COLOR = "#7202c7";
        // } else if (this.body.length >= 140) {
        //     SNAKE_BODY_COLOR = "#039e06"
        // } else if (this.body.length >= 200) {
        //     SNAKE_BODY_COLOR = "error";
        // } else if (this.body.length >= 300) {
        //     SNAKE_BODY_COLOR = "rainbow";
        // }
        if(this.body.length >= 100) {
            SNAKE_BODY_COLOR = "rainbow";
        } else {
            SNAKE_BODY_COLOR = SNAKE_BODY_COLOR_DEFAULT;
        }
    }

    check() {
        if (this.body[0][0] < 0 || this.body[0][0] >= map.map[0].length || this.body[0][1] < 0 || this.body[0][1] >= map.map.length) {
            return false;
        }
        for (let i = 1; i < this.body.length; i++) {
            if (this.body[0][0] === this.body[i][0] && this.body[0][1] === this.body[i][1]) {
                return false;
            }
        }

        // eat apple!!
        for (let apple of map.apples) {
            if (this.body[0][0] === apple[0] && this.body[0][1] === apple[1]) {
                // destroy apple
                for (let i = 0; i < map.apples.length; i++) {
                    if (map.apples[i][0] === apple[0] && map.apples[i][1] === apple[1]) {
                        map.apples.splice(i, 1);
                        break;
                    }
                }
                
                map.create_apple();
                add_score();

                let tail = this.body[this.body.length - 1];
                for (let i = 0; i < ADD_LENGTH; i++)
                    this.body.push(tail);
                console.log(SCORE);
            }
        }

        return true;
    }

    draw() {
        var rainbow_colors = gradientColors;
        for (let i = 0, j = 0; i < this.body.length; i++) {
            let color = i === 0 ? SNAKE_HEAD_COLOR : SNAKE_BODY_COLOR;
            if (SNAKE_BODY_COLOR === "error") {
                let color = i === 0 ? SNAKE_HEAD_COLOR : "rgb(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ")";
                map.fill(color, this.body[i][0], this.body[i][1]);
            } else if (SNAKE_BODY_COLOR === "rainbow") {
                let color = i === 0 ? SNAKE_HEAD_COLOR : rainbow_colors[j++];
                if (j === rainbow_colors.length) j = 0;
                map.fill(color, this.body[i][0], this.body[i][1]);
            } else {
                map.fill(color, this.body[i][0], this.body[i][1]);
            }
        }
    }

    keyEvent(event) {
        if (this.cant_change_dire) return;
        let lock_dire = true;


        if (event.key === "w" || event.key === "ArrowUp" || event.key === "W") {
            if (this.direction[1] === 1) return;
            if (this.direction[0] === 0 && this.direction[1] === -1)
                lock_dire = false;
            this.direction = [0, -1];
        } else if (event.key === "s" || event.key === "ArrowDown" || event.key === "S") {
            if (this.direction[1] === -1) return;
            if (this.direction[0] === 0 && this.direction[1] === 1)
                lock_dire = false;
            this.direction = [0, 1];
        } else if (event.key === "a" || event.key === "ArrowLeft" || event.key === "A") {
            if (this.direction[0] === 1) return;
            if (this.direction[0] === -1 && this.direction[1] === 0)
                lock_dire = false;
            this.direction = [-1, 0];
        } else if (event.key === "d" || event.key === "ArrowRight" || event.key === "D") {
            if (this.direction[0] === -1) return;
            if (this.direction[0] === 1 && this.direction[1] === 0)
                lock_dire = false;
            this.direction = [1, 0];
        } else {
            return;
        }

        this.cant_change_dire = lock_dire;
    }
}

function add_score(sn = 1) {
    SCORE += sn;
    let score = document.getElementById("score");
    score.innerHTML = SCORE;
}

function MoveEvent(event) {
    if(MOVE_ID === undefined) {
        MOVE_ID = setInterval(() => {
            snake.update();
        }, SNAKE_SPEED);
        settingButton.disabled = true;
    }
    snake.keyEvent(event);
}

function init_game() {

    SCORE = 0;
    add_score(-SCORE);

    map.clear();
    map.apples = [];
    
    let spawn_pos = map.random_pos();
    snake.body = [spawn_pos];
    snake.direction = [0, 0];
    snake.cant_change_dire = false;
    SNAKE_HEAD_COLOR = SNAKE_HEAD_COLOR_DEFAULT;
    
    map.draw();
    snake.draw();

    for (let i = 0; i < APPLE_COUNT; i++)
        map.create_apple();

    window.addEventListener("keydown", MoveEvent);
}
function over_game() {
    window.removeEventListener("keydown", MoveEvent);

    clearInterval(MOVE_ID);
    settingButton.disabled = false;
    MOVE_ID = undefined;
    
    const ctx = map.ctx;
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(50, 50, 700, 500);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "64px Arial";
    ctx.fillText("游戏结束", 280, 200);

    // 绘制分数
    ctx.font = "20px Arial";
    ctx.fillText("分数: " + SCORE, 380, 280);

    // 绘制重新开始按钮
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00796b";
    ctx.fillRect(360, 360, 100, 30);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("重新开始", 379, 380);

    gameCanvas.addEventListener('click', function(event) {
        var rect = gameCanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;

        if(x >= 360 && x <= 460 && y >= 360 && y <= 390) {
            // 重新开始
            init_game();
            gameCanvas.removeEventListener('click', arguments.callee);
            return;
        } else over_game();
    }, {once: true});

    
}

function settingMenu() {
    window.removeEventListener("keydown", MoveEvent);

    const ctx = map.ctx;
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(50, 50, 700, 500);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "24px Arial";
    ctx.fillText("设置界面", 350, 100);

    ctx.font = "20px Arial";
    ctx.fillText("苹果数量: ", 100, 200);
    // 绘制“-”按钮
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("-", 270, 205);

    // 绘制“+”按钮
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("+", 330, 205);

    // 绘制当前苹果数量
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(APPLE_COUNT, 300, 205);

    ctx.fillText("增长长度: ", 100, 250);

    // 绘制“-”按钮
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("-", 270, 255);
    
    // 绘制“+”按钮
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("+", 330, 255);

    // 绘制当前增长长度
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(ADD_LENGTH, 300, 255);

    // 绘制保存按钮
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00796b";
    ctx.fillRect(360, 360, 70, 30);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("保存", 379, 380);


    // 添加事件监听器以处理按钮点击
    gameCanvas.addEventListener('click', function(event) {
        var rect = gameCanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;

        // 检查点击是否在“-”按钮内
        if(x >= 260 && x <= 290 && y >= 180 && y <= 210) {
            if(APPLE_COUNT > 1)
                APPLE_COUNT--;
        }

        // 检查点击是否在“+”按钮内
        if(x >= 320 && x <= 350 && y >= 180 && y <= 210) {
            if(APPLE_COUNT < 12)
                APPLE_COUNT++;
        }

        // 检查点击是否在“-”按钮内
        if(x >= 260 && x <= 290 && y >= 230 && y <= 260) {
            if (ADD_LENGTH > 1)
                ADD_LENGTH--;
        }

        // 检查点击是否在“+”按钮内
        if(x >= 320 && x <= 350 && y >= 230 && y <= 260) {
            if (ADD_LENGTH < 33)
                ADD_LENGTH++;
        }

        if(x >= 360 && x <= 430 && y >= 360 && y <= 390) {
            // 保存设置
            ADD_LENGTH = ADD_LENGTH;
            APPLE_COUNT = APPLE_COUNT;
            init_game();
            return;
        }


        settingMenu(); // 重新绘制设置界面
    }, {once: true});

}


const map = new Map(20, 20);
const snake = new SNAKE();
init_game();


