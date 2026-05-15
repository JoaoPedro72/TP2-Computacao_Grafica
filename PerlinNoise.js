class Perlin {
    constructor(seed = 1) {
        this.p = new Uint8Array(512);
        this.permutation = new Uint8Array(256);

        // pseudo-random baseado na seed
        let random = this.mulberry32(seed);

        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }

        // shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [this.permutation[i], this.permutation[j]] =
            [this.permutation[j], this.permutation[i]];
        }

        for (let i = 0; i < 512; i++) {
            this.p[i] = this.permutation[i % 256];
        }
    }

    mulberry32(a) {
        return function () {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 3;
        return (h === 0 ? x : h === 1 ? -x : h === 2 ? y : -y);
    }

    noise(x, y) {
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        let u = this.fade(x);
        let v = this.fade(y);

        let A = this.p[X] + Y;
        let B = this.p[X + 1] + Y;

        return this.lerp(v,
            this.lerp(u, this.grad(this.p[A], x, y),
                      this.grad(this.p[B], x - 1, y)),
            this.lerp(u, this.grad(this.p[A + 1], x, y - 1),
                      this.grad(this.p[B + 1], x - 1, y - 1))
        );
    }
}

function octaveNoise(perlin, x, y, octaves = 4) {
    let total = 0;
    let freq = 1;
    let amp = 1;
    let max = 0;

    for (let i = 0; i < octaves; i++) {
        total += perlin.noise(x * freq, y * freq) * amp;
        max += amp;
        amp *= 0.5;
        freq *= 2;
    }

    return total / max;
}

/**
 * 
 * @param {{
 *      x_size: Number,
 *      y_size: Number,
 *      scale: Number,
 *      seed: Number,
 *      heightScale: Number,
 *      offsetX: Number,
 *      offsetY: Number
 * }} param 
 * @returns {Number[][]}
 */
export function generateGrid({
    x_size,
    y_size,
    scale = 20,
    seed = 1,
    heightScale = 1,
    offsetX = 0,
    offsetY = 0
    }) {
    const perlin = new Perlin(seed);
    const grid = [];

    for (let x = 0; x < x_size; x++) {
        let row = [];

        for (let y = 0; y < y_size; y++) {
            let nx = (x + offsetX) / scale;
            let ny = (y + offsetY) / scale;

            let value = octaveNoise(perlin, nx, ny, 4) * heightScale;
            row.push(value);
        }

        grid.push(row);
    }

  return grid;
}