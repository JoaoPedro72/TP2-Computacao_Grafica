import { Modelo } from "../gl/Modelo.js";

export class AviaoModelo{
    constructor(setupGL){
        this.setupGL = setupGL;

        this.load();
    }
    async load(){
        this.root = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [2, 2, 2],
            setupGL: this.setupGL,
            objUrl: "modelos/aviao/aviao.obj"
        });
        this.helice = new Modelo({
            pos: [0, 0, -22.25/16],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/aviao/helice.obj"
        });
        this.faixa1 = new Modelo({
            pos: [0, 2/16, 40/16],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/aviao/faixa1.obj"
        });
        this.faixa2 = new Modelo({
            pos: [0, 0, 20/16],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/aviao/faixa2.obj"
        });
        this.faixa3 = new Modelo({
            pos: [0, 0, 20/16],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/aviao/faixa3.obj"
        });
        this.tronco = new Modelo({
            pos: [0, 0.35, 0.2],
            rot: [0, 0, 0],
            scale: [1/2, 1/2, 1/2],
            setupGL: this.setupGL,
            objUrl: "modelos/player/tronco.obj"
        });
        this.leftBraco = new Modelo({
            pos: [-4/16, 8/16, 0],
            rot: [1, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/player/leftbraco.obj"
        });
        this.rightBraco = new Modelo({
            pos: [4/16, 8/16, 0],
            rot: [1, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/player/rightbraco.obj"
        });

        await this.root.loadFromOBJ();
        await this.helice.loadFromOBJ();
        await this.faixa1.loadFromOBJ();
        await this.faixa2.loadFromOBJ();
        await this.faixa3.loadFromOBJ();
        
        await this.tronco.loadFromOBJ();
        await this.leftBraco.loadFromOBJ();
        await this.rightBraco.loadFromOBJ();

        this.root.add(this.helice);
        this.root.add(this.faixa1);
        this.faixa1.add(this.faixa2);
        this.faixa2.add(this.faixa3);

        this.root.add(this.tronco);
        this.tronco.add(this.leftBraco);
        this.tronco.add(this.rightBraco);

        this.root.meshes[0].specularStrength=1;
        this.root.meshes[0].shininess = 64;
    }

    setPos(pos){
        this.root.pos[0] = pos[0];
        this.root.pos[1] = pos[1];
        this.root.pos[2] = pos[2];
    }
    setRot(rot){
        this.root.rot[0] = rot[0];
        this.root.rot[1] = rot[1];
        this.root.rot[2] = rot[2];
    }

    draw(program, identity, lightMatrix, time){
        this.helice.rot[2] = time*10;

        this.root.draw(program, identity, lightMatrix, time);
    }
}