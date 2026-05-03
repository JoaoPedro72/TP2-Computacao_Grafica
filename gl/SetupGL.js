import * as twgl from "../twgl.full.module.js";

export class SetupGL {
    constructor() {
        this.canvas = document.getElementById("glcanvas");
        this.gl = this.canvas.getContext("webgl2");

        this.dpr = window.devicePixelRatio || 1;

        this.gl.enable(this.gl.CULL_FACE);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.modelCache = {};

        // 🔥 múltiplas luzes
        this.lights = [
            { direction: [2, 2, 2], strength: 1.0 },
        ];
    }

    async createProgram() {
        const vs = await (await fetch("glsl/vertex.glsl")).text();
        const fs = await (await fetch("glsl/fragment.glsl")).text();

        this.programInfo = twgl.createProgramInfo(this.gl, [vs, fs]);
    }

    updateProjection(window) {
        this.canvas.width = window.innerWidth * this.dpr;
        this.canvas.height = window.innerHeight * this.dpr;

        this.canvas.style.width = window.innerWidth + "px";
        this.canvas.style.height = window.innerHeight + "px";

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.projection = twgl.m4.perspective(
            Math.PI / 3,
            this.canvas.width / this.canvas.height,
            0.1,
            100
        );
    }

    clearScreen(cameraPos, target = [0,0,0]) {
        this.gl.clearColor(0.5, 0.5, 1, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        const up = [0, 1, 0];

        const camera = twgl.m4.lookAt(cameraPos, target, up);
        this.view = twgl.m4.inverse(camera);
    }

    loadTexture(url) {
        return twgl.createTexture(this.gl, {
            src: url,
            mag: this.gl.NEAREST,
            min: this.gl.NEAREST,
            wrap: this.gl.REPEAT,
        });
    }

    makeMesh(mesh) {
        const arrays = {
            a_position: { numComponents: 3, data: mesh.position },
            a_texcoord: { numComponents: 2, data: mesh.texcoord },
            a_normal:   { numComponents: 3, data: mesh.normal },
            indices: mesh.indices,
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(this.gl, arrays);
        const vao = twgl.createVAOFromBufferInfo(this.gl, this.programInfo, bufferInfo);

        return {
            bufferInfo,
            vao,
            material: mesh.material,
            transparent: mesh.transparent || false
        };
    }

    getLightUniforms() {
        const maxLights = 8;

        const directions = [];
        const strengths = [];

        for (let i = 0; i < maxLights; i++) {
            if (i < this.lights.length) {
                directions.push(...this.lights[i].direction);
                strengths.push(this.lights[i].strength);
            } else {
                directions.push(0,0,0);
                strengths.push(0);
            }
        }

        return {
            u_lightDirections: directions,
            u_lightStrengths: strengths,
            u_numLights: this.lights.length
        };
    }

    drawMesh(mesh, textures, modelMatrix) {

        const tex = textures[mesh.material];

        const uniforms = {
            u_projection: this.projection,
            u_view: this.view,
            u_model: modelMatrix,
            u_texture: tex,
            u_useTexture: tex ? 1 : 0,
            ...this.getLightUniforms()
        };

        this.gl.useProgram(this.programInfo.program);
        this.gl.bindVertexArray(mesh.vao);

        twgl.setUniforms(this.programInfo, uniforms);
        twgl.drawBufferInfo(this.gl, mesh.bufferInfo);
    }

    drawObject(meshes, textures, scale, offset, rotation) {
        const transform = { scale, offset, rotation };

        for (let m of meshes) {
            if (!m.transparent) this.drawMesh(m, textures, transform);
        }
        gl.depthMask(false);
        for (let m of meshes) {
            if (m.transparent) this.drawMesh(m, textures, transform);
        }
        gl.depthMask(true);
    }
}