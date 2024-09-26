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
        this.createCollisionBox();
        this.tag = "Plant";
    }

    initattr() { }
    hurt(damage) { this.health -= damage; }
}

class Peashooter extends Plant {
    static width = 60;
    static height = 60;
    constructor(position, line) {
        super({"default": _engine.getAnimation("Peashooter", "Peashooter")}, position[0], position[1], Peashooter.width, Peashooter.height);
        this.enter = "default";
        this.line = line;
    }

    initattr() {
        this.health = 300;
        this.cost = 100;
        this.attack_interval = 1.360;
        // this.attack_interval = 0.300;
        this.bulletX = this.x + 20;
        this.bulletY = this.y;
        this.bulletDirection = [1, 0];
        // this.bulletSpeed = 250;
        this.bulletSpeed = 10;
        this.bulletDamage = 20;

        this.AttackRange = false;
        this.timer = 0;
    }

    update() {
        this.timer += _engine.deltaTime;
        if(GameManager.GetLineZombies(this.line) > 0) {
            this.AttackRange = true;
        } else {
            this.AttackRange = false;
        }
        if(this.timer >= this.attack_interval && this.AttackRange) {
            this.shot();
            this.timer = 0;
        }
    }

    shot() {
        _engine.setAudioVolume("shoot.mp3", 0.3);
        _engine.playAudio("shoot.mp3", () => {this.createBullet();}, 400);
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
                _engine.playAudio("kernelpult2.ogg");
                bullet.image = _engine.getImage("PeaBulletHit.png");
                bullet.width = 50;
                bullet.height = 45;
                bullet.collisionBox.hide();
                bullet.update = function() {
                    this.setOpacity(this.opacity - _engine.deltaTime);
                    if(this.opacity <= 0) {
                        bullet.image = null;
                        this.destory();
                    }
                }
            }
        }
        
        bullet.update = function() {
            this.x += this.speed * this.direction[0] * _engine.deltaTime;
            this.y += this.speed * this.direction[1] * _engine.deltaTime;

            if(this.x > _engine.width || this.x < 0 || this.y > _engine.height || this.y < 0) {
                this.destory();
            }
        }
        
    }
}