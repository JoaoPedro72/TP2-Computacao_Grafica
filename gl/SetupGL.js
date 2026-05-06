import * as twgl from "../twgl.full.module.js";

export class SetupGL {
    constructor() {
        this.canvas = document.getElementById("glcanvas");
        this.gl = this.canvas.getContext("webgl2");

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // ☀️ sol
        this.sunDirection = [0, 1, 0];
        this.sunStrength = 1.5; // 🔥 controle de intensidade

        // 🔥 tochas
        this.pointLights = [];
        this.pointStrength = [];

        // 💾 caches (se ainda não tiver)
        this.modelCache = {};
        this.textureCache = {};

        // 🟣 shadow map
        this.shadowSize = 1024;

        this.shadowFramebuffer = twgl.createFramebufferInfo(
            this.gl,
            [{
                attachmentPoint: this.gl.DEPTH_ATTACHMENT,
                format: this.gl.DEPTH_COMPONENT16, // 🔥 ESSENCIAL
            }],
            this.shadowSize,
            this.shadowSize
        );
        this.shadowTexture = this.shadowFramebuffer.attachments[0];
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
            Math.PI / 3,
            this.canvas.width / this.canvas.height,
            0.1,
            100
        );
    }

    setCamera(pos, target) {
        const view = twgl.m4.lookAt(pos, target, [0,1,0]);
        this.view = twgl.m4.inverse(view);
    }

    // ☀️ matriz da luz
    computeLightMatrix() {
        const lightPos = [
            -this.sunDirection[0] * 30,
            -this.sunDirection[1] * 30,
            -this.sunDirection[2] * 30
        ];

        const target = [0,0,0];

        const lightView = twgl.m4.lookAt(lightPos, target, [0,1,0]);
        const lightProj = twgl.m4.ortho(-20,20,-20,20,1,100);

        this.lightMatrix = twgl.m4.multiply(
            lightProj,
            twgl.m4.inverse(lightView)
        );
    }

    // 🔥 PASSO 1 (shadow map)
    renderShadowPass(drawScene) {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer.framebuffer);
        gl.viewport(0, 0, this.shadowSize, this.shadowSize);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        drawScene(this.depthProgramInfo, this.lightMatrix);

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

    drawMesh(mesh, textures, modelMatrix, programInfo, lightMatrix, isEmissive = false, time) {
        const tex = textures[mesh.material];

        const maxLights = 8;

        // 🔥 garantir tamanho fixo
        const lights = [];
        const strengths = [];

        for (let i = 0; i < maxLights; i++) {
            if (i < this.pointLights.length) {
                lights.push(...this.pointLights[i]);
                strengths.push(this.pointStrength[i]);
            } else {
                lights.push(0,0,0);
                strengths.push(0);
            }
        }

        const uniforms = {
            u_projection: this.projection,
            u_view: this.view,
            u_model: modelMatrix,

            u_lightMatrix: lightMatrix || this.lightMatrix,
            u_shadowMap: this.shadowTexture,

            // ☀️ sol
            u_sunDirection: this.sunDirection,
            u_sunStrength: this.sunStrength,

            // objeto emissivo
            u_emissive: isEmissive ? 1.5 : 0.0,
            u_isEmissive: isEmissive ? 1 : 0,

            // 🔥 tochas
            u_pointLights: new Float32Array(lights),
            u_pointStrength: new Float32Array(strengths),
            u_numPointLights: this.pointLights.length,

            // 🎨 textura
            u_texture: tex || null,
            u_useTexture: tex ? 1 : 0,

            u_time: performance.now() * 0.001,
            u_isWater: mesh.isWater ? 1 : 0
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
}