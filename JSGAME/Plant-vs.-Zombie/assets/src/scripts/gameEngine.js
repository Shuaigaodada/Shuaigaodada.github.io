class GameEngine {
    constructor(width, height) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;

        this.preimg = [];

        // game loop
        this.update = null;

        this.fps = 60;
    }

    /*
    * @param {string} imgsrc
    * @return {Promise} 
    */
    preload(imgsrc) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imgsrc;
            image.onload = () => {
                this.preimg.push(image);
                resolve();
            }
            image.onerror = () => reject(new Error(`Failed to load image'src=${imgsrc}`));
        })
    }

    /*
    * @param {Array<string>} imgsrcs
    * @return {Promise} 
    */
    preloadAll(imgsrcs) {
        return Promise.all(imgsrcs.map(src => this.preload(src)));
    }


    start() {
        setInterval(() => {
            this.update();
        }, 1000 / this.fps);
    }
}

