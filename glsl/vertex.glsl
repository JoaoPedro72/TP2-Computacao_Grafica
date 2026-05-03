attribute vec3 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

varying vec2 v_uv;
varying vec3 v_normal;

void main() {
    vec4 worldPos = u_model * vec4(a_position, 1.0);

    v_uv = a_texcoord;
    v_normal = mat3(u_model) * a_normal;

    gl_Position = u_projection * u_view * worldPos;
}