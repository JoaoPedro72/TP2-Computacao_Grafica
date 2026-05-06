import { generateGrid } from "../PerlinNoise.js";

import * as twgl from "../twgl.full.module.js";

class Biomas {
    constructor(){
        this.biomas = [
            { nome: "floresta", temp:[0.4,0.8], umi:[0.5,1.0], altura:[0.2,0.6] },
            { nome: "montanha", temp:[0.2,0.6], umi:[0.2,0.7], altura:[0.6,1.0] },
            { nome: "deserto",  temp:[0.7,1.0], umi:[0.0,0.3], altura:[0.2,0.6] },
            { nome: "praia",    temp:[0.0,1.0], umi:[0.0,1.0], altura:[0.0,0.2] },
            { nome: "oceano",   temp:[0.0,1.0], umi:[0.0,1.0], altura:[-1.0,0.0] },
            { nome: "planicie", temp:[0.3,0.7], umi:[0.3,0.7], altura:[0.2,0.4] }
        ];
    }

    inRange(v, r){ return v >= r[0] && v <= r[1]; }

    getBioma(temp, umi, altura){
        for(let b of this.biomas){
            if(
                this.inRange(temp,b.temp) &&
                this.inRange(umi,b.umi) &&
                this.inRange(altura,b.altura)
            ){
                return b.nome;
            }
        }
        return "planicie";
    }
}

export class Terreno {
    constructor(setupGL, tamanhoMapa){
        this.setupGL = setupGL;
        this.tamanhoMapa = tamanhoMapa;

        this.sementeElevacao = Math.random()*10000;
        this.sementeTemperatura = Math.random()*10000;
        this.sementeUmidade = Math.random()*10000;

        this.url = "modelos/terreno/";

        this.pos = [];
        this.meshes = [];
        this.textures = {};

        this.biomas = new Biomas();

        for(let x=0;x<tamanhoMapa[0];x++){
            this.pos[x]=[];
            for(let z=0;z<tamanhoMapa[1];z++){
                this.pos[x][z]=[];
            }
        }
    }

    // ================= ALTURA =================
    createElevations(){
        const h1 = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:30,
            seed:this.sementeElevacao,
            heightScale:4
        });

        const h2 = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:1,
            seed:this.sementeElevacao/100,
            heightScale:1
        });

        for(let x=0;x<this.tamanhoMapa[0];x++){
            for(let z=0;z<this.tamanhoMapa[1];z++){
                this.pos[x][z][0] = h1[x][z] + h2[x][z];
            }
        }
    }

    // ================= BIOMAS =================
    createBiomas(){
        const temp = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:30,
            seed:this.sementeTemperatura
        });

        const umi = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:30,
            seed:this.sementeUmidade
        });

        for(let x=0;x<this.tamanhoMapa[0];x++){
            for(let z=0;z<this.tamanhoMapa[1];z++){

                const t = (temp[x][z]+1)/2;
                const u = (umi[x][z]+1)/2;
                const h = this.pos[x][z][0];

                this.pos[x][z][1] = t;
                this.pos[x][z][2] = u;
                this.pos[x][z][3] = this.biomas.getBioma(t,u,h);
            }
        }
    }

    // ================= MESH =================
    buildMeshes(size=1, tile=8){

        const rows = this.tamanhoMapa[0];
        const cols = this.tamanhoMapa[1];

        const meshData = {};

        const getMesh = (bioma)=>{
            if(!meshData[bioma]){
                meshData[bioma]={
                    position:[],
                    texcoord:[],
                    normal:[],
                    indices:[]
                };
            }
            return meshData[bioma];
        };

        for(let z=0;z<rows-1;z++){
            for(let x=0;x<cols-1;x++){

                const bioma = this.pos[x][z][3];
                const mesh = getMesh(bioma);

                const baseIndex = mesh.position.length/3;

                const verts = [
                    [x, z],
                    [x+1, z],
                    [x, z+1],
                    [x+1, z+1]
                ];

                for(let [vx,vz] of verts){
                    const y = this.pos[vx][vz][0];

                    mesh.position.push(vx*size, y*5, vz*size);

                    mesh.texcoord.push(
                        (vx/cols)*tile,
                        (vz/rows)*tile
                    );

                    mesh.normal.push(0,1,0);
                }

                mesh.indices.push(
                    baseIndex, baseIndex+2, baseIndex+1,
                    baseIndex+1, baseIndex+2, baseIndex+3
                );
            }
        }

        // ===== cria buffers TWGL =====
        for(let b in meshData){

            const arrays = {
                a_position: { numComponents:3, data: meshData[b].position },
                a_texcoord:{ numComponents:2, data: meshData[b].texcoord },
                a_normal:  { numComponents:3, data: meshData[b].normal },
                indices: meshData[b].indices
            };

            const bufferInfo = twgl.createBufferInfoFromArrays(this.setupGL.gl, arrays);

            this.meshes.push({
                bufferInfo,
                bioma: b
            });

            // textura automática
            this.textures[b] = this.setupGL.loadTexture(
                `${this.url}${b}.png`
            );
        }
    }

    // ================= MESH oceano =================
    buildWater(size = 1, tile = 8) {
        const rows = this.tamanhoMapa[0];
        const cols = this.tamanhoMapa[1];

        const position = [];
        const texcoord = [];
        const normal = [];
        const indices = [];

        // ===== vértices (plano inteiro) =====
        const verts = [
            [0, 0],
            [cols, 0],
            [0, rows],
            [cols, rows]
        ];

        for (let [x, z] of verts) {
            position.push(
                x * size,
                0, // 🔥 altura fixa (mar)
                z * size
            );

            texcoord.push(
                (x / cols) * tile,
                (z / rows) * tile
            );

            normal.push(0, 1, 0);
        }

        // dois triângulos
        indices.push(
            0, 2, 1,
            1, 2, 3
        );

        const arrays = {
            a_position: { numComponents:3, data: position },
            a_texcoord:{ numComponents:2, data: texcoord },
            a_normal:  { numComponents:3, data: normal },
            indices
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(this.setupGL.gl, arrays);

        this.meshes.push({
            bufferInfo,
            bioma: "agua", // 🔥 chave da textura
            isWater: true  // opcional (pra shader depois)
        });

        this.textures["agua"] = this.setupGL.loadTexture(
            `${this.url}agua.png`
        );
    }

    // ================= BUILD TOTAL =================
    build(){
        this.createElevations();
        this.createBiomas();
        this.buildMeshes();
        this.buildWater();
    }
}