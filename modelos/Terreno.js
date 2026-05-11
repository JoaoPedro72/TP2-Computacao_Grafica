/**
 * @typedef {{ x: number, y: number }} Vec2
 * @typedef {{ x: number, y: number, z: number }} Vec3
 */

import { generateGrid } from "../PerlinNoise.js";
import { Modelo } from "../gl/Modelo.js";
import { SetupGL } from "../gl/SetupGL.js";
import { Entidade } from "../logica/Entidade.js";

import * as twgl from "../twgl.full.module.js";

const BIOMA_UV = {
    deserto:   [1,1],
    praia:     [1,2],
    floresta:  [1,3],
    oceano:    [2,1],
    montanha:  [2,2],
    planicie:  [2,3],
    agua:      [3,1],
    tundra:    [3,2],
    gelo:      [3,3]
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

class Biomas {
    constructor(){
        this.biomas = [
            { nome: "montanha", temp:[0.0,1.0], umi:[0.0,1.0], altura:[7.0,10.0] },
            
            { nome: "deserto",  temp:[0.6,1.0], umi:[0.0,0.4], altura:[0.2,7.0] },
            { nome: "tundra",   temp:[-1.0,0.3], umi:[0.0,0.3], altura:[0.2,7.0] },
            { nome: "gelo",     temp:[-1.0,0.3], umi:[0.3,1.0], altura:[0.2,7.0] },

            { nome: "floresta", temp:[0.3,0.8], umi:[0.5,1.0], altura:[0.2,7.0] },
            { nome: "planicie", temp:[0.3,0.7], umi:[0.3,0.7], altura:[0.2,7.0] },

            { nome: "praia",    temp:[0.0,1.0], umi:[0.0,1.0], altura:[-0.4,1] },
            { nome: "oceano",   temp:[0.0,1.0], umi:[0.0,1.0], altura:[-10.0,-0.4] }
        ];
        this.feature = {
            planicie: [
                { nome: "casa1/casa.obj",     peso: 10},
                { nome: "torre/torre.obj",    peso: 3},
                { nome: "",         peso: 100}
            ],
            floresta: [
                { nome: "arvore/arvore.obj", peso: 5},
                { nome: "",         peso: 15}
            ]
        }
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
    /**
     * retorna uma string com o nome de uma feature de acordo com o bioma
     * @param {String} biome 
     */
    getFeatureType(biome){
        let max = 0;
        if(this.feature[biome] ? 0 : 1) return "";
        for(let prop of this.feature[biome]){
            max += prop.peso;
        }
        let value = Math.random() * max;
        for(let prop of this.feature[biome]){
            if(value < prop.peso) return prop.nome;
            value -= prop.peso;
        }
        console.log("erro gerando feature");
        return "";
    }
}

export class Terreno{
    /**
     * 
     * @param {SetupGL} setupGL 
     * @param {[]} tamanhoMapa
     */
    constructor(setupGL, tamanhoMapa = [100, 100]){
        this.setupGL = setupGL;
        this.tamanhoMapa = tamanhoMapa;

        this.sementeElevacao = Math.random()*10000;
        this.sementeTemperatura = Math.random()*10000;
        this.sementeUmidade = Math.random()*10000;

        this.entidades = [];

        this.pos = [];
        // [x][z][0] Altura
        //       [1] temperatura
        //       [2] umidade
        //       [3] Bioma
        //       [4] entidades
        this.meshes = [];
        this.textures = {};
        this.objUrl= "modelos/terreno/";

        this.biomas = new Biomas();

        for(let x=0;x<tamanhoMapa[0];x++){
            this.pos[x]=[];
            for(let z=0;z<tamanhoMapa[1];z++){
                this.pos[x][z]=[];
            }
        }

        this.root = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: this.objUrl
        });

        this.build();
    }
    createElevations(){
        const h1 = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:80,
            seed:this.sementeElevacao,
            heightScale:5
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
                this.pos[x][z][0] = (h1[x][z] + h2[x][z])*5;
            }
        }
    }
    createBiomas(){
        const temp = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:30,
            seed:this.sementeTemperatura,
            heightScale: 2
        });

        const umi = generateGrid({
            x_size:this.tamanhoMapa[0],
            y_size:this.tamanhoMapa[1],
            scale:30,
            seed:this.sementeUmidade,
            heightScale: 2
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
    buildMeshes(){
        const sizeX = this.tamanhoMapa[0];
        const sizeZ = this.tamanhoMapa[1];

        const position = [];
        const texcoord = [];
        const normal = [];
        const indices = [];

        let index = 0;

        for(let z=0; z<sizeZ-1; z++){
            for(let x=0; x<sizeX-1; x++){

                const bioma = this.pos[x][z][3];
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

                    position.push(vx, y, vz);
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


        this.meshes.push({ 
            bufferInfo, 
            material: "atlas", 
            alwaysRender: true,
            specularStrength: 0, 
            shininess: 4
        });
        this.textures.atlas = this.setupGL.loadTexture(this.objUrl + "atlas.png")
    }
    buildFundo(){
        const fundo = new Modelo({
            pos: [this.tamanhoMapa[0]/2,-10,this.tamanhoMapa[1]/2],
            scale: [this.tamanhoMapa[0],1,this.tamanhoMapa[1]],
            setupGL: this.setupGL,
            objUrl: "modelos/terreno/fundo.obj"
        })
        fundo.loadFromOBJ();
        this.root.add(fundo);

        this.meshes = fundo.meshes;
        this.textures = fundo.textures;
        console.log(fundo.meshes);
    }
    buildWater(){
        const sizeX = this.tamanhoMapa[0];
        const sizeZ = this.tamanhoMapa[1];

        const position = [];
        const texcoord = [];
        const normal = [];
        const indices = [];

        const uv = getUVAtlas(3,1); // agua

        let index = 0;

        for(let z = 0; z < sizeZ-1; z += 2){
            for(let x = 0; x < sizeX-1; x += 2){

                const verts = [
                    [x, z],
                    [x+2, z],
                    [x, z+2],
                    [x+2, z+2]
                ];

                for(let i=0;i<4;i++){
                    const [vx, vz] = verts[i];

                    position.push(
                        vx,
                        0,
                        vz
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
            isWater: true,
            alwaysRender: true,
            specularStrength: 1.5, 
            shininess: 128
        });
    }
    build(){
        this.buildFundo();
        this.createElevations();
        this.createBiomas();
        this.buildMeshes();
        this.buildWater();

        this.root.meshes = this.meshes;
        this.root.textures = this.textures;

        this.root.meshes.forEach(mesh => {
            mesh.alwaysRender = true;
        });
    }
    draw(program, identity, lightMatrix, time){
        this.root.draw(program, identity, lightMatrix, time);
    }
    addFeature(x, z){
        let featUrl = this.biomas.getFeatureType(this.pos[x][z][3])

        if(featUrl != ""){
            console.log(featUrl);
            featUrl = "modelos/" + featUrl;
            let model = new Modelo({
                pos: [x, 0, z],
                setupGL: this.setupGL,
                objUrl: featUrl
            }) 
            let ent = new Entidade([x, 0, z], this, "feature", model);
            ent.angulo = Math.random() * 360 - 180
            model.loadFromOBJ();

            this.entidades.push(ent);
            this.root.add(model);
        }
    }
    async addFeatures(){
        const x_size = this.tamanhoMapa[0];
        const z_size = this.tamanhoMapa[1];
        
        for(let x = 0; x < x_size; x++){
            for(let z = 0; z < z_size; z++){
                await this.addFeature(x,z);
            }
        }
    }
}

