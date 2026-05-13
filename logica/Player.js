import { AviaoModelo } from "../modelos/Aviao.js";
import { Utills } from "../Utills.js";
const utills = new Utills();

export class Player {
    constructor(pos = [], keys = {}, model = new AviaoModelo){
        this.pos = pos;
        this.keys = keys;
        this.angulo = 0;
        this.anguloFaixa = [0,0];
        this.velocidade = 4;
        this.velCurva = (10 - this.velocidade)*2;
        this.model = model;
        this.controls = true;
    }
    tick(time){
        if(this.angulo > 180) this.angulo -= 360;
        if(this.angulo < -180) this.angulo += 360;
        
        this.move(time);
        this.faixaVirar(time);
        if(this.controls)this.imputs(time);

        this.model.root.rot[1] = utills.radians(this.angulo);
        this.model.setPos(this.pos);
    }
    imputs(time){
        if(this.keys.w && this.velocidade < 10){
            this.velocidade += time;
        }
        if(this.keys.s && this.velocidade > 1){
            this.velocidade -= time;
        }
        if(this.keys.a) {
            this.angulo += this.velCurva * time;
            this.anguloFaixa[0] -= 0.05 * time * this.velocidade/2;
            if(this.anguloFaixa[0] < -25) this.anguloFaixa[0] = -25;
        }
        if(this.keys.d) {
            this.angulo -= this.velCurva * time;
            this.anguloFaixa[0] += 0.05 * time * this.velocidade/2;
            if(this.anguloFaixa[0] > 25) this.anguloFaixa[0] = 25;
        }
        if(this.keys.c) {
            this.controls = false;
        }
        if(this.keys.shift && this.pos[1] > 15){
            this.pos[1] -= this.velocidade * time * 0.5;
            this.anguloFaixa[1] -= 0.05 * time * this.velocidade;
            if(this.anguloFaixa[1] < -10) this.anguloFaixa[1] = -10;
        }
        if(this.keys[" "] && this.pos[1] < 30){
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

        if(Math.abs(this.angulo) < 90) this.model.root.rot[0] = this.anguloFaixa[1];
        else this.model.root.rot[0] = -this.anguloFaixa[1];

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