async function main() {
    engine.init("gameCanvas", 800, 600);
    await Resources.loadDone();
    const background = new GameObject("images/background.png", new Vector2(0, 0), 400, engine.height);
    const bg1 = new GameObject("images/background.png", new Vector2(400, 0), 400, engine.height);
    const bg2 = new GameObject("images/background.png", new Vector2(800, 0), 400, engine.height);
    const bg3 = new GameObject("images/background.png", new Vector2(1200, 0), 400, engine.height);
    background.setAsChild(bg1, bg2, bg3);
    background.update = function() {
        if(!this.visible || !this.moveBG) return;
        this.position.x -= 1;
        if(this.position.x <= -800) {
            this.position.x = 0;
        }
    }
    background.moveBG = false;
    
    new GameObject("images/ground.png", new Vector2(0, 500), engine.width, 100);
    new GameObject("images/playButton.png", new Vector2(engine.width / 2 - 50, 350), 100, 50);
    const bird = new GameObject(null, new Vector2(engine.width / 2 - 20, 250), 40, 30);
    new GameObject("images/getReady.png", new Vector2(engine.width / 2 - 100, 150), 200, 50);

    new Animator(bird, "animations/bird.animator");

    engine.loop();
}

main();