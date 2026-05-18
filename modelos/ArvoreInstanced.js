import * as twgl from "../twgl.full.module.js";
import { Parser } from "../gl/Parser.js";

/**
 * Renderiza árvores via instanced drawing.
 *
 * Compatível com o novo Terreno baseado em chunks:
 * não acessa map.pos[][] diretamente; usa chunk.dados[][].
 *
 * Uso:
 *   const arvores = new ArvoreInstanced(setupGL);
 *   await arvores.build();               // carrega OBJ uma vez
 *   arvores.addChunk(chunk, terreno);    // ao carregar cada chunk
 *   arvores.removeChunk(cx, cz);        // ao descarregar
 *   arvores.draw(programInfo, ...);      // no loop de render
 */
export class ArvoreInstanced {
    /**
     * @param {import("../gl/SetupGL.js").SetupGL} setupGL
     */
    constructor(setupGL) {
        this.setupGL = setupGL;
        this.gl      = setupGL.gl;
        this.meshes   = [];
        this.textures = {};

        /**
         * Buffers por chunk — chave "cx,cz"
         * @type {Map<string, {instPosBuf:WebGLBuffer|null, instRotBuf:WebGLBuffer|null, instanceCount:number}>}
         */
        this._chunkBuffers = new Map();

        this._loaded = false;
    }

    // ──────────────────────────────────────────
    //  Setup — chamado uma vez
    // ──────────────────────────────────────────

    async build() {
        const parser = new Parser();
        const { parts, materials } = await parser.loadOBJWithMTL("modelos/arvore/arvore.obj");

        const basePath = "modelos/arvore/";
        for(const m in materials){
            if(materials[m].map_Kd){
                this.textures[m] = this.setupGL.loadTexture(basePath + materials[m].map_Kd);
            }
        }
        for(const m in parts){
            const mesh = parts[m];
            mesh.material = m;
            this.meshes.push(this.setupGL.makeMesh(mesh));
        }

        this._loaded = true;
    }

    // ──────────────────────────────────────────
    //  Integração com chunks
    // ──────────────────────────────────────────

    /**
     * Gera buffers de instância para um chunk recém-carregado.
     * Lê bioma/altura diretamente de chunk.dados (sem acessar map.pos).
     *
     * @param {{ cx:number, cz:number, dados:Array }} chunk
     * @param {import("../modelos/Terreno.js").Terreno} terreno
     */
    addChunk(chunk, terreno){
        if(!this._loaded) return;

        const chave = `${chunk.cx},${chunk.cz}`;
        if(this._chunkBuffers.has(chave)) return;

        const [sX, sZ]   = terreno.tamanhoChunk;
        const baseX       = chunk.cx * sX;
        const baseZ       = chunk.cz * sZ;
        const espacamento = 4;

        const instPos = [];
        const instRot = [];

        for(let lx = 0; lx < sX - 1; lx += espacamento){
            for(let lz = 0; lz < sZ - 1; lz += espacamento){

                // Jitter dentro da célula de espaçamento
                const jlx = lx + Math.random() * espacamento;
                const jlz = lz + Math.random() * espacamento;

                const ix = Math.min(Math.floor(jlx), sX - 2);
                const iz = Math.min(Math.floor(jlz), sZ - 2);

                const tile = chunk.dados?.[ix]?.[iz];
                if(!tile) continue;

                const bioma  = tile[3];
                const altura = tile[0];

                if(bioma !== "floresta" || altura < 0) continue;

                instPos.push(baseX + jlx, altura, baseZ + jlz);
                instRot.push(Math.random() * Math.PI * 2);
            }
        }

        const instanceCount = instPos.length / 3;

        if(instanceCount === 0){
            this._chunkBuffers.set(chave, { instPosBuf: null, instRotBuf: null, instanceCount: 0 });
            return;
        }

        const gl = this.gl;

        const instPosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, instPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instPos), gl.STATIC_DRAW);

        const instRotBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, instRotBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instRot), gl.STATIC_DRAW);

        this._chunkBuffers.set(chave, { instPosBuf, instRotBuf, instanceCount });
    }

    /**
     * Libera buffers WebGL de um chunk descarregado.
     * @param {number} cx
     * @param {number} cz
     */
    removeChunk(cx, cz){
        const chave = `${cx},${cz}`;
        const entry = this._chunkBuffers.get(chave);
        if(!entry) return;
        if(entry.instPosBuf) this.gl.deleteBuffer(entry.instPosBuf);
        if(entry.instRotBuf) this.gl.deleteBuffer(entry.instRotBuf);
        this._chunkBuffers.delete(chave);
    }

    // ──────────────────────────────────────────
    //  Render
    // ──────────────────────────────────────────

    draw(programInfo, parentMatrix, lightMatrix, time){
        if(!this._loaded || this.meshes.length === 0) return;

        const gl = this.gl;
        const s  = this.setupGL;

        const aInstPos = gl.getAttribLocation(programInfo.program, "a_instancePos");
        const aInstRot = gl.getAttribLocation(programInfo.program, "a_instanceRot");

        for(const { instPosBuf, instRotBuf, instanceCount } of this._chunkBuffers.values()){
            if(instanceCount === 0 || !instPosBuf) continue;

            for(const mesh of this.meshes){
                gl.useProgram(programInfo.program);

                twgl.setBuffersAndAttributes(gl, programInfo, mesh.bufferInfo);

                gl.bindBuffer(gl.ARRAY_BUFFER, instPosBuf);
                gl.enableVertexAttribArray(aInstPos);
                gl.vertexAttribPointer(aInstPos, 3, gl.FLOAT, false, 0, 0);
                gl.vertexAttribDivisor(aInstPos, 1);

                gl.bindBuffer(gl.ARRAY_BUFFER, instRotBuf);
                gl.enableVertexAttribArray(aInstRot);
                gl.vertexAttribPointer(aInstRot, 1, gl.FLOAT, false, 0, 0);
                gl.vertexAttribDivisor(aInstRot, 1);

                s.uniforms.u_model            = parentMatrix;
                s.uniforms.u_texture          = this.textures[mesh.material] || null;
                s.uniforms.u_useTexture       = this.textures[mesh.material] ? 1 : 0;
                s.uniforms.u_isWater          = 0;
                s.uniforms.u_isInstanced      = 1;
                s.uniforms.u_isGrass          = 0;
                s.uniforms.u_emissive         = 0.0;
                s.uniforms.u_isEmissive       = 0;
                s.uniforms.u_numPointLights   = 0;
                s.uniforms.u_specularStrength = 0.1;
                s.uniforms.u_shininess        = 8.0;

                twgl.setUniforms(programInfo, s.uniforms);

                twgl.drawBufferInfo(gl, mesh.bufferInfo, gl.TRIANGLES,
                    mesh.bufferInfo.numElements, 0, instanceCount);

                gl.vertexAttribDivisor(aInstPos, 0);
                gl.disableVertexAttribArray(aInstPos);
                gl.vertexAttribDivisor(aInstRot, 0);
                gl.disableVertexAttribArray(aInstRot);
            }
        }
    }
}