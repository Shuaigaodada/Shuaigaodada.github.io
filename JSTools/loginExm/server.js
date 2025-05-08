// 账号密码登录
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
// hash加密
const crypto = require('crypto');

const app = express();
const port = 3000;

// 解析请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 允许跨域请求
app.use(cors());

// 模拟数据库
const USERS_DB = {
    "user1": crypto.createHash('sha256').update('password1').digest('hex'),
    "user2": crypto.createHash('sha256').update('password2').digest('hex'),
    "user3": crypto.createHash('sha256').update('123456').digest('hex'),
}


// 登录接口
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 检查用户名和密码是否存在
    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 检查用户名和密码是否正确
    if (USERS_DB[username] && USERS_DB[username] === password) {
        return res.status(200).json({ message: '登录成功' });
    } else {
        return res.status(401).json({ message: '用户名或密码错误' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
