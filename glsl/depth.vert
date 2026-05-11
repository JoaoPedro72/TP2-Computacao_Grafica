attribute vec3 a_position;
attribute vec3 a_instancePos;
attribute float a_instanceRot;

uniform mat4 u_lightMatrix;
uniform mat4 u_model;
uniform int u_isInstanced;

void main() {
    vec3 pos = a_position;

    if (u_isInstanced == 1) {
        float s = sin(a_instanceRot);
        float c = cos(a_instanceRot);
        vec2 rotated = mat2(c, -s, s, c) * pos.xz;
        pos.xz = rotated;
        pos += a_instancePos;
    }

    gl_Position = u_lightMatrix * u_model * vec4(pos, 1.0);
}