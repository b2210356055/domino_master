
async function readFile(src) {
    const response = await fetch(src);
    if (!response.ok) {
        console.error(`Error reading file: ${src}`);
        return null;
    }
    return await response.text();
}


class Camera{
    #camera_position = vec3(5.0, 5.0, 5.0);
    #lookat_position = vec3(0.0, 0.0, 0.0);
    #up = vec3(0.0, 1.0, 0.0);

    #near = 0.3;
    #far = 1000.0;
    #fovy = 60.0;  // Field-of-view in Y direction angle (in degrees)
    #aspect = 1.0; // Viewport aspect ratio

    constructor(near, far, fovy, aspect) {
        if(near !== undefined) this.#near = near;
        if(far !== undefined) this.#far = far;
        if(fovy !== undefined) this.#fovy = fovy;
        if(aspect !== undefined) this.#aspect = aspect;
    }

    updateNear(near) {
        if(near !== undefined) this.#near = near;
    }

    updateFar(far) {
        if(far !== undefined) this.#far = far;
    }

    updateFovy(fovy) {
        if(fovy !== undefined) this.#fovy = fovy;
    }

    updateAspect(aspect) {
        if(aspect !== undefined) this.#aspect = aspect;
    }

    translateCameraWorld(dx, dy, dz){
        this.#camera_position = add(this.#camera_position, vec3(dx, dy, dz));
        this.#lookat_position = add(this.#lookat_position, vec3(dx, dy, dz));

    }

    translateCameraViewplane(dx, dy, dz){
        //ekrandan izleyiciye -z vectoru
        let zv = subtract(this.#camera_position, this.#lookat_position);
        //view y vectoru = up - up.dot(up, zv);
        let yv;
        if(dot(this.#up, zv) !== 0){
            yv = subtract(this.#up, scale(dot(this.#up, zv) / dot(zv, zv), zv));
        }else{
            yv = [...this.#up];
        }
        yv = normalize(yv);
        //view x vectoru
        let xv = cross(zv, yv);
        xv = normalize(xv);

        // view plane baseinde vx, vy ve vz vektorlerini bulduk,
        // o vektorlerde translate ettiriyoruz
        const translation = add(add(scale(dx, xv), scale(dy, yv)), scale(dz, zv));
        
        this.#camera_position = add(this.#camera_position, translation);
        this.#lookat_position = add(this.#lookat_position, translation);
    }

    translateCameraFirstPerson(dx, dy, dz){
        let dir_forward = subtract(this.#lookat_position, this.#camera_position);
        dir_forward[1] = 0.0;
        dir_forward = normalize(dir_forward);
        let dir_right = [-dir_forward[2], 0.0, dir_forward[0]];
        
        this.#camera_position = add(this.#camera_position, scale(dx, dir_right));
        this.#camera_position = add(this.#camera_position, scale(dy, this.#up));
        this.#camera_position = add(this.#camera_position, scale(dz, dir_forward));
        
        this.#lookat_position = add(this.#lookat_position, scale(dx, dir_right));
        this.#lookat_position = add(this.#lookat_position, scale(dy, this.#up));
        this.#lookat_position = add(this.#lookat_position, scale(dz, dir_forward));
    }

    getCameraPosition(){
        return this.#camera_position;
    }

    setCameraPosition(x, y, z){
        this.#camera_position = [x, y, z];
    }
    
    getLookAtPosition(){
        return this.#lookat_position;
    }

    setLookAtPosition(x, y, z){
        this.#lookat_position = [x, y, z];
    }
    
    rotateCamera(theta, phi){
        const centered_eye = subtract(this.#camera_position, this.#lookat_position);
        /*
            | cos(t),       0,      sin(t)       |
        M = | sin(t)sin(p), cos(p),-sin(p)cos(t) |
            |-sin(t)cos(p), sin(p), cos(t)cos(p) |
        */
        // rotation matrix * centered eye
        const rotated_eye_at_center = [
            dot([Math.cos(theta), 0, Math.sin(theta)], centered_eye),
            dot([Math.sin(theta)*Math.sin(phi), Math.cos(phi), -Math.sin(phi)*Math.cos(theta)], centered_eye),
            dot([-Math.sin(theta)*Math.cos(phi), Math.sin(phi), Math.cos(theta)*Math.cos(phi)], centered_eye)
        ];
        this.#camera_position = add(rotated_eye_at_center, this.#lookat_position);
    }

    getModelViewMatrix() {
        let temp = lookAt(this.#camera_position, this.#lookat_position, this.#up);
        let result = [...temp[0], ...temp[1], ...temp[2], ...temp[3]];

        // console.log("result: ", result, "\nlookAt(eye,at,up): ", lookAt(this.#camera_position, this.#lookat_position, [0,1,0]));
        return new Float32Array(result);
    }


    getPerspectiveMatrix(){
        var f = 1.0 / Math.tan( radians(this.#fovy) / 2 );
        var d = this.#far - this.#near;

        var result =
        [
            f / this.#aspect, 0.0, 0.0, 0.0,
            0.0, f, 0.0, 0.0,
            0.0, 0.0, -(this.#near + this.#far) / d, -2 * this.#near * this.#far / d,
            0.0, 0.0, -1.0, 0.0
        ];
        result.matrix = true;

        return new Float32Array(result);
    }
}


class Mesh {
    name = "default-mesh";
    shader_name = "default";
    #transform_matrix;
    x=0; y=0; z=0;
    rx=0; ry=0; rz=0;
    sx=1; sy=1; sz=1;

    #faces = undefined; //vec3, Float32Array()
    #normals = undefined; //vec3, Float32Array()
    #texture_points = undefined; //vec3, Float32Array()
    #material_facemap = []; // [{face_index:  mat_name:}, ...]
    VBO_container= {};

    //TODO: add setler this#transform_matrix'i guncelliyor ama
    // rotasyon hatali, bakmak lazim
    addTranslate(dx=0, dy=0, dz=0){
        this.#transform_matrix[3] +=dx;
        this.#transform_matrix[7] +=dy;
        this.#transform_matrix[11]+=dz;
        this.x+=dx;
        this.y+=dy;
        this.z+=dz;
    };

    setTranslate(dx=0, dy=0, dz=0){
        this.#transform_matrix[3] =dx;
        this.#transform_matrix[7] =dy;
        this.#transform_matrix[11]=dz;
        this.x=dx;
        this.y=dy;
        this.z=dz;
    };

    addRotation(nx=0, ny=0, nz=0){
        // let result = new Float32Array(this.#transform_matrix);
        let result = this.#transform_matrix;
        if(nx !== 0){
            let rotx = new Float32Array([
                1, 0, 0, 0,
                0, Math.cos(nx), -Math.sin(nx), 0,
                0, Math.sin(nx), Math.cos(nx), 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(rotx, result);
        }
        if(ny !== 0){
            let roty = new Float32Array([
                Math.cos(ny), 0, Math.sin(ny), 0,
                0, 1, 0, 0,
                -Math.sin(ny), 0, Math.cos(ny), 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(roty, result);
        }
        if(nz !== 0){
            let rotz = new Float32Array([
                Math.cos(nz), -Math.sin(nz), 0, 0,
                Math.sin(nz), Math.cos(nz), 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(rotz, result);
        }
        this.#transform_matrix = result;
        this.rx+=nx;
        this.ry+=ny;
        this.rz+=nz;
    };

    setRotation(nx=0, ny=0, nz=0){
        // let result = new Float32Array(this.#transform_matrix);
        let result = new Float32Array([
            this.sx,0,0,this.x,
            0,this.sy,0,this.y,
            0,0,this.sz,this.z,
            0,0,0,1
        ]);
        if(nx !== 0){
            let rotx = new Float32Array([
                1, 0, 0, 0,
                0, Math.cos(nx), -Math.sin(nx), 0,
                0, Math.sin(nx), Math.cos(nx), 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(rotx, result);
        }
        if(ny !== 0){
            let roty = new Float32Array([
                Math.cos(ny), 0, Math.sin(ny), 0,
                0, 1, 0, 0,
                -Math.sin(ny), 0, Math.cos(ny), 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(roty, result);
        }
        if(nz !== 0){
            let rotz = new Float32Array([
                Math.cos(nz), -Math.sin(nz), 0, 0,
                Math.sin(nz), Math.cos(nz), 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(rotz, result);
        }
        this.#transform_matrix = result;
        this.rx=nx;
        this.ry=ny;
        this.rz=nz;
    };

    scale(sx=1, sy=1, sz=1){
        const scale_matrix = [
            this.sx, 0, 0, 0,
            0, this.sy, 0, 0,
            0, 0, this.sz, 0,
            0, 0, 0, 1
        ];
        const rotx_matrix = [
            1, 0, 0, 0,
            0, Math.cos(this.rx), -Math.sin(this.rx), 0,
            0, Math.sin(this.rx), Math.cos(this.rx), 0,
            0, 0, 0, 1
        ];
        const roty_matrix = [
            Math.cos(this.ry), 0, Math.sin(this.ry), 0,
            0, 1, 0, 0,
            -Math.sin(this.ry), 0, Math.cos(this.ry), 0,
            0, 0, 0, 1
        ];
        const rotz_matrix = [
            Math.cos(this.rz), -Math.sin(this.rz), 0, 0,
            Math.sin(this.rz), Math.cos(this.rz), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];

        var result = mult_matrix(rotx_matrix, scale_matrix);
        result = mult_matrix(roty_matrix, result);
        result = mult_matrix(rotz_matrix, result);
        result[3] = this.x;
        result[7] = this.y;
        result[11] = this.z;
        result[15] = 1;

        this.#transform_matrix = new Float32Array(result);
        this.sx=sx;
        this.sy=sy;
        this.sz=sz;
        return this.#transform_matrix;
    };

    getFaces(index){
        if(index !== undefined){
            if(index < 0 || index >= this.#material_facemap.length){
                console.error("getFaces(index): index is out of bounds!!!\nthis.#material_facemap.length = ", this.#material_facemap.length);
                return null;
            }
            if(index === this.#material_facemap.length-1){
                return this.#faces.slice(this.#material_facemap[index].face_index*3);
            }
            else{
                return this.#faces.slice(this.#material_facemap[index].face_index*3, this.#material_facemap[index+1].face_index*3);
            }
        }
        return this.#faces;
    }

    getNormals(index){
        if(index !== undefined){
            if(index < 0 || index >= this.#material_facemap.length){
                console.error("getNormals(index): index is out of bounds!!!\nthis.#material_facemap.length = ", this.#material_facemap.length);
                return null;
            }
            if(index === this.#material_facemap.length-1){
                return this.#normals.slice(this.#material_facemap[index].face_index*3);
            }
            else{
                return this.#normals.slice(this.#material_facemap[index].face_index*3, this.#material_facemap[index+1].face_index*3);
            }
            return this.#normals[index];
        }
        return this.#normals;
    }

    getTexturePoints(index){
        if(index !== undefined){
            if(index < 0 || index >= this.#material_facemap.length){
                console.error("getTexturePoints(index): index is out of bounds!!!\nthis.#material_facemap.length = ", this.#material_facemap.length);
                return null;
            }
            if(index === this.#material_facemap.length-1){
                return this.#texture_points.slice(this.#material_facemap[index].face_index*2);
            }
            else{
                return this.#texture_points.slice(this.#material_facemap[index].face_index*2, this.#material_facemap[index+1].face_index*2);
            }
            return this.#texture_points[index];
        }
        return this.#texture_points;
    }

    getMaterialFaceMap(index){
        if(index !== undefined){
            if(index < 0 || index >= this.#material_facemap.length){
                console.error("getMaterialFaceMap(index): index is out of bounds!!!\nthis.#material_facemap.length = ", this.#material_facemap.length);
                return null;
            }
            return this.#material_facemap[index];
        }
        return this.#material_facemap;
    }

    getTransform(){
        return this.#transform_matrix;
    }

    setTransform(transform_matrix){
        if(!(transform_matrix instanceof Float32Array)){
            if(!Array.isArray(transform_matrix)){
                console.error("This is not even an Array!!!");
                return;
            }
            transform_matrix = new Float32Array(transform_matrix);
        }
        if(transform_matrix.length != 16){
            console.error("The array length is not 16!!!\nArray.length: ", transform_matrix.length);
            return;
        }
        this.#transform_matrix = transform_matrix;

        this.x = transform_matrix[3];
        this.y = transform_matrix[7];
        this.z = transform_matrix[11];
        let c1 = [transform_matrix[0], transform_matrix[4], transform_matrix[8]];
        let c2 = [transform_matrix[1], transform_matrix[5], transform_matrix[9]];
        let c3 = [transform_matrix[2], transform_matrix[6], transform_matrix[10]];
        this.sx = Math.sqrt(c1[0]**2 + c1[1]**2 + c1[2]**2);
        this.sy = Math.sqrt(c2[0]**2 + c2[1]**2 + c2[2]**2);
        this.sz = Math.sqrt(c3[0]**2 + c3[1]**2 + c3[2]**2);
        c1[0] /= this.sx; c1[1] /= this.sx; c1[2] /= this.sx;
        c2[0] /= this.sy; c2[1] /= this.sy; c2[2] /= this.sy;
        c3[0] /= this.sz; c3[1] /= this.sz; c3[2] /= this.sz;
        this.rz = Math.atan2(c2[0], c1[0]);
        this.ry = -Math.asin(c1[2]);
        this.rx = Math.atan2(c3[1], c3[2]);
        /*
            // Extract yaw (Z-axis rotation)
            const yaw = Math.atan2(R[1][0], R[0][0]);

            // Extract pitch (Y-axis rotation)
            const pitch = Math.atan2(-R[2][0], Math.sqrt(R[0][0] ** 2 + R[1][0] ** 2));

            // Extract roll (X-axis rotation)
            const roll = Math.atan2(R[2][1], R[2][2]);
        */
    };

    print(){
        let str = "name: " + this.name + "\n#transform_matrix: \n\t" + this.#transform_matrix.slice(0,4) + "\n\t" + this.#transform_matrix.slice(4,8) + "\n\t" + this.#transform_matrix.slice(8,12) + "\n\t" + this.#transform_matrix.slice(12) + "\nxyz: " + this.x.toString() + ", " + this.y.toString() + ", " + this.z.toString() +
        "\nrx/ry/rz: " + this.rx.toString() + ", " + this.ry.toString() + ", " + this.rz.toString() + "\nsx/sy/sz: " + 
        this.sx.toString() + ", " + this.sy.toString() + ", " + this.sz.toString();
        console.log(str, "\n#faces: ", this.#faces, "\n#normals: ", this.#normals, "\n#material_list: ", this.#material_facemap);
    };


    constructor(_name, _shader_name, _faces, _normals, _texture_points, _material_facemap) {
        this.name = _name;
        this.shader_name = _shader_name;
        this.#transform_matrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

        if(_faces !== undefined){
            if(!Array.isArray(_faces)){
                console.error("Arguement 1 is not an Array!!!");
                return null;
            }
            this.#faces = new Float32Array(_faces);
        }
        if(_normals !== undefined){
            if(!Array.isArray(_normals)){
                console.error("Arguement 2 is not an Array!!!");
                return null;
            }
            this.#normals = new Float32Array(_normals);
        }
        if(_texture_points !== undefined){
            if(!Array.isArray(_texture_points)){
                console.error("Arguement 3 is not an Array!!!");
                return null;
            }
            this.#texture_points = new Float32Array(_texture_points);
        }
        //materyal olusturmaca falan
        if(_material_facemap === undefined) _material_facemap = [];
        if(!Array.isArray(_material_facemap)){
            console.error("Arguement 4 is not an Array!!!");
            return null;
        }

        if(_material_facemap.length === 0){
            _material_facemap.push(
                {
                face_index:0,
                mat_name:"default",
                // shader_name: "default",
                r:1.0, g:1.0, b:1.0, a:1.0,
                wireframe:true
                }
            );
        }
        this.#material_facemap = _material_facemap;
    };
}


class Engine {
    #scene = [];
    #shader_programs = []; //{name, program, shaderFunction, shaderInit}
    gl;
    canvas;

    camera;

    #active_shader_program;
    #active_transform_matrix;


    // Constructor
    constructor(canvasId = "gl-canvas") {
        // gl init kismi
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas element with id '${canvasId}' not found!`);
        this.gl = this.canvas.getContext("webgl2");
        if ( !this.gl ) { alert( "WebGL isn't available" ); }
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport( 0, 0, this.canvas.width, this.canvas.height );

        this.gl.clearColor( 0.1, 0.1, 0.1, 1.0 );
        this.gl.enable(this.gl.DEPTH_TEST);

        this.camera = new Camera();
        this.camera.updateAspect( this.canvas.width/this.canvas.height);
    }


    // initshadera kod yolunu veriyorsun
    // hardcode'dan calinti
    async addShaders(shaderName, vertexShaderSource, fragmentShaderSource, shaderFunction, shaderInit) {
        var vertexShaderText = await readFile(vertexShaderSource);
        var fragmentShaderText = await readFile(fragmentShaderSource);
        if (!vertexShaderText || !fragmentShaderText) return null;

        const vertexShader = this.gl.createShader( this.gl.VERTEX_SHADER );
        this.gl.shaderSource( vertexShader, vertexShaderText );
        this.gl.compileShader( vertexShader );
        if ( !this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS) ) {
            var msg = "Vertex shader failed to compile.  The error log is:"
                + "<pre>" + this.gl.getShaderInfoLog( vertexShader ) + "</pre>";
            alert( msg );
            return null;
        }
        
        const fragmentShader = this.gl.createShader( this.gl.FRAGMENT_SHADER );
        this.gl.shaderSource( fragmentShader, fragmentShaderText );
        this.gl.compileShader( fragmentShader );
        if ( !this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS) ) {
            var msg = "Fragment shader failed to compile.  The error log is:"
                + "<pre>" + this.gl.getShaderInfoLog( fragmentShader ) + "</pre>";
            alert( msg );
            return null;
        }

        const program = this.gl.createProgram();
        this.gl.attachShader( program, vertexShader );
        this.gl.attachShader( program, fragmentShader );
        this.gl.linkProgram( program );

        if ( !this.gl.getProgramParameter(program, this.gl.LINK_STATUS) ) {
            var msg = "Shader program failed to link.  The error log is:"
                + "<pre>" + this.gl.getProgramInfoLog( program ) + "</pre>";
            alert( msg );
            return -1;
        }

        //shader programi adam akilli compile edildi
        this.#shader_programs.push({name:shaderName, program: program, shaderFunction:shaderFunction, shaderInit: shaderInit});

        return this.#shader_programs[this.#shader_programs.length-1].program;
    }

    getShader(name){
        if(name === undefined) return this.#shader_programs;
        for (let i = 0; i < this.#shader_programs.length; i++) {
            const element = this.#shader_programs[i];
            if(element.name === name) return element;
        }
        console.error("Aranan shader bulunamadi!!!\nthis.#shader_programs.length = ", this.#shader_programs.length);
        return null;
    }

    addMeshToScene(mesh){
        if(!(mesh instanceof Mesh)){
            console.log("Kardesim bu arkadas Mesh() classindan degil");
            return;
        }

        //TODO: burada shaderInit calistirdik, bakacaaaaazzzzz
        // edit: calisiiyor
        this.#active_shader_program = this.getShader(mesh.shader_name);
        this.gl.useProgram(this.#active_shader_program.program);
        this.#active_shader_program.shaderInit(mesh.getFaces(), mesh.getNormals(), mesh.getTexturePoints(), mesh);

        this.#scene.push(mesh);
    }

    getMeshFromScene(meshname){
        for (let i = 0; i < this.#scene.length; i++) {
            const element = this.#scene[i];
            if(element.name === meshname) return element;
        }
        console.error("Aranan mesh bulunamadi!!!");
        return null;
    }

    getActiveShaderProgram(){
        return this.#active_shader_program;
    }

    getActiveTransformMatrix(){
        return this.#active_transform_matrix;
    }

    #drawMesh(mesh){
        if(!(mesh instanceof Mesh)){
            console.error("drawMesh(): verilen parametre Mesh degil!!!");
            return;
        }

        const materialFaceMap = mesh.getMaterialFaceMap();
        for (let i = 0; i < materialFaceMap.length; i++) {
            let material = materialFaceMap[i];
            let index = material.face_index;

            let count;
            if(i === materialFaceMap.length-1) count = mesh.getFaces().length/3 - index;
            else count = materialFaceMap[i+1].face_index - index;

            let shader = this.#active_shader_program;
            //TODO: get transform degiscek ama once transform test edilmeli
            this.#active_transform_matrix = mesh.getTransform();

            // shader.shaderFunction(mesh, _material, index, count);
            // console.log(shader);
            shader.shaderFunction(mesh, material, index, count);
        }
    }

    drawScene(){
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        for (let i = 0; i < this.#scene.length; i++) {
            const mesh = this.#scene[i];
            if(this.#active_shader_program.name !== mesh.shader_name) {
                this.#active_shader_program = this.getShader(mesh.shader_name);
                // this.gl.linkProgram( this.#active_shader_program.program );
                this.gl.useProgram( this.#active_shader_program.program );
            }
            // console.log(this.#active_transform_matrix, "\n", this.#active_shader_program );
            this.#drawMesh(mesh);
        }
    }
}