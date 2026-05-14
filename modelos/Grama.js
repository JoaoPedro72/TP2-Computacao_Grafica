import * as twgl from "../twgl.full.module.js";
import { generateGrid } from "../PerlinNoise.js";
import { SetupGL } from "../gl/SetupGL.js";

export class Grama {
    /**
     * 
     * @param {SetupGL} setupGL 
     * @param {*} pos 
     * @param {*} tamanho 
     */
    constructor(setupGL, pos, tamanho) {
        this.setupGL = setupGL;
        this.gl = setupGL.gl;
        this.pos = pos;
        this.tamanho = tamanho;
        this.texture = setupGL.loadTexture("modelos/grama/grama.png");

        this.raioRender = 25;
        this.tufosPorCelula = 4;
        this._chunkSize = 16;

        this._todasInstancias = [];
        this._chunks = {};

        this._posBuf     = null;
        this._uvBuf      = null;
        this._instPosBuf = null;
        this._instRotBuf = null;
        this._vertCount  = 0;

        this._instPosDyn = null;
        this._instRotDyn = null;
        this.instanceCount = 0;

        // Cache de locations por programa (depth e main têm locations diferentes)
        this._locationCache = {};

        this._buildGeometry();
        this._buildAllInstances();
        this._buildChunks();
        this._createDynamicBuffers();
    }

    _buildGeometry() {
        const gl = this.gl;
        const scale = 1;
        const h = 1.3 * scale;
        const w = 0.02 * scale;

        const positions = new Float32Array([
            // Billboard 1
            -w, 0, 0,   w, 0, 0,   w, h, 0,
            -w, 0, 0,   w, h, 0,  -w, h, 0,
            // Billboard 2
             0, 0,-w,   0, 0, w,   0, h, w,
             0, 0,-w,   0, h, w,   0, h,-w,
        ]);
        const uvs = new Float32Array([
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
        ]);

        this._posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this._uvBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuf);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

        this._vertCount = positions.length / 3;
    }

    _buildAllInstances() {
        const [sizeX, sizeZ] = this.tamanho;
        const seed = Math.random() * 9999;
        const noiseGrid = generateGrid({
            x_size: sizeX, y_size: sizeZ,
            scale: 15, seed, heightScale: 1
        });

        for (let x = 0; x < sizeX - 1; x++) {
            for (let z = 0; z < sizeZ - 1; z++) {
                const bioma = this.pos[x][z][3];
                if (!["planicie", "floresta"].includes(bioma)) continue;

                const noiseVal = (noiseGrid[x][z] + 1) / 2;
                const altura = this.pos[x][z][0];
                if (altura < 0) continue;

                const threshold = bioma === "floresta" ? 0.25 : 0.5;
                if (noiseVal < threshold) continue;

                for (let k = 0; k < this.tufosPorCelula; k++) {
                    this._todasInstancias.push({
                        x: x + Math.random(),
                        y: altura - 1.0,
                        z: z + Math.random(),
                        rot: Math.random() * Math.PI
                    });
                }
            }
        }
    }

    _buildChunks() {
        const cs = this._chunkSize;
        for (const inst of this._todasInstancias) {
            const cx = Math.floor(inst.x / cs);
            const cz = Math.floor(inst.z / cs);
            const key = `${cx},${cz}`;
            if (!this._chunks[key]) this._chunks[key] = [];
            this._chunks[key].push(inst);
        }
    }

    _createDynamicBuffers() {
        const gl = this.gl;
        const max = this._todasInstancias.length;

        this._instPosDyn = new Float32Array(max * 3);
        this._instRotDyn = new Float32Array(max);

        this._instPosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._instPosDyn, gl.DYNAMIC_DRAW);

        this._instRotBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._instRotDyn, gl.DYNAMIC_DRAW);
    }

    _updateVisibleInstances(camPos) {
        const raio2 = this.raioRender * this.raioRender;
        const cs = this._chunkSize;
        let count = 0;

        const camCX = Math.floor(camPos[0] / cs);
        const camCZ = Math.floor(camPos[2] / cs);
        const raioChunks = Math.ceil(this.raioRender / cs) + 1;

        for (let cx = camCX - raioChunks; cx <= camCX + raioChunks; cx++) {
            for (let cz = camCZ - raioChunks; cz <= camCZ + raioChunks; cz++) {
                const chunk = this._chunks[`${cx},${cz}`];
                if (!chunk) continue;

                for (const inst of chunk) {
                    const dx = inst.x - camPos[0];
                    const dz = inst.z - camPos[2];
                    if (dx*dx + dz*dz > raio2) continue;

                    this._instPosDyn[count*3]   = inst.x;
                    this._instPosDyn[count*3+1] = inst.y;
                    this._instPosDyn[count*3+2] = inst.z;
                    this._instRotDyn[count]     = inst.rot;
                    count++;
                }
            }
        }

        this.instanceCount = count;

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._instPosDyn.subarray(0, count * 3));

        gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._instRotDyn.subarray(0, count));
    }

    _getLocations(programInfo) {
        const progId = programInfo.program;
        if (!this._locationCache[progId]) {
            const gl = this.gl;
            this._locationCache[progId] = {
                aPos:     gl.getAttribLocation(progId, "a_position"),
                aUV:      gl.getAttribLocation(progId, "a_texcoord"),
                aInstPos: gl.getAttribLocation(progId, "a_instancePos"),
                aInstRot: gl.getAttribLocation(progId, "a_instanceRot"),
            };
        }
        return this._locationCache[progId];
    }

    draw(programInfo, parentMatrix, lightMatrix, time) {
        if (this._todasInstancias.length === 0) return;

        this._updateVisibleInstances(this.setupGL.camera.pos);

        if (this.instanceCount === 0) return;

        const gl = this.gl;
        const s = this.setupGL;

        const { aPos, aUV, aInstPos, aInstRot } = this._getLocations(programInfo);

        gl.useProgram(programInfo.program);

        // Geometria base
        if (aPos >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._posBuf);
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        }

        if (aUV >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuf);
            gl.enableVertexAttribArray(aUV);
            gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
        }

        // Buffers de instância
        if (aInstPos >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
            gl.enableVertexAttribArray(aInstPos);
            gl.vertexAttribPointer(aInstPos, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(aInstPos, 1);
        }

        if (aInstRot >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
            gl.enableVertexAttribArray(aInstRot);
            gl.vertexAttribPointer(aInstRot, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(aInstRot, 1);
        }

        s.uniforms.u_model =            parentMatrix,
        s.uniforms.u_texture =          this.texture,
        s.uniforms.u_useTexture =       1,
        s.uniforms.u_isWater =          0,
        s.uniforms.u_isGrass =          1,
        s.uniforms.u_isInstanced =      1,
        s.uniforms.u_emissive =         0.0,
        s.uniforms.u_isEmissive =       0,
        s.uniforms.u_specularStrength = 0.0,
        s.uniforms.u_shininess =        4.0,

        twgl.setUniforms(programInfo, s.uniforms);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, this._vertCount, this.instanceCount);

        // Limpa estado para não contaminar draws seguintes
        if (aInstPos >= 0) {
            gl.vertexAttribDivisor(aInstPos, 0);
            gl.disableVertexAttribArray(aInstPos);
        }
        if (aInstRot >= 0) {
            gl.vertexAttribDivisor(aInstRot, 0);
            gl.disableVertexAttribArray(aInstRot);
        }
    }
}