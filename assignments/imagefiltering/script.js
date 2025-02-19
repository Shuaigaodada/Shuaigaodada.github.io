
function main() {
    const ctx = document.getElementById('canvas').getContext('2d');
    const img = new Image();
    img.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5fRVScfni2r7c06tC8nexYmfsm1djjRde2ufxM_KgpSikDSCc:https://www.swissinfo.ch/content/wp-content/uploads/sites/13/2016/03/461b0260784587bbe1ab939f3519108a-271108450-jpg-data.jpg&s';
    ctx.drawImage(img, 0, 0);
    pixels = PixelController(ctx, 0, 0, img.width, img.height);
    
}

window.onload = main;

