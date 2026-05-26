/**
 * @typedef {{ x: number, y: number }} Vec2
 * @typedef {{ x: number, y: number, z: number }} Vec3
 */

import { Utills } from "../Utills.js";
import { Modelo } from "../gl/Modelo.js";
import { Terreno } from "../modelos/Terreno.js";
import { Entidade } from "./Entidade.js";

let entidades = [];
const utills = new Utills();

/**
 * @class Entidade
 *
 * Compatível com o sistema de chunks de Terreno.
 * Usa map.getAlturaNoMundo() e map.registrarEntidade()
 * em vez de acessar map.pos[][] diretamente.
 */
export class Barco extends Entidade {
    /**
     * @param {number[]}  pos    Posição inicial [x, y, z]
     * @param {Terreno}   map    Referência ao terreno
     * @param {string}    tipo   Tipo da entidade
     * @param {Modelo}    modelo Modelo 3D associado
     */
    constructor(pos, map, tipo, modelo = new Modelo()) {
        super(pos, map, tipo, modelo);
        this.atritoFloor = 0.3;
        this.time = 0;
    }

    tickLogica(){
        let frente = [Math.sin(this.angulo), Math.cos(this.angulo)];
        let frente2 = [this.pos[0] + frente[0] * 8, this.pos[2] + frente[1] * 8];
        frente = [this.pos[0] + frente[0] * 2, this.pos[2] + frente[1] * 2];
        let tile = this.map.getDadosTile(frente[0], frente[1]);
        if(tile != null && tile[3] == "oceano"){
            this.velocidade[0] += Math.sin(this.angulo) * this.deltaTime * 1;
            this.velocidade[2] += Math.cos(this.angulo) * this.deltaTime * 1;

            this.velocidade[0] = Math.max(-this.aceleracaoMax, Math.min(this.aceleracaoMax, this.velocidade[0]));
            this.velocidade[2] = Math.max(-this.aceleracaoMax, Math.min(this.aceleracaoMax, this.velocidade[2]));
        }else{
            this.velocidade[0] = 0;
            this.velocidade[2] = 0;
            this.angulo += 1 * this.deltaTime;
        }
        tile = this.map.getDadosTile(frente2[0], frente2[1]);
        if(tile != null && tile[3] != "oceano"){
            this.velocidade[0] -= Math.sin(this.angulo) * this.deltaTime * 2;
            this.velocidade[2] -= Math.cos(this.angulo) * this.deltaTime * 2;
            this.angulo += 3 * this.deltaTime;
        }
        //this.virarParaMovimento();
    }
    tickAnimacao(){
        this.time += this.deltaTime
        this.modelo.pos[1] = this.pos[1] + Math.cos(this.time)/20;
    }

    virarParaMovimento(){
        if(this.velocidade[0] != 0 && this.velocidade[2] != 0)
        this.angulo = Math.atan2(this.velocidade[0], this.velocidade[2]);
    }

    // ──────────────────────────────────────────
    //  Física / chão
    // ──────────────────────────────────────────

    /**
     * Consulta a altura do terreno na posição atual via API do Terreno,
     * ajusta pos[1] se abaixo do chão e atualiza o grid espacial.
     *
     * Retorna a altura do chão, ou 0 se o chunk ainda não estiver carregado.
     *
     * @returns {number}
     */
    getFloor(){
        const altura = 0.5;

        if(altura === null){
            // Chunk ainda está carregando — mantém último valor conhecido
            return this.floor;
        }

        this.floor = altura;

        // Empurra a entidade para cima se estiver abaixo do chão
        if(this.pos[1] < this.floor){
            this.pos[1] = this.floor;
        }

        // Atualiza o grid espacial apenas se mudou de tile
        const tx = Math.floor(this.pos[0]);
        const tz = Math.floor(this.pos[2]);

        if(tx !== this._tileX || tz !== this._tileZ){
            this._tileX = tx;
            this._tileZ = tz;
            this._celulaAtual = this.map.registrarEntidade(
                this,
                this.pos[0],
                this.pos[2],
                this._celulaAtual
            );
        }

        return this.floor;
    }
}