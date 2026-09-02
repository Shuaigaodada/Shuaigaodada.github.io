# Blackjack UI SVG 图标初稿

这些 SVG 根据 `game/UI.jpg` 与 `images/hljk` 中的低分辨率截图重新绘制，不是对原游戏素材的直接描摹。

## 文件

- `point-single.svg`：单点数排版示例。
- `point-multiple.svg`：多重点数排版示例，当前以 `7/0` 展示。
- `point-multiple-three.svg`：三个候选点数排版示例，以 `0/2/5` 展示并高亮当前采用的 2。
- `insight.svg`、`exploit.svg`、`hollow.svg`、`whisper.svg`、`break.svg`、`ignite.svg`、`devour.svg`：七个核心机制。
- `forced.svg`、`no-value.svg`：强制与无点数状态。
- `suits/`：8 种原创牌型徽记，不依赖现有 Blackjack 扑克牌 SVG。
- `card-example-tumor-5.svg`：包含点数、牌型图案和技能说明的完整觉醒牌样例。

## 使用约定

- 图标统一采用 `64 × 64` viewBox、透明背景和 `currentColor`，推荐以内联 SVG 或 React 组件方式使用，以便通过 CSS 控制颜色。
- 点数必须由运行时文字生成，不能把所有数字做成静态图片。点数数组可以是任意长度，例如 `[7, 0]`、`[0, 2, 5]` 或 `[-11, -1]`；三个点数及以上时自动缩小字号。这里的点数文件仅用于确认排版，正式实现时循环生成每个数值的 SVG 文本节点。
- 多重点数采用左下主点数、右上次点数和中间斜线，与参考图中的角标结构一致。
- 当前实际参与结算的点数使用 `value-active`：完全不透明并带短下划线；其他候选点数使用 `value-inactive`：透明度约为 32%。当结算采用值改变时，运行时交换这两个 class、`data-active` 和 opacity。
- 明暗只表示“当前采用值”，不能删除备用点数；玩家始终可以看到这张牌具有哪些候选点数。
- 默认牌面颜色建议使用深墨色 `#2a2118`；破损或负点数使用暗红色，觉醒技能使用旧金色。
- 卡牌必须使用新牌框、牌型徽记和技能说明组合生成，不引用 `poker-super2-modern-ignis` 中的标准扑克牌素材。
