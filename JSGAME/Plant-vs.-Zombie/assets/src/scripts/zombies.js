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
}

class NormalZombie {
    constructor(x, y, w, h) {
        let animator = new Animator([], x, y, w, h);
        animator.enter = _engine.getAnimation("Zombie", "Move1");
        super("NormalZombie", animator);
    }

    initattr() {
        this.speed = 10;
        this.health = 300;
        this.moving = true;

        _engine.registerEvent(`zombie${this.id} - update`, () => {this.update();})
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