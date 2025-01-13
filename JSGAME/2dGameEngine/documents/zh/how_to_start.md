# 如何开始
您可以到 [此处](https://github.com/Shuaigaodada/Shuaigaodada.github.io/blob/main/JSGAME/2dGameEngine/src/2dgameEngine.js) 将文件下载 也可以通过 以下链接来链接引擎
```
https://shuaigaodada.github.io/JSGAME/2dGameEngine/src/2dgameEngine.js
```

比起第一种方式 第二种方式可以保证版本最新 避免一些恶性 BUG
<hr>

我们在开始之前先创建一个用于展示游戏的网页 `index.htm`
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TEST</title>
    <style>
        body {
            display: flex;
            flex-direction: row; /* 改为横向排列 */
            align-items: center; /* 垂直居中 */
            justify-content: center; /* 水平居中 */
            height: 100vh;
            margin: 0;
            background-color: #000;
        }

        canvas {
            background-color: #000;
            border: 1px solid #fff;
            margin-right: 10px; /* 添加右边距 */
        }

        #logContainer {
            width: 300px; /* 调整宽度以适应布局 */
            height: 600px; /* 调整高度以匹配画布高度 */
            overflow-y: auto;
            background-color: #333;
            color: #fff;
            border: 1px solid #fff;
            padding: 10px;
            box-sizing: border-box;
        }
    </style>    
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script src="https://shuaigaodada.github.io/JSGAME/2dGameEngine/src/2dgameEngine.js"></script>
    <script src="./script.js"></script>
</body>
</html>
```

此网页包含了部分css用于更好的展示 `Canvas` 元素 在这段标签中最重要的便是 `<canvas id="gameCanvas">` 这一部分决定了引擎应该控制哪一个canvas。

我们通过 `<script src="https://shuaigaodada.github.io/JSGAME/2dGameEngine/src/2dgameEngine.js">` 来