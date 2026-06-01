import { SetupGL } from "./gl/SetupGL.js";
import { Camera } from "./Camera.js";

import { Controle } from "./logica/Controle.js";

import { ControleSom } from "./logica/ControleSom.js";

import * as twgl from "./twgl.full.module.js";

let keys = {};
const camera = new Camera(keys);
const setupGL = new SetupGL(camera);
const log = document.getElementById("log");

setupGL.updateProjection(window);

// Captura teclas pressionadas
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Ativa pointer lock ao clicar
setupGL.canvas.addEventListener("click", () => setupGL.canvas.requestPointerLock());

// Movimento do mouse para controlar câmera
document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== setupGL.canvas) return;
    camera.rodar(e);
});

setupGL.canvas.addEventListener("wheel",(e) => {
    camera.zoom(e);
    setupGL.updateProjection(window)
},{ passive: false });

window.addEventListener("resize", () => setupGL.updateProjection(window));

async function main() {

    await setupGL.createProgram();
    setupGL.updateProjection(window);


    const controle = new Controle(setupGL, keys, camera);

    let deltaTime = 0;
    let antes = 0;
    let frames = 0;
    let segundos = 4;

    function render(time) {
        time *= 0.001;
        deltaTime = time - antes;
        if(deltaTime > 1) deltaTime =1;

        setupGL.normalizeSun();

        controle.tick(deltaTime);

        const speed = 0.01;

        const daytime = time * speed;
        //const daytime = Math.PI/2*3;
        
        setupGL.sunDirection = [
            Math.cos(daytime),
            Math.sin(daytime),
            0.0
        ];

        //setupGL.updateProjection(window);

        
        controle.sol.root.pos = [controle.player.pos[0],-1,controle.player.pos[2]];
        setupGL.setCamera(camera.pos, camera.getTarget(), camera.up);

        const lightMatrix = setupGL.computeLightMatrix();
        const identity = twgl.m4.identity()

        // 🔥 PASS 1 (shadow)
        setupGL.renderShadowPass((program, lightMatrix) => {
            setupGL.setUniforms(lightMatrix, daytime);
            controle.sol.oceano.draw(program, identity,lightMatrix,daytime);
            controle.terreno.draw(program, identity,lightMatrix,time);
            controle.root.draw(program, identity, lightMatrix, time);
        });

        // 🔥 PASS 2 (render normal)
        setupGL.renderScene((program) => {
            setupGL.setUniforms(lightMatrix, daytime);
            controle.terreno.draw(program, identity,lightMatrix,time);
            controle.root.draw(program, identity,lightMatrix,time);
            controle.sol.draw(program, identity,lightMatrix,daytime);
        });

        if(time > segundos){
            const fps = frames/(time - segundos + 4) | 0;
            log.innerHTML = `
                <div> FPS:    ${fps}
                </div>
                <div> ANGULO: ${controle.player.angulo | 0}
                </div>
                <div> POS: ${controle.player.pos[0] | 0} ${controle.player.pos[1] | 0} ${controle.player.pos[2] | 0}
                </div>
            `;
            frames = 0;
            segundos = time + 4;
        }

        antes = time;
        frames ++;
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();