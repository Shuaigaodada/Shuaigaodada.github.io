var _engine;
class GameEngine {
    constructor(width, height) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;

        this.width = width;
        this.height = height;

        this.__images = [];
        this.__audios = {};
        this.__animations = {};
        this.objects = [];

        this.__levels = {};

        // game loop
        this.update = null;

        this.fps = 60;

        // bind event
        this.__mouseDown__ = this.__mouseDown__.bind(this);
        this.__mouseUp__ = this.__mouseUp__.bind(this);
        this.__mouseMove__ = this.__mouseMove__.bind(this);

        this.canvas.addEventListener('mousedown', this.__mouseDown__);
        this.canvas.addEventListener('mouseup', this.__mouseUp__);
        this.canvas.addEventListener('mousemove', this.__mouseMove__);

        _engine = this;        
    }

    __mouseDown__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseDown(mouseX, mouseY);
        }
    }
    __mouseUp__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseUp(mouseX, mouseY);
        }
    }
    __mouseMove__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseMove(mouseX, mouseY);
        }
    }
    

    engine_update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for(let object of this.objects)
            object.update();

        for(let object of this.objects) {
            if(object.visible) this.draw(object);
        }

        this.update && this.update()
    }

    preload(imgsrc) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imgsrc;
            image.onload = () => {
                this.__images.push(image);
                resolve(image);
            };
            image.onerror = () => reject(new Error(`Failed to load image: src=${imgsrc}`));
        });
    }

    preloadAudio(name, src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(src);
            audio.oncanplaythrough = () => { this.__audios[name] = audio; resolve(audio); };
            audio.onerror = () => reject(new Error(`Failed to load audio: src=${src}`));
        });
    }

    playAudio(name)  { this.__audios[name].play(); }
    pauseAudio(name) { this.__audios[name].pause(); }
    setAudioVolume(name, volume) { this.__audios[name].volume = volume; }
    setAudioLoop(name, loop) { this.__audios[name].loop = loop; }

    save_level(name) {
        this.__levels[name] = this.objects;
    }
    load_level(name) {
        this.objects = this.__levels[name];
    }

    draw(object) {
        if(!object.image && !object.text) return;
        if(object.image === null && object.text !== null) {
            this.ctx.font = object.style.font;
            this.ctx.fillStyle = object.style.color;
            this.ctx.fillText(object.text, object.x, object.y);
            return;
        }

        this.ctx.save();

        // slider
        this.ctx.beginPath();
        this.ctx.rect(object.x, object.y, object.width * object.slider, object.height);
        this.ctx.clip();

        // rotation
        this.ctx.translate(object.x + object.width / 2, object.y + object.height / 2);
        this.ctx.rotate(object.rotation * Math.PI / 180);
        this.ctx.drawImage(object.image, -object.width / 2, -object.height / 2, object.width, object.height); // 绘制图像

        this.ctx.restore();
    }

    getImage(name) {
        for(let i = 0; i < this.__images.length; i++) {
            let filename = this.__images[i].src.split('/').pop();
            if(filename === name) {
                return this.__images[i];
            }
        }
        return null;
    }

    start() {
        setInterval(() => {
            this.engine_update();
        }, 1000 / this.fps);
    }

    clear() {
        this.objects = [];
    }
}

class CollisionBox {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    isCollideWith(box) {
        return this.x < box.x + box.width && this.x + this.width > box.x && this.y < box.y + box.height && this.y + this.height > box.y;
    }

    isCollideWithPoint(x, y) {
        return this.x < x && this.x + this.width > x && this.y < y && this.y + this.height > y;
    }
}

class OBJECT {
    constructor(image = null, width = 100, height = 100, visible = true) {
        this.name = null;
        this.x = 0;
        this.y = 0;
        this.image = image;
        this.text = null; // if has image, dont draw text
        this.style = {"font": "30px Arial", "color": "black"}; 
        this.rotation = 0;
        this.slider = 1;
        this.width = width;
        this.height = height;
        this.visible = visible;
        this.order = -1; // -1 mean no order
        _engine.objects.push(this);
    }

    setOrder(order) {
        this.order = order;
        this.destory()
        // insert object to _engine.objects use order
        for(let i = 0; i < _engine.objects.length; i++) {
            if(_engine.objects[i].order > order) {
                _engine.objects.splice(i, 0, this);
                return;
            }
        }
        // if not found, push to the end
        _engine.objects.push(this);
    }

    setSlider(slider) {
        this.slider = slider;
    }

    static create(imgName, x, y, width, height, visible = true) {
        let image = _engine.getImage(imgName);
        if(image === null)
            console.log(`Image not loaded: ${imgName}`);
            // if image not loaded, return null image object
        let object = new OBJECT(image, width, height);
        object.setPosition(x, y);
        object.visible = visible;
        return object;
    }
    static destory(object) {
        let index = _engine.objects.indexOf(object);
        if(index !== -1){
            _engine.objects.splice(index, 1);
        } else {
            console.warn("Object not found");
        }
    }
    static destoryWithName(name) {
        if(name === null) { 
            console.error("Name is null"); 
            return; 
        }
        for(let i = 0; i < _engine.objects.length; i++) {
            if(_engine.objects[i].name === name) {
                _engine.objects.splice(i, 1);
                return;
            }
        }
    }

    destory() {
        let index = _engine.objects.indexOf(this);
        if(index !== -1){
            _engine.objects.splice(index, 1);
        }
    }

    update() {} // abstract method
    onMouseDown() {} // abstract method
    onMouseUp() {} // abstract method
    onMouseMove() {} // abstract method

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Animation {
    constructor(name, imgs, speed = 10, callback = null) {
        this.frames = new Array(imgs.length); // 保持顺序的数组
        this.curframe = 0;
        this.index = 0;
        this.speed = speed;
        this.__object__ = null;
        
        imgs.forEach((imageSrc, i) => {
            _engine.preload(imageSrc).then(
                img => {
                    this.frames[i] = img; // 将图片放到正确的索引位置
                    callback && callback();
                }
            ).catch(err => console.error(err));
        });
        
        // {condition: function, anim: Animation, valueName: string}
        this.next = [];
        _engine.__animations[name] = this;
    }

    draw(width, height, visible = true) {
        this.__object__ = new OBJECT(this.frames[0], width, height, visible);
        this.__object__.update = function() {
            this.index++;
            if(this.index >= this.speed) {
                this.index = 0;
                this.curframe++;
                if(this.curframe >= this.frames.length) {
                    this.curframe = 0;
                }
            }  
            if(this.curframe === undefined) {
                console.error("curframe is undefined");
                return;
            };
            this.image = this.frames[this.curframe];
        }
    }

    setPosition(x, y) {
        this.__object__.setPosition(x, y);
    }

}

class Animator extends OBJECT {
    constructor(animations) {
        super();
        // {name: Animation}
        this.animations = animations;

        this.current = null;
        this.enter = null;
        // {anim: Animation, condition: function, valueName: string}
        this.exit = null;

        // {name: value}
        this.values = {};

    }

    connect(anim1, anim2, valueName, initValue, condition) {
        anim1.next.push({"anim": anim2, "condition": condition, [valueName]: initValue});
        this.values.push({[valueName]: initValue});
    }

    setValue(valuenName, value) {
        this.values[valuenName] = value;
    }
    getValue(valuenName) {
        return this.values[valuenName];
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

        if(this.exit && this.exit.condition(this.values[this.exit.valueName])) {
            this.current = this.exit.anim;
            return this.update();
        }

        this.current.update();
    }

    getFrameLength() {
        let sum = 0;
        for(let anim in this.animations)
            sum += anim.frames.length;
        return sum;
    }
}

class Button extends OBJECT {
    constructor(image, x, y, width, height, callback) {
        super(image, width, height);
        this.x = x;
        this.y = y;
        this.clickBox = new CollisionBox(x, y, width, height);
        this.callback = callback;
    }

    onMouseDown(x, y) {
        this.clickBox.isCollideWithPoint(x, y) && this.callback && this.callback();
    }
}




