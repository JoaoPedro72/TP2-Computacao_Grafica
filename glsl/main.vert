attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
uniform mat4 u_lightMatrix;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_lightPos;
varying vec3 v_worldPos;

void main() {
    vec4 world = u_model * vec4(a_position,1.0);

    v_worldPos = world.xyz;
    v_normal = mat3(u_model) * a_normal;
    v_uv = a_texcoord;

    v_lightPos = u_lightMatrix * world;

    gl_Position = u_projection * u_view * world;
}