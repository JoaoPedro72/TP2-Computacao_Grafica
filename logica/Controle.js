import { Modelo } from "../gl/Modelo.js";
import { Utills } from "../Utills.js";

import { PlayerModelo } from "../modelos/player.js";
import { SolModelo } from "../modelos/Sol.js";
import { AviaoModelo } from "../modelos/aviao.js";
import { Terreno } from "../modelos/Terreno.js";
import { Player } from "./Player.js";

const utills = new Utills();

export class Controle {
    constructor(setupGL, keys, camera){
        this.setupGL = setupGL;
        this.keys = keys;
        this.camera = camera;
        this.cameraWait = false;
        this.cameraWait2 = false;

        this.root = new Modelo({
            setupGL: setupGL
        });

        this.sol = new SolModelo(setupGL);
        this.aviao = new AviaoModelo(setupGL);
        this.terreno = new Terreno(setupGL, [100, 100]);

        this.player = new Player([this.terreno.tamanhoMapa[0]/2,20,this.terreno.tamanhoMapa[1]/2],keys,this.aviao);

        this.root.add(this.aviao);

        this.aviao.setPos(this.player.pos);
    }
    tick(time){
        
        this.player.tick(time);
        this.aviao.setPos(this.player.pos);
        this.aviao.root.rot[1] = utills.radians(this.player.angulo);
        
        this.camera.updateCamera([this.player.pos[0],this.player.pos[1],this.player.pos[2]], -this.player.angulo - 90);
        //console.log(this.camera.pos);
    }
}