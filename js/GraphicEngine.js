
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
    
    rotateCamera(theta, phi) {
        // 1) Compute the current forward direction from camera_position → lookat_position
        let forward = subtract(this.#lookat_position, this.#camera_position); 
        // optional: store the current length (distance) so we can preserve how far in front the lookat is
        const distance = length(forward);
        forward = normalize(forward);
        // console.log(1)
    
        // 2) Compute a right and up vector
        //     - up = (0, 1, 0) in world space 
        //       or your current camera’s up if you want more advanced rolling.
        let right = cross(this.#up, forward);
        right = normalize(right);
        // console.log(2)
    
        // 3) Rotate forward by yaw (theta) around the world up OR the camera’s up 
        //    - Yaw affects turning left/right.
        //    - If you want the camera to roll with the up vector, 
        //      rotate around "this.#up"; if you want absolute world up, use [0,1,0].
        
        //    rotation around up axis (yaw)
        let cosTheta = Math.cos(theta);
        let sinTheta = Math.sin(theta);
        // forward' = forward*cos(theta) + right*sin(theta)
        let forwardAfterYaw = add(
           scale( cosTheta, forward),
           scale(sinTheta, right)
        );
        forwardAfterYaw = normalize(forwardAfterYaw);
        // console.log(3)
    
        // 4) Recompute right now that forward changed
        right = cross(this.#up, forwardAfterYaw);
        right = normalize(right);
        // console.log(4)
    
        // 5) Rotate forwardAfterYaw by pitch (phi) around the right axis
        //    - Pitch affects looking up/down.
        let cosPhi = Math.cos(phi);
        let sinPhi = Math.sin(phi);
    
        // Decompose forwardAfterYaw into horizontal part and vertical part.
        // Or simply rotate around the right vector.
        // forward'' = forwardAfterYaw*cos(phi) + (upComponent)*sin(phi)
        // where upComponent is cross(forwardAfterYaw, right). 
        // But we can do a standard axis-angle rotation around right axis:
        let upComp = cross(right, forwardAfterYaw); 
        let forwardFinal = add(
           scale(cosPhi, forwardAfterYaw),
           scale(sinPhi, upComp)
        );
        forwardFinal = normalize(forwardFinal);
        // console.log(5)
        // 6) Multiply forwardFinal by distance to maintain the same lookat distance
        forwardFinal = scale(distance, forwardFinal);
        // console.log(6)
        // 7) Update the camera’s lookAt to be camera position + rotated forward
        this.#lookat_position = add(this.#camera_position, forwardFinal);
        // console.log(7)
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


    getViewPoint(distance = 10) {
        // Get the view direction vector (normalized)
        let viewDir = subtract(this.#lookat_position, this.#camera_position);
        viewDir = normalize(viewDir);
        
        // Calculate point at specified distance along view direction
        const viewPoint = add(this.#camera_position, scale(distance, viewDir));
        
        return viewPoint;
    }
}

class Light{
    static AMBIENT = 0;
    static POINT = 1;
    static SPOT = 2;

    #name = null;
    #type = null;            //AMBIENT | SPOT | POINT
    #light_ambient   = null; // ambient
    #light_diffuse   = null; // spot ve point
    #light_specular  = null; // spot ve point
    #light_shininess = null; // spot ve point
    #position = null;        // spot ve point
    #target   = null;        // spot
    #cutoff   = null;        // spot

    constructor(type, name){
        if (type === undefined || name === undefined) {
            throw new Error("Light constructor(type, name): type and name field can not be left undefined!!!");
        }
        if(type<0 || type>2){
            throw new Error("Light constructor(type, name): type field does not represent a light type!!!\nAvailable types: Light.AMBIENT=0, Light.POINT=1, Light.SPOT=2");    
        }
        this.#name = name;
        this.#type = type;

        if(this.#type === Light.AMBIENT){
            this.setAmbient();
        }
        else{
            if(this.#type === Light.SPOT){
                this.setTarget(1.0/3.0, -1.0/3.0, 1.0/3.0)
                this.setCutoffAngle();
            }
            //this.#type === POINT
            this.setPosition();
            this.setDiffuse();
            this.setSpecular();
            this.setShininess();
        }
    }

    // #region Get & Set
    getName(){
        return this.#name;
    }

    getType(){
        return this.#type;
    }
    
    getAmbient(){
        return this.#light_ambient;
    }

    setAmbient(r=0.1, g=0.1, b=0.1){
        if(this.#type !== Light.AMBIENT) {
            console.log("Only Ambient type light's can be ambient set!!!\nlight.#type = ", this.getType());
            return;
        }
        r = Math.max(0.0, Math.min(1.0, r));
        g = Math.max(0.0, Math.min(1.0, g));
        b = Math.max(0.0, Math.min(1.0, b));
        this.#light_ambient = vec3(r, g, b);
    }

    getDiffuse(){
        return this.#light_diffuse;
    }

    setDiffuse(r=1.0, g=1.0, b=1.0){
        if(this.#type === Light.AMBIENT){
            console.log("Only Spot and Point type light's diffuse can be set!!!\nlight.#type = ", this.getType());
            return;
        }
        r = Math.max(0.0, Math.min(1.0, r));
        g = Math.max(0.0, Math.min(1.0, g));
        b = Math.max(0.0, Math.min(1.0, b));
        this.#light_diffuse = vec3(r, g, b);
    }

    getSpecular(){
        return this.#light_specular;
    }

    setSpecular(r=0.5, g=0.5, b=0.5){
        if(this.#type === Light.AMBIENT){
            console.log("Only Spot and Point type light's specular can be set!!!\nlight.#type = ", this.getType());
            return;
        }
        r = Math.max(0.0, Math.min(1.0, r));
        g = Math.max(0.0, Math.min(1.0, g));
        b = Math.max(0.0, Math.min(1.0, b));
        this.#light_specular = vec3(r, g, b);
    }

    getShininess(){
        return this.#light_shininess;
    }

    setShininess(Ns=32){
        if(this.#type === Light.AMBIENT){
            console.log("Only Spot and Point type light's shininess can be set!!!\nlight.#type = ", this.getType());
            return;
        }
        Ns = Math.max(0.0, Ns);
        this.#light_shininess = Ns;
    }


    getPosition(){
        return this.#position;
    }

    setPosition(x=0, y=0, z=0){
        if(this.#type === Light.AMBIENT){
            console.log("Only Spot and Point type light's position can be set!!!\nlight.#type = ", this.getType());
            return;
        }
        this.#position = vec3(x, y, z);
    }

    getTarget(){
        return this.#target;
    }

    setTarget(x=0, y=0, z=0){
        if(this.#type !== Light.SPOT){
            console.log("Only Spot type light's target can be set!!!\nlight.#type = ", this.getType());
            return;
        }
        this.#target = vec3(x, y, z);
    }

    getCutoffAngle(){
        return this.#cutoff;
    }

    setCutoffAngle(angleRad = Math.PI/4){
        if(this.#type !== Light.SPOT){
            console.log("Only Spot type light's cutoff angle can be set!!!\nlight.#type = ", this.getType());
            return;
        }
        this.#cutoff = angleRad;
    }

    // #endregion

}

class LightGroup{
    #max_cap = 5;
    #group = [];

    addLight(light){
        if(!(light instanceof Light)){
            console.error("Given parameter is not an instance of Light Class!!!");
            return;
        }
        if(this.#group.length >= this.#max_cap){
            console.error("LightGroup capacity is full!!!\nthis.#max_cap = ", this.#max_cap);
            return;
        }
        if(this.getAmbientCount() >= 1 && light.getType()===Light.AMBIENT){
            console.error("There is already an ambient light in group.\nOnly one ambient type light can affect per object!!!");
            return;
        }
        if(this.#group.includes(light)){
            console.error("This light is already included in!!!");
            return;
        }
        if(this.getLightByName(light.getName()) !== null){
            console.error("There is already a light included with the same name:", light.getName());
            return;
        }
        this.#group.push(light);
    }

    getAmbientCount(){
        let count = 0;
        for (let i = 0; i < this.#group.length; i++) {
            const light = this.#group[i];
            if(light.getType() === Light.AMBIENT) count++;
        }
        return count;
    }

    getLightByName(name=""){
        for (let i = 0; i < this.#group.length; i++) {
            const light = this.#group[i];
            if(light.getName() === name) return light;
        }
        return null;
    }

    removeLightByName(name=""){
        for (let i = 0; i < this.#group.length; i++) {
            const light = this.#group[i];
            if(light.getName() === name) {
                this.#group.splice(i, 1);
                return;
            }
        }
    }

    removeLight(light){
        if(!(light instanceof Light)){
            console.error("Given parameter is not an instance of Light Class!!!");
            return;
        }

        let index = this.#group.indexOf(light);
        if(index!==-1){
            this.#group.splice(index, 1);
        }
    }
    
    getAllLights(){
        return this.#group;
    }
}

class Mesh {
    name = "default-mesh";
    shader_name = "default";
    #transform_matrix;
    x=0; y=0; z=0;
    rx=0; ry=0; rz=0;
    sx=1; sy=1; sz=1;
    #width=0;
    #height=0;
    #length=0;

    #faces = undefined; //vec3, Float32Array()
    #normals = undefined; //vec3, Float32Array()
    #texture_points = undefined; //vec3, Float32Array()
    #material_facemap = []; // [{face_index:  mat_name:}, ...]
    light_container;
    VBO_container= {};

    color = [1,1,1,1];

    //TODO: add setler this#transform_matrix'i guncelliyor ama
    // rotasyon hatali, bakmak lazim
    /*rotation fixed in app.js*/
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
        this.rx+=nx;
        this.ry+=ny;
        this.rz+=nz;
        let result = new Float32Array([
            this.sx, 0, 0, 0,
            0, this.sy, 0, 0,
            0, 0, this.sz, 0,
            0, 0, 0, 1
        ]);
        if(this.rx !== 0){
            let rotx = new Float32Array([
                1, 0, 0, 0,
                0, Math.cos(this.rx), -Math.sin(this.rx), 0,
                0, Math.sin(this.rx), Math.cos(this.rx), 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(rotx, result);
        }
        if(this.ry !== 0){
            let roty = new Float32Array([
                Math.cos(this.ry), 0, Math.sin(this.ry), 0,
                0, 1, 0, 0,
                -Math.sin(this.ry), 0, Math.cos(this.ry), 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(roty, result);
        }
        if(this.rz !== 0){
            let rotz = new Float32Array([
                Math.cos(this.rz), -Math.sin(this.rz), 0, 0,
                Math.sin(this.rz), Math.cos(this.rz), 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            result = mult_matrix(rotz, result);
        }
        result[3] = this.x;
        result[7] = this.y;
        result[11] = this.z;
        this.#transform_matrix = result;
    };

    setRotation(nx=0, ny=0, nz=0){
        // let result = new Float32Array(this.#transform_matrix);
        let result = new Float32Array([
            this.sx,0,0,0,
            0,this.sy,0,0,
            0,0,this.sz,0,
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
        result[3] = this.x;
        result[7] = this.y;
        result[11] = this.z;

        this.#transform_matrix = result;
        this.rx=nx;
        this.ry=ny;
        this.rz=nz;
    };

    scale(sx=1, sy=1, sz=1){
        this.sx=sx;
        this.sy=sy;
        this.sz=sz;
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
        c1 = c1.map(value => value / this.sx);
        c2 = c2.map(value => value / this.sy);
        c3 = c3.map(value => value / this.sz);
        this.ry = -Math.asin(c1[2]);
        this.rz = Math.atan2(c1[1]*Math.cos(this.ry), c1[0]*Math.cos(this.ry));
        this.rx = Math.atan2(c2[2]*Math.cos(this.ry), c3[2]*Math.cos(this.ry));
        /*
            // Extract yaw (Z-axis rotation)
            const yaw = Math.atan2(R[1][0], R[0][0]);

            // Extract pitch (Y-axis rotation)
            const pitch = Math.atan2(-R[2][0], Math.sqrt(R[0][0] ** 2 + R[1][0] ** 2));

            // Extract roll (X-axis rotation)
            const roll = Math.atan2(R[2][1], R[2][2]);
        */
    }

    getDimensions(){
        return [this.#width * this.sx, this.#height * this.sy, this.#length * this.sz];
    }

    print(){
        let str = "name: " + this.name + "\n#transform_matrix: \n\t" + this.#transform_matrix.slice(0,4) + "\n\t" + this.#transform_matrix.slice(4,8) + "\n\t" + this.#transform_matrix.slice(8,12) + "\n\t" + this.#transform_matrix.slice(12) + "\nxyz: " + this.x.toString() + ", " + this.y.toString() + ", " + this.z.toString() +
        "\nrx/ry/rz: " + this.rx.toString() + ", " + this.ry.toString() + ", " + this.rz.toString() + "\nsx/sy/sz: " + 
        this.sx.toString() + ", " + this.sy.toString() + ", " + this.sz.toString();
        console.log(str, "\n#faces: ", this.#faces, "\n#normals: ", this.#normals, "\n#material_list: ", this.#material_facemap);
    }

    updateVBO(new_shader_init){
        new_shader_init(this.#faces, this.#normals, this.#texture_points, this);
    }

    constructor(_name, _shader_name, _faces, _normals, _texture_points, _material_facemap) {
        this.name = _name;
        this.shader_name = _shader_name;
        this.light_container = new LightGroup();
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

            let minx=0, maxx=0;
            let miny=0, maxy=0;
            let minz=0, maxz=0;
            for (let i = 0; i < this.#faces.length; i+=3) {
                this.#faces[i];
                if(this.#faces[i] < minx) minx = this.#faces[i];
                else if(this.#faces[i] > maxx) maxx = this.#faces[i];
                if(this.#faces[i+1] < miny) miny = this.#faces[i+1];
                else if(this.#faces[i+1] > maxy) maxy = this.#faces[i+1];
                if(this.#faces[i+2] < minz) minz = this.#faces[i+2];
                else if(this.#faces[i+2] > maxz) maxz = this.#faces[i+2];
            }
            console.log("name: ", this.name, "\nmaxx: ", maxx, ", minx: ", minx, "\nmaxy: ", maxy, ", miny: ", miny, "\nmaxz: ", maxz, ", minz: ", minz);
            this.#width = maxx-minx;
            this.#height = maxy-miny;
            this.#length = maxz-minz;
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
    }
}

class Engine {
    #scene = [];
    #shader_programs = []; //{name, program, shaderFunction, shaderInit}
    gl;
    canvas;

    camera;

    #active_shader_program;


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

        this.gl.clearColor( 0.882, 0.973, 0.863, 1.0 );
        this.gl.enable(this.gl.DEPTH_TEST);
        // this.gl.enable(this.gl.BLEND);
        // this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

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

    getScene() {
        return this.#scene;
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