import { Modelo } from "../gl/Modelo.js";
import { Utills } from "../Utills.js";

import { SolModelo } from "../modelos/Sol.js";
import { AviaoModelo } from "../modelos/Aviao.js";
import { Terreno } from "../modelos/Terreno.js";
import { Player } from "./Player.js";

import { ArvoreInstanced } from "../modelos/ArvoreInstanced.js";
import { SetupGL } from "../gl/SetupGL.js";
import { Camera } from "../Camera.js";

import { ControleSom } from "./ControleSom.js";

const utills = new Utills();

export class Controle {
    /**
     * @param {SetupGL} setupGL
     * @param {*}       keys
     * @param {Camera}  camera
     */
    constructor(setupGL, keys, camera){
        this.setupGL = setupGL;
        this.keys    = keys;
        this.camera  = camera;
        this.Rdist = 4

        this.lightingSwitch = false;

        // ── Nó raiz de cena (player, avião, etc.) ──
        this.root = new Modelo({ setupGL });

        // ── Sistemas ────────────────────────────────
        this.sol     = new SolModelo(setupGL,this.Rdist);
        this.aviao   = new AviaoModelo(setupGL);
        this.terreno = new Terreno(setupGL, [32, 32], this.Rdist);
        this.player  = new Player([50, 20, 50], keys, this.aviao, this.terreno);
        this.sons   = new ControleSom();

        // ── Árvores instanced ────────────────────────
        // Registradas no terreno — terreno.draw() as inclui automaticamente,
        // sem exigir nenhuma mudança no main.js.
        this.arvores = new ArvoreInstanced(setupGL);
        this.terreno.addDrawable(this.arvores);

        // Conecta árvores ao ciclo de vida dos chunks
        this.terreno.onChunkCarregado(chunk => {
            this.arvores.addChunk(chunk, this.terreno);
        });
        this.terreno.onChunkDescarregado(({ cx, cz }) => {
            this.arvores.removeChunk(cx, cz);
        });

        // ── Cena ────────────────────────────────────
        this.root.add(this.aviao);
        this.aviao.setPos(this.player.pos);        

        // Assets async em background
        this._initAsync();
    }

    async _initAsync(){
        // Carrega OBJ da árvore uma vez.
        // Chunks que chegam depois de build() terminar funcionam normalmente via callback.
        // Chunks que já estavam prontos durante o carregamento são recuperados abaixo.
        await this.arvores.build();

        for(const chunk of this.terreno.chunks.values()){
            if(chunk.estado === "ready"){
                this.arvores.addChunk(chunk, this.terreno);
            }
        }
    }

    // ──────────────────────────────────────────
    //  Loop principal
    // ──────────────────────────────────────────

    tick(time){
        this._keysCommands();
        this.sons.atualizar(this.player.velocidade);

        this.player.tick(time);

        // Itera entidades de todos os chunks ativos
        for(const chunk of this.terreno.chunks.values()){
            for(const entidade of chunk.entidades){
                entidade.tick(time);
            }
        }

        // Carrega/descarrega chunks conforme posição do jogador
        this.terreno.tick(this.player.pos[0], this.player.pos[2]);
        
        this.camera.updateCamera(this.player);

        if(this.camera.cameraMode === "orbit") this.player.controls = true;
    }

    // ──────────────────────────────────────────
    //  Comandos de teclado
    // ──────────────────────────────────────────

    _keysCommands(){
        if(this.keys.l && !this.lightingSwitch){
            this.lightingSwitch = true;
            this.setupGL.lightingEnabled = !this.setupGL.lightingEnabled;
        }
        if(!this.keys.l) this.lightingSwitch = false;
    }
}