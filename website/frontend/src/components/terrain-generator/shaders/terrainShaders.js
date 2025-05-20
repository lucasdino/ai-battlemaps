export const vertexShader = `
    uniform float noiseIterations;
    uniform float positionFrequency;
    uniform float warpFrequency;
    uniform float warpStrength;
    uniform float strength;
    uniform vec2 offset;
    uniform float normalLookUpShift;
    uniform float time;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Simplex noise functions
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
            dot(x12.zw, x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }
    
    float terrainElevation(vec2 position) {
        vec2 warpedPosition = mod(position + offset, 1000.0);
        warpedPosition += snoise(warpedPosition * positionFrequency * warpFrequency) * warpStrength;
        
        float elevation = 0.0;
        for(float i = 1.0; i <= noiseIterations; i++) {
            vec2 noiseInput = warpedPosition * positionFrequency * (i * 2.0) + i * 987.0;
            float noise = snoise(noiseInput) / ((i + 1.0) * 2.0);
            elevation += noise;
        }
        
        float elevationSign = sign(elevation);
        elevation = elevationSign * pow(abs(elevation), 2.0) * strength;
        
        return elevation;
    }
    
    void main() {
        vec3 pos = position;
        
        float elevation = terrainElevation(pos.xz);
        pos.y += elevation;
        
        vec3 neighbourA = pos + vec3(normalLookUpShift, 0.0, 0.0);
        vec3 neighbourB = pos + vec3(0.0, 0.0, -normalLookUpShift);
        
        neighbourA.y += terrainElevation(neighbourA.xz);
        neighbourB.y += terrainElevation(neighbourB.xz);
        
        vec3 toA = normalize(neighbourA - pos);
        vec3 toB = normalize(neighbourB - pos);
        vNormal = cross(toA, toB);
        
        vPosition = pos + vec3(offset.x, 0.0, offset.y);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const fragmentShader = `
    uniform vec3 colorSand;
    uniform vec3 colorGrass;
    uniform vec3 colorSnow;
    uniform vec3 colorRock;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Simplex noise functions (needed in fragment shader for snow)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
            dot(x12.zw, x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }
    
    void main() {
        vec3 finalColor = colorSand;
        
        float grassMix = step(-0.06, vPosition.y);
        finalColor = mix(finalColor, colorGrass, grassMix);
        
        float rockMix = (1.0 - step(0.5, dot(vNormal, vec3(0.0, 1.0, 0.0)))) * step(-0.06, vPosition.y);
        finalColor = mix(finalColor, colorRock, rockMix);
        
        float snowThreshold = snoise(vPosition.xz * 25.0) * 0.1 + 0.45;
        float snowMix = step(snowThreshold, vPosition.y);
        finalColor = mix(finalColor, colorSnow, snowMix);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`; 