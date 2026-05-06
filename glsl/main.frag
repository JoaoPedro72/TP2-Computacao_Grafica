precision mediump float;
precision mediump int;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_lightPos;
varying vec3 v_worldPos;
varying float v_wave;

uniform sampler2D u_texture;
uniform sampler2D u_shadowMap;

uniform int u_useTexture;
uniform int u_isWater;

uniform float u_time;
uniform float u_emissive;

// ☀️ sol
uniform vec3 u_sunDirection;
uniform float u_sunStrength;

// 🔥 tochas
uniform vec3 u_pointLights[8];
uniform float u_pointStrength[8];
uniform int u_numPointLights;

//
// 🌑 SHADOW MAP
//
float getShadow() {
    vec3 proj = v_lightPos.xyz / v_lightPos.w;
    proj = proj * 0.5 + 0.5;

    if(proj.x < 0.0 || proj.x > 1.0 ||
       proj.y < 0.0 || proj.y > 1.0) {
        return 1.0;
    }

    float closest = texture2D(u_shadowMap, proj.xy).r;
    float current = proj.z;

    float bias = 0.003;

    return current - bias > closest ? 0.3 : 1.0;
}

void main() {

    vec3 normal = normalize(v_normal);
    vec2 uv = v_uv;

    //
    // 🎨 TEXTURA BASE
    //
    vec4 color = (u_useTexture == 1)
        ? texture2D(u_texture, uv)
        : vec4(0.7,0.7,0.7,1.0);

    //
    // 🌊 ÁGUA (espuma + profundidade)
    //
    if(u_isWater == 1){

        float waveNorm = v_wave * 0.5 + 0.5;

        float foam = smoothstep(0.6, 1.0, waveNorm);
        float dark = smoothstep(0.0, 0.4, waveNorm);

        color.rgb += foam * 0.35;
        color.rgb *= 1.0 - dark * 0.25;
    }

    //
    // 🌅 DIA / NOITE
    //
    float dayFactor = clamp(u_sunDirection.y * 0.5 + 0.5, 0.0, 1.0);

    //
    // 💡 LUZ
    //
    float light = 0.0;

    // ☀️ sol
    float sun = max(dot(normal, normalize(u_sunDirection)), 0.0);
    light += sun * u_sunStrength * dayFactor;

    // 🔥 tochas
    for(int i=0;i<8;i++){
        if(i>=u_numPointLights) break;

        vec3 dir = u_pointLights[i] - v_worldPos;
        float dist = length(dir);
        dir = normalize(dir);

        float diff = max(dot(normal, dir), 0.0);
        float att = 1.0/(1.0 + 0.2*dist + 0.05*dist*dist);

        light += diff * att * u_pointStrength[i];
    }

    // 🌙 lua (leve)
    float moon = max(dot(normal, vec3(0.2,1.0,0.3)), 0.0) * 0.15;
    light += moon * (1.0 - dayFactor);

    //
    // 🌫️ AMBIENTE
    //
    float ambient = mix(0.25, 0.45, dayFactor);

    //
    // 🌑 SOMBRA
    //
    float shadow = getShadow();


    if(u_emissive > 0.0){

        // 🌟 emissivo puro (ignora luz)
        //color.rgb = color.rgb + vec3(u_emissive);

    } else {

        // 💡 iluminação normal
        float lighting = ambient + light * shadow;
        lighting = clamp(lighting, 0.0, 1.5);

        color.rgb *= lighting;

        // 🌌 noite
        vec3 nightColor = vec3(0.2, 0.3, 0.5);
        color.rgb = mix(nightColor * color.rgb, color.rgb, dayFactor);
    }

    gl_FragColor = color;
}