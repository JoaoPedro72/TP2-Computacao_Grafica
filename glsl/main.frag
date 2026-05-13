precision highp float;
precision highp int;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_lightPos;
varying vec3 v_worldPos;

uniform sampler2D u_texture;
uniform sampler2D u_shadowMap;

uniform int u_useTexture;
uniform int u_isWater;
varying float v_wave;

uniform float u_time;
uniform float u_emissive;

uniform int u_lighting;

// ☀️ sol
uniform vec3 u_sunDirection;
uniform float u_sunStrength;

// 🔥 tochas
uniform vec3 u_pointLights[8];
uniform float u_pointStrength[8];
uniform int u_numPointLights;

// 📷 câmera (NOVO)
uniform vec3 u_cameraPos;

// ✨ controle specular (NOVO)
uniform float u_specularStrength;
uniform float u_shininess;

//
// 🌑 SHADOW MAP
//
float getShadow() {
    vec3 proj = v_lightPos.xyz / v_lightPos.w;
    proj = proj * 0.5 + 0.5;

    if(proj.x < 0.0 || proj.x > 1.0 ||
        proj.y < 0.0 || proj.y > 1.0 ||
        proj.z < 0.0 || proj.z > 1.0) {
        return 1.0;
    }

    float closest = texture2D(u_shadowMap, proj.xy).r;
    float current = proj.z;

    float bias = 0.005;

    return current - bias > closest ? 0.3 : 1.0;
}

void main() {

    vec3 normal = normalize(v_normal);


    // 🎨 TEXTURA

    vec4 color = (u_useTexture == 1)
        ? texture2D(u_texture, v_uv)
        : vec4(0.7,0.7,0.7,1.0);


    

    // 🔥 EMISSIVO (não escurece)
    if(u_emissive > 0.0){
        gl_FragColor = color;
        return;
    }

    // 📷 direção da câmera
    vec3 viewDir = normalize(u_cameraPos - v_worldPos);

    // 🌅 DIA / NOITE
    float dayFactor = clamp(u_sunDirection.y * 0.5 + 0.5, 0.0, 1.0);

    float light = 0.0;
    float specular = 0.0;

    // ☀️ SOL
    vec3 sunDir = normalize(u_sunDirection);

    float diffSun = max(dot(normal, sunDir), 0.0);
    light += diffSun * u_sunStrength * dayFactor;

    // ✨ specular sol (Blinn-Phong)
    vec3 halfDirSun = normalize(sunDir + viewDir);
    float specSun = pow(max(dot(normal, halfDirSun), 0.0), u_shininess);
    specular += specSun * u_specularStrength * dayFactor;

    // 🔥 TOCHAS
    for(int i=0;i<8;i++){
        if(i>=u_numPointLights) break;

        vec3 dir = u_pointLights[i] - v_worldPos;
        float dist = length(dir);
        dir = normalize(dir);

        float diff = max(dot(normal, dir), 0.0);
        float att = 1.0/(1.0 + 0.2*dist + 0.05*dist*dist);

        light += diff * att * u_pointStrength[i];

        // ✨ specular tochas
        vec3 halfDir = normalize(dir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), u_shininess);
        specular += spec * att * u_specularStrength;
    }

    // 🌙 LUA
    float moon = max(dot(normal, vec3(0.2,1.0,0.3)), 0.0) * 0.2;
    light += moon * (1.0 - dayFactor);

    // 🌫️ AMBIENT
    float ambient = mix(0.2, 0.45, dayFactor);

    // 🌑 SOMBRA
    float shadow = getShadow();

    float lighting = ambient + light * shadow;

    // 🌊 ÁGUA
    if(u_isWater == 1){
        float waveNorm = v_wave * 0.5 + 0.5;

        float foam = smoothstep(0.6, 1.0, waveNorm);
        float dark = smoothstep(0.0, 0.4, waveNorm);

        color.rgb += foam * 0.4 * lighting;
        color.rgb *= 1.0 - dark * 0.4;
    }

    if (u_lighting == 1) {
        color.rgb *= lighting;
        // ✨ adiciona specular
        color.rgb += specular;
        // 🌌 NOITE
        vec3 nightColor = vec3(0.2, 0.3, 0.5);
        color.rgb = mix(nightColor * color.rgb, color.rgb, dayFactor);
    }
    
    gl_FragColor = color;
}