/**
 * 二维向量类
 * @param {number} x - x 坐标
 * @param {number} y - y 坐标
 */
class Vector2 {
    constructor(x, y) {
        /** x 坐标 @type {number} */
        this._x = x;
        /** y 坐标 @type {number} */
        this._y = y;
        /** 设置x函数 */
        this.__setx__ = (value) => { this._x = value; };
        /** 设置y函数 */
        this.__sety__ = (value) => { this._y = value; };
        /** 获取x函数 */
        this.__getx__ = () => { return this._x; };
        /** 获取y函数 */
        this.__gety__ = () => { return this._y; };
    }

    /**
     * 获取x坐标
     * @returns {number}
     */
    get x() { return this.__getx__(); }
    /**
     * 设置x坐标
     * @type {number}
     */
    set x(value) { this.__setx__(value); }
    /**
     * 获取y坐标
     * @returns {number}
     */
    get y() { return this.__gety__(); }
    /**
     * 设置y坐标
     * @type {number}
     */
    set y(value) { this.__sety__(value); }
}
/**
 * 三维向量类
 * @param {number} x - x 坐标
 * @param {number} y - y 坐标
 * @param {number} z - z 坐标
 */
class Vector3 {
    constructor(x, y, z) {
        /** x 坐标 @type {number} */
        this.x = x;
        /** y 坐标 @type {number} */
        this.y = y;
        /** z 坐标 @type {number} */
        this.z = z;

        /** 设置x函数 */
        this.__setx__ = (value) => { this.x = value; };
        /** 设置y函数 */
        this.__sety__ = (value) => { this.y = value; };
        /** 设置z函数 */
        this.__setz__ = (value) => { this.z = value; };
        /** 获取x函数 */
        this.__getx__ = () => { return this.x; };
        /** 获取y函数 */
        this.__gety__ = () => { return this.y; };
        /** 获取z函数 */
        this.__getz__ = () => { return this.z; };
    }

    /**
     * 获取x坐标
     * @returns {number}
    */
    get x() { return this.__getx__(); }
    /**
     * 设置x坐标
     * @param {number} value
    */
    set x(value) { this.__setx__(value); }
    /**
     * 获取y坐标
     * @returns {number}
     */
    get y() { return this.__gety__(); }
    /**
     * 设置y坐标
     * @param {number} value
     */
    set y(value) { this.__sety__(value); }
    /**
     * 获取z坐标
     * @returns {number}
     */
    get z() { return this.__getz__(); }
    /**
     * 设置z坐标
     * @param {number} value
     */
    set z(value) { this.__setz__(value); }
}

/**
 * 游戏资源管理器类
 */
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

    constructor() {
        /** 资源文件结构 @type {Object} */
        this.__files__ = {};
        /** 默认路径 @type {string} */
        this.defaultPath = "";
    }

    /**
     * 加载所有资源文件并更新进度
     * @param {function} updateProgress - 更新进度的回调函数，参数为当前进度百分比
     * @returns {Promise} - 返回一个Promise对象，当所有资源加载完成时解析
     */
    async loadAll(updateProgress) {
        const files = this.__files__;
        const totalFiles = this.countFiles(files);
        let loadedFiles = 0;

        const loadFile = async (path, obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    await loadFile([...path, key], obj[key]);
                } else {
                    const filename = [...path, key].join('/');
                    await this.load(filename);
                    
                    loadedFiles++;
                    try {
                        updateProgress((loadedFiles / totalFiles) * 100);
                    } catch(error) {
                        console.error('Error in updateProgress callback:', error);
                    }
                }
            }
        };

        await loadFile([], files);
    }

    /**
     * 添加资源文件
     * @param {string} filename - 资源文件的路径和名称
     * @param {string} src - 资源文件的源路径
     */
    add(filename, src) {
        // 规范化路径
        filename = this.normalizePath(this.defaultPath + filename);
        
        let path = filename.split("/");
        filename = path.pop();

        if(path) {
            let current = this.cdPath(path)
            if(current === null) return;
            current[filename] = src;
        } else this.__files__[filename] = src;
    }

    /**
     * 创建文件夹
     * @param {string} folder - 文件夹路径
     */
    createFolder(folder) {
        // 规范化路径
        folder = this.normalizePath(this.defaultPath + folder);

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
     */
    load(filename) {
        return new Promise((resolve, reject) => {
            // 规范化路径
            filename = this.normalizePath(filename);

            // 将filename转换为路径
            let path = filename.split("/");
            filename = path.pop();

            // 切换到指定路径
            let current = this.cdPath(path);
            
            // 当路径不存在时，记录错误并返回
            if(current === null || current[filename] === undefined) {
                console.error(`Resource.Load: ${filename} not found`);
                reject(new Error(`Resource.Load: ${filename} not found`));
                return;
            }

            let src = current[filename];
            let type = filename.split(".").pop();
            
            if(ResourcesObject.ImageTypes.includes(type)) {
                this.handleLoadImage(current, src);
            } else if(ResourcesObject.AudioTypes.includes(type)) {
                this.handleLoadAudio(current, src);
            } else if(ResourcesObject.AnimationTypes.includes(type)) {
                this.handleLoadAnimation(current, src);
            } else {
                // 当资源文件类型不支持时，记录错误并返回
                console.error(`Resource.Load: ${filename} type not supported`);
                reject(new Error(`Resource.Load: ${filename} type not supported`));
            }
        });
    }  
    
    /**
     * 处理加载图片
     * @param {object} current - 当前资源文件对象
     * @param {Image} image - 图片对象
     */
    handleLoadImage(current, image) {
        // 加载图片文件
        let img = new Image();
        img.onload = () => {
            resolve(img);
            current[filename] = img;
        };
        img.onerror = () => {
            console.error(`Resource.Load: Failed to load image ${filename}`);
            reject(new Error(`Resource.Load: Failed to load image ${filename}`));
        };
        img.src = image;
    }

    /**
     * 处理加载音频
     * @param {object} current - 当前资源文件对象
     * @param {Audio} audio - 音频对象
     */
    handleLoadAudio(current, audio) {
        // 加载音频文件
        let audio = new Audio();
        audio.onloadeddata = () => {
            resolve(audio);
            current[filename] = audio;
        };
        audio.onerror = () => {
            console.error(`Resource.Load: Failed to load audio ${filename}`);
            reject(new Error(`Resource.Load: Failed to load audio ${filename}`));
        };
        audio.src = src;
    }

    /**
     * 处理加载动画
     * @param {object} current - 当前资源文件对象
     * @param {Array} frames - 动画帧数组
     */
    handleLoadAnimation(current, frames) {
        let frameArray = Array(frames.length);
        let framePromises = frames.map((frame, index) => {
            return new Promise((resolve, reject) => {
                let img = new Image();
                img.onload = () => {
                    frameArray[index] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Resource.Load: Failed to load image ${frame}`);
                    reject(new Error(`Resource.Load: Failed to load image ${frame}`));
                };
                img.src = frame;
            });
        });

        Promise.all(framePromises).then(() => {
            current[filename] = frameArray;
            resolve(frameArray);
        }).catch(error => {
            console.error(`Resource.Load: Failed to load animation ${filename}`);
            reject(new Error(`Resource.Load: Failed to load animation ${filename}`));
        });
    }

    /**
     * 查找资源文件
     * @param {string} filename - 资源文件的路径和名称
     * @returns {*} - 返回找到的资源文件
     */
    find(filename) {
        // 规范化路径
        filename = this.normalizePath(filename);

        // 将filename转换为路径
        let path = filename.split("/");
        filename = path.pop();

        // 切换到指定路径
        let current = this.cdPath(path);
        if(current === null || current[filename] === undefined) {
            console.error(`Resource.Find: ${filename} not found`);
            return null;
        } else if(typeof current[filename] === 'string') {
            console.error(`Resource.Find: ${filename} did not loaded`);
            return null;
        }

        return current[filename];
    }

    /**
     * 创建动画
     * @param {string} filename - 动画文件名称
     * @param {Array} frames - 动画帧数组
     */
    createAnimation(filename, frames) {
        if(this.isPath(filename)) {
            let path = filename.split("/");
            filename = path.pop();
            let current = this.cdPath(path);
            if(current === null) return;
            current[filename] = frames;
        } else this.__files__[filename] = frames;
    }

    /**
     * 检查是否是路径
     * @param {string} p - 路径字符串
     * @returns {boolean} - 返回是否是路径
     */
    isPath(p) { return p.split("/").length > 1; }

    /**
     * 切换到指定路径
     * @param {array|string} p - 路径数组或路径字符串
     * @returns {object} - 返回路径对象
     */
    cdPath(p) {
        let current = this.__files__;

        // 切换到默认路径
        if(this.defaultPath !== "")
            for(let dp of this.defaultPath.split("/")) 
                current = current[dp];

        // 将路径转为数组
        let path = null
        if(typeof p === 'string') {
            path = p.split("/");
            path.pop();
        } else path = p;

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
     */
    countFiles(obj) {
        let count = 0;
        for(const key in obj) {
            if(typeof obj[key] === 'object')
                count += this.countFiles(obj[key]);
            else count++;
        }
        
        return count;
    }

    /**
     * 规范化路径，处理相对路径
     * @param {string} path - 路径字符串
     * @returns {string} - 返回规范化后的路径
     */
    normalizePath(path) {
        const parts = path.split('/');
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
    /**
     * 游戏引擎类，负责管理游戏的整体逻辑、绘制、资源加载等
     */
    constructor() {
        /** 游戏对象数组 @type {GameObject[]} */
        this.objects = [];
        /** 保存的关卡 @type {Object} */
        this.savedLevels = {};
        /** 更新事件 @type {Object} */
        this.updateEvents = {};
        /** 帧率 @type {number} */
        this.fps = 60;
        /** 当前时间 @type {number} */
        this.__time__ = 0.0;
        /** 时间增量 @type {number} */
        this.deltaTime = 0.0;
    }

    /**
     * 初始化引擎
     * @param {string} canvas - 画布对象
     * @param {number} width - 画布的宽度
     * @param {number} height - 画布的高度
     */
    init(canvas, width, height) {
        this.canvas = document.getElementById(canvas);
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;

        this.__mouseDown__ = this.__mouseDown__.bind(this);
        this.__mouseUp__ = this.__mouseUp__.bind(this);
        this.__mouseMove__ = this.__mouseMove__.bind(this);

        this.canvas.setAttribute("tabindex", "0");
        this.canvas.addEventListener("mousedown", this.__mouseDown__);
        this.canvas.addEventListener("mouseup", this.__mouseUp__);
        this.canvas.addEventListener("mousemove", this.__mouseMove__);
    }

    /**
     * 注册事件
     * @param {string} event - 事件名称
     * @param {function} callback - 回调函数
     */
    registerEvent(event, callback) {
        this.updateEvents[event] = callback;
    }

    /**
     * 移除事件
     * @param {string} event - 事件名称
     */
    removeEvent(event) {
        delete this.updateEvents[event];
    }

    /**
     * 保存关卡
     * @param {string} name - 关卡名称
     */
    saveLevel(name) {
        this.savedLevels[name] = this.objects;
    }

    /**
     * 加载关卡
     * @param {string} name - 关卡名称
     */
    loadLevel(name) {
        this.objects = this.savedLevels[name];
    }

    /**
     * 清除关卡
     */
    clearLevel() {
        this.objects = [];
    }

    /**
     * 睡眠指定时间
     * @param {number} ms - 毫秒数
     * @returns {Promise} - 返回一个Promise对象
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 开始游戏循环
     */
    startLoop() {
        setInterval(() => {
            this.__update__();
        }, 1000 / this.fps);
    }

    /**
     * 处理滑动效果
     * @param {GameObject} object - 游戏对象
     */
    handleSlider(object) {
        this.ctx.beginPath();
        this.ctx.rect(object.position.x, object.position.y, object.width * object.sliders.x, object.height * object.sliders.y);
        this.ctx.clip();
    }

    /**
     * 处理旋转效果
     * @param {GameObject} object - 游戏对象
     */
    handleRotation(object) {
        this.ctx.translate(object.position.x + object.width / 2, object.position.y + object.height / 2);
        this.ctx.scale(object.flip.x ? -1 : 1, object.flip.y ? -1 : 1);
        this.ctx.rotate(object.rotation * Mathf.PI / 180);
    }

    /**
     * 处理文字效果
     * @param {GameObject} object - 游戏对象
     */
    handleText(object) {
        this.ctx.font = object.style.font;
        this.ctx.fillStyle = object.style.color;
        this.ctx.fillText(object.text, object.position.x, object.position.y);
    }

    /**
     * 绘制游戏对象
     * @param {GameObject} object - 游戏对象
     */
    __draw__(object) {
        // 空对象
        if(!object.image && !object.text) return;
        // 处理文字对象
        if(object.text) this.handleText(object);
        if(!object.image) return;
        // 处理图片对象
        this.ctx.save();
        this.ctx.globalAlpha = object.opacity !== undefined ? object.opacity : 1;
        this.handleSlider(object);
        this.handleRotation(object);
        this.ctx.drawImage(object.image, -object.width / 2, -object.height / 2, object.width, object.height); // 绘制图像
        this.ctx.restore();
    }

    /**
     * 更新游戏状态
     */
    __update__() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.deltaTime = (Date.now() - this.__time) / 1000;
        this.__time = Date.now();

        this.objects.sort((a, b) => a.order - b.order);
        for(let object of this.objects) {
            object.update && object.update();
            if(object.visible) this.__draw__(object);
        }

        for(let gameEvent of Object.values(this.updateEvents))
            gameEvent();
    }

    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} event - 鼠标按下事件对象
     */
    __mouseDown__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseDown(mouseX, mouseY);
        }
    }

    /**
     * 处理鼠标松开事件
     * @param {MouseEvent} event - 鼠标松开事件对象
     */
    __mouseUp__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseUp(mouseX, mouseY);
        }
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标移动事件对象
     */
    __mouseMove__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseMove(mouseX, mouseY);
        }
    }
}

/**
 * 游戏对象类
 * @param {string|Image} img - 图像或图像路径
 * @param {Vector2} vector - 位置向量
 * @param {number} width - 宽度
 * @param {number} height - 高度
 */
class GameObject {
    constructor(img, vector, width, height) {
        /** 位置向量 @type {Vector2} */
        this.position = vector;
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
        this.order = 0;
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
        this.visible = true;
        /** 是否已销毁 @type {boolean} */
        this.destoryed = false;
        /** 对象的偏移 @type {Vector2} */
        this.offset = new Vector2(0, 0);

        this.position.__setx__ = this.__setx__.bind(this);
        this.position.__sety__ = this.__sety__.bind(this);

        engine.objects.push(this);
    }

    /**
     * 检查图像
     * @param {string|Image} img - 图像或图像路径
     * @returns {Image|null} - 返回图像对象或null
     */
    __checkimage__(img) {
        if(typeof img === "string") {
            img = Resources.Find(img);
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
     */
    __setx__(value) {
        this.position.x = value + this.offset.x;
        if(this.collisionBox) 
            this.collisionBox.position.x = this.position.x + this.offset.x + (this.collisionBox.offset.x || 0);
        for(let child of this.childs) {
            child.position.x = this.position.x + child.position.x + this.offset.x + child.offset.x;
        }
    }

    /**
     * 更新y坐标
     * @param {number} value - y坐标值
     */
    __sety__(value) {
        this.position.y = value + this.offset.y;
        if(this.collisionBox) 
            this.collisionBox.position.y = this.position.y + this.offset.y + (this.collisionBox.offset.y || 0);
        for(let child of this.childs) {
            child.position.y = this.position.y + child.position.y + this.offset.y + child.offset.y;
        }
    }

    /**
     * 设置为子对象
     * @param {GameObject} child - 子对象
     */
    setAsChild(child) {
        child.parent = this;
        this.childs.push(child);
    }
}

/**
 * 动画类，处理对象的动画效果，你不应该直接实例化这个类
 * @param {Image[]} frames - 动画帧的图像数组
 */
class Animation {
    constructor(frames) {
        /** 动画帧 @type {Image[]} */
        this.frames = frames;
        /** 当前帧索引 @type {number} */
        this.__index__ = 0;
        /** 动画速度 @type {number} */
        this.speed = 1;
    }
}

/**
 * 碰撞盒类，用于处理物体的碰撞检测
 * @param {GameObject} object - 父对象
 */
class CollisionBox {
    static __id__ = 0;
    constructor(object) {
        /** 位置向量 @type {Vector2} */
        this.position = object.position;
        /** 宽度 @type {number} */
        this.width = object.width;
        /** 高度 @type {number} */
        this.height = object.height;
        /** 偏移量 @type {Vector2} */
        this.offset = new Vector2(0, 0);
        /** 是否为触发器 @type {boolean} */
        this.isTrigger = false;
        /** 父对象 @type {GameObject|null} */
        this.parentObject = null;
        /** 碰撞进入对象数组 @type {GameObject[]} */
        this.__enter__ = [];
        /** 碰撞盒ID @type {number} */
        this.id = CollisionBox.__id__++;

        /** 调试信息 @type {Object} */
        this.debug = {
            show: () => {this.__debugshow__();},
            hide: () => {this.__debughide__();},
            show_color: "lightgreen",
            hide_color: "red",
            __drawedbox__: false,
            __hidedbox__: false
        };

        this.show();
    }

    /**
     * 碰撞进入事件
     * @param {GameObject} other - 另一个碰撞对象
     */
    onCollisionEnter(other) {}

    /**
     * 碰撞持续事件
     * @param {GameObject} other - 另一个碰撞对象
     */
    onCollisionStay(other) {}

    /**
     * 碰撞退出事件
     * @param {GameObject} other - 另一个碰撞对象
     */
    onCollisionExit(other) {}

    /**
     * 显示碰撞盒
     */
    show() {
        engine.RegisterEvent(`collision_${this.id}`, () => {this.this.__event__();});
    }

    /**
     * 隐藏碰撞盒
     */
    hide() {
        this.destory();
        this.debug.__hidedbox__ = true;
        if(this.debug.__drawedbox__) {
            this.debug.__drawedbox__ = false;
            this.debug.show();
        }
    }

    /**
     * 销毁碰撞盒
     */
    destory() {
        engine.RemoveEvent(`collision_${this.id}`);
        if(this.debug.__drawedbox__) this.debug.hide();
    }

    /**
     * 检测是否与左侧碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     */
    isCollideWithLeft(other) { return this.position.x < other.position.x + other.width; }

    /**
     * 检测是否与右侧碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     */
    isCollideWithRight(other) { return this.position.x + this.width > other.position.x; }

    /**
     * 检测是否与顶部碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     */
    isCollideWithTop(other) { return this.position.y < other.position.y + other.height; }

    /**
     * 检测是否与底部碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
     */
    isCollideWithBottom(other) { return this.position.y + this.height > other.position.y; }

    /**
     * 检测是否与圆形碰撞
     * @param {GameObject} other - 另一个碰撞对象
     * @returns {boolean} - 返回是否碰撞
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
     */
    isCollideWithPoint(vector) {
        return this.position.x < vector.x && this.position.x + this.width > vector.x &&
                this.position.y < vector.y && this.position.y + this.height > vector.y;
    }

    /**
     * 碰撞事件处理
     */
    __event__() {
        const destoryed = this.__enter__.filter(obj => !engine.objects.includes(obj));
        const objects = destoryed.concat(engine.objects);

        for(let object of objects) {
            if(object.collisionBox && object.collisionBox !== this && !object.destoryed) {
                if(!this.__enter__.includes(object)) {
                    this.__enter__.push(object);
                    this.onCollisionEnter(object);
                } else this.onCollisionStay(object);
            } else if(this.__enter__.includes(object)) {
                this.__enter__.splice(this.__enter__.indexOf(object), 1);
                this.onCollisionExit(object);
            } else continue;
        }
        // TODO: 重力检测
    }

    /**
     * 显示调试信息
     */
    __debugshow__() {
        if(this.debug.__drawedbox__) {
            engine.ctx.save();
            engine.ctx.strokeStyle = this.debug.__hidedbox__ ? this.debug.hide_color: this.debug.show_color;
            engine.ctx.lineWidth = 1;
            engine.ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
            engine.ctx.restore();
        } else {
            engine.RegisterEvent(`collision_debug_${this.id}`, () => { this.__debugshow__(); });
            this.debug.__drawedbox__ = true;
        }
    }

    /**
     * 隐藏调试信息
     */
    __debughide__() {
        engine.RemoveEvent(`collision_debug_${this.id}`);
        this.debug.__drawedbox__ = false;
        this.debug.__hidedbox__ = true;
    }
}

/**
 * 圆形碰撞盒类，继承方形碰撞盒，扩展圆形检测功能
 * @param {number} x - 圆形碰撞盒的 x 坐标
 * @param {number} y - 圆形碰撞盒的 y 坐标
 * @param {number} radius - 圆形的半径
 */
class CircleCollisionBox extends CollisionBox {
    constructor(object, radius) {
        super(object);
        /** 半径 @type {number} */
        this.radius = radius;
    }

    /**
     * 检测与另一个碰撞盒是否发生碰撞
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否发生碰撞
     */
    isCollideWith(box) {
        if(box instanceof CircleCollisionBox) {
            // 圆形碰撞盒与圆形碰撞盒碰撞检测
            let dx = (this.position.x + this.radius) - (box.position.x + box.radius);
            let dy = (this.position.y + this.radius) - (box.position.y + box.radius);
            let distance = Mathf.Sqrt(dx * dx + dy * dy);
            return distance < this.radius + box.radius;
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
     */
    isCollideWithLeft(box) { return this.position.x < box.position.x + box.width + this.radius; }

    /**
     * 是否碰撞右侧
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否碰撞
     */
    isCollideWithRight(box) { return this.position.x + this.radius > box.position.x - this.radius; }

    /**
     * 是否碰撞顶部
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否碰撞
     */
    isCollideWithTop(box) { return this.position.y < box.position.y + box.height + this.radius; }

    /**
     * 是否碰撞底部
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否碰撞
     */
    isCollideWithBottom(box) { return this.position.y + this.radius > box.position.y - this.radius; }

    /**
     * 检测圆形是否与某个点发生碰撞
     * @param {number} x - 点的 x 坐标
     * @param {number} y - 点的 y 坐标
     * @returns {boolean} - 是否发生碰撞
     */
    isCollideWithPoint(vector) {
        let dx = this.position.x + this.radius - vector.x;
        let dy = this.position.y + this.radius - vector.y;
        return Mathf.Sqrt(dx * dx + dy * dy) < this.radius;
    }

    __debugshow__() {
        if(this.debug.__drawedbox__) {
            engine.ctx.save();
            engine.ctx.strokeStyle = this.__hided_box ? this.debug.hide_color : this.debug.show_color;
            engine.ctx.lineWidth = 1;
            engine.ctx.beginPath();
            engine.ctx.arc(this.position.x + this.radius, this.position.y + this.radius, this.radius, 0, Mathf.PI * 2);
            engine.ctx.stroke();
            engine.ctx.restore();
        } else {
            engine.RegisterEvent(`collision_debug_${this.id}`, () => { this.__debugshow__(); });
            this.debug.__drawedbox__ = true;
        }
    }
}

class Camera {
    static main = Camera(new Vector2(0, 0));
    /**
     * 相机类，用于处理游戏中的视角问题
     * @param {Vector2} vector - 位置向量
     */
    constructor(vector) {
        /** 位置向量 @type {Vector2} */
        this.position = vector;
        /** 相机宽度 @type {number} */
        this.__width__ = engine.width;
        /** 相机高度 @type {number} */
        this.__height__ = engine.height;
        /** 相机跟随对象 @type {GameObject|null} */
        this.followObject = null;

        this.position.__setx__ = this.__setx__.bind(this);
        this.position.__sety__ = this.__sety__.bind(this);
    }

    __setx__(value) {
        for(let object of engine.objects)
            object.position.x -= value - this.position.x;
        this.position.x = value;
    }

    __sety__(value) {
        for(let object of engine.objects)
            object.position.y -= value - this.position.y;
        this.position.y = value;
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

    /**
     * 生成指定范围内的随机数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} - 随机数
     */
    static Random(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 生成指定范围内的随机整数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} - 随机整数
     */
    static RandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 从数组中随机选择一个元素
     * @param {any[]} arr - 数组
     * @returns {any} - 随机选择的元素
     */
    static RandomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 生成随机RGB颜色
     * @returns {string} - RGB颜色字符串
     */
    static RandomColor() {
        return `rgb(${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)})`;
    }

    /**
     * 生成随机RGBA颜色
     * @returns {string} - RGBA颜色字符串
     */
    static RandomColorAlpha() {
        return `rgba(${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.Random(0, 1)})`;
    }

    /**
     * 生成固定透明度的随机RGBA颜色
     * @returns {string} - RGBA颜色字符串
     */
    static RandomColorAlphaFixed() {
        return `rgba(${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, 0.5)`;
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
        let angle = Mathf.Random(0, 360);
        return [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)];
    }

    /**
     * 生成随机方向向量（弧度）
     * @returns {number[]} - 随机方向向量 [cos(angle), sin(angle)]
     */
    static RandomDirection2() {
        let angle = Mathf.Random(0, 2 * Math.PI);
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
    static Tab = "Tap";
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