document.addEventListener('DOMContentLoaded', function() {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const consoleOutput = document.getElementById('consoleOutput');

    const formatArgs = (args) => {
        return args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ');
    };

    console.log = function(...args) {
        // Call the original console.log function
        originalConsoleLog.apply(console, args);

        // Create a new paragraph element for each log message
        const message = document.createElement('p');
        message.textContent = formatArgs(args);

        // Append the message to the consoleOutput div
        consoleOutput.appendChild(message);

        // Scroll to the bottom of the consoleOutput div
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    console.error = function(...args) {
        // Call the original console.error function
        originalConsoleError.apply(console, args);

        // Create a new paragraph element for each error message
        const errorMessage = document.createElement('p');
        errorMessage.style.color = 'red';
        errorMessage.textContent = formatArgs(args);

        // Append the error message to the consoleOutput div
        consoleOutput.appendChild(errorMessage);

        // Scroll to the bottom of the consoleOutput div
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    window.onerror = function(message, source, lineno, colno, error) {
        // Create a new paragraph element for the error message
        const errorMessage = document.createElement('p');
        errorMessage.style.color = 'red';
        errorMessage.textContent = `Error: ${message} at ${source}:${lineno}:${colno}`;

        // Append the error message to the consoleOutput div
        consoleOutput.appendChild(errorMessage);

        // Scroll to the bottom of the consoleOutput div
        consoleOutput.scrollTop = consoleOutput.scrollHeight;

        // Return true to prevent the default browser error handling
        return true;
    };
});