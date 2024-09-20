class Plant {
    constructor(name, animator) {
        this.name = name;
        this.animator = animator;

        this.health = 0;
        this.cost = 0;

        this.initattr();
    }

    initattr() { }
    hurt(damage) { this.health -= damage; }
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
        this.attack_interval = 1360;
        this.bulletX = this.animator.x + 100;
        this.bulletY = this.animator.y - 10;
        this.bulletDirection = [1, 0];
        this.bulletSpeed = 10;
        this.bulletDamage = 20;

        this.test();
    }

    test() {
        const bullet = OBJECT.create("PeaBullet.png", this.bulletX, this.bulletY, 60, 100);
    }

    shot() {
        const bullet = OBJECT.create("PeaBullet.png", this.bulletX, this.bulletY, 30, 30);
        bullet.update = function() {
            this.x += this.speed * this.direction[0] * _engine.deltaTime;
            this.y += this.speed * this.direction[1] * _engine.deltaTime;
        }
        bullet.direction = this.bulletDirection;
        bullet.speed = this.bulletSpeed;
        bullet.damage = this.bulletDamage;

        bullet.createCollisionBox();
        bullet.collisionBox.onCollideWith = function(other) {
            if(other.tag == "Zombie") {
                other.hurt(bullet.damage);
                bullet.image = _engine.getImage("PeaBulletHit.png");
                
                bullet.update = function() {
                    this.setOpacity(this.opacity - 1 * _engine.deltaTime);
                }
            }
        }
    }
}