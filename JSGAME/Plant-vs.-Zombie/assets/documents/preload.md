# 预加载页面和路径生成器使用文档

本文件包含游戏加载页面和动画路径的生成逻辑。本文将介绍如何使用 `PathGenerator` 和 `PreloadPages` 类，以及其他相关的函数和方法。

## 全局变量

### rollcap_x

```var rollcap_x = 440;```

草皮卷帽初始的 X 轴坐标。

### grass_x

```var grass_x = 450;```

草皮初始的 X 轴坐标。

---

## PathGenerator 类

`PathGenerator` 用于生成动画路径的类，主要用于生成不同对象的资源路径。

### 构造函数

```constructor()```

初始化 `PathGenerator` 对象，并定义根路径和路径数组。

- `root`: 根目录路径
- `path`: 存储生成的路径数组

### 静态方法

#### ```getLength(p)```

获取路径数组的总长度。

- `p`: 路径数组
- 返回值: 路径总长度

示例：

```javascript
let length = PathGenerator.getLength([["path1.png", "path2.png"]]);
console.log(length);  // 输出: 2
```

### 方法

#### ```setRoot(root)```

设置资源路径的根目录。

- `root`: 根路径

#### ```generate(dn, fn, minr, maxr)```

生成指定范围的文件路径。

- `dn`: 子目录名称
- `fn`: 文件名称前缀
- `minr`: 文件序号的最小值
- `maxr`: 文件序号的最大值

示例：

```javascript
let generator = new PathGenerator();
generator.setRoot(ZombieRootPath);
generator.generate("Move1", "Zombie_", 1, 10);
console.log(generator.path);
```

---

## PreloadPages 类

`PreloadPages` 类用于处理游戏加载页面及预加载图片和字体。

### 构造函数

```constructor()```

初始化 `PreloadPages` 对象，并定义各种加载页面和动画路径的属性。

### 方法

#### ```startLoad()```

开始加载资源，包括加载页面、动画路径和字体资源。

示例：

```javascript
let preloadPages = new PreloadPages();
preloadPages.startLoad();
```

#### ```create_loading_page()```

创建加载页面的对象，包括背景、进度条、草皮等图片对象。

示例：

```javascript
preloadPages.create_loading_page();
```

#### ```generate_path()```

生成动画资源路径，包括僵尸路径和豌豆射手路径。

示例：

```javascript
preloadPages.generate_path();
```

#### ```loadpageProgress(progress)```

更新加载进度条的显示状态。

- `progress`: 当前的加载进度（0 到 1 之间）

#### ```load()```

加载图片和动画资源，完成后显示菜单按钮。

#### ```loadImages(images)```

预加载一组图片资源。

- `images`: 图片资源路径数组

#### ```loadAnimation(animation_arts)```

预加载一组动画资源。

- `animation_arts`: 动画资源路径数组

示例：

```javascript
preloadPages.loadImages(PRELOADIMAGES);
```

#### ```generateZombiePath(generator)```

生成僵尸的动画路径。

- `generator`: `PathGenerator` 对象

示例：

```javascript
preloadPages.generateZombiePath(new PathGenerator());
```

#### ```load_font()```

加载字体资源并将其添加到文档中。

示例：

```javascript
preloadPages.load_font();
```

---

## 示例

### 1. 创建加载页面并开始加载资源

```javascript
let preloadPages = new PreloadPages();
preloadPages.startLoad();
```

### 2. 生成僵尸和豌豆射手的动画路径

```javascript
let generator = new PathGenerator();
generator.setRoot(ZombieRootPath);
preloadPages.generateZombiePath(generator);
console.log(generator.path); // 输出僵尸动画路径

generator.setRoot(PeashooterRootPath);
generator.generate("Peashooter", "Peashooter_", 1, 13);
console.log(generator.path); // 输出豌豆射手动画路径
```

### 3. 显示加载进度条

```javascript
preloadPages.loadpageProgress(0.5); // 更新进度条到 50%
```
