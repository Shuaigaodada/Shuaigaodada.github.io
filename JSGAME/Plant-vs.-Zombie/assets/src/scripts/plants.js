class Plant {
    static _idCounter = 0; // 静态变量，用于生成唯一ID
    constructor(name, animator) {
        this.name = name;
        this.animator = animator;

        this.health = 0;
        this.cost = 0;

        this.initattr();

        this.id = Plant._idCounter++;
    }

    initattr() { }
    hurt(damage) { this.health -= damage; }
    destory() {
        this.animator.destory();
        _engine.removeEvent(`Plant${this.id} - update`);
    }
}

class Peashooter extends Plant {
    constructor(x, y, w, h) {
        let animator = new Animator([], x, y, w, h);
        animator.enter = _engine.getAnimation("Peashooter", "Peashooter");
        super("Peashooter", animator);
    }

    initattr() {
        this.health = 300;
        this.cost = 100;
        this.attack_interval = 1.360;
        this.bulletX = this.animator.x + 20;
        this.bulletY = this.animator.y;
        this.bulletDirection = [1, 0];
        this.bulletSpeed = 250;
        this.bulletDamage = 20;

        this.AttackRange = true;
        this.timer = 0;
        _engine.registerEvent(`Plant${this.id} - update` , () => {this.update();});
    }

    setAttackRange(status) {
        this.AttackRange = status;
    }

    update() {
        this.timer += _engine.deltaTime;
        if(this.timer >= this.attack_interval && this.AttackRange) {
            this.shot();
            this.timer = 0;
        }
    }

    shot() {
        const bullet = OBJECT.create("PeaBullet.png", this.bulletX, this.bulletY, 50, 30);

        bullet.direction = this.bulletDirection;
        bullet.speed = this.bulletSpeed;
        bullet.damage = this.bulletDamage;

        bullet.createCircleCollisionBox(9, 27, 6.5);
        bullet.collisionBox.onCollisionEnter = function(other) {
            if(other.tag === "Zombie") {
                other.hurt && other.hurt(bullet.damage);
                bullet.image = _engine.getImage("PeaBulletHit.png");
                bullet.width = 50;
                bullet.height = 45;
                bullet.collisionBox.hide();
                bullet.update = function() {
                    this.setOpacity(this.opacity - 0.5 * _engine.deltaTime);
                    if(this.opacity <= 0) {
                        this.destory();
                    }
                }
            }
        }
        bullet.collisionBox.registerEvent();
        
        bullet.update = function() {
            this.x += this.speed * this.direction[0] * _engine.deltaTime;
            this.y += this.speed * this.direction[1] * _engine.deltaTime;

            if(this.x > _engine.width || this.x < 0 || this.y > _engine.height || this.y < 0) {
                this.destory();
            }
        }
    }
}