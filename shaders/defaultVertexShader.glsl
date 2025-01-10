#version 300 es

in vec3 vPosition;

uniform mat4 transformMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main(){
    gl_Position = projectionMatrix * modelViewMatrix * transformMatrix * vec4(vPosition, 1.0);
}