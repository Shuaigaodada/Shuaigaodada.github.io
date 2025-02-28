async function load_page() {
    Resources.add("bg1", "assets/images/Background/background1.jpg");

    await Resources.loadAll()
    
    bg = new GameObject("bg1", new Vector2(0, 0), engine.width, engine.height);

}