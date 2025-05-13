import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class SceneRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        
        // Use orthographic camera for isometric view
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 50;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.terrain = null;
        this.objects = [];
        
        this.init();
    }
    
    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        // Setup camera for isometric view
        this.camera.position.set(50, 50, 50);
        this.camera.lookAt(0, 0, 0);
        
        // Setup controls with isometric constraints
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableRotate = true;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 200;
        
        // Lock rotation to isometric angles
        this.controls.addEventListener('change', () => {
            const position = this.camera.position;
            const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
            const angle = Math.atan2(position.y, position.x);
            
            // Snap to isometric angles
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            this.camera.position.x = distance * Math.cos(snapAngle);
            this.camera.position.y = distance * Math.sin(snapAngle);
            this.camera.position.z = distance * 0.5;
            this.camera.lookAt(0, 0, 0);
        });
        
        // Setup lighting for isometric view
        this.setupLighting();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun) for isometric view
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }
    
    async loadScene(sceneData) {
        console.log('Loading scene data:', sceneData);
        
        // Clear existing scene
        this.clearScene();
        
        try {
            // Create terrain
            if (!sceneData.terrain) {
                throw new Error('Terrain data is missing from scene data');
            }
            
            const terrainData = sceneData.terrain;
            if (!terrainData.height_map || !terrainData.size) {
                throw new Error('Terrain data is missing required fields (height_map or size)');
            }
            
            console.log('Creating terrain...');
            await this.createTerrain(terrainData);
            
            // Place features and props
            if (sceneData.features && Array.isArray(sceneData.features)) {
                console.log('Placing features...');
                await this.placeObjects(sceneData.features, 'Features');
            }
            
            if (sceneData.props && Array.isArray(sceneData.props)) {
                console.log('Placing props...');
                await this.placeObjects(sceneData.props, 'Props');
            }
            
            // Setup navigation
            if (sceneData.navigation && sceneData.navigation.nav_mesh) {
                console.log('Setting up navigation...');
                this.setupNavigation(sceneData.navigation);
            }
            
            // Adjust camera to scene size
            if (sceneData.metadata && sceneData.metadata.world_size) {
                console.log('Adjusting camera...');
                this.adjustCamera(sceneData.metadata);
            }
            
            console.log('Scene loaded successfully');
        } catch (error) {
            console.error('Error loading scene:', error);
            throw error;
        }
    }
    
    clearScene() {
        // Remove terrain
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain = null;
        }
        
        // Remove objects
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];
    }
    
    async createTerrain(terrainData) {
        console.log('Creating terrain with data:', terrainData);
        
        // Create geometry with proper 2.5D dimensions
        const geometry = new THREE.PlaneGeometry(
            terrainData.size.width,
            terrainData.size.height,
            terrainData.size.width - 1,
            terrainData.size.height - 1
        );
        
        // Apply height map with proper 2.5D scaling
        const vertices = geometry.attributes.position.array;
        const heightMap = terrainData.height_map;
        const maxHeight = Math.max(...heightMap.flat()) * terrainData.height_scale;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = Math.floor((vertices[i] + terrainData.size.width / 2) / terrainData.size.width * heightMap[0].length);
            const z = Math.floor((vertices[i + 2] + terrainData.size.height / 2) / terrainData.size.height * heightMap.length);
            
            // Ensure x and z are within bounds
            const safeX = Math.min(Math.max(x, 0), heightMap[0].length - 1);
            const safeZ = Math.min(Math.max(z, 0), heightMap.length - 1);
            
            // Scale height for 2.5D effect
            vertices[i + 1] = heightMap[safeZ][safeX] * terrainData.height_scale * 0.5;
        }
        geometry.computeVertexNormals();
        
        // Create material with default color
        const material = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2,
            flatShading: true // Add flat shading for 2.5D look
        });
        
        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);
        
        // Apply textures if available
        if (terrainData.texture_layers && terrainData.texture_layers.length > 0) {
            try {
                await this.applyTerrainTextures(terrainData.texture_layers);
            } catch (error) {
                console.warn('Failed to apply terrain textures, using default material:', error);
            }
        }
    }
    
    async applyTerrainTextures(textureLayers) {
        // Default colors for different terrain types
        const defaultColors = {
            water: 0x0077be,
            sand: 0xc2b280,
            grass: 0x355e3b,
            mountain: 0x808080
        };
        
        const materials = [];
        
        for (const layer of textureLayers) {
            try {
                const texture = await this.loadTexture(layer.name);
                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.8,
                    metalness: 0.2
                });
                materials.push(material);
            } catch (error) {
                console.warn(`Failed to load texture for ${layer.name}, using default color`);
                const color = defaultColors[layer.name.toLowerCase()] || 0x808080;
                const material = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.8,
                    metalness: 0.2
                });
                materials.push(material);
            }
        }
        
        // Apply materials based on height
        const vertices = this.terrain.geometry.attributes.position.array;
        const colors = new Float32Array(vertices.length);
        
        for (let i = 0; i < vertices.length; i += 3) {
            const height = vertices[i + 1];
            let materialIndex = 0;
            
            for (let j = 0; j < textureLayers.length; j++) {
                if (height > textureLayers[j].threshold) {
                    materialIndex = j;
                }
            }
            
            const color = materials[materialIndex].color;
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        this.terrain.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    
    async loadTexture(name) {
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                `textures/${name.toLowerCase()}.jpg`,
                texture => resolve(texture),
                undefined,
                error => {
                    console.warn(`Failed to load texture ${name}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    async placeObjects(objects, parentName) {
        const parent = new THREE.Group();
        parent.name = parentName;
        this.scene.add(parent);
        this.objects.push(parent);
        
        for (const obj of objects) {
            try {
                // Create 2.5D object
                let geometry;
                if (obj.type === 'tree') {
                    geometry = new THREE.ConeGeometry(0.5, 2, 4);
                } else if (obj.type === 'rock') {
                    geometry = new THREE.DodecahedronGeometry(0.5);
                } else if (obj.type === 'building') {
                    geometry = new THREE.BoxGeometry(1, 2, 1);
                } else {
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                }
                
                const material = new THREE.MeshStandardMaterial({
                    color: obj.color || 0x808080,
                    roughness: 0.8,
                    metalness: 0.2,
                    flatShading: true
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Position in 2.5D space
                mesh.position.set(
                    obj.position.x,
                    obj.position.y,
                    obj.position.z
                );
                
                if (obj.rotation) {
                    mesh.rotation.set(
                        obj.rotation.x,
                        obj.rotation.y,
                        obj.rotation.z
                    );
                }
                
                if (obj.scale) {
                    mesh.scale.set(
                        obj.scale.x,
                        obj.scale.y,
                        obj.scale.z
                    );
                }
                
                parent.add(mesh);
            } catch (error) {
                console.warn(`Failed to place object:`, error);
            }
        }
    }
    
    setupNavigation(navData) {
        if (!navData.nav_mesh) return;
        
        // Create navigation mesh visualization
        const geometry = new THREE.PlaneGeometry(
            navData.nav_mesh[0].length,
            navData.nav_mesh.length,
            navData.nav_mesh[0].length - 1,
            navData.nav_mesh.length - 1
        );
        
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        
        const navMesh = new THREE.Mesh(geometry, material);
        navMesh.rotation.x = -Math.PI / 2;
        navMesh.position.y = 0.1;
        this.scene.add(navMesh);
        this.objects.push(navMesh);
    }
    
    adjustCamera(metadata) {
        const size = Math.max(metadata.world_size.width, metadata.world_size.height);
        this.camera.position.set(size, size, size);
        this.camera.lookAt(size/2, 0, size/2);
        this.controls.target.set(size/2, 0, size/2);
    }
    
    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 50;
        
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
} 