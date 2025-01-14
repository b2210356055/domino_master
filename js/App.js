//mousun engine.canvas icindeki konumu
let p_x = 0.0;
let p_y = 0.0;
let rotate_flag = false;
let drag_flag = false;
let p_x0 = 0.0;
let p_y0 = 0.0;
let delta_x;
let delta_y;

let move_fw = false;
let move_bw = false;
let move_rw = false;
let move_lw = false;
let move_uw = false;
let move_dw = false;
let speed = 0.0;
const speed_max = 0.15;
const speed_step = 0.015;


const engine = new Engine();
const world = new CANNON.World();
const bodyMap = new Map();
const meshMap = new Map();

// Convert quaternion to Euler angles
function quaternionToEuler(q) {
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch = Math.abs(sinp) >= 1 ? 
        Math.copySign(Math.PI / 2, sinp) : Math.asin(sinp);

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return { x: roll, y: pitch, z: yaw };
}

async function createDomino(dominoName = "1", path = "./resources/domino1.obj", shader = "deneme-shader1" , initPoint = {x:0,y:10,z:0}, 
                            mass = 1 ) {

        /////////////////// DOMINO INIT ////////////////////
        let domino_data = await loadOBJ(path);
        let domino_mesh = new Mesh(dominoName, shader,
                            domino_data._faces,
                            domino_data._normals,
                            domino_data._texture_points,
                            domino_data._material_face_map);
    
        // Create a box shape (length, width, height)
        let dims = domino_mesh.getDimensions();

        let boxShape = new CANNON.Box(new CANNON.Vec3(
        dims[0]/2, dims[1]/2, dims[2]/2
        ));
    
        // Create a body with mass and position
        let domino_body = new CANNON.Body({
            mass: mass,  // Mass of the box in kg
            position: new CANNON.Vec3(initPoint.x, initPoint.y, initPoint.z), // Starting position in the world
            material: new CANNON.Material({
                friction: 0.5,
                restitution: 0.3 // Bounce factor
            })
        });
    
        // Add the shape to the body
        domino_body.addShape(boxShape);
    
        bodyMap.set(dominoName +"_body", domino_body);
        meshMap.set(dominoName , domino_mesh);

        return {"mesh": domino_mesh,"body": domino_body}

}



world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10; // Increase solver iterations for better stability
world.allowSleep = false; // Keep objects active for better collision detection

window.onload = async function init() {
    //mouse engine.canvasda hareket ettikce
    engine.canvas.onmousemove = function(event){
        const rect = engine.canvas.getBoundingClientRect();
        p_x = (event.clientX - rect.left - rect.width/2) / (rect.width/2);
        p_y = (event.clientY - rect.top - rect.height/2) / (rect.height/2);
    };


    document.addEventListener('keydown', function(event) {
        switch (event.key) {
            case 'W':
            case 'w':
                move_fw = true;
                // engine.camera.translateCameraFirstPerson(0, 0, 0.2);
                break;
            case 'S':
            case 's':
                move_bw = true;
                // engine.camera.translateCameraFirstPerson(0, 0, -0.2);
                break;
            case 'A':
            case 'a':
                move_lw = true;
                // engine.camera.translateCameraFirstPerson(-0.2, 0, 0);
                break;
            case 'D':
            case 'd':
                move_rw = true;
                // engine.camera.translateCameraFirstPerson(0.2, 0, 0);
                break;
            case 'E':
            case 'e':
                move_uw = true;
                // engine.camera.translateCameraFirstPerson(0, 0.2, 0);
                break;
            case 'Q':
            case 'q':
                move_dw = true;
                // engine.camera.translateCameraFirstPerson(0,-0.2, 0);
                break;
        }
    });
    document.addEventListener('keyup', function(event) {
        switch (event.key) {
            case 'W':
            case 'w':
                move_fw = false;
                speed = 0.0;
                break;
            case 'S':
            case 's':
                move_bw = false;
                speed = 0.0;
                break;
            case 'A':
            case 'a':
                move_lw = false;
                speed = 0.0;
                break;
            case 'D':
            case 'd':
                move_rw = false;
                speed = 0.0;
                break;
            case 'E':
            case 'e':
                move_uw = false;
                speed = 0.0;
                break;
            case 'Q':
            case 'q':
                move_dw = false;
                speed = 0.0;
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
        // console.log(delta_x, delta_y);
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
    if(move_fw){
        speed = Math.min(speed+speed_step, speed_max);
        engine.camera.translateCameraFirstPerson(0, 0, speed);
    }else if(move_bw){
        speed = Math.min(speed+speed_step, speed_max);
        engine.camera.translateCameraFirstPerson(0, 0, -speed);    
    }
    if(move_rw){
        speed = Math.min(speed+speed_step, speed_max);
        engine.camera.translateCameraFirstPerson(speed, 0, 0);
    }else if(move_lw){
        speed = Math.min(speed+speed_step, speed_max);
        engine.camera.translateCameraFirstPerson(-speed, 0, 0);    
    }
    if(move_uw){
        speed = Math.min(speed+speed_step, speed_max);
        engine.camera.translateCameraFirstPerson(0,speed, 0);
    }else if(move_dw){
        speed = Math.min(speed+speed_step, speed_max);
        engine.camera.translateCameraFirstPerson(0,-speed, 0);    
    }
    
    /*
    engine.getMeshFromScene("domino1").addRotation(0, 0.02, 0);
    engine.getMeshFromScene("domino2").addRotation(0, 0.02, 0);
    engine.getMeshFromScene("domino3").addRotation(0, -0.02, 0);
    */
    // engine.getMeshFromScene("bitki").addRotation(0, 0.02, 0);

    /*let body1 = bodyMap.get("domino1_body");
    let body2 = bodyMap.get("zemin_body");


    // engine.getMeshFromScene("zemin_mesh").setTranslate(body2.position.x, body2.position.y, body2.position.z);
    // engine.getMeshFromScene("zemin_mesh").setRotation(body2.quaternion.x, body2.quaternion.y, body2.quaternion.z);

    engine.getMeshFromScene("domino1").setTranslate(body1.position.x, body1.position.y, body1.position.z);
    // Then use it like this:
    const euler = quaternionToEuler(body1.quaternion);
    engine.getMeshFromScene("domino1").setRotation(euler.x, euler.y, euler.z);*/

    // Iterate through all bodies in the bodyMap
    for (let [key, body] of bodyMap) {
        // Get the mesh name by removing "_body" from the key
        const meshName = key.replace("_body", "");

        // Update position
        engine.getMeshFromScene(meshName).setTranslate(
            body.position.x,
            body.position.y,
            body.position.z
        );

        if(meshName != "zemin"){

        // Convert quaternion to euler and update rotation
        const euler = quaternionToEuler(body.quaternion);
        engine.getMeshFromScene(meshName).setRotation(
            euler.x,
            euler.y,
            euler.z
        );
        }

    }


    world.step(1.0 / 60.0);
    engine.drawScene();
    requestAnimFrame(render);
}

async function main() {
    engine.camera.setCameraPosition(0,-1,-20);
    engine.camera.setLookAtPosition(0,0,0);

    //TODO: bu shader cok boktan, normaller duzgun calismiyor
    // bir de light sistemi getirmeliyiz
    // light sistemi var ama spot light calismiyor.
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


        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, VBOs.texture);
        //buralar bole mi olmali?????
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.texture);
        GL.generateMipmap(GL.TEXTURE_2D);

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, VBOs.normal_map_image);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.normalMap);
        GL.generateMipmap(GL.TEXTURE_2D);

        //lightlari fora sokup her birinden kopyala yapistir
        const lc = 4;
        let lg = mesh.light_container.getAllLights();
        let ambient = [];
        let diffuses = [];
        let speculars = [];
        let light_positions = [];
        let target_positions = [];
        let cutoffs = [];

        for (let i = 0; i < lg.length; i++) {
            const light = lg[i];
            const lt = light.getType();
            if(lt === Light.AMBIENT){
                ambient.push(...mult([..._material.Ka, 1.0], [...light.getAmbient(), 1.0]));
            }
            else if(lt === Light.POINT){
                diffuses.push(...light.getDiffuse(), 1.0);
                speculars.push(...light.getSpecular(), 1.0);
                light_positions.push(...light.getPosition(), 1.0);
                target_positions.push(0,0,0,1);
                cutoffs.push(-1);
            }
            else if(lt === Light.SPOT){
                diffuses.push(...mult([..._material.Kd, 1.0], [...light.getDiffuse(), 1.0]));
                speculars.push(...mult([..._material.Ks, 1.0], [...light.getSpecular(), 1.0]));
                light_positions.push(...light.getPosition(), 1.0);
                target_positions.push(...light.getTarget(), 1.0);
                cutoffs.push(light.getCutoffAngle());
            }
        }
        while(diffuses.length < lc*4) {
            diffuses.push(0.0);
        }
        while(speculars.length < lc*4) {
            speculars.push(0.0);
        }
        while(light_positions.length < lc*4) {
            light_positions.push(0.0);
        }
        while(target_positions.length < lc*4) {
            target_positions.push(0.0);
        }
        while(cutoffs.length < lc) {
            cutoffs.push(-1.0);
        }

        GL.uniform4fv(VBOs.ambientLocation,  new Float32Array(ambient));
        GL.uniform4fv(VBOs.diffuseLocation,  new Float32Array(diffuses));
        GL.uniform4fv(VBOs.specularLocation, new Float32Array(speculars));
        GL.uniform1f(VBOs.shininessLocation, _material.Ns);
        GL.uniform4fv(VBOs.lightPositionLocation, new Float32Array(light_positions));
        GL.uniform4fv(VBOs.targetPositionLocation, new Float32Array(target_positions));
        GL.uniform1fv(VBOs.cutOffLocation, new Float32Array(cutoffs));

        GL.uniformMatrix4fv( VBOs.transformLocation, true, mesh.getTransform() );
        GL.uniformMatrix4fv( VBOs.modelViewMatrixLoc, true, this.camera.getModelViewMatrix() );
        GL.uniformMatrix4fv( VBOs.projectionMatrixLoc, true, this.camera.getPerspectiveMatrix() );

        GL.drawArrays( GL.TRIANGLES, index, count);


        //TODO: buranin ariza cikaracagini dusunmuyorum ama duruma gore,
        // edit: cikarmadi tamamiz


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
            
            // lightCountLocation: GL.getUniformLocation(glProgram, "light_count"),
            lightPositionLocation: GL.getUniformLocation( glProgram, "lightPosition" ),
            targetPositionLocation: GL.getUniformLocation( glProgram, "targetPosition" ),
            cutOffLocation: GL.getUniformLocation( glProgram, "u_cutoff" ),

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

        GL.bindBuffer(GL.ARRAY_BUFFER, mesh.VBO_container.nBuffer);
        GL.vertexAttribPointer(mesh.VBO_container.normalLocation, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(mesh.VBO_container.normalLocation);

        GL.uniform4f(mesh.VBO_container.diffuseLocation, 0, 0, 0, 1);
        GL.uniform3f(mesh.VBO_container.lightPositionLocation, 0, 0, 0);
        let l;
        for (let i = 0; i < mesh.light_container.getAllLights().length; i++) {
            l = mesh.light_container.getAllLights()[i];
            if(l.getType() === Light.POINT || l.getType() === Light.SPOT){
                GL.uniform4f(mesh.VBO_container.diffuseLocation, ...l.getDiffuse(), 1.0);
                GL.uniform3f(mesh.VBO_container.lightPositionLocation, ...l.getPosition());
                break;
            }
        }

        GL.uniformMatrix4fv(mesh.VBO_container.transformLocation, true, mesh.getTransform());
        GL.uniformMatrix4fv(mesh.VBO_container.MVMLocation, true, this.camera.getModelViewMatrix());
        GL.uniformMatrix4fv(mesh.VBO_container.PMLocation, true, this.camera.getPerspectiveMatrix());
        GL.uniform4f(mesh.VBO_container.colorLocation, _material.r, _material.g, _material.b, _material.a);

        if (_material.wireframe) {
            //GL.drawArrays(GL.LINES, index, count);
            GL.drawArrays(GL.TRIANGLES, index, count);// DELETE LATER
        } else {
            GL.drawArrays(GL.TRIANGLES, index, count);
        }

        GL.disableVertexAttribArray(mesh.VBO_container.positionLocation);
        GL.disableVertexAttribArray(mesh.VBO_container.normalLocation);
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
            vBuffer: undefined,

            normalLocation: undefined,
            nBuffer: undefined,
            lightPositionLocation: undefined,
            diffuseLocation: undefined
        };

        VBO.positionLocation  = GL.getAttribLocation(glProgram, "vPosition");
        VBO.transformLocation = GL.getUniformLocation(glProgram, "transformMatrix");
        VBO.MVMLocation       = GL.getUniformLocation(glProgram, "modelViewMatrix");
        VBO.PMLocation        = GL.getUniformLocation(glProgram, "projectionMatrix");
        VBO.colorLocation     = GL.getUniformLocation(glProgram, "fColor");


        VBO.normalLocation        = GL.getAttribLocation(glProgram, "vNormal");
        VBO.lightPositionLocation = GL.getUniformLocation(glProgram, "light_pos");
        VBO.diffuseLocation       = GL.getUniformLocation(glProgram, "diffuse");

        //vertexler vec3
        VBO.vBuffer = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, VBO.vBuffer);
        GL.bufferData(GL.ARRAY_BUFFER, _faces, GL.STATIC_DRAW);

        //normaller
        VBO.nBuffer = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, VBO.nBuffer);
        GL.bufferData(GL.ARRAY_BUFFER, _normals, GL.STATIC_DRAW);

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
    
    // const sphere_data = generateSphere(13, 30, 30);
    
    /*
    const sphere_mat = {
        face_index: 0,
        mat_name: "uranus_mat",

        r:1,g:1,b:1,a:1,
        wireframe:false,

        Ns:20,
        Ka:[1.0, 1.0, 1.0],
        Kd:[0.5, 0.5, 0.5],
        Ks:[0.3, 0.3, 0.3],
        texture_points: new Float32Array(sphere_data.uv),
        texture: await loadImage("./resources/textures/sand-dunes1_albedo.png"),
        normalMap: await loadImage("./resources/textures/sand-dunes1_normal-dx.png")
    }
    */

    // const planet = new Mesh("uranus", "default", sphere_data.faces, sphere_data.normals, sphere_data.uv, [sphere_mat]);

    // Create a world (gravity is set in the options)
    world.gravity.set(0, -9.82, 0); // Set gravity (in meters per second squared), e.g., Earth gravity
    world.broadphase = new CANNON.NaiveBroadphase();  // Default broadphase for collision detection
    world.solver = new CANNON.GSSolver;  // Default solver
    world.allowSleep = true;  // Allow objects to go to sleep when not moving

    // Load the ground mesh data for VISUAL representation only
    const zemin_data = await loadOBJ("./resources/ground.obj");
    const zemin_mesh = new Mesh("zemin", "default", zemin_data._faces, zemin_data._normals, zemin_data._texture_points, zemin_data._material_face_map);

    /////////////////// GROUND INIT ////////////////////
    // Create PHYSICS ground as a simple plane (no need for OBJ data)
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
        mass: 0,  // Mass of 0 makes it static
        position: new CANNON.Vec3(0, 0, 0),
        material: new CANNON.Material({
            friction: 0.2,
            restitution: 0.40
        }),
        type: CANNON.Body.STATIC
    });

    // Add the plane shape to the body
    groundBody.addShape(groundShape);

    // Rotate the ground plane to be horizontal
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)

    // Add to body map
    //bodyMap.set("zemin_body", groundBody);
    // Add to physics world 
    world.addBody(groundBody);

    // After creating the zemin_mesh, add a spot light
    let spotLight = new Light(Light.SPOT, "spot1");
    // Set spot light position
    spotLight.setPosition(0, 5, 0);  // Adjust position as needed
    // Set spot light target
    spotLight.setTarget(0, 0, 0);    // Where the light points to
    // Set light properties
    spotLight.setDiffuse(1, 1, 1);   // White light
    spotLight.setSpecular(1, 1, 1);
    // Set cutoff angle for the spotlight
    spotLight.setCutoffAngle(45);    // Adjust angle as needed

    // Add the spot light to the mesh
    zemin_mesh.light_container.addLight(spotLight);

    bodyMap.set("zemin" +"_body", groundBody);
    meshMap.set("zemin" , zemin_mesh);

    ////////////////// DOMINO func INIT ////////////////

    await createDomino( "1", "./resources/domino1.obj", "deneme-shader1" ,{x:0,y:5,z:0}, 1);
    await createDomino( "2", "./resources/domino1.obj", "deneme-shader1" ,{x:0,y:10,z:0}, 1);
    await createDomino( "3", "./resources/domino1.obj", "deneme-shader1" ,{x:2,y:10,z:2}, 1);

    console.log(bodyMap)
    console.log(meshMap)

    // Add the body to the world
    for (let [key, body] of bodyMap) {
        world.addBody(body);
    }

    let light1 = new Light(Light.AMBIENT, "ambient1");
    light1.setAmbient(0.6, 0, 0);

    for (let [key, mesh] of meshMap) {
        mesh.light_container.addLight(light1);
        engine.addMeshToScene(mesh);
    }

    render();
}

main();


