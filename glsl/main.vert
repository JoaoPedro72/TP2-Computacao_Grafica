precision highp float;
precision highp int;

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

attribute vec3 a_instancePos; // posição da instância
attribute float a_instanceRot; // rotação Y da instância

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_lightMatrix;

uniform float u_time;
uniform int u_isWater;
uniform int u_isGrass;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_lightPos;
varying vec3 v_worldPos;
varying float v_wave;

float hash(vec2 p){
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
}

float smoothNoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0));
    float d = hash(i + vec2(1.0,1.0));

    vec2 u = f*f*(3.0-2.0*f);

    return mix(a,b,u.x) +
           (c-a)*u.y*(1.0-u.x) +
           (d-b)*u.x*u.y;
}

void main() {

    vec3 pos = a_position;   
    

    // Instancing para a grama e arvores
    float s = sin(a_instanceRot);
    float c = cos(a_instanceRot);
    pos.xz = mat2(c, s, -s, c) * pos.xz;
    
    pos += a_instancePos;
    // ONDA REAL (VERTEX)
    float wave = 0.0;

    vec4 worldPos = u_model * vec4(pos, 1.0);
    if(u_isWater == 1){

        float n = smoothNoise(worldPos.xz * 0.1);

        float amplitude = mix(0.15, 0.5, n);
        float freq = mix(0.2, 0.7, n);
        float phase = n * 6.28318;

        wave =
            sin(worldPos.x * freq + u_time + phase) +
            cos(worldPos.z * freq + u_time * 0.8 + phase);

        wave *= amplitude * 0.8;

        worldPos.y += wave;
    }

    v_wave = wave;

    if (u_isGrass == 1) {
        // 🌾 VENTO (só afeta grama — vértices altos balançam mais)
        float windStrength = 0.2;           // intensidade — aumente para vento mais forte
        float windSpeed    = 2.0;            // velocidade
        float windFreq     = 0.5;            // frequência espacial (ondas maiores ou menores)

        // pos.y aqui já é a altura LOCAL do vértice (0 = base, h = topo)
        // a_instancePos.y é a altura do terreno — não conta pro balanço
        float heightFactor = clamp(worldPos.y, 0.0, 1.0); // base = 0, topo = 1

        // Usar a posição da instância como fase para cada tufo balançar diferente
        float phase = a_instancePos.x * 0.3 + a_instancePos.z * 0.7;

        float windX = sin(u_time * windSpeed + phase * windFreq) * windStrength * heightFactor;
        float windZ = cos(u_time * windSpeed * 0.7 + phase * windFreq) * windStrength * 0.5 * heightFactor;

        pos.x += windX;
        pos.z += windZ;
    }

    

    v_worldPos = worldPos.xyz;

    // normal simples (ok para água leve)
    v_normal = mat3(u_model) * a_normal;

    v_uv = a_texcoord;

    v_lightPos = u_lightMatrix * worldPos;

    gl_Position = u_projection * u_view * worldPos;
}