/**
 * @typedef {{ x: number, y: number }} Vec2
 * @typedef {{ x: number, y: number, z: number }} Vec3
 */

import { generateGrid } from "../PerlinNoise.js";
import { Modelo } from "../gl/Modelo.js";
import { SetupGL } from "../gl/SetupGL.js";
import { Entidade } from "../logica/Entidade.js";
import { ArvoreInstanced } from "../modelos/ArvoreInstanced.js";

import * as twgl from "../twgl.full.module.js";
import { MoinhoModelo } from "./Moinho.js";

const BIOMA_UV = {
    deserto:   [1,1],
    praia:     [1,2],
    floresta:  [1,3],
    oceano:    [2,1],
    montanha:  [2,2],
    planicie:  [2,3],
    agua:      [3,1],
    tundra:    [3,2],
    neve:      [3,3]
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
            
            
            { nome: "deserto",  temp:[0.6,1.0], umi:[0.0,0.4], altura:[0.2,7.0] },
            { nome: "tundra",   temp:[-1.0,0.3], umi:[0.0,0.3], altura:[0.2,7.0] },
            { nome: "neve",     temp:[-1.0,0.3], umi:[0.3,1.0], altura:[0.2,100.0] },

            { nome: "floresta", temp:[0.3,0.8], umi:[0.5,1.0], altura:[0.2,7.0] },
            { nome: "planicie", temp:[0.3,0.7], umi:[0.3,0.7], altura:[0.2,7.0] },

            { nome: "montanha", temp:[0.0,1.0], umi:[0.0,1.0], altura:[7.0,100.0] },
            { nome: "praia",    temp:[0.0,1.0], umi:[0.0,1.0], altura:[-0.4,1] },
            { nome: "oceano",   temp:[0.0,1.0], umi:[0.0,1.0], altura:[-100.0,-0.4] }
        ];
        this.feature = {
            planicie: [
                { nome: "",                     peso: 4000},
                { nome: "prop/casa1.obj",       peso: 16},
                { nome: "prop/torre.obj",       peso: 1},
                { nome: "pedra/pedra.obj",      peso: 1},
                { nome: "prop/moinho.obj",      peso: 1}
            ],
            deserto: [
                { nome: "",                     peso: 80},
                { nome: "deserto/cacto.obj",    peso: 4},
                { nome: "pedra/pedra.obj",      peso: 1}
            ],
            neve: [
                { nome: "",                     peso: 60},
                { nome: "neve/snowman.obj",     peso: 1},
                { nome: "pedra/pedra.obj",      peso: 1}
            ],
            montanha: [
                { nome: "",                     peso: 180},
                { nome: "pedra/pedra.obj",      peso: 2},
                { nome: "prop/torre.obj",       peso: 1}
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

// ─────────────────────────────────────────────
//  Chunk
// ─────────────────────────────────────────────

/**
 * Representa um chunk do mundo (tile de NxN células).
 * cx/cz são coordenadas de chunk (não de tile).
 */
class Chunk {
    /**
     * @param {number} cx  - índice do chunk no eixo X
     * @param {number} cz  - índice do chunk no eixo Z
     * @param {Modelo} modelo - nó de cena raiz do chunk
     */
    constructor(cx, cz, root, modelo){
        this.cx = cx;
        this.cz = cz;
        this.modelo = modelo;
        this.waterModel = null;
        this.root = root;

        this.root.add(this.modelo);

        /** @type {Entidade[]} */
        this.entidades = [];

        /**
         * Heightmap/bioma do chunk.
         * dados[lx][lz] = [altura, temp, umi, bioma, entidades?]
         * Preenchido por _carregarChunk antes dos meshes.
         * @type {Array}
         */
        this.dados = null;

        /**
         * Instâncias de árvores deste chunk (instancing).
         * @type {ArvoreInstanced|null}
         */
        this.arvore = null;

        /**
         * Estado do ciclo de vida:
         *   'loading'  – está sendo gerado (assíncrono)
         *   'ready'    – pronto para renderizar
         *   'unloading'– marcado para descarregar
         */
        this.estado = "loading";
    }

    /** Libera buffers WebGL de todos os meshes do chunk */
    dispose(gl){
        // Libera árvores instanced
        if(this.arvore) this.arvore.dispose();

        for(const mesh of this.modelo.meshes){
            if(mesh.bufferInfo){
                // Libera cada buffer WebGL
                const bi = mesh.bufferInfo;
                if(bi.attribs){
                    for(const attr of Object.values(bi.attribs)){
                        if(attr.buffer) gl.deleteBuffer(attr.buffer);
                    }
                }
                if(bi.indices) gl.deleteBuffer(bi.indices);
            }
        }
        // Libera recursivamente modelos filhos (features, água, etc.)
        for(const filho of this.modelo.children ?? []){
            for(const mesh of filho.meshes ?? []){
                if(mesh.bufferInfo){
                    const bi = mesh.bufferInfo;
                    if(bi.attribs){
                        for(const attr of Object.values(bi.attribs)){
                            if(attr.buffer) gl.deleteBuffer(attr.buffer);
                        }
                    }
                    if(bi.indices) gl.deleteBuffer(bi.indices);
                }
            }
        }
    }
}

// ─────────────────────────────────────────────
//  Terreno
// ─────────────────────────────────────────────

export class Terreno {
    /**
     * @param {SetupGL} setupGL
     * @param {[number, number]} tamanhoChunk  Tamanho em tiles de cada chunk [largura, profundidade]
     * @param {number}           raioChunks    Quantos chunks ao redor do jogador ficam carregados
     */
    constructor(setupGL, tamanhoChunk = [32, 32], raioChunks = 3){
        this.setupGL     = setupGL;
        this.tamanhoChunk = tamanhoChunk;   // ex: [32, 32]  → 32×32 tiles por chunk
        this.raioChunks  = raioChunks;      // chunks visíveis em cada direção

        // Sementes globais (consistentes entre chunks)
        this.sementeElevacao    = Math.random() * 10000;
        this.sementeTemperatura = Math.random() * 10000;
        this.sementeUmidade     = Math.random() * 10000;

        this.biomas = new Biomas();

        // Mapa de chunks ativos: chave = "cx,cz"
        /** @type {Map<string, Chunk>} */
        this.chunks = new Map();

        // Fila de chunks a carregar (para não travar a thread)
        /** @type {Array<{cx:number, cz:number}>} */
        this._filaCarregamento = [];
        this._carregando = false;          // true quando um chunk está sendo construído
        this._maxPorTick = 1;             // chunks gerados por tick (evita stutter)

        this.objUrl = "modelos/terreno/";

        // Nó raiz de cena – todos os chunks são filhos deste nó
        this.root = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: this.objUrl
        });

        // Textura atlas compartilhada entre todos os chunks
        this.texturaAtlas = this.setupGL.loadTexture(this.objUrl + "atlas.png");

        // Coordenadas do chunk onde o jogador estava no último tick
        this._ultimoChunkJogador = { cx: null, cz: null };

        /**
         * Sistemas externos registrados para desenhar junto com o terreno.
         * @type {Array<{draw:Function}>}
         */
        this._extras = [];

        /**
         * Callbacks disparados quando um chunk fica pronto (após features carregadas).
         * Registre via terreno.onChunkCarregado(fn) — fn recebe o objeto Chunk.
         * @type {Array<(chunk:Chunk)=>void>}
         */
        this._cbCarregado = [];

        /**
         * Callbacks disparados antes de um chunk ser destruído.
         * fn recebe { cx, cz }.
         * @type {Array<(info:{cx:number,cz:number})=>void>}
         */
        this._cbDescarregado = [];
    }

    /**
     * Registra um callback chamado toda vez que um chunk termina de carregar.
     * @param {(chunk:Chunk)=>void} fn
     */
    onChunkCarregado(fn){ this._cbCarregado.push(fn); }

    /**
     * Registra um callback chamado antes de um chunk ser descarregado.
     * @param {(info:{cx:number,cz:number})=>void} fn
     */
    onChunkDescarregado(fn){ this._cbDescarregado.push(fn); }

    // ──────────────────────────────────────────
    //  API pública
    // ──────────────────────────────────────────

    /**
     * Deve ser chamado a cada frame com a posição mundial do jogador.
     * Carrega chunks próximos e descarrega os distantes.
     *
     * @param {number} px  posição X do jogador (em tiles)
     * @param {number} pz  posição Z do jogador (em tiles)
     */
    tick(px, pz){
        const cx = Math.floor(px / this.tamanhoChunk[0]);
        const cz = Math.floor(pz / this.tamanhoChunk[1]);

        // Só recalcula se o jogador mudou de chunk
        const mudou = cx !== this._ultimoChunkJogador.cx
                   || cz !== this._ultimoChunkJogador.cz;

        if(mudou){
            this._ultimoChunkJogador = { cx, cz };
            this._atualizarChunksVisiveis(cx, cz);
        }

        // Processa a fila de carregamento (1 chunk por tick)
        this._processarFila();
    }

    /**
     * Registra um sistema externo (ex: ArvoreInstanced) para ser desenhado
     * junto com o terreno. O main.js não precisa saber da existência dele.
     * @param {{ draw: Function }} obj
     */
    addDrawable(obj){ this._extras.push(obj); }

    draw(program, identity, lightMatrix, time){
        // terreno sólido
        this.root.draw(program, identity, lightMatrix, time);

        // extras
        for(const extra of this._extras){
            extra.draw(program, identity, lightMatrix, time);
        }

        // água por último
        this.setupGL.gl.depthMask(false)
        for(const chunk of this.chunks.values()){
            if(chunk.waterModel){
                chunk.waterModel.draw(
                    program,
                    identity,
                    lightMatrix,
                    time
                );
            }
        }
        this.setupGL.gl.depthMask(true)
    }

    // ──────────────────────────────────────────
    //  Gerenciamento de chunks
    // ──────────────────────────────────────────

    /**
     * Determina quais chunks devem existir dado o chunk central do jogador.
     * Enfileira os que faltam e destrói os que estão fora do raio.
     */
    _atualizarChunksVisiveis(cx, cz){
        const raio = this.raioChunks;

        // Conjunto de chaves que devem existir
        const desejados = new Set();
        for(let dx = -raio; dx <= raio; dx++){
            for(let dz = -raio; dz <= raio; dz++){
                desejados.add(`${cx + dx},${cz + dz}`);
            }
        }

        // Remove chunks fora do raio
        for(const [chave, chunk] of this.chunks){
            if(!desejados.has(chave)){
                this._descarregarChunk(chave, chunk);
            }
        }

        // Enfileira chunks que ainda não existem, ordenados por distância
        const novos = [];
        for(const chave of desejados){
            if(!this.chunks.has(chave) && !this._naFila(chave)){
                const [ncx, ncz] = chave.split(",").map(Number);
                const dist = Math.abs(ncx - cx) + Math.abs(ncz - cz);
                novos.push({ cx: ncx, cz: ncz, dist, chave });
            }
        }
        novos.sort((a, b) => a.dist - b.dist);
        for(const item of novos){
            this._filaCarregamento.push({ cx: item.cx, cz: item.cz });
        }
    }

    _naFila(chave){
        const [cx, cz] = chave.split(",").map(Number);
        return this._filaCarregamento.some(i => i.cx === cx && i.cz === cz);
    }

    /** Processa até _maxPorTick itens da fila de carregamento */
    _processarFila(){
        if(this._carregando) return;                     // aguarda async terminar
        if(this._filaCarregamento.length === 0) return;

        const { cx, cz } = this._filaCarregamento.shift();
        const chave = `${cx},${cz}`;

        // Pode ter sido descarregado enquanto estava na fila
        if(this.chunks.has(chave)) return;

        this._carregando = true;
        this._carregarChunk(cx, cz).finally(() => {
            this._carregando = false;
        });
    }

    /**
     * Constrói e adiciona um novo chunk à cena.
     * @param {number} cx
     * @param {number} cz
     */
    async _carregarChunk(cx, cz){
        const chave = `${cx},${cz}`;

        // Offset em tiles dentro do mapa de heightmap
        const offsetX = cx * this.tamanhoChunk[0];
        const offsetZ = cz * this.tamanhoChunk[1];

        // Modelo raiz do chunk posicionado no mundo
        const modelo = new Modelo({
            pos: [offsetX, 0, offsetZ],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: this.objUrl
        });
        const raizChunk = new Modelo({
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1],
            setupGL: this.setupGL,
            objUrl: this.objUrl
        });
        modelo.textures = { atlas: this.texturaAtlas };

        const chunk = new Chunk(cx, cz, raizChunk, modelo);
        this.chunks.set(chave, chunk);

        // Gera e ARMAZENA dados de altitude/bioma para este chunk
        const dados = this._gerarDados(offsetX, offsetZ);
        chunk.dados = dados;

        // Constrói meshes (síncrono, mas poderia ser web worker)
        this._buildMeshes(chunk, dados);
        this._buildWater(chunk, dados);

        modelo.meshes.forEach(m => { m.alwaysRender = true; });

        this.root.add(raizChunk);

        // Adiciona features (async – carrega OBJs)
        await this._addFeatures(chunk, dados, offsetX, offsetZ);

        if(chunk.estado === "unloading") return;

        chunk.estado = "ready";

        // Notifica ouvintes (ex: ArvoreInstanced)
        for(const cb of this._cbCarregado) cb(chunk);
    }

    /**
     * Remove um chunk da cena e libera seus recursos WebGL.
     */
    _descarregarChunk(chave, chunk){
        // Notifica ouvintes antes de destruir (ex: ArvoreInstanced.removeChunk)
        for(const cb of this._cbDescarregado) cb({ cx: chunk.cx, cz: chunk.cz });

        chunk.estado = "unloading";
        this.chunks.delete(chave);

        // Remove da árvore de cena
        const idx = this.root.children?.indexOf(chunk.modelo) ?? -1;
        if(idx !== -1) this.root.children.splice(idx, 1);

        // Libera memória WebGL
        chunk.dispose(this.setupGL.gl);
    }

    // ──────────────────────────────────────────
    //  Geração de dados (heightmap + biomas)
    // ──────────────────────────────────────────

    /**
     * Gera o array de dados [x][z] = [altura, temp, umi, bioma]
     * para um chunk a partir do seu offset mundial.
     *
     * @param {number} offsetX
     * @param {number} offsetZ
     * @returns {Array} dados[x][z] = [altura, temp, umi, bioma]
     */
    _gerarDados(offsetX, offsetZ){
        const [sX, sZ] = this.tamanhoChunk;

        // Gera sX+1 × sZ+1 pontos: a coluna/linha extra garante que a borda
        // direita/inferior usa o mesmo valor Perlin que o chunk vizinho usará
        // como sua borda esquerda/superior (mesmo offsetX mundial → mesmo resultado).
        const pX = sX + 1;
        const pZ = sZ + 1;

        const h1 = generateGrid({
            x_size: pX, y_size: pZ,
            scale: 80, seed: this.sementeElevacao,
            heightScale: 5, offsetX, offsetY: offsetZ
        });
        const h2 = generateGrid({
            x_size: pX, y_size: pZ,
            scale: 10, seed: this.sementeElevacao / 100,
            heightScale: 1, offsetX, offsetY: offsetZ
        });
        const temp = generateGrid({
            x_size: pX, y_size: pZ,
            scale: 30, seed: this.sementeTemperatura,
            heightScale: 2, offsetX, offsetY: offsetZ
        });
        const umi = generateGrid({
            x_size: pX, y_size: pZ,
            scale: 30, seed: this.sementeUmidade,
            heightScale: 2, offsetX, offsetY: offsetZ
        });

        const dados = [];
        for(let x = 0; x < pX; x++){
            dados[x] = [];
            for(let z = 0; z < pZ; z++){
                const altura = (h1[x][z] + h2[x][z]) * 5;
                const t = (temp[x][z] + 1) / 2;
                const u = (umi[x][z] + 1) / 2;
                const bioma = this.biomas.getBioma(t, u, altura);
                dados[x][z] = [altura, t, u, bioma];
            }
        }
        return dados;
    }

    // ──────────────────────────────────────────
    //  Construção de meshes
    // ──────────────────────────────────────────
    
    /**
     * @param {Chunk} chunk 
     * @param {Array} dados 
     */
    _buildMeshes(chunk, dados){
        const [sX, sZ] = this.tamanhoChunk;

        const position = [], texcoord = [], normal = [], indices = [];
        let index = 0;

        // sX quads em X e sZ quads em Z; vértices vão até sX/sZ (inclusive)
        for(let z = 0; z < sZ; z++){
            for(let x = 0; x < sX; x++){

                const bioma  = dados[x][z][3];
                const uvTile = BIOMA_UV[bioma] || [2,3];
                const uv     = getUVAtlas(uvTile[0], uvTile[1]);

                // 4 cantos do quad — dados[x+1] e dados[z+1] existem porque
                // _gerarDados gera sX+1 × sZ+1 pontos
                const verts = [[x,z],[x+1,z],[x,z+1],[x+1,z+1]];

                for(let i = 0; i < 4; i++){
                    const [vx, vz] = verts[i];
                    const y = dados[vx][vz][0];

                    position.push(vx, y, vz);
                    texcoord.push(...uv[i]);
                    normal.push(0, 1, 0);
                }

                indices.push(
                    index, index+2, index+1,
                    index+1, index+2, index+3
                );
                index += 4;
            }
        }

        const arrays = {
            a_position: { numComponents: 3, data: position },
            a_texcoord: { numComponents: 2, data: texcoord },
            a_normal:   { numComponents: 3, data: normal },
            indices
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(this.setupGL.gl, arrays);

        chunk.modelo.meshes.push({
            bufferInfo,
            material: "atlas",
            alwaysRender: true,
            specularStrength: 0,
            shininess: 4
        });
    }

    /**
     * @param {Chunk} chunk 
     * @param {Array} dados 
     */
    _buildWater(chunk, dados){
        const [sX, sZ] = this.tamanhoChunk;
        const uv = getUVAtlas(3, 1);

        const position = [], texcoord = [], normal = [], indices = [];
        let index = 0;

        for(let z = 0; z < sZ; z += 2){
            for(let x = 0; x < sX; x += 2){
                // Garante que o quad de 2×2 não ultrapassa sX/sZ
                const x2 = Math.min(x + 2, sX);
                const z2 = Math.min(z + 2, sZ);

                const verts = [[x,z],[x2,z],[x,z2],[x2,z2]];

                for(let i = 0; i < 4; i++){
                    const [vx, vz] = verts[i];
                    position.push(vx, 0, vz);
                    texcoord.push(...uv[i]);
                    normal.push(0, 1, 0);
                }

                indices.push(
                    index, index+2, index+1,
                    index+1, index+2, index+3
                );
                index += 4;
            }
        }

        const arrays = {
            a_position: { numComponents: 3, data: position },
            a_texcoord: { numComponents: 2, data: texcoord },
            a_normal:   { numComponents: 3, data: normal },
            indices
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(this.setupGL.gl, arrays);
        const waterModel = new Modelo({
            pos: [sX * chunk.cx, 0, sZ * chunk.cz],
            rot: [0,0,0],
            scale: [1,1,1],
            setupGL: this.setupGL,
            objUrl: this.objUrl
        });

        waterModel.textures = { atlas: this.texturaAtlas };

        waterModel.meshes.push({
            bufferInfo,
            material: "atlas",
            isWater: true,
            hasWaves: true,
            alwaysRender: true,
            specularStrength: 1.5,
            shininess: 128
        });

        chunk.waterModel = waterModel;
    }

    // ──────────────────────────────────────────
    //  Features
    // ──────────────────────────────────────────

    /**
     * @param {number} offsetX
     * @param {number} offsetZ
     * @param {Chunk} chunk 
     * @param {Array} dados 
     */
    async _addFeatures(chunk, dados, offsetX, offsetZ){
        const [sX, sZ] = this.tamanhoChunk;

        for(let x = 0; x < sX; x++){
            for(let z = 0; z < sZ; z++){
                if(chunk.estado === "unloading") return;

                const tile   = dados[x][z];
                const bioma  = tile[3];
                const altura = tile[0];

                const featUrl = this.biomas.getFeatureType(bioma);
                if(!featUrl) continue;

                const wX = offsetX + x;
                const wZ = offsetZ + z;

                let modelo;
                // Posição local dentro do chunk (Y = altura do tile)
                if(featUrl != "prop/moinho.obj"){
                    modelo = new Modelo({
                        pos: [wX, altura, wZ],
                        setupGL: this.setupGL,
                        objUrl: "modelos/" + featUrl
                    });
                    modelo.rot = [0, Math.random() * Math.PI * 2, 0];
                }else{
                    modelo = new MoinhoModelo(this.setupGL, [wX, altura, wZ]);
                    modelo.rot = [0, Math.random() * Math.PI * 2, 0];
                }
                // Adiciona ao grafo ANTES do load para que apareça assim que
                // os meshes forem criados (o Modelo.draw ignora meshes vazios)
                chunk.root.add(modelo);

                
                const ent = new Entidade([wX, altura, wZ], this, "feature", modelo);
                chunk.entidades.push(ent);

                await modelo.loadFromOBJ();

                if(chunk.estado === "unloading") return;

                if(featUrl === "prop/casa1.obj" && modelo.meshes[0]){
                    modelo.meshes[0].hasLight     = true;
                    modelo.meshes[0].lightPos     = [0, 0, 0];
                    modelo.meshes[0].lightStrengt = 1;
                }
            }
        }
    }

    // ──────────────────────────────────────────
    //  Utilidades
    // ──────────────────────────────────────────

    /**
     * Retorna o chunk que contém a posição mundial (px, pz) ou null
     * @param { number } px Posição global X
     * @param { number } pz Posição global Z
     * @returns { Chunk } Chunk cuja a posição faz parte
     */
    getChunk(px, pz){
        const cx = Math.floor(px / this.tamanhoChunk[0]);
        const cz = Math.floor(pz / this.tamanhoChunk[1]);
        return this.chunks.get(`${cx},${cz}`) ?? null;
    }

    /**
     * Retorna os dados brutos [altura, temp, umi, bioma, entidades?] do tile
     * na posição mundial (wx, wz), ou null se o chunk não estiver carregado.
     *
     * @param {number} wx  posição X mundial (pode ser fracionária)
     * @param {number} wz  posição Z mundial (pode ser fracionária)
     * @returns {Array|null}
     */
    getDadosTile(wx, wz){
        const chunk = this.getChunk(wx, wz);
        if(!chunk || !chunk.dados) return null;

        // Coordenadas locais dentro do chunk (inteiras)
        const lx = Math.floor(wx - chunk.cx * this.tamanhoChunk[0]);
        const lz = Math.floor(wz - chunk.cz * this.tamanhoChunk[1]);

        const lxC = Math.max(0, Math.min(lx, this.tamanhoChunk[0] - 1));
        const lzC = Math.max(0, Math.min(lz, this.tamanhoChunk[1] - 1));

        return chunk.dados[lxC]?.[lzC] ?? null;
    }

    /**
     * Retorna a altura interpolada do terreno na posição mundial (wx, wz).
     * Interpola bilinearmente entre os 4 tiles vizinhos.
     * Retorna null se o chunk não estiver carregado.
     *
     * @param {number} wx
     * @param {number} wz
     * @returns {number|null}
     */
    getAlturaNoMundo(wx, wz){
        const chunk = this.getChunk(wx, wz);
        if(!chunk || !chunk.dados) return null;

        const [sX, sZ] = this.tamanhoChunk;
        const baseX = chunk.cx * sX;
        const baseZ = chunk.cz * sZ;

        const lxF = wx - baseX;
        const lzF = wz - baseZ;

        const lx = Math.floor(lxF);
        const lz = Math.floor(lzF);
        const px = lxF - lx;   // fração X (0–1)
        const pz = lzF - lz;   // fração Z (0–1)

        const clamp = (v, max) => Math.max(0, Math.min(v, max - 1));

        const h00 = chunk.dados[clamp(lx,   sX)]?.[clamp(lz,   sZ)]?.[0] ?? 0;
        const h10 = chunk.dados[clamp(lx+1, sX)]?.[clamp(lz,   sZ)]?.[0] ?? h00;
        const h01 = chunk.dados[clamp(lx,   sX)]?.[clamp(lz+1, sZ)]?.[0] ?? h00;
        const h11 = chunk.dados[clamp(lx+1, sX)]?.[clamp(lz+1, sZ)]?.[0] ?? h00;

        // Interpolação bilinear
        const hx0 = h00 * (1 - px) + h10 * px;
        const hx1 = h01 * (1 - px) + h11 * px;
        return hx0 * (1 - pz) + hx1 * pz;
    }

    /**
     * Registra ou move uma entidade na célula de dados do tile mundial (wx, wz).
     * Retorna a referência ao array da célula, ou null se o chunk não existir.
     *
     * @param {object}   entidade
     * @param {number}   wx
     * @param {number}   wz
     * @param {Array|null} celulaAnterior  array retornado numa chamada anterior (para remoção)
     * @returns {Array|null}
     */
    registrarEntidade(entidade, wx, wz, celulaAnterior = null){
        // Remove da célula antiga
        if(celulaAnterior){
            const i = celulaAnterior.indexOf(entidade);
            if(i !== -1) celulaAnterior.splice(i, 1);
        }

        const tile = this.getDadosTile(wx, wz);
        if(!tile) return null;

        if(!tile[4]) tile[4] = [];
        tile[4].push(entidade);
        return tile[4];
    }

    /** Quantidade de chunks atualmente carregados */
    get totalChunks(){ return this.chunks.size; }

    /** Quantidade de chunks aguardando carregamento */
    get chunksNaFila(){ return this._filaCarregamento.length; }
}