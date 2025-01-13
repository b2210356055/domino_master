#version 300 es

const int light_count = 4;

in vec3 vPosition;
out vec4 pos;

in vec3 vNormal;
out vec3 fNormal;
out mat4 MVM_it;

in vec2 a_texCoord;
out vec2 v_texCoord;


uniform mat4 transform;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec4 lightPosition[light_count];
uniform vec4 targetPosition[light_count];
uniform float u_cutoff[light_count];
out vec3 light[light_count];
out vec3 light_dir[light_count];
out float cutoff[light_count];

void main()
{
	pos = modelViewMatrix * transform * vec4(vPosition, 1.0);

	for (int i = 0; i < light_count; i++){
		light[i] = (modelViewMatrix * lightPosition[i]).xyz;
		if(u_cutoff[i] > 0.0){
			vec3 tar = (modelViewMatrix * targetPosition[i]).xyz;
			light_dir[i] = normalize(tar-light[i]);
		}
		else{
			light_dir[i] = vec3(0,0,0);
		}
	}
	cutoff = u_cutoff;

	MVM_it = transpose(inverse(modelViewMatrix * transform));

	fNormal = normalize(mat3(MVM_it) * vNormal);;
	v_texCoord = a_texCoord;
	gl_Position = projectionMatrix * pos;
}