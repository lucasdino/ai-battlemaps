import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import axios from 'axios';
import './TerrainGenerator.css';
import CONFIG from '../config';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Enhanced terrain material with better shading and effects
function TerrainMaterial({ biome, water, vegetation }) {
    const [textures, setTextures] = useState({});
    
    useEffect(() => {
        // Load textures based on biome
        const loadTextures = async () => {
            const textureLoader = new THREE.TextureLoader();
            const baseTexture = await textureLoader.loadAsync(`/textures/${biome.type}/base.jpg`);
            const normalMap = await textureLoader.loadAsync(`/textures/${biome.type}/normal.jpg`);
            const roughnessMap = await textureLoader.loadAsync(`/textures/${biome.type}/roughness.jpg`);
            
            setTextures({ baseTexture, normalMap, roughnessMap });
        };
        
        loadTextures();
    }, [biome]);

    return (
        <meshStandardMaterial
            map={textures.baseTexture}
            normalMap={textures.normalMap}
            roughnessMap={textures.roughnessMap}
            normalScale={[0.5, 0.5]}
            roughness={0.7}
            metalness={0.1}
            envMapIntensity={0.5}
        />
    );
}

// Water material with reflections and transparency
function WaterMaterial({ water }) {
    return (
        <meshStandardMaterial
            color="#0077be"
            transparent
            opacity={0.8}
            metalness={0.9}
            roughness={0.1}
            envMapIntensity={1.0}
        />
    );
}

// Vegetation material with custom shader
function VegetationMaterial({ vegetation }) {
    return (
        <meshStandardMaterial
            color="#2d5a27"
            roughness={0.8}
            metalness={0.1}
            envMapIntensity={0.3}
        />
    );
}

// Enhanced terrain mesh with shader-based generation
function TerrainMesh({ guiParams, materialRef }) {
    const meshRef = useRef();
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.001;
        }
    });

    // Create geometry
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(10, 10, 500, 500);
        geo.deleteAttribute('uv');
        geo.deleteAttribute('normal');
        geo.rotateX(-Math.PI * 0.5);
        return geo;
    }, []);

    // Create shader material
    const material = useMemo(() => {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                noiseIterations: { value: guiParams.noiseIterations },
                positionFrequency: { value: guiParams.positionFrequency },
                warpFrequency: { value: guiParams.warpFrequency },
                warpStrength: { value: guiParams.warpStrength },
                strength: { value: guiParams.strength },
                offset: { value: new THREE.Vector2(0, 0) },
                normalLookUpShift: { value: 0.01 },
                colorSand: { value: new THREE.Color(guiParams.colorSand) },
                colorGrass: { value: new THREE.Color(guiParams.colorGrass) },
                colorSnow: { value: new THREE.Color(guiParams.colorSnow) },
                colorRock: { value: new THREE.Color(guiParams.colorRock) },
                time: { value: 0 }
            },
            vertexShader: `
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
                    // Make the terrain infinite by using modulo
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
                    
                    // Calculate elevation
                    float elevation = terrainElevation(pos.xz);
                    pos.y += elevation;
                    
                    // Calculate normal
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
            `,
            fragmentShader: `
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
                    
                    // Grass
                    float grassMix = step(-0.06, vPosition.y);
                    finalColor = mix(finalColor, colorGrass, grassMix);
                    
                    // Rock
                    float rockMix = (1.0 - step(0.5, dot(vNormal, vec3(0.0, 1.0, 0.0)))) * step(-0.06, vPosition.y);
                    finalColor = mix(finalColor, colorRock, rockMix);
                    
                    // Snow
                    float snowThreshold = snoise(vPosition.xz * 25.0) * 0.1 + 0.45;
                    float snowMix = step(snowThreshold, vPosition.y);
                    finalColor = mix(finalColor, colorSnow, snowMix);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
        
        materialRef.current = material;
        return material;
    }, [guiParams, materialRef]);

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
    );
}

function ModelInstance({ url, position, scale, isSelected, onPointerDown, onPointerUp, onPointerMove }) {
    const ref = useRef();
    const [gltf, setGltf] = useState(null);

    useEffect(() => {
        const loader = new GLTFLoader();
        loader.load(url, setGltf);
    }, [url]);

    useEffect(() => {
        if (ref.current) {
            ref.current.position.set(...position);
            ref.current.scale.set(scale, scale, scale);
        }
    }, [position, scale]);

    if (!gltf) return null;
    return (
        <primitive
            ref={ref}
            object={gltf.scene}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            style={{ cursor: isSelected ? 'move' : 'pointer' }}
        />
    );
}

function Sidebar({ models, onSelectModel, selectedModelId }) {
    return (
        <div className="model-sidebar">
            <h3>3D Models</h3>
            <div className="model-list">
                {models.map(model => (
                    <div
                        key={model.id}
                        className={`model-list-item${selectedModelId === model.id ? ' selected' : ''}`}
                        onClick={() => onSelectModel(model)}
                    >
                        <img src={model.thumbnailUrl} alt={model.displayName} style={{ width: 48, height: 48 }} />
                        <span>{model.displayName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Enhanced scene setup with better lighting and environment
function Scene({
    guiParams,
    placedModels = [],
    setPlacedModels = () => {},
    placementMode,
    setPlacementMode,
    selectedModelId,
    setSelectedModelId,
    selectedModelScale,
    setSelectedModelScale
}) {
    const { camera, scene, gl } = useThree();
    const controlsRef = useRef();
    const materialRef = useRef();
    const dragRef = useRef({
        screenCoords: new THREE.Vector2(),
        prevWorldCoords: new THREE.Vector3(),
        worldCoords: new THREE.Vector3(),
        raycaster: new THREE.Raycaster(),
        down: false,
        hover: false,
        object: null,
        getIntersect: function() {
            this.raycaster.setFromCamera(this.screenCoords, camera);
            const intersects = this.raycaster.intersectObject(this.object);
            return intersects.length ? intersects[0] : null;
        }
    });
    const [draggedModelId, setDraggedModelId] = useState(null);
    const [dragOffset, setDragOffset] = useState([0, 0, 0]);
    
    useEffect(() => {
        // Position camera
        camera.position.set(-10, 8, -2.2);
        camera.lookAt(0, 0, 0);

        // Load HDR environment map
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load('/textures/equirectangular/pedestrian_overpass_1k.hdr', (environmentMap) => {
            environmentMap.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = environmentMap;
            scene.backgroundBlurriness = 0.5;
            scene.environment = environmentMap;
        });

        // Setup drag object
        const dragObject = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10, 1, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        dragObject.rotation.x = -Math.PI * 0.5;
        scene.add(dragObject);
        dragRef.current.object = dragObject;

        // Setup event listeners
        const handlePointerMove = (event) => {
            dragRef.current.screenCoords.x = (event.clientX / window.innerWidth - 0.5) * 2;
            dragRef.current.screenCoords.y = -(event.clientY / window.innerHeight - 0.5) * 2;
        };

        const handlePointerDown = () => {
            if (dragRef.current.hover) {
                gl.domElement.style.cursor = 'grabbing';
                controlsRef.current.enabled = false;
                dragRef.current.down = true;
                dragRef.current.object.scale.setScalar(10);

                const intersect = dragRef.current.getIntersect();
                if (intersect) {
                    dragRef.current.prevWorldCoords.copy(intersect.point);
                    dragRef.current.worldCoords.copy(intersect.point);
                }
            }
        };

        const handlePointerUp = () => {
            dragRef.current.down = false;
            controlsRef.current.enabled = true;
            dragRef.current.object.scale.setScalar(1);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [camera, scene, gl]);

    useFrame(() => {
        if (dragRef.current.object) {
            dragRef.current.raycaster.setFromCamera(dragRef.current.screenCoords, camera);
            const intersects = dragRef.current.raycaster.intersectObject(dragRef.current.object);
            
            if (intersects.length) {
                dragRef.current.hover = true;
                if (!dragRef.current.down) {
                    gl.domElement.style.cursor = 'grab';
                }
            } else {
                dragRef.current.hover = false;
                gl.domElement.style.cursor = 'default';
            }

            if (dragRef.current.hover && dragRef.current.down) {
                const intersect = intersects[0];
                dragRef.current.worldCoords.copy(intersect.point);
                const delta = dragRef.current.prevWorldCoords.sub(dragRef.current.worldCoords);
                
                if (materialRef.current) {
                    materialRef.current.uniforms.offset.value.x += delta.x;
                    materialRef.current.uniforms.offset.value.y += delta.z;
                }
            }

            dragRef.current.prevWorldCoords.copy(dragRef.current.worldCoords);
        }
    });

    // Handle terrain/model click for placement and selection
    const handlePointerDown = (event) => {
        if (placementMode) {
            // Place model at intersection point
            const [x, y, z] = [event.point.x, event.point.y, event.point.z];
            setPlacedModels(models => [
                ...models,
                {
                    id: `${placementMode.id}-${Date.now()}`,
                    url: placementMode.url,
                    position: [x, y, z],
                    scale: 1
                }
            ]);
            setPlacementMode(null);
        } else {
            // Select model if clicked
            const intersected = event.intersections.find(i => i.object.userData.modelId);
            if (intersected) {
                setSelectedModelId(intersected.object.userData.modelId);
                setDraggedModelId(intersected.object.userData.modelId);
                setDragOffset([
                    intersected.point.x - intersected.object.position.x,
                    intersected.point.y - intersected.object.position.y,
                    intersected.point.z - intersected.object.position.z
                ]);
            } else {
                setSelectedModelId(null);
            }
        }
    };

    const handlePointerMove = (event) => {
        if (draggedModelId) {
            // Move the selected model
            setPlacedModels(models => models.map(m =>
                m.id === draggedModelId
                    ? { ...m, position: [event.point.x - dragOffset[0], event.point.y - dragOffset[1], event.point.z - dragOffset[2]] }
                    : m
            ));
        }
    };

    const handlePointerUp = () => {
        setDraggedModelId(null);
    };

    // GUI for scaling selected model
    useEffect(() => {
        if (!selectedModelId) return;
        const gui = new GUI();
        const selected = placedModels.find(m => m.id === selectedModelId);
        if (!selected) return;
        gui.add(selected, 'scale', 0.1, 5, 0.01).name('Scale').onChange(value => {
            setPlacedModels(models => models.map(m => m.id === selectedModelId ? { ...m, scale: value } : m));
            setSelectedModelScale(value);
        });
        return () => gui.destroy();
    }, [selectedModelId, placedModels, setPlacedModels, setSelectedModelScale]);

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[6.25, 3, 4]}
                intensity={2}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-near={0.1}
                shadow-camera-far={30}
                shadow-camera-top={8}
                shadow-camera-right={8}
                shadow-camera-bottom={-8}
                shadow-camera-left={-8}
                shadow-normalBias={0.05}
                shadow-bias={0}
            />
            <pointLight position={[-10, 10, -5]} intensity={0.5} />
            <Environment preset="sunset" />
            <Sky
                distance={450000}
                sunPosition={[0, 1, 0]}
                inclination={0}
                azimuth={0.25}
            />
            <TerrainMesh guiParams={guiParams} materialRef={materialRef} />
            <OrbitControls
                ref={controlsRef}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={0.1}
                maxDistance={50}
                maxPolarAngle={Math.PI * 0.45}
                target={[0, -0.5, 0]}
                enableDamping={true}
            />
            {(placedModels || []).map(model => (
                <ModelInstance
                    key={model.id}
                    url={model.url}
                    position={model.position}
                    scale={model.scale}
                    isSelected={selectedModelId === model.id}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                />
            ))}
        </>
    );
}

// Main TerrainGenerator component
function TerrainGenerator() {
    const [description, setDescription] = useState('');
    const [guiParams, setGuiParams] = useState({
        noiseIterations: 3,
        positionFrequency: 0.175,
        warpFrequency: 6,
        warpStrength: 1,
        strength: 10,
        heightScale: 1.0,
        colorSand: '#ffe894',
        colorGrass: '#85d534',
        colorSnow: '#ffffff',
        colorRock: '#bfbd8d'
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState([]);
    const [placementMode, setPlacementMode] = useState(null);
    const [placedModels, setPlacedModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [selectedModelScale, setSelectedModelScale] = useState(1);

    // GUI panel for fine-tuning
    useEffect(() => {
        const gui = new GUI();
        const terrainFolder = gui.addFolder('🏔️ Terrain');
        terrainFolder.add(guiParams, 'noiseIterations', 0, 10, 1).name('Noise Iterations')
            .onChange(value => setGuiParams(prev => ({ ...prev, noiseIterations: value })));
        terrainFolder.add(guiParams, 'positionFrequency', 0, 1, 0.001).name('Position Frequency')
            .onChange(value => setGuiParams(prev => ({ ...prev, positionFrequency: value })));
        terrainFolder.add(guiParams, 'strength', 0, 20, 0.001).name('Strength')
            .onChange(value => setGuiParams(prev => ({ ...prev, strength: value })));
        terrainFolder.add(guiParams, 'warpFrequency', 0, 20, 0.001).name('Warp Frequency')
            .onChange(value => setGuiParams(prev => ({ ...prev, warpFrequency: value })));
        terrainFolder.add(guiParams, 'warpStrength', 0, 2, 0.001).name('Warp Strength')
            .onChange(value => setGuiParams(prev => ({ ...prev, warpStrength: value })));
        terrainFolder.add(guiParams, 'heightScale', 0.1, 2, 0.1).name('Height Scale')
            .onChange(value => setGuiParams(prev => ({ ...prev, heightScale: value })));
        terrainFolder.addColor({ color: guiParams.colorSand }, 'color').name('Sand Color')
            .onChange(value => setGuiParams(prev => ({ ...prev, colorSand: value })));
        terrainFolder.addColor({ color: guiParams.colorGrass }, 'color').name('Grass Color')
            .onChange(value => setGuiParams(prev => ({ ...prev, colorGrass: value })));
        terrainFolder.addColor({ color: guiParams.colorSnow }, 'color').name('Snow Color')
            .onChange(value => setGuiParams(prev => ({ ...prev, colorSnow: value })));
        terrainFolder.addColor({ color: guiParams.colorRock }, 'color').name('Rock Color')
            .onChange(value => setGuiParams(prev => ({ ...prev, colorRock: value })));
        return () => gui.destroy();
    }, []);

    // Description input handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const response = await axios.post('/api/terrain/params', { description });
            setGuiParams(response.data);
        } catch (err) {
            setError('Failed to generate terrain parameters.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="terrain-generator">
            <form className="terrain-description-form" onSubmit={handleSubmit}>
                <textarea
                    className="terrain-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your terrain (e.g., 'A lush green valley with gentle hills and a river')"
                    rows={3}
                />
                <button type="submit" disabled={loading || !description.trim()}>
                    {loading ? 'Generating...' : 'Generate Terrain'}
                </button>
            </form>
            {error && <div className="error-message">{error}</div>}
            <div className="terrain-viewer">
                {guiParams && (
                    <Canvas shadows>
                        <Scene guiParams={guiParams} />
                    </Canvas>
                )}
            </div>
        </div>
    );
}

export default TerrainGenerator; 