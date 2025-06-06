import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import CONFIG from '../config';

export const createScene = (mountElement, onError) => {
  const width = mountElement.clientWidth;
  const height = mountElement.clientHeight;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#282c34');

  // Camera
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
  camera.position.set(10, 10, 10);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mountElement.appendChild(renderer.domElement);

  // OrbitControls
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.1;
  orbitControls.screenSpacePanning = true;
  orbitControls.minDistance = 1;
  orbitControls.maxDistance = 500;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1.5);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
  directionalLight.position.set(20, 30, 20);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  scene.add(directionalLight);

  // Fill lights
  const fillLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
  fillLight1.position.set(-20, 20, -20);
  scene.add(fillLight1);

  const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight2.position.set(0, 20, -30);
  scene.add(fillLight2);

  return {
    scene,
    camera,
    renderer,
    orbitControls,
    directionalLight,
    ambientLight
  };
};

export const createTransformControls = (camera, renderer, onError) => {
  try {
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.showX = true;
    transformControls.showY = true;
    transformControls.showZ = true;
    transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
    
    return transformControls;
  } catch (e) {
    if (onError) onError("Error setting up transform tools: " + e.message);
    return null;
  }
};

export const loadTerrainModel = async (terrainUrl, currentScale, onProgress) => {
  const loader = new GLTFLoader();
  const fullTerrainUrl = terrainUrl.startsWith('http') ? terrainUrl : `${CONFIG.API.BASE_URL}${terrainUrl.startsWith('/') ? '' : '/'}${terrainUrl}`;
  const finalUrl = fullTerrainUrl.includes('?') ? `${fullTerrainUrl}&cb=${Date.now()}` : `${fullTerrainUrl}?cb=${Date.now()}`;

  return new Promise((resolve, reject) => {
    if (!finalUrl || finalUrl.endsWith('undefined')) {
      reject(new Error('Invalid terrain URL provided.'));
      return;
    }

    loader.load(
      finalUrl,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(currentScale, currentScale, currentScale);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              // Convert materials for better lighting
              if (child.material.isMeshBasicMaterial) {
                const newMaterial = new THREE.MeshStandardMaterial({
                  color: child.material.color,
                  map: child.material.map,
                  emissive: child.material.color.clone().multiplyScalar(0.1),
                  emissiveIntensity: 0.1,
                  roughness: 0.8,
                  metalness: 0.0
                });
                child.material.dispose();
                child.material = newMaterial;
              } else if (child.material.isMeshPhongMaterial) {
                const newMaterial = new THREE.MeshStandardMaterial({
                  color: child.material.color,
                  map: child.material.map,
                  roughness: 0.7,
                  metalness: 0.1
                });
                child.material.dispose();
                child.material = newMaterial;
              }
              
              if (child.material.isMeshStandardMaterial) {
                child.material.metalness = Math.min(0.3, child.material.metalness);
                child.material.roughness = Math.max(0.4, child.material.roughness);
                
                const hsl = {};
                child.material.color.getHSL(hsl);
                if (hsl.l < 0.3) {
                  child.material.color.setHSL(hsl.h, hsl.s, Math.max(0.3, hsl.l));
                }
              }
            }
          }
        });

        resolve(model);
      },
      onProgress,
      reject
    );
  });
};

export const createGridHelper = (width, depth, center, terrainModel) => {
  const divisions = Math.max(10, Math.floor(Math.max(width, depth) / 2));
  const gridSize = Math.max(width, depth) * 1.2;
  
  const gridHelper = new THREE.GridHelper(gridSize, divisions, 0xffffff, 0xcccccc);
  
  // Calculate terrain surface Y position
  let terrainSurfaceY = 0;
  if (terrainModel) {
    const terrainBBox = new THREE.Box3().setFromObject(terrainModel);
    terrainSurfaceY = terrainBBox.max.y + 0.01;
  }
  
  gridHelper.position.set(center.x, terrainSurfaceY, center.z);
  gridHelper.material.opacity = 1.0;
  gridHelper.material.transparent = true;
  
  return gridHelper;
};

// Create a terrain-conforming grid that only appears on top of the actual terrain geometry
export const createTerrainConformingGrid = (terrainModel, gridDimensions = null, gridScale = 1.0) => {
  if (!terrainModel) return null;

  const raycaster = new THREE.Raycaster();
  const gridGroup = new THREE.Group();
  
  // Get terrain bounding box
  const bbox = new THREE.Box3().setFromObject(terrainModel);
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  
  // Use stored grid dimensions if available, otherwise calculate from terrain size
  let gridWidth, gridHeight;
  if (gridDimensions && gridDimensions.width && gridDimensions.height) {
    gridWidth = gridDimensions.width;
    gridHeight = gridDimensions.height;
  } else {
    // Fallback: calculate grid based on terrain size and scale
    const cellSize = gridScale || 1.0;
    gridWidth = Math.max(10, Math.round(size.x / cellSize));
    gridHeight = Math.max(10, Math.round(size.z / cellSize));
  }
  
  // Create a grid of points to test based on the desired grid dimensions
  const stepX = size.x / gridWidth;
  const stepZ = size.z / gridHeight;
  
  // Store valid grid points (points that hit the terrain)
  const validPoints = [];
  
  // Test grid points by raycasting downward
  for (let i = 0; i <= gridWidth; i++) {
    for (let j = 0; j <= gridHeight; j++) {
      const x = bbox.min.x + i * stepX;
      const z = bbox.min.z + j * stepZ;
      
      // Cast ray downward from above the terrain
      raycaster.set(
        new THREE.Vector3(x, bbox.max.y + 10, z),
        new THREE.Vector3(0, -1, 0)
      );
      
      const intersects = raycaster.intersectObject(terrainModel, true);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        validPoints.push({
          x: x,
          z: z,
          y: hitPoint.y + 0.02, // Slightly above the surface
          gridX: i,
          gridZ: j
        });
      }
    }
  }
  
  // Create grid lines only between adjacent valid points
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    opacity: 1.0,
    transparent: true,
    linewidth: 2
  });
  
  // Create horizontal lines (constant Z, varying X)
  for (let j = 0; j <= gridHeight; j++) {
    const linePoints = validPoints
      .filter(p => p.gridZ === j)
      .sort((a, b) => a.gridX - b.gridX);
    
    if (linePoints.length > 1) {
      // Create line segments between consecutive points
      for (let i = 0; i < linePoints.length - 1; i++) {
        const current = linePoints[i];
        const next = linePoints[i + 1];
        
        // Only connect adjacent grid points (no gaps)
        if (next.gridX === current.gridX + 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(current.x, current.y, current.z),
            new THREE.Vector3(next.x, next.y, next.z)
          ]);
          const line = new THREE.Line(geometry, lineMaterial);
          gridGroup.add(line);
        }
      }
    }
  }
  
  // Create vertical lines (constant X, varying Z)
  for (let i = 0; i <= gridWidth; i++) {
    const linePoints = validPoints
      .filter(p => p.gridX === i)
      .sort((a, b) => a.gridZ - b.gridZ);
    
    if (linePoints.length > 1) {
      // Create line segments between consecutive points
      for (let j = 0; j < linePoints.length - 1; j++) {
        const current = linePoints[j];
        const next = linePoints[j + 1];
        
        // Only connect adjacent grid points (no gaps)
        if (next.gridZ === current.gridZ + 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(current.x, current.y, current.z),
            new THREE.Vector3(next.x, next.y, next.z)
          ]);
          const line = new THREE.Line(geometry, lineMaterial);
          gridGroup.add(line);
        }
      }
    }
  }
  
  gridGroup.userData = { isTerrainGrid: true };
  return gridGroup;
};

export const loadAssetModel = async (modelUrl) => {
  const loader = new GLTFLoader();
  const fullAssetUrl = modelUrl.startsWith('http') 
    ? modelUrl 
    : `${CONFIG.API.BASE_URL}${modelUrl.startsWith('/') ? '' : '/'}${modelUrl}`;

  return new Promise((resolve, reject) => {
    loader.load(
      fullAssetUrl,
      (gltf) => {
        const modelInstance = gltf.scene.clone();
        
        modelInstance.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
              if (child.material.isMeshBasicMaterial) {
                const newMaterial = new THREE.MeshStandardMaterial({
                  color: child.material.color,
                  map: child.material.map,
                  emissive: child.material.color.clone().multiplyScalar(0.1),
                  emissiveIntensity: 0.1,
                  roughness: 0.8,
                  metalness: 0.0
                });
                child.material.dispose();
                child.material = newMaterial;
              } else if (child.material.isMeshPhongMaterial) {
                const newMaterial = new THREE.MeshStandardMaterial({
                  color: child.material.color,
                  map: child.material.map,
                  roughness: 0.7,
                  metalness: 0.1
                });
                child.material.dispose();
                child.material = newMaterial;
              }
              
              if (child.material.isMeshStandardMaterial) {
                child.material.metalness = Math.min(0.3, child.material.metalness);
                child.material.roughness = Math.max(0.4, child.material.roughness);
                
                const hsl = {};
                child.material.color.getHSL(hsl);
                if (hsl.l < 0.3) {
                  child.material.color.setHSL(hsl.h, hsl.s, Math.max(0.3, hsl.l));
                }
              }
            }
          }
        });
        
        resolve(modelInstance);
      },
      undefined,
      reject
    );
  });
};

export const snapToTerrain = (object, terrainModel, raycaster) => {
  object.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(object, true);
  const modelBottom = bbox.min.y;
  const modelOrigin = object.position.y;
  const heightBelowOrigin = modelOrigin - modelBottom;

  if (terrainModel) {
    const rayOrigin = new THREE.Vector3(object.position.x, 200, object.position.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    raycaster.set(rayOrigin, rayDirection);
    const intersects = raycaster.intersectObject(terrainModel, true);

    if (intersects.length > 0) {
      const terrainY = intersects[0].point.y;
      object.position.y = terrainY + heightBelowOrigin;
    }
  } else {
    // No terrain - snap to ground plane
    object.position.y = 0 + heightBelowOrigin;
  }
};

export const disposeObject = (object) => {
  if (!object) return;
  
  object.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}; 