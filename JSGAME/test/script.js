engine.init("gameCanvas", 800, 600);
engine.start();
// load source
image_path = [
    "Zombie2_1.png", "Zombie2_2.png", "Zombie2_3.png", "Zombie2_4.png", "Zombie2_5.png",
    "Zombie2_6.png", "Zombie2_7.png", "Zombie2_8.png", "Zombie2_9.png", "Zombie2_10.png",
    "Zombie2_11.png", "Zombie2_12.png", "Zombie2_13.png", "Zombie2_14.png", "Zombie2_15.png",
    "Zombie2_16.png", "Zombie2_17.png", "Zombie2_18.png", "Zombie2_19.png", "Zombie2_20.png",
    "Zombie2_21.png", "Zombie2_22.png", "Zombie2_23.png", "Zombie2_24.png", "Zombie2_25.png",
    "Zombie2_26.png", "Zombie2_27.png", "Zombie2_28.png", "Zombie2_29.png", "Zombie2_30.png",
    "Zombie2_31.png"
]
basePath = "./Move1/";

realpath = [];
for(let imgp of image_path) {
    realpath.push(basePath + imgp);
}

new PreloadAnimation("Zombie", "Move", realpath, ()=>{});
engine.preload("./Move1/blackBackground.jpeg");
async function main() {
    await engine.sleep(1000);
    let zombie = engine.getAnimation("Zombie", "Move");
    zombie.create(125, 125);
    zombie.__object__.flip.x = true;
    zombie.__object__.createCollisionBox(30, 50, -90, -50);
    zombie.__object__.rigidbody = true;
    zombie.__object__.collisionBox.debug.show();

    const floor = GameObject.create("blackBackground.jpeg", 0, 500, 800, 100);
    floor.createCollisionBox();
    floor.collisionBox.debug.show();

    zombie.update = function() {
        if(Input.getKeyDown(KeyCode.Space)) {
            this.__object__.upForce = 100;
        }
    }

}

main();
