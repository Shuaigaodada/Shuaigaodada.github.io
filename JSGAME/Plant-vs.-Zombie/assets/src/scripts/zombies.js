console.log("Zombies loaded");
class Zombie extends Animator {
    constructor(anims, x, y, w, h, v = 1) {
        super(anims, x, y, w, h, v)
        /**
         * @type {Animator}
         */
        this.health = 0;
        this.initattr();
        this.tag = "Zombie";
    }

    initattr() { }
    hurt(damage) { this.health -= damage; }


    static Spawn = [
        {x: 1200, y: 60}, // 1200
        {x: 800, y: 160},
        {x: 0, y: 0},
        {x: 0, y: 0},
        {x: 0, y: 0}
    ]

}

class NormalZombie extends Zombie {
    static width = 125;
    static height = 125;
    constructor(line) {
        super({
            "Move1": _engine.getAnimation("Zombie", "Move1"),
            "Move2": _engine.getAnimation("Zombie", "Move2"),
            "Back": _engine.getAnimation("Zombie", "Back"),
            "Die": _engine.getAnimation("Zombie", "Die"),
            "Eat": _engine.getAnimation("Zombie", "Eat"),
            "LostHead": _engine.getAnimation("Zombie", "LostHead"),
            "LostHeadEat": _engine.getAnimation("Zombie", "LostHeadEat"),
            "LostHeadMove": _engine.getAnimation("Zombie", "LostHeadMove")
    }, Zombie.Spawn[line].x, Zombie.Spawn[line].y, NormalZombie.width, NormalZombie.height);
        this.enter = "Move1";
        this.createCollisionBox(70, 40, -100, -50);
        this.collisionBox.debug.show();
        this.line = line + 1;
        this.animations["Die"].loop = false;
        
        this.connect(
            "Move1", "LostHeadMove", "health", this.health, () => {return this.health <= 60;}, true,
            () => {this.headDown();}
        )
        this.connect(
            "LostHeadMove", "Die", "health", this.health, () => {return this.health <= 0;}
        )
    }

    initattr() {
        this.speed = 12;
        this.health = 300;
        this.moving = true;
        this.died = false;
        this.head = null
    }

    headDown() {
        // use Animation just play once
        this.head = this.animations["LostHead"];
        const headOffsetX = 45;
        const headOffsetY = 0;
        
        this.head.loop = false;
        this.head.speed = 5;
        this.head.draw(105, 165);
        this.head.setPosition(this.x + headOffsetX, this.y + headOffsetY);
    }

    update() {
        this.setValue("health", this.health);
        if(this.health <= 0 && !this.died) {
            // this.destory();
            GameManager.SubZombieLine(this.line);
            this.collisionBox.hide();
            this.died = true;
            return;
        }

        if(this.head && this.head.curframe === this.head.frames.length - 1) {
            this.head.__object__.setOpacity(this.head.__object__.opacity - _engine.deltaTime);
        } if(this.head && this.head.__object__.opacity <= 0) {
            this.head.destory();
            this.head = null;
        }

        if(this.died) {
            if(this.current.curframe === this.current.frames.length - 1) {
                this.setOpacity(this.opacity - _engine.deltaTime);
            }
            if(this.opacity <= 0) {
                this.destory();
            }
        }

        if(this.moving && !this.died) {
            this.move();
        }
            
    }

    move() {
        this.x -= this.speed * _engine.deltaTime;
    }

}