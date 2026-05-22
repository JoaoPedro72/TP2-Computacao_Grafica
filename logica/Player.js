import { AviaoModelo } from "../modelos/Aviao.js";
import { Utills } from "../Utills.js";
const utills = new Utills();

export class Player {
    constructor(pos = [], keys = {}, model = new AviaoModelo, terreno){
        this.pos = pos;
        this.keys = keys;
        this.angulo = 0;
        this.anguloFaixa = [0,0];
        this.velocidade = 4;
        this.velCurva = 12;
        this.model = model;
        this.controls = true;
        this.terreno = terreno;
        this.pitchTerreno = 0;
        this.hAtual = 0;
        this.hFrente = 0;
        this.hDist = 0;
    }
    tick(time){
        const front = utills.normalize(utills.getFront(this.angulo, this.anguloFaixa[1]*180/Math.PI));
        const frontDist = this.velocidade * time;
        const lookahead = this.pos.map((v,i)=>v + front[i]*frontDist);
        

        if(this.angulo > 180) this.angulo -= 360;
        if(this.angulo < -180) this.angulo += 360;

        this.hAtual = this.terreno.getAlturaNoMundo(this.pos[0],this.pos[2]);
        this.hFrente = this.terreno.getAlturaNoMundo(lookahead[0],lookahead[2]);

        const hAlvo = this.hFrente + 9;
        this.hDist = hAlvo - this.pos[1];

        if (this.hDist > 0.05){
            const pitchAlvo = Math.atan((this.hDist*time)/frontDist)
            const pitchDist = pitchAlvo - this.anguloFaixa[1];
            this.pos[1] += time * this.hDist;
            this.anguloFaixa[1] += time * pitchDist *1.5;
        } else {
            this.anguloFaixa[1] += (0 - this.anguloFaixa[1]) * time;
        }   

        this.move(time);
        this.faixaVirar(time);
        if(this.controls)this.imputs(time);
        this.model.root.rot[1] = utills.radians(this.angulo);
        this.model.setPos(this.pos);

    }
    imputs(time){
        if(this.keys.w && this.velocidade < 15){
            this.velocidade += time;
        }
        if(this.keys.s && this.velocidade > 1){
            this.velocidade -= time;
        }
        if(this.keys.a) {
            this.angulo += this.velCurva * time;
            this.anguloFaixa[0] -= 0.1 * time * this.velocidade/2;
            if(this.anguloFaixa[0] < -25) this.anguloFaixa[0] = -25;
        }
        if(this.keys.d) {
            this.angulo -= this.velCurva * time;
            this.anguloFaixa[0] += 0.1 * time * this.velocidade/2;
            if(this.anguloFaixa[0] > 25) this.anguloFaixa[0] = 25;
        }
        if(this.keys.c) {
            this.controls = false;
        }
        if(this.keys.shift && this.hDist < 0){
            this.pos[1] -= this.velocidade * time * 0.5;
            this.anguloFaixa[1] -= 0.05 * time * this.velocidade;
            if(this.anguloFaixa[1] < -10) this.anguloFaixa[1] = -10;
        }
        if(this.keys[" "] && this.pos[1] < 45){
            this.pos[1] += this.velocidade * time * 0.5;
            this.anguloFaixa[1] += 0.05 * time * this.velocidade;
            if(this.anguloFaixa[1] > 10) this.anguloFaixa[1] = 10;
        }
    }
    move(time){
        this.pos[0] -= this.velocidade * Math.sin(utills.radians(this.angulo)) * time;
        this.pos[2] -= this.velocidade * Math.cos(utills.radians(this.angulo)) * time;
    }
    faixaVirar(time){
        this.model.root.rot[2] = -this.anguloFaixa[0];

        this.model.root.rot[0] = this.anguloFaixa[1];
       

        this.model.faixa1.rot[2] = this.anguloFaixa[0];
        this.model.faixa1.rot[1] = Math.sin(time)/8 + this.anguloFaixa[0];
        this.model.faixa2.rot[1] = -Math.sin(time)/4 + this.anguloFaixa[0];
        this.model.faixa3.rot[1] = Math.sin(time)/4 + this.anguloFaixa[0];

        if(this.anguloFaixa[0] > 0) {
            this.anguloFaixa[0] -= time * this.anguloFaixa[0] * this.velocidade/4;
            if(this.anguloFaixa[0] < 0) this.anguloFaixa[0] = 0;
        }
        else if(this.anguloFaixa[0] < 0) {
            this.anguloFaixa[0] -= time * this.anguloFaixa[0] * this.velocidade/4;
            if(this.anguloFaixa[0] > 0) this.anguloFaixa[0] = 0;
        }
        if(this.anguloFaixa[1] > 0) {
            this.anguloFaixa[1] -= time * this.anguloFaixa[1] * this.velocidade/4;
            if(this.anguloFaixa[1] < 0) this.anguloFaixa[1] = 0;
        }
        else if(this.anguloFaixa[1] < 0) {
            this.anguloFaixa[1] -= time * this.anguloFaixa[1] * this.velocidade/4;
            if(this.anguloFaixa[1] > 0) this.anguloFaixa[1] = 0;
        }

        //console.log(this.anguloFaixa);
    }
}