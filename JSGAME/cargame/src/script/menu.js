function drawMenu() {
    // clear child node
    while(document.body.hasChildNodes())
        document.body.removeChild(document.body.firstChild)

    // load background
    document.body.style.background = 'url("' + Asset.UI.background + '")'

    var gameMenuLabel = document.createElement("h1")
    gameMenuLabel.classList.add("ui-label")
    gameMenuLabel.innerHTML = "RACING GAME"
    // create button
    var startButton = document.createElement("button")
    startButton.classList.add("ui-button")
    startButton.innerHTML = "START"
    startButton.onclick = () => { chooseMenu() }

    // draw UI
    document.body.appendChild(gameMenuLabel)
    document.body.appendChild(startButton)
}

function chooseMenu() {
    // clear child node
    while(document.body.hasChildNodes())
        document.body.removeChild(document.body.firstChild)

    // 创建容器
    var container = document.createElement('div');
    container.className = 'container';
    document.body.appendChild(container);

    // 创建并显示默认赛车图片
    var car1Img = document.createElement('img');
    car1Img.src = Asset.Game.car1;
    car1Img.className = 'car-image';
    container.appendChild(car1Img);

    var car2Img = document.createElement('img');
    car2Img.src = Asset.Game.car2;
    car2Img.className = 'car-image';
    container.appendChild(car2Img);

    // 创建输入框和按钮
    var uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*';
    uploadInput.className = 'input-field';
    container.appendChild(uploadInput);

    var urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = '输入网络图片URL';
    urlInput.className = 'input-field';
    container.appendChild(urlInput);

    var pveButton = document.createElement('button');
    pveButton.innerHTML = '玩家 vs AI';
    pveButton.className = 'action-button';
    pveButton.onclick = () => { start(PvE_logic); }
    container.appendChild(pveButton);

    var pvpButton = document.createElement('button');
    pvpButton.innerHTML = '玩家 vs 玩家';
    pvpButton.className = 'action-button';
    pvpButton.onclick = () => { start(PvP_logic); }
    container.appendChild(pvpButton);
}