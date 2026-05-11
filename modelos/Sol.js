import { Modelo } from "../gl/Modelo.js";

export class SolModelo{
    constructor(setupGL){
        this.setupGL = setupGL;

        this.load();
    }
    async load(){
        this.root = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL
        });
        this.sol = new Modelo({
            pos: [100, 0, 0],
            rot: [0, 0, 0],
            scale: [10, 10, 10],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/sol.obj",
            isEmissive: true
        });

        await this.sol.loadFromOBJ();

        this.root.add(this.sol);

        this.root.children.forEach(child =>
            child.meshes.forEach(mesh =>
                mesh.alwaysRender = true
        ));
    }

    setPos(pos){
        this.sol.pos[0] = pos[0];
        this.sol.pos[1] = pos[1];
        this.sol.pos[2] = pos[2];
    }

    draw(program, identity, lightMatrix, time){
        this.root.rot[2] = time;

        this.root.draw(program, identity, lightMatrix, time);
    }
}