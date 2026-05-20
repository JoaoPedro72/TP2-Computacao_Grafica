import { Modelo } from "../gl/Modelo.js";

export class MoinhoModelo{
    constructor(setupGL, pos){
        this.setupGL = setupGL;
        this.rot = [0,0,0]
        this.load(pos);
    }
    async load(pos){
        this.root = new Modelo({
            pos: pos,
            rot: this.rot,
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/prop/moinho.obj"
        });
        this.helice = new Modelo({
            pos: [0, 46/16, -14/16],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/prop/helice_moinho.obj"
        });

        this.root.add(this.helice);
    }
    async loadFromOBJ(){
        await this.root.loadFromOBJ();
        await this.helice.loadFromOBJ();
    }
    draw(program, identity, lightMatrix, time){
        this.helice.rot[2] = time;
        this.root.rot = this.rot;
        this.root.draw(program, identity, lightMatrix, time);
    }
}