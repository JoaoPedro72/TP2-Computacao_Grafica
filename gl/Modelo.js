import * as twgl from "../twgl.full.module.js";
import { Parser } from "./Parser.js";

const parser = new Parser();

export class Modelo {
    constructor({pos, rot, scale, setupGL, objUrl, isEmissive = false}) {
        this.pos = pos || [0,0,0];
        this.rot = rot || [0,0,0];
        this.scale = scale || [1,1,1];

        this.objUrl = objUrl;
        this.setupGL = setupGL;
        this.isEmissive = isEmissive;

        this.children = [];
        this.meshes = [];
        this.textures = {};
    }

    add(child) {
        this.children.push(child);
    }

    async loadFromOBJ() {
        const cache = this.setupGL.modelCache;

        // 🔥 CACHE (nível parse — dados brutos, sem bufferInfo)
        let parseData = cache[this.objUrl];

        if (!parseData) {
            const { parts, materials } = await parser.loadOBJWithMTL(this.objUrl);
            const basePath = this.objUrl.substring(0, this.objUrl.lastIndexOf("/") + 1);

            // Salva apenas os dados de parse (CPU), nunca bufferInfo (GPU)
            parseData = { parts, materials, basePath };
            cache[this.objUrl] = parseData;
        }

        const { parts, materials, basePath } = parseData;

        // 🔥 TEXTURAS — textureCache já evita duplicatas na GPU
        const textures = {};
        for (let m in materials) {
            if (materials[m].map_Kd) {
                textures[m] = this.setupGL.loadTexture(
                    basePath + materials[m].map_Kd
                );
            }
        }

        // 🔥 MESHES — bufferInfo sempre novo (evita usar buffers deletados)
        const meshes = [];
        for (let m in parts) {
            const mesh = parts[m];
            mesh.material = m;
            meshes.push(this.setupGL.makeMesh(mesh));
        }

        this.meshes = meshes;
        this.textures = textures;
    }

    getLocalMatrix() {
        let m = twgl.m4.identity();

        m = twgl.m4.translate(m, this.pos);
        m = twgl.m4.rotateX(m, this.rot[0]);
        m = twgl.m4.rotateY(m, this.rot[1]);
        m = twgl.m4.rotateZ(m, this.rot[2]);
        m = twgl.m4.scale(m, this.scale);

        return m;
    }

    draw(programInfo, parentMatrix, lightMatrix, time = 0) {
        const local = this.getLocalMatrix();
        const world = twgl.m4.multiply(parentMatrix, local);

        for (let mesh of this.meshes) {
            if(mesh.isInvisible)return;
            this.setupGL.drawMesh(
                this.pos,
                mesh,
                this.textures,
                world,
                programInfo,
                lightMatrix,
                this.isEmissive,
                time
            );
        }

        for (let child of this.children) {
            child.draw(programInfo, world, lightMatrix, time);
        }
    }
}