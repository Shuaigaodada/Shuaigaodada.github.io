function drawMenu() {
    // load background
    document.body.style.background = 'url("' + Asset.UI.background + '")'

    var gameMenuLabel = document.createElement("h1")
    gameMenuLabel.classList.add("ui-label")
    gameMenuLabel.innerHTML = "RACING GAME"
    // create button
    var startButton = document.createElement("button")
    startButton.classList.add("ui-button")
    startButton.innerHTML = "START"
    startButton.onclick = () => {start(PvE_logic)}

    // draw UI
    document.body.appendChild(gameMenuLabel)
    document.body.appendChild(startButton)
}

function chooseMenu() {

}