Resources.createFolder("images");
Resources.createFolder("animations");
Resources.add("images/background.png", "../imgs/Background.png");
Resources.add("images/bird1.png", "../imgs/Bird_01.png")
Resources.add("images/bird2.png", "../imgs/Bird_02.png");
Resources.add("images/bird3.png", "../imgs/Bird_03.png");
Resources.add("images/pipe.png", "../imgs/Pipe.png");
Resources.add("images/gameOver.png", "../imgs/GameOver.png");
Resources.add("images/getReady.png", "../imgs/GetReady.png");
Resources.add("images/ground.png", "../imgs/Ground.png");
Resources.add("images/playButton.png", "../imgs/PlayButton.png");
Resources.add("gameFont.ttf", "../bit5x3.ttf");

Resources.add("animations/birdFly.anim", ["images/bird1.png", "images/bird2.png", "images/bird3.png"]);
Resources.add("animations/bird.animator", ["animations/birdFly.anim"]);

(async () => {
    await Resources.loadAll(loadProgress => {
        console.log(`Loading: ${loadProgress}%`);
    });
})();