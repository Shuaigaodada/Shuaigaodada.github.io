console.log("Loadsource loaded");
const BACKGROUND = "./assets/images/Background";
const CARD = "./assets/images/Card";
const UI = "./assets/images/UI";
const EFFECT = "./assets/images/Effect";
const ZombieRootPath = "./assets/images/Zombies/Zombie";
const PeashooterRootPath = "./assets/images/Plants";
const AudioMusicPath = "./assets/audios/Music";
const AudioSoundPath = "./assets/audios/Sound";


function join(a, b) { return a + "/" + b; }

const FONTS = [
    new FontFace("Arialn", "url(./assets/Font/Arialn.ttf)"),
    new FontFace("ArialTh", "url(./assets/Font/ArialTh.ttf)"),
    new FontFace("ARIBL0", "url(./assets/Font/ARIBL0.ttf)"),
    new FontFace("G_ari_bd", "url(./assets/Font/G_ari_bd.TTF)"),
    new FontFace("G_ari_i", "url(./assets/Font/G_ari_i.TTF)"),
    new FontFace("GEO_AI__", "url(./assets/Font/GEO_AI__.TTF)")
];
const LOADINGPAGES = [
    join(BACKGROUND, "titlescreen.jpg"),
    join(UI, "PvZ_Logo.png"),
    join(UI, "SodRollCap.png"),
    join(UI, "LoadBar_dirt.png"),
    join(UI, "LoadBar_grass.png"),
]
const PRELOADIMAGES = [
    join(BACKGROUND, "background1.jpg"),
    join(BACKGROUND, "background2.jpg"),
    join(BACKGROUND, "blackBackground.jpeg"),
    join(BACKGROUND, "logo.jpg"),
    join(BACKGROUND, "main_bg.png"),
    join(BACKGROUND, "redream.png"),
    
    join(CARD, "card_bk.jpg"),
    join(CARD, "card_cherrybomb.png"),
    join(CARD, "card_cherrybomb2.png"),
    join(CARD, "card_chomper.png"),
    join(CARD, "card_chomper2.png"),
    join(CARD, "card_hypnoshroom.png"),
    join(CARD, "card_hypnoshroom2.png"),
    join(CARD, "card_iceshroom.png"),
    join(CARD, "card_iceshroom2.png"),
    join(CARD, "card_jalapeno.png"),
    join(CARD, "card_jalapeno2.png"),
    join(CARD, "card_peashooter.png"),
    join(CARD, "card_peashooter2.png"),
    join(CARD, "card_potatomine.png"),
    join(CARD, "card_potatomine2.png"),
    join(CARD, "card_puffshroom.png"),
    join(CARD, "card_puffshroom2.png"),
    join(CARD, "card_repeaterpea.png"),
    join(CARD, "card_repeaterpea2.png"),
    join(CARD, "card_scaredyshroom.png"),
    join(CARD, "card_scaredyshroom2.png"),
    join(CARD, "card_snowpea.png"),
    join(CARD, "card_snowpea2.png"),
    join(CARD, "card_spikeweed.png"),
    join(CARD, "card_spikeweed2.png"),
    join(CARD, "card_squash.png"),
    join(CARD, "card_squash2.png"),
    join(CARD, "card_sunflower.png"),
    join(CARD, "card_sunflower2.png"),
    join(CARD, "card_sunshroom.png"),
    join(CARD, "card_sunshroom2.png"),
    join(CARD, "card_threepeashooter.png"),
    join(CARD, "card_threepeashooter2.png"),
    join(CARD, "card_wallnut.png"),
    join(CARD, "card_wallnut2.png"),

    join(UI, "StartSet.png"),
    join(UI, "StartReady.png"),
    join(UI, "StartPlant.png"),

    join(EFFECT, "PeaBullet.png"),
    join(EFFECT, "PeaBulletHit.png"),
];

const AUDIOSOURCE = [
    join(AudioMusicPath, "bgm1.mp3"),
    join(AudioMusicPath, "bgm2.mp3"),
    join(AudioMusicPath, "bgm3.mp3"),
    join(AudioMusicPath, "bgm4.mp3"),
    join(AudioMusicPath, "bgm5.mp3"),
    join(AudioMusicPath, "ThemeSong.mp3"),

    join(AudioSoundPath, "awooga.ogg"),
    join(AudioSoundPath, "bungee_scream.ogg"),
    join(AudioSoundPath, "buttonclick.ogg"),
    join(AudioSoundPath, "cherrybomb.ogg"),
    join(AudioSoundPath, "chomp.ogg"),
    join(AudioSoundPath, "chompsoft.ogg"),
    join(AudioSoundPath, "coffee.ogg"),
    join(AudioSoundPath, "doomshroom.ogg"),
    join(AudioSoundPath, "finalwave.ogg"),
    join(AudioSoundPath, "firepea.ogg"),
    join(AudioSoundPath, "frozen.ogg"),
    join(AudioSoundPath, "groan.ogg"),
    join(AudioSoundPath, "hugewave.ogg"),
    join(AudioSoundPath, "jalapeno.ogg"),
    join(AudioSoundPath, "kernelpult2.ogg"),
    join(AudioSoundPath, "lawnmower.ogg"),
    join(AudioSoundPath, "losemusic.ogg"),
    join(AudioSoundPath, "newspaper_rarrgh.ogg"),
    join(AudioSoundPath, "newspaper_rip.ogg"),
    join(AudioSoundPath, "pause.ogg"),
    join(AudioSoundPath, "plant.ogg"),
    join(AudioSoundPath, "points.ogg"),
    join(AudioSoundPath, "potato_mine.ogg"),
    join(AudioSoundPath, "readysetplant.ogg"),
    join(AudioSoundPath, "seedlift.ogg"),
    join(AudioSoundPath, "shieldhit.ogg"),
    join(AudioSoundPath, "shoot.mp3"),
    join(AudioSoundPath, "shovel.ogg"),
    join(AudioSoundPath, "siren.ogg"),
    join(AudioSoundPath, "snow_pea_sparkles.ogg"),
    join(AudioSoundPath, "squash_hmm 1.ogg"),
    join(AudioSoundPath, "squash_hmm.ogg"),
    join(AudioSoundPath, "squash_hmm2.ogg"),
    join(AudioSoundPath, "tap.ogg"),
    join(AudioSoundPath, "winmusic.ogg")
]
