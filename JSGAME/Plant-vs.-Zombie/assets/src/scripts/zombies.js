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
        this.createCollisionBox(50, 30, -80, -30);
        this.collisionBox.debug.show();
        this.line = line + 1;
        this.connect(
            "Move1", "LostHeadMove", "health", this.health, () => {return this.health <= 60;}
        )
    }

    initattr() {
        this.speed = 12;
        this.health = 300;
        this.moving = true;
    }

    update() {

        this.setValue("health", this.health);
        if(this.health <= 0) {
            // this.destory();
            GameManager.SubZombieLine(this.line);
            
            return;
        }
        if(this.moving) {
            this.move();
        }
            
    }

    move() {
        this.x -= this.speed * _engine.deltaTime;
    }

}