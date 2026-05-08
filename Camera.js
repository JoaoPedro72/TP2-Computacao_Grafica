import { Utills } from "./Utills.js";
const utills = new Utills();

export class Camera {
    constructor(keys) {
        this.pos = [50, 30, -2];
        this.yaw = 90; //rotação horizontal
        this.pitch = -35; //rotação vertical
        this.keys = keys;
        this.speed = 0.2;
        this.sensitivity = 0.2;
        this.cameraMode = "locked";
        this.distancia = 20;
        this.lockPos = 5;
    }
    rodar(e){
        if(this.cameraMode === "locked"){
        }else{
            this.yaw += e.movementX * this.sensitivity;
            this.pitch -= e.movementY * this.sensitivity;
        }
        // Limita o pitch para evitar flip
        this.pitch = Math.max(-89, Math.min(89, this.pitch));
    }
    updateLockPos(){
        if(this.keys[1]) {this.lockPos = 0; this.cameraMode = "locked";}
        if(this.keys[2]) {this.lockPos = 1; this.cameraMode = "locked";}
        if(this.keys[3]) {this.lockPos = 2; this.cameraMode = "locked";}
        if(this.keys[4]) {this.lockPos = 3; this.cameraMode = "locked";}
        if(this.keys[5]) {this.lockPos = 4; this.cameraMode = "locked";}
        if(this.keys[6]) {this.lockPos = 5; this.cameraMode = "locked";}
        if(this.keys.c) {this.cameraMode = "inAxis";}
    }
    updateCamera(player_pos, player_angle){
        this.updateLockPos();

        if(this.cameraMode === "free") this.moveFree();
        else if(this.cameraMode === "inAxis") this.moveInAxis();
        else if(this.cameraMode === "locked") this.locked(player_pos, player_angle);
    }
    locked(pos, angle){
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

    getFront(){
        return utills.normalize(
            utills.getFront(this.yaw, this.pitch)
        );
    }
    getTarget(){
        const f = this.getFront();
        return this.pos.map((v,i)=>v+f[i]);
    }
}