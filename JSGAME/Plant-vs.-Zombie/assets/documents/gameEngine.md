本游戏引擎提供了多种用于创建和管理2D游戏对象的功能。本文将介绍所有的类和函数，帮助开发者快速上手使用，并附带示例代码。

## GameEngine 类

### 构造函数

```constructor(width, height)```

初始化游戏引擎，并设置画布的宽度和高度。

- `width`: 画布的宽度
- `height`: 画布的高度

### 隐藏属性
#### ``` _engine: GameEngine ```
这是一个不对外开放的全局`engine`类，用于在没有创建engine的文件中使用已经创建的engine，类似于单例，每当创建新的`GameEngine`时都会覆盖_engine

#### ``` _engine.__images: Array[ImageObject] ```
这是一个储存所有预加载图片的列表

#### ``` _engine.__audios: Dictionary[String, AudioObject] ```
这是一个储存所有预加载音频的列表，储存为`AudioName: AudioObject`

#### ``` _engine.__animations: Dictionary[String, Dictionary[String, AnimationObject]] ```
这是一个储存所有动画的类，储存为
`AnimationClasses: {AnimationName: AnimationObject}`
这个类是代表着一个角色的类，而Animation的名称则就是动作名称, 下面是个示例
```javascript
/*
images
-> MyRole
--> Walk
---> images1.jpg
*/
new Animation(
"MyRole", "Walk", ["images1.jpg", ...] // full path
);
```

### 方法

#### ``` engine_update() ```
更新游戏画布并绘制所有可见对象。

#### ``` preload(imgsrc) ```
预加载图片资源。

- `imgsrc`: 图片的路径，返回一个 Promise，加载成功后返回图片对象。

示例：

```javascript
let engine = new GameEngine(800, 600);
engine.preload('assets/player.png').then(img => {
    console.log('Image loaded:', img);
});
```

#### ``` save_level(name) ```
保存当前关卡的所有对象。

- `name`: 关卡名称。

#### ``` load_level(name) ```
加载之前保存的关卡对象。

- `name`: 关卡名称。

#### ``` draw(object) ```
绘制游戏对象。如果对象是图片，按照指定位置和旋转角度绘制；如果是文本，则绘制文本。

- `object`: 需要绘制的对象。

#### ``` getImage(name) ```
根据图片名称获取已经预加载的图片。

- `name`: 图片的名称（不包含路径），返回图片对象。

示例：

```javascript
let image = engine.getImage('player.png');
if (image) {
    console.log('Image found:', image);
} else {
    console.log('Image not found');
}
```

#### ``` start() ```
开始游戏引擎并以固定帧率刷新画布内容。

示例：

```javascript
engine.start();
```

#### ``` clear() ```
清空当前画布上的所有对象。

---

## CollisionBox 类

### 构造函数

```constructor(x, y, width, height)```

定义一个碰撞箱，用于检测物体间的碰撞。

- `x`: 碰撞箱的 x 坐标
- `y`: 碰撞箱的 y 坐标
- `width`: 碰撞箱的宽度
- `height`: 碰撞箱的高度

### 方法

#### ``` isCollideWith(box) ```
检查当前碰撞箱是否与另一个碰撞箱发生碰撞。

- `box`: 另一个碰撞箱对象，返回布尔值。

#### ``` isCollideWithPoint(x, y) ```
检查一个点是否在当前碰撞箱内。

- `x`: 点的 x 坐标
- `y`: 点的 y 坐标，返回布尔值。

示例：

```javascript
let box1 = new CollisionBox(10, 10, 50, 50);
let box2 = new CollisionBox(30, 30, 50, 50);
console.log('Collision:', box1.isCollideWith(box2));
```

---

## OBJECT 类

### 构造函数

```constructor(image = null, width = 100, height = 100, visible = true)```

创建一个游戏对象。

- `image`: 对象的图片资源（可以为空）
- `width`: 对象的宽度
- `height`: 对象的高度
- `visible`: 是否可见，默认为 `true`

### 方法

#### ``` setOrder(order) ```
设置对象的绘制顺序。

- `order`: 绘制顺序的值。

#### ``` setSlider(slider) ```
设置对象的滑动比例，影响对象绘制时的宽度缩放比例。

- `slider`: 滑动比例（0 到 1 之间的浮点数）。

#### ``` setPosition(x, y) ```
设置对象的位置。

- `x`: 对象的 x 坐标
- `y`: 对象的 y 坐标

示例：

```javascript
let player = new OBJECT(engine.getImage('player.png'), 100, 100);
player.setPosition(200, 300);
```

#### ``` update() ```
该方法是一个抽象方法，用户可以重写此方法来定义对象的更新逻辑。

#### ``` destory() ```
删除当前对象。

示例：

```javascript
player.destory();
```

### 静态方法

#### ``` create(imgName, x, y, width, height, visible = true) ```
创建一个新的游戏对象。

- `imgName`: 图片名称
- `x`: 对象的 x 坐标
- `y`: 对象的 y 坐标
- `width`: 对象的宽度
- `height`: 对象的高度
- `visible`: 是否可见，默认为 `true`

#### ``` destory(object) ```
删除指定对象。

- `object`: 需要删除的对象。

#### ``` destoryWithName(name) ```
根据对象名称删除对象。

- `name`: 对象的名称。

---

## Animation 类

### 构造函数

```constructor(imgs, speed = 10, callback = null)```

创建一个动画对象。

- `imgs`: 动画帧的图片路径数组
- `speed`: 动画的速度，值越大动画越慢
- `callback`: 动画加载完成后的回调函数

示例：

```javascript
let anim = new Animation("AnimationClasses", "AnimationName", ['frame1.png', 'frame2.png']);
anim.draw();
```


### 方法

#### ``` update() ```
每一帧都会调用这个函数，Animation本身不是Object，它的内部会有一个叫做`__object__`的属性来创建OBJECT，此函数会做的像是
```javascript
anim.__object__ = anim.update;
```

#### ``` draw(width, height, visible = true) ```
真正绘制动画到场景，并且创建OBJECT，每帧检查index是否超过speed，如果是则增加curframe，且每帧都替换OBJECT.image并调用update方法

---

## Animator 类

### 构造函数

```constructor(animations)```

创建一个动画管理器，用于管理多个动画之间的切换。

- `animations`: 动画对象的集合

### 方法

#### ``` connect(anim1, anim2, valueName, initValue, condition) ```
连接两个动画，并设置切换条件。

- `anim1`: 第一个动画
- `anim2`: 第二个动画
- `valueName`: 值的名称
- `initValue`: 初始值
- `condition`: 切换条件的函数

#### ``` setValue(valueName, value) ```
设置指定的值。

- `valueName`: 值的名称
- `value`: 值的内容

#### ``` getValue(valueName) ```
获取指定的值。

- `valueName`: 值的名称

#### ``` update() ```
更新当前动画状态并根据条件切换动画。

示例：

```javascript
let walkAnim = new Animation(['walk1.png', 'walk2.png'], 10);
let jumpAnim = new Animation(['jump1.png', 'jump2.png'], 10);

let animator = new Animator({ walk: walkAnim, jump: jumpAnim });
animator.connect(walkAnim, jumpAnim, 'isJumping', false, (value) => value);
animator.setValue('isJumping', true);

engine.objects.push(animator);
```

---

## Button 类

### 构造函数

```constructor(image, x, y, width, height, callback)```

创建一个按钮对象，按钮可点击并触发回调。

- `image`: 按钮的图片
- `x`: 按钮的 x 坐标
- `y`: 按钮的 y 坐标
- `width`: 按钮的宽度
- `height`: 按钮的高度
- `callback`: 点击按钮时触发的回调函数

### 方法

#### ``` onClick(x, y) ```
检测点击事件，如果点击位置在按钮的碰撞箱内，则触发回调。

- `x`: 点击的 x 坐标
- `y`: 点击的 y 坐标

示例：

```javascript
let button = new Button(engine.getImage('button.png'), 100, 100, 200, 50, () => {
    console.log('Button clicked');
});
engine.objects.push(button);
```