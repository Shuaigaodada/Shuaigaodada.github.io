const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class MockImage {
    set src(value) {
        this.__src__ = value;
        queueMicrotask(() => this.onload && this.onload());
    }
}

class MockAudio {
    set src(value) {
        this.__src__ = value;
        queueMicrotask(() => this.onloadeddata && this.onloadeddata());
    }
}

class MockFontFace {
    constructor(name, source) {
        this.name = name;
        this.source = source;
    }

    load() { return Promise.resolve(this); }
}

global.Image = MockImage;
global.Audio = MockAudio;
global.FontFace = MockFontFace;
global.document = {fonts: {add() {}}};
global.window = {addEventListener() {}};
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

const enginePath = path.join(__dirname, "..", "src", "2dgameEngine.js");
const source = fs.readFileSync(enginePath, "utf8");
const api = vm.runInThisContext(`${source}\n({
    Vector2, ResourcesObject, GameObject, Animation, Animator,
    AnimatorConnection, CollisionBox, CircleCollisionBox, Input, Camera, engine
});`, {filename: enginePath});

async function testResources() {
    const resources = new api.ResourcesObject();
    resources.add("background", "assets/background.jpg");
    await resources.loadAll();
    assert.ok(resources.find("background") instanceof MockImage);
    assert.equal(resources.__loadalldone__, true);

    const nestedResources = new api.ResourcesObject();
    nestedResources.defaultPath = "images";
    nestedResources.add("player", "assets/player.png");
    await nestedResources.loadAll();
    assert.ok(nestedResources.find("player") instanceof MockImage);
    assert.equal(await nestedResources.load("images/player"), nestedResources.find("player"));

    resources.add("unknown.data", "assets/unknown.data");
    await assert.rejects(resources.load("unknown.data"), /type not supported/);
}

function testCollisions() {
    api.engine.clearLevel();
    const object1 = new api.GameObject(null, new api.Vector2(0, 0), 10, 10);
    const object2 = new api.GameObject(null, new api.Vector2(5, 5), 10, 10);
    object1.createCollisionBox();
    object2.createCollisionBox();
    assert.equal(object1.collisionBox.isCollideWith(object2.collisionBox), true);

    let enter = 0;
    let stay = 0;
    let exit = 0;
    object1.collisionBox.onCollisionEnter = () => enter++;
    object1.collisionBox.onCollisionStay = () => stay++;
    object1.collisionBox.onCollisionExit = () => exit++;
    api.engine.__handleCollisions__();
    api.engine.__handleCollisions__();
    object2.position.x = 20;
    api.engine.__handleCollisions__();
    assert.deepEqual({enter, stay, exit}, {enter: 1, stay: 1, exit: 1});

    const circle = new api.GameObject(null, new api.Vector2(8, 2), 6, 6);
    circle.createCircleCollisionBox(3);
    assert.equal(object1.collisionBox.isCollideWith(circle.collisionBox), true);
    assert.equal(circle.collisionBox.isCollideWith(object1.collisionBox), true);
}

function testObjectCopyAndHierarchy() {
    api.engine.clearLevel();
    const parent = new api.GameObject(null, new api.Vector2(10, 10), 20, 20);
    const child = new api.GameObject(null, new api.Vector2(15, 15), 5, 5);
    parent.setAsChild(child);
    parent.position.x = 20;
    assert.equal(child.position.x, 25);

    parent.style.color = "red";
    parent.createCollisionBox(new api.Vector2(2, 3));
    const clone = parent.copy();
    assert.notEqual(clone.style, parent.style);
    assert.equal(clone.collisionBox.parent, clone);
    assert.notEqual(clone.collisionBox, parent.collisionBox);
    assert.equal(clone.childs[0].parent, clone);
}

function testAnimator() {
    api.engine.clearLevel();
    const object = new api.GameObject();
    const idle = new api.Animation(object, [new MockImage()]);
    const run = new api.Animation(object, [new MockImage()]);
    const animator = new api.Animator([], object, "idle");
    animator.add("idle", idle);
    animator.add("run", run);
    animator.connect("idle", "run", values => values.running, true);
    assert.ok(animator.animations.idle.next[0] instanceof api.AnimatorConnection);
    assert.equal(animator.animations.idle.next[0].transition, true);

    animator.setValue("running", false);
    animator.__animator__();
    animator.setValue("running", true);
    animator.__animator__();
    assert.equal(animator.current, run);
}

function testInputAndCamera() {
    api.Input.mouseState = false;
    api.Input.mouseUp = true;
    assert.equal(api.Input.getMouseDown(), false);
    assert.equal(api.Input.getMouseUp(), true);
    assert.equal(api.Input.getMouseUp(), false);

    api.engine.clearLevel();
    const object = new api.GameObject(null, new api.Vector2(20, 30));
    api.Camera.main.position.x = 10;
    api.Camera.main.position.y = 15;
    assert.deepEqual([object.position.x, object.position.y], [20, 30]);
    assert.deepEqual([api.Camera.main.position.x, api.Camera.main.position.y], [10, 15]);
}

async function testPlantVsZombieStartup() {
    const context = {
        clearRect() {}, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
        translate() {}, scale() {}, rotate() {}, drawImage() {}, fillText() {}
    };
    const canvas = {
        width: 0,
        height: 0,
        getContext: () => context,
        setAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        getBoundingClientRect: () => ({left: 0, top: 0, width: 800, height: 500})
    };
    global.document.getElementById = () => canvas;

    const projectPath = path.join(__dirname, "..", "..", "Plant-vs.-Zombie", "assets", "src");
    vm.runInThisContext(fs.readFileSync(path.join(projectPath, "load.js"), "utf8"));
    vm.runInThisContext(fs.readFileSync(path.join(projectPath, "game.js"), "utf8"));
    await global.window.onload();

    assert.equal(api.engine.width, 800);
    assert.equal(api.engine.height, 500);
    assert.ok(api.engine.objects.some(object => object.image instanceof MockImage));
    assert.equal(api.engine.__running__, true);
    api.engine.stop();
}

(async () => {
    await testResources();
    testCollisions();
    testObjectCopyAndHierarchy();
    testAnimator();
    testInputAndCamera();
    await testPlantVsZombieStartup();
    console.log("2dGameEngine tests passed");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
