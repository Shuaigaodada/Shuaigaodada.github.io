class Pixel {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
}

class PixelController {
    constructor(ctx, startx, starty, endx, endy) {
        this.ctx = ctx;
        this.originalData = ctx.getImageData(startx, starty, endx, endy);
        this.pixels = [];
    }

    load_pixels() {
        let data = this.originalData.data;
        for(let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            let a = data[i + 3];
            this.pixels.push(new Pixel(r, g, b, a));
        }
    }

    load_data(pixels) {
        let data = [];
        for(let i = 0; i < pixels.length; i++) {
            data.push(pixels[i].r);
            data.push(pixels[i].g);
            data.push(pixels[i].b);
            data.push(pixels[i].a);
        }
    }

    shift() {
        const newImageData = this.ctx.createImageData(this.originalData.width, this.originalData.height);
        let data = newImageData.data;
        // copy original pixels
        let newPixels = this.pixels.slice();

        // shift pixels
        for(let i = 0; i < newPixels.length; i++) {
            newPixels[i].r = 255 - newPixels[i].r;
            newPixels[i].g = 255 - newPixels[i].g;
            newPixels[i].b = 255 - newPixels[i].b;
        }

        // load data
        data = this.load_data(newPixels);
        return newImageData;
    }

}