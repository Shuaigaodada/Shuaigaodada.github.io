// 捕获控制台日志并显示在日志容器中
window.addEventListener('DOMContentLoaded', (event) => {
    const logContainer = document.getElementById('logContainer');
    const originalLog = console.log;
    const originalError = console.error;

    console.log = function(...args) {
        originalLog.apply(console, args);
        const logMessage = document.createElement('div');
        logMessage.textContent = `[LOG] ${new Date().toISOString()} - ${args.join(' ')}`;
        logContainer.appendChild(logMessage);
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        const logMessage = document.createElement('div');
        logMessage.textContent = `[ERROR] ${new Date().toISOString()} - ${args.join(' ')}`;
        logMessage.style.color = 'red';
        logContainer.appendChild(logMessage);
    };
});