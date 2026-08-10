class Vector2 {
    /**
     * 二维向量类
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @example new Vector2(0, 0);
     */
    constructor(x, y) {
        /** x 坐标 @type {number} */
        this._x = x;
        /** y 坐标 @type {number} */
        this._y = y;
    }

    /** 设置x函数 */
    __setx__(value) { this._x = value; }
    /** 设置y函数 */
    __sety__(value) { this._y = value; }
    /** 获取x函数 */
    __getx__() { return this._x; }
    /** 获取y函数 */
    __gety__() { return this._y; }

    copy() {
        return new Vector2(this.x, this.y);
    }

    /**
     * 获取x坐标
     * @returns {number}
     * @example let x = vector.x;
     */
    get x() { return this.__getx__(); }
    /**
     * 设置x坐标
     * @param {number} value
     * @example vector.x = 10;
     */
    set x(value) { this.__setx__(value); }
    /**
     * 获取y坐标
     * @returns {number}
     * @example let y = vector.y;
     */
    get y() { return this.__gety__(); }
    /**
     * 设置y坐标
     * @param {number} value
     * @example vector.y = 10;
     */
    set y(value) { this.__sety__(value); }
}

class Vector3 {
    /**
     * 三维向量类
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {number} z - z 坐标
     * @example new Vector3(0, 0, 0);
     */
    constructor(x, y, z) {
        /** x 坐标 @type {number} */
        this._x = x;
        /** y 坐标 @type {number} */
        this._y = y;
        /** z 坐标 @type {number} */
        this._z = z;

    }

    /** 设置x函数 */
    __setx__(value) { this._x = value; }
    /** 设置y函数 */
    __sety__(value) { this._y = value; }
    /** 设置z函数 */
    __setz__(value) { this._z = value; }
    /** 获取x函数 */
    __getx__() { return this._x; }
    /** 获取y函数 */
    __gety__() { return this._y; }
    /** 获取z函数 */
    __getz__() { return this._z; }

    copy() {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * 获取x坐标
     * @returns {number}
     * @example let x = vector.x;
    */
    get x() { return this.__getx__(); }
    /**
     * 设置x坐标
     * @param {number} value
     * @example vector.x = 10;
    */
    set x(value) { this.__setx__(value); }
    /**
     * 获取y坐标
     * @returns {number}
     * @example let y = vector.y;
     */
    get y() { return this.__gety__(); }
    /**
     * 设置y坐标
     * @param {number} value
     * @example vector.y = 10;
     */
    set y(value) { this.__sety__(value); }
    /**
     * 获取z坐标
     * @returns {number}
     * @example let z = vector.z;
     */
    get z() { return this.__getz__(); }
    /**
     * 设置z坐标
     * @param {number} value
     * @example vector.z = 10;
     */
    set z(value) { this.__setz__(value); }
}

class AnimatorConnection {
    /**
     * 动画连接类
     * @param {string} anim - 动画名称
     * @param {function} condition - 条件函数
     * @param {boolean} transition - 是否过度
     * @param {function} callback - 回调函数
     * @example new AnimatorConnection("walk", () => true, true, () => {});
     */
    constructor(anim, condition, transition, callback) {
        this.anim = anim;
        this.condition = condition;
        this.transition = transition;
        this.callback = callback;
    }
}

class ResourcesObject {
    /** 图片文件类型 @type {string[]} */
    static ImageTypes = [
        "png", "jpg", "jpeg", "gif", "bmp", "webp",
        "svg", "ico", "tiff", "psd", "raw", "heif", "indd",
        "ai", "eps", "pdf", "jfif", "pjpeg", "pjp",
        "avif", "apng", "flif", "xcf", "pat", "cdw",
        "svgz", "wmf", "emf", "otg", "odg", "odi",
    ];
    /** 音频文件类型 @type {string[]} */
    static AudioTypes = [
        "mp3", "wav", "ogg", "flac", "aac", "wma", "m4a", "aiff", "ape", "amr",
        "mid", "midi", "mka", "opus", "ra", "rm", "rmvb", "vqf", "wv",
    ];

    /** 动画文件类型 @type {string[]} */
    static AnimationTypes = ["anim", "animation", "ani", "frames", "fms"];

    /** 动画控制器文件类型 @type {string[]} */
    static AnimatorTypes = ["animator", "anmt", "animators"]

    /** 字体文件类型 @type {string[]} */
    static FontTypes = ["ttf", "otf", "woff", "woff2", "eot", "TTF", "OTF", "WOFF", "WOFF2", "EOT", "ttc", "TTC"];

    /** 游戏资源管理器类 */
    constructor() {
        /** 资源文件结构 @type {Object} */
        this.__files__ = {};
        /** 默认路径 @type {string} */
        this.defaultPath = "";
        this.__loadalldone__ = false;
        /** 当前批次的加载任务 @type {Promise} */
        this.__loadPromise__ = Promise.resolve();
        /** 正在加载或已经加载的资源 @type {Object.<string, Promise>} */
        this.__loading__ = {};
    }

    /**
     * 等待加载所有资源文件完成
     * @returns {Promise} - 返回一个Promise对象，当所有资源加载完成时解析
     * @example await Resources.loadDone();
     */
    async loadDone() {
        return this.__loadPromise__;
    }

    /**
     * 加载所有资源文件并更新进度
     * @param {function} updateProgress - 更新进度的回调函数，参数为当前进度百分比
     * @param {function} callback - 加载完成后的回调函数
     * @param {boolean} async - 是否异步加载
     * @returns {Promise} - 返回一个Promise对象当所有资源加载完成时解析
     * @example Resources.loadAll((progress) => console.log(progress));
     */
    async loadAll(updateProgress, callback=null, _async=false) {
        const files = this.__files__;
        const totalFiles = this.countFiles(files);
        let loadedFiles = 0;
        let filenames = [];

        const collectFile = (path, object) => {
            const isFolder = object && typeof object === "object" && !Array.isArray(object) &&
                Object.getPrototypeOf(object) === Object.prototype;
            if(isFolder) {
                for(const key in object) {
                    collectFile([...path, key], object[key]);
                }
            } else {
                filenames.push(path.join("/"));
            }
        };

        collectFile([], files);
        this.__loadalldone__ = false;
        this.__loadPromise__ = Promise.all(filenames.map(async filename => {
            await this.load(filename);
            loadedFiles++;
            try {
                updateProgress && updateProgress(totalFiles ? loadedFiles / totalFiles * 100 : 100);
            } catch(error) {
                console.error("Resources.LoadAll: Error in updateProgress callback");
                console.error(error);
            }
        })).then(async () => {
            this.__loadalldone__ = true;
            if(_async)
                callback && await callback();
            else callback && callback();
        });
        return this.__loadPromise__;
    }

    /**
     * 添加资源文件
     * @param {string} filename - 资源文件的路径和名称
     * @param {string} src - 资源文件的源路径
     * @example Resources.add("player.jpg", "assets/player.jpg");
     */
    add(filename, src) {
        // 规范化路径
        filename = this.resolvePath(filename);
        delete this.__loading__[filename];
        
        let path = filename.split("/");
        filename = path.pop();

        let current = this.__files__;
        for(const folder of path) {
            if(current[folder] === undefined) current[folder] = {};
            current = current[folder];
        }
        current[filename] = src;
    }

    /**
     * 创建文件夹
     * @param {string} folder - 文件夹路径
     * @example Resources.createFolder("images");
     */
    createFolder(folder) {
        // 规范化路径
        folder = this.resolvePath(folder);

        let path = folder.split("/");
        let current = this.__files__;

        for(let i = 0; i < path.length; i++) {
            if(current[path[i]] === undefined)
                current[path[i]] = {}; // 创建文件夹

            current = current[path[i]];
        }
    }

    /**
     * 加载资源文件
     * @param {string} filename - 资源文件的路径和名称
     * @returns {Promise} - 返回一个Promise对象，解析为加载的资源
     * @example Resources.load("player.jpg");
     */
    load(filename) {
        // 规范化路径
        const resourcePath = this.resolvePath(filename);
        if(this.__loading__[resourcePath]) return this.__loading__[resourcePath];

        const promise = new Promise((resolve, reject) => {

            // 将filename转换为路径
            let path = resourcePath.split("/");
            const filename = path.pop();

            // 切换到指定路径
            let current = this.cdPath(path);
            
            // 当路径不存在时，记录错误并返回
            if(current === null || current[filename] === undefined) {
                console.error(`Resource.Load: ${filename} not found`);
                reject(new Error(`Resource.Load: ${filename} not found`));
                return;
            }

            let src = current[filename];
            let type = filename.split(".").pop().toLowerCase();
            const supportedTypes = [
                ...ResourcesObject.ImageTypes,
                ...ResourcesObject.AudioTypes,
                ...ResourcesObject.AnimationTypes,
                ...ResourcesObject.AnimatorTypes,
                ...ResourcesObject.FontTypes
            ].map(type => type.toLowerCase());
            if(!supportedTypes.includes(type) && typeof src === "string")
                type = src.split("?")[0].split(".").pop().toLowerCase();
            
            if(ResourcesObject.ImageTypes.includes(type)) {
                this.handleLoadImage(path, filename, src, resolve, reject);
            } else if(ResourcesObject.AudioTypes.includes(type)) {
                this.handleLoadAudio(path, filename, src, resolve, reject);
            } else if(ResourcesObject.AnimationTypes.includes(type)) {
                this.handleLoadAnimation(path, filename, src, resolve, reject);
            } else if(ResourcesObject.AnimatorTypes.includes(type)) {
                this.handleLoadAnimator(path, filename, src, resolve, reject);
            } else if(ResourcesObject.FontTypes.includes(type)) {
                this.handleLoadFont(path, filename, src, resolve, reject);
            } else {
                // 当资源文件类型不支持时，记录错误并返回
                console.error(`Resource.Load: ${filename} type not supported`);
                reject(new Error(`Resource.Load: ${filename} type not supported`));
            }
        });
        this.__loading__[resourcePath] = promise;
        promise.catch(() => { delete this.__loading__[resourcePath]; });
        return promise;
    }  
    
    /**
     * 处理加载图片
     * @param {string} path - 图片文件路径
     * @param {string} filename - 图片文件名称
     * @param {Image} image - 图片对象
     * @param {function} resolve - 解析函数
     * @param {function} reject - 拒绝函数
     * @example Resources.handleLoadImage(current, "player.jpg", image, resolve, reject);
     */
    handleLoadImage(path, filename, image, resolve, reject) {
        // 加载图片文件
        let img = new Image();
        img.onload = () => {
            resolve(img);
            this.cdPath(path)[filename] = img;
        };
        img.onerror = () => {
            console.error(`Resource.Load: Failed to load image ${filename}`);
            reject(new Error(`Resource.Load: Failed to load image ${filename}`));
        };
        img.src = image;
    }

    /**
     * 处理加载音频
     * @param {string} path - 音频文件路径
     * @param {string} filename - 音频文件名称
     * @param {Audio} audio - 音频对象
     * @param {function} resolve - 解析函数
     * @param {function} reject - 拒绝函数
     * @example Resources.handleLoadAudio(current, "bgm.mp3", audio, resolve, reject);
     */
    handleLoadAudio(path, filename, src, resolve, reject) {
        // 加载音频文件
        let audio = new Audio();
        audio.onloadeddata = () => {
            resolve(audio);
            this.cdPath(path)[filename] = audio;
        };
        audio.onerror = () => {
            console.error(`Resource.Load: Failed to load audio ${filename}`);
            reject(new Error(`Resource.Load: Failed to load audio ${filename}`));
        };
        audio.src = src;
    }

    /**
     * 处理加载字体
     * @param {string} path - 字体文件路径
     * @param {string} filename - 字体文件名称
     * @param {string} src - 字体文件源路径
     * @param {function} resolve - 解析函数
     * @param {function} reject - 拒绝函数
     * @example Resources.handleLoadFont(current, "font.ttf", "assets/font.ttf", resolve, reject);
     */
    handleLoadFont(path, filename, src, resolve, reject) {
        let font = new FontFace(filename, `url(${src})`);
        font.load().then(() => {
            document.fonts.add(font);
            resolve(font);
            this.cdPath(path)[filename] = font;
        }).catch(error => {
            console.error(`Resource.Load: Failed to load font ${filename}`);
            reject(new Error(`Resource.Load: Failed to load font ${filename}`));
        });
    }

    /**
     * 处理加载动画
     * @param {string} path - 动画文件路径
     * @param {string} filename - 动画文件名称
     * @param {Array} frames - 动画帧数组
     * @param {function} resolve - 解析函数
     * @param {function} reject - 拒绝函数
     * @example Resources.handleLoadAnimation(current, "player.anim", frames, resolve, reject);
     */
    handleLoadAnimation(path, filename, frames, resolve, reject) {
        let framePromises = frames.map(async frame => {
            if(typeof this.rawfind(frame) === "string")
                await this.load(frame);
            return this.rawfind(frame);
        });

        Promise.all(framePromises).then((frames) => {
            this.cdPath(path)[filename] = frames;
            resolve(frames);
        }).catch(error => {
            console.error(`Resource.Load: Failed to load animation ${error}`);
            reject(new Error(`Resource.Load: Failed to load animation ${error}`));
        });
    }

    /**
     * 处理加载动画控制器
     * @param {string} path - 动画控制器文件路径
     * @param {string} filename - 动画控制器文件名称
     * @param {Array} anims - 动画路径数组
     * @param {function} resolve - 解析函数
     * @param {function} reject - 拒绝函数
     * @example Resources.handleLoadAnimator(current, "player.animator", anims, resolve, reject);
     */
    handleLoadAnimator(path, filename, anims, resolve, reject) {
        let animPromises = anims.map(async anim => {
            await this.load(anim);
            return anim;
        });
        Promise.all(animPromises).then(() => {
            this.cdPath(path)[filename] = anims;
            resolve(anims);
        }).catch(error => {
            console.error(`Resource.Load: Failed to load animator ${error}`);
            reject(new Error(`Resource.Load: Failed to load animator ${error}`));
        });
    }

    /**
     * 查找资源文件 不检查任何错误
     * @param {string} filename - 资源文件的路径和名称
     * @returns {*} - 返回找到的资源文件
     * @example Resources.rawfind("player.jpg");
     */
    rawfind(filename) {
        // 规范化路径
        filename = this.resolvePath(filename);

        // 将filename转换为路径
        let path = filename.split("/");
        filename = path.pop();

        // 切换到指定路径
        let current = this.cdPath(path);

        return current ? current[filename] : undefined;
    }

    /**
     * 查找资源文件
     * @param {string} filename - 资源文件的路径和名称
     * @returns {*} - 返回找到的资源文件
     * @example Resources.find("image/player.jpg");
     */
    find(filename) {
        // 规范化路径
        filename = this.resolvePath(filename);

        // 将filename转换为路径
        let path = filename.split("/");
        filename = path.pop();

        // 切换到指定路径
        let current = this.cdPath(path);
        if(current === null || current[filename] === undefined) {
            console.error(`Resource.find: ${filename} not found`);
            return null;
        } else if(typeof current[filename] === 'string') {
            console.error(`Resource.find: ${filename} did not loaded`);
            return null;
        }

        return current[filename];
    }

    /**
     * 检查是否是路径
     * @param {string} p - 路径字符串
     * @returns {boolean} - 返回是否是路径
     * @example Resources.isPath("images/player.jpg");
     */
    isPath(p) { return p.split("/").length > 1; }

    /**
     * 切换到指定路径
     * @param {array|string} p - 路径数组或路径字符串
     * @returns {object} - 返回路径对象
     * @example Resources.cdPath("images/player.jpg"); return {player.jpg: "assets/player.jpg"};
     */
    cdPath(p) {
        if(!p || (Array.isArray(p) && !p.length)) return this.__files__;
        let current = this.__files__;

        p = this.normalizePath(p);

        // 将路径转为数组
        let path = null
        if(typeof p === 'string') 
            path = p.split("/");
        else path = p;

        // 切换到指定路径
        for(let i = 0; i < path.length; i++) {
            if(current[path[i]] === undefined) {
                // 当路径不存在时，记录错误并返回
                console.error(`Path ${path.slice(0, i + 1).join("/")} does not exist`);
                return null;
            }
            current = current[path[i]];
        }

        return current;
    }
    
    /**
     * 计算资源文件的总数
     * @param {object} obj - 资源文件对象
     * @returns {number} - 返回资源文件的总数
     * @example Resources.countFiles(obj);
     */
    countFiles(obj) {
        let count = 0;
        for(const key in obj) {
            const value = obj[key];
            const isFolder = value && typeof value === "object" && !Array.isArray(value) &&
                Object.getPrototypeOf(value) === Object.prototype;
            if(isFolder)
                count += this.countFiles(value);
            else count++;
        }
        return count;
    }

    /**
     * 获取包含默认目录的规范资源路径
     * @param {string} path - 资源路径
     * @returns {string} - 完整资源路径
     */
    resolvePath(path) {
        path = this.normalizePath(path);
        const defaultPath = this.normalizePath(this.defaultPath);
        if(!defaultPath || path === defaultPath || path.startsWith(`${defaultPath}/`))
            return path;
        return this.normalizePath(`${defaultPath}/${path}`);
    }

    /**
     * 规范化路径，处理相对路径
     * @param {string} path - 路径字符串
     * @returns {string} - 返回规范化后的路径
     * @example Resources.normalizePath("./player.jpg");
     */
    normalizePath(path) {
        const parts = typeof path === "string" ? path.split('/') : path;
        const stack = [];
        for(const part of parts) {
            if(part === '.' || part === '') continue;
            if(part === '..') stack.pop();
            else stack.push(part);
        }
        return stack.join('/');
    }
}

class GameEngine {
    /** 游戏引擎类，负责管理游戏的整体逻辑、绘制、资源加载等 */
    constructor() {
        /** 游戏对象数组 @type {GameObject[]} */
        this.objects = [];
        /** 保存的关卡 @type {Object.<string, array>} */
        this.savedLevels = {};
        /** 更新事件 @type {Object.<string, function>} */
        this.updateEvents = {};
        /** 帧率 @type {number} */
        this.fps = 60;
        /** 当前时间 @type {number} */
        this.__time__ = 0.0;
        /** 时间增量 @type {number} */
        this.deltaTime = 0.0;
        /** 游戏循环是否正在运行 @type {boolean} */
        this.__running__ = false;
        /** 当前动画帧编号 @type {number|null} */
        this.__animationFrame__ = null;
        /** 绘制顺序是否需要更新 @type {boolean} */
        this.__orderDirty__ = true;
        /** 上一帧的碰撞组合 @type {Map<string, CollisionBox[]>} */
        this.__collisionPairs__ = new Map();

        /** 初始画布宽度 @type {number} */
        this.initalWidth = 0;
        /** 初始画布高度 @type {number} */
        this.initalHeight = 0;
    }

    /**
     * 初始化引擎
     * @param {string} canvas - 画布对象
     * @param {number} width - 画布的宽度
     * @param {number} height - 画布的高度
     * @example engine.init("canvas", 800, 600);
     */
    init(canvas, width, height) {
        if(this.canvas) {
            this.canvas.removeEventListener("pointerdown", this.__mouseDown__);
            this.canvas.removeEventListener("pointerup", this.__mouseUp__);
            this.canvas.removeEventListener("pointercancel", this.__mouseUp__);
            this.canvas.removeEventListener("pointermove", this.__mouseMove__);
        }
        this.canvas = document.getElementById(canvas);
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        this.initalWidth = width;
        this.initalHeight = height;

        this.__mouseDown__ = this.__mouseDown__.bind(this);
        this.__mouseUp__ = this.__mouseUp__.bind(this);
        this.__mouseMove__ = this.__mouseMove__.bind(this);
        this.__resize__ = this.__resize__.bind(this);

        
        this.canvas.setAttribute("tabindex", "0");
        this.canvas.addEventListener("pointerdown", this.__mouseDown__);
        this.canvas.addEventListener("pointerup", this.__mouseUp__);
        this.canvas.addEventListener("pointercancel", this.__mouseUp__);
        this.canvas.addEventListener("pointermove", this.__mouseMove__);

        Input.initialize();        
    }

    /**
     * 注册事件
     * @param {string} event - 事件名称
     * @param {function} callback - 回调函数
     * @example engine.registerEvent("update", () => {});
     */
    registerEvent(event, callback) {
        this.updateEvents[event] = callback;
    }

    /**
     * 移除事件
     * @param {string} event - 事件名称
     * @example engine.removeEvent("update");
     */
    removeEvent(event) {
        delete this.updateEvents[event];
    }

    /**
     * 调整画布大小
     * @param {number} width - 画布的宽度
     * @param {number} height - 画布的高度
     * @example engine.resize(800, 600);
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        this.__resize__();
    }

    /**
     * 保存关卡
     * @param {string} name - 关卡名称
     * @example engine.saveLevel("level1");
     */
    saveLevel(name) {
        this.savedLevels[name] = [...this.objects];
    }

    /**
     * 加载关卡
     * @param {string} name - 关卡名称
     * @example engine.loadLevel("level1");
     */
    loadLevel(name) {
        this.objects = this.savedLevels[name] ? [...this.savedLevels[name]] : [];
        this.__collisionPairs__.clear();
        this.__orderDirty__ = true;
    }

    /**
     * 清除关卡
     * @example engine.clearLevel();
     */
    clearLevel() {
        this.objects = [];
        this.__collisionPairs__.clear();
        this.__orderDirty__ = true;
    }

    /**
     * 睡眠指定时间
     * @param {number} ms - 毫秒数
     * @returns {Promise} - 返回一个Promise对象
     * @example await engine.sleep(1000);
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 开始游戏循环
     * @example engine.loop();
     */
    loop() {
        if(this.__running__) return;
        this.__running__ = true;
        this.__time__ = performance.now();

        const frame = (time) => {
            if(!this.__running__) return;
            const frameTime = 1000 / Math.max(1, this.fps);
            const elapsed = time - this.__time__;
            if(elapsed >= frameTime)
                this.__update__(time - elapsed % frameTime);
            this.__animationFrame__ = requestAnimationFrame(frame);
        };
        this.__animationFrame__ = requestAnimationFrame(frame);
    }

    /**
     * 停止游戏循环
     * @example engine.stop();
     */
    stop() {
        this.__running__ = false;
        if(this.__animationFrame__ !== null) {
            cancelAnimationFrame(this.__animationFrame__);
            this.__animationFrame__ = null;
        }
    }

    /**
     * 处理滑动效果
     * @param {GameObject} object - 游戏对象
     * @example engine.handleSlider(object);
     * @private
     */
    handleSlider(object) {
        this.ctx.beginPath();
        this.ctx.rect(-object.width / 2, -object.height / 2, object.width * object.sliders.x, object.height * object.sliders.y);
        this.ctx.clip();
    }

    /**
     * 处理旋转效果
     * @param {GameObject} object - 游戏对象
     * @example engine.handleRotation(object);
     * @private
     */
    handleRotation(object) {
        const x = object.position.x - Camera.main.position.x;
        const y = object.position.y - Camera.main.position.y;
        this.ctx.translate(x + object.width / 2, y + object.height / 2);
        this.ctx.scale(object.flip.x ? -1 : 1, object.flip.y ? -1 : 1);
        this.ctx.rotate(object.rotation * Mathf.PI / 180);
    }

    /**
     * 处理文字效果
     * @param {GameObject} object - 游戏对象
     * @example engine.handleText(object);
     * @private
     */
    handleText(object) {
        this.ctx.save();
        this.ctx.font = object.style.font;
        this.ctx.fillStyle = object.style.color;
        this.ctx.globalAlpha = object.opacity;
        this.ctx.fillText(object.text, object.position.x - Camera.main.position.x, object.position.y - Camera.main.position.y);
        this.ctx.restore();
    }

    /**
     * 绘制游戏对象
     * @param {GameObject} object - 游戏对象
     * @private
     */
    __draw__(object) {
        // 空对象
        if(!object.image && !object.text) return;
        // 处理文字对象
        if(object.text) this.handleText(object);
        if(!object.image) return;
        const x = object.position.x - Camera.main.position.x;
        const y = object.position.y - Camera.main.position.y;
        if(!object.rotation && (x + object.width < 0 || y + object.height < 0 || x > this.width || y > this.height))
            return;
        // 处理图片对象
        this.ctx.save();
        this.ctx.globalAlpha = object.opacity !== undefined ? object.opacity : 1;
        this.handleRotation(object);
        this.handleSlider(object);
        this.ctx.drawImage(object.image, -object.width / 2, -object.height / 2, object.width, object.height); // 绘制图像
        this.ctx.restore();
    }

    /**
     * 更新游戏状态
     * @private
     */
    __update__(time = performance.now()) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 更新deltaTime
        this.deltaTime = Math.min((time - this.__time__) / 1000, 0.1);
        this.__time__ = time;

        if(this.__orderDirty__) {
            this.objects.sort((a, b) => a.order - b.order);
            this.__orderDirty__ = false;
        }
        for(let object of [...this.objects]) {
            if(!object.available) continue;
            object.__update__ && object.__update__();
        }

        this.__handleCollisions__();
        Camera.main.__update__();

        for(let object of this.objects)
            if(object.available && object.visible) this.__draw__(object);

        // 特殊注册事件 此事件在所有对象更新之后update结尾调用
        for(let gameEvent of Object.values(this.updateEvents))
            gameEvent();
    }

    /**
     * 统一处理碰撞事件，确保每对碰撞箱每帧只检测一次
     * @private
     */
    __handleCollisions__() {
        const colliders = this.objects
            .filter(object => object.available && !object.destroyed && object.collisionBox && object.collisionBox.available)
            .map(object => object.collisionBox);
        const currentPairs = new Map();

        for(let i = 0; i < colliders.length; i++) {
            for(let j = i + 1; j < colliders.length; j++) {
                const box1 = colliders[i];
                const box2 = colliders[j];
                if(!box1.available || !box2.available || box1.parent.destroyed || box2.parent.destroyed)
                    continue;
                if(!box1.isCollideWith(box2)) continue;

                const key = box1.id < box2.id ? `${box1.id}:${box2.id}` : `${box2.id}:${box1.id}`;
                currentPairs.set(key, [box1, box2]);
                if(this.__collisionPairs__.has(key)) {
                    box1.onCollisionStay(box2.parent);
                    box2.onCollisionStay(box1.parent);
                } else {
                    box1.__enter__.add(box2.parent);
                    box2.__enter__.add(box1.parent);
                    box1.onCollisionEnter(box2.parent);
                    box2.onCollisionEnter(box1.parent);
                }
            }
        }

        for(const [key, boxes] of this.__collisionPairs__) {
            if(currentPairs.has(key)) continue;
            const [box1, box2] = boxes;
            box1.__enter__.delete(box2.parent);
            box2.__enter__.delete(box1.parent);
            box1.onCollisionExit(box2.parent);
            box2.onCollisionExit(box1.parent);
        }
        this.__collisionPairs__ = currentPairs;
    }

    /**
     * 将页面坐标转换为游戏世界坐标
     * @param {PointerEvent} event - 指针事件
     * @returns {Vector2} - 世界坐标
     * @private
     */
    __getPointerPosition__(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width ? this.canvas.width / rect.width : 1;
        const scaleY = rect.height ? this.canvas.height / rect.height : 1;
        return new Vector2(
            (event.clientX - rect.left) * scaleX + Camera.main.position.x,
            (event.clientY - rect.top) * scaleY + Camera.main.position.y
        );
    }

    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} event - 鼠标按下事件对象
     * @private
     */
    __mouseDown__(event) {
        const position = this.__getPointerPosition__(event);
        if(this.canvas.setPointerCapture && event.pointerId !== undefined)
            this.canvas.setPointerCapture(event.pointerId);
        for(let object of this.objects)
            if(object.available) object.onMouseDown(position);
        Input.mouseState = true;
        Input.mouseUp = false;
        Input.mousePosition = position;
    }

    /**
     * 处理鼠标松开事件
     * @param {MouseEvent} event - 鼠标松开事件对象
     * @private
     */
    __mouseUp__(event) {
        const position = this.__getPointerPosition__(event);
        for(let object of this.objects)
            if(object.available) object.onMouseUp(position);
        Input.mouseState = false;
        Input.mouseUp = true;
        Input.mousePosition = position;
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标移动事件对象
     * @private
     */
    __mouseMove__(event) {
        const position = this.__getPointerPosition__(event);
        for(let object of this.objects)
            if(object.available) object.onMouseMove(position);
        Input.mousePosition = position;
    }

    /**
     * 当窗口调整大小
     * @private
     */
    __resize__() {
        const scaleX = this.canvas.width / this.initalWidth;
        const scaleY = this.canvas.height / this.initalHeight;

        for(let object of this.objects) {
            object.position.x *= scaleX;
            object.position.y *= scaleY;
            object.width *= scaleX;
            object.height *= scaleY;
        }
        
        this.initalWidth = this.canvas.width;
        this.initalHeight = this.canvas.height;
    }
}


class GameObject {
    /**
     * 游戏对象类
     * @param {string|Image} img - 图像或图像路径
     * @param {Vector2} vector - 位置向量
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @example new GameObject(Resources.find("player.jpg"), new Vector2(0, 0), 50, 50);
     */
    constructor(img = null, vector = null, width = 0, height = 0) {
        /** 位置向量 @type {Vector2} */
        this.position = vector ? vector.copy() : new Vector2(0, 0);
        /** 宽度 @type {number} */
        this.width = width;
        /** 高度 @type {number} */
        this.height = height;
        /** 图像 @type {Image|null} */
        this.image = this.__checkimage__(img);
        /** 文本内容 @type {string|null} */
        this.text = null;
        /** 样式 @type {Object} */
        this.style = {"font": "30px Arial", "color": "black"};
        /** 标签 @type {string} */
        this.tag = "";
        /** 绘制顺序 @type {number} */
        this.__order__ = 0;
        /** 旋转角度 @type {number} */
        this.rotation = 0;
        /** 不透明度 @type {number} */
        this.opacity = 1;
        /** 滑动比例 @type {Object} */
        this.sliders = {x: 1, y: 1};
        /** 翻转 @type {Object} */
        this.flip = {x: false, y: false};
        /** 碰撞盒 @type {CollisionBox|null} */
        this.collisionBox = null;
        /** 子对象 @type {GameObject[]} */
        this.childs = [];
        /** 父对象 @type {GameObject|null} */
        this.parent = null;
        /** 是否可见 @type {boolean} */
        this.__visible__ = true;
        /** 是否已销毁 @type {boolean} */
        this.destroyed = false;
        /** 对象的偏移 @type {Vector2} */
        this.offset = new Vector2(0, 0);
        /** 动画控制器 @type {Animator|null} */
        this.animator = null;
        /** 对象预制件 @type {GameObject|null} */
        this.__prefab__ = null;
        /** 对象是否可用 @type {boolean} */
        this.available = true;

        this.position.__setx__ = this.__setx__.bind(this);
        this.position.__sety__ = this.__sety__.bind(this);

        engine.objects.push(this);
        engine.__orderDirty__ = true;
    }

    /**
     * 更新绘制顺序
     * @param {number} value - 绘制顺序
     */
    set order(value) {
        if(this.__order__ === value) return;
        this.__order__ = value;
        engine.__orderDirty__ = true;
    }

    /** 获取绘制顺序 @returns {number} */
    get order() { return this.__order__; }

    /**
     * 更新对象可见性
     * @param {boolean} value - 是否可见
     * @example object.visible = false;
     */
    set visible(value) {
        this.__visible__ = value;
        for(let child of this.childs)
            child.visible = value;
    }

    /**
     * 获取对象可见性
     * @returns {boolean}
     * @example let visible = object.visible;
     */
    get visible() { return this.__visible__; }

    /**
     * 检查图像
     * @param {string|Image} img - 图像或图像路径
     * @returns {Image|null} - 返回图像对象或null
     * @private
     */
    __checkimage__(img) {
        if(typeof img === "string") {
            img = Resources.find(img);
            if(!img) {
                console.error(`GameObject: Image ${img} not found`);
                return null;
            }
        }
        return img;
    }

    /**
     * 更新x坐标
     * @param {number} value - x坐标值
     * @private
     */
    __setx__(value) {
        if(!this.parent)
            this.position._x = value;
        else {
            this.offset._x = value;
            this.position._x = this.parent.position.x + value;
        }
        this.__syncTransform__();
    }

    /**
     * 更新y坐标
     * @param {number} value - y坐标值
     * @private
     */
    __sety__(value) {
        if(!this.parent)
            this.position._y = value;
        else {
            this.offset._y = value;
            this.position._y = this.parent.position.y + value;
        }
        this.__syncTransform__();
    }

    /**
     * 同步子对象与碰撞盒的位置
     * @private
     */
    __syncTransform__() {
        if(this.collisionBox) this.collisionBox.syncPosition();
        for(let child of this.childs) {
            child.position._x = this.position.x + child.offset.x;
            child.position._y = this.position.y + child.offset.y;
            child.__syncTransform__();
        }
    }

    /**
     * 设置为子对象
     * @param {GameObject} arguments - 子对象
     * @example parent.setAsChild(child);
     */
    setAsChild() {
        for(let child of arguments) {
            if(child.parent) {
                const index = child.parent.childs.indexOf(child);
                if(index !== -1) child.parent.childs.splice(index, 1);
            }
            child.parent = this;
            child.offset = new Vector2(child.position.x - this.position.x, child.position.y - this.position.y);
            if(!this.childs.includes(child)) this.childs.push(child);
            child.__syncTransform__();
        }
    }

    /**
     * 创建碰撞盒
     * @param {Vector2} offset - 偏移量
     * @param {number} offset_w - 宽度偏移量
     * @param {number} offset_h - 高度偏移量
     * @example object.createCollisionBox(new Vector2(0, 0), 0, 0);
     */
    createCollisionBox(offset = null, offset_w = 0, offset_h = 0) {
        new CollisionBox(this);
        this.collisionBox.offset = offset ? offset : new Vector2(0, 0);
        this.collisionBox.width = (offset_w || 0) + this.width;
        this.collisionBox.height = (offset_h || 0) + this.height;
        this.collisionBox.syncPosition();
    }

    /**
     * 创建圆形碰撞盒
     * @param {number} radius - 半径
     * @param {Vector2} offset - 偏移量
     * @param {number} offset_w - 宽度偏移量
     * @param {number} offset_h - 高度偏移量
     * @example object.createCircleCollisionBox(10, new Vector2(0, 0), 0, 0);
     */
    createCircleCollisionBox(radius, offset = null, offset_w = 0, offset_h = 0) {
        if(!radius) {
            console.error("GameObject: radius is required for circle collision box");
            return;
        }
        new CircleCollisionBox(this, radius);
        this.collisionBox.offset = offset ? offset : new Vector2(0, 0);
        this.collisionBox.width = (offset_w || 0) + this.width;
        this.collisionBox.height = (offset_h || 0) + this.height;
        this.collisionBox.syncPosition();
    }

    /**
     * 销毁碰撞箱
     * @example object.destroyCollisionBox();
     */
    destroyCollisionBox() {
        if(this.collisionBox) {
            this.collisionBox.destroy();
            this.collisionBox = null;
        }
    }

    /**
     * 销毁对象
     * @example object.destroy();
     */
    destroy() {
        GameObject.destroy(this);
    }

    /**
     * 复制对象
     * @returns {GameObject} - 返回复制的对象
     * @example object.copy();
     */
    copy(available = true) {
        const cloneObject = new GameObject(this.image, this.position.copy(), this.width, this.height);
        cloneObject.text = this.text;
        cloneObject.style = {...this.style};
        cloneObject.tag = this.tag;
        cloneObject.order = this.order;
        cloneObject.rotation = this.rotation;
        cloneObject.opacity = this.opacity;
        cloneObject.sliders = {...this.sliders};
        cloneObject.flip = {...this.flip};
        if(this.collisionBox)
            cloneObject.collisionBox = this.collisionBox.copy(cloneObject);

        let childs = [];
        for(let child of this.childs)
            childs.push(child.copy(available));
        cloneObject.setAsChild(...childs);

        cloneObject.parent = null;
        cloneObject.__visible__ = this.__visible__;
        cloneObject.destroyed = false;
        cloneObject.offset = this.offset.copy();
        cloneObject.animator = this.animator ? this.animator.copy(cloneObject): null;
        cloneObject.__prefab__ = this.__prefab__;
        cloneObject.update = this.update;
        cloneObject.onMouseDown = this.onMouseDown;
        cloneObject.onMouseUp = this.onMouseUp;
        cloneObject.onMouseMove = this.onMouseMove;

        cloneObject.available = available;
        return cloneObject;
    }

    /**
     * 保存对象
     * @example object.save();
     */
    save() {
        this.__prefab__ = this.copy(false);
    }

    /**
     * 获取该对象的预制件
     * @returns {GameObject} - 返回对象的预制件
     * @example object.prefab;
     */
    prefab() {
        return this.__prefab__.copy();
    }

    /**
     * 将对象加载为预制件
     * @example object.load();
     */
    load() {
        // 将prefab所有属性移植此对象
        for(let key in this.__prefab__) {
            if(this.__prefab__.hasOwnProperty(key))
                this[key] = this.__prefab__[key];
        }
    }

    /**
     * 销毁对象
     * @param {GameObject} object - 对象
     * @example GameObject.destroy(object);
     */
    static destroy(object) {
        const index = engine.objects.indexOf(object);
        if(index !== -1)
            engine.objects.splice(index, 1);
        else console.error("GameObject.destroy: object not found");
        object.destroyed = true;
        object.collisionBox && object.collisionBox.destroy();
        engine.__orderDirty__ = true;
    }

    /**
     * 在每一帧都会调用此函数
     * @private
     */
    __update__() {
        this.__animator__();
        this.__anim__();
        this.update();
    }

    /**
     * 动画更新函数
     * @private
     */
    __anim__() { }

    /**
     * 动画控制器更新函数
     * @private
     */
    __animator__() { }

    /**
     * 在每一帧都会调用此函数
     * @abstract
     * @example object.update = () => { this.position.x += 1; };
     */
    update() {}

    /**
     * 鼠标按下事件
     * @param {Vector2} click - 鼠标坐标
     * @abstract
     * @example object.onMouseDown = (click) => { console.log(click); };
     */
    onMouseDown(click) {}

    /**
     * 鼠标松开事件
     * @param {Vector2} click - 鼠标坐标
     * @abstract
     * @example object.onMouseUp = (click) => { console.log(click); };
     */
    onMouseUp(click) {}

    /**
     * 鼠标移动事件
     * @param {Vector2} click - 鼠标坐标
     * @abstract
     * @example object.onMouseMove = (click) => { console.log(click); };
     */
    onMouseMove(click) {}
}


class Animation {
    /**
     * 处理对象的动画效果
     * @param {GameObject} object - 游戏对象
     * @param {Image[]} frames - 动画帧的图像数组
     * @example new Animation(Resources.find("player.anim"), object);
     */
    constructor(object, frames) {
        /** 动画帧 @type {Image[]} */
        this.frames = this.__load__(frames);
        /** 当前帧索引 @type {number} */
        this.__index__ = 0;
        /** 动画速度 @type {number} */
        this.speed = 1;
        /** 是否循环播放 @type {boolean} */
        this.loop = true;
        /** 父对象 @type {GameObject} */
        this.parent = object;
        /**
         * 连接的动画
         * @type {Object[]}
         * @example {condition: Function, anim: Animation, valueName: String}
         */
        this.next = [];
        /** 帧计数器 @type {number} */
        this.frameCounter = 0;
        /** 帧更新计数器 @type {number} */
        this.frameUpdate = 8
        /** 是否停止 @type {boolean} */
        this.stoped = false;
    }

    __load__(frames) {
        let framesArray = Array(frames.length);
        for(let i = 0; i < frames.length; i++)
            framesArray[i] = typeof frames[i] === "string" ? Resources.find(frames[i]) : frames[i];
        return framesArray;
    }

    /**
     * 复制动画
     * @param {GameObject} object - 新的父对象
     * @returns {Animation} - 动画副本
     */
    copy(object) {
        const animation = new Animation(object, this.frames);
        animation.__index__ = this.__index__;
        animation.speed = this.speed;
        animation.loop = this.loop;
        animation.frameCounter = this.frameCounter;
        animation.frameUpdate = this.frameUpdate;
        animation.stoped = this.stoped;
        animation.next = this.next.map(next => new AnimatorConnection(
            next.anim, next.condition, next.transition, next.callback
        ));
        return animation;
    }

    /**
     * 开始播放动画
     * @example animation.play();
     */
    play() {
        this.stoped = false;
        this.parent.image = this.frames[this.__index__];
        this.parent.__anim__ = () => {this.__update__();};
    }

    /**
     * 停止播放动画
     * @example animation.stop();
     */
    stop() {
        this.stoped = true;
    }

    /**
     * 重置动画
     * @example animation.reset();
     */
    reset() {
        this.__index__ = 0;
        this.frameCounter = 0;
    }

    /**
     * 更新动画
     * @private
     */
    __update__() {
        if(this.stoped) return;
        if(this.speed <= 0 || !this.frames.length) return;
        this.frameCounter += engine.deltaTime;
        const framesToUpdate = this.frameUpdate / (Math.max(1, engine.fps) * this.speed);
        if(this.frameCounter >= framesToUpdate) {
            this.frameCounter %= framesToUpdate;
            this.__index__++;
            if(this.__index__ >= this.frames.length) {
                if(this.loop) this.__index__ = 0;
                else this.__index__ = this.frames.length - 1;
            }
        }
        this.parent.image = this.frames[this.__index__];
    }
}

class Animator {
    /**
     * 动画控制器类，用于处理对象的动画效果
     * @param {GameObject} object - 游戏对象
     * @param {Animation[]} anims - 动画数组 
     * @example new Animator(Resources.find("player.animator"), object);
     */
    constructor(anims, object, enter = null) {
        anims = typeof anims === "string" ? Resources.find(anims): anims;
        /** 动画对象 @type {Object.<string, Animation>} */
        this.animations = this.__loadanim__(anims, object);
        /** 父游戏对象 @type {GameObject} */
        this.parent = object;
        /** 当前动画 @type {Animation|null} */
        this.current = null;
        /** 默认动画 @type {string} */
        this.enter = enter;
        /** 退出动画 @type {AnimatorConnection} */
        this.exit = null;
        /** 值 @type {Object.<string, *>} */
        this.values = {};

        this.parent.animator = this;
        this.parent.__animator__ = this.__animator__.bind(this);
    }

    add(name, anim) {
        if(anim instanceof Animation)
            this.animations[name] = anim;
        else this.animations[name] = new Animation(this.parent, anim);
    }

    /**
     * 添加动画连接
     * @param {string} anim1 - 动画1
     * @param {string} anim2 - 动画2
     * @param {function} condition - 条件
     * @param {string} valueName - 值名称
     * @param {boolean} transition - 是否过渡
     * @example animator.connect("idle", "run", (values) => {return values["speed"] > 0;}, true);
     */
    connect(anim1, anim2, condition, valueName = null, transition = false, callback = null) {
        const source = typeof anim1 === "string" ? this.animations[anim1] : anim1;
        const target = typeof anim2 === "string"
            ? anim2
            : Object.keys(this.animations).find(name => this.animations[name] === anim2);
        if(typeof valueName === "boolean") transition = valueName;
        if(!source || !target) {
            console.error("Animator.connect: animation not found");
            return;
        }
        source.next.push(new AnimatorConnection(target, condition, transition, callback));
    }

    /**
     * 设置值
     * @param {string} name - 名称
     * @param {*} value - 值
     * @example animator.setValue("speed", 10);
     */
    setValue(name, value) {
        this.values[name] = value;
    }

    /**
     * 获取值
     * @param {string} name - 名称
     * @returns {*} - 返回值
     * @example animator.getValue("speed");
     */
    getValue(name) {
        return this.values[name];
    }

    /**
     * 动画控制器
     * @private
     */
    __animator__() {
        // 检查是否有默认动画
        if(!this.current) {
            this.current = this.animations[this.enter];
            if(!this.current) {
                console.error(`Animator: animator didnt set enter animation`);
                return;
            }
            this.current.play();
        }
        
        // 检查连接并切换动画
        for(let next of this.current.next) {
            if(next.condition(this.values)) {
                let ratio = this.current.__index__ / this.current.frames.length;
                this.current.reset();
                this.current = this.animations[next.anim];

                if(next.transition)
                    this.current.__index__ = Mathf.Floor(this.current.frames.length * ratio);
                next.callback && next.callback();
                this.current.play();
                break;
            }
        }
        
        // 检查退出动画
        if(this.exit && this.exit.condition(this.values)) {
            this.current.reset();
            this.current = this.animations[this.exit.anim];
            this.exit.callback && this.exit.callback();
            this.current && this.current.play();
        }
        return;
    }

    /**
     * 加载动画
     * @param {Object} anims - 动画对象
     * @param {GameObject} object - 游戏对象
     * @returns {Object} - 返回动画对象
     * @private
     */
    __loadanim__(anims, object) {
        let animsDict = {};
        for(let anim of anims) {
            let animName = anim.split("/").pop().split(".").shift();
            animsDict[animName] = new Animation(object, Resources.find(anim));
        }
        return animsDict;
    }

    /**
     * 复制动画控制器
     * @param {GameObject} object - 新的父对象
     * @returns {Animator} - 动画控制器副本
     */
    copy(object) {
        const animator = new Animator([], object, this.enter);
        for(const [name, animation] of Object.entries(this.animations))
            animator.animations[name] = animation.copy(object);
        animator.values = {...this.values};
        animator.exit = this.exit ? new AnimatorConnection(
            this.exit.anim, this.exit.condition, this.exit.transition, this.exit.callback
        ) : null;

        const currentName = Object.keys(this.animations)
            .find(name => this.animations[name] === this.current);
        animator.current = currentName ? animator.animations[currentName] : null;
        if(animator.current && !animator.current.stoped)
            animator.current.play();
        return animator;
    }
}

class CollisionBox {
    static __id__ = 0;
    /**
     * 碰撞盒类，用于处理物体的碰撞检测
     * @param {GameObject} object - 父对象
     * @example new CollisionBox(object);
     */
    constructor(object) {
        /** 位置向量 @type {Vector2} */
        this.position = object.position.copy();
        /** 宽度 @type {number} */
        this.width = object.width;
        /** 高度 @type {number} */
        this.height = object.height;
        /** 偏移量 @type {Vector2} */
        this.offset = new Vector2(0, 0);
        /** 是否为触发器 @type {boolean} */
        this.isTrigger = false;
        /** 父对象 @type {GameObject|null} */
        this.parent = object;
        /** 碰撞进入对象集合 @type {Set<GameObject>} */
        this.__enter__ = new Set();
        /** 碰撞盒ID @type {number} */
        this.id = CollisionBox.__id__++;
        /** 碰撞箱是否可用 @type {boolean} */
        this.available = true;

        /** 调试信息 @type {Object.<string, function|string>} */
        this.debug = {
            show: () => {this.__debugshow__();},
            hide: () => {this.__debughide__();},
            show_color: "lightgreen",
            hide_color: "red",
            __drawedbox__: false,
            __hidedbox__: false
        };

        this.show();
        this.parent.collisionBox = this;
    }

    /**
     * 同步碰撞箱与父对象的位置
     */
    syncPosition() {
        this.position.x = this.parent.position.x + this.offset.x;
        this.position.y = this.parent.position.y + this.offset.y;
    }

    /**
     * 返回碰撞盒的副本
     * @returns {CollisionBox} - 返回碰撞盒的副本
     */
    copy(parent = this.parent) {
        const box = new CollisionBox(parent);
        box.width = this.width;
        box.height = this.height;
        box.offset = this.offset.copy();
        box.isTrigger = this.isTrigger;
        box.syncPosition();
        return box;
    }

    /**
     * 碰撞进入事件
     * @param {GameObject} other - 另一个碰撞对象
     * @abstract
     * @example onCollisionEnter(other) { console.log(other); }
     */
    onCollisionEnter(other) {}

    /**
     * 碰撞持续事件
     * @param {GameObject} other - 另一个碰撞对象
     * @abstract
     * @example onCollisionStay(other) { console.log(other); }
     */
    onCollisionStay(other) {}

    /**
     * 碰撞退出事件
     * @param {GameObject} other - 另一个碰撞对象
     * @abstract
     * @example onCollisionExit(other) { console.log(other); }
     */
    onCollisionExit(other) {}

    /**
     * 显示碰撞盒
     * @example collisionBox.show();
     */
    show() {
        this.available = true;
    }

    /**
     * 隐藏碰撞盒
     * @example collisionBox.hide();
     */
    hide() {
        this.destroy();
        this.debug.__hidedbox__ = true;
        if(this.debug.__drawedbox__) {
            this.debug.__drawedbox__ = false;
            this.debug.show();
        }
    }

    /**
     * 销毁碰撞盒
     * @example collisionBox.destroy();
     */
    destroy() {
        this.available = false;
        if(this.debug.__drawedbox__) this.debug.hide();
    }

    /**
     * 检测是否与左侧碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     * @example collisionBox.isCollideWithLeft(other);
     */
    isCollideWithLeft(other) { return this.position.x < other.position.x + other.width; }

    /**
     * 检测是否与右侧碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     * @example collisionBox.isCollideWithRight(other);
     */
    isCollideWithRight(other) { return this.position.x + this.width > other.position.x; }

    /**
     * 检测是否与顶部碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     * @example collisionBox.isCollideWithTop(other);
     */
    isCollideWithTop(other) { return this.position.y < other.position.y + other.height; }

    /**
     * 检测是否与底部碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     * @example collisionBox.isCollideWithBottom(other);
     */
    isCollideWithBottom(other) { return this.position.y + this.height > other.position.y; }

    /**
     * 检测是否与圆形碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     * @example collisionBox.isCollideWithCircle(other);
     */
    isCollideWithCircle(other) {
        let circleDistanceX = Mathf.Abs(other.position.x + other.radius - (this.position.x + this.width / 2));
        let circleDistanceY = Mathf.Abs(other.position.y + other.radius - (this.position.y + this.height / 2));

        if(circleDistanceX > (this.width / 2 + other.radius)) return false;
        if(circleDistanceY > (this.height / 2 + other.radius)) return false;

        if(circleDistanceX <= (this.width / 2)) return true;
        if(circleDistanceY <= (this.height / 2)) return true;

        let cornerDistance_sq = (circleDistanceX - this.width / 2) ** 2 +
                                (circleDistanceY - this.height / 2) ** 2;
        return cornerDistance_sq <= (other.radius ** 2);
    }

    /**
     * 检测是否与点碰撞
     * @param {Vector2} vector - 点的向量
     * @returns {boolean} - 返回是否碰撞
     * @example collisionBox.isCollideWithPoint(new Vector2(0, 0));
     */
    isCollideWithPoint(vector) {
        return this.position.x < vector.x && this.position.x + this.width > vector.x &&
                this.position.y < vector.y && this.position.y + this.height > vector.y;
    }

    isCollideWith(object) {
        if(object instanceof CircleCollisionBox) {
            return this.isCollideWithCircle(object);
        } else if(object instanceof CollisionBox) {
            return this.position.x < object.position.x + object.width &&
                this.position.x + this.width > object.position.x &&
                this.position.y < object.position.y + object.height &&
                this.position.y + this.height > object.position.y;
        } else {
            return object.isCollideWith(this);
        }
    }

    /**
     * 碰撞事件处理
     * @private
     */
    __event__() {
        if(!this.available) return;
        const current = new Set();
        for(let object of engine.objects) {
            if(object.collisionBox && object.collisionBox !== this && !object.destroyed && this.isCollideWith(object.collisionBox)) {
                current.add(object);
                if(!this.__enter__.has(object)) {
                    this.onCollisionEnter(object);
                } else this.onCollisionStay(object);
            }
        }
        for(const object of this.__enter__)
            if(!current.has(object)) this.onCollisionExit(object);
        this.__enter__ = current;
        // TODO: 重力检测
    }

    /**
     * 显示调试信息
     * @private
     */
    __debugshow__() {
        if(this.debug.__drawedbox__) {
            engine.ctx.save();
            engine.ctx.strokeStyle = this.debug.__hidedbox__ ? this.debug.hide_color: this.debug.show_color;
            engine.ctx.lineWidth = 1;
            engine.ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
            engine.ctx.restore();
        } else {
            engine.registerEvent(`collision_debug_${this.id}`, () => { this.__debugshow__(); });
            this.debug.__drawedbox__ = true;
        }
    }

    /**
     * 隐藏调试信息
     * @private
     */
    __debughide__() {
        engine.removeEvent(`collision_debug_${this.id}`);
        this.debug.__drawedbox__ = false;
        this.debug.__hidedbox__ = true;
    }
}


class CircleCollisionBox extends CollisionBox {
    /**
     * 圆形碰撞盒类，继承方形碰撞盒，扩展圆形检测功能
     * @param {number} x - 圆形碰撞盒的 x 坐标
     * @param {number} y - 圆形碰撞盒的 y 坐标
     * @param {number} radius - 圆形的半径
     * @example new CircleCollisionBox(0, 0, 10);
     */
    constructor(object, radius) {
        super(object);
        /** 半径 @type {number} */
        this.radius = radius;
    }

    /**
     * 返回圆形碰撞盒的副本
     * @param {GameObject} parent - 新的父对象
     * @returns {CircleCollisionBox} - 碰撞盒副本
     */
    copy(parent = this.parent) {
        const box = new CircleCollisionBox(parent, this.radius);
        box.width = this.width;
        box.height = this.height;
        box.offset = this.offset.copy();
        box.isTrigger = this.isTrigger;
        box.syncPosition();
        return box;
    }

    /**
     * 检测与另一个碰撞盒是否发生碰撞
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否发生碰撞
     * @example circleCollisionBox.isCollideWith(other);
     */
    isCollideWith(box) {
        if(box instanceof CircleCollisionBox) {
            // 圆形碰撞盒与圆形碰撞盒碰撞检测
            let dx = (this.position.x + this.radius) - (box.position.x + box.radius);
            let dy = (this.position.y + this.radius) - (box.position.y + box.radius);
            const radius = this.radius + box.radius;
            return dx * dx + dy * dy < radius * radius;
        } else if(box instanceof CollisionBox) {
            // 圆形碰撞盒与方形碰撞盒碰撞检测
            let circleDistanceX = Mathf.Abs((this.position.x + this.radius) - (box.position.x + box.width / 2));
            let circleDistanceY = Mathf.Abs((this.position.y + this.radius) - (box.position.y + box.height / 2));

            if(circleDistanceX > (box.width / 2 + this.radius)) return false;
            if(circleDistanceY > (box.height / 2 + this.radius)) return false;

            if(circleDistanceX <= (box.width / 2)) return true;
            if(circleDistanceY <= (box.height / 2)) return true;

            let cornerDistance_sq = (circleDistanceX - box.width / 2) ** 2 +
                                    (circleDistanceY - box.height / 2) ** 2;
            return cornerDistance_sq <= (this.radius ** 2);
        } else {
            // 未知碰撞盒类型
            console.error("CircleCollisionBox: Unknown collision box type");
            return false;
        }
    }

    /**
     * 是否碰撞左侧
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否碰撞
     * @example circleCollisionBox.isCollideWithLeft(other);
     */
    isCollideWithLeft(box) { return this.position.x < box.position.x + box.width + this.radius; }

    /**
     * 是否碰撞右侧
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否碰撞
     * @example circleCollisionBox.isCollideWithRight(other);
     */
    isCollideWithRight(box) { return this.position.x + this.radius > box.position.x - this.radius; }

    /**
     * 是否碰撞顶部
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否碰撞
     * @example circleCollisionBox.isCollideWithTop(other);
     */
    isCollideWithTop(box) { return this.position.y < box.position.y + box.height + this.radius; }

    /**
     * 是否碰撞底部
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否碰撞
     * @example circleCollisionBox.isCollideWithBottom(other);
     */
    isCollideWithBottom(box) { return this.position.y + this.radius > box.position.y - this.radius; }

    /**
     * 检测圆形是否与某个点发生碰撞
     * @param {number} x - 点的 x 坐标
     * @param {number} y - 点的 y 坐标
     * @returns {boolean} - 是否发生碰撞
     * @example circleCollisionBox.isCollideWithPoint(0, 0);
     */
    isCollideWithPoint(vector) {
        let dx = this.position.x + this.radius - vector.x;
        let dy = this.position.y + this.radius - vector.y;
        return dx * dx + dy * dy < this.radius * this.radius;
    }

    /**
     * 显示调试信息
     * @private
     */
    __debugshow__() {
        if(this.debug.__drawedbox__) {
            engine.ctx.save();
            engine.ctx.strokeStyle = this.debug.__hidedbox__ ? this.debug.hide_color : this.debug.show_color;
            engine.ctx.lineWidth = 1;
            engine.ctx.beginPath();
            engine.ctx.arc(this.position.x + this.radius, this.position.y + this.radius, this.radius, 0, Mathf.PI * 2);
            engine.ctx.stroke();
            engine.ctx.restore();
        } else {
            engine.registerEvent(`collision_debug_${this.id}`, () => { this.__debugshow__(); });
            this.debug.__drawedbox__ = true;
        }
    }
}

class Input {
    /** key是否被按下 @type {object.<string, boolean>} */
    static keyDown = {};
    /** key是否被松开 @type {object.<string, boolean>} */
    static keyUp = {};
    /** 鼠标状态 @type {boolean} */
    static mouseState = false;
    /** 鼠标是否在当前帧松开 @type {boolean} */
    static mouseUp = false;
    /** 鼠标位置 @type {Vector2} */
    static mousePosition = new Vector2(0, 0);

    /**
     * 获取键盘按键是否被按下
     * @param {string} keycode - 按键代码
     * @returns {boolean} - 是否被按下
     * @example Input.getKeyDown(KeyCode.A);
     */
    static getKeyDown(keycode) {
        return !!Input.keyDown[keycode];
    }

    static getMouseDown() {
        return Input.mouseState;
    }

    static getMouseUp() {
        if(Input.mouseUp) {
            Input.mouseUp = false;
            return true;
        }
        return false;
    }

    static getMouseMove() {
        return Input.mousePosition;
    }

    /**
     * 获取键盘按键是否被松开
     * @param {string} keycode - 按键代码
     * @returns {boolean} - 是否被松开
     * @example Input.getKeyUp(KeyCode.A);
     */
    static getKeyUp(keycode) {
        if(!!Input.keyUp[keycode]) {
            Input.keyUp[keycode] = false;
            return true;
        }
        return false;
    }

    static initialize() {
        if(Input.__initialized__) return;
        Input.__initialized__ = true;
        window.addEventListener("keydown", event => {
            Input.keyDown[event.code] = true;
            Input.keyUp[event.code] = false;
        });
        window.addEventListener("keyup", event => {
            Input.keyDown[event.code] = false;
            Input.keyUp[event.code] = true;
        });
        window.addEventListener("blur", () => {
            Input.keyDown = {};
            Input.keyUp = {};
            Input.mouseState = false;
            Input.mouseUp = false;
        });
    }
}

/** 输入监听是否已经初始化 @type {boolean} */
Input.__initialized__ = false;

class Camera {
    /** 
     * 游戏中主相机 
     * @type {Camera}
     * @example Camera.main.position.x = 10; 
     */
    static main = new Camera(new Vector3(0, 0, 0));

    /**
     * 相机类，用于处理游戏中的视角问题
     * @param {Vector3} vector - 位置向量
     * @example new Camera(new Vector3(0, 0, 0));
     */
    constructor(vector) {
        /** 位置向量 @type {Vector3} */
        this.position = vector.copy();
        /** 相机跟随对象 @type {GameObject|null} */
        this.__follow__ = null;

        this.position.__setx__ = this.__setx__.bind(this);
        this.position.__sety__ = this.__sety__.bind(this);
        this.position.__setz__ = this.__setz__.bind(this);
    }

    /**
     * 设置相机跟随对象
     * @param {GameObject} object - 跟随对象
     */
    set followObject(object) {
        this.__follow__ = object; 
    }

    /**
     * 更新相机跟随位置
     * @private
     */
    __update__() {
        if(!this.__follow__ || this.__follow__.destroyed) return;
        this.position._x = this.__follow__.position.x;
        this.position._y = this.__follow__.position.y;
    }

    /**
     * 更新相机位置x坐标，实际上是更新了所有游戏对象的位置
     * @param {number} value - x坐标值
     * @private
     */
    __setx__(value) {
        this.position._x = value;
    }

    /**
     * 更新相机位置y坐标，实际上是更新了所有游戏对象的位置
     * @param {number} value - y坐标值
     * @private
     */
    __sety__(value) {
        this.position._y = value;
    }

    /**
     * 更新相机位置z坐标，实际上是更新了所有游戏对象的大小
     * @param {number} value - z坐标值
     * @private
     */
    __setz__(value) {
        this.position._z = value;
    }
}

/**
 * 游戏资源管理器实例，全局唯一
 * @type {ResourcesObject}
 */
const Resources = new ResourcesObject();
/**
 * 游戏引擎实例，全局唯一
 * @type {GameEngine}
 */
const engine = new GameEngine();



/**
 * 数学工具类
 */
class Mathf {
    /** 
     * 数学圆周率常量
     * @type {number}
    */
    static PI = Math.PI;
    /**
     * 计算两点之间的距离
     * @param {number} x1 - 第一个点的x坐标
     * @param {number} y1 - 第一个点的y坐标
     * @param {number} x2 - 第二个点的x坐标
     * @param {number} y2 - 第二个点的y坐标
     * @returns {number} - 两点之间的距离
     */
    static Distance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }

    /**
     * 计算从点(x1, y1)到点(x2, y2)的方向向量
     * @param {number} x1 - 第一个点的x坐标
     * @param {number} y1 - 第一个点的y坐标
     * @param {number} x2 - 第二个点的x坐标
     * @param {number} y2 - 第二个点的y坐标
     * @returns {number[]} - 方向向量 [cos(angle), sin(angle)]
     */
    static Direction(x1, y1, x2, y2) {
        let angle = Math.atan2(y2 - y1, x2 - x1);
        return [Math.cos(angle), Math.sin(angle)];
    }

    static random = class {
        /**
         * 生成0到1之间的随机数
         * @returns {number} - 随机数
         * @example Mathf.random.randint.rand();
         */
        static rand() { return Math.random(); }

        /**
         * 生成指定范围内的随机数
         * @param {number} min - 最小值
         * @param {number} max - 最大值
         * @returns {number} - 随机数
         */
        static randint(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        
        /**
         * 生成指定范围内的随机浮点数
         * @param {number} min - 最小值
         * @param {number} max - 最大值
         * @returns {number} - 随机浮点数
         * @example Mathf.random.randint.randfloat(0, 1);
         */
        static randfloat(min, max) {
            return Math.random() * (max - min) + min;
        }

        /**
         * 从数组中随机选择一个元素
         * @param {any[]} array - 数组
         * @returns {any} - 随机选择的元素
         * @example Mathf.random.randint.choice([1, 2, 3]);
         */
        static choice(array) {
            return array[Math.floor(Math.random() * array.length)];
        }

        /**
         * 从数组中随机选择多个元素
         * @param {any[]} array - 数组
         * @param {number} count - 选择的数量
         * @returns {any[]} - 随机选择的元素数组
         * @example Mathf.random.randint.choices([1, 2, 3], 2);
         */
        static choices(array, count) {
            let result = [];
            for(let i = 0; i < count; i++)
                result.push(array[Math.floor(Math.random() * array.length)]);
            return result;
        }

        /**
         * 生成随机RGB颜色
         * @returns {string} - RGB颜色字符串
         * @example Mathf.random.randint.RGB();
         */
        RGB() {
            return `rgb(${Mathf.random.randint.randint(0, 255)}, ${Mathf.random.randint.randint(0, 255)}, ${Mathf.random.randint.randint(0, 255)})`;
        }

        /**
         * 生成随机RGBA颜色
         * @returns {string} - RGBA颜色字符串
         * @example Mathf.random.randint.RGBA();
         */
        RGBA() {
            return `rgba(${Mathf.random.randint.randint(0, 255)}, ${Mathf.random.randint.randint(0, 255)}, ${Mathf.random.randint.randint(0, 255)}, ${Mathf.random.randint.randfloat(0, 1)})`;
        }

        /**
         * 生成固定透明度的随机RGBA颜色
         * @returns {string} - RGBA颜色字符串
         * @example Mathf.random.randint.RGBAFixed();
         */
        RGBAFixed() {
            return `rgba(${Mathf.random.randint.randint(0, 255)}, ${Mathf.random.randint.randint(0, 255)}, ${Mathf.random.randint.randint(0, 255)}, 0.5)`;
        }
    }

    /**
     * 线性插值
     * @param {number} a - 起始值
     * @param {number} b - 结束值
     * @param {number} t - 插值参数 (0 <= t <= 1)
     * @returns {number} - 插值结果
     */
    static Lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * 将值限制在指定范围内
     * @param {number} value - 要限制的值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} - 限制后的值
     */
    static Clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 将值从一个范围映射到另一个范围
     * @param {number} value - 要映射的值
     * @param {number} start1 - 原始范围的起始值
     * @param {number} stop1 - 原始范围的结束值
     * @param {number} start2 - 目标范围的起始值
     * @param {number} stop2 - 目标范围的结束值
     * @returns {number} - 映射后的值
     */
    static Map(value, start1, stop1, start2, stop2) {
        return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2;
    }

    /**
     * 计算值的绝对值
     * @param {number} value - 要计算的值
     * @returns {number} - 绝对值
     */
    static Abs(value) {
        return Math.abs(value);
    }

    /**
     * 将值从一个范围映射到另一个范围，并限制在目标范围内
     * @param {number} value - 要映射的值
     * @param {number} start1 - 原始范围的起始值
     * @param {number} stop1 - 原始范围的结束值
     * @param {number} start2 - 目标范围的起始值
     * @param {number} stop2 - 目标范围的结束值
     * @returns {number} - 映射并限制后的值
     */
    static MapClamp(value, start1, stop1, start2, stop2) {
        return Mathf.Clamp(Mathf.Map(value, start1, stop1, start2, stop2), start2, stop2);
    }

    /**
     * 计算两点之间的角度（以度为单位）
     * @param {number} x1 - 第一个点的x坐标
     * @param {number} y1 - 第一个点的y坐标
     * @param {number} x2 - 第二个点的x坐标
     * @param {number} y2 - 第二个点的y坐标
     * @returns {number} - 角度（度）
     */
    static Angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    }

    /**
     * 将角度转换为方向向量
     * @param {number} angle - 角度（度）
     * @returns {number[]} - 方向向量 [cos(angle), sin(angle)]
     */
    static AngleToDirection(angle) {
        return [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)];
    }

    /**
     * 将方向向量转换为角度
     * @param {number[]} direction - 方向向量 [x, y]
     * @returns {number} - 角度（度）
     */
    static DirectionToAngle(direction) {
        return Math.atan2(direction[1], direction[0]) * 180 / Math.PI;
    }

    /**
     * 生成随机方向向量
     * @returns {number[]} - 随机方向向量 [cos(angle), sin(angle)]
     */
    static RandomDirection() {
        let angle = Mathf.random.randint(0, 360);
        return [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)];
    }

    /**
     * 生成随机方向向量（弧度）
     * @returns {number[]} - 随机方向向量 [cos(angle), sin(angle)]
     */
    static RandomDirection2() {
        let angle = Mathf.random.randint(0, 2 * Math.PI);
        return [Math.cos(angle), Math.sin(angle)];
    }

    /**
     * 将数值四舍五入到指定的小数位数
     * @param {number} value - 要四舍五入的数值
     * @param {number} precision - 小数位数
     * @returns {number} - 四舍五入后的数值
     */
    static Round(value, precision) {
        let multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

    /**
     * 计算值的平方根
     * @param {number} value - 要计算的值
     * @returns {number} - 平方根
     */
    static Sqrt(value) {
        return Math.sqrt(value);
    }

    /**
     * 计算值的平方
     * @param {number} value - 要计算的值
     * @returns {number} - 平方
     */
    static Pow(value, exponent) {
        return Math.pow(value, exponent);
    }

    /**
     * 计算值的正弦
     * @param {number} value - 要计算的值（弧度）
     * @returns {number} - 正弦值
     */
    static Sin(value) {
        return Math.sin(value);
    }

    /**
     * 计算值的余弦
     * @param {number} value - 要计算的值（弧度）
     * @returns {number} - 余弦值
     */
    static Cos(value) {
        return Math.cos(value);
    }

    /**
     * 计算值的正切
     * @param {number} value - 要计算的值（弧度）
     * @returns {number} - 正切值
     */
    static Tan(value) {
        return Math.tan(value);
    }

    /**
     * 计算值的反正弦
     * @param {number} value - 要计算的值
     * @returns {number} - 反正弦值（弧度）
     */
    static Asin(value) {
        return Math.asin(value);
    }

    /**
     * 计算值的反余弦
     * @param {number} value - 要计算的值
     * @returns {number} - 反余弦值（弧度）
     */
    static Acos(value) {
        return Math.acos(value);
    }

    /**
     * 计算值的反正切
     * @param {number} value - 要计算的值
     * @returns {number} - 反正切值（弧度）
     */
    static Atan(value) {
        return Math.atan(value);
    }

    /**
     * 计算两个值的反正切
     * @param {number} y - y值
     * @param {number} x - x值
     * @returns {number} - 反正切值（弧度）
     */
    static Atan2(y, x) {
        return Math.atan2(y, x);
    }

    /**
     * 计算值的自然对数
     * @param {number} value - 要计算的值
     * @returns {number} - 自然对数
     */
    static Log(value) {
        return Math.log(value);
    }

    /**
     * 计算值的以10为底的对数
     * @param {number} value - 要计算的值
     * @returns {number} - 以10为底的对数
     */
    static Log10(value) {
        return Math.log10(value);
    }

    /**
     * 计算值的以2为底的对数
     * @param {number} value - 要计算的值
     * @returns {number} - 以2为底的对数
     */
    static Log2(value) {
        return Math.log2(value);
    }

    /**
     * 计算值的指数
     * @param {number} value - 要计算的值
     * @returns {number} - 指数
     */
    static Exp(value) {
        return Math.exp(value);
    }

    /**
     * 计算值的符号
     * @param {number} value - 要计算的值
     * @returns {number} - 符号（-1, 0, 1）
     */
    static Sign(value) {
        return Math.sign(value);
    }

    /**
     * 计算值的向上取整
     * @param {number} value - 要计算的值
     */
    static Floor(value) {
        return Math.floor(value);
    }

    /**
     * 计算值的最大值
     * @param {...number} values - 要计算的值
     * @returns {number} - 最大值
     */
    static Max(...values) {
        return Math.max(...values);
    }

    /**
     * 计算值的最小值
     * @param {...number} values - 要计算的值
     * @returns {number} - 最小值
     */
    static Min(...values) {
        return Math.min(...values);
    }

    /**
     * 向量操作子类
     */
    static Vector = class {
        /**
         * 向量加法
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number[]} - 结果向量
         */
        static Add(v1, v2) {
            return [v1[0] + v2[0], v1[1] + v2[1]];
        }

        /**
         * 向量减法
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number[]} - 结果向量
         */
        static Subtract(v1, v2) {
            return [v1[0] - v2[0], v1[1] - v2[1]];
        }

        /**
         * 向量点积
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number} - 点积结果
         */
        static Dot(v1, v2) {
            return v1[0] * v2[0] + v1[1] * v2[1];
        }

        /**
         * 向量叉积
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number} - 叉积结果
         */
        static Cross(v1, v2) {
            return v1[0] * v2[1] - v1[1] * v2[0];
        }

        /**
         * 计算向量长度
         * @param {number[]} v - 向量
         * @returns {number} - 向量长度
         */
        static Length(v) {
            return Math.sqrt(v[0] ** 2 + v[1] ** 2);
        }

        /**
         * 向量归一化
         * @param {number[]} v - 向量
         * @returns {number[]} - 归一化后的向量
         */
        static Normalize(v) {
            let length = Mathf.Vector.Length(v);
            return [v[0] / length, v[1] / length];
        }
    }
}

/**
 * 键盘按键码
 */
class KeyCode {
    /** a键 @type {string} */
    static A = "KeyA";
    /** b键 @type {string} */
    static B = "KeyB";
    /** c键 @type {string} */
    static C = "KeyC";
    /** d键 @type {string} */
    static D = "KeyD";
    /** e键 @type {string} */
    static E = "KeyE";
    /** f键 @type {string} */
    static F = "KeyF";
    /** g键 @type {string} */
    static G = "KeyG";
    /** h键 @type {string} */
    static H = "KeyH";
    /** i键 @type {string} */
    static I = "KeyI";
    /** j键 @type {string} */
    static J = "KeyJ";
    /** k键 @type {string} */
    static K = "KeyK";
    /** l键 @type {string} */
    static L = "KeyL";
    /** m键 @type {string} */
    static M = "KeyM";
    /** n键 @type {string} */
    static N = "KeyN";
    /** o键 @type {string} */
    static O = "KeyO";
    /** p键 @type {string} */
    static P = "KeyP";
    /** q键 @type {string} */
    static Q = "KeyQ";
    /** r键 @type {string} */
    static R = "KeyR";
    /** s键 @type {string} */
    static S = "KeyS";
    /** t键 @type {string} */
    static T = "KeyT";
    /** u键 @type {string} */
    static U = "KeyU";
    /** v键 @type {string} */
    static V = "KeyV";
    /** w键 @type {string} */
    static W = "KeyW";
    /** x键 @type {string} */
    static X = "KeyX";
    /** y键 @type {string} */
    static Y = "KeyY";
    /** z键 @type {string} */
    static Z = "KeyZ";

    /** 0键 @type {string} */
    static Num0 = "Digit0";
    /** 1键 @type {string} */
    static Num1 = "Digit1";
    /** 2键 @type {string} */
    static Num2 = "Digit2";
    /** 3键 @type {string} */
    static Num3 = "Digit3";
    /** 4键 @type {string} */
    static Num4 = "Digit4";
    /** 5键 @type {string} */
    static Num5 = "Digit5";
    /** 6键 @type {string} */
    static Num6 = "Digit6";
    /** 7键 @type {string} */
    static Num7 = "Digit7";
    /** 8键 @type {string} */
    static Num8 = "Digit8";
    /** 9键 @type {string} */
    static Num9 = "Digit9";

    /** 空格键 @type {string} */
    static Space = "Space";
    /** 回车键 @type {string} */
    static Enter = "Enter";
    /** Tab键 @type {string} */
    static Tab = "Tab";
    /** Esc键 @type {string} */
    static Escape = "Escape";
    /** Backspace键 @type {string} */
    static Backspace = "Backspace";
    /** CapsLock键 @type {string} */
    static CapsLock = "CapsLock";
    /** Delete键 @type {string} */
    static Delete = "Delete";
    /** End键 @type {string} */
    static End = "End";
    /** Home键 @type {string} */
    static Home = "Home";

    /** Insert键 @type {string} */
    static Insert = "Insert";
    /** PageUp键 @type {string} */
    static PageUp = "PageUp";
    /** PageDown键 @type {string} */
    static PageDown = "PageDown";

    /** 左Shift键 @type {string} */
    static ShiftLeft = "ShiftLeft";
    /** 右Shift键 @type {string} */
    static ShiftRight = "ShiftRight";
    /** 左Ctrl键 @type {string} */
    static ControlLeft = "ControlLeft";
    /** 右Ctrl键 @type {string} */
    static ControlRight = "ControlRight";
    /** 左Alt键 @type {string} */
    static AltLeft = "AltLeft";
    /** 右Alt键 @type {string} */
    static AltRight = "AltRight";
    /** 左Meta键 @type {string} */
    static MetaLeft = "MetaLeft"; // windows键
    /** 右Meta键 @type {string} */
    static MetaRight = "MetaRight";
    /** 波浪键 @type {string} */
    static Backquote = "Backquote"; // `
    /** fn键 @type {string} */
    static PrintScreen = "PrintScreen";
    /** 减号键 @type {string} */
    static Minus = "Minus"; // -
    /** 等号键 @type {string} */
    static Equal = "Equal"; // =
    /** 小键盘Enter键 @type {string} */
    static NumpadEnter = "NumpadEnter";
    /** 小键盘除键 @type {string} */
    static NumpadDivide = "NumpadDivide";
    /** 小键盘乘键 @type {string} */
    static NumpadMultiply = "NumpadMultiply";
    /** 小键盘减键 @type {string} */
    static NumpadSubtract = "NumpadSubtract";
    /** 小键盘加键 @type {string} */
    static NumpadAdd = "NumpadAdd";
    /** 小键盘.键 @type {string} */
    static NumpadDecimal = "NumpadDecimal";
    /** 小键盘0键 @type {string} */
    static Numpad0 = "Numpad0";
    /** 小键盘1键 @type {string} */
    static Numpad1 = "Numpad1";
    /** 小键盘2键 @type {string} */
    static Numpad2 = "Numpad2";
    /** 小键盘3键 @type {string} */
    static Numpad3 = "Numpad3";
    /** 小键盘4键 @type {string} */
    static Numpad4 = "Numpad4";
    /** 小键盘5键 @type {string} */
    static Numpad5 = "Numpad5";
    /** 小键盘6键 @type {string} */
    static Numpad6 = "Numpad6";
    /** 小键盘7键 @type {string} */
    static Numpad7 = "Numpad7";
    /** 小键盘8键 @type {string} */
    static Numpad8 = "Numpad8";
    /** 小键盘9键 @type {string} */
    static Numpad9 = "Numpad9";
    /** 小键盘开启键 @type {string} */
    static NumLock = "NumLock";


    /** 左方向键 @type {string} */
    static ArrowLeft = "ArrowLeft";
    /** 上方向键 @type {string} */
    static ArrowUp = "ArrowUp";
    /** 右方向键 @type {string} */
    static ArrowRight = "ArrowRight";
    /** 下方向键 @type {string} */
    static ArrowDown = "ArrowDown";

    /** F1键 @type {string} */
    static F1 = "F1";
    /** F2键 @type {string} */
    static F2 = "F2";
    /** F3键 @type {string} */
    static F3 = "F3";
    /** F4键 @type {string} */
    static F4 = "F4";
    /** F5键 @type {string} */
    static F5 = "F5";
    /** F6键 @type {string} */
    static F6 = "F6";
    /** F7键 @type {string} */
    static F7 = "F7";
    /** F8键 @type {string} */
    static F8 = "F8";
    /** F9键 @type {string} */
    static F9 = "F9";
    /** F10键 @type {string} */
    static F10 = "F10";
    /** F11键 @type {string} */
    static F11 = "F11";
    /** F12键 @type {string} */
    static F12 = "F12";
}
