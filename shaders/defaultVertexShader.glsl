#version 300 es

in vec3 vPosition;
in vec3 vNormal;
out vec4 shadow;

uniform vec3 light_pos;
uniform vec4 diffuse;

uniform mat4 transformMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main(){
    vec4 pos = modelViewMatrix * transformMatrix * vec4(vPosition, 1.0);

    vec4 ambient = vec4(0.3, 0.3, 0.3, 1.0);
	// N = (MVM^-1)T * (normal + normalMap)
	vec3 N = normalize(mat3(transpose(inverse(modelViewMatrix * transformMatrix))) * vNormal);
    vec3 L = normalize((modelViewMatrix * vec4(light_pos, 1.0)).xyz - pos.xyz);

	shadow = (ambient + max(dot(L, N), 0.0) * diffuse);
	shadow.a = 1.0;

    gl_Position = projectionMatrix * pos;
}