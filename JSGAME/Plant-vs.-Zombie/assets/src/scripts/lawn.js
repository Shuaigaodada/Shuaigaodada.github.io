const __MapStartX = 100;
const __MapStartY = 85;
const __MapSpace = 5;
class DaytimeLawn {
    constructor(width, height) {
        this.mapObject = null;

        // map data [row][col]
        this.map = [];

        this.width = width;
        this.height = height;

        this.createMap();
        this.test();
        // this.startTips(() => {this.test();});
    }

    createMap() {
        this.mapObject = OBJECT.create("background1.jpg", -150, 0, _engine.width * 1.5, _engine.height * 1.08);
        // const block = new OBJECT(_engine.getImage("card_bk.jpg"), this.width, this.height);
        // block.x = __levelStartX ;
        // block.y = __levelStartY ;
        for(let i = 0; i < 5; i++) {
            this.map.push([]);
            for(let j = 0; j <= 8; j++) {
                const block = new OBJECT(_engine.getImage("card_bk.jpg"), this.width, this.height);
                block.setOpacity(0.1);
                block.x = __MapStartX + this.width * j + __MapSpace * j;
                block.y = __MapStartY + this.height * i + __MapSpace * i;
                this.map[i].push(block);
            }
        }
    }

    async startTips(callback) {
        const [x, y] = [400, 190];
        const width = 400;
        const height = 200;
        const startSet = OBJECT.create("StartSet.png", x, y, width, height);
        await _engine.sleep(1000);
        startSet.destory();
        const startReady = OBJECT.create("StartReady.png", x, y, width, height);
        await _engine.sleep(1000);
        startReady.destory();
        const startPlant = OBJECT.create("StartPlant.png", x, y, width, height);
        await _engine.sleep(1000);
        startPlant.destory();
        callback && callback();
    }

    test() {
        
        // get block center position
        const [x, y] = this.center(0, 2, 60, 60);
        
        const Peashooter = _engine.__animations["Peashooter"][0];
        Peashooter.speed = 8;
        Peashooter.draw(60, 60);
        Peashooter.setPosition(x, y);

        // const Zombie = _engine.__animations["Zombie"]["Move1"];
        // Zombie.speed = 6;
        // Zombie.draw(135, 135);
        // Zombie.setPosition(x, y - 20);

        // Zombie.moveSpeed = 9;
        // Zombie.moveFrame = 0;
        // Zombie.update = function() {
        //     this.__object__.x -= 9 * _engine.deltaTime;
        //     //     this.moveFrame = 0;
        //     // }
        // }
        

        // _engine.playAudio("bgm1.mp3");
    }

    center(x, y, width, height) {
        const block = this.map[y][x];
        const centerX = block.x + this.width / 2 - width / 2;
        const centerY = block.y + this.height / 2 - height / 2;
        return [centerX, centerY];
    }

}