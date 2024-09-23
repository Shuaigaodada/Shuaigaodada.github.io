class Zombie {
    static _idCounter = 0; // 静态变量，用于生成唯一ID
    constructor(name, animator) {
        this.name = name;

        /**
         * @type {Animator}
         */
        this.animator = animator;

        this.health = 0;

        this.initattr();

        this.id = Zombie._idCounter++;
    }

    initattr() { }
    hurt(damage) { this.health -= damage; }
    destory() {
        this.animator.destory();
        _engine.removeEvent(`Zombie${this.id} - update`);
    }

    static Spawn = [
        {x: 0, y: 0},
        {x: 0, y: 0},
        {x: 0, y: 0},
        {x: 0, y: 0},
        {x: 0, y: 0}
    ]

    __showSpawn() {
        OBJECT.create("card_bk.jpg", Zombie.Spawn.x, Zombie.Spawn.y, 100, 100);
    }
}

class NormalZombie {
    constructor(x, y, w, h) {
        let animator = new Animator([
            _engine.getAnimation("Zombie", "Move1"),
            _engine.getAnimation("Zombie", "Move2"),
            _engine.getAnimation("Zombie", "Back"),
            _engine.getAnimation("Zombie", "Die"),
            _engine.getAnimation("Zombie", "Eat"),
            _engine.getAnimation("Zombie", "LostHead"),
            _engine.getAnimation("Zombie", "LostHeadEat"),
            _engine.getAnimation("Zombie", "LostHeadMove")
        ], x, y, w, h);
        animator.enter = _engine.getAnimation("Zombie", "Move1");
        super("NormalZombie", animator);
    }

    initattr() {
        this.speed = 10;
        this.health = 300;
        this.moving = true;

        _engine.registerEvent(`zombie${this.id} - update`, () => {this.update();})

        this.__showSpawn();
    }

    update() {
        if(this.health <= 0) {
            this.destory();
            return;
        }
        if(this.moving)
            this.move();
    }

    move() {
        this.animator.x -= this.speed * _engine.deltaTime;
    }

}