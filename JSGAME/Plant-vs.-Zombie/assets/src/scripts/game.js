class Game extends GameEngine {
    constructor(width, height) {
        super(width, height);
        this.start();
        new PreloadPages().startLoad(() => {
            // TODO: del test code
            this.clear();
            new DaytimeLawn(72, 98);
        });
    }

}
window.onload = function() {
    const game = new Game(1200, 600);

}

