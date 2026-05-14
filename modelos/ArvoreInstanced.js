import * as twgl from "../twgl.full.module.js";
import { Parser } from "../gl/Parser.js";
import { generateGrid } from "../PerlinNoise.js";

export class ArvoreInstanced {
    constructor(setupGL, pos, tamanho) {
        this.setupGL = setupGL;
        this.gl = setupGL.gl;
        this.pos = pos;
        this.tamanho = tamanho;
        this.meshes = [];
        this.textures = {};
        this.instanceCount = 0;
        this._instPosBuf = null;
        this._instRotBuf = null;
    }

    async build() {
        const parser = new Parser();
        const { parts, materials } = await parser.loadOBJWithMTL("modelos/arvore/arvore.obj");

        const basePath = "modelos/arvore/";
        for (let m in materials) {
            if (materials[m].map_Kd) {
                this.textures[m] = this.setupGL.loadTexture(basePath + materials[m].map_Kd);
            }
        }
        for (let m in parts) {
            const mesh = parts[m];
            mesh.material = m;
            this.meshes.push(this.setupGL.makeMesh(mesh));
        }

        this._buildInstances();
    }

    _buildInstances() {
        const gl = this.gl;
        const [sizeX, sizeZ] = this.tamanho;

        const instPos = [];
        const instRot = [];

        const espacamento = 4; // uma árvore a cada 4 células — aumente para mais espaço

        for (let x = 0; x < sizeX - 1; x += espacamento) {
            for (let z = 0; z < sizeZ - 1; z += espacamento) {

                // Jitter: desloca aleatoriamente dentro da célula
                const jx = x + Math.random() * espacamento;
                const jz = z + Math.random() * espacamento;

                const ix = Math.floor(jx);
                const iz = Math.floor(jz);

                if (ix >= sizeX - 1 || iz >= sizeZ - 1) continue;

                const bioma = this.pos[ix][iz][3];
                if (bioma !== "floresta") continue;

                const altura = this.pos[ix][iz][0];
                if (altura < 0) continue;

                instPos.push(jx, altura, jz);
                instRot.push(Math.random() * Math.PI * 2);
            }
        }

        this.instanceCount = instPos.length / 3;
        if (this.instanceCount === 0) return;

        this._instPosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instPos), gl.STATIC_DRAW);

        this._instRotBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instRot), gl.STATIC_DRAW);
    }

    draw(programInfo, parentMatrix, lightMatrix, time) {
        if (this.instanceCount === 0) return;
        const gl = this.gl;
        const s = this.setupGL;

        const aInstPos = gl.getAttribLocation(programInfo.program, "a_instancePos");
        const aInstRot = gl.getAttribLocation(programInfo.program, "a_instanceRot");

        for (const mesh of this.meshes) {
            gl.useProgram(programInfo.program);

            twgl.setBuffersAndAttributes(gl, programInfo, mesh.bufferInfo);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._instPosBuf);
            gl.enableVertexAttribArray(aInstPos);
            gl.vertexAttribPointer(aInstPos, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(aInstPos, 1);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._instRotBuf);
            gl.enableVertexAttribArray(aInstRot);
            gl.vertexAttribPointer(aInstRot, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(aInstRot, 1);

            s.uniforms.u_model =            parentMatrix;
            s.uniforms.u_texture =          this.textures[mesh.material] || null;
            s.uniforms.u_useTexture =       this.textures[mesh.material] ? 1  : 0;
            s.uniforms.u_isWater =          0;
            s.uniforms.u_isInstanced =      1;
            s.uniforms.u_isGrass =          0;
            s.uniforms.u_emissive =         0.0;
            s.uniforms.u_isEmissive =       0;
            s.uniforms.u_numPointLights =   0;
            s.uniforms.u_specularStrength = 0.1;
            s.uniforms.u_shininess =        8.0;

            twgl.setUniforms(programInfo, s.uniforms);

            // 🔑 usar índices com instâncias
            const ext = gl.getExtension("ANGLE_instanced_arrays"); // fallback WebGL1
            twgl.drawBufferInfo(gl, mesh.bufferInfo, gl.TRIANGLES,
                mesh.bufferInfo.numElements, 0, this.instanceCount);
            // OU: gl.drawElementsInstanced(...)

            gl.vertexAttribDivisor(aInstPos, 0);
            gl.disableVertexAttribArray(aInstPos);
            gl.vertexAttribDivisor(aInstRot, 0);
            gl.disableVertexAttribArray(aInstRot);
        }
    }
}