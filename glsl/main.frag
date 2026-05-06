precision mediump float;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_lightPos;
varying vec3 v_worldPos;

uniform sampler2D u_texture;
uniform int u_useTexture;

uniform sampler2D u_shadowMap;

uniform vec3 u_sunDirection;
uniform float u_sunStrength;

uniform vec3 u_pointLights[8];
uniform float u_pointStrength[8];
uniform int u_numPointLights;

uniform float u_emissive;
uniform int u_isEmissive;

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

    float bias = 0.005;

    return current - bias > closest ? 0.3 : 1.0;
}

void main() {

    vec3 normal = normalize(v_normal);

    //
    // 🎨 COR BASE (IMPORTANTE: guardar separado)
    //
    vec4 baseColor = (u_useTexture == 1)
        ? texture2D(u_texture, v_uv)
        : vec4(0.7,0.7,0.7,1.0);
    
    if (baseColor.a < 0.1) discard;
    //
    // 🌅 DIA / NOITE
    //
    float dayFactor = clamp(u_sunDirection.y * 0.5 + 0.5, 0.0, 1.0);

    //
    // ☀️ + 🔥 + 🌙 LUZ
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

    // 🌙 lua fake
    float moon = max(dot(normal, vec3(0.2,1.0,0.3)), 0.0) * 0.2;
    light += moon * (1.0 - dayFactor);

    //
    // 🌫️ AMBIENT
    //
    float ambient = mix(0.15, 0.4, dayFactor);

    //
    // 🌑 SOMBRA
    //
    float shadow = u_isEmissive == 1 ? 1.0 : getShadow();

    //
    // 💡 ILUMINAÇÃO APLICADA
    //
    vec3 litColor = baseColor.rgb;
    litColor *= ambient + light * shadow;

    //
    // 🌌 NOITE (afeta só iluminação)
    //
    vec3 nightColor = vec3(0.2, 0.3, 0.5);
    litColor = mix(nightColor * litColor, litColor, dayFactor);

    //
    // 🔥 EMISSIVO (TOTALMENTE INDEPENDENTE)
    //
    vec3 emissiveColor = baseColor.rgb * u_emissive;

    //
    // 🎯 FINAL
    //
    vec3 finalColor = litColor + emissiveColor;

    gl_FragColor = vec4(finalColor, baseColor.a);
}