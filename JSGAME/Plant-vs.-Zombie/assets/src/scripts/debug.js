// 创建并隐藏控制台窗口
const consoleWindow = document.createElement('div');
consoleWindow.id = 'consoleWindow';
consoleWindow.style.position = 'fixed';
consoleWindow.style.bottom = '0';
consoleWindow.style.right = '0';
consoleWindow.style.width = '300px';
consoleWindow.style.height = '200px';
consoleWindow.style.backgroundColor = 'black';
consoleWindow.style.color = 'white';
consoleWindow.style.overflowY = 'scroll';
consoleWindow.style.display = 'none';
document.body.appendChild(consoleWindow);

// 捕获控制台日志并显示在控制台窗口中
window.addEventListener('DOMContentLoaded', (event) => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = function(...args) {
        originalLog.apply(console, args);
        const logMessage = document.createElement('div');
        logMessage.textContent = `[LOG] ${new Date().toISOString()} - ${args.join(' ')}`;
        consoleWindow.appendChild(logMessage);
        consoleWindow.scrollTop = consoleWindow.scrollHeight; // 自动滚动到底部
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        const logMessage = document.createElement('div');
        logMessage.textContent = `[ERROR] ${new Date().toISOString()} - ${args.join(' ')}`;
        logMessage.style.color = 'red';
        consoleWindow.appendChild(logMessage);
        consoleWindow.scrollTop = consoleWindow.scrollHeight; // 自动滚动到底部
    };
});

// 监听键盘事件，按下 p 键时显示控制台窗口
document.addEventListener('keydown', (event) => {
    if (event.key === 'p') {
        consoleWindow.style.display = consoleWindow.style.display === 'none' ? 'block' : 'none';
    }
});