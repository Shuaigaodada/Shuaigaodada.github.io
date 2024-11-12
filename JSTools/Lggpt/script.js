const apiKey = "sk-k9NC5rQ4xfhmp44RucC5YrddqZEsuzTZHQ8Cb00UnESccLvh"; // 替换为你的API密钥
const url = "https://api.chatanywhere.org/v1/chat/completions";

// 配置 marked 以使用 highlight.js 渲染代码块
marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
});

function logMessage(message) {
    const logsContainer = document.getElementById('logs');
    const logElement = document.createElement('div');
    logElement.textContent = message;
    logsContainer.appendChild(logElement);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

async function callChatGPT(message) {
    logMessage(`Calling ChatGPT with message: ${message}`);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: message }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logMessage(`Received response from ChatGPT: ${JSON.stringify(data)}`);
        return data.choices[0].message.content.trim();
    } catch (error) {
        logMessage(`Error calling ChatGPT: ${error.message}`);
        return "Error: Unable to get response from ChatGPT.";
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value;
    input.value = ''; // 立即清空输入栏
    if (message.trim() !== '') {
        logMessage(`Sending message: ${message}`);
        
        // 立即显示用户消息
        const messagesContainer = document.getElementById('messages');
        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('message', 'user');
        userMessageElement.innerHTML = `<div class="bubble">${marked.parse(message)}</div>`;
        messagesContainer.appendChild(userMessageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // 获取并显示AI响应
        const response = await callChatGPT(message);
        const responseElement = document.createElement('div');
        responseElement.classList.add('message', 'ai');
        responseElement.innerHTML = `<div class="bubble">${marked.parse(response)}</div>`;
        messagesContainer.appendChild(responseElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        logMessage("Message sent and response received.");
    } else {
        logMessage("Message is empty, not sending.");
    }
}

document.getElementById('send-button').addEventListener('click', sendMessage);

document.getElementById('log-button').addEventListener('click', () => {
    const logContainer = document.getElementById('log-container');
    logContainer.classList.toggle('hidden');
});

document.getElementById('message-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});