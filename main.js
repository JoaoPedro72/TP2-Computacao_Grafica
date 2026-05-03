import { SetupGL } from "./gl/SetupGL.js";
import { Camera } from "./Camera.js";
import { Modelo } from "./gl/Modelo.js";

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

    // 🔥 cria tronco (pai)
    const tronco = new Modelo({
        pos: [0, 0, 0],
        rot: [0, 0, 0],
        scale: [1, 1, 1],
        setupGL: setupGL
    });

    tronco.objUrl = "modelos/player/tronco.obj";
    await tronco.loadFromOBJ();

    // 🔥 cria braço (filho)
    const braco = new Modelo({
        pos: [-0.2, 0.5, 0], // posição relativa ao tronco
        rot: [0, 0, 0],
        scale: [1, 1, 1],
        setupGL: setupGL
    });

    braco.objUrl = "modelos/player/braco.obj";
    await braco.loadFromOBJ();

    // 🔥 opcional: pivô (ex: ombro)
    //braco.pivot = [0, 0, 0]; 
    // ajuste depois se precisar (ex: [0, -5, 0])

    // 🔥 conecta hierarquia
    tronco.add(braco);

    // 🔥 câmera
    const cameraPos = [0, 5, 30];

    function render(time) {
        time *= 0.001;

        setupGL.updateProjection(window);
        camera.updateCamera();
        setupGL.clearScreen(camera.pos,camera.getTarget());

        // 🔥 animação: braço girando
        braco.rot[2] = Math.sin(time * 2) * 1.0;

        // 🔥 desenha tudo
        tronco.draw();

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();