console.log("Game loaded");
class Game extends GameEngine {
    constructor(width, height) {
        super(width, height);
        this.start();
        new PreloadPages().startLoad(() => {
            // TODO: del test code
            this.clear();
            const lawn = new DaytimeLawn(73, 101);
            lawn.start();
        });
    }

}
window.onload = function() {
    const game = new Game(900, 600);

}

