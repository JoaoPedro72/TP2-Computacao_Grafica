import { Modelo } from "../gl/Modelo.js";

export class PlayerModelo{
    constructor(setupGL){
        this.falling = true;
        this.walking = false;
        this.setupGL = setupGL;

        this.load();
    }
    async load(){
        this.tronco = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/player/tronco.obj"
        });
        this.leftBraco = new Modelo({
            pos: [-4/16, 8/16, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/player/leftbraco.obj"
        });
        this.rightBraco = new Modelo({
            pos: [4/16, 8/16, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/player/rightbraco.obj"
        });

        await this.tronco.loadFromOBJ();
        await this.leftBraco.loadFromOBJ();
        await this.rightBraco.loadFromOBJ();

        this.tronco.add(this.leftBraco);
        this.tronco.add(this.rightBraco);
    }

    setPos(pos){
        this.tronco.pos[0] = pos[0];
        this.tronco.pos[1] = pos[1];
        this.tronco.pos[2] = pos[2];
    }

    draw(program, identity, lightMatrix, time){
        if(this.falling){
            this.leftBraco.rot[0] = Math.sin(time * 4)/2 + Math.PI;
            this.rightBraco.rot[0] = Math.sin(time * 4)/2 + Math.PI;
        }
        
        this.tronco.draw(program, identity, lightMatrix, time);
    }
}