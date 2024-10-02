var rollcap_x = 300;

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
        this.final_x = 575;
        this.start_x = 300;
    }
    
    async startLoad(callback) {
        // wait load page source done
        await Promise.all(LOADINGPAGES.map(src => engine.preload(src)));
        
        // create loading page objects
        this.create_loading_page();

        // set grass slider as 0
        this.LoadBar_grassObject.setSliderX(0);

        // rotate the SodRollCap
        this.SodRollCapObject.update = function() {
            this.rotation += 2;
            if(this.rotation > 360) this.rotation = 0;
        }
        
        // create animation path
        this.generate_path();

        // get total number of images
        for(let _class of Object.keys(this.animations_arts))
            this.total += PathGenerator.getLength(this.animations_arts[_class]);
        this.total += PRELOADIMAGES.length + AUDIOSOURCE.length;

        // load font and images
        this.load_font();
        this.load(callback);
    }

    create_loading_page() {
        this.titlescreenObject = GameObject.create("titlescreen.jpg", 0, 0, engine.width, engine.height);
        this.PvZ_LogoObject = GameObject.create("PvZ_Logo.png", 120, 20, 700, 100);
        this.LoadBar_dirtObject = GameObject.create("LoadBar_dirt.png", 310, 480, 300, 40);
        this.LoadBar_grassObject = GameObject.create("LoadBar_grass.png", 310, 470, 290, 20);
        this.SodRollCapObject = GameObject.create("SodRollCap.png", rollcap_x, 452, 40, 35); 
    }

    generate_path() {
        const generator = new PathGenerator();

        generator.setRoot(ZombieRootPath);
        this.generateZombiePath(generator);
        const ZombiePath = generator.path;

        generator.setRoot(PeashooterRootPath);
        generator.generate("Peashooter", "Peashooter_", 1, 13);
        const PeashooterPath = generator.path;

        this.animations_arts["Zombie"] = ZombiePath;
        this.animations_arts["Peashooter"] = PeashooterPath;
    }

    loadpageProgress(progress) {
        var current_x = this.start_x + (this.final_x - this.start_x) * progress;
        this.SodRollCapObject.setPosition(current_x, 453);
        this.LoadBar_grassObject.setSliderX(progress);
    }

    async load(callback) {
        await this.loadImages(PRELOADIMAGES);

        for(let _class of Object.keys(this.animations_arts)) 
            await this.loadAnimation(_class);
        
        await this.loadAudio();


        this.SodRollCapObject.visible = false;
        
        this.goMenuText = new GameObject(null, 429, 504, 450, 450);
        this.goMenuText.text = "开始游戏";
        this.goMenuText.style = {"font": "16px Arialn", "color": "yellow"};

        this.goMenuButton = new Button(engine.getImage("card_bk.jpg"), 305, 480, 290, 40, callback);
        this.goMenuButton.visible = false;
        
    }

    async loadAudio() {
        const promises = [];
        for(let i = 0; i < AUDIOSOURCE.length; i++) {
            const promise = engine.preloadAudio(AUDIOSOURCE[i].split('/').pop(), AUDIOSOURCE[i])
            .then(() => { this.loadpageProgress(++this.loaded / this.total); });
            promises.push(promise);
        }
        await Promise.all(promises);
    }

    async loadImages(images) {
        const promises = [];
        for(let i = 0; i < images.length; i++) {
            const promise = engine.preload(images[i])
            .then(() => { this.loadpageProgress(++this.loaded / this.total); });
            promises.push(promise);
        }
        await Promise.all(promises);
    }

    async loadAnimation(_class) {
        const promises = [];
        for(let j = 0; j < this.animations_arts[_class].length; j++) {
            var namePath = this.animations_arts[_class][j][0].split('/');
            var name = namePath[namePath.length - 2]
            const promise = new PreloadAnimation(_class, name, this.animations_arts[_class][j], () => { 
                this.loadpageProgress(++this.loaded / this.total); 
            });
            promises.push(promise);
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