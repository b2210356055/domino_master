#version 300 es
precision lowp float;

in vec3 fNormal;
in vec2 v_texCoord;
in vec4 pos;
in vec3 light;
out vec4 outColor;

in mat4 MVM_it;
uniform vec4 ambientProduct, diffuseProduct, specularProduct;
uniform float shininess;

uniform sampler2D uNormalMap;
uniform sampler2D uTexture;

void main()
{
	vec3 L = normalize(light - pos.xyz);
	vec3 E = normalize(-pos.xyz);
	vec3 H = normalize(L + E);
	// N = (MVM^-1)T * (normal + normalMap)
	vec3 N = normalize(mat3(MVM_it) * (fNormal + normalize(texture(uNormalMap, v_texCoord).rgb*2.0 - 1.0)));
	// vec3 N = normalize(mat3(MVM_it) * (fNormal));


	vec4 ambient = ambientProduct;
	float Kd = max(dot(L, N), 0.0);
	vec4 diffuse = Kd * diffuseProduct;
	float Ks = pow(max(dot(N, H), 0.0), shininess);
	vec4 specular = Ks * specularProduct;

	if(dot(L, N) < 0.0) {
		specular = vec4(0.0, 0.0, 0.0, 1.0);
	}

	vec4 shadow = (ambient + diffuse + specular);
	shadow.a = 1.0;


	outColor = texture(uTexture, v_texCoord) * shadow;
	// outColor = shadow;
}