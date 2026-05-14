import { Camera } from "../Camera.js";
import * as twgl from "../twgl.full.module.js";
import { Utills } from "../Utills.js";

const utills = new Utills();

export class SetupGL {
    /**
     * 
     * @param {Camera} camera 
     */
    constructor(camera) {
        this.camera = camera;
        this.canvas = document.getElementById("glcanvas");
        this.gl = this.canvas.getContext("webgl2");

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // ☀️ sol
        this.sunDirection = [0, 1, 0];
        this.sunStrength = 1; // 🔥 controle de intensidade

        // 🔥 tochas
        this.pointLights = [];
        this.pointStrength = [];
        this.lights = 0;

        this._lightsBuffer    = new Float32Array(24); // 8 luzes * 3
        this._strengthsBuffer = new Float32Array(8);

        // 💾 caches (se ainda não tiver)
        this.modelCache = {};
        this.textureCache = {};

        // 🟣 shadow map
        this.shadowSize = 2048;

        this.lightingEnabled = true;

        // Cria a textura de depth manualmente
        const depthTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, depthTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0,
            this.gl.DEPTH_COMPONENT16,
            this.shadowSize, this.shadowSize, 0,
            this.gl.DEPTH_COMPONENT,
            this.gl.UNSIGNED_SHORT,
            null
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // Cria o framebuffer e anexa só o depth
        const shadowFBO = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, shadowFBO);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.DEPTH_ATTACHMENT,
            this.gl.TEXTURE_2D,
            depthTexture,
            0
        );

        // Sem color attachment — diz pro WebGL explicitamente
        this.gl.drawBuffers([this.gl.NONE]);
        this.gl.readBuffer(this.gl.NONE);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // Guarda as referências
        this.shadowFramebuffer = { framebuffer: shadowFBO };
        this.shadowTexture = depthTexture;
    }

    async createProgram() {
        const vs = await (await fetch("glsl/main.vert")).text();
        const fs = await (await fetch("glsl/main.frag")).text();

        const dvs = await (await fetch("glsl/depth.vert")).text();
        const dfs = await (await fetch("glsl/depth.frag")).text();

        this.programInfo = twgl.createProgramInfo(this.gl, [vs, fs]);
        this.depthProgramInfo = twgl.createProgramInfo(this.gl, [dvs, dfs]);
    }

    updateProjection(window) {
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.projection = twgl.m4.perspective(
            this.camera.fov * (Math.PI/ 180),
            this.canvas.width / this.canvas.height,
            0.1,
            100
        );
    }

    setCamera(pos, target, up) {
        const view = twgl.m4.lookAt(pos, target, up);
        this.view = twgl.m4.inverse(view);
    }

    // ☀️ matriz da luz
    computeLightMatrix() {
        const lightPos = [
            this.sunDirection[0] * 100,
            this.sunDirection[1] * 100,
            this.sunDirection[2] * 100 + + this.camera.pos[2]
        ];

        const target = [this.camera.pos[0], 0, this.camera.pos[2]];
        //const target = [50, 0, 50]

        const lightView = twgl.m4.lookAt(lightPos, target, [0,1,0]);
        const lightProj = twgl.m4.ortho(-75,75,-75,75,0.1,300);

        this.lightMatrix = twgl.m4.multiply(
            lightProj,
            twgl.m4.inverse(lightView)
        );
        return this.lightMatrix;
    }

    // 🔥 PASSO 1 (shadow map)
    renderShadowPass(drawScene) {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer.framebuffer);

        gl.disable(gl.CULL_FACE);

        gl.viewport(0, 0, this.shadowSize, this.shadowSize);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        drawScene(this.depthProgramInfo, this.lightMatrix);

        gl.enable(gl.CULL_FACE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // 🎯 PASSO 2 (render normal)
    renderScene(drawScene) {
        const gl = this.gl;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);


        const dayFactor = Math.max(0.2, this.sunDirection[1] * 0.5 + 0.5);

        this.gl.clearColor(
            0.5 * dayFactor,
            0.5 * dayFactor,
            1.0 * dayFactor,
            1
        );

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawScene(this.programInfo, null);
    }

    makeMesh(mesh) {
        const arrays = {
            a_position: { numComponents: 3, data: mesh.position },
            a_texcoord: { numComponents: 2, data: mesh.texcoord },
            a_normal:   { numComponents: 3, data: mesh.normal },
            indices: mesh.indices,
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(this.gl, arrays);

        return {
            bufferInfo,
            material: mesh.material
        };
    }

    drawMesh(pos, mesh, textures, modelMatrix, programInfo, lightMatrix, isEmissive = false, time) {
        if(!this.camera.itsOnCamera(pos) && !mesh.alwaysRender) {
            return;
        }
        if(modelMatrix[13] < -20) {
            return;
        }
        if(mesh.hasLight && this.camera.itsOnCamera(pos)){
            this.pointLights[this.lights] = [];
            this.pointLights[this.lights][0] = mesh.lightPos[0] + pos[0];
            this.pointLights[this.lights][1] = mesh.lightPos[1] + pos[1];
            this.pointLights[this.lights][2] = mesh.lightPos[2] + pos[2];
            this.pointStrength[this.lights] = mesh.lightStrengt;
            this.lights ++;
            if(this.lights == 8) this.lights = 0;
        }

        const tex = textures[mesh.material];

        const maxLights = 8;

        this._lightsBuffer.fill(0);
        this._strengthsBuffer.fill(0);
        for (let i = 0; i < Math.min(this.pointLights.length, maxLights); i++) {
            this._lightsBuffer[i*3]   = this.pointLights[i][0];
            this._lightsBuffer[i*3+1] = this.pointLights[i][1];
            this._lightsBuffer[i*3+2] = this.pointLights[i][2];
            this._strengthsBuffer[i]  = this.pointStrength[i];
        }

        const uniforms = {
            u_projection: this.projection,
            u_view: this.view,
            u_model: modelMatrix,

            u_lightMatrix: lightMatrix || this.lightMatrix,
            u_shadowMap: this.shadowTexture,

            u_lighting: this.lightingEnabled ? 1 : 0,

            // ☀️ sol
            u_sunDirection: this.sunDirection,
            u_sunStrength: this.sunStrength,

            // objeto emissivo
            u_emissive: isEmissive ? 1.5 : 0.0,
            u_isEmissive: isEmissive ? 1 : 0,

            // 🔥 tochas
            u_pointLights: this._lightsBuffer,
            u_pointStrength: this._strengthsBuffer,
            u_numPointLights: this.pointLights.length,

            // 🎨 textura
            u_texture: tex || null,
            u_useTexture: tex ? 1 : 0,

            u_time: performance.now() * 0.001,
            u_isWater: mesh.isWater ? 1 : 0,
            u_isGrass: mesh.isGrass ? 1 : 0,
            u_isInstanced:            0,

            u_cameraPos: this.camera.pos,

            u_specularStrength: mesh.specularStrength ?? 0.3, // intensidade do brilho
            u_shininess: mesh.shininess ?? 16.0,       // quão concentrado é
        };

        const gl = this.gl;

        gl.useProgram(programInfo.program);

        twgl.setBuffersAndAttributes(gl, programInfo, mesh.bufferInfo);
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, mesh.bufferInfo);
    }

    loadTexture(url) {

        this.textureCache = this.textureCache || {};

        if (this.textureCache[url]) {
            return this.textureCache[url];
        }

        const tex = twgl.createTexture(this.gl, {
            src: url,
            flipY: true,

            // 🔥 ESSENCIAL PRA PIXEL ART
            min: this.gl.NEAREST,
            mag: this.gl.NEAREST,

            // 🔥 evita blur em mipmap
            mipmap: false,

            // 🔥 evita artefato nas bordas
            wrap: this.gl.CLAMP_TO_EDGE
        });

        this.textureCache[url] = tex;

        return tex;
    }
    
    normalizeSun() {
        const d = this.sunDirection;
        const len = Math.hypot(d[0], d[1], d[2]) || 1;
        this.sunDirection = d.map(v => v / len);
    }

    addLight(pos, strength){
        this.pointLights[this.lights] = pos;
        this.pointStrength[this.lights] = strength;

        this.lights ++;
    }
}