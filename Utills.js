export class Utills {
    constructor() {}

    radians(deg) {
        return deg * Math.PI/180;
    }

    /**
     * Normaliza um vetor
     * @param {number[]} v Vetor
     * @returns {number[]} Vetor normalizado
     */
    normalize(v) {
        const len = Math.hypot(...v);
        if (len === 0) return v.slice();
        return v.map(x => x / len);
    }

    /**
     * Produto vetorial entre dois vetores
     * @param {number[]} a Vetor A
     * @param {number[]} b Vetor B
     * @returns {number[]} Vetor resultante
     */
    cross(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0],
        ];
    }

    /**
     * Calcula o vetor frontal da câmera baseado em yaw e pitch
     * @returns {number[]} Vetor direção
     */
    getFront(yaw, pitch) {
        const ry = yaw * Math.PI/180;
        const rp = pitch * Math.PI/180;
        return [
            Math.cos(ry)*Math.cos(rp),
            Math.sin(rp),
            Math.sin(ry)*Math.cos(rp),
        ];
    }

    /**
     * Cria matriz de visualização (view matrix)
     * @param {number[]} eye Posição da câmera
     * @param {number[]} center Ponto alvo
     * @param {number[]} up Vetor up
     * @returns {Float32Array}
     */
    lookAt(eye, center, up) {
        const z = this.normalize(eye.map((v,i)=>v-center[i]));
        const x = this.normalize(this.cross(up, z));
        const y = this.cross(z, x);

        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -x[0]*eye[0]-x[1]*eye[1]-x[2]*eye[2],
            -y[0]*eye[0]-y[1]*eye[1]-y[2]*eye[2],
            -z[0]*eye[0]-z[1]*eye[1]-z[2]*eye[2],
            1
        ]);
    }

    /**
     * Cria matriz de projeção perspectiva
     * @param {number} fov Campo de visão (radianos)
     * @param {number} aspect Aspect ratio
     * @param {number} near Plano próximo
     * @param {number} far Plano distante
     * @returns {Float32Array}
     */
    perspective(fov, aspect, near, far) {
        const f = 1 / Math.tan(fov/2);
        const r = 1/(near-far);
        return new Float32Array([
            f/aspect,0,0,0,
            0,f,0,0,
            0,0,(near+far)*r,-1,
            0,0,2*near*far*r,0
        ]);
    }

    rotateVec3(v, rot) {
        const cx = Math.cos(rot.x);
        const sx = Math.sin(rot.x);
        const cy = Math.cos(rot.y);
        const sy = Math.sin(rot.y);
        const cz = Math.cos(rot.z);
        const sz = Math.sin(rot.z);

        // Rotação ZYX (ordem comum)
        let x = v.x;
        let y = v.y;
        let z = v.z;

        // Rot Z
        let x1 = x * cz - y * sz;
        let y1 = x * sz + y * cz;
        let z1 = z;

        // Rot Y
        let x2 = x1 * cy + z1 * sy;
        let y2 = y1;
        let z2 = -x1 * sy + z1 * cy;

        // Rot X
        let x3 = x2;
        let y3 = y2 * cx - z2 * sx;
        let z3 = y2 * sx + z2 * cx;

        return { x: x3, y: y3, z: z3 };
    }

    menorAngulo(a, b) {
        let diff = b - a;
        return Math.atan2(Math.sin(diff), Math.cos(diff));
    }
}