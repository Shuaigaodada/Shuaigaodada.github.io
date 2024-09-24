class GAMEMANAGER {
    line1Zombies = 0;
    line2Zombies = 0;
    line3Zombies = 0;
    line4Zombies = 0;
    line5Zombies = 0;

    AddZombieLine(line) {
        switch(line) {
            case 1:
                this.line1Zombies++;
                break;
            case 2:
                this.line2Zombies++;
                break;
            case 3:
                this.line3Zombies++;
                break;
            case 4:
                this.line4Zombies++;
                break;
            case 5:
                this.line5Zombies++;
                break;
        }
    }

    SubZombieLine(line) {
        switch(line) {
            case 1:
                this.line1Zombies--;
                break;
            case 2:
                this.line2Zombies--;
                break;
            case 3:
                this.line3Zombies--;
                break;
            case 4:
                this.line4Zombies--;
                break;
            case 5:
                this.line5Zombies--;
                break;
        }
    }

    GetLineZombies(line) {
        switch(line) {
            case 1:
                return this.line1Zombies;
            case 2:
                return this.line2Zombies;
            case 3:
                return this.line3Zombies;
            case 4:
                return this.line4Zombies;
            case 5:
                return this.line5Zombies;
        }
    }
}

const GameManager = new GAMEMANAGER();