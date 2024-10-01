console.log("Zombies loaded");
class Zombie extends Animator {
    constructor(anims, x, y, w, h, v = 1) {
        super(anims, x, y, w, h, v)
        /**
         * @type {Animator}
         */
        this.health = 0;
        this.start();
        this.tag = "Zombie";
    }

    start() { }
    hurt(damage) { this.health -= damage; }


    // 出生坐标
    static Spawn = [
        {x: 850, y: 65},
        {x: 850, y: 160},
        {x: 850, y: 260},
        {x: 850, y: 365},
        {x: 850, y: 475}
    ]

}

class NormalZombie extends Zombie {
    static width = 125;
    static height = 125;
    constructor(line) {
        super({
            "Move1": engine.getAnimation("Zombie", "Move1"),
            "Move2": engine.getAnimation("Zombie", "Move2"),
            "Back": engine.getAnimation("Zombie", "Back"),
            "Die": engine.getAnimation("Zombie", "Die"),
            "Eat": engine.getAnimation("Zombie", "Eat"),
            "LostHead": engine.getAnimation("Zombie", "LostHead"),
            "LostHeadEat": engine.getAnimation("Zombie", "LostHeadEat"),
            "LostHeadMove": engine.getAnimation("Zombie", "LostHeadMove")
        }, Zombie.Spawn[line].x, Zombie.Spawn[line].y, NormalZombie.width, NormalZombie.height);

        this.line = line + 1;
        this.damage = 20;
    }

    start() {
        this.speed = 12;
        this.health = 300;
        this.lostHeadHealth = 60;
        this.moving = true;
        this.died = false;
        this.head = null

        this.enter = "Move1";
        this.createCollisionBox(60, 45, -90, -50);
        // this.collisionBox.debug.show();
        this.animations["Die"].loop = false;
        this.connectAnimations();
        this.setCollisionEvent();

        this.setValue("moving", this.moving);
    }

    headDown() {
        // use Animation just play once
        this.head = this.animations["LostHead"];
        const headOffsetX = 45;
        const headOffsetY = 0;
        
        this.head.loop = false;
        this.head.speed = 1.3;
        this.head.create(105, 165);
        this.head.setPosition(this.x + headOffsetX, this.y + headOffsetY);
    }

    update() {
        this.setValue("health", this.health);
        if(this.health <= 0 && !this.died) {
            GameManager.SubZombieLine(this.line);
            this.collisionBox.hide();
            this.died = true;
            return;
        }

        if(this.head && this.head.curframe === this.head.frames.length - 1) {
            this.head.__object__.setOpacity(this.head.__object__.opacity - engine.deltaTime);
        } if(this.head && this.head.__object__.opacity <= 0) {
            this.head.destory();
            this.head = null;
        }

        if(this.died) {
            if(this.current.curframe === this.current.frames.length - 1) {
                this.setOpacity(this.current.__object__.opacity - engine.deltaTime);
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
        this.x -= this.speed * engine.deltaTime;
    }

    setCollisionEvent() {
        this.collisionBox.onCollisionEnter = (other) => {
            if(other.tag === "Plant") {
                this.moving = false;
                this.setValue("moving", this.moving);
            }
        }
        this.collisionBox.onCollisionStay = (other) => {
            if(other.tag === "Plant") {
                other.hurt && other.hurt(this.damage);
            }
        }
        this.collisionBox.onCollisionExit = (other) => {
            console.log("exit");
            if(other.tag === "Plant") {
                console.log("call");
                this.moving = true;
                this.setValue("moving", this.moving);
            }
        }
    }

    connectAnimations() {
        this.connect(
            "Move1", "LostHeadMove", (values) => {return values["health"] <= this.lostHeadHealth;}, true,
            () => {this.headDown();}
        )
        this.connect(
            "LostHeadMove", "Die", (values) => {return values["health"] <= 0;}
        )
        this.connect(
            "LostHeadMove", "LostHeadEat", (values) => {return values["health"] <= this.lostHeadHealth && !values["moving"];}
        )
        this.connect(
            "LostHeadEat", "LostHeadMove", (values) => {return values["health"] <= this.lostHeadHealth && values["moving"];}
        )
        this.connect(
            "Move1", "Eat", (values) => {
                return values["health"] > 0 && !values["moving"];
            }
        )
        this.connect(
            "Eat", "Move1", (values) => {
                return values["health"] > 0 && values["moving"];
            }
        )
        this.connect(
            "Eat", "LostHeadEat", (values) => { return values["health"] <= this.lostHeadHealth; }, true,
            () => {this.headDown();}
        )
        this.connect(
            "LostHeadEat", "Die", (values) => {return values["health"] <= 0;}
        )
    }

}