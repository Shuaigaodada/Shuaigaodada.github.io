var engine;
class GameEngine {
    constructor(width, height) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;

        this.preimg = [];
        this.all_animators = [];

        // game loop
        this.update = null;

        this.fps = 60;

        engine = this;
    }

    engine_update() {
        for(let animator of this.all_animators) {
            animator.update();
        }
        if (this.update) {
            this.update();
        }
    }

    /*
    * @param {string} imgsrc
    * @return {Promise<HTMLImageElement>} 
    */
    preload(imgsrc) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imgsrc;
            image.onload = () => {
                this.preimg.push(image);
                resolve(image);
            };
            image.onerror = () => reject(new Error(`Failed to load image: src=${imgsrc}`));
        });
    }

    start() {
        setInterval(() => {
            this.engine_update();
        }, 1000 / this.fps);
    }
}

class OBJECT {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 10;
        this.height = 10;
        this.visible = true;
    }
}

class Animation extends OBJECT {
    constructor(imgs, speed = 10) {
        super();
        const origin_imgs = imgs;
        this.imgs = [];
        this.index = 0;
        this.frame = 0;
        
        this.speed = speed;
        for(let image of origin_imgs) {
            engine.preload(image).then(
                img => { 
                    console.log(`Preload image: ${img.src}`)
                    this.imgs.push(img);
                }
            )
        }
        this.next = [];
    }

    update() {
        this.frame++;
        if(this.frame >= this.speed) {
            this.frame = 0;
            this.index++;
            if(this.index >= this.imgs.length) {
                this.index = 0;
            }
        }
        engine.ctx.drawImage(this.imgs[this.index], this.x, this.y, this.width, this.height);
    }
}

class Animator extends OBJECT {
    constructor(engine, animations) {
        super();
        // {name: Animation}
        this.animations = animations;
        engine.all_animators.push(this);

        this.current = null;
        this.enter = null;
        this.exit = null;

        // {name: value}
        this.values = [];
    }

    connect(anim1, anim2, valueName, initValue, condition) {
        anim1.next.push({"anim": anim2, "condition": condition, [valueName]: initValue});
        this.values.push({[valueName]: initValue});
    }

    update() {
        if(!this.enter) return;
        if(!this.current) this.current = this.enter;

        for(let next of this.current.next) {
            if(next.condition(this.values[next.valueName])) {
                this.current = next.anim;
                return this.update();
            }
        }

        this.current.update();
    }
}