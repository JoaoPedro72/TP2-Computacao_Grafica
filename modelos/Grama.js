import * as twgl from "../twgl.full.module.js";
import { generateGrid } from "../PerlinNoise.js";

export class Grama {
    constructor(setupGL, pos, tamanho) {
        this.setupGL = setupGL;
        this.gl = setupGL.gl;
        this.pos = pos;
        this.tamanho = tamanho;
        this.texture = setupGL.loadTexture("modelos/grama/grama.png");

        // Raio de renderização em unidades de mundo
        this.raioRender = 25;

        // Quantos tufos por célula de floresta
        this.tufosPorCelula = 8;

        // Todas as instâncias do mundo (geradas uma vez)
        this._todasInstancias = []; // [{x, y, z, rot}, ...]

        this._posBuf    = null;
        this._uvBuf     = null;
        this._instPosBuf = null;
        this._instRotBuf = null;
        this._vertCount  = 0;

        // Buffer dinâmico (re-uploadado a cada frame com instâncias visíveis)
        this._instPosDyn = null;
        this._instRotDyn = null;
        this.instanceCount = 0;

        this._buildGeometry();
        this._buildAllInstances();
        this._createDynamicBuffers();
    }

    _buildGeometry() {
        const gl = this.gl;
        const scale = 1;
        const h = 1.3 * scale;
        const w = 0.02 * scale;

        // Cruz de dois billboards
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

    _createDynamicBuffers() {
        const gl = this.gl;
        // Aloca no máximo todas as instâncias (pior caso = tudo visível)
        const maxInstancias = this._todasInstancias.length;

        this._instPosDyn = new Float32Array(maxInstancias * 3);
        this._instRotDyn = new Float32Array(maxInstancias);

        this._instPosBuf = gl.createBuffer();
        this._instRotBuf = gl.createBuffer();

        // Pré-aloca espaço na GPU com DYNAMIC_DRAW
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._instPosDyn, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._instRotDyn, gl.DYNAMIC_DRAW);
    }

    _updateVisibleInstances(camPos) {
        const raio2 = this.raioRender * this.raioRender;
        let count = 0;

        for (const inst of this._todasInstancias) {
            const dx = inst.x - camPos[0];
            const dz = inst.z - camPos[2];

            if (dx * dx + dz * dz > raio2) continue;

            this._instPosDyn[count * 3 + 0] = inst.x;
            this._instPosDyn[count * 3 + 1] = inst.y;
            this._instPosDyn[count * 3 + 2] = inst.z;
            this._instRotDyn[count] = inst.rot;
            count++;
        }

        this.instanceCount = count;

        const gl = this.gl;

        // Re-upload apenas a parte usada (subData é mais rápido que bufferData)
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._instPosDyn.subarray(0, count * 3));

        gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._instRotDyn.subarray(0, count));
    }

    draw(programInfo, parentMatrix, lightMatrix, time) {
        if (this._todasInstancias.length === 0) return;

        // Atualiza quais instâncias estão dentro do raio
        this._updateVisibleInstances(this.setupGL.camera.pos);

        if (this.instanceCount === 0) return;

        const gl = this.gl;
        const s = this.setupGL;

        gl.useProgram(programInfo.program);

        const aPos     = gl.getAttribLocation(programInfo.program, "a_position");
        const aUV      = gl.getAttribLocation(programInfo.program, "a_texcoord");
        const aInstPos = gl.getAttribLocation(programInfo.program, "a_instancePos");
        const aInstRot = gl.getAttribLocation(programInfo.program, "a_instanceRot");

        gl.bindBuffer(gl.ARRAY_BUFFER, this._posBuf);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuf);
        gl.enableVertexAttribArray(aUV);
        gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
        gl.enableVertexAttribArray(aInstPos);
        gl.vertexAttribPointer(aInstPos, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(aInstPos, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
        gl.enableVertexAttribArray(aInstRot);
        gl.vertexAttribPointer(aInstRot, 1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(aInstRot, 1);

        twgl.setUniforms(programInfo, {
            u_projection:       s.projection,
            u_view:             s.view,
            u_model:            parentMatrix,
            u_lightMatrix:      lightMatrix || s.lightMatrix,
            u_shadowMap:        s.shadowTexture,
            u_texture:          this.texture,
            u_useTexture:       1,
            u_isWater:          0,
            u_isGrass:          1,
            u_lighting:         s.lightingEnabled ? 1 : 0,
            u_sunDirection:     s.sunDirection,
            u_sunStrength:      s.sunStrength,
            u_emissive:         0.0,
            u_isEmissive:       0,
            u_pointLights:      new Float32Array(24),
            u_pointStrength:    new Float32Array(8),
            u_numPointLights:   0,
            u_cameraPos:        s.camera.pos,
            u_specularStrength: 0.0,
            u_shininess:        4.0,
            u_time:             time,
            u_isInstanced:      0
        });

        gl.drawArraysInstanced(gl.TRIANGLES, 0, this._vertCount, this.instanceCount);

        // Limpa estado para não contaminar draws seguintes
        gl.vertexAttribDivisor(aInstPos, 0);
        gl.disableVertexAttribArray(aInstPos);
        gl.vertexAttribDivisor(aInstRot, 0);
        gl.disableVertexAttribArray(aInstRot);
    }
}