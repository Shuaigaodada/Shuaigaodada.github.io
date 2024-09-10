var rollcap_x = 440;
var grass_x = 450;

class PathGenerator {
    constructor() {
        this.root = null;
        this.path = [];
    }

    static getLength(p) {
        let sum = 0;
        for(let i = 0; i < p.length; i++) sum += p[i].length;
        return sum;
    }
    setRoot(root) { this.path = []; this.root = root; }

    generate(dn, fn, minr, maxr) {
        if(this.root === null) { console.error("Root is not set"); return; }
        let node = this.root;
        let path = [];

        for(let i = minr; i <= maxr; i++) {
            let next = join(node, dn);
            path.push(join(next, fn + i + ".png"));
        }
        this.path.push(path);
    }
}

class PreloadPages {
    constructor() {
        this.titlescreenObject = null;
        this.PvZ_LogoObject = null;
        this.LoadBar_dirtObject = null;
        this.LoadBar_grassObject = null;
        this.SodRollCapObject = null;
        this.animations_arts = [];
        this.loaded = 0;
        this.total = 0;
        this.final_x = 715;
        this.start_x = 450;
    }
    
    async startLoad() {
        // wait load page source done
        await Promise.all(LOADINGPAGES.map(src => _engine.preload(src)));
        
        // create loading page objects
        this.create_loading_page();

        // set grass slider as 0
        this.LoadBar_grassObject.setSlider(0);

        // rotate the SodRollCap
        this.SodRollCapObject.update = function() {
            this.rotation += 2;
            if(this.rotation > 360) this.rotation = 0;
        }
        
        // create animation path
        this.generate_path();

        // get total number of images
        for(let arts of this.animations_arts)
            this.total += PathGenerator.getLength(arts);
        this.total += PRELOADIMAGES.length;

        // load font and images
        this.load_font();
        this.load();
    }

    create_loading_page() {
        this.titlescreenObject = OBJECT.create("titlescreen.jpg", 0, 0, engine.canvas.width, engine.canvas.height);
        this.PvZ_LogoObject = OBJECT.create("PvZ_Logo.png", 220, 0, 800, 140);
        this.LoadBar_dirtObject = OBJECT.create("LoadBar_dirt.png", 450, 480, 300, 40);
        this.LoadBar_grassObject = OBJECT.create("LoadBar_grass.png", 450, 470, 290, 20);
        this.SodRollCapObject = OBJECT.create("SodRollCap.png", rollcap_x, 453, 40, 35);  
    }

    generate_path() {
        const generator = new PathGenerator();

        generator.setRoot(ZombieRootPath);
        this.generateZombiePath(generator);
        const ZombiePath = generator.path;

        generator.setRoot(PeashooterRootPath);
        generator.generate("Peashooter", "Peashooter_", 1, 13);
        const PeashooterPath = generator.path;

        this.animations_arts.push(ZombiePath, PeashooterPath);
    }

    loadpageProgress(progress) {
        var current_x = this.start_x + (this.final_x - this.start_x) * progress;
        this.SodRollCapObject.setPosition(current_x, 453);
        this.LoadBar_grassObject.setSlider(progress);
    }

    async load() {
        await this.loadImages(PRELOADIMAGES);
        for(let arts of this.animations_arts) {
            await this.loadAnimation(arts);
        }

        this.SodRollCapObject.visible = false;
        this.goMenuButton = new Button(null, 558, 503, 300, 50, () => {});
        this.goMenuButton.text = "开始游戏";
        this.goMenuButton.style = {"font": "16px Arialn", "color": "yellow"};
    }

    async loadImages(images) {
        const promises = [];
        for(let i = 0; i < images.length; i++) {
            const promise = _engine.preload(images[i])
            .then(() => { this.loadpageProgress(++this.loaded / this.total); });
            promises.push(promise);
        }
        await Promise.all(promises);
    }

    async loadAnimation(animation_arts) {
        const promises = [];
        for(let i = 0; i < animation_arts.length; i++) {
            for (let j = 0; j < animation_arts[i].length; j++) {
                const promise = engine.preload(animation_arts[i][j])
                .then(() => { this.loadpageProgress(++this.loaded / this.total); });
                promises.push(promise);
            }
        }
        await Promise.all(promises);
    }

    generateZombiePath(generator) {
        generator.generate("Back", "zombiec", 0, 5);
        generator.generate("Borm", "BoomDie_", 1, 20);
        generator.generate("Die", "ZombieDie_", 1, 10);
        generator.generate("Eat", "ZombieAttack_", 1, 21);
        generator.generate("LostHead", "ZombieHead_", 1, 12);
        generator.generate("LostHeadEat", "ZombieLostHeadAttack_", 1, 11);
        generator.generate("LostHeadMove", "ZombieLostHead_", 1, 18);
        generator.generate("Move1", "Zombie2_", 1, 31);
        generator.generate("Move2", "Zombie_", 1, 22);
    }

    load_font() {
        for(let i = 0; i < FONTS.length; i++) {
            document.fonts.add(FONTS[i]);
            FONTS[i].load();
        }
    }
}