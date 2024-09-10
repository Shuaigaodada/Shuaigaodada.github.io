# 资源加载使用文档

本文件包含了游戏所需的字体、图片资源的路径定义及加载方式。本文将介绍如何使用这些路径与加载方法。

## 常量定义

### BACKGROUND

```const BACKGROUND = "./assets/images/Background"```

定义了背景图片的根目录路径。

### CARD

```const CARD = "./assets/images/Card"```

定义了卡牌图片的根目录路径。

### UI

```const UI = "./assets/images/UI"```

定义了UI（用户界面）图片的根目录路径。

### ZombieRootPath

```const ZombieRootPath = "./assets/images/Zombies/Zombie"```

定义了僵尸图片的根目录路径。

### PeashooterRootPath

```const PeashooterRootPath = "./assets/images/Plants"```

定义了植物图片的根目录路径。

### join(a, b)

```function join(a, b) { return a + "/" + b; }```

一个工具函数，用于将两个路径拼接在一起，返回完整路径。

- `a`: 路径的第一个部分
- `b`: 路径的第二个部分
- 返回值: 拼接后的完整路径

示例：

```javascript
let fullPath = join(BACKGROUND, "titlescreen.jpg");
console.log(fullPath); // 输出: "./assets/images/Background/titlescreen.jpg"
```

---

## 字体加载

### FONTS

```javascript
const FONTS = [
    new FontFace("Arialn", "url(./assets/Font/Arialn.ttf)"),
    new FontFace("ArialTh", "url(./assets/Font/ArialTh.ttf)"),
    new FontFace("ARIBL0", "url(./assets/Font/ARIBL0.ttf)"),
    new FontFace("G_ari_bd", "url(./assets/Font/G_ari_bd.TTF)"),
    new FontFace("G_ari_i", "url(./assets/Font/G_ari_i.TTF)"),
    new FontFace("GEO_AI__", "url(./assets/Font/GEO_AI__.TTF)")
]```

`FONTS` 常量定义了游戏所需的字体，并通过 `FontFace` 构造函数进行定义。每个 `FontFace` 对象表示一个字体。

### 字体加载示例

```javascript
FONTS.forEach(font => {
    font.load().then(loadedFont => {
        document.fonts.add(loadedFont);
        console.log(`Font ${loadedFont.family} loaded successfully`);
    }).catch(err => console.error(`Failed to load font: ${err}`));
});
```

此示例遍历 `FONTS` 数组，并加载每个字体。成功加载后，将字体添加到文档中。

---

## 加载页面资源

### LOADINGPAGES

```javascript
const LOADINGPAGES = [
    join(BACKGROUND, "titlescreen.jpg"),
    join(UI, "PvZ_Logo.png"),
    join(UI, "SodRollCap.png"),
    join(UI, "LoadBar_dirt.png"),
    join(UI, "LoadBar_grass.png"),
]```

`LOADINGPAGES` 包含了游戏启动时加载页面所需的图片资源路径。通过 `join` 函数将根路径与图片文件名拼接，形成完整的图片路径。

### 加载页面资源示例

```javascript
LOADINGPAGES.forEach(imgPath => {
    let img = new Image();
    img.src = imgPath;
    img.onload = () => console.log(`Image ${img.src} loaded successfully`);
    img.onerror = () => console.error(`Failed to load image: ${img.src}`);
});
```

此示例遍历 `LOADINGPAGES` 数组，并加载每个页面资源图片。加载成功或失败时会输出相应的日志信息。

---

## 预加载的图片资源

### PRELOADIMAGES

```javascript
const PRELOADIMAGES = [
    join(BACKGROUND, "background1.jpg"),
    join(BACKGROUND, "background2.jpg"),
    join(BACKGROUND, "blackBackground.jpeg"),
    join(BACKGROUND, "logo.jpg"),
    join(BACKGROUND, "main_bg.png"),
    join(BACKGROUND, "redream.png"),
    
    join(CARD, "card_bk.jpg"),
    join(CARD, "card_cherrybomb.png"),
    join(CARD, "card_cherrybomb2.png"),
    join(CARD, "card_chomper.png"),
    join(CARD, "card_chomper2.png"),
    join(CARD, "card_hypnoshroom.png"),
    join(CARD, "card_hypnoshroom2.png"),
    join(CARD, "card_iceshroom.png"),
    join(CARD, "card_iceshroom2.png"),
    join(CARD, "card_jalapeno.png"),
    join(CARD, "card_jalapeno2.png"),
    join(CARD, "card_peashooter.png"),
    join(CARD, "card_peashooter2.png"),
    join(CARD, "card_potatomine.png"),
    join(CARD, "card_potatomine2.png"),
    join(CARD, "card_puffshroom.png"),
    join(CARD, "card_puffshroom2.png"),
    join(CARD, "card_repeaterpea.png"),
    join(CARD, "card_repeaterpea2.png"),
    join(CARD, "card_scaredyshroom.png"),
    join(CARD, "card_scaredyshroom2.png"),
    join(CARD, "card_snowpea.png"),
    join(CARD, "card_snowpea2.png"),
    join(CARD, "card_spikeweed.png"),
    join(CARD, "card_spikeweed2.png"),
    join(CARD, "card_squash.png"),
    join(CARD, "card_squash2.png"),
    join(CARD, "card_sunflower.png"),
    join(CARD, "card_sunflower2.png"),
    join(CARD, "card_sunshroom.png"),
    join(CARD, "card_sunshroom2.png"),
    join(CARD, "card_threepeashooter.png"),
    join(CARD, "card_threepeashooter2.png"),
    join(CARD, "card_wallnut.png"),
    join(CARD, "card_wallnut2.png")
]```

`PRELOADIMAGES` 常量定义了需要预加载的所有游戏图片资源。图片资源包括背景、卡片等。每个路径使用 `join` 函数拼接生成。

### 预加载图片资源示例

```javascript
PRELOADIMAGES.forEach(imgPath => {
    let img = new Image();
    img.src = imgPath;
    img.onload = () => console.log(`Preloaded image: ${img.src}`);
    img.onerror = () => console.error(`Failed to preload image: ${img.src}`);
});
```

此示例遍历 `PRELOADIMAGES` 数组，并尝试预加载所有图片资源。成功或失败时输出日志信息。

---

## 小结

本文详细介绍了如何定义游戏的资源路径及加载图片和字体的基本用法。通过 `join` 函数，可以轻松管理资源的路径拼接；通过 `FONTS`, `LOADINGPAGES`, `PRELOADIMAGES` 等常量，开发者可以快速获取并加载所需的资源。
