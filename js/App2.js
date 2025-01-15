//mousun engine.canvas icindeki konumu
let p_x = 0.0;
let p_y = 0.0;
let rotate_flag = false;
let drag_flag = false;
let p_x0 = 0.0;
let p_y0 = 0.0;
let delta_x;
let delta_y;

let showHelp = false; // #updated: Added help state variable

let createDomino = false;
let dominoCounter = 4;
let static_domino_data;
let general_ambient = new Light(Light.AMBIENT, "general_ambient_light1");
general_ambient.setAmbient(1, 1, 1);
let shadow_domino;
let initial_domino;
let spnr;
let spinner_mesh;
let cycle=Math.PI/36;

const anim_frame_count = 150;
let current_anim_frame = 0;

let move_fw = false;
let move_bw = false;
let move_rw = false;
let move_lw = false;
let move_uw = false;
let move_dw = false;
let r_pressed = false;
let t_pressed = false;
let speed = 0.0;
const speed_max = 0.15;
const speed_step = 0.015;

const main_shader_names = ["deneme-shader1", "shader2"];
let current_shader_index = 0;

const engine = new Engine();
const world = new CANNON.World();
const bodyMap = new Map();
const meshMap = new Map();

// Add these variables at the top with other global variables
let currentScore = 1000;
const DOMINO_COST = 50;  // Cost to place a domino
const TRIGGER_BONUS = 500;  // Points earned for trigger activation

// Function to update score display
function updateScoreDisplay(isIncrease = false) {
    const scoreElement = document.getElementById('currentScore');
    if (scoreElement) {
        scoreElement.textContent = currentScore;
        // Add appropriate animation class
        scoreElement.className = isIncrease ? 'score-increase' : 'score-change';
        // Remove animation class after it completes
        setTimeout(() => {
            scoreElement.className = '';
        }, 500);
    }
}

// Initialize score display
function initializeScoreDisplay() {
    const scoreDiv = document.createElement('div');
    scoreDiv.innerHTML = document.getElementById('scoreDisplay').outerHTML;
    document.body.appendChild(scoreDiv.firstChild);
    updateScoreDisplay();
}

// Convert quaternion to Euler angles
function quaternionToEuler(q) {
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch = Math.abs(sinp) >= 1 ? (Math.PI / 2) * Math.sign(sinp) : Math.asin(sinp);


    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return { x: roll, y: pitch, z: yaw };
}


async function dominoCreator(dominoName = "1", path = "./resources/domino1.obj", shader = "deneme-shader1" , initPoint = {x:0,y:10,z:0}, mass = 1 ) {


    /////////////////// DOMINO INIT ////////////////////
    let domino_data = static_domino_data;
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
            friction: 0.1,
            restitution: 0.3 // Bounce factor
        })
    });

    domino_mesh.color = [
        Math.random(),
        Math.random(),
        Math.random(),
        1,
    ]

    // Add the shape to the body
    domino_body.addShape(boxShape);

    bodyMap.set(dominoName +"_body", domino_body);
    meshMap.set(dominoName , domino_mesh);

    return {"mesh": domino_mesh,"body": domino_body}

}

function dominoCreator2(dominoName = "1", shader = "deneme-shader1" , initPoint = {x:0,y:10,z:0}, mass = 1 ) {
    //console.log(dominoName, path, shader, initPoint, mass)

    /////////////////// DOMINO INIT ////////////////////
    let domino_data = static_domino_data;
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
            friction: 0.1,
            restitution: 0.3 // Bounce factor
        })
    });

    domino_mesh.color = [
        Math.random(),
        Math.random(),
        Math.random(),
        1,
    ]

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

    window.addEventListener('load', initializeScoreDisplay);
    
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

            case 'r':
            case 'R':
                r_pressed = true;
                break;

            case 't':
            case 'T':
                t_pressed = true;
                break;

            case 'Z':
            case 'z':
                createDomino = true;
                // engine.camera.translateCameraFirstPerson(0,-0.2, 0);
                break;
            case 'H': // #updated: Added help key handler
            case 'h':
                showHelp = !showHelp;
                helpOverlay.style.display = showHelp ? 'block' : 'none';
            break;

            case 'p':
            case 'P':
                current_shader_index = (current_shader_index+1)%main_shader_names.length;
                engine.getScene().forEach(mesh => {
                    let s = false;
                    main_shader_names.forEach(sh_name => {
                        if(sh_name === mesh.shader_name){
                            s = true;
                            return;
                        }
                    });
                    if(s){
                        // console.log(main_shader_names[current_shader_index])
                        // console.log(current_shader_index)
                        mesh.shader_name = main_shader_names[current_shader_index];
                        // console.log(engine.getShader(mesh.shader_name))
                        mesh.updateVBO(engine.getShader(mesh.shader_name).shaderInit);
                    }
                });
                break;
            case 'k':
            case 'K':
                console.log(initial_domino)
                initial_domino.body.applyImpulse(
                    new CANNON.Vec3(0, 0, 1.5),
                    new CANNON.Vec3(initial_domino.body.position.x, initial_domino.body.position.y+1.1, initial_domino.body.position.z)
                )
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

            case 'r':
            case 'R':
                r_pressed = false;
                break;

            case 't':
            case 'T':
                t_pressed = false;
                break;

            case 'Z':
            case 'z':
                createDomino = false;
                // engine.camera.translateCameraFirstPerson(0,-0.2, 0);
                break;
            case 'H': // #updated: Added help key handler
            case 'h':
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

function anim(percentage){
    let fc = [0.0, 15.0, -10.0];
    let fl = [0.3, 26.0, 15.5];
    let lc = [0, 20, -25];
    let ll = [0, 1, -4];
    let vc = subtract(lc, fc);
    let vl = subtract(ll, fl);

    engine.camera.setCameraPosition(...add(fc ,scale(percentage, vc)));
    engine.camera.setLookAtPosition(...add(fl, scale(percentage, vl)));
}

const render = async function(){

    if(current_anim_frame !== anim_frame_count){
        anim(current_anim_frame++/anim_frame_count);
        engine.drawScene();
        
        requestAnimFrame(render);
        return;
    }

    //mouse hareketlerine bak
    if(drag_flag){
        delta_x = p_x - p_x0;
        delta_y = p_y - p_y0;
        p_x0 = p_x;
        p_y0 = p_y;
        engine.camera.translateCameraViewplane(delta_x*4, delta_y*4, 0)
    }
    else if(rotate_flag){
        delta_x = p_x - p_x0;
        delta_y = p_y - p_y0;
        p_x0 = p_x;
        p_y0 = p_y;
        let theta = delta_x * Math.PI/4.0;;
        let phi = delta_y * Math.PI/4.0;

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
    if(r_pressed){
        shadow_domino.addRotation(0, 0.05, 0);
    }else if(t_pressed){
        shadow_domino.addRotation(0, -0.05, 0);
    }

    function intersectWithPlane(ray_pos, ray_direction) {
        if (ray_direction[1] === 0) {
            return null;
        }
        
        let t = -ray_pos[1] / ray_direction[1];
        let intersection = [
            ray_pos[0] + t * ray_direction[0],
            0,
            ray_pos[2] + t * ray_direction[2]
        ];
    
        return intersection;
    }

    if(createDomino){
        let eye = engine.camera.getCameraPosition();
        let at = engine.camera.getLookAtPosition();
        
        let intersection = intersectWithPlane(eye, subtract(at, eye));

        let domino = dominoCreator2(
            "domino"+dominoCounter.toString(),
            main_shader_names[current_shader_index ],
            {x:intersection[0],y:intersection[1]+1.2,z:intersection[2]},
            0.1);

        domino.color = [
            Math.random(),
            Math.random(),
            Math.random(),
            1
        ]

        const shadow_domino_rotation = new CANNON.Quaternion();
        shadow_domino_rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), shadow_domino.ry); // Rotate around the Y-axis
        domino.body.quaternion = domino.body.quaternion.mult(shadow_domino_rotation);

        engine.addMeshToScene(domino.mesh);
        domino.mesh.light_container.addLight(general_ambient);
        dominoCounter = dominoCounter + 1;
        world.addBody(domino.body);

        currentScore -= DOMINO_COST;
        updateScoreDisplay(false);

        dominoCounter = dominoCounter + 1;
        world.addBody(domino.body);
        createDomino = false;
    }

    let eye = engine.camera.getCameraPosition();
    let at = engine.camera.getLookAtPosition();
    let intersection = intersectWithPlane(eye, subtract(at, eye));
    if(intersection !== null) {
        shadow_domino.setTranslate(intersection[0], intersection[1]+1.0, intersection[2]);
    }
    
    const spinner_rotation = new CANNON.Quaternion();
    
    spinner_rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -cycle); // Rotate around the Y-axis
    spnr.quaternion = spnr.quaternion.mult(spinner_rotation);
    const spinner_euler = quaternionToEuler(spnr.quaternion);
    spinner_mesh.setRotation(
        spinner_euler.x,
        spinner_euler.y,
        spinner_euler.z
    );
    spinner_mesh.setTranslate(spnr.position.x, spnr.position.y, spnr.position.z)

    // Iterate through all bodies in the bodyMap
    for (let [key, body] of bodyMap) {
        // Get the mesh name by removing "_body" from the key
        const meshName = key.replace("_body", "");

        //console.log(key, body.position);

        if(meshName[0] != "t"){
            engine.getMeshFromScene(meshName).setTranslate(
                body.position.x,
                body.position.y,
                body.position.z
            );
        }

        // Update position


        if(meshName != "zemin" && meshName[0] != "t"){

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
    engine.camera.setCameraPosition(0, 10, -15);
    engine.camera.setLookAtPosition(0,1,-4);

    
    const plantShaderFunction = function (mesh, _material, index, count){
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;
        let VBOs = mesh.VBO_container;

        let vPositionLocation = GL.getAttribLocation( glProgram, "vPosition" );
        let normalLocation = GL.getAttribLocation( glProgram, "vNormal" );
        let textCoordLocation = GL.getAttribLocation( glProgram, "a_texCoord" );

        // let textureLocation = GL.getUniformLocation( glProgram, "uTexture" );
        // let normalMapLocation = GL.getUniformLocation( glProgram, "uNormalMap" );

        let modelViewMatrixLoc = GL.getUniformLocation( glProgram, "modelViewMatrix" );
        let projectionMatrixLoc = GL.getUniformLocation( glProgram, "projectionMatrix" );
        let transformLocation = GL.getUniformLocation( glProgram, "transform" );
        
        // let lightCountLocation = GL.getUniformLocation(glProgram, "light_count");
        let lightPositionLocation = GL.getUniformLocation( glProgram, "lightPosition" );
        let targetPositionLocation = GL.getUniformLocation( glProgram, "targetPosition" );
        let cutOffLocation = GL.getUniformLocation( glProgram, "u_cutoff" );

        let shininessLocation = GL.getUniformLocation( glProgram, "shininess" );
        let ambientLocation = GL.getUniformLocation( glProgram, "ambientProduct" );
        let diffuseLocation = GL.getUniformLocation( glProgram, "diffuseProduct" );
        let specularLocation = GL.getUniformLocation( glProgram, "specularProduct" );

        //vertexler vec3
        GL.bindBuffer( GL.ARRAY_BUFFER, VBOs.vBuffer);
        GL.vertexAttribPointer( vPositionLocation, 3, GL.FLOAT, false, 0, 0 );
        GL.enableVertexAttribArray( vPositionLocation );

        //normaller vec3
        GL.bindBuffer(GL.ARRAY_BUFFER, VBOs.normal_buffer);
        GL.vertexAttribPointer(normalLocation, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(normalLocation);

        //texture cordinatlari vec2
        GL.bindBuffer( GL.ARRAY_BUFFER, VBOs.texBuffer);
        GL.vertexAttribPointer( textCoordLocation, 2, GL.FLOAT, false, 0, 0 );
        GL.enableVertexAttribArray( textCoordLocation );


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

        GL.uniform4fv(ambientLocation,  new Float32Array(ambient));
        GL.uniform4fv(diffuseLocation,  new Float32Array(diffuses));
        GL.uniform4fv(specularLocation, new Float32Array(speculars));
        GL.uniform1f(shininessLocation, _material.Ns);
        GL.uniform4fv(lightPositionLocation, new Float32Array(light_positions));
        GL.uniform4fv(targetPositionLocation, new Float32Array(target_positions));
        GL.uniform1fv(cutOffLocation, new Float32Array(cutoffs));

        GL.uniformMatrix4fv( transformLocation, true, mesh.getTransform() );
        GL.uniformMatrix4fv( modelViewMatrixLoc, true, this.camera.getModelViewMatrix() );
        GL.uniformMatrix4fv( projectionMatrixLoc, true, this.camera.getPerspectiveMatrix() );

        GL.drawArrays( GL.TRIANGLES, index, count);


        //TODO: buranin ariza cikaracagini dusunmuyorum ama duruma gore,
        // edit: cikarmadi tamamiz


        GL.disableVertexAttribArray(vPositionLocation);
        GL.disableVertexAttribArray(normalLocation);
        GL.disableVertexAttribArray(textCoordLocation);

    }.bind(engine);

    const plantShaderFunction_init = function (_faces, _normals, _texture_points, mesh){
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;

        let textureLocation = GL.getUniformLocation( glProgram, "uTexture" );
        let normalMapLocation = GL.getUniformLocation( glProgram, "uNormalMap" );

        let VBO = {
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
        GL.uniform1i(textureLocation, 0);
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
        // GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.texture);

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, VBO.normal_map_image);
        GL.uniform1i(normalMapLocation, 1);
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
        // GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.normalMap);

        Object.assign(mesh.VBO_container, VBO);
    }.bind(engine);

    const secondaryShaderFunction = function (mesh, _material, index, count){
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;
        let VBOs = mesh.VBO_container;


        let vPositionLocation = GL.getAttribLocation( glProgram, "vPosition" );
        let normalLocation = GL.getAttribLocation( glProgram, "vNormal" );
        let textCoordLocation = GL.getAttribLocation( glProgram, "a_texCoord" );

        // let textureLocation = GL.getUniformLocation( glProgram, "uTexture" );
        // let normalMapLocation = GL.getUniformLocation( glProgram, "uNormalMap" );

        let modelViewMatrixLoc = GL.getUniformLocation( glProgram, "modelViewMatrix" );
        let projectionMatrixLoc = GL.getUniformLocation( glProgram, "projectionMatrix" );
        let transformLocation = GL.getUniformLocation( glProgram, "transform" );
        
        // let lightCountLocation = GL.getUniformLocation(glProgram, "light_count");
        let lightPositionLocation = GL.getUniformLocation( glProgram, "lightPosition" );
        let targetPositionLocation = GL.getUniformLocation( glProgram, "targetPosition" );
        let cutOffLocation = GL.getUniformLocation( glProgram, "u_cutoff" );

        let shininessLocation = GL.getUniformLocation( glProgram, "shininess" );
        let ambientLocation = GL.getUniformLocation( glProgram, "ambientProduct" );
        let diffuseLocation = GL.getUniformLocation( glProgram, "diffuseProduct" );
        let specularLocation = GL.getUniformLocation( glProgram, "specularProduct" );

        let colorLocation = GL.getUniformLocation( glProgram, "uColor" );

        //vertexler vec3
        GL.bindBuffer( GL.ARRAY_BUFFER, VBOs.vBuffer);
        GL.vertexAttribPointer( vPositionLocation, 3, GL.FLOAT, false, 0, 0 );
        GL.enableVertexAttribArray( vPositionLocation );

        //normaller vec3
        GL.bindBuffer(GL.ARRAY_BUFFER, VBOs.normal_buffer);
        GL.vertexAttribPointer(normalLocation, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(normalLocation);

        //texture cordinatlari vec2
        GL.bindBuffer( GL.ARRAY_BUFFER, VBOs.texBuffer);
        GL.vertexAttribPointer( textCoordLocation, 2, GL.FLOAT, false, 0, 0 );
        GL.enableVertexAttribArray( textCoordLocation );


        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, VBOs.texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.texture);
        GL.generateMipmap(GL.TEXTURE_2D);

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, VBOs.normal_map_image);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, _material.normalMap);
        GL.generateMipmap(GL.TEXTURE_2D);

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

        GL.uniform4fv(ambientLocation,  new Float32Array(ambient));
        GL.uniform4fv(diffuseLocation,  new Float32Array(diffuses));
        GL.uniform4fv(specularLocation, new Float32Array(speculars));
        GL.uniform1f (shininessLocation, _material.Ns);
        GL.uniform4fv(lightPositionLocation, new Float32Array(light_positions));
        GL.uniform4fv(targetPositionLocation, new Float32Array(target_positions));
        GL.uniform1fv(cutOffLocation, new Float32Array(cutoffs));

        GL.uniform4fv(colorLocation, new Float32Array(mesh.color));

        GL.uniformMatrix4fv( transformLocation, true, mesh.getTransform() );
        GL.uniformMatrix4fv( modelViewMatrixLoc, true, this.camera.getModelViewMatrix() );
        GL.uniformMatrix4fv( projectionMatrixLoc, true, this.camera.getPerspectiveMatrix() );

        GL.drawArrays( GL.TRIANGLES, index, count);

        GL.disableVertexAttribArray(vPositionLocation);
        GL.disableVertexAttribArray(normalLocation);
        GL.disableVertexAttribArray(textCoordLocation);

    }.bind(engine);

    const secondaryShaderFunction_init = function (_faces, _normals, _texture_points, mesh){
        let glProgram = this.getActiveShaderProgram().program;
        let GL = this.gl;

        let VBO = {
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

        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, VBO.texture);
        GL.uniform1i(VBO.textureLocation, 0);
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, VBO.normal_map_image);
        GL.uniform1i(VBO.normalMapLocation, 1);
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);

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
            GL.drawArrays(GL.LINES, index, count);// DELETE LATER
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

    await engine.addShaders(
        "shader2",
        "./shaders/vertexShader2.glsl",
        "./shaders/fragmentShader2.glsl",
        secondaryShaderFunction,
        secondaryShaderFunction_init
    );
    
    // Create a world (gravity is set in the options)
    world.gravity.set(0, -9.82, 0); // Set gravity (in meters per second squared), e.g., Earth gravity
    world.broadphase = new CANNON.NaiveBroadphase();  // Default broadphase for collision detection
    world.solver = new CANNON.GSSolver;  // Default solver
    world.allowSleep = false;  // Allow objects to go to sleep when not moving

    // Load the ground mesh data for VISUAL representation only
    const zemin_data = await loadOBJ("./resources/ground.obj");
    const zemin_mesh = new Mesh("zemin", "deneme-shader1", zemin_data._faces, zemin_data._normals, zemin_data._texture_points, zemin_data._material_face_map);
    zemin_mesh.scale(0.5, 1, 0.5);

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
    spotLight.setDiffuse(1, 1, 0);   // White light
    spotLight.setSpecular(1, 1, 0);
    // Set cutoff angle for the spotlight
    spotLight.setCutoffAngle(45);    // Adjust angle as needed

    // Add the spot light to the mesh
    zemin_mesh.light_container.addLight(spotLight);

    bodyMap.set("zemin" +"_body", groundBody);
    meshMap.set("zemin" , zemin_mesh);

    ////////////////// DOMINO func INIT ////////////////

    static_domino_data = await loadOBJ("./resources/domino2.obj");
    shadow_domino = new Mesh(
        "shadow_domino_mesh",
        "default",
        static_domino_data._faces,
        static_domino_data._normals,
        static_domino_data._texture_points,
        [{face_index:0, mat_name:"default", r:0, g:1, b:0, a:0.5, wireframe:false}]
    );
    shadow_domino.setRotation(0, Math.PI/2, 0);
    engine.addMeshToScene(shadow_domino);

    //dominoCreator2( "1", "deneme-shader1" ,{x:0,y:5, z:0}, 1);
    //dominoCreator2( "2", "deneme-shader1" ,{x:0,y:10,z:0}, 1);
    //dominoCreator2( "3", "deneme-shader1" ,{x:2,y:10,z:2}, 1);

    //dominoCreator("4", "./resources/gate.obj", "deneme-shader1" , {x:0,y:10,z:0}, mass = 1 )

    ////////////////// GATE func INIT ////////////////
    let gate_data = await loadOBJ("./resources/gate.obj");
        
    let gate_mesh = new Mesh("g_4", "deneme-shader1",
                        gate_data._faces,
                        gate_data._normals,
                        gate_data._texture_points,
                        gate_data._material_face_map);

    // Create a box shape (length, width, height)
    let triggerDims = gate_mesh.getDimensions();

    let triggerShape = new CANNON.Box(new CANNON.Vec3(
        triggerDims[0]/2.2, triggerDims[1]/2.2, triggerDims[2]/4
    ));

    const trimeshShape = new CANNON.Trimesh(gate_data.vertices, gate_data._faces_by_index);

    // Create a body with mass and position
    let gate_body = new CANNON.Body({
        mass: 1000,  // Mass of the box in kg
        position: new CANNON.Vec3(0, 2.0, 10), // Starting position in the world
        material: new CANNON.Material({
            friction: 0.0,
            restitution: 0.0 // Bounce factor
        })
    });

    gate_body.angularDamping = 0.6;  // Reduces rotation oscillation
    gate_body.linearDamping = 0.6;   // Reduces position oscillation

    // Create the trigger body - note mass = 0 for static triggers
    const triggerBody = new CANNON.Body({
        mass: 0,  // Make it static
        position: new CANNON.Vec3(0, 0, 0), // Same position as gate or offset as needed
        material: new CANNON.Material({
            friction: 0,
            restitution: 0
        }),
        // These are the key properties for detection without impact:
        type: CANNON.Body.STATIC,
        collisionResponse: false,  // This prevents physical collision responses
        isTrigger: true

    });

    // Add the trigger shape to the body
    triggerBody.addShape(triggerShape);

    // Add collision event listeners
    triggerBody.addEventListener("collide", function(event) {
        // Check what object entered the trigger
        const otherBody = event.body;
        console.log("Object entered trigger zone!", otherBody);
        
        // Add bonus points for trigger activation
        currentScore += TRIGGER_BONUS;
        updateScoreDisplay(true);
        
    });

    let credits_data = await loadOBJ("./resources/credits.obj");
        
    let credits_mesh = new Mesh("credits", "default",
                        credits_data._faces,
                        credits_data._normals,
                        credits_data._texture_points,
                        [{   
                            mat_name:"sdfsd",
                            face_index:0,
                            r:1, g:0, b:1, a:1, wireframe:false

                        }]);

    engine.addMeshToScene(credits_mesh);
    credits_mesh.setTranslate(0, 20, 0);
    credits_mesh.scale(-1,1,1);
    credits_mesh.setRotation(Math.PI/3)


    let spinner_data = await loadOBJ("./resources/obstacle.obj");
        
    spinner_mesh = new Mesh("spinner1", "deneme-shader1",
                        spinner_data._faces,
                        spinner_data._normals,
                        spinner_data._texture_points,
                        spinner_data._material_face_map);
        engine.addMeshToScene(spinner_mesh);
    // Create a box shape (length, width, height)
    let spinner_dims = spinner_mesh.getDimensions();

    let spinner_shape = new CANNON.Box(new CANNON.Vec3(
        spinner_dims[0]/2, spinner_dims[1]/2, spinner_dims[2]/2
    ));
    let spinner_body = new CANNON.Body({
        mass: 100,  // Make it static
        position: new CANNON.Vec3(0, 0, 0),
        material: new CANNON.Material({
            friction: 0,
            restitution: 4
        }),
        // These are the key properties for detection without impact:
        type: CANNON.Body.STATIC,
        collisionResponse: true,  // This prevents physical collision responses
        isTrigger: false
    });
    spinner_body.addShape(spinner_shape);
    world.addBody(spinner_body);
    spnr = spinner_body;
    spnr.position.set(spnr.position.x, spnr.position.y+1, spnr.position.z)


    // Make sure to add both bodies to your physics world
    world.addBody(gate_body);
    world.addBody(triggerBody);

    // Add the shape to the body
    gate_body.addShape(trimeshShape);

    bodyMap.set("g_4" +"_body", gate_body);
    bodyMap.set("t_4" +"_body", triggerBody);
    meshMap.set("g_4" , gate_mesh);

    initial_domino = dominoCreator2(
        "domino"+dominoCounter.toString(),
        main_shader_names[current_shader_index],
        {x:0, y:1.3, z:-10},
        1);

    initial_domino.color = [
        Math.random(),
        Math.random(),
        Math.random(),
        1
    ]

    // domino.body.quaternion.set(0, shadow_domino.ry,0, 1);
    const initial_domino_rotation = new CANNON.Quaternion();
    initial_domino_rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI/2); // Rotate around the Y-axis
    initial_domino.body.quaternion = initial_domino.body.quaternion.mult(initial_domino_rotation);

    engine.addMeshToScene(initial_domino.mesh);
    initial_domino.mesh.light_container.addLight(general_ambient);
    dominoCounter = dominoCounter + 1;
    world.addBody(initial_domino.body);

    // Add the body to the world
    for (let [key, body] of bodyMap) {
        world.addBody(body);
    }


    for (let [key, mesh] of meshMap) {
        mesh.light_container.addLight(general_ambient);
        engine.addMeshToScene(mesh);
    }

    render();
}

main();


