import { Utills } from "./Utills.js";
const utills = new Utills();

export class Camera {
    constructor(keys) {
        this.pos = [0, 2, -5];
        this.yaw = 0; //rotação horizontal
        this.pitch = -35; //rotação vertical
        this.keys = keys;
        this.speed = 0.2;
        this.sensitivity = 0.2;
        this.cameraMode = "inAxis";
    }
    rodar(e){
        this.yaw += e.movementX * this.sensitivity;
        this.pitch -= e.movementY * this.sensitivity;

        // Limita o pitch para evitar flip
        this.pitch = Math.max(-89, Math.min(89, this.pitch));
    }
    updateCamera(){
        if(this.cameraMode === "free") this.moveFree();
        else if(this.cameraMode === "inAxis") this.moveInAxis();
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