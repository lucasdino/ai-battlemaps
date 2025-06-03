import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import THEME from '../theme';
import { Button } from './common';
import CONFIG from '../config';

const TerrainViewer = ({ 
  terrainUrl, 
  terrainName, 
  terrainId, 
  onError, 
  onTerrainNameChange,
  onTerrainDeleted,
  onTerrainMetricsUpdate,
  hideTerrainControls = false,
  showGrid: initialShowGrid = true,
  scale: initialScaleProp,
  selectedAsset, 
  onAssetPlaced, 
  rawPlacedAssets,
  onPlacedAssetSelected,
  onPlacedAssetMoved,
  transformMode,
  onTransformModeChange,
  onPlacedAssetDeleted,
  floorPlan,
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null); // For OrbitControls
  const transformControlsRef = useRef(null); // For TransformControls
  const terrainModelRef = useRef(null);
  const gridHelperRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const assetLoaderRef = useRef(new GLTFLoader());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const selectionBoxRef = useRef(null);
  const lightRef = useRef(null);
  const ambientLightRef = useRef(null);
  const modelCacheRef = useRef(new Map()); // reference for model cache
  const uniformScaleDragDataRef = useRef(null);
  const debugMarkersRef = useRef([]);
  const floorPlanAssetsRef = useRef([]); // reference for tracking floor plan assets
  const divisionsRef = useRef(10); // reference for grid divisions
  const gridSizeRef = useRef(20); // reference for grid size
  const fixedDivisionsRef = useRef(null); // reference for fixed divisions in Generated Dungeon

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(terrainName || '');
  const [isGridVisible, setIsGridVisible] = useState(initialShowGrid);
  const [currentScale, setCurrentScale] = useState(initialScaleProp || 1);
  const [saveStatus, setSaveStatus] = useState(null);
  const [scaledBox, setScaledBox] = useState(new THREE.Box3());
  const [scaledSize, setScaledSize] = useState(new THREE.Vector3());
  const [scaledCenter, setScaledCenter] = useState(new THREE.Vector3());
  const assetInstancesRef = useRef({});
  const [selectedPlacedAssetId, setSelectedPlacedAssetId] = useState(null);
  const originalMaterialsRef = useRef(new Map());
  const debugMarkerRef = useRef(null);

  // function to place debug markers
  const placeDebugMarker = useCallback((position, deleteExisting = true) => {
    if (!sceneRef.current) return;

    // delete existing markers
    if (debugMarkerRef.current && deleteExisting) {
      sceneRef.current.remove(debugMarkerRef.current);
      debugMarkerRef.current.geometry?.dispose();
      debugMarkerRef.current.material?.dispose();
      debugMarkerRef.current = null;
    }

    // create new marker
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);

    sceneRef.current.add(marker);
    if (deleteExisting) {
      debugMarkerRef.current = marker;
    } else {
      debugMarkersRef.current.push(marker);
    }
  }, []);

  // function to clear all debug markers
  const clearDebugMarkers = useCallback(() => {
    if (!sceneRef.current) return;

    debugMarkersRef.current.forEach(marker => {
      sceneRef.current.remove(marker);
      marker.geometry?.dispose();
      marker.material?.dispose();
    });
    debugMarkersRef.current = [];
  }, []);

  // delete markers when component unmounts
  useEffect(() => {
    return () => {
      clearDebugMarkers();
    };
  }, [clearDebugMarkers]);

  // Helper function to restore original material
  const restoreOriginalMaterial = useCallback((object) => {
    if (!object) return;
    
    const originalMaterials = originalMaterialsRef.current.get(object.uuid);
    if (originalMaterials) {
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalMaterial = originalMaterials.get(child.uuid);
          if (originalMaterial) {
            // Only dispose if it's a different material (the temporary transparent one)
            if (child.material !== originalMaterial) {
              child.material.dispose();
            }
            // Restore the original material
            child.material = originalMaterial;
            child.material.needsUpdate = true;
          }
        }
      });
      originalMaterialsRef.current.delete(object.uuid);
    } else {
      // Fallback: if no original material stored, just reset transparency
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = 1.0;
          child.material.transparent = false;
          child.material.needsUpdate = true;
        }
      });
    }
  }, []);

  // Derive assetsToDisplay with full URLs internally
  const assetsToDisplay = React.useMemo(() => {
    if (!rawPlacedAssets) {
        return [];
    }
    const processed = rawPlacedAssets.map((asset, index) => {
      let newModelUrl = asset.modelUrl;
      if (asset.modelUrl && !asset.modelUrl.startsWith('http') && !asset.modelUrl.startsWith('/')) {
        newModelUrl = `${CONFIG.API.BASE_URL}/${asset.modelUrl}`;
      } else if (asset.modelUrl && !asset.modelUrl.startsWith('http') && asset.modelUrl.startsWith('/')) {
        newModelUrl = `${CONFIG.API.BASE_URL}${asset.modelUrl}`;
      }
      return { ...asset, modelUrl: newModelUrl };
    });
    return processed;
  }, [rawPlacedAssets]);

  // Fetch initial scale if not provided
  useEffect(() => {
    if (!terrainId) return;
    if (typeof initialScaleProp === 'number') {
      setCurrentScale(initialScaleProp);
      return;
    }
    fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.scale === 'number') { // Added check for data
          setCurrentScale(data.scale);
        }
      })
      .catch(() => {
        // console.warn(\`[TerrainViewer] Could not fetch initial scale for ${terrainId}\`);
      });
  }, [terrainId, initialScaleProp]);

  // Save scale to backend
  const handleSaveScale = async () => {
    if (!terrainId) return;
    setSaveStatus('saving');
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scale: currentScale })
      });
      if (!response.ok) throw new Error('Failed to save scale');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  // Main scene setup effect
  useEffect(() => {
    if (!mountRef.current) {
        setIsLoading(false);
        return;
    }
    setIsLoading(!!terrainUrl); // Only show loading if there's a terrain URL
    setError(null);

    // clean up existing floor plan assets when scene setup starts
    if (floorPlanAssetsRef.current.length > 0) {
      floorPlanAssetsRef.current.forEach(asset => {
        if (sceneRef.current && asset.parent) {
          sceneRef.current.remove(asset);
        }
        asset.traverse((child) => {
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
      });
      floorPlanAssetsRef.current = [];
    }

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME.bgSecondary || 0x282c34);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000); // Increased far plane
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.1;
    orbitControls.screenSpacePanning = true; // Better panning
    orbitControls.minDistance = 1;
    orbitControls.maxDistance = 500; // Increased max distance
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below ground
    controlsRef.current = orbitControls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Significantly increased ambient light
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1.5); // Increased hemisphere light
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Increased directional light intensity
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
    lightRef.current = directionalLight;

    // Add additional fill lights to reduce shadows
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight1.position.set(-20, 20, -20);
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight2.position.set(0, 20, -30);
    scene.add(fillLight2);
    
    // TransformControls
    let transformControlsInstance;
    try {
        transformControlsInstance = new TransformControls(camera, renderer.domElement);

        const rootObjectForScene = transformControlsInstance._root;
        const isRootObject3D = rootObjectForScene?.isObject3D === true;
        const sceneIsActuallyScene = scene?.isScene === true;

        if (rootObjectForScene && isRootObject3D && sceneIsActuallyScene) {
            scene.add(rootObjectForScene);
            transformControlsRef.current = transformControlsInstance;

            // Configure handles for uniform scaling - THIS WAS THE MISPLACED LOGIC BLOCK
            // It needs to be applied to transformControlsInstance directly after creation
            // or when the mode is known (but mode is not a direct dep of this effect)
            // The primary place to set showX/Y/Z based on mode is the OTHER useEffect further down.
            // However, we can set initial sensible defaults here or specifically for scale mode if we could detect it.
            // For now, let's ensure the other useEffect handles mode-specific visibility.
            // Default to all visible initially.
            transformControlsInstance.showX = true;
            transformControlsInstance.showY = true;
            transformControlsInstance.showZ = true;

            transformControlsInstance.addEventListener('dragging-changed', (event) => {
                const currentTC = transformControlsRef.current; // Use current ref for safety
                if (!currentTC) return;
                const obj = currentTC.object;

                if (controlsRef.current) controlsRef.current.enabled = !event.value;
                
                if (event.value && obj) { // Dragging started
                    if (currentTC.mode === 'scale') {
                        uniformScaleDragDataRef.current = { 
                            scaleAtDragStart: obj.scale.clone(), 
                            // drivingAxis: 'x' // Assuming X is primary due to handle visibility
                        };
                    }
                    // Store original materials for each mesh child
                    if (!originalMaterialsRef.current.has(obj.uuid)) {
                        const originalMaterials = new Map();
                        obj.traverse((child) => {
                            if (child.isMesh && child.material) {
                                originalMaterials.set(child.uuid, child.material);
                            }
                        });
                        originalMaterialsRef.current.set(obj.uuid, originalMaterials);
                    }
                    // Apply transparency to all mesh children
                    obj.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material = child.material.clone();
                            child.material.opacity = 0.5;
                            child.material.transparent = true;
                            child.material.needsUpdate = true;
                        }
                    });
                } else if (!event.value && obj) { // Dragging ended
                    uniformScaleDragDataRef.current = null; // Clear scaling data
                    // Restore original materials for each mesh
                    const originalMaterials = originalMaterialsRef.current.get(obj.uuid);
                    if (originalMaterials) {
                        obj.traverse((child) => {
                            if (child.isMesh && child.material) {
                                const originalMaterial = originalMaterials.get(child.uuid);
                                if (originalMaterial) {
                                    child.material.dispose();
                                    child.material = originalMaterial;
                                    child.material.needsUpdate = true;
                                }
                            }
                        });
                        originalMaterialsRef.current.delete(obj.uuid);
                    }
                }
            });

            transformControlsInstance.addEventListener('objectChange', () => {
                const currentTC = transformControlsRef.current; // Use current ref
                if (!currentTC || !currentTC.object) return;

                if (currentTC.mode === 'scale' && uniformScaleDragDataRef.current) {
                    const obj = currentTC.object;
                    const { scaleAtDragStart } = uniformScaleDragDataRef.current;
                    const epsilon = 0.00001;

                    const initialX = scaleAtDragStart.x;
                    const currentX = obj.scale.x;

                    if (Math.abs(initialX) < epsilon) { // Initial X was zero or very small
                        if (Math.abs(currentX) > epsilon) {
                            if (Math.abs(obj.scale.y - currentX) > epsilon || Math.abs(obj.scale.z - currentX) > epsilon) {
                                obj.scale.y = currentX;
                                obj.scale.z = currentX;
                            }
                        } else {
                            if (Math.abs(obj.scale.y) > epsilon || Math.abs(obj.scale.z) > epsilon) {
                                obj.scale.y = 0;
                                obj.scale.z = 0;
                            }
                        }
                    } else { // Initial X was non-zero
                        const scaleFactor = currentX / initialX;
                        const targetY = scaleAtDragStart.y * scaleFactor;
                        const targetZ = scaleAtDragStart.z * scaleFactor;

                        if (Math.abs(obj.scale.y - targetY) > epsilon || Math.abs(obj.scale.z - targetZ) > epsilon) {
                            obj.scale.y = targetY;
                            obj.scale.z = targetZ;
                        }
                    }
                    
                    // Real-time terrain snapping during scaling
                    if (terrainModelRef.current) {
                        // Update matrix to get accurate bounding box after scale change
                        obj.updateMatrixWorld(true);
                        const bbox = new THREE.Box3().setFromObject(obj, true);
                        
                        // Calculate how much the object extends below its origin
                        const modelBottom = bbox.min.y;
                        const modelOrigin = obj.position.y;
                        const heightBelowOrigin = modelOrigin - modelBottom;
                        
                        // Raycast from high above down to the terrain
                        const rayOrigin = new THREE.Vector3(obj.position.x, 200, obj.position.z);
                        const rayDirection = new THREE.Vector3(0, -1, 0);
                        raycasterRef.current.set(rayOrigin, rayDirection);
                        const intersectsTerrain = raycasterRef.current.intersectObject(terrainModelRef.current, true);

                        if (intersectsTerrain.length > 0) {
                            const terrainY = intersectsTerrain[0].point.y;
                            const targetY = terrainY + heightBelowOrigin;
                            
                            // Only update if there's a significant difference to avoid jitter
                            if (Math.abs(obj.position.y - targetY) > 0.001) {
                                obj.position.y = targetY;
                            }
                        } else {
                            // No terrain - snap to ground plane (y=0) during scaling
                            obj.updateMatrixWorld(true);
                            const bbox = new THREE.Box3().setFromObject(obj, true);
                            
                            const modelBottom = bbox.min.y;
                            const modelOrigin = obj.position.y;
                            const heightBelowOrigin = modelOrigin - modelBottom;
                            
                            const targetY = 0 + heightBelowOrigin;
                            
                            // Only update if there's a significant difference to avoid jitter
                            if (Math.abs(obj.position.y - targetY) > 0.001) {
                                obj.position.y = targetY;
                            }
                        }
                    }
                }
            });

            transformControlsInstance.addEventListener('mouseUp', () => {
                if (transformControlsInstance.object && onPlacedAssetMoved) {
                    const transformedObject = transformControlsInstance.object;
                    
                    // Improved snapping logic for both translate and scale modes
                    if (transformControlsInstance.mode === 'translate' || transformControlsInstance.mode === 'scale') {
                        // Update matrix to get accurate bounding box
                        transformedObject.updateMatrixWorld(true);
                        const bbox = new THREE.Box3().setFromObject(transformedObject, true);
                        
                        // Calculate how much the object extends below its origin
                        const modelBottom = bbox.min.y;
                        const modelOrigin = transformedObject.position.y;
                        const heightBelowOrigin = modelOrigin - modelBottom;
            
                        if (terrainModelRef.current) {
                            // Snap to terrain if available
                            const rayOrigin = new THREE.Vector3(transformedObject.position.x, 200, transformedObject.position.z);
                            const rayDirection = new THREE.Vector3(0, -1, 0);
                
                            raycasterRef.current.set(rayOrigin, rayDirection);
                            const intersectsTerrain = raycasterRef.current.intersectObject(terrainModelRef.current, true);
                
                            if (intersectsTerrain.length > 0) {
                                const terrainY = intersectsTerrain[0].point.y;
                                const targetY = terrainY + heightBelowOrigin;
                                transformedObject.position.y = targetY;
                            }
                        } else {
                            // No terrain - snap to ground plane (y=0)
                            const targetY = 0 + heightBelowOrigin;
                            transformedObject.position.y = targetY;
                        }
                    }
                    
                    // Update parent component with new transform
                    onPlacedAssetMoved(
                        transformedObject.userData.assetId,
                        transformedObject.position.clone(),
                        transformedObject.rotation.clone(),
                        transformedObject.scale.clone()
                    );
                }
            });

            // Rotation Snap
            transformControlsInstance.setRotationSnap(THREE.MathUtils.degToRad(15));
            // Scale Snap (optional, can be a bit aggressive)
            // transformControlsInstance.setScaleSnap(0.25);

        } else {
            if (onError) onError("Transform controls could not be initialized correctly.");
        }

    } catch(e) {
        if(onError) onError("Error setting up transform tools: " + e.message);
    }


    // Load terrain model or setup default view
    if (terrainUrl) {
        const loader = new GLTFLoader();
        const fullTerrainUrl = terrainUrl.startsWith('http') ? terrainUrl : `${CONFIG.API.BASE_URL}${terrainUrl.startsWith('/') ? '' : '/'}${terrainUrl}`;
        
        // Add a cache buster to the URL if it's not already there
        const finalUrl = fullTerrainUrl.includes('?') ? `${fullTerrainUrl}&cb=${Date.now()}` : `${fullTerrainUrl}?cb=${Date.now()}`;

        if (!finalUrl || finalUrl.endsWith('undefined')) {
            setError('Invalid terrain URL provided.');
            setIsLoading(false);
        } else {
            loader.load(
                finalUrl,
                (gltf) => {
                    if (!sceneRef.current) return; // Scene might have been cleaned up

                    if (terrainModelRef.current) {
                        sceneRef.current.remove(terrainModelRef.current);
                    }

                    const model = gltf.scene;
                    model.position.set(0, 0, 0);
                    // console.log(`currentScale: ${currentScale}`);
                    model.scale.set(currentScale, currentScale, currentScale);

                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            if (child.material) {
                                if (child.material.isMeshBasicMaterial) {
                                    const newMaterial = new THREE.MeshStandardMaterial({
                                        color: child.material.color,
                                        map: child.material.map,
                                        emissive: child.material.color.clone().multiplyScalar(0.1), // Reduced emissive
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
                                // Ensure all materials are bright enough
                                if (child.material.isMeshStandardMaterial) {
                                    // Make materials less metallic and more diffuse for better lighting
                                    child.material.metalness = Math.min(0.3, child.material.metalness);
                                    child.material.roughness = Math.max(0.4, child.material.roughness);
                                    
                                    // Brighten dark materials
                                    const hsl = {};
                                    child.material.color.getHSL(hsl);
                                    if (hsl.l < 0.3) {
                                        child.material.color.setHSL(hsl.h, hsl.s, Math.max(0.3, hsl.l));
                                    }
                                }
                            }
                        }
                    });
                    
                    sceneRef.current.add(model);
                    terrainModelRef.current = model;
                    
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());

                    // Set initial scaled size and center
                    setScaledBox(box);
                    setScaledSize(size);
                    setScaledCenter(center);

                    // Set directional light target to terrain center
                    if (lightRef.current) {
                        lightRef.current.target.position.copy(center);
                        lightRef.current.target.updateMatrixWorld(); // Important for target change to take effect
                    }

                    updateCustomGrid(size.x, size.z, center);
                    setIsGridVisible(initialShowGrid); // Ensure grid visibility is reset based on prop

                    if (onTerrainMetricsUpdate) {
                        onTerrainMetricsUpdate({
                            width: size.x, depth: size.z, height: size.y,
                            centerX: center.x, centerY: center.y, centerZ: center.z,
                        });
                    }

                    // Adjust camera
                    const fitOffset = 1.2; // Zoom out a bit
                    const fov = camera.fov * (Math.PI / 180);
                    const distance = Math.max(size.x, size.y, size.z) / (2 * Math.tan(fov / 2));
                    camera.position.set(center.x + distance * fitOffset, center.y + distance * fitOffset * 0.7, center.z + distance * fitOffset);
                    camera.lookAt(center);
                    orbitControls.target.copy(center);
                    orbitControls.update();
                    setIsLoading(false);
                },
                undefined, // onProgress
                (loadError) => {
                    setError(`Failed to load terrain: ${terrainName}. Details: ${loadError.message}`);
                    if (onError) onError(`Failed to load terrain: ${terrainName}. Check console for details.`);
                    setIsLoading(false);
                }
            );
        }
    } else {
        // No terrain URL - setup default view for "None" terrain
        setIsLoading(false);
        
        // Calculate grid size based on floor plan if available
        const calculateGridSize = async () => {
            let defaultWidth = 20; // fallback default
            let defaultDepth = 20;
            
            try {
                // load floor plan data
                let planData;
                if (floorPlan) {
                    planData = floorPlan;
                } else {
                    const planResponse = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DUNGEON.FLOOR_PLAN}`);
                    if (planResponse.ok) {
                        planData = await planResponse.json();
                    }
                }
                
                if (planData && planData.tiles && Array.isArray(planData.tiles)) {
                    const rowNum = planData.tiles.length;
                    const colNum = planData.tiles[0] ? planData.tiles[0].length : 0;
                    const maxDimension = Math.max(rowNum, colNum);
                    
                    // Save fixed divisions for Generated Dungeon (this should not change with scale)
                    fixedDivisionsRef.current = maxDimension;
                    
                    // gridSize = max(row_num, col_num) * 2 (each cell size is 2)
                    const cellSize = 2;
                    const baseGridSize = maxDimension * cellSize;
                    const gridSize = baseGridSize * currentScale; // Apply current scale
                    
                    defaultWidth = gridSize;
                    defaultDepth = gridSize;
                    
                    // console.log(`Dynamic grid size calculated: ${gridSize} (${rowNum}x${colNum}, max: ${maxDimension}, scale: ${currentScale})`);
                }
            } catch (error) {
                console.warn('Could not load floor plan for grid size calculation, using default:', error);
            }
            
            const defaultCenter = new THREE.Vector3(0, 0, 0);
            
            // Set default scaled values
            setScaledSize(new THREE.Vector3(defaultWidth, 0, defaultDepth));
            setScaledCenter(defaultCenter);
            
            // Create default grid
            updateCustomGrid(defaultWidth, defaultDepth, defaultCenter);
            setIsGridVisible(initialShowGrid);
            
            // Update metrics for "None" terrain
            if (onTerrainMetricsUpdate) {
                onTerrainMetricsUpdate({
                    width: defaultWidth, depth: defaultDepth, height: 0,
                    centerX: defaultCenter.x, centerY: defaultCenter.y, centerZ: defaultCenter.z,
                });
            }
        };
        
        calculateGridSize();
        
        // Position camera for default view
        camera.position.set(15, 15, 15);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        orbitControls.target.copy(new THREE.Vector3(0, 0, 0));
        orbitControls.update();
    }
    

    // Animation loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
        orbitControls.update(); // Only required if enableDamping or autoRotate are set
        if (transformControlsRef.current && transformControlsRef.current.object && selectionBoxRef.current) {
             selectionBoxRef.current.setFromObject(transformControlsRef.current.object); // Keep selection box updated
        }
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
        if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
        const newWidth = mountRef.current.clientWidth;
        const newHeight = mountRef.current.clientHeight;
      rendererRef.current.setSize(newWidth, newHeight);
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize);

        if (transformControlsRef.current) {
            const tcInstance = transformControlsRef.current;
            tcInstance.removeEventListener('dragging-changed');
            tcInstance.removeEventListener('objectChange');
            tcInstance.removeEventListener('mouseUp');
            if (tcInstance.object) tcInstance.detach();

            if (tcInstance._root && tcInstance._root.parent) {
                tcInstance._root.parent.remove(tcInstance._root);
            }
            tcInstance._root?.dispose?.();

            tcInstance.dispose();
            transformControlsRef.current = null;
        }
        if (controlsRef.current) {
            controlsRef.current.dispose();
            controlsRef.current = null;
        }
        if (assetInstancesRef.current) {
            Object.values(assetInstancesRef.current).forEach(instance => {
                if (instance.parent) instance.parent.remove(instance);
            });
            assetInstancesRef.current = {};
        }
        if (selectionBoxRef.current) {
            if (selectionBoxRef.current.parent) selectionBoxRef.current.parent.remove(selectionBoxRef.current);
            selectionBoxRef.current.dispose?.();
            selectionBoxRef.current = null;
        }
        if (terrainModelRef.current) {
            if (sceneRef.current) sceneRef.current.remove(terrainModelRef.current);
            terrainModelRef.current = null;
      }
        if (gridHelperRef.current) {
            if (sceneRef.current) sceneRef.current.remove(gridHelperRef.current);
            gridHelperRef.current.geometry?.dispose();
            gridHelperRef.current.material?.dispose();
            gridHelperRef.current = null;
        }
        if (lightRef.current && sceneRef.current) sceneRef.current.remove(lightRef.current);
        if (ambientLightRef.current && sceneRef.current) sceneRef.current.remove(ambientLightRef.current);
        
        // floor plan asset cleanup
        if (floorPlanAssetsRef.current.length > 0) {
          floorPlanAssetsRef.current.forEach(asset => {
            if (sceneRef.current && asset.parent) {
              sceneRef.current.remove(asset);
            }
            asset.traverse((child) => {
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
          });
          floorPlanAssetsRef.current = [];
        }
        
        if (rendererRef.current) {
            rendererRef.current.dispose();
            if (rendererRef.current.domElement && currentMount.contains(rendererRef.current.domElement)) {
                 currentMount.removeChild(rendererRef.current.domElement);
            }
            rendererRef.current = null;
        }
        if (sceneRef.current) {
            sceneRef.current = null;
        }
        cameraRef.current = null;
        originalMaterialsRef.current.clear();
    };
  }, [terrainUrl, terrainId, initialShowGrid, onTerrainMetricsUpdate, onError, onPlacedAssetMoved, floorPlan]); // currentScaleを削除

  // Effect to attach TransformControls when an asset is selected
  useEffect(() => {
    const tcInstanceInEffect = transformControlsRef.current;
    if (!tcInstanceInEffect) {
        return;
    }

    if (selectedPlacedAssetId) {
      const objectToTransform = assetInstancesRef.current[selectedPlacedAssetId];
      if (objectToTransform) {
        tcInstanceInEffect.setMode(transformMode); // Set mode before attaching
        tcInstanceInEffect.attach(objectToTransform);
        tcInstanceInEffect.enabled = true;
        
        // IMPROVED RE-SNAP LOGIC - Fix sinking issue
        if (terrainModelRef.current) {
          const objToSnap = tcInstanceInEffect.object;
          if (objToSnap) {
            // Update the object's matrix to get accurate bounding box
            objToSnap.updateMatrixWorld(true);

            // Calculate the bounding box more accurately
            const worldBBox = new THREE.Box3().setFromObject(objToSnap, true);
            
            // Calculate how much the object extends below its origin
            const modelBottom = worldBBox.min.y;
            const modelOrigin = objToSnap.position.y;
            const heightBelowOrigin = modelOrigin - modelBottom;
            
            // Raycast from high above down to the terrain
            const rayOrigin = new THREE.Vector3(objToSnap.position.x, 200, objToSnap.position.z); 
            const rayDirection = new THREE.Vector3(0, -1, 0);
            raycasterRef.current.set(rayOrigin, rayDirection);
            const intersectsTerrain = raycasterRef.current.intersectObject(terrainModelRef.current, true);

            if (intersectsTerrain.length > 0) {
              const terrainIntersectionY = intersectsTerrain[0].point.y;
              
              // Set the object's position so its bottom sits on the terrain
              const targetY = terrainIntersectionY + heightBelowOrigin;
              
              if (Math.abs(objToSnap.position.y - targetY) > 0.001) {
                objToSnap.position.y = targetY;
                objToSnap.updateMatrixWorld(true);

                if (onPlacedAssetMoved) {
                  onPlacedAssetMoved(
                    objToSnap.userData.assetId,
                    objToSnap.position.clone(), 
                    objToSnap.rotation.clone(), 
                    objToSnap.scale.clone()
                  );
                }
              }
            } else {
              console.warn(`[TransformControlsEffect] Re-snap for ${objToSnap.userData.assetId} failed: Raycaster did not intersect terrain.`);
            }
          }
        } else {
          // No terrain - snap to ground plane (None terrain case)
          const objToSnap = tcInstanceInEffect.object;
          if (objToSnap) {
            // Update the object's matrix to get accurate bounding box
            objToSnap.updateMatrixWorld(true);

            // Calculate the bounding box more accurately
            const worldBBox = new THREE.Box3().setFromObject(objToSnap, true);
            
            // Calculate how much the object extends below its origin
            const modelBottom = worldBBox.min.y;
            const modelOrigin = objToSnap.position.y;
            const heightBelowOrigin = modelOrigin - modelBottom;
            
            // Set the object's position so its bottom sits on the ground plane (y=0)
            const targetY = 0 + heightBelowOrigin;
            
            if (Math.abs(objToSnap.position.y - targetY) > 0.001) {
              objToSnap.position.y = targetY;
              objToSnap.updateMatrixWorld(true);

              if (onPlacedAssetMoved) {
                onPlacedAssetMoved(
                  objToSnap.userData.assetId,
                  objToSnap.position.clone(), 
                  objToSnap.rotation.clone(), 
                  objToSnap.scale.clone()
                );
              }
            }
          }
        }

      } else {
        if (tcInstanceInEffect.object) {
          // Restore original material before detaching
          restoreOriginalMaterial(tcInstanceInEffect.object);
          
          tcInstanceInEffect.detach();
          tcInstanceInEffect.enabled = false;
          
          // Force update the controls to ensure they're properly disabled
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
          }
        }
      }
    } else { // No selectedPlacedAssetId - IMPROVED DESELECTION
      if (tcInstanceInEffect.object) {
        // Restore original material before detaching
        restoreOriginalMaterial(tcInstanceInEffect.object);
        
        tcInstanceInEffect.detach();
        tcInstanceInEffect.enabled = false;
        
        // Force update the controls to ensure they're properly disabled
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      }
    }
  }, [selectedPlacedAssetId, transformMode, onPlacedAssetMoved, restoreOriginalMaterial]);

  // Effect to update visual selection indicator (BoxHelper)
  useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

    if (selectionBoxRef.current) {
      scene.remove(selectionBoxRef.current);
      selectionBoxRef.current.dispose?.();
      selectionBoxRef.current = null;
    }

    const selectedInstance = assetInstancesRef.current[selectedPlacedAssetId];
    if (selectedInstance) { // Check if instance actually exists for the ID
      const boxHelper = new THREE.BoxHelper(selectedInstance, 0xffff00);
      scene.add(boxHelper);
      selectionBoxRef.current = boxHelper;
    }
  }, [selectedPlacedAssetId, assetsToDisplay, assetInstancesRef]); // Re-run if selection or displayed assets change (instances might re-render or be removed)


  // Call onPlacedAssetSelected when selectedPlacedAssetId changes
  useEffect(() => {
    if (onPlacedAssetSelected) {
      const selectedInstance = selectedPlacedAssetId ? assetInstancesRef.current[selectedPlacedAssetId] : null;
      onPlacedAssetSelected(selectedPlacedAssetId, selectedInstance);
    }
  }, [selectedPlacedAssetId, onPlacedAssetSelected, assetInstancesRef]);

  // Effect for handling click-to-place OR click-to-select
  useEffect(() => {
    const rendererDomElement = rendererRef.current?.domElement;
    if (!rendererDomElement) return;
    
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    const handleClick = (event) => {
      if (!mountRef.current || !cameraRef.current || !sceneRef.current ) {
        return;
      }

      const currentMount = mountRef.current;
      mouseRef.current.x = (event.clientX - currentMount.getBoundingClientRect().left) / currentMount.clientWidth * 2 - 1;
      mouseRef.current.y = -((event.clientY - currentMount.getBoundingClientRect().top) / currentMount.clientHeight) * 2 + 1;

      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouseRef.current, cameraRef.current);

      // If an asset is selected FOR PLACEMENT, prioritize placing it.
      if (selectedAsset && selectedAsset.modelUrl && onAssetPlaced) { 
        let intersectionPoint = null;
        
        if (terrainModelRef.current) {
          // Place on terrain if available
          const intersectsTerrain = raycaster.intersectObject(terrainModelRef.current, true);
          if (intersectsTerrain.length > 0) {
            intersectionPoint = intersectsTerrain[0].point;
          }
        } else {
          // Place on ground plane when no terrain (None terrain case)
          const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y=0 plane
          const planeIntersect = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(groundPlane, planeIntersect)) {
            intersectionPoint = planeIntersect;
          }
        }

        if (intersectionPoint) {
          const newAssetData = {
            id: `manual-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
            modelUrl: selectedAsset.modelUrl,
            name: selectedAsset.name || 'Placed Asset',
            position: { x: intersectionPoint.x, y: intersectionPoint.y, z: intersectionPoint.z },
            rotation: { x: 0, y: selectedAsset.rotation?.y || 0, z: 0 },
            scale: { x: selectedAsset.scale?.x || 1, y: selectedAsset.scale?.y || 1, z: selectedAsset.scale?.z || 1 },
          };
          onAssetPlaced(newAssetData); 
        }
        return; 
      } else {
      }

      // Check if we have a selected asset in transform mode
      if (transformControlsRef.current && transformControlsRef.current.object) {
          // Check if the click was on the active TransformControls gizmo itself
          // We need to get the gizmo parts. transformControlsRef.current.children[0] is usually the gizmo group.
          const gizmoChildren = transformControlsRef.current.children?.[0]?.children || [];
          const intersectsGizmo = raycaster.intersectObjects(gizmoChildren, true);
          if (intersectsGizmo.length > 0) {
              return; 
          }
      }

      const placedAssetInstances = Object.values(assetInstancesRef.current).filter(Boolean); // Filter out any null/undefined
      
      if (placedAssetInstances.length === 0) { // No assets to intersect
        if (selectedPlacedAssetId) { // Deselect if clicking empty space
            setSelectedPlacedAssetId(null);
            
            // Force detach transform controls immediately
            if (transformControlsRef.current && transformControlsRef.current.object) {
              transformControlsRef.current.detach();
              transformControlsRef.current.enabled = false;
            }
            
            // Re-enable orbit controls
            if (controlsRef.current) {
              controlsRef.current.enabled = true;
            }
        }
        return;
      }
      const intersectsPlacedAssets = raycaster.intersectObjects(placedAssetInstances, true);
      
      let clickedOnExistingAsset = false;
      if (intersectsPlacedAssets.length > 0) {
        for (const intersect of intersectsPlacedAssets) {
          let currentObject = intersect.object;
          let traversalCount = 0;
          while (currentObject && (!currentObject.userData || typeof currentObject.userData.assetId === 'undefined')) { // Check for userData and assetId
            currentObject = currentObject.parent;
            traversalCount++;
            if (traversalCount > 10) { // Prevent infinite loops
              break;
            }
          }
          if (currentObject && currentObject.userData && typeof currentObject.userData.assetId !== 'undefined') {
            const assetId = currentObject.userData.assetId;
            if (selectedPlacedAssetId !== assetId) {
              setSelectedPlacedAssetId(assetId);
            } else { // Clicked on already selected asset - could be a toggle or no-op. For now, no-op.
            }
            clickedOnExistingAsset = true;
            break; 
          }
        }
      }

      if (!clickedOnExistingAsset) {
        if (selectedPlacedAssetId) {
          setSelectedPlacedAssetId(null);
          
          // Force detach transform controls immediately
          if (transformControlsRef.current && transformControlsRef.current.object) {
            transformControlsRef.current.detach();
            transformControlsRef.current.enabled = false;
          }
          
          // Re-enable orbit controls
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
          }
        }
      }
    };

    // Add escape key handler for deselection
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && selectedPlacedAssetId) {
        setSelectedPlacedAssetId(null);
        
        // Force detach transform controls
        if (transformControlsRef.current && transformControlsRef.current.object) {
          transformControlsRef.current.detach();
          transformControlsRef.current.enabled = false;
        }
        
        // Re-enable orbit controls
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      }
    };

    rendererDomElement.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (rendererDomElement) { 
        rendererDomElement.removeEventListener('click', handleClick);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAsset, onAssetPlaced, assetsToDisplay, onPlacedAssetSelected, terrainModelRef, assetInstancesRef, selectedPlacedAssetId, restoreOriginalMaterial]);


  // Effect for loading and managing placed asset models in the scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
        return;
    }

    const currentInstanceIds = Object.keys(assetInstancesRef.current);
    const propAssetIds = (assetsToDisplay || []).map(a => a.id);

    // 1. Remove assets no longer in props
    currentInstanceIds.forEach(instanceId => {
      if (!propAssetIds.includes(instanceId)) {
        const instanceData = assetInstancesRef.current[instanceId];
        if (instanceData) { // instanceData is the THREE.Object3D
          if (transformControlsRef.current && transformControlsRef.current.object === instanceData) {
            transformControlsRef.current.detach();
          }
          scene.remove(instanceData);
          instanceData.traverse(child => {
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
        }
        delete assetInstancesRef.current[instanceId];
        if (selectedPlacedAssetId === instanceId) {
            setSelectedPlacedAssetId(null); // Deselect if the removed asset was selected
            }
          }
        });
        
    // 2. Load and add new assets from props or update existing ones
    (assetsToDisplay || []).forEach(assetData => {
      if (!assetData || !assetData.id || !assetData.modelUrl) {
        return;
      }
      
      const fullAssetUrl = assetData.modelUrl.startsWith('http') 
        ? assetData.modelUrl 
        : `${CONFIG.API.BASE_URL}${assetData.modelUrl.startsWith('/') ? '' : '/'}${assetData.modelUrl}`;

      if (assetInstancesRef.current[assetData.id]) {
        // Asset already exists, update its transform if necessary (e.g. after a programmatic move, not user drag)
        const existingInstance = assetInstancesRef.current[assetData.id];
        const pos = assetData.position;
        const rot = assetData.rotation;
        const scl = assetData.scale;

        if (!existingInstance.position.equals(new THREE.Vector3(pos.x, pos.y, pos.z))) {
            existingInstance.position.set(pos.x, pos.y, pos.z);
        }
        if (existingInstance.rotation.x !== rot.x || existingInstance.rotation.y !== rot.y || existingInstance.rotation.z !== rot.z) {
            existingInstance.rotation.set(rot.x, rot.y, rot.z);
        }
         if (!existingInstance.scale.equals(new THREE.Vector3(scl.x, scl.y, scl.z))) {
            existingInstance.scale.set(scl.x, scl.y, scl.z);
        }

      } else { // Asset does not exist, load it
        
        // Create a temporary placeholder to prevent multiple loads
        const placeholder = new THREE.Group();
        placeholder.userData = { assetId: assetData.id, name: assetData.name, isPlaceholder: true };
        assetInstancesRef.current[assetData.id] = placeholder;
        
        assetLoaderRef.current.load(
          fullAssetUrl,
          (gltf) => {
            if (!sceneRef.current) {
                return; 
            }

            const modelInstance = gltf.scene.clone(); // Clone to allow multiple instances of same model
            
            // Initial position from assetData (agent places at y=0 by default)
            modelInstance.position.set(assetData.position.x, assetData.position.y, assetData.position.z);
            modelInstance.rotation.set(assetData.rotation.x, assetData.rotation.y, assetData.rotation.z);
            modelInstance.scale.set(assetData.scale.x, assetData.scale.y, assetData.scale.z);
            
            modelInstance.userData = { assetId: assetData.id, name: assetData.name };

            let meshCount = 0;
            modelInstance.traverse((child) => {
              if (child.isMesh) {
                meshCount++;
                child.castShadow = true;
                child.receiveShadow = true;
                // Convert materials for better lighting
                if (child.material) {
                    if (child.material.isMeshBasicMaterial) {
                        const newMaterial = new THREE.MeshStandardMaterial({
                            color: child.material.color,
                            map: child.material.map,
                            emissive: child.material.color.clone().multiplyScalar(0.1), // Reduced emissive
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
            
            // Remove placeholder and add the real model
            if (placeholder.parent) {
              placeholder.parent.remove(placeholder);
            }
            sceneRef.current.add(modelInstance);
            assetInstancesRef.current[assetData.id] = modelInstance;

            // --- BEGIN: Snap to terrain immediately after loading for initial placement (Revised Logic) ---
            if (terrainModelRef.current) {
                // First, place the model at the intended position to get accurate bounding box
                modelInstance.position.set(assetData.position.x, assetData.position.y, assetData.position.z);
                modelInstance.updateMatrixWorld(true);
                
                // Get the bounding box of the model at its current position
                const bbox = new THREE.Box3().setFromObject(modelInstance, true);
                
                // Calculate the height of the model (how much it extends below its origin)
                const modelBottom = bbox.min.y;
                const modelOrigin = modelInstance.position.y;
                const heightBelowOrigin = modelOrigin - modelBottom;

                // Raycast from high above the asset's XZ position down to find the terrain surface
                const rayOrigin = new THREE.Vector3(assetData.position.x, 200, assetData.position.z);
                const rayDirection = new THREE.Vector3(0, -1, 0);
                raycasterRef.current.set(rayOrigin, rayDirection);
                const intersectsTerrain = raycasterRef.current.intersectObject(terrainModelRef.current, true);

                if (intersectsTerrain.length > 0) {
                    const terrainSurfaceY = intersectsTerrain[0].point.y;
                    // Place the model so its bottom sits exactly on the terrain surface
                    const targetY = terrainSurfaceY + heightBelowOrigin;
                    modelInstance.position.y = targetY;
                    
                    // Update the parent component with the corrected position
                    if (onPlacedAssetMoved) {
                        onPlacedAssetMoved(
                            assetData.id,
                            modelInstance.position.clone(),
                            modelInstance.rotation.clone(),
                            modelInstance.scale.clone()
                        );
                    }
                } else {
                    // Fallback: if no terrain intersection, place at a reasonable height
                    const fallbackY = Math.max(0, heightBelowOrigin);
                    modelInstance.position.y = fallbackY;
                }
            } else {
                // No terrain model - place on ground plane (None terrain case)
                modelInstance.position.set(assetData.position.x, assetData.position.y, assetData.position.z);
                modelInstance.updateMatrixWorld(true);
                
                // Get the bounding box to calculate proper ground placement
                const bbox = new THREE.Box3().setFromObject(modelInstance, true);
                const modelBottom = bbox.min.y;
                const modelOrigin = modelInstance.position.y;
                const heightBelowOrigin = modelOrigin - modelBottom;
                
                // Place the model so its bottom sits on the ground plane (y=0)
                const targetY = 0 + heightBelowOrigin;
                modelInstance.position.y = targetY;
                
                // Update the parent component with the corrected position
                if (onPlacedAssetMoved) {
                    onPlacedAssetMoved(
                        assetData.id,
                        modelInstance.position.clone(),
                        modelInstance.rotation.clone(),
                        modelInstance.scale.clone()
                    );
                }
            }
            // --- END: Snap to terrain (Revised Logic) ---
            
            // If this newly loaded asset is the one that should be selected, attach transform controls
            if (selectedPlacedAssetId === assetData.id && transformControlsRef.current && !transformControlsRef.current.object) {
                 if (transformMode) transformControlsRef.current.setMode(transformMode);
                 transformControlsRef.current.attach(modelInstance);
                 transformControlsRef.current.enabled = true;
        }

      },
      (xhr) => {
            // Optional: Log progress if needed
      },
          (loadError) => {
            console.error(`Error loading asset: ${assetData.name || assetData.id}`, loadError);
            
            // Remove the placeholder on error
            if (assetInstancesRef.current[assetData.id]?.userData?.isPlaceholder) {
              delete assetInstancesRef.current[assetData.id];
            }
            
            if (onError) onError(`Failed to load asset: ${assetData.name || assetData.id}`);
      }
    );
      }
    });

  }, [assetsToDisplay, onError, selectedPlacedAssetId, transformMode]);


  // Function to update or create the custom grid
  const updateCustomGrid = useCallback((width, depth, gridCenter) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.geometry?.dispose();
      gridHelperRef.current.material?.dispose();
      gridHelperRef.current = null;
    }

    if (width > 0 && depth > 0) {
        // For "None" terrain (no terrainUrl), use fixed divisions based on floorPlan
        // For actual terrains, use dynamic divisions
        let divisions, gridSize;
        
        if (!terrainUrl) {
          // Generated Dungeon - use fixed divisions, change grid size to scale
          gridSize = Math.max(width, depth);
          divisions = fixedDivisionsRef.current || Math.max(width, depth) / 2; // Use fixed divisions if available
        } else {
          // Dynamic grid for actual terrains
          divisions = Math.max(10, Math.floor(Math.max(width, depth) / 2));
          gridSize = Math.max(width, depth) * 1.2;
        }
        
        // Save values to refs for use by other functions
        divisionsRef.current = divisions;
        gridSizeRef.current = gridSize;
        
        // Use brighter colors for better visibility: white center lines, light gray grid lines
        const gridHelper = new THREE.GridHelper(gridSize, divisions, 0xffffff, 0xcccccc);
        
        // Calculate the terrain surface Y position
        let terrainSurfaceY = 0;
        if (terrainModelRef.current) {
          // Get the bounding box of the terrain
          const terrainBBox = new THREE.Box3().setFromObject(terrainModelRef.current);
          // Use the top surface of the terrain (max Y) as the grid position
          terrainSurfaceY = terrainBBox.max.y + 0.01; // Small offset to prevent z-fighting
        }
        
        gridHelper.position.set(gridCenter.x, terrainSurfaceY, gridCenter.z);
        gridHelper.material.opacity = 0.8; // Increased opacity for better visibility
        gridHelper.material.transparent = true;
        gridHelper.visible = isGridVisible; // Use state here
        scene.add(gridHelper);
        gridHelperRef.current = gridHelper;
    }
  }, [isGridVisible, terrainUrl]); // Added terrainUrl dependency

  // Toggle grid visibility
  const handleToggleGrid = useCallback(() => {
    setIsGridVisible(prev => {
      const newVisibility = !prev;
      if (gridHelperRef.current) {
        gridHelperRef.current.visible = newVisibility;
      }
      return newVisibility;
    });
  }, []);

  // Handle scale change from input
  const handleScaleChange = (event) => {
    const newScale = parseFloat(event.target.value);
    if (isNaN(newScale) || newScale <=0) return; // Basic validation

    setCurrentScale(newScale); // Update local state for input - useEffectが残りの処理を行う
  };

  // Handle name editing
  const handleNameInputChange = (e) => setEditedName(e.target.value);
  const handleNameEditSubmit = async () => { // Made async for API call
    if (!terrainId || !editedName.trim() || editedName.trim() === terrainName) {
      setIsEditingName(false);
      return;
    }
    try {
      // Assume onTerrainNameChange handles backend update and parent state
      await onTerrainNameChange(terrainId, editedName.trim()); // Pass terrainId
    setIsEditingName(false);
      // Optimistically updated, or onTerrainNameChange updates parent which re-renders
    } catch (err) {
      console.error("Failed to update terrain name:", err);
      if (onError) onError("Failed to update terrain name.");
      // Potentially revert editedName or show error
    }
  };
  
  useEffect(() => setEditedName(terrainName || ''), [terrainName]);

  // Handle terrain deletion
  const handleDeleteTerrain = async () => {
    if (!terrainId || !onTerrainDeleted) return;
    if (selectedPlacedAssetId && transformControlsRef.current) {
        setSelectedPlacedAssetId(null); 
    }
    // onTerrainDeleted should handle backend and parent state update
    try {
        await onTerrainDeleted(terrainId); 
    } catch (err) {
        console.error('Error deleting terrain:', err);
        if (onError) onError(err.message || "Failed to delete terrain.");
    }
  };
  
  const viewerKey = terrainUrl || 'no-terrain';

  // Effect to update TransformControls mode and visibility of handles based on transformMode prop
  useEffect(() => {
    const currentTC = transformControlsRef.current;
    if (currentTC) {
      currentTC.setMode(transformMode);
      if (transformMode === 'scale') {
        currentTC.showX = true; // Keep X for uniform scaling (or allow center point)
        currentTC.showY = false; 
        currentTC.showZ = false;
      } else {
        currentTC.showX = true;
        currentTC.showY = true;
        currentTC.showZ = true;
      }
    }
  }, [transformMode]); // Only re-run if transformMode changes

  // load floor plan and asset id mapping
  const loadFloorPlan = useCallback(async (width, depth, gridCenter) => {
    if (!sceneRef.current) return;
    
    // clean up previous floor plan assets
    if (floorPlanAssetsRef.current.length > 0) {
      floorPlanAssetsRef.current.forEach(asset => {
        if (sceneRef.current && asset.parent) {
          sceneRef.current.remove(asset);
        }
        // memory cleanup
        asset.traverse((child) => {
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
      });
      floorPlanAssetsRef.current = []; // clear array
    }
    
    try {
      // load floor plan
      let planData;
      if (floorPlan) {
        // floorPlan is passed as an object directly
        planData = floorPlan;
      } else {
        // fallback to API endpoint when floorPlan is not provided
        const planResponse = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DUNGEON.FLOOR_PLAN}`);
        if (!planResponse.ok) {
          throw new Error(`Failed to fetch floor plan: ${planResponse.statusText}`);
        }
        planData = await planResponse.json();
      }

      // load asset id mapping
      const idxResponse = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DUNGEON.ASSET_MAPPING}`);
      if (!idxResponse.ok) {
        throw new Error(`Failed to fetch asset mapping: ${idxResponse.statusText}`);
      }
      const idxData = await idxResponse.json();

      const tiles = planData.tiles;
      const tileSize = gridSizeRef.current / divisionsRef.current;
      const startX = -gridSizeRef.current / 2 + gridCenter.x;
      const startZ = -gridSizeRef.current / 2 + gridCenter.z;

      const loader = new GLTFLoader();

      const loadModel = async (modelName) => {
        // if model is in cache, use it
        if (modelCacheRef.current.has(modelName)) {
          return modelCacheRef.current.get(modelName).clone();
        }

        const modelUrl = `${CONFIG.API.BASE_URL}/assets/dungeon/models/${modelName}.glb`;
        try {
          const gltf = await new Promise((resolve, reject) => {
            loader.load(modelUrl, resolve, undefined, reject);
          });

          const model = gltf.scene;
          // improve model settings
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.metalness = 0.1;
                child.material.roughness = 0.8;
              }
            }
          });

          // save to cache
          modelCacheRef.current.set(modelName, model);
          return model.clone();
        } catch (error) {
          console.error(`Failed to load model ${modelName}:`, error);
          throw error;
        }
      };

      // place floor first
      for (let row = 0; row < tiles.length; row++) {
        for (let col = 0; col < tiles[row].length; col++) {
          const tileId = tiles[row][col];
          if (tileId && tileId !== "0" && idxData["1"]) {
            const modelName = idxData["1"];
            try {
              const model = await loadModel(modelName);
              const boundingBox = new THREE.Box3().setFromObject(model);
              const modelSize = new THREE.Vector3();
              boundingBox.getSize(modelSize);
              const modelCenter = new THREE.Vector3();
              boundingBox.getCenter(modelCenter);

              const scaleX = tileSize / modelSize.x;
              const scaleZ = tileSize / modelSize.z;
              const scale = Math.min(scaleX, scaleZ);
              model.scale.set(scale, scale, scale);

              const targetX = startX + col * tileSize;
              const targetZ = startZ + row * tileSize;
              
              model.position.set(
                targetX - (modelCenter.x - modelSize.x / 2) * scale,
                0 - boundingBox.min.y * (scale * 0.9), 
                targetZ - (modelCenter.z - modelSize.z / 2) * scale
              );

              model.userData = {
                assetId: `${modelName}_${row}_${col}`,
                type: modelName,
                position: { x: targetX, y: 0, z: targetZ },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
              };

              sceneRef.current.add(model);
              floorPlanAssetsRef.current.push(model); // add to tracking list
            } catch (modelError) {
              console.error(`Failed to load model ${modelName} at position (${row}, ${col}):`, modelError);
            }
          }
        }
      }
      // place walls
      for (let row = 0; row < tiles.length; row++) {
        for (let col = 0; col < tiles[row].length; col++) {
          const tileId = tiles[row][col];
          if (tileId && tileId !== "0") {
            const dirs = [[-1, 0], [0, -1], [1, 0], [0, 1]];
            for (let dir = 0; dir < 4; dir++) {
              const [drow, dcol] = dirs[dir];
              if (row + drow < 0 || row + drow >= tiles.length || col + dcol < 0 || col + dcol >= tiles[row].length) {
                continue;
              }
              if (tiles[row + drow][col + dcol] !== "0") {
                continue;
              }
              const modelName = idxData["w"];
              try {
                const model = await loadModel(modelName);
                const boundingBox = new THREE.Box3().setFromObject(model);
                const modelSize = new THREE.Vector3();
                boundingBox.getSize(modelSize);
                const modelCenter = new THREE.Vector3();
                boundingBox.getCenter(modelCenter);
                
                const scaleX = tileSize / modelSize.x;
                const scaleZ = tileSize / modelSize.z;
                const scale = Math.min(scaleX, scaleZ);
                model.scale.set(scale, scale, scale);
                
                model.rotation.y = Math.PI / 2 * dir;
                const newCenterX = modelCenter.x * Math.cos(-Math.PI / 2 * dir) -
                  modelCenter.z * Math.sin(-Math.PI / 2 * dir);
                const newCenterZ = modelCenter.x * Math.sin(-Math.PI / 2 * dir) +
                  modelCenter.z * Math.cos(-Math.PI / 2 * dir);
  
                const targetX = startX + col * tileSize;
                const targetZ = startZ + row * tileSize;
                const thickness = Math.min(modelSize.x * scale, modelSize.z * scale);
                
                model.position.set(
                  targetX - (newCenterX) * scale + tileSize / 2 + (tileSize) / 2 * dcol,
                  // targetX - (newCenterX) * scale + tileSize / 2 + (tileSize + thickness) / 2 * dcol,
                  0 - boundingBox.min.y * (scale * 0.9), 
                  targetZ - (newCenterZ) * scale + tileSize / 2 + (tileSize) / 2 * drow
                  // targetZ - (newCenterZ) * scale + tileSize / 2 + (tileSize + thickness) / 2 * drow
                );
  
                model.userData = {
                  assetId: `${modelName}_${row}_${col}`,
                  type: modelName,
                  position: { x: targetX, y: 0, z: targetZ },
                  rotation: { x: 0, y: 0, z: 0 },
                  scale: { x: 1, y: 1, z: 1 }
                };
  
                sceneRef.current.add(model);
                floorPlanAssetsRef.current.push(model); // add to tracking list
              } catch (modelError) {
                console.error(`Failed to load model ${modelName} at position (${row}, ${col}):`, modelError);
              }
            }
          }
        }
      }
      // place assets on each tile
      for (let row = 0; row < tiles.length; row++) {
        for (let col = 0; col < tiles[row].length; col++) {
          const tileId = tiles[row][col];
          if (tileId && tileId !== "0" && tileId !== "1" && idxData[tileId]) {
            const modelName = idxData[tileId];
            try {
              const model = await loadModel(modelName);
              const boundingBox = new THREE.Box3().setFromObject(model);
              const modelSize = new THREE.Vector3();
              boundingBox.getSize(modelSize);
              const modelCenter = new THREE.Vector3();
              boundingBox.getCenter(modelCenter);

              const scaleX = tileSize / modelSize.x;
              const scaleZ = tileSize / modelSize.z;
              const scale = Math.min(scaleX, scaleZ) * 0.9;
              model.scale.set(scale, scale, scale);

              const targetX = startX + col * tileSize;
              const targetZ = startZ + row * tileSize;

              model.position.set(
                targetX - modelCenter.x * scale + tileSize / 2,
                0 - boundingBox.min.y * (scale * 0.9), 
                targetZ - modelCenter.z * scale + tileSize / 2
              );

              model.userData = {
                assetId: `${modelName}_${row}_${col}`,
                type: modelName,
                position: { x: targetX, y: 0, z: targetZ },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
              };

              sceneRef.current.add(model);
              floorPlanAssetsRef.current.push(model); // add to tracking list
            } catch (modelError) {
              console.error(`Failed to load model ${modelName} at position (${row}, ${col}):`, modelError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading floor plan:', error);
      if (onError) {
        onError(error.message);
      }
    }
  }, [floorPlan, onError]);

  // load floor plan when scaled size and center change
  useEffect(() => {
    // Only load floor plan for "Generated Dungeon" (when terrainUrl is null/undefined)
    if (terrainUrl) {
      return; // Skip floor plan loading for regular terrains
    }
    
    // debounce function: prevent multiple executions within a short period
    const timeoutId = setTimeout(() => {
      if (scaledSize.x > 0 && scaledSize.z > 0) {
        // console.log('loadFloorPlan called:', { width: scaledSize.x, depth: scaledSize.z, center: scaledCenter });
        loadFloorPlan(scaledSize.x, scaledSize.z, scaledCenter);
      }
    }, 100); // 100ms wait

    return () => clearTimeout(timeoutId); // cleanup
  }, [terrainUrl, floorPlan, scaledSize.x, scaledSize.z, scaledCenter.x, scaledCenter.z, loadFloorPlan]);

  // clear model cache when component unmounts
  useEffect(() => {
    return () => {
      modelCacheRef.current.clear();
    };
  }, []);

  // 新しいエフェクト: スケール変更のみを処理（シーンの再作成を避ける）
  useEffect(() => {
    if (terrainModelRef.current && sceneRef.current) {
      // Regular terrain with 3D model
      terrainModelRef.current.scale.set(currentScale, currentScale, currentScale);
      
      // スケール変更後の計算を実行
      const newScaledBox = new THREE.Box3().setFromObject(terrainModelRef.current);
      const newScaledSize = newScaledBox.getSize(new THREE.Vector3());
      const newScaledCenter = newScaledBox.getCenter(new THREE.Vector3());
      
      setScaledBox(newScaledBox);
      setScaledSize(newScaledSize);
      setScaledCenter(newScaledCenter);
      
      updateCustomGrid(newScaledSize.x, newScaledSize.z, newScaledCenter);
      if (onTerrainMetricsUpdate) {
        onTerrainMetricsUpdate({
          width: newScaledSize.x, depth: newScaledSize.z, height: newScaledSize.y,
          centerX: newScaledCenter.x, centerY: newScaledCenter.y, centerZ: newScaledCenter.z,
        });
      }
    } else if (!terrainUrl) {
      // Generated Dungeon - scale by changing cell size while keeping cell count (divisions) fixed
      if (fixedDivisionsRef.current) {
        const cellSize = 2; // Base cell size
        const newCellSize = cellSize * currentScale;
        const newGridSize = fixedDivisionsRef.current * newCellSize;
        const newScaledSize = new THREE.Vector3(newGridSize, 0, newGridSize);
        const newScaledCenter = new THREE.Vector3(0, 0, 0);
        
        setScaledSize(newScaledSize);
        setScaledCenter(newScaledCenter);
        
        updateCustomGrid(newGridSize, newGridSize, newScaledCenter);
        if (onTerrainMetricsUpdate) {
          onTerrainMetricsUpdate({
            width: newGridSize, depth: newGridSize, height: 0,
            centerX: newScaledCenter.x, centerY: newScaledCenter.y, centerZ: newScaledCenter.z,
          });
        }
      }
    }
  }, [currentScale, updateCustomGrid, onTerrainMetricsUpdate, terrainUrl]); // スケール変更のみを監視

  return (
    <div key={viewerKey} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {error && <div style={{ color: 'red', position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px', zIndex: 10 }}>Error: {error}</div>}
      {isLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 20, color: 'white' }}>
          Loading Terrain...
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Transform Selected Asset Panel */}
      {selectedPlacedAssetId && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          zIndex: 15, 
          background: THEME.bgLighter, 
          padding: '12px', 
          borderRadius: '6px',
          border: `2px solid ${THEME.accent}`,
          minWidth: '200px'
        }}>
          <div style={{ color: THEME.textPrimary, fontWeight: 'bold', marginBottom: '8px' }}>
            Transform Selected Asset
          </div>
          <div style={{ color: THEME.textSecondary, fontSize: '12px', marginBottom: '8px' }}>
            Mode: {transformMode}
          </div>
          
          {/* Transform Mode Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '5px', marginBottom: '8px' }}>
            <Button 
              onClick={() => onTransformModeChange && onTransformModeChange('translate')}
              variant={transformMode === 'translate' ? 'primary' : 'secondary'}
              size="small"
              style={{flexGrow: 1, fontSize: '10px', padding: '4px'}}
            >
              Move (T)
            </Button>
            <Button 
              onClick={() => onTransformModeChange && onTransformModeChange('rotate')}
              variant={transformMode === 'rotate' ? 'primary' : 'secondary'}
              size="small"
              style={{flexGrow: 1, fontSize: '10px', padding: '4px'}}
            >
              Rotate (R)
            </Button>
            <Button 
              onClick={() => onTransformModeChange && onTransformModeChange('scale')}
              variant={transformMode === 'scale' ? 'primary' : 'secondary'}
              size="small"
              style={{flexGrow: 1, fontSize: '10px', padding: '4px'}}
            >
              Scale (S)
            </Button>
          </div>
          
          <Button 
            onClick={() => setSelectedPlacedAssetId(null)} 
            size="small" 
            variant="secondary"
            style={{ width: '100%', marginBottom: '5px' }}
          >
            Deselect (Esc)
          </Button>
          
          <Button 
            onClick={() => onPlacedAssetDeleted && onPlacedAssetDeleted(selectedPlacedAssetId)} 
            variant="danger"
            size="small"
            style={{ width: '100%', backgroundColor: THEME.dangerButton || '#dc3545', color: 'white' }}
          >
            Delete Selected Asset
          </Button>
        </div>
      )}

      {(
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5, background: THEME.bgLighter, padding: '8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="scaleInput" style={{color: THEME.textPrimary, fontSize: '12px'}}>Terrain Scale:</label>
                <input
                type="number" 
                id="scaleInput"
                value={currentScale} 
                onChange={handleScaleChange} 
                min="0.1" 
                step="0.1" 
                style={{width: '60px', padding: '4px', background: THEME.bgPrimary, color: THEME.textPrimary, border: `1px solid ${THEME.border}`}}
            />
            {terrainUrl && ( // Only show Save Scale button for regular terrains
              <Button onClick={handleSaveScale} size="small" variant={saveStatus === 'success' ? 'success' : saveStatus === 'error' ? 'danger' : 'primary'}>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save Scale'}
              </Button>
            )}
          </div>
          <Button onClick={handleToggleGrid} size="small">{isGridVisible ? 'Hide Grid' : 'Show Grid'}</Button>
          {terrainUrl && ( // Only show Edit Name and Delete buttons for regular terrains
            <>
              {isEditingName ? (
                <div style={{display: 'flex', gap: '5px'}}>
                  <input type="text" value={editedName} onChange={handleNameInputChange} style={{padding: '4px', background: THEME.bgPrimary, color: THEME.textPrimary, border: `1px solid ${THEME.border}`}} />
                  <Button onClick={handleNameEditSubmit} size="small">Save</Button>
                  <Button onClick={() => setIsEditingName(false)} size="small" variant="secondary">Cancel</Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditingName(true)} size="small">Edit Name</Button>
              )}
              <Button onClick={handleDeleteTerrain} variant="danger" size="small">Delete Terrain</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(TerrainViewer); 