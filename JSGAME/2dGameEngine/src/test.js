document.addEventListener('DOMContentLoaded', async function() {
    // 初始化游戏引擎
    engine.init('gameCanvas', 800, 600);
    engine.startLoop();
    // 加载资源
    Resources.createFolder("images");
    Resources.createFolder("animations");
    Resources.add("images/pea1.png", "./GatlingPea_1.png");
    Resources.add("animations/pea1.anim", ["./images/pea1.png"]);
    Resources.add("animations/pea1.animator", ["animations/pea1.anim"]);
    await Resources.loadAll((progress) => {console.log(`加载进度: ${Mathf.Round(progress, 2)}%`);});
    console.log("load done");

    const object = new GameObject("images/pea1.png", new Vector2(100, 100), 100, 100);

    new CollisionBox(object);
    object.collisionBox.debug.show();

    const b = object.collisionBox.isCollideWithPoint(new Vector2(110, 101));
    console.log(`物体是否与点(110, 101)相交: ${b}`);
    
    await engine.sleep(1000);
    object.collisionBox.debug.hide();
    console.log("关闭碰撞盒显示");
    await engine.sleep(3000);
    object.image = null;
    console.log("删除图片");
    
    await engine.sleep(1000);
    console.log("一秒后通过动画替代图片");
    await engine.sleep(1000);
    new Animator(Resources.find("animations/pea1.animator"), object, "pea1");

    object.update = function() {
        let speed = 25 * engine.deltaTime * 10;
        if(Input.getKeyDown(KeyCode.A)) {
            this.position.x -= speed;
            this.flip.x = true;
        }
        if(Input.getKeyDown(KeyCode.D)) {
            this.position.x += speed;
            this.flip.x = false;
        }
        if(Input.getKeyDown(KeyCode.W))
            this.position.y -= speed;
        if(Input.getKeyDown(KeyCode.S))
            this.position.y += speed;


        if(Input.getKeyUp(KeyCode.H)) {
            Camera.main.position.x += 10;
            Camera.main.position.y += 20;
        }
    }
});