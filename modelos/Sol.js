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
            scale: [(this.Rdist+4)*32, (this.Rdist+4)*32, (this.Rdist+4)*32],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/skyBox.obj"
        });
        this.skyBox2 = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, Math.PI/2],
            scale: [-1, 1, 1],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/fog_sphere.obj"
        });
        this.skyBox3 = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, Math.PI/2],
            scale: [-1.3, 1.3, 1.3],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/fog_sphere.obj"
        });
        this.skyBox4 = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, Math.PI/2],
            scale: [-1.5, 1.5, 1.5],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/fog_sphere.obj"
        });
        this.skyBox5 = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, Math.PI/2],
            scale: [-0.8, 0.8, 0.8],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/fog_sphere.obj"
        });
        this.oceano = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [(this.Rdist+3.5)*32, (this.Rdist+3.5)*32, (this.Rdist+3.5)*32],
            setupGL: this.setupGL,
            objUrl: "modelos/sol/agua.obj"
        });

        await this.sol.loadFromOBJ();
        //await this.skyBox.loadFromOBJ();
        await this.skyBox2.loadFromOBJ();
        await this.skyBox3.loadFromOBJ();
        await this.skyBox4.loadFromOBJ();
        await this.skyBox5.loadFromOBJ();
        await this.oceano.loadFromOBJ();

        
        this.root.add(this.oceano);
        this.root.add(this.sol);
        this.root.add(this.skyBox);
        this.skyBox.add(this.skyBox2);
        this.skyBox.add(this.skyBox3);
        this.skyBox.add(this.skyBox4);
        this.skyBox.add(this.skyBox5);


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
        this.skyBox.children.forEach(child =>
            child.meshes.forEach(mesh =>
                mesh.alwaysRender = true
        ));
        this.oceano.meshes.forEach(mesh => {
            mesh.isWater = true;
            mesh.alwaysRender = true;
            mesh.specularStrength = 2,
            mesh.shininess = 256
        });
    }

    

    draw(program, identity, lightMatrix, time){
        this.root.rot[2] = time;
        this.skyBox.rot[2] = -time + Math.PI/2;
        this.oceano.rot[2] = -time;
        this.root.draw(program, identity, lightMatrix, time);
    }
}