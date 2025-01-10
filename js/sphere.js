function generateSphere(radius, latitudes, longitudes) {
    const vertices = [];
    const _faces = [];
    const _normals = [];
    const _uv = [];

    // Angle step for latitude and longitude
    const latStep = Math.PI / latitudes;  // latitude angle step
    const lonStep = 2 * Math.PI / longitudes;  // longitude angle step

    // Generate vertices and normals
    for (let i = 0; i <= latitudes; i++) {
        const phi = i * latStep;  // Latitude angle (from 0 to pi)
        for (let j = 0; j <= longitudes; j++) {
            const theta = j * lonStep;  // Longitude angle (from 0 to 2*pi)
            
            // Calculate the x, y, z position of the vertex
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            // Push the vertex to the array
            vertices.push({pos:[x,y,z], uv:[j/longitudes, i/latitudes]});
        }
    }

    // Generate indices for the triangles
    for (let i = 0; i < latitudes; i++) {
        for (let j = 0; j < longitudes; j++) {
            const first  = vertices[i * (longitudes + 1) + j];
            const second = vertices[(i+1) * (longitudes + 1) + j];
            const third  = vertices[i * (longitudes + 1) + j + 1]
            const forth  = vertices[(i+1) * (longitudes + 1) + j + 1];

            _faces.push(...first.pos, ...second.pos, ...third.pos);
            _faces.push(...second.pos, ...forth.pos, ...third.pos);
            _normals.push(...first.pos, ...second.pos, ...third.pos);
            _normals.push(...second.pos, ...forth.pos, ...third.pos);
            _uv.push(...first.uv, ...second.uv, ...third.uv);
            _uv.push(...second.uv, ...forth.uv, ...third.uv);
        }
    }
    for (let k = 0; k < _normals.length; k++) {
        _normals[k] = _normals[k] / radius;
    }

    return {
        faces: _faces,
        normals: _normals,
        uv: _uv
    };
}
