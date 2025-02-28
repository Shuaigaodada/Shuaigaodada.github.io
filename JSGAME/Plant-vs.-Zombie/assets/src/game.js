window.onload = async function() {
    engine.init("gameCanvas", 800, 500);
    
    await load_page();

    engine.loop();
}