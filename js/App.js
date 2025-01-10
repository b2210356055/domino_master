//mousun engine.canvas icindeki konumu
let p_x = 0.0;
let p_y = 0.0;
let rotate_flag = false;
let drag_flag = false;
let p_x0 = 0.0;
let p_y0 = 0.0;
let delta_x;
let delta_y;

const engine = new Engine();
const world = new CANNON.World();
console.log("Cannon.js World Created:", world);

window.onload = async function init() {
    //mouse engine.canvasda hareket ettikce
    engine.canvas.onmousemove = function(event){
        const rect = engine.canvas.getBoundingClientRect();
        p_x = (event.clientX - rect.left - rect.width/2) / (rect.width/2);
        p_y = (event.clientY - rect.top - rect.height/2) / (rect.height/2);
    };


    document.addEventListener('keypress', function(event) {
        switch (event.key) {
            case 'W':
            case 'w':
                engine.camera.translateCameraFirstPerson(0, 0, 0.2);
                break;
            case 'S':
            case 's':
                engine.camera.translateCameraFirstPerson(0, 0, -0.2);
                break;
            case 'A':
            case 'a':
                engine.camera.translateCameraFirstPerson(-0.2, 0, 0);
                break;
            case 'D':
            case 'd':
                engine.camera.translateCameraFirstPerson(0.2, 0, 0);
                break;
            case 'E':
            case 'e':
                engine.camera.translateCameraFirstPerson(0, 0.2, 0);
                break;
            case 'Q':
            case 'q':
                engine.camera.translateCameraFirstPerson(0,-0.2, 0);
                break;
        }
    });

    document.addEventListener('mousedown', function(event) {
        if(event.button === 0){ //sol fare tusu
            if(drag_flag) return;
            p_x0 = p_x;
            p_y0 = p_y;
            rotate_flag = true;
        }
        else if(event.button === 2){ //sag fare tusu
            if(rotate_flag) return;
            p_x0 = p_x;
            p_y0 = p_y;
            drag_flag = true;
        }
    });

    document.addEventListener('mouseup', function(event) {
        delta_x = 0.0;
        delta_y = 0.0;
        p_x0 = 0.0;
        p_y0 = 0.0;
        if(event.button === 0){ //sol fare tusu
            // eye = rotation;
            rotate_flag = false;
        }
        else if(event.button === 2){ //sag fare tusu
            // eye = add(eye, translation);
            // at = add(at, translation);
            drag_flag = false;
        }
    });

    //sag tik context menuyu kapattik
    engine.canvas.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });

    //tekerin ileri geri yapmasina gore zoom in and out
    window.addEventListener('wheel', function(event) {
        engine.camera.translateCameraViewplane(0, 0, event.deltaY * 0.001)

        // Varsayılan kaydırma davranışını engellemek için
        event.preventDefault();
    }, { passive: false });


    window.onresize = function() {
        engine.canvas.height = window.innerHeight;
        engine.canvas.width = window.innerWidth;
        engine.gl.viewport( 0, 0, engine.canvas.width, engine.canvas.height );
        engine.camera.updateAspect( engine.canvas.width / engine.canvas.height);
    };
}


const render = function(){
    //mouse hareketlerine bak
    if(drag_flag){
        delta_x = p_x - p_x0;
        delta_y = p_y - p_y0;
        p_x0 = p_x;
        p_y0 = p_y;
        console.log(delta_x, delta_y);
        engine.camera.translateCameraViewplane(delta_x*4, delta_y*4, 0)
    }
    else if(rotate_flag){
        delta_x = p_x - p_x0;
        delta_y = p_y - p_y0;
        p_x0 = p_x;
        p_y0 = p_y;
        // console.log(delta_x, delta_y);
        let theta = delta_x * Math.PI/2.0;
        let phi = delta_y * Math.PI/2.0;

        engine.camera.rotateCamera(theta, phi);

    }

    engine.getMeshFromScene("uranus").addRotation(0, 0.02, 0);
    //engine.getMeshFromScene("bitki").addRotation(0, 0.02, 0);
    engine.drawScene();
    requestAnimFrame(render);
}

async function main() {
    engine.camera.setCameraPosition(0,0,-30);
    engine.camera.setLookAtPosition(0,0,0);

    //TODO: bu shader cok boktan, normaller duzgun calismiyor
    // bir de light sistemi getirmeliyiz
    const plantShaderFunction = function (mesh, _material, index, count){
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;
        let VBOs = mesh.VBO_container;

        //vertexler vec3
        GL.bindBuffer( GL.ARRAY_BUFFER, VBOs.vBuffer);
        GL.vertexAttribPointer( VBOs.vPositionLocation, 3, GL.FLOAT, false, 0, 0 );
        GL.enableVertexAttribArray( VBOs.vPositionLocation );

        //normaller vec3
        GL.bindBuffer(GL.ARRAY_BUFFER, VBOs.normal_buffer);
        GL.vertexAttribPointer(VBOs.normalLocation, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(VBOs.normalLocation);

        //texture cordinatlari vec2
        GL.bindBuffer( GL.ARRAY_BUFFER, VBOs.texBuffer);
        GL.vertexAttribPointer( VBOs.textCoordLocation, 2, GL.FLOAT, false, 0, 0 );
        GL.enableVertexAttribArray( VBOs.textCoordLocation );

        //TODO: buraya kopyala yapistir yaptim ayar cekilmeli
        // aslinda bir sikinti gozukmuyor ama
        // edit: calisiyor
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, VBOs.texture);
        //buralar bole mi olmali?????
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.texture);
        GL.generateMipmap(GL.TEXTURE_2D);

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, VBOs.normal_map_image);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.normalMap);
        GL.generateMipmap(GL.TEXTURE_2D);

        //TODO: buralar bozuk duzenle
        // light zimbirti sayilarini gotten salladik, ona bisey dusunmek lazim
        GL.uniform4fv(VBOs.ambientLocation,  new Float32Array(mult([..._material.Ka, 1.0], [0.1, 0.1, 0.1, 1.0] )));
        GL.uniform4fv(VBOs.diffuseLocation,  new Float32Array(mult([..._material.Kd, 1.0], [0.64, 0.64, 0.64, 1.0] )));
        GL.uniform4fv(VBOs.specularLocation, new Float32Array(mult([..._material.Ks, 1.0], [0.5, 0.5, 0.5, 1.0])));
        // GL.uniform4fv(VBOs.ambientLocation,  new Float32Array(mult([..._material.Ka, 1.0], lightAmbient )));
        // GL.uniform4fv(VBOs.diffuseLocation,  new Float32Array(mult([..._material.Kd, 1.0], lightDiffuse )));
        // GL.uniform4fv(VBOs.specularLocation, new Float32Array(mult([..._material.Ks, 1.0], lightSpecular)));
        GL.uniform1f(VBOs.shininessLocation, _material.Ns);
        GL.uniform4fv(VBOs.lightPositionLocation, new Float32Array([14,14,14,1]));

        GL.uniformMatrix4fv( VBOs.transformLocation, true, this.getActiveTransformMatrix() );
        GL.uniformMatrix4fv( VBOs.modelViewMatrixLoc, true, this.camera.getModelViewMatrix() );
        GL.uniformMatrix4fv( VBOs.projectionMatrixLoc, true, this.camera.getPerspectiveMatrix() );

        GL.drawArrays( GL.TRIANGLES, index, count);


        //TODO: buranin ariza cikaracagini dusunmuyorum ama duruma gore,
        // edit: cikarmadi tamamiz

        // GL.deleteBuffer(normal_buffer);
        // GL.deleteBuffer(vBuffer);
        // GL.deleteBuffer(texBuffer);
        // GL.deleteTexture(texture);
        // GL.deleteTexture(normal_map_image);

        GL.disableVertexAttribArray(VBOs.vPositionLocation);
        GL.disableVertexAttribArray(VBOs.normalLocation);
        GL.disableVertexAttribArray(VBOs.textCoordLocation);

    }.bind(engine);

    const plantShaderFunction_init = function (_faces, _normals, _texture_points, mesh){
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;

        let VBO = {
            vPositionLocation: GL.getAttribLocation( glProgram, "vPosition" ),
            normalLocation: GL.getAttribLocation( glProgram, "vNormal" ),
            textCoordLocation: GL.getAttribLocation( glProgram, "a_texCoord" ),

            textureLocation: GL.getUniformLocation( glProgram, "uTexture" ),
            normalMapLocation: GL.getUniformLocation( glProgram, "uNormalMap" ),

            modelViewMatrixLoc: GL.getUniformLocation( glProgram, "modelViewMatrix" ),
            projectionMatrixLoc: GL.getUniformLocation( glProgram, "projectionMatrix" ),
            transformLocation: GL.getUniformLocation( glProgram, "transform" ),
            lightPositionLocation: GL.getUniformLocation( glProgram, "lightPosition" ),
            shininessLocation: GL.getUniformLocation( glProgram, "shininess" ),
            ambientLocation: GL.getUniformLocation( glProgram, "ambientProduct" ),
            diffuseLocation: GL.getUniformLocation( glProgram, "diffuseProduct" ),
            specularLocation: GL.getUniformLocation( glProgram, "specularProduct" ),

            vBuffer: GL.createBuffer(),
            normal_buffer: GL.createBuffer(),
            texBuffer: GL.createBuffer(),
            texture: GL.createTexture(),
            normal_map_image: GL.createTexture(),
        };

        GL.bindBuffer(GL.ARRAY_BUFFER, VBO.vBuffer);
        GL.bufferData(GL.ARRAY_BUFFER, _faces, GL.STATIC_DRAW);

        GL.bindBuffer(GL.ARRAY_BUFFER, VBO.normal_buffer);
        GL.bufferData(GL.ARRAY_BUFFER, _normals, GL.STATIC_DRAW);

        GL.bindBuffer(GL.ARRAY_BUFFER, VBO.texBuffer);
        GL.bufferData(GL.ARRAY_BUFFER, _texture_points, GL.STATIC_DRAW);

        //TODO: buraya bak, texImage2D'yi normal fonksiyona bastik
        // edit: sanirim dogru yaptik calisiyor
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, VBO.texture);
        GL.uniform1i(VBO.textureLocation, 0);
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
        // GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.texture);

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, VBO.normal_map_image);
        GL.uniform1i(VBO.normalMapLocation, 1);
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
        // GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.normalMap);

        Object.assign(mesh.VBO_container, VBO);
    }.bind(engine);

    const defaultShaderFunction = function (mesh, _material, index, count) {
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;

        GL.bindBuffer(GL.ARRAY_BUFFER, mesh.VBO_container.vBuffer);
        GL.vertexAttribPointer(mesh.VBO_container.positionLocation, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(mesh.VBO_container.positionLocation);
        // console.log("Buffer size:", GL.getBufferParameter(GL.ARRAY_BUFFER, GL.BUFFER_SIZE));

        GL.uniformMatrix4fv(mesh.VBO_container.transformLocation, true, this.getActiveTransformMatrix());
        GL.uniformMatrix4fv(mesh.VBO_container.MVMLocation, true, this.camera.getModelViewMatrix());
        GL.uniformMatrix4fv(mesh.VBO_container.PMLocation, true, this.camera.getPerspectiveMatrix());
        GL.uniform4f(mesh.VBO_container.colorLocation, _material.r, _material.g, _material.b, _material.a);


        if (_material.wireframe) {
            GL.drawArrays(GL.LINES, index, count);
        } else {
            GL.drawArrays(GL.TRIANGLES, index, count);
        }

        GL.disableVertexAttribArray(mesh.VBO_container.vPositionLocation);
        // GL.disableVertexAttribArray(mesh.VBO_container.normalLocation);
        // GL.disableVertexAttribArray(mesh.VBO_container.textCoordLocation);
    }.bind(engine);

    const defaultShaderFunction_init = function (_faces, _normals, _texture_points, mesh) {
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;

        let VBO = {
            positionLocation: undefined,
            transformLocation: undefined,
            MVMLocation: undefined,
            PMLocation: undefined,
            colorLocation: undefined,
            vBuffer: undefined
        };

        VBO.positionLocation = GL.getAttribLocation(glProgram, "vPosition");
        VBO.transformLocation = GL.getUniformLocation(glProgram, "transformMatrix");
        VBO.MVMLocation = GL.getUniformLocation(glProgram, "modelViewMatrix");
        VBO.PMLocation = GL.getUniformLocation(glProgram, "projectionMatrix");
        VBO.colorLocation = GL.getUniformLocation(glProgram, "fColor");

        //vertexler vec3
        VBO.vBuffer = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, VBO.vBuffer);
        GL.bufferData(GL.ARRAY_BUFFER, _faces, GL.STATIC_DRAW);

        Object.assign(mesh.VBO_container, VBO);
    }.bind(engine);

    await engine.addShaders(
        "default",
        "./shaders/defaultVertexShader.glsl",
        "./shaders/defaultFragmentShader.glsl",
        defaultShaderFunction,
        defaultShaderFunction_init
    );
    
    await engine.addShaders(
        "deneme-shader1",
        "./shaders/vertexShader1.glsl",
        "./shaders/fragmentShader1.glsl",
        plantShaderFunction,
        plantShaderFunction_init
    );
    
    const sphere_data = generateSphere(13, 30, 30);

    const sphere_mat = {
        face_index: 0,
        mat_name: "uranus_mat",
        // shader_name: "default",

        r:1,g:1,b:1,a:1,
        wireframe:true,

        Ns:20,
        Ka:[1.0, 1.0, 1.0],
        Kd:[0.5, 0.5, 0.5],
        Ks:[0.3, 0.3, 0.3],
        texture_points: new Float32Array(sphere_data.uv),
        texture: await loadImage("./resources/textures/sand-dunes1_albedo.png"),
        normalMap: await loadImage("./resources/textures/sand-dunes1_normal-dx.png")
    }

    const planet = new Mesh("uranus", "default", sphere_data.faces, sphere_data.normals, sphere_data.uv, [sphere_mat]);

    //TODO: calisiyor ama hatali, oturup dusunmek lazim

    // planet.setTransform(
    //     [
    //         1,0,0,2,
    //         0,0,2,3,
    //         0,-2,0,4,
    //         0,0,0,1
    //     ]
    // );
    // planet.print();
    // // planet.setRotation(1.57,0,0);
    // // planet.updateTransform();
    // planet.setTranslate(0,0,1);
    // planet.setRotation(3.1412,0,0);
    // planet.print();

    engine.addMeshToScene(planet);

    const bitki_data = await loadOBJ("./resources/bitki.obj");
    const bitki_mesh = new Mesh("bitki", "deneme-shader1", bitki_data._faces, bitki_data._normals, bitki_data._texture_points, bitki_data._material_face_map);

    engine.addMeshToScene(bitki_mesh);
    bitki_mesh.addTranslate(0, 13, 0);

    render();
}


main();


