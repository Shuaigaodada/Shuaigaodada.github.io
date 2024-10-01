console.log("Game loaded");

window.onload = function() {
    engine.init("gameCanvas", 900, 600);
    engine.fps = 60;
    engine.start();
    new PreloadPages().startLoad(() => {
        // TODO: del test code
        engine.clear();
        const lawn = new DaytimeLawn(73, 101);
        lawn.start();
    });

}

