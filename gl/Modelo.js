import * as twgl from "../twgl.full.module.js";
import { Parser } from "./Parser.js";

const parser = new Parser();

export class Modelo {
    constructor({pos, rot, scale, setupGL}) {
        this.pos = pos;     // [x,y,z]
        this.rot = rot;     // [x,y,z]
        this.scale = scale; // [x,y,z]

        this.children = [];
        this.meshes = [];
        this.textures = {};
        this.pivot = [0, 0, 0];

        this.objUrl = "";
        this.setupGL = setupGL;
    }

    add(child) {
        this.children.push(child);
    }

    // 🔥 matriz local
    getLocalMatrix() {
        let m = twgl.m4.identity();

        // posição do bone
        m = twgl.m4.translate(m, this.pos);

        // 🔥 vai para pivô
        m = twgl.m4.translate(m, this.pivot);

        // rotação
        m = twgl.m4.rotateX(m, this.rot[0]);
        m = twgl.m4.rotateY(m, this.rot[1]);
        m = twgl.m4.rotateZ(m, this.rot[2]);

        // volta do pivô
        m = twgl.m4.translate(m, [
            -this.pivot[0],
            -this.pivot[1],
            -this.pivot[2]
        ]);

        // escala
        m = twgl.m4.scale(m, this.scale);

        return m;
    }

    // 🔥 draw com matriz pai
    draw(parentMatrix = twgl.m4.identity()) {

        const local = this.getLocalMatrix();

        // 🔥 transformação final
        const world = twgl.m4.multiply(parentMatrix, local);

        // desenha meshes
        for (let m of this.meshes) {
            this.setupGL.drawMesh(
                m,
                this.textures,
                world // 🔥 AGORA É MATRIZ
            );
        }

        // filhos
        for (let c of this.children) {
            c.draw(world);
        }
    }

    async loadFromOBJ(){
        // 🔥 já carregado?
        if(this.setupGL.modelCache[this.objUrl]){

            const cached = this.setupGL.modelCache[this.objUrl];

            this.meshes = cached.meshes;
            this.textures = cached.textures;

            return;
        }

        const {parts, materials} = await parser.loadOBJWithMTL(this.objUrl);

        const basePath = this.objUrl.substring(0, this.objUrl.lastIndexOf("/") + 1);

        const meshes = [];
        const textures = {};

        for(let m in materials){
            if(materials[m].map_Kd){
                textures[m] = this.setupGL.loadTexture(
                    basePath + materials[m].map_Kd
                );
            }
        }

        for(let m in parts){
            const mesh = parts[m];
            mesh.material = m;

            meshes.push(
                this.setupGL.makeMesh(mesh)
            );
        }

        // 🔥 salva cache completo
        this.setupGL.modelCache[this.objUrl] = {
            meshes,
            textures
        };

        this.meshes = meshes;
        this.textures = textures;
    }
}