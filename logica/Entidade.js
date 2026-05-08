/**
 * @typedef {{ x: number, y: number }} Vec2
 * @typedef {{ x: number, y: number, z: number }} Vec3
 * @typedef {{ planta: number, fruta: number, animal: number }} Diet
 */

let entidades;
const gravidade = 1;
const aceleracaoMax = 3;

/**
 * @class Entidade
 */
export class Entidade {
    /**
     * @param {number} posX
     * @param {number} posY
     * @param {number} sizeX
     * @param {number} sizeY
     * @param {Object} map
     * @param {string} tipo
     */
    constructor(pos, map, tipo) {
        this.pos = pos;
        this.tipo = tipo;

        this.map = map;
        
        this.gridPos = [0, 0, 0];
        this.angulo = [0, 0, 0];
        this.posChao = 0;

        this.velocidade = [0, 0, 0];

        this.updateMap();
    }
    /**
     * Atualização por frame
     * @param {number} tempo Delta time
     */
    tick(tempo) {
        this.tickLogica(tempo);
        this.tickAnimacao(tempo);
        this.tickMovimento(tempo);
    }

    tickLogica(tempo){}
    tickAnimacao(tempo){}

    tickMovimento(tempo){
        this.pos[0] += this.velocidade[0] * tempo;
        this.pos[1] = Math.max(this.pos[1] + this.velocidade[1] * tempo, this.posChao);
        this.pos[2] += this.velocidade[2] * tempo;

        if(this.posChao != this.pos[1]) this.velocidade[1] = Math.min(this.velocidade[1] - gravidade * tempo, -aceleracaoMax);
    }

    /**
     * Atualiza posição no grid espacial
     * @returns {void}
     */
    updateMap() {
        // remove da célula antiga
        if (this._cell) {
            let arr = this._cell;
            let i = arr.indexOf(this);
            if (i !== -1) arr.splice(i, 1);
        }

        let x = Math.min(Math.max(this.pos[0] | 0, 0),this.map.tamanhoMapa[0]);
        let z = Math.min(Math.max(this.pos[2] | 0, 0),this.map.tamanhoMapa[0]);

        let porcentX = this.pos[0] - x;
        let porcentZ = this.pos[2] - z;

        this.gridPos[0] = x;
        this.gridPos[2] = z;

        // garante que a célula existe
        if (!this.map.pos[x][z][1]) this.map.pos[x][z][1] = [];

        // adiciona na nova célula
        this.map.pos[x][z][1].push(this);

        let heightX = this.map.pos[x][z][0]
        let heightZ = this.map.pos[x][z][0]

        if(x < this.map.tamanhoMapa[0] - 1) heightX = this.map.pos[x][z][0] * (1 - porcentX) + this.map.pos[x+1][z][0] * porcentX;
        if(z < this.map.tamanhoMapa[1] - 1) heightZ = this.map.pos[x][z][0] * (1 - porcentZ) + this.map.pos[x][z+1][0] * porcentZ;
        
        // ajusta altura baseado no terreno
        if(this.pos[1] < (heightX + heightZ)/2){
            this.pos[1] = (heightX + heightZ)/2;
            this.distChao = 0;
        }else this.distChao = this.pos[1] - (heightX + heightZ)/2;

        this._cell = this.map.pos[x][z][1];
    }
}