import { Modelo } from "../gl/Modelo.js";
import { Utills } from "../Utills.js";

import { PlayerModelo } from "../modelos/Player.js";
import { SolModelo } from "../modelos/Sol.js";
import { AviaoModelo } from "../modelos/Aviao.js";
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

        this.torre = new Modelo({
            pos: [10,10,10],
            setupGL: this.setupGL,
            objUrl: "modelos/torre/torre.obj"
        })
        this.torre.loadFromOBJ();

        this.player = new Player([this.terreno.tamanhoMapa[0]/2,20,this.terreno.tamanhoMapa[1]/2],keys,this.aviao);

        this.root.add(this.aviao);
        this.root.add(this.torre);

        this.aviao.setPos(this.player.pos);
    }
    tick(time){
        
        this.player.tick(time);
        this.aviao.setPos(this.player.pos);
        this.aviao.root.rot[1] = utills.radians(this.player.angulo);
        
        this.camera.updateCamera([this.player.pos[0],this.player.pos[1],this.player.pos[2]], -this.player.angulo - 90);

        if(this.camera.cameraMode === "locked") this.player.controls = true;
        //console.log(this.camera.pos);
        
        //console.log(this.terreno?.pos[this.player.pos[0] | 0][Math.max(0,this.player.pos[2] | 0)][2]);
    }
}