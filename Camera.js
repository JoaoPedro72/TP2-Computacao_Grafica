import { Player } from "./logica/Player.js";
import { Utills } from "./Utills.js";
const utills = new Utills();

export class Camera {
    constructor(keys) {
        this.pos = [50, 30, -2];
        this.yaw = 90; //rotação horizontal em graus
        this.pitch = -35; //rotação vertical em graus
        this.roll = 0; // rotação lateral em graus
        this.keys = keys;
        this.speed = 0.2;
        this.sensitivity = 0.2;
        this.cameraMode = "locked";
        this.distancia = 20;
        this.lockPos = 5;
        this.cockpitYawOffset = 0;
        this.cockpitPitchOffset = 0;
        this.fov = 90; // campo de visão em graus
        this.up = [0,1,0];
        this.roll = 0;
    }
    rodar(e){
        if(this.cameraMode === "locked"){
          this.cameraMode = "orbit";
        } 
        else if(this.cameraMode === "cockpit"){
            this.cockpitYawOffset += e.movementX * this.sensitivity;
            this.cockpitPitchOffset -= e.movementY * this.sensitivity;
        } 
        else{
            this.yaw += e.movementX * this.sensitivity;
            this.pitch -= e.movementY * this.sensitivity;
        }
        // Limita o pitch para evitar flip
        this.pitch = Math.max(-89, Math.min(89, this.pitch));
    }
    zoom(e){
        if(!e.ctrlKey) return;

        e.preventDefault();

        this.fov += e.deltaY * 0.05;
        this.fov = Math.max(20,Math.min(100, this.fov));
    }
    
    updateLockPos(){
        if(this.keys[1]) {this.lockPos = 0; this.cameraMode = "locked";}
        if(this.keys[2]) {this.lockPos = 1; this.cameraMode = "locked";}
        if(this.keys[3]) {this.lockPos = 2; this.cameraMode = "locked";}
        if(this.keys[4]) {this.lockPos = 3; this.cameraMode = "locked";}
        if(this.keys[5]) {this.lockPos = 4; this.cameraMode = "locked";}
        if(this.keys[6]) {this.lockPos = 5; this.cameraMode = "locked";}
        if(this.keys[7]) {this.cameraMode = "cockpit";}
        if(this.keys.c) {this.cameraMode = "inAxis";}
    }
    updateCamera(player){
        this.updateLockPos();
        const playerPos = [player.pos[0],player.pos[1],player.pos[2]];
        const playerAngle = -player.angulo - 90;
        if(this.cameraMode !== "cockpit") this.up = [0,1,0];
        if(this.cameraMode === "free") this.moveFree();
        else if(this.cameraMode === "inAxis") this.moveInAxis();
        else if(this.cameraMode === "locked") this.locked(playerPos, playerAngle);
        else if(this.cameraMode === "orbit") this.orbit(playerPos);
        else if(this.cameraMode === "cockpit") this.cockpit(player);
    }
    orbit(pos){
        this.up = [0,1,0];
        const f = utills.normalize(utills.getFront(this.yaw, this.pitch));
        const r = utills.normalize(utills.cross(f,[0,1,0]));

        this.pos = pos;

        this.pos = this.pos.map((v,i)=>v-f[i]*this.distancia);
    }
    locked(pos, angle){
        this.up = [0,1,0];
        switch (this.lockPos) {
            case 0:
                this.pitch = -89;
                this.yaw = angle;
                break;
            case 1:
                this.pitch = 0;
                this.yaw = angle+180;
                break;
            case 2:
                this.pitch = 0;
                this.yaw = angle+90;
                break;
            case 3:
                this.pitch = 0;
                this.yaw = angle-90;
                break;
            case 4:
                this.pitch = 0;
                this.yaw = angle;
                break;
            case 5:
                this.pitch = -45;
                this.yaw = angle;
                break;
            default:
                this.pitch = 0;
                this.yaw = angle;
                break;
        }
        
        this.pos = pos;

        const f = utills.normalize(utills.getFront(this.yaw, this.pitch));
        const r = utills.normalize(utills.cross(f,[0,1,0]));

        this.pos = this.pos.map((v,i)=>v-f[i]*this.distancia);
    }
    moveFree(){
        const f = utills.normalize(utills.getFront(this.yaw, this.pitch));
        const r = utills.normalize(utills.cross(f,[0,1,0]));

        if(this.keys["w"]) this.pos = this.pos.map((v,i)=>v+f[i]*this.speed);
        if(this.keys["s"]) this.pos = this.pos.map((v,i)=>v-f[i]*this.speed);
        if(this.keys["a"]) this.pos = this.pos.map((v,i)=>v-r[i]*this.speed);
        if(this.keys["d"]) this.pos = this.pos.map((v,i)=>v+r[i]*this.speed);
    }
    moveInAxis(){
        if(this.keys["w"]) {
            this.pos[0] += this.speed * Math.cos(utills.radians(this.yaw));
            this.pos[2] += this.speed * Math.sin(utills.radians(this.yaw));
        }
        if(this.keys["s"]) {
            this.pos[0] -= this.speed * Math.cos(utills.radians(this.yaw));
            this.pos[2] -= this.speed * Math.sin(utills.radians(this.yaw));
        }
        if(this.keys["a"]) {
            this.pos[0] += this.speed * Math.cos(utills.radians(this.yaw - 90));
            this.pos[2] += this.speed * Math.sin(utills.radians(this.yaw - 90));
        }
        if(this.keys["d"]) {
            this.pos[0] += this.speed * Math.cos(utills.radians(this.yaw + 90));
            this.pos[2] += this.speed * Math.sin(utills.radians(this.yaw + 90));
        }

        if(this.keys[" "]) this.pos[1] += this.speed;
        if(this.keys["shift"]) this.pos[1] -= this.speed;
    }

    cockpit(player){

        if(this.keys["arrowleft"]) this.cockpitYawOffset -= 1;
        if(this.keys["arrowright"]) this.cockpitYawOffset += 1;
        if(this.keys["arrowup"]) this.cockpitPitchOffset += 1;
        if(this.keys["arrowdown"]) this.cockpitPitchOffset -= 1;

        this.cockpitYawOffset = Math.max(-90,Math.min(90, this.cockpitYawOffset));
        this.cockpitPitchOffset = Math.max(-15,Math.min(15, this.cockpitPitchOffset));

        const playerYaw = -player.angulo - 90;
        const playerPitch = player.anguloFaixa[1] * (180 / Math.PI);
        const playerRoll = -player.anguloFaixa[0] * (180 / Math.PI);

        // OFFSETS DA CAMERA NO REFERENCIAL DO AVIÃO
        const frontOffset = -0.1;
        const heightOffset = 0.8;

        const front = utills.normalize(utills.getFront(playerYaw, playerPitch));
        const right = utills.normalize(utills.cross([0,1,0], front));
        const up = utills.normalize(utills.cross(front, right));

        
        const c = Math.cos(playerRoll* Math.PI/180);
        const s = Math.sin(playerRoll* Math.PI/180);

        const rolledUp = up.map((v, i) => v*c + right[i]*s);
        this.up = rolledUp;

        this.pos = player.pos.map((p, i) => p + front[i]*frontOffset + rolledUp[i]*heightOffset);
        

        this.yaw = playerYaw + this.cockpitYawOffset;
        this.pitch = playerPitch + this.cockpitPitchOffset;
        this.roll = playerRoll;

        console.log(playerYaw, playerPitch, playerRoll);
        console.log(player.pos.map((v, i) => v - this.pos[i]));
    }

    getFront(){
        return utills.normalize(
            utills.getFront(this.yaw, this.pitch)
        );
    }
    getTarget(){
        const f = this.getFront();
        return this.pos.map((v,i)=>v+f[i]);
    }
    itsOnCamera(posObjeto) {
        // vetor câmera -> objeto
        let dx = posObjeto[0] - this.pos[0];
        let dy = posObjeto[1] - this.pos[1];
        let dz = posObjeto[2] - this.pos[2];

        // normaliza vetor até objeto
        const len = Math.hypot(dx, dy, dz);

        if (len === 0) return true;

        dx /= len;
        dy /= len;
        dz /= len;

        // direção da câmera
        const yaw = utills.radians(this.yaw);
        const pitch = utills.radians(this.pitch);

        const forwardX = Math.cos(pitch) * Math.cos(yaw);
        const forwardY = Math.sin(pitch);
        const forwardZ = Math.cos(pitch) * Math.sin(yaw);

        // produto escalar
        const dot =
            dx * forwardX +
            dy * forwardY +
            dz * forwardZ;

        // FOV
        // cos(90°) = 0
        // 180° total de visão
        return dot > 0;
    }
}