/*

bu otomatige baglayip JSON objesi olusturabiliyormus
sonra buna bak

let keys = ["name", "age", "city"];
let values = ["John", 30, "New York"];

let obj = keys.reduce((acc, key, index) => {
    acc[key] = values[index];
    return acc;
}, {});


material okunurken face index ve shaderfunction name eklenmiyor
load objde onu ekleyecek sekilde guncellemek gerekiyor
*/

async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;

        img.onload = () => {
            //console.log('Image loaded:', img.complete, "\n", src);
            resolve(img); // Resolve the promise with the loaded image
        };

        img.onerror = (err) => {
            console.error('Failed to load image:', src);
            reject(err); // Reject the promise with the error
        };
    });
}

async function loadMaterial(src) {
    
    let folder = src.substring(0, src.lastIndexOf('/')+1);
    let _material_list = [];

    const mt_response = await fetch(src);
    if(!mt_response.ok) {
        console.log('Material:', src, 'not found!!!');
        return;
    }

    const material_text = await mt_response.text();
    const material_lines = material_text.split('\n');

    const mat = {
        face_index: 0,
        mat_name: "",
        // shader_name: "default",

        Ns:0,
        Ka:[],
        Kd:[],
        Ks:[],
        texture_points:[],
        texture: "",
        normalMap: ""
    };
    for (let line of material_lines) {
        if(line.startsWith('newmtl ')) {
            _material_list.push(Object.assign({}, mat));
            _material_list[_material_list.length - 1].mat_name = line.split(' ')[1];
        }
        else if(line.startsWith('map_Kd ')) {
            let i = 'map_Kd'.length;
            for (;line[i] === ' '; i++);
            line = line.replaceAll(/\\+/g, "/");
            
            
            // _material_list[_material_list.length - 1].texture = folder + line.substring(i);
            _material_list[_material_list.length - 1].texture = await loadImage(folder + line.substring(i));
            // console.log(_material_list[_material_list.length - 1].name, "\n", _material_list[_material_list.length - 1].texture);
        }
        else if(line.startsWith('map_Bump ')) {
            let i = 'map_Bump'.length;
            for (;line[i] === ' '; i++);
            line = line.replaceAll(/\\+/g, "/");

            
            // _material_list[_material_list.length - 1].normalMap = folder + line.substring(i);
            _material_list[_material_list.length - 1].normalMap = await loadImage(folder + line.substring(i));
            // console.log(_material_list[_material_list.length - 1].name, "\n", _material_list[_material_list.length - 1].normalMap);
        }
        else if(line.startsWith('Ns ')) {
            _material_list[_material_list.length - 1].Ns = parseFloat(line.split(' ')[1]);
        }
        else if(line.startsWith('Ka ')) {
            _material_list[_material_list.length - 1].Ka = [parseFloat(line.split(' ')[1]), parseFloat(line.split(' ')[2]), parseFloat(line.split(' ')[3])];
        }
        else if(line.startsWith('Kd ')) {
            _material_list[_material_list.length - 1].Kd = [parseFloat(line.split(' ')[1]), parseFloat(line.split(' ')[2]), parseFloat(line.split(' ')[3])];
        }
        else if(line.startsWith('Ks ')) {
            _material_list[_material_list.length - 1].Ks = [parseFloat(line.split(' ')[1]), parseFloat(line.split(' ')[2]), parseFloat(line.split(' ')[3])];
        }
    }
    return _material_list;
}

async function loadOBJ(file_path) {
    const response = await fetch(file_path);
    const data = await response.text();

    const vertices = [];
    const _faces = [];
    const normal_list = [];
    const _normals = [];
    const texture_point_list = [];
    const _texture_points = [];
    const _faces_by_index = []; // New field for ConvexPolyhedron face indices

    let _material_list = [];
    const _material_face_map = [];

    const lines = data.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('mtllib ')) {
            var folder = file_path.substring(0, file_path.lastIndexOf('/')+1);
            var material_path = folder + line.split(' ')[1];
            _material_list = await loadMaterial(material_path);
        }
        else if (line.startsWith('v ')) {
            const parts = line.split(' ');
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);
            vertices.push(x, y, z);
        }
        else if (line.startsWith('vn ')) {
            const parts = line.split(' ');
            const i = parseFloat(parts[1]);
            const j = parseFloat(parts[2]);
            const k = parseFloat(parts[3]);
            normal_list.push(i, j, k);
        }
        else if (line.startsWith('vt ')) {
            const parts = line.split(' ');
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            texture_point_list.push(x, y);
        }
        else if (line.startsWith('f ')) {
            const parts = line.split(' ');

            const vertexIndices = parts.slice(1).map(p => parseInt(p.split('/')[0]) - 1);
            
            if (vertexIndices.length === 3) {
                // Triangle face
                _faces_by_index.push(vertexIndices); // Add face indices for ConvexPolyhedron
            } else if (vertexIndices.length === 4) {
                // Quad face, split into two triangles
                _faces_by_index.push([vertexIndices[0], vertexIndices[1], vertexIndices[2]]);
                _faces_by_index.push([vertexIndices[0], vertexIndices[2], vertexIndices[3]]);
            }

            const v1 = parseInt(parts[1]) - 1;
            const v2 = parseInt(parts[2]) - 1;
            const v3 = parseInt(parts[3]) - 1;
            const vt1 = parseInt(parts[1].split("/")[1]) - 1;
            const vt2 = parseInt(parts[2].split("/")[1]) - 1;
            const vt3 = parseInt(parts[3].split("/")[1]) - 1;
            const vn1 = parseInt(parts[1].split("/")[2]) - 1;
            const vn2 = parseInt(parts[2].split("/")[2]) - 1;
            const vn3 = parseInt(parts[3].split("/")[2]) - 1;

            //abc
            _faces.push(vertices[v1*3], vertices[v1*3+1], vertices[v1*3+2]);
            _faces.push(vertices[v2*3], vertices[v2*3+1], vertices[v2*3+2]);
            _faces.push(vertices[v3*3], vertices[v3*3+1], vertices[v3*3+2]);

            _normals.push(normal_list[vn1*3], normal_list[vn1*3+1], normal_list[vn1*3+2]);
            _normals.push(normal_list[vn2*3], normal_list[vn2*3+1], normal_list[vn2*3+2]);
            _normals.push(normal_list[vn3*3], normal_list[vn3*3+1], normal_list[vn3*3+2]);

            _texture_points.push(texture_point_list[vt1*2], texture_point_list[vt1*2+1]);
            _texture_points.push(texture_point_list[vt2*2], texture_point_list[vt2*2+1]);
            _texture_points.push(texture_point_list[vt3*2], texture_point_list[vt3*2+1]);

            if(parts.length === 5) {
                const v4 = parseInt(parts[4]) - 1;
                const vt4 = parseInt(parts[4].split("/")[1]) - 1;
                const vn4 = parseInt(parts[4].split("/")[2]) - 1;
                //acd
                _faces.push(vertices[v1*3], vertices[v1*3+1], vertices[v1*3+2]);
                _faces.push(vertices[v3*3], vertices[v3*3+1], vertices[v3*3+2]);
                _faces.push(vertices[v4*3], vertices[v4*3+1], vertices[v4*3+2]);

                _normals.push(normal_list[vn1*3], normal_list[vn1*3+1], normal_list[vn1*3+2]);
                _normals.push(normal_list[vn3*3], normal_list[vn3*3+1], normal_list[vn3*3+2]);
                _normals.push(normal_list[vn4*3], normal_list[vn4*3+1], normal_list[vn4*3+2]);

                _texture_points.push(texture_point_list[vt1*2], texture_point_list[vt1*2+1]);
                _texture_points.push(texture_point_list[vt3*2], texture_point_list[vt3*2+1]);
                _texture_points.push(texture_point_list[vt4*2], texture_point_list[vt4*2+1]);
            }
        }
        else if (line.startsWith('usemtl ')) {
            let mtl_name = line.substring('usemtl '.length);
            let material = null;
            for (let i = 0; i < _material_list.length; i++) {
                if(_material_list[i].mat_name === mtl_name){
                    material = _material_list[i];
                    break;
                }
            }
            if(material === null) return null;
            // material.shader_name = shader_name;
            material.face_index = _faces.length/3;
            
            _material_face_map.push(Object.assign({}, material));
        }
    }
    if(_material_face_map.length !== 0){
        let element1;
        let element2 = _material_face_map[0];
        for (let i = 0; i < _material_face_map.length-1; i++) {
            element1 = _material_face_map[i];
            element2 = _material_face_map[i+1];
            element1.texture_points = new Float32Array(_texture_points.slice(element1.face_index*2, element2.face_index*2));
        }
        element2.texture_points = new Float32Array(_texture_points.slice(element2.face_index*2));
    }
    // console.log("_faces", _faces.length, "\n_material_face_map: ", _material_face_map, "\n_material_list: ", _material_list);

    return {vertices, _faces, _normals, _texture_points, _material_list, _material_face_map, _faces_by_index};
}