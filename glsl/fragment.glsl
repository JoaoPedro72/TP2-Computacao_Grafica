precision mediump float;

varying vec2 v_uv;
varying vec3 v_normal;

uniform sampler2D u_texture;
uniform int u_useTexture;

uniform vec3 u_lightDirections[8];
uniform float u_lightStrengths[8];
uniform int u_numLights;

void main() {
    vec3 normal = normalize(v_normal);

    float lightAccum = 0.0;

    for (int i = 0; i < 8; i++) {
        if (i >= u_numLights) break;

        vec3 lightDir = normalize(u_lightDirections[i]);
        float diff = max(dot(normal, lightDir), 0.0);
        lightAccum += diff * u_lightStrengths[i];
    }

    vec4 color;

    if (u_useTexture == 1) {
        color = texture2D(u_texture, v_uv);
    } else {
        color = vec4(0.7, 0.7, 0.7, 1.0);
    }

    // 🔥 transparência real
    if (color.a < 0.1) discard;

    color.rgb *= lightAccum;

    gl_FragColor = color;
}