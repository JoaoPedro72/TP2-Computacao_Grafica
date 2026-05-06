import { generateGrid } from "../PerlinNoise.js";

import * as twgl from "../twgl.full.module.js";

class Biomas {
    constructor(){
        this.biomas = [
            { nome: "floresta", temp:[0.4,0.8], umi:[0.5,1.0], altura:[0.2,1.0] },
            { nome: "montanha", temp:[0.0,1.0], umi:[0.0,1.0], altura:[1.0,9.0] },
            { nome: "deserto",  temp:[0.7,1.0], umi:[0.0,0.3], altura:[0.2,1.0] },
            { nome: "praia",    temp:[0.0,1.0], umi:[0.0,1.0], altura:[-0.4,0.2] },
            { nome: "oceano",   temp:[0.0,1.0], umi:[0.0,1.0], altura:[-9.0,-0.4] },
            { nome: "planicie", temp:[0.3,0.7], umi:[0.3,0.7], altura:[0.2,1.0] }
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
            scale:80,
            seed:this.sementeElevacao,
            heightScale:4
        });

        const h2 = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:10,
            seed:this.sementeElevacao/100,
            heightScale:1
        });

        for(let x=0;x<this.tamanhoMapa[0];x++){
            for(let z=0;z<this.tamanhoMapa[1];z++){
                this.pos[x][z][0] = h1[x][z] + h2[x][z];
                //this.pos[x][z][0] = h1[x][z];
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
    buildMeshes(size=1){
        const rows = this.tamanhoMapa[0];
        const cols = this.tamanhoMapa[1];

        const position = [];
        const texcoord = [];
        const normal = [];
        const indices = [];

        let index = 0;

        for(let z=0; z<rows-1; z++){
            for(let x=0; x<cols-1; x++){

                const bioma = this.pos[x][z][3];
                //const bioma = "deserto";
                const uvTile = BIOMA_UV[bioma] || [2,3];

                const uv = getUVAtlas(uvTile[0], uvTile[1]);

                const verts = [
                    [x, z],
                    [x+1, z],
                    [x, z+1],
                    [x+1, z+1]
                ];

                for(let i=0;i<4;i++){
                    const [vx,vz] = verts[i];
                    const y = this.pos[vx][vz][0];

                    position.push(vx*size, y*5, vz*size);
                    texcoord.push(...uv[i]);
                    normal.push(0,1,0);
                }

                indices.push(
                    index, index+2, index+1,
                    index+1, index+2, index+3
                );

                index += 4;
            }
        }

        const arrays = {
            a_position: {numComponents:3, data:position},
            a_texcoord:{numComponents:2, data:texcoord},
            a_normal:{numComponents:3, data:normal},
            indices
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(this.setupGL.gl, arrays);

        this.meshes = [{ bufferInfo, material: "atlas" }];
        this.textures = {
            atlas: this.setupGL.loadTexture(this.url + "atlas.png")
        };
    }

    // ================= MESH oceano =================
    buildWater(size=1){
        const rows = this.tamanhoMapa[0];
        const cols = this.tamanhoMapa[1];

        const position = [];
        const texcoord = [];
        const normal = [];
        const indices = [];

        const uv = getUVAtlas(3,1); // agua

        let index = 0;

        // 🔥 pula de 2 em 2
        for(let z = 0; z < rows-1; z += 2){
            for(let x = 0; x < cols-1; x += 2){

                // vértices do quad 2x2
                const verts = [
                    [x, z],
                    [x+2, z],
                    [x, z+2],
                    [x+2, z+2]
                ];

                for(let i=0;i<4;i++){
                    const [vx, vz] = verts[i];

                    position.push(
                        vx * size,
                        0, // altura do mar
                        vz * size
                    );

                    texcoord.push(...uv[i]);
                    normal.push(0,1,0);
                }

                indices.push(
                    index, index+2, index+1,
                    index+1, index+2, index+3
                );

                index += 4;
            }
        }

        const arrays = {
            a_position:{numComponents:3,data:position},
            a_texcoord:{numComponents:2,data:texcoord},
            a_normal:{numComponents:3,data:normal},
            indices
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(this.setupGL.gl, arrays);

        this.meshes.push({
            bufferInfo,
            material: "atlas",
            isWater: true
        });
    }

    // ================= BUILD TOTAL =================
    build(){
        this.createElevations();
        this.createBiomas();
        this.buildMeshes();
        this.buildWater();
    }
}

const BIOMA_UV = {
    deserto:   [1,1],
    praia:     [1,2],
    floresta:  [1,3],
    oceano:    [2,1],
    montanha:  [2,2],
    planicie:  [2,3],
    agua:      [3,1]
};

function getUVAtlas(col, row) {
    const atlasSize = 64;
    const tileSize = 16;
    const padding = 1;
    const stride = tileSize + padding;

    const x = (col - 1) * stride;
    const y = (row - 1) * stride;

    const u0 = x / atlasSize;
    const v0 = y / atlasSize;
    const u1 = (x + tileSize) / atlasSize;
    const v1 = (y + tileSize) / atlasSize;

    return [
        [u0, v0],
        [u1, v0],
        [u0, v1],
        [u1, v1]
    ];
}