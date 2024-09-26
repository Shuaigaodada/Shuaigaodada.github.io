console.log("Lawn loaded");
const __MapStartX = 100;
const __MapStartY = 85;
const __MapSpace = 5;
class DaytimeLawn {
    constructor(width, height) {
        this.mapObject = null;

        // map data [row][col]
        this.map = [];
        this.plants = [];

        this.width = width;
        this.height = height;

        this.createMap();    
    }

    start() {
        this.startTips(() => {this.startGame();});
    }

    startGame() {
        _engine.setAudioLoop("bgm1.mp3", true);
        _engine.setAudioVolume("bgm1.mp3", 0.5);
        _engine.playAudio("bgm1.mp3");
        // TEST CODE
        this.plant(Peashooter, 0, 1);
        // this.plant(Peashooter, 1, 1);

        new NormalZombie(1);
        setInterval(() => {
            new NormalZombie(1);
        }, 20000);
        
    }

    plant(plants, x, y) {
        const plant = new plants(this.center(x, y, plants.width, plants.height), y + 1);
        this.plants[y][x] = plant;
    }

    createMap() {
        this.mapObject = OBJECT.create("background1.jpg", -150, 0, _engine.width * 1.5, _engine.height * 1.08);
        // const block = new OBJECT(_engine.getImage("card_bk.jpg"), this.width, this.height);
        // block.x = __levelStartX ;
        // block.y = __levelStartY ;
        for(let i = 0; i < 5; i++) {
            this.map.push([]);
            this.plants.push([]);
            for(let j = 0; j <= 8; j++) {
                const block = new OBJECT(_engine.getImage("card_bk.jpg"), this.width, this.height);
                block.setOpacity(0.0);
                block.x = __MapStartX + this.width * j + __MapSpace * j;
                block.y = __MapStartY + this.height * i + __MapSpace * i;
                block.tag = "Floor";
                
                // block.collisionBox.debug.show();
                // if(j === 6)
                //     block.tag = "Zombie";
                if(j === 8) {
                    block.createCollisionBox();
                    // block.collisionBox.debug.show();
                    block.collisionBox.onCollisionEnter = function(other) {
                        if(other.tag === "Zombie") {
                            GameManager.AddZombieLine(i + 1);
                        }
                    }
                }
                
                this.map[i].push(block);
                this.plants[i].push(null);
            }
        }
    }

    async startTips(callback) {
        _engine.playAudio("readysetplant.ogg");
        const [x, y] = [250, 190];
        const width = 400;
        const height = 200;
        const startSet = OBJECT.create("StartSet.png", x, y, width, height);
        await _engine.sleep(500);
        startSet.destory();
        const startReady = OBJECT.create("StartReady.png", x, y, width, height);
        await _engine.sleep(500);
        startReady.destory();
        const startPlant = OBJECT.create("StartPlant.png", x, y, width, height);
        await _engine.sleep(1000);
        startPlant.destory();
        callback && callback();
    }

    center(x, y, width, height) {
        const block = this.map[y][x];
        const centerX = block.x + this.width / 2 - width / 2;
        const centerY = block.y + this.height / 2 - height / 2;
        return [centerX, centerY];
    }

}