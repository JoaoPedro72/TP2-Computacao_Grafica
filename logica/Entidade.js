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
 *
 * Compatível com o sistema de chunks de Terreno.
 * Usa map.getAlturaNoMundo() e map.registrarEntidade()
 * em vez de acessar map.pos[][] diretamente.
 */
export class Entidade {
    /**
     * @param {number[]}  pos    Posição inicial [x, y, z]
     * @param {Terreno}   map    Referência ao terreno
     * @param {string}    tipo   Tipo da entidade
     * @param {Modelo}    modelo Modelo 3D associado
     */
    constructor(pos, map, tipo, modelo = new Modelo()) {
        this.pos    = pos;
        this.tipo   = tipo;
        this.map    = map;
        this.modelo = modelo;

        this.angulo  = 0;             // graus, usado em tickMovimento
        this.floor   = 0;

        this.aceleracaoMax = 5;
        this.gravidade     = 1;
        this.deltaTime     = 0;
        this.atritoFloor   = 0.5;
        this.atritoAr      = 0.2;

        this.velocidade = [0, 0, 0];

        /**
         * Referência à célula de dados do tile onde esta entidade está registrada.
         * Mantido internamente; não acesse diretamente.
         * @type {Array|null}
         */
        this._celulaAtual = null;

        entidades.push(this);
        this.getFloor();
    }

    // ──────────────────────────────────────────
    //  Loop principal
    // ──────────────────────────────────────────

    /**
     * Atualização por frame.
     * @param {number} deltaTime Tempo desde o último tick (segundos)
     */
    tick(deltaTime){
        this.deltaTime = deltaTime;
        //console.log("tipo: " + this.modelo.objUrl + " mesh")
        //console.log(this.modelo.meshes);

        this.modelo.pos    = this.pos;
        this.modelo.rot[1] = utills.radians(this.angulo);

        this.tickLogica();
        this.tickAnimacao();
        this.tickMovimento();

        this.applyGravity();
        this.applyAtrito();

        this.getFloor();
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

    virarParaMovimento(){
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
        const altura = this.map.getAlturaNoMundo(this.pos[0], this.pos[2]);

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

    onFloor(){
        return (this.pos[1] - this.floor) < 0.2;
    }

    applyGravity(){
        if(!this.onFloor() && this.velocidade[1] > -this.aceleracaoMax){
            this.velocidade[1] -= this.gravidade * this.deltaTime;
        }
        if(this.velocidade[1] == null) this.velocidade[1] = 0;
    }

    applyAtrito(){
        const atrito = this.onFloor() ? this.atritoFloor : this.atritoAr;
        this.velocidade[0] = utills.aproxZero(this.velocidade[0], atrito);
        this.velocidade[2] = utills.aproxZero(this.velocidade[2], atrito);
    }

    // ──────────────────────────────────────────
    //  Utilidades
    // ──────────────────────────────────────────

    /**
     * Remove esta entidade do grid espacial e da lista global.
     * Chame ao destruir a entidade.
     */
    destroy(){
        // Remove da célula de dados do tile
        if(this._celulaAtual){
            const i = this._celulaAtual.indexOf(this);
            if(i !== -1) this._celulaAtual.splice(i, 1);
            this._celulaAtual = null;
        }

        // Remove da lista global
        const i = entidades.indexOf(this);
        if(i !== -1) entidades.splice(i, 1);
    }
}