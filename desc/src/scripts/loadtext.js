function initwebsite() {
    setIndexContent();
}
function setIndexContent() {
    setText("./src/FHS_content.txt", "FHS-content");
}
function setText(path, id) {
    fetch(path)
        .then(response => response.text())
        .then(data => {
            document.getElementById(id).innerText = data;
        })
        .catch(error => console.error('Error:', error));
}

window.onload = initwebsite;