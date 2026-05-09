import { SetupGL } from "./gl/SetupGL.js";
import { Camera } from "./Camera.js";

import { Controle } from "./logica/Controle.js";

import * as twgl from "./twgl.full.module.js";

let keys = {};
const camera = new Camera(keys);
const setupGL = new SetupGL(camera);

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

async function main() {

    await setupGL.createProgram();
    setupGL.updateProjection(window);

    const controle = new Controle(setupGL, keys, camera);

    let deltaTime = 0;
    let antes = 0;
    function render(time) {
        time *= 0.001;
        deltaTime = time - antes;
        if(deltaTime > 1) deltaTime =1;

        setupGL.normalizeSun();

        controle.tick(deltaTime);

        const speed = 0.01;

        const angle = time * speed;

        setupGL.sunDirection = [
            Math.cos(angle),
            Math.sin(angle),
            0.0
        ];

        setupGL.updateProjection(window);

        
        controle.sol.root.pos = camera.pos;
        setupGL.setCamera(camera.pos, camera.getTarget());

        const lightMatrix = setupGL.computeLightMatrix();

        // 🔥 PASS 1 (shadow)
        setupGL.renderShadowPass((program, lightMatrix) => {
            controle.terreno.draw(program, twgl.m4.identity(),lightMatrix,time);
            controle.root.draw(program, twgl.m4.identity(), lightMatrix, time);
        });

        // 🔥 PASS 2 (render normal)
        setupGL.renderScene((program) => {
            controle.terreno.draw(program, twgl.m4.identity(),lightMatrix,time);
            controle.sol.draw(program, twgl.m4.identity(),lightMatrix,time * speed);
            controle.root.draw(program, twgl.m4.identity(),lightMatrix,time);
        });

        antes = time;
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();