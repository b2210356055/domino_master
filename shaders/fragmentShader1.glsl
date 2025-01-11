#version 300 es
precision mediump float;

const int light_count = 4;

in vec4 pos;
in vec3 fNormal;
in vec2 v_texCoord;

in vec3 light[light_count];
in vec3 light_dir[light_count];
in float cutoff[light_count];

in mat4 MVM_it;

uniform vec4 ambientProduct;
uniform vec4 diffuseProduct[light_count];
uniform vec4 specularProduct[light_count];
uniform float shininess;
out vec4 outColor;

uniform sampler2D uNormalMap;
uniform sampler2D uTexture;

void main()
{
	vec4 ambient = ambientProduct;
	vec4 diffuse = vec4(0,0,0,1);
	vec4 specular= vec4(0,0,0,1);

	vec3 E = normalize(-pos.xyz);
	// N = (MVM^-1)T * (normal + normalMap)
	vec3 N = normalize(mat3(MVM_it) * (fNormal + normalize(texture(uNormalMap, v_texCoord).rgb*2.0 - 1.0)));
	
	for (int i = 0; i < light_count; i++){
		vec3 L = normalize(light[i] - pos.xyz);
		vec3 H = normalize(L + E);

		float Kd = max(dot(L, N), 0.0);
		vec4 diffuse_i = Kd * diffuseProduct[i];

		float Ks = pow(max(dot(N, H), 0.0), shininess);
		vec4 specular_i = Ks * specularProduct[i];
		

		float spotEffect = dot(L, light_dir[i]); // Cosine of the angle between L and light_dir
		float cos_value = cos(cutoff[i]);

        if (cutoff[i] <= 0.0) {
            // For point light, no spotlight effect: just distance-based falloff
            diffuse_i *= 1.0;
            specular_i *= 1.0;
        }
		else if (spotEffect > cos_value) {
			// Apply smooth falloff for spotlight
            float spotFactor = smoothstep(cos_value - 0.1, cos_value, spotEffect); 
            diffuse_i *= spotFactor;
            specular_i *= spotFactor;
        }
		else {
			// out of cone
			diffuse_i *= 0.0;
			specular_i *= 0.0;
		}

		if(dot(L, N) < 0.0) {
			specular_i = vec4(0.0, 0.0, 0.0, 1.0);
		}

		diffuse += diffuse_i;
		specular += specular_i;
	}


	vec4 shadow = (ambient + diffuse + specular);
	if(shadow.r>1.0) { shadow.r=1.0; }
	else if(shadow.r<0.0) { shadow.r=0.0; }

	if(shadow.g>1.0) { shadow.g=1.0; }
	else if(shadow.g<0.0) { shadow.g=0.0; }

    if(shadow.b>1.0) { shadow.b=1.0; }
	else if(shadow.b<0.0) { shadow.b=0.0; }

	shadow.a = 1.0;

	outColor = texture(uTexture, v_texCoord) * shadow;
	// outColor = shadow;
	// outColor = texture(uTexture, v_texCoord);
}