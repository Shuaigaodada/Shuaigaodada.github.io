// filepath: /workspaces/Shuaigaodada.github.io/JSTools/loginExm/client.js
// 引入 CryptoJS
function login(username, password) {
    // 加密密码为 sha256
    const hashedPassword = CryptoJS.SHA256(password).toString();
    // 发送登录请求
    return fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: hashedPassword
        })
    }).then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('登录失败');
        }
    });
}

// 绑定表单提交事件
document.querySelector('form').addEventListener('submit', function (event) {
    event.preventDefault(); // 阻止表单默认提交行为

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageElement = document.createElement('p'); // 创建消息元素

    login(username, password)
        .then(data => {
            messageElement.textContent = `登录成功: ${data.message}`;
            messageElement.style.color = 'green';
        })
        .catch(error => {
            messageElement.textContent = `登录失败: ${error.message}`;
            messageElement.style.color = 'red';
        })
        .finally(() => {
            const container = document.querySelector('.login-container');
            const existingMessage = container.querySelector('p');
            if (existingMessage) {
                existingMessage.remove(); // 移除旧的消息
            }
            container.appendChild(messageElement); // 显示新的消息
        });
});