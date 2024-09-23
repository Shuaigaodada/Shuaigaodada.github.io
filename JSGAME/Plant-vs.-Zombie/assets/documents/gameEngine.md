# 游戏引擎文档

## 1. 游戏引擎类 (GameEngine)

游戏引擎类管理游戏的整体逻辑、绘制、资源加载等。

```class GameEngine```

### 构造函数

```constructor(width, height)```

- **参数:**
  - `width`: 画布宽度
  - `height`: 画布高度

### 属性

- `canvas`: 游戏画布元素，用于渲染。
- `ctx`: 画布上下文，用于绘图。
- `width`: 画布宽度。
- `height`: 画布高度。
- `objects`: 当前场景中的游戏对象列表。
- `fps`: 帧率，默认60帧每秒。
- `deltaTime`: 帧间隔时间（秒），可用于同步动画。
- `update`: 游戏循环的更新回调函数。

### 方法

#### ```registerEvent(name, callback)```
注册更新事件。

- **参数:**
  - `name`: 事件名称
  - `callback`: 游戏循环中的更新事件回调函数

#### ```removeEvent(name)```
移除更新事件。

- **参数:**
  - `name`: 事件名称

#### ```getAnimation(_class, name)```
获取动画对象。

- **参数:**
  - `_class`: 动画所属的类
  - `name`: 动画的名称
- **返回值:** 动画对象

#### ```engine_update()```
引擎更新方法，负责更新游戏逻辑和绘制画面。

#### ```preload(imgsrc)```
预加载图片。

- **参数:**
  - `imgsrc`: 图片的源路径
- **返回值:** Promise，返回加载完成的图片对象

#### ```preloadAudio(name, src)```
预加载音频。

- **参数:**
  - `name`: 音频的名称
  - `src`: 音频的源路径
- **返回值:** Promise，返回加载完成的音频对象

#### ```playAudio(name)```
播放音频。

- **参数:**
  - `name`: 音频的名称

#### ```pauseAudio(name)```
暂停音频。

- **参数:**
  - `name`: 音频的名称

#### ```setAudioVolume(name, volume)```
设置音频音量。

- **参数:**
  - `name`: 音频的名称
  - `volume`: 音量大小 (0-1)

#### ```setAudioLoop(name, loop)```
设置音频循环播放。

- **参数:**
  - `name`: 音频的名称
  - `loop`: 是否循环播放

#### ```save_level(name)```
保存当前关卡状态。

- **参数:**
  - `name`: 关卡的名称

#### ```load_level(name)```
加载指定关卡。

- **参数:**
  - `name`: 关卡的名称

#### ```sleep(ms)```
暂停一段时间。

- **参数:**
  - `ms`: 暂停的时间（毫秒）
- **返回值:** Promise，延迟一段时间后继续执行

#### ```draw(object)```
绘制对象。

- **参数:**
  - `object`: 需要绘制的对象

#### ```getImage(name)```
获取预加载的图片。

- **参数:**
  - `name`: 图片名称
- **返回值:** 图片对象

#### ```start()```
启动游戏引擎。

#### ```clear()```
清空场景中的所有对象。

---

## 2. 碰撞盒类 (CollisionBox)

用于处理物体的碰撞检测。

```class CollisionBox```

### 构造函数

```constructor(x, y, width, height)```

- **参数:**
  - `x`: 碰撞盒的 x 坐标
  - `y`: 碰撞盒的 y 坐标
  - `width`: 碰撞盒的宽度
  - `height`: 碰撞盒的高度

### 属性

- `x`: 碰撞盒的x坐标。
- `y`: 碰撞盒的y坐标。
- `width`: 碰撞盒的宽度。
- `height`: 碰撞盒的高度。
- `debug`: 提供调试功能，详见[debug属性](#debug属性)。

#### debug 属性
`debug` 是一个包含调试相关功能的对象，推荐通过 `debug.show()` 和 `debug.hide()` 来启用或隐藏调试模式。

- `show()`: 启用调试模式，显示碰撞盒的边框。
- `hide()`: 隐藏碰撞盒的边框。
- `show_color`: 调试模式显示时边框的颜色，默认值为 `lightgreen`。
- `hide_color`: 调试模式隐藏时边框的颜色，默认值为 `red`。

**不推荐**直接使用 `__debug_show()` 或 `__debug_hide()`，请使用[debug.show()](#debug属性)或[debug.hide()](#debug属性)。

### 方法

#### ```isCollideWith(box)```
检测与另一个碰撞盒是否发生碰撞。

- **参数:**
  - `box`: 另一个碰撞盒实例
- **返回值:** 是否发生碰撞

#### ```isCollideWithPoint(x, y)```
检测是否与某个点发生碰撞。

- **参数:**
  - `x`: 点的 x 坐标
  - `y`: 点的 y 坐标
- **返回值:** 是否发生碰撞

#### ```registerEvent()```
注册碰撞事件。

#### ```destory()```
销毁碰撞盒。

#### ```__debug_show()```
启用调试模式，显示碰撞盒的边框。**不推荐直接使用此方法，请使用[debug.show()](#debug属性)。**

#### ```onCollisionEnter(other)```
当碰撞开始时触发。

- **参数:**
  - `other`: 发生碰撞的另一个对象

---

## 3. 圆形碰撞盒类 (CircleCollisionBox)

继承自 `CollisionBox`，扩展圆形检测功能。

```class CircleCollisionBox```

### 构造函数

```constructor(x, y, radius)```

- **参数:**
  - `x`: 圆形碰撞盒的 x 坐标
  - `y`: 圆形碰撞盒的 y 坐标
  - `radius`: 圆形的半径

### 属性

继承自 `CollisionBox` 的所有属性，并新增：

- `radius`: 圆形的半径。

### 方法

#### ```isCollideWith(box)```
检测与另一个碰撞盒是否发生碰撞。

- **参数:**
  - `box`: 另一个碰撞盒实例（可以是 `CollisionBox` 或 `CircleCollisionBox`）
- **返回值:** 是否发生碰撞

#### ```isCollideWithPoint(x, y)```
检测圆形是否与某个点发生碰撞。

- **参数:**
  - `x`: 点的 x 坐标
  - `y`: 点的 y 坐标
- **返回值:** 是否发生碰撞

#### ```__debug_show()```
启用调试模式，显示圆形碰撞盒的边框。

---

## 4. 游戏对象类 (OBJECT)

游戏中的对象类，表示场景中的物体。

```class OBJECT```

### 构造函数

```constructor(image, width, height, visible)```

- **参数:**
  - `image`: 对象的图像
  - `width`: 对象的宽度
  - `height`: 对象的高度
  - `visible`: 是否可见

### 属性

- `x`: 对象的 x 坐标。
- `y`: 对象的 y 坐标。
- `width`: 对象的宽度。
- `height`: 对象的高度。
- `image`: 对象的图像。
- `text`: 如果没有图像，则显示文本。
- `style`: 文本样式，包括字体和颜色。
- `rotation`: 旋转角度。
- `slider`: 滑动比例，控制对象的可见部分。
- `visible`: 对象是否可见。
- `opacity`: 对象的不透明度，范围从 0 到 1。
- `collisionBox`: 碰撞盒对象，用于检测碰撞。

### 方法

#### ```createCollisionBox(offsetX, offsetY, offsetWidth, offsetHeight)```
创建一个碰撞盒。

- **参数:**
  - `offsetX`: 碰撞盒的 x 偏移量
  - `offsetY`: 碰撞盒的 y 偏移量
  - `offsetWidth`: 碰撞盒的宽度偏移量
  - `offsetHeight`: 碰撞盒的高度偏移量

#### ```createCircleCollisionBox(radius, offsetX, offsetY)```
创建一个圆形碰撞盒。

- **参数:**
  - `radius`: 圆形碰撞盒的半径
  - `offsetX`: 圆形碰撞盒的 x 偏移量
  - `offsetY`: 圆形碰撞盒的 y 偏移量

#### ```destoryCollisionBox()```
销毁碰撞盒。

#### ```setOpacity(opacity)```
设置对象的透明度。

- **参数:**
  - `opacity`: 透明度，范围从 0 到 1

#### ```setOrder(order)```
设置对象的绘制顺序。

- **参数:**
  - `order`: 绘制顺序

#### ```setSlider(slider)```
设置对象的滑动效果比例。

- **参数:**
  - `slider`: 滑动比例，范围从 0 到 1

#### ```setPosition(x, y)```
设置对象的位置。

- **参数:**
  - `x`: x 坐标
  - `y`: y 坐标

#### ```destory()```
销毁当前对象。

---

## 5. 动画类 (Animation)

用于处理对象的动画效果。

```class Animation```

### 构造函数

```constructor(_class, name, imgs, speed, callback)```

- **参数:**
  - `_class`: 动画所属的类名
  - `name`: 动画名称
  - `imgs`: 动画帧的图像数组
  - `speed`: 动画帧切换速度
  - `callback`: 动画加载完成后的回调函数

### 属性

- `frames`: 动画帧的图像数组。
- `curframe`: 当前帧索引。
- `speed`: 动画帧切换速度。
- `loop`: 是否循环播放。

### 方法

#### ```draw(width, height, visible)```
绘制动画帧。

- **参数:**
  - `width`: 动画对象的宽度
  - `height`: 动画对象的高度
  - `visible`: 是否可见

#### ```update()```
更新动画帧。

#### ```setPosition(x, y)```
设置动画对象的位置。

- **参数:**
  - `x`: x 坐标
  - `y`: y 坐标

---

## 6. 动画控制器类 (Animator)

管理多个动画之间的切换。

```class Animator```

### 构造函数

```constructor(animations, x, y, w, h, v)```

- **参数:**
  - `animations`: 动画对象集合
  - `x`: x 坐标
  - `y`: y 坐标
  - `w`: 宽度
  - `h`: 高度
  - `v`: 是否可见

### 属性

- `animations`: 包含所有动画的集合。
- `current`: 当前播放的动画。
- `values`: 控制器中的变量值，用于动画之间的条件判断。

### 方法

#### ```connect(anim1, anim2, valueName, initValue, condition)```
连接两个动画，并设置切换条件。

- **参数:**
  - `anim1`: 起始动画
  - `anim2`: 目标动画
  - `valueName`: 连接条件的变量名
  - `initValue`: 初始值
  - `condition`: 动画切换条件

#### ```setValue(valueName, value)```
设置动画控制器的变量值。

- **参数:**
  - `valueName`: 变量名
  - `value`: 变量值

#### ```getValue(valueName)```
获取动画控制器的变量值。

- **参数:**
  - `valueName`: 变量名

#### ```update()```
更新动画状态并处理动画切换。

#### ```getFrameLength()```
获取所有动画的帧数总和。

- **返回值:** 动画帧数
