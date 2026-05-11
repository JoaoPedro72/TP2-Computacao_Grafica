/**
 * @typedef {{ x: number, y: number }} Vec2
 * @typedef {{ x: number, y: number, z: number }} Vec3
 */

import { Utills } from "../Utills.js";
import { Modelo } from "../gl/Modelo.js";
import { Terreno } from "../modelos/Terreno.js";

let entidades = [];
const utills = new Utills();

/**
 * @class Entidade
 */
export class Entidade {
    /**
     * @param {number} posX
     * @param {number} posY
     * @param {number} sizeX
     * @param {number} sizeY
     * @param {Terreno} map
     * @param {string} tipo
     * @param {Modelo} modelo
     */
    constructor(pos, map, tipo, modelo = new Modelo()) {
        this.pos = pos;
        this.tipo = tipo;

        this.map = map;
        this.modelo = modelo;
        
        this.gridPos = [0, 0, 0];
        this.angulo = [0, 0, 0];
        this.floor = 0;

        this.aceleracaoMax = 5;
        this.gravidade = 1;
        this.deltaTime = 0;
        this.atritoFloor = 0.5;
        this.atritoAr = 0.2;

        this.velocidade = [0, 0, 0];

        entidades.push(this);
        this.getFloor();
    }
    /**
     * Atualização por frame
     * @param {number} deltaTime Tempo desde o ultimo tick
     */
    tick(deltaTime) {
        this.deltaTime = deltaTime;
        this.modelo.pos = this.pos;

        this.tickLogica();
        this.tickAnimacao();
        this.tickMovimento();

        this.applyGravity();
        this.applyAtrito();

        this.getFloor();
        //console.log("pos= " + this.pos[2] + " chao = " + this.floor);
    }

    tickLogica(){}
    tickAnimacao(){}
    tickMovimento(){
        this.pos[0] += this.velocidade[0] * this.deltaTime;
        this.pos[1] += this.velocidade[1] * this.deltaTime;
        this.pos[2] += this.velocidade[2] * this.deltaTime;

        if(this.onFloor()){
            this.velocidade[1] = 0;
            this.pos[1] = this.floor;
        }
    }

    /**
     * Atualiza posição no grid espacial
     * @returns {void}
     */
    getFloor() {
        let x = Math.min(Math.max(this.pos[0], 0),this.map.tamanhoMapa[0]);
        let z = Math.min(Math.max(this.pos[2], 0),this.map.tamanhoMapa[1]);

        x = x | 0;
        z = z | 0;

        let porcentX = this.pos[0] - x;
        let porcentZ = this.pos[2] - z;

        if(this.gridPos[0] != x || this.gridPos[2] != z)this.updateMap(x, z);

        let heightX = this.map.pos[x][z][0]
        let heightZ = this.map.pos[x][z][0]

        if(x < this.map.tamanhoMapa[0] - 1) heightX = this.map.pos[x][z][0] * (1 - porcentX) + this.map.pos[x+1][z][0] * porcentX;
        if(z < this.map.tamanhoMapa[1] - 1) heightZ = this.map.pos[x][z][0] * (1 - porcentZ) + this.map.pos[x][z+1][0] * porcentZ;
        
        // ajusta altura baseado no terreno
        if(this.pos[1] < (heightX + heightZ)/2){
            this.pos[1] = (heightX + heightZ)/2;
        }
        this.floor = (heightX + heightZ)/2;
        return this.floor;
    }
    onFloor(){
        if(this.pos[1] - this.floor < 0.2) return true;
        return false;
    }
    applyGravity(){
        if(!this.onFloor() &&  this.velocidade[1] > -this.aceleracaoMax){
            
            this.velocidade[1] -= this.gravidade * this.deltaTime;
            console.log("tempo = " + this.deltaTime + "velo = " + this.velocidade[1]);
            return;
        }
        if(this.velocidade[1] == undefined) this.velocidade[1] = 0;
    }
    applyAtrito(){
        if(this.onFloor()){
            this.velocidade[0] = utills.aproxZero(this.velocidade[0], this.atritoFloor);
            this.velocidade[2] = utills.aproxZero(this.velocidade[2], this.atritoFloor);
        }else{
            this.velocidade[0] = utills.aproxZero(this.velocidade[0], this.atritoAr);
            this.velocidade[2] = utills.aproxZero(this.velocidade[2], this.atritoAr);
        }
    }
    updateMap(x, z){
        // remove da célula antiga
        if (this._cell) {
            let arr = this._cell;
            let i = arr.indexOf(this);
            if (i !== -1) arr.splice(i, 1);
        }

        this.gridPos[0] = x;
        this.gridPos[2] = z;

        // garante que a célula existe
        if (!this.map.pos[x][z][4]) this.map.pos[x][z][4] = [];

        // adiciona na nova célula
        this.map.pos[x][z][4].push(this);

        this._cell = this.map.pos[x][z][4];
    }
}