console.log("Plants loaded");
class Plant extends Animator {
    constructor(anims, x, y, w, h, v = 1) {
        super(anims, x, y, w, h, v)
        /**
         * @type {Animator}
         */
        this.health = 0;
        this.cost = 0;
        this.initattr();
        this.tag = "Plant";
        this._timer = 0;
    }

    initattr() { }
    hurt(damage) {
        this._timer += engine.deltaTime;
        if(this._timer >= 0.5) {
            this._timer = 0;
            this.health -= damage;
            if(this.health <= 0) {
                this.destory();
            }
        }
    }
}

class Peashooter extends Plant {
    static width = 60;
    static height = 60;
    constructor(position, line) {
        super({"default": engine.getAnimation("Peashooter", "Peashooter")}, position[0], position[1], Peashooter.width, Peashooter.height);
        this.enter = "default";
        this.line = line;
    }

    initattr() {
        this.bulletX = this.x + 20;
        this.bulletY = this.y;
        this.bulletDirection = [1, 0];

        this.health = 300;
        this.cost = 100;

        this.attack_interval = 1.360;
        // this.attack_interval = 1.360;
        this.bulletSpeed = 250;
        this.bulletDamage = 20;

        this.AttackRange = false;
        this.timer = 0;

        this.createCollisionBox();
        // this.collisionBox.debug.show();
    }

    update() {
        this.timer += engine.deltaTime;
        if(GameManager.GetLineZombies(this.line) > 0) {
            this.AttackRange = true;
        } else {
            this.AttackRange = false;
        }
        if(this.timer >= this.attack_interval && this.AttackRange) {
            this.shot();
            this.timer = 0;
            
            // 自娱自乐代码，记得删除
            let continueShot = false;
            let timeCount = 200;
            while(!continueShot) {
                if(Mathf.RandomInt(0, 100) <= 10 * GameManager.GetLineZombies(this.line)) {
                    setTimeout(() => {
                        this.shot();
                        this.timer = 0;
                    }, timeCount);
                    timeCount += 200;
                } else {
                    continueShot = true;
                }
            }
        }
    }

    shot() {
        engine.setAudioVolume("shoot.mp3", 0.3);
        engine.playAudio("shoot.mp3", () => {this.createBullet();}, 400);
    }

    createBullet() {
        const bullet = OBJECT.create("PeaBullet.png", this.bulletX, this.bulletY, 50, 30);

        bullet.direction = this.bulletDirection;
        bullet.speed = this.bulletSpeed;
        bullet.damage = this.bulletDamage;
        bullet.order = 999;

        bullet.createCircleCollisionBox(9, 27, 6.5);
        // bullet.collisionBox.debug.show();
        bullet.collisionBox.onCollisionEnter = function(other) {
            if(other.tag === "Zombie" && !other.died) {
                other.hurt && other.hurt(bullet.damage);
                engine.playAudio("kernelpult2.ogg");
                bullet.image = engine.getImage("PeaBulletHit.png");
                bullet.width = 50;
                bullet.height = 45;
                bullet.collisionBox.hide();
                bullet.update = function() {
                    this.setOpacity(this.opacity - engine.deltaTime);
                    if(this.opacity <= 0) {
                        bullet.image = null;
                        this.destory();
                    }
                }
            }
        }
        
        bullet.update = function() {
            this.x += this.speed * this.direction[0] * engine.deltaTime;
            // this.y += this.speed * this.direction[1] * engine.deltaTime;

            if(this.x > engine.width || this.x < 0 || this.y > engine.height || this.y < 0) {
                this.destory();
            }
        }
    }

}