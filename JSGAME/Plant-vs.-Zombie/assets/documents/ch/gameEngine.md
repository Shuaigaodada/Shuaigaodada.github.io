# 游戏引擎手册

## 游戏引擎类

### 属性

- `__images`：图片资源数组
- `__audios`：音频资源对象
- `__animations`：动画资源对象
- `objects`：游戏对象数组
- `__levels`：关卡对象
- `__updateEvent`：更新事件对象
- `fps`：帧率
- `__time`：时间
- `deltaTime`：时间差

### 方法

- `init(canvas, width, height)`：初始化引擎
  - `canvas`：画布对象的 ID
  - `width`：画布的宽度
  - `height`：画布的高度

- `registerEvent(name, callback)`：注册更新事件
  - `name`：事件名称
  - `callback`：游戏循环中的更新事件回调函数

- `removeEvent(name)`：移除更新事件
  - `name`：事件名称

- `getAnimation(_class, name, speed)`：获取动画
  - `_class`：动画所属的类
  - `name`：动画的名称
  - `speed`：动画速度（可选，默认值为 1）

- `__mouseDown__(event)`：处理鼠标按下事件
  - `event`：鼠标按下事件对象

- `__mouseUp__(event)`：处理鼠标松开事件
  - `event`：鼠标松开事件对象

- `__mouseMove__(event)`：处理鼠标移动事件
  - `event`：鼠标移动事件对象

- `__update()`：游戏引擎更新方法

- `preload(imgsrc)`：预加载图片
  - `imgsrc`：图片的源路径

- `preloadAudio(name, src)`：预加载音频
  - `name`：音频的名称
  - `src`：音频的源路径

- `playAudio(name, callback, time)`：播放音频
  - `name`：音频的名称
  - `callback`：音频播放结束后的回调函数（可选）
  - `time`：播放时间（可选）

- `pauseAudio(name)`：暂停音频
  - `name`：音频的名称

- `setAudioVolume(name, volume)`：设置音频音量
  - `name`：音频的名称
  - `volume`：音量大小，范围为 0 到 1

- `setAudioLoop(name, loop)`：设置音频循环播放
  - `name`：音频的名称
  - `loop`：是否循环播放

- `save_level(name)`：保存当前关卡状态
  - `name`：关卡的名称

- `load_level(name)`：加载指定的关卡
  - `name`：关卡的名称

- `sleep(ms)`：暂停一段时间
  - `ms`：暂停的时间（毫秒）

- `draw(object)`：绘制对象
  - `object`：需要绘制的对象

- `getImage(name)`：获取预加载的图片
  - `name`：图片名称

- `start()`：启动游戏引擎

- `clear()`：清空场景中的所有对象

## 碰撞盒类

### CollisionBox

#### 属性

- `x`：碰撞盒的 x 坐标
- `y`：碰撞盒的 y 坐标
- `width`：碰撞盒的宽度
- `height`：碰撞盒的高度
- `offsetX`：x 偏移量
- `offsetY`：y 偏移量
- `offsetHeight`：高度偏移量
- `offsetWidth`：宽度偏移量
- `__enterObject`：进入对象数组

#### 方法

- `hide()`：隐藏碰撞盒
- `show()`：显示碰撞盒
- `static _generateUniqueId()`：生成唯一ID
- `__debug_show()`：启用调试模式
- `__debug_hide()`：隐藏调试模式
- `isCollideWith(box)`：检测与另一个碰撞盒是否发生碰撞
- `isCollideWithCircle(circle)`：检测方形与圆形的碰撞
- `isCollideWithPoint(x, y)`：检测是否与某个点发生碰撞
- `__collideEvent()`：检测当前碰撞盒是否与其他对象的碰撞盒发生碰撞
- `registerEvent()`：注册碰撞事件
- `destory(debug_hide)`：销毁碰撞盒
- `onCollisionEnter(other)`：当碰撞开始时触发
- `onCollisionStay(other)`：当碰撞持续时触发
- `onCollisionExit(other)`：当碰撞结束时触发

### CircleCollisionBox

#### 方法

- `constructor(x, y, radius)`：创建一个圆形碰撞盒实例
- `isCollideWith(box)`：检测与另一个碰撞盒是否发生碰撞
- `isCollideWithPoint(x, y)`：检测圆形是否与某个点发生碰撞
- `__debug_show()`：启用调试模式
- `__debug_hide()`：隐藏调试模式

## 游戏对象类

### GameObject

#### 属性

- `static OBJECT_ID`：静态变量，用于生成唯一ID

#### 方法

- `constructor(image, width, height, visible)`：构造函数
- `get x()`：获取对象的 x 坐标
- `get y()`：获取对象的 y 坐标
- `set x(x)`：设置对象的 x 坐标
- `set y(y)`：设置对象的 y 坐标
- `setChild(child)`：设置对象的位置
- `createCollisionBox(offsetX, offsetY, offsetWidth, offsetHeight)`：创建一个碰撞盒
- `createCircleCollisionBox(radius, offsetX, offsetY)`：创建一个圆形碰撞盒
- `destoryCollisionBox()`：销毁碰撞盒
- `setOpacity(opacity)`：设置对象的透明度
- `setSliderX(slider)`：设置对象的滑动效果比例
- `setSliderY(slider)`：设置对象的滑动效果比例
- `static create(imgName, x, y, width, height, visible)`：创建对象
- `findImage()`：查找并更新对象的图像
- `static destory(object)`：销毁对象
- `static destoryWithName(name)`：根据对象名称销毁对象
- `destory()`：销毁当前对象
- `copy()`：复制对象
- `update()`：更新对象（抽象方法）
- `onMouseDown()`：处理鼠标按下事件（抽象方法）
- `onMouseUp()`：处理鼠标松开事件（抽象方法）
- `onMouseMove()`：处理鼠标移动事件（抽象方法）
- `setPosition(x, y)`：设置对象的位置

## 动画类

### PreloadAnimation

#### 方法

- `constructor(_class, name, imgs, callback)`：构造函数
- `animation(speed)`：动画方法

### Animation

#### 方法

- `constructor(frames, speed)`：构造函数
- `addEvent(frameIndex, callback)`：添加事件
- `destory()`：销毁动画对象
- `create(width, height, visible)`：创建动画对象
- `update()`：更新动画帧
- `setPosition(x, y)`：设置动画对象的位置

### Animator

#### 方法

- `constructor(animations, x, y, w, h, v)`：构造函数
- `connect(anim1, anim2, condition, excess, callback)`：连接两个动画
- `setValue(valuenName, value)`：设置动画控制器的变量值
- `getValue(valuenName)`：获取动画控制器的变量值
- `__animator_update()`：更新动画状态并处理动画切换
- `getFrameLength()`：获取所有动画的帧数总和
- `destory()`：销毁动画控制器

## 按钮类

### Button

#### 方法

- `constructor(image, x, y, width, height, callback)`：构造函数
- `onMouseDown(x, y)`：处理鼠标按下事件

## 数学工具类

### Mathf

#### 方法

- `static Distance(x1, y1, x2, y2)`：计算两点之间的距离
- `static Direction(x1, y1, x2, y2)`：计算方向向量
- `static Random(min, max)`：生成随机数
- `static RandomInt(min, max)`：生成随机整数
- `static RandomChoice(arr)`：从数组中随机选择一个元素
- `static RandomColor()`：生成随机RGB颜色
- `static RandomColorAlpha()`：生成随机RGBA颜色
- `static RandomColorAlphaFixed()`：生成固定透明度的随机RGBA颜色
- `static Lerp(a, b, t)`：线性插值
- `static Clamp(value, min, max)`：将值限制在指定范围内
- `static Map(value, start1, stop1, start2, stop2)`：将值从一个范围映射到另一个范围
- `static Abs(value)`：计算值的绝对值
- `static MapClamp(value, start1, stop1, start2, stop2)`：映射并限制值
- `static Angle(x1, y1, x2, y2)`：计算两点之间的角度
- `static AngleToDirection(angle)`：将角度转换为方向向量
- `static DirectionToAngle(direction)`：将方向向量转换为角度
- `static RandomDirection()`：生成随机方向向量
- `static RandomDirection2()`：生成随机方向向量（弧度）
- `static Round(value, precision)`：将值四舍五入到指定的小数位数
- `static Sqrt(value)`：计算值的平方根
- `static Pow(value, exponent)`：计算值的平方
- `static Sin(value)`：计算值的正弦
- `static Cos(value)`：计算值的余弦
- `static Tan(value)`：计算值的正切
- `static Asin(value)`：计算值的反正弦
- `static Acos(value)`：计算值的反余弦
- `static Atan(value)`：计算值的反正切
- `static Atan2(y, x)`：计算两个值的反正切
- `static Log(value)`：计算值的自然对数
- `static Log10(value)`：计算值的以10为底的对数
- `static Log2(value)`：计算值的以2为底的对数
- `static Exp(value)`：计算值的指数
- `static Sign(value)`：计算值的符号
- `static Max(...values)`：计算值的最大值
- `static Min(...values)`：计算值的最小值

#### 向量操作子类

- `static Vector`：向量操作子类

## 游戏引擎实例

### engine

- `const engine = new GameEngine()`：游戏引擎实例，全局唯一