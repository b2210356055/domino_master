#version 300 es
precision highp float;

uniform vec4 fColor;
out vec4 outColor;
in vec4 shadow;

void main(){
    outColor = fColor * shadow;
}