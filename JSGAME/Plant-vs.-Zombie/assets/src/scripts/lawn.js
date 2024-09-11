const __levelStartX = 218;
const __levelStartY = 80;
class DaytimeLawn {
    constructor(width, height) {
        this.mapObject = null;

        // map data [row][col]
        this.map = [];

        this.width = width;
        this.height = height;

        this.createMap();
        this.test();
    }

    createMap() {
        this.mapObject = OBJECT.create("background1.jpg", 0, 0, _engine.width, _engine.height);
        for(let i = 0; i < 5; i++) {
            this.map.push([]);
            for(let j = 0; j < 8; j++) {
                const block = new OBJECT(null, this.width, this.height);
                block.x = __levelStartX + this.width * j;
                block.y = __levelStartY + this.height * i;
                this.map[i].push(block);
            }
        }
        console.log(this.map);  
    }

    test() {
        
        // get block center position
        const [x, y] = this.center(0, 0, 60, 60);
        
        const Peashooter = _engine.__animations["Peashooter"];
        Peashooter.draw(60, 60);
        Peashooter.setPosition(x, y);

        _engine.playAudio("bgm1.mp3");
    }

    center(x, y, width, height) {
        const block = this.map[y][x];
        const centerX = block.x + this.width / 2 - width / 2;
        const centerY = block.y + this.height / 2 - height / 2;
        return [centerX, centerY];
    }

}