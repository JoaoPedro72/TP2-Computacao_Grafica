import { Modelo } from "../gl/Modelo.js";
import { Utills } from "../Utills.js";

import { PlayerModelo } from "../modelos/Player.js";
import { SolModelo } from "../modelos/Sol.js";
import { AviaoModelo } from "../modelos/Aviao.js";
import { Terreno } from "../modelos/Terreno.js";
import { Player } from "./Player.js";
import { Entidade } from "./Entidade.js";

import { Grama } from "../modelos/Grama.js";
import { ArvoreInstanced } from "../modelos/ArvoreInstanced.js";
import { SetupGL } from "../gl/SetupGL.js";
import { Camera } from "../Camera.js";

const utills = new Utills();

export class Controle {
    /**
     * 
     * @param {SetupGL} setupGL 
     * @param {*} keys 
     * @param {Camera} camera 
     */
    constructor(setupGL, keys, camera){
        this.setupGL = setupGL;
        this.keys = keys;
        this.camera = camera;
        this.cameraWait = false;
        this.cameraWait2 = false;
        this.lightingSwitch = false;
        this.hasFeatures = false;
        
        this.root = new Modelo({
            setupGL: setupGL
        });

        this.sol = new SolModelo(setupGL);
        this.aviao = new AviaoModelo(setupGL);
        this.terreno = new Terreno(setupGL, [100, 100]);

        this.player = new Player([this.terreno.tamanhoMapa[0]/2,20,this.terreno.tamanhoMapa[1]/2],keys,this.aviao);

        this.root.add(this.aviao);

        this.aviao.setPos(this.player.pos);
        
        this.grama = new Grama(this.setupGL, this.terreno.pos, this.terreno.tamanhoMapa);

        this.arvores = new ArvoreInstanced(this.setupGL, this.terreno.pos, this.terreno.tamanhoMapa);

        this.root.add(this.grama)
        this.root.add(this.arvores)
    }
    tick(time){
        this.keysCommands();

        
        this.player.tick(time);

        for(let entidade of this.terreno.entidades){
            entidade.tick(time);
        }
        
        this.camera.updateCamera([this.player.pos[0],this.player.pos[1],this.player.pos[2]], -this.player.angulo - 90);

        if(this.camera.cameraMode === "orbit") this.player.controls = true;
    }

    async keysCommands(){
        if(this.keys.l && !this.lightingSwitch){
            this.lightingSwitch = true;
            this.setupGL.lightingEnabled = !this.setupGL.lightingEnabled;
        }
        if(!this.keys.l) this.lightingSwitch = false;

        if(this.keys.k && !this.hasFeatures){
            console.log("gerando features.");
            this.hasFeatures = true;
            this.terreno.addFeatures();
            await this.arvores.build();
        }
    }
}