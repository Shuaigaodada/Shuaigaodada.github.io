class Animation {
    constructor() {
        this.frames = [];
        this.currentFrame = 0;
        this.repeat = false;
        this.speed = 1;
    }
    update() {
        this.currentFrame += this.speed;
        if (this.currentFrame >= this.frames.length) {
            if (this.repeat) {
                this.currentFrame = 0;
            } else {
                this.currentFrame = this.frames.length - 1;
            }
        }
    }
}

class Animator {
    constructor() {
        this.animations = {};
        this.currentAnimation = null;
    }
    add(name, animation) {
        this.animations[name] = animation;
    }
    play(name) {
        if (this.currentAnimation !== this.animations[name]) {
            this.animations[name].currentFrame = 0;
        }
        this.currentAnimation = this.animations[name];
    }
    update() {
        if (this.currentAnimation) {
            this.currentAnimation.update();
        }
    }
}


