import { Modelo } from "../gl/Modelo.js";

export class SolModelo{
    constructor(setupGL, Rdist){
        this.Rdist = Rdist
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
            pos: [150, 0, 0],
            rot: [0, 0, 0],
            scale: [10, 10, 10],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/sol.obj",
            isEmissive: true
        });
        this.skyBox = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, Math.PI/2],
            scale: [-(this.Rdist+4)*32, (this.Rdist+4)*32, (this.Rdist+4)*32],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/skyBox.obj"
        });
        this.oceano = new Modelo({
            pos: [0, -1, 0],
            rot: [0, 0, 0],
            scale: [(this.Rdist+3)*32, (this.Rdist+3)*32, (this.Rdist+3)*32],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/agua.obj"
        });

        await this.sol.loadFromOBJ();
        await this.skyBox.loadFromOBJ();
        await this.oceano.loadFromOBJ();

        
        this.root.add(this.oceano);
        this.root.add(this.sol);
        this.root.add(this.skyBox);


        this.root.children.forEach(child =>
            child.meshes.forEach(mesh =>
                mesh.alwaysRender = true
        ));
        this.sol.meshes.forEach(mesh => {
            mesh.isSol = true;
        })
        this.skyBox.meshes.forEach(mesh => {
            mesh.alwaysRender = true;
        });
        this.oceano.meshes.forEach(mesh => {
            mesh.isWater = false
            mesh.alwaysRender = true;
            mesh.specularStrength = 2,
            mesh.shininess = 256
        });
    }

    

    draw(program, identity, lightMatrix, time){
        this.root.rot[2] = time;
        this.skyBox.rot[2] = -time;
        this.oceano.rot[2] = -time;
        this.root.draw(program, identity, lightMatrix, time);
    }
}