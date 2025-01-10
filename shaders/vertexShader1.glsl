#version 300 es
in vec3 vPosition;
in vec3 vNormal;
out vec3 fNormal;

in vec2 a_texCoord;
out vec2 v_texCoord;

out vec4 pos;
out vec3 light;
out mat4 MVM_it;

uniform mat4 transform;
uniform vec4 lightPosition;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main()
{
	pos = modelViewMatrix * transform * vec4(vPosition, 1.0);
	light = (modelViewMatrix * lightPosition).xyz;
	
	mat4 nt = mat4(transform);
	MVM_it = transpose(inverse(modelViewMatrix * transform));

	fNormal = normalize(mat3(MVM_it) * vNormal);;
	v_texCoord = a_texCoord;
	gl_Position = projectionMatrix * pos;
}