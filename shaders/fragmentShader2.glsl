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

uniform vec4 uColor; 

float rimLighting(vec3 viewDir, vec3 normal) {
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    return pow(rim, 4.0);
}

vec4 cellShading(vec4 color, float intensity) {
    float levels = 3.0;
    float factor = floor(intensity * levels) / (levels - 1.0);
    return color * factor;
}

void main()
{
    vec3 normal = normalize(fNormal);
    vec3 viewDir = normalize(-pos.xyz);

    vec4 texColor = texture(uTexture, v_texCoord) * uColor;

    vec4 totalLight = ambientProduct;

    for (int i = 0; i < light_count; ++i) {
        vec3 L = normalize(light_dir[i]);
        vec3 reflectDir = reflect(-L, normal);

        float diffuse = max(dot(normal, L), 0.0);
        float specular = pow(max(dot(reflectDir, viewDir), 0.0), shininess);
        float theta = dot(normalize(light[i] - pos.xyz), -L);
        float spotlight = step(cutoff[i], theta);

        totalLight += (diffuseProduct[i] * diffuse + specularProduct[i] * specular) * spotlight;
    }

    float rim = rimLighting(viewDir, normal);
    totalLight += vec4(1.0, 1.0, 1.0, 1.0) * rim;

    // Checker pattern effect
    float checkSize = 10.0;
    vec2 gridPos = floor(gl_FragCoord.xy / checkSize);
    float checker = mod(gridPos.x + gridPos.y, 2.0);

    if (checker < 0.5) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0); // Black
    } else {
        outColor = cellShading(texColor * totalLight, length(totalLight.rgb));
    }
}