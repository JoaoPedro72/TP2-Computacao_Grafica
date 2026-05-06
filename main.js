import { SetupGL } from "./gl/SetupGL.js";
import { Camera } from "./Camera.js";

import { Modelo } from "./gl/Modelo.js";
import { PlayerModelo } from "./modelos/player.js";
import { SolModelo } from "./modelos/Sol.js";
import { AviaoModelo } from "./modelos/aviao.js";
import { Terreno } from "./modelos/Terreno.js";

import * as twgl from "./twgl.full.module.js";

let keys = {};
const setupGL = new SetupGL();
const camera = new Camera(keys);

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

    const sol = new SolModelo(setupGL);
    const aviao = new AviaoModelo(setupGL);
    const terreno = new Terreno(setupGL, [200, 200]);
    terreno.build();
    const modeloTerreno = new Modelo({setupGL: setupGL});

    modeloTerreno.meshes = terreno.meshes;
    modeloTerreno.textures = terreno.textures;

    function render(time) {
        time *= 0.001;
        setupGL.normalizeSun();

        const speed = 0.2;

        const angle = time * speed;

        setupGL.sunDirection = [
            Math.cos(angle),
            Math.sin(angle),
            0.3
        ];

        setupGL.updateProjection(window);

        camera.updateCamera();
        sol.root.pos = camera.pos;
        setupGL.setCamera(camera.pos, camera.getTarget());

        setupGL.computeLightMatrix();

        // 🔥 PASS 1 (shadow)
        setupGL.renderShadowPass((program, lightMatrix) => {
            modeloTerreno.draw(program, twgl.m4.identity(), lightMatrix);
            aviao.draw(program, twgl.m4.identity(),time, lightMatrix);
        });

        // 🔥 PASS 2 (render normal)
        setupGL.renderScene((program) => {
            modeloTerreno.draw(program, twgl.m4.identity());
            aviao.draw(program, twgl.m4.identity(),time);
            sol.draw(program, twgl.m4.identity(),time);
        });

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();