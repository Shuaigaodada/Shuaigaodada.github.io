function initwebsite() {
    setIndexContent();
}
function setIndexContent() {
    setText("../file/FHS_content.txt", "FHS-content")
}
function setText(path, id){
    var fr = new FileReader();
    fr.onload = function() {
        document.getElementById(id).textContent = fr.result;
    }
    fr.readAsText(path);
}

initwebsite();

