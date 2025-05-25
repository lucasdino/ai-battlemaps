import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // Standard controls
import { DragControls } from 'three/examples/jsm/controls/DragControls'; // <-- IMPORT DRAGCONTROLS
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
  hideControls = false,
  showGrid: initialShowGrid = true, // Renamed prop for clarity
  scale: initialScaleProp, // Accept scale as prop if available
  selectedAsset, // For placing NEW assets
  onAssetPlaced, 
  placedAssets: assetsToDisplayProp,
  onPlacedAssetSelected,
  onPlacedAssetMoved // <-- NEW PROP for when an asset is moved by dragging
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null); // For OrbitControls
  const terrainModelRef = useRef(null); // Reference to the loaded GLTF scene
  const gridHelperRef = useRef(null); // Will now hold LineSegments for custom grid
  const animationFrameIdRef = useRef(null); // For cancelling animation frame
  const assetLoaderRef = useRef(new GLTFLoader());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const selectionBoxRef = useRef(null); // For visually indicating selection
  const dragControlsRef = useRef(null); // <-- REF FOR DRAGCONTROLS

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(terrainName || '');
  const [isGridVisible, setIsGridVisible] = useState(initialShowGrid);
  const [currentScale, setCurrentScale] = useState(initialScaleProp || 1);
  const [saveStatus, setSaveStatus] = useState(null); // For save feedback
  const assetInstancesRef = useRef({}); // Use a ref to keep track of loaded instances { [assetId]: instance }
  const [selectedPlacedAssetId, setSelectedPlacedAssetId] = useState(null); // ID of the currently selected PLACED asset

  // Load scale from backend if not provided as prop
  useEffect(() => {
    if (!terrainId) return;
    // If initialScaleProp is provided, use it
    if (typeof initialScaleProp === 'number') {
      setCurrentScale(initialScaleProp);
      return;
    }
    // Otherwise, fetch from backend
    fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}`)
      .then(res => res.json())
      .then(data => {
        if (typeof data.scale === 'number') {
          setCurrentScale(data.scale);
        }
      })
      .catch(() => {});
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

  // Basic scene initialization
  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME.bgSecondary || 0x282c34);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // Adjusted for an angled top-down view
    const viewDistance = 10; // Distance from origin for the initial view
    camera.position.set(viewDistance / Math.sqrt(2), viewDistance, viewDistance / Math.sqrt(2)); // Angled view
    // For a more direct 45-degree top-down:
    // camera.position.set(0, viewDistance, viewDistance); // Or an X/Z offset if preferred
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding; // Important for GLTF colors
    renderer.shadowMap.enabled = true; // Enable shadows in the renderer
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Lighting Setup ---
    // Ambient light for overall scene visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 3); // Further increased ambient light
    scene.add(ambientLight);

    // Directional light for highlights and shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Further increased directional light
    directionalLight.position.set(20, 40, 25); // Adjusted position for broader coverage
    directionalLight.castShadow = true;
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048; // Increased shadow map resolution
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100; // Increased far plane for shadows
    const shadowCamSize = 30; // Increased area covered by shadow camera
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;
    directionalLight.shadow.bias = -0.001; // Helps prevent shadow acne

    scene.add(directionalLight);
    // For debugging shadow camera:
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowHelper);
    // --- End Lighting Setup ---

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0); // Look at origin
    controlsRef.current = controls;

    // Initial placeholder for grid, will be replaced on model load
    // const initialGridColor = new THREE.Color(0xffffff); // White
    // const gridHelper = new THREE.GridHelper(10, 10, initialGridColor, initialGridColor);
    // gridHelper.position.y = 0;
    // gridHelper.visible = isGridVisible;
    // scene.add(gridHelper);
    // gridHelperRef.current = gridHelper; // Store initial reference

    // Animation loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      controls.update(); // Only required if controls.enableDamping or controls.autoRotate are set to true
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!currentMount || !rendererRef.current || !cameraRef.current) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      rendererRef.current.setSize(newWidth, newHeight);
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Dispose scene objects if necessary (omitted for brevity, but important for complex scenes)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Effect to setup DragControls when an asset is selected
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const rendererDomElement = rendererRef.current?.domElement;
    const orbitControls = controlsRef.current; // OrbitControls instance

    // Clean up existing DragControls
    if (dragControlsRef.current) {
      dragControlsRef.current.dispose();
      dragControlsRef.current = null;
    }

    // Only setup DragControls if an asset is selected, and we are NOT placing a new one,
    // and all necessary refs are available.
    if (selectedPlacedAssetId && !selectedAsset && assetInstancesRef.current[selectedPlacedAssetId] && scene && camera && rendererDomElement && orbitControls && terrainModelRef.current) {
      const selectedInstance = assetInstancesRef.current[selectedPlacedAssetId];
      const dragItems = [selectedInstance];
      
      const newDragControls = new DragControls(dragItems, camera, rendererDomElement);
      dragControlsRef.current = newDragControls;

      let originalMaterials = new Map(); // To store original material properties

      newDragControls.addEventListener('dragstart', function (event) {
        orbitControls.enabled = false; // Disable OrbitControls during drag
        
        originalMaterials.clear();
        event.object.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              if (!originalMaterials.has(material.uuid)) {
                originalMaterials.set(material.uuid, {
                  opacity: material.opacity,
                  transparent: material.transparent,
                });
              }
              material.opacity = 0.6;
              material.transparent = true;
              material.needsUpdate = true;
            });
          }
        });
      });

      newDragControls.addEventListener('drag', function (event) {
        // Constrain dragging to XZ plane by resetting Y.
        // Note: The object's Y might be its center. We'll snap to terrain on dragend.
        // For now, let's allow free dragging in 3D space and rely on dragend for final positioning
        // For simple XZ plane dragging:
        // event.object.position.y = assetInstancesRef.current[selectedPlacedAssetId]?.userData?.originalY || 0; 
      });
      
      newDragControls.addEventListener('dragend', function (event) {
        orbitControls.enabled = true; // Re-enable OrbitControls
        
        event.object.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              if (originalMaterials.has(material.uuid)) {
                const originalProps = originalMaterials.get(material.uuid);
                material.opacity = originalProps.opacity;
                material.transparent = originalProps.transparent;
                material.needsUpdate = true;
              }
            });
          }
        });
        originalMaterials.clear();

        const draggedAsset = event.object;
        const assetId = draggedAsset.userData?.assetId;

        if (assetId && onPlacedAssetMoved && terrainModelRef.current) {
          // New X and Z are from the drag
          const newX = draggedAsset.position.x;
          const newZ = draggedAsset.position.z;

          // Raycast downwards from above the new X,Z to find the terrain Y
          const raycaster = new THREE.Raycaster();
          const down = new THREE.Vector3(0, -1, 0);
          // Start raycast from a point above the asset's new X,Z position
          const origin = new THREE.Vector3(newX, draggedAsset.position.y + 10, newZ); // Start 10 units above current dragged Y
          raycaster.set(origin, down);

          const mainTerrainObject = terrainModelRef.current;
          const intersectsTerrain = raycaster.intersectObject(mainTerrainObject, true); // Recursive check

          let newY = draggedAsset.position.y; // Default to dragged Y if no intersection
          if (intersectsTerrain.length > 0) {
            newY = intersectsTerrain[0].point.y; // Y from terrain
            // Now, adjust Y so the bottom of the asset model sits on the terrain
            const bbox = new THREE.Box3().setFromObject(draggedAsset);
            newY -= bbox.min.y; // Shift model up by its "depth" below its origin
          } else {
            console.warn(`[DragControls] DragEnd: Could not snap asset ${assetId} to terrain. Using its current Y.`);
          }
          
          const finalPosition = new THREE.Vector3(newX, newY, newZ);
          onPlacedAssetMoved(assetId, finalPosition);
          
          // Update the instance's position directly for immediate visual feedback
          // The parent will update state, which will re-render, but this can avoid flicker.
          // However, this might conflict if parent state update is slow or different.
          // For now, let parent handle state.
        }
      });
    }

    return () => { // Cleanup when effect re-runs or component unmounts
      if (dragControlsRef.current) {
        dragControlsRef.current.dispose();
        dragControlsRef.current = null;
      }
    };
  // Depend on selectedPlacedAssetId, selectedAsset (to disable drag when placing), and refs
  }, [selectedPlacedAssetId, selectedAsset, onPlacedAssetMoved, terrainModelRef]); 

  // Effect to update visual selection indicator (BoxHelper)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing selection box if any
    if (selectionBoxRef.current) {
      scene.remove(selectionBoxRef.current);
      selectionBoxRef.current.dispose?.(); // Dispose geometry/material if applicable (BoxHelper does this internally)
      selectionBoxRef.current = null;
    }

    if (selectedPlacedAssetId && assetInstancesRef.current[selectedPlacedAssetId]) {
      const selectedInstance = assetInstancesRef.current[selectedPlacedAssetId];
      const boxHelper = new THREE.BoxHelper(selectedInstance, 0xffff00); // Yellow color for selection
      scene.add(boxHelper);
      selectionBoxRef.current = boxHelper;
    }
  }, [selectedPlacedAssetId, assetsToDisplayProp]); // Re-run if selection or displayed assets change (instances might re-render)

  // Call onPlacedAssetSelected when selectedPlacedAssetId changes
  useEffect(() => {
    if (onPlacedAssetSelected) {
      onPlacedAssetSelected(selectedPlacedAssetId);
    }
  }, [selectedPlacedAssetId, onPlacedAssetSelected]);

  // Effect for handling click-to-place OR click-to-select
  useEffect(() => {
    if (!rendererRef.current || !rendererRef.current.domElement) return;
    
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    const handleClick = (event) => {
      // --- DEBUG LOG ---
      // console.log(
      //   '[TV handleClick] Start. selectedAsset:', selectedAsset, 
      //   'selectedAsset.modelUrl:', selectedAsset ? selectedAsset.modelUrl : 'N/A', 
      //   'terrainModelRef.current:', !!terrainModelRef.current
      // );

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Case 1: Placing a NEW asset (selectedAsset prop is provided)
      if (selectedAsset && selectedAsset.modelUrl && terrainModelRef.current) {
        const mainTerrainObject = terrainModelRef.current;

        // --- DEBUG LOG (ensure this is reached) ---
        // console.log('[TV handleClick] Raycasting Check. mainTerrainObject:', mainTerrainObject, 'Children:', mainTerrainObject.children);

        const intersectsTerrain = raycasterRef.current.intersectObjects(mainTerrainObject.children, true);

        // --- DEBUG LOG ---
        // console.log('[TV handleClick] Placing new asset. Intersects terrain:', intersectsTerrain.length > 0, intersectsTerrain);

        if (intersectsTerrain.length > 0) {
          const intersectionPoint = intersectsTerrain[0].point;
          const newAssetData = {
            id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            modelUrl: selectedAsset.modelUrl, // Ensure this is correct
            name: selectedAsset.name || 'Asset',
            position: { 
              x: intersectionPoint.x, 
              y: intersectionPoint.y,
              z: intersectionPoint.z 
            },
            rotation: selectedAsset.rotation || { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
            scale: selectedAsset.scale || { x: 1, y: 1, z: 1 },
            instance: null 
          };
          if (onAssetPlaced) {
            // --- DEBUG LOG ---
            // console.log('[TV handleClick] Calling onAssetPlaced with:', newAssetData);
            onAssetPlaced(newAssetData); 
          }
        }
      } 
      // Case 2: Selecting an EXISTING placed asset (no new asset being placed)
      else if (!selectedAsset) {
        const placedAssetInstances = Object.values(assetInstancesRef.current).filter(Boolean);
        const intersectsAssets = raycasterRef.current.intersectObjects(placedAssetInstances, true);

        if (intersectsAssets.length > 0) {
          // Find the highest-level parent that is a direct child of the scene (or the asset group)
          // and has our userData.assetId
          let clickedAssetInstance = intersectsAssets[0].object;
          while (clickedAssetInstance.parent !== scene && clickedAssetInstance.parent !== null) {
            if (clickedAssetInstance.userData?.assetId) break; // Found the main group for the asset
            clickedAssetInstance = clickedAssetInstance.parent;
          }
          
          if (clickedAssetInstance?.userData?.assetId) {
            setSelectedPlacedAssetId(clickedAssetInstance.userData.assetId);
          } else {
            // Clicked on a part of an asset that doesn't have the ID, or logic error. Deselect.
            setSelectedPlacedAssetId(null);
          }
        } else {
          // Clicked on empty space (or terrain, if we don't re-check terrain here), deselect.
          // Check if terrain was clicked to avoid deselecting if user just clicks terrain
          const mainTerrainObject = terrainModelRef.current;
          if (mainTerrainObject) {
            const intersectsTerrain = raycasterRef.current.intersectObject(mainTerrainObject, true);
            if (intersectsTerrain.length > 0) {
              // Clicked on terrain, deselect any selected asset
               setSelectedPlacedAssetId(null);
            }
            // If not terrain and not asset, it's empty space - also deselect
            else {
                 setSelectedPlacedAssetId(null);
            }
          } else {
            // No terrain model, just empty space
            setSelectedPlacedAssetId(null);
          }
        }
      }
    };

    const rendererDomElement = rendererRef.current.domElement;
    rendererDomElement.addEventListener('click', handleClick);

    return () => {
      if (rendererDomElement) { 
        rendererDomElement.removeEventListener('click', handleClick);
      }
    };
  }, [selectedAsset, onAssetPlaced, assetsToDisplayProp, onPlacedAssetSelected]); // Added assetsToDisplayProp and onPlacedAssetSelected

  // Effect for loading and managing placed asset models in the scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentInstanceIds = Object.keys(assetInstancesRef.current);
    const propAssetIds = assetsToDisplayProp.map(a => a.id);

    // 1. Remove assets that are in currentInstances but no longer in props
    currentInstanceIds.forEach(instanceId => {
      if (!propAssetIds.includes(instanceId)) {
        const instanceToRemove = assetInstancesRef.current[instanceId];
        if (instanceToRemove) {
          scene.remove(instanceToRemove);
          // TODO: Proper disposal of geometry and material
        }
        delete assetInstancesRef.current[instanceId];
      }
    });

    // 2. Load and add new assets that are in props but not yet in currentInstances
    assetsToDisplayProp.forEach(assetData => {
      // --- DIAGNOSTIC LOG --- 
      console.log(`[TV AssetSync] Processing asset: ${assetData.name} (ID: ${assetData.id}), Already loaded: ${!!assetInstancesRef.current[assetData.id]}`);
      
      if (!assetInstancesRef.current[assetData.id] && assetData.modelUrl) {
        const fullAssetUrl = assetData.modelUrl.startsWith('http') 
          ? assetData.modelUrl 
          : `${CONFIG.API.BASE_URL}${assetData.modelUrl.startsWith('/') ? '' : '/'}${assetData.modelUrl}`;

        assetLoaderRef.current.load(
          fullAssetUrl,
          (gltf) => {
            const modelInstance = gltf.scene.clone();
            
            // Set scale and rotation first, as these can affect the bounding box
            modelInstance.scale.set(assetData.scale.x, assetData.scale.y, assetData.scale.z);
            modelInstance.rotation.set(assetData.rotation.x, assetData.rotation.y, assetData.rotation.z);
            
            // Calculate bounding box AFTER scaling and rotation (rotation might not be critical for axis-aligned bbox height)
            const bbox = new THREE.Box3().setFromObject(modelInstance);
            
            // The goal is to have the world-coordinate bottom of the model (bbox.min.y after world transform)
            // sit at assetData.position.y (the click point on the terrain).
            // modelInstance.position is the model's origin.
            // The offset from the model's origin to its bottom is bbox.min.y (in its local, scaled space).
            // So, modelInstance.position.y + bbox.min.y (world) = assetData.position.y (world)
            // modelInstance.position.y = assetData.position.y - bbox.min.y (where bbox.min.y is relative to origin after scale)
            // Let's try to set the origin to the click point, then shift it based on bbox.
            modelInstance.position.set(assetData.position.x, assetData.position.y, assetData.position.z);
            modelInstance.position.y -= bbox.min.y; // Subtracting bbox.min.y will shift the model up if min.y is negative, down if positive.

            modelInstance.userData = { assetId: assetData.id }; // Essential for identification

            modelInstance.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // --- BEGIN MATERIAL LOGGING ---
                if (child.material) {
                  console.log(`[Asset Material] Asset: ${assetData.name}, Mesh: ${child.name}, Material Type: ${child.material.type}`);
                  if (child.material.isMeshStandardMaterial) {
                    console.log(`  Original Color:`, child.material.color.getHexString());
                    console.log(`  Original Metalness: ${child.material.metalness}, Roughness: ${child.material.roughness}`);
                    
                    // --- BEGIN RUNTIME MATERIAL ADJUSTMENT ---
                    child.material.metalness = 0.5; // Reduce metalness
                    child.material.roughness = 0.5; // Reduce roughness
                    // child.material.color.setHex(0xffffff); // Ensure base color is white if it's not
                    console.log(`  Adjusted Metalness: ${child.material.metalness}, Roughness: ${child.material.roughness}`);
                    // --- END RUNTIME MATERIAL ADJUSTMENT ---

                    console.log(`  Emissive:`, child.material.emissive.getHexString(), `Intensity: ${child.material.emissiveIntensity}`);
                  } else if (child.material.isMeshBasicMaterial) {
                    console.log(`  Color:`, child.material.color.getHexString());
                    console.warn(`  WARN: MeshBasicMaterial used, will not respond to scene lighting.`);
                  }
                  // Log if material is an array (MultiMaterial)
                  if (Array.isArray(child.material)) {
                    console.log(`  Material is an array (MultiMaterial). Count: ${child.material.length}`);
                    child.material.forEach((mat, index) => {
                      console.log(`    Sub-material ${index}: Type: ${mat.type}`);
                      if (mat.isMeshStandardMaterial) {
                        console.log(`      Color:`, mat.color.getHexString());
                        console.log(`      Metalness: ${mat.metalness}, Roughness: ${mat.roughness}`);
                      } else if (mat.isMeshBasicMaterial) {
                        console.log(`      Color:`, mat.color.getHexString());
                        console.warn(`      WARN: Sub-material MeshBasicMaterial used.`);
                      }
                    });
                  }
                } else {
                  console.log(`[Asset Material] Asset: ${assetData.name}, Mesh: ${child.name}, No material found.`);
                }
                // --- END MATERIAL LOGGING ---
              }
            });
            
            scene.add(modelInstance);
            assetInstancesRef.current[assetData.id] = modelInstance; // Store instance
          },
          undefined, // onProgress
          (error) => {
            console.error(`Error loading asset ${fullAssetUrl}:`, error);
            if (onError) onError(`Failed to load asset: ${assetData.name || assetData.modelUrl}`);
            // If an asset fails to load, it simply won't be added to assetInstancesRef.current
            // The parent component (ViewTerrains) is responsible for the list of assets that *should* exist.
          }
        );
      }
    });

  }, [assetsToDisplayProp, onError]); // Depend on the prop `assetsToDisplayProp`

  // Load terrain model
  useEffect(() => {
    if (!terrainUrl || !sceneRef.current) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`[TerrainViewer] Loading terrain: ${terrainUrl}`);

    const loader = new GLTFLoader();
    loader.load(
      terrainUrl,
      (gltf) => {
        console.log('[TerrainViewer] GLTF loaded successfully', gltf);
        const scene = sceneRef.current;
        if (!scene) return;

        // Remove previous model
        if (terrainModelRef.current) {
          scene.remove(terrainModelRef.current);
          // TODO: Proper disposal of old model resources
        }

        const model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(currentScale, currentScale, currentScale); // Apply initial/current scale

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Ensure material maps are correctly handled (flipY often not needed for GLTF)
            if (child.material && child.material.map) {
              // child.material.map.flipY = false; // Usually GLTF handles this
            }
          }
        });
        
        scene.add(model);
        terrainModelRef.current = model;
        setIsLoading(false);

        // Get model dimensions for camera and grid adjustments
        const box = new THREE.Box3().setFromObject(model); 
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Create and add the custom grid
        updateCustomGrid(size.x, size.z, center);

        // <-- ADDED CALL to onTerrainMetricsUpdate -->
        if (onTerrainMetricsUpdate) {
          onTerrainMetricsUpdate({
            width: size.x,
            depth: size.z,
            height: size.y, // Include height in case it's useful later
            centerX: center.x,
            centerY: center.y,
            centerZ: center.z,
          });
        }

        // Center camera on the new model
        if (controlsRef.current && cameraRef.current) {
            // --- Camera fit logic for 90% viewport ---
            const aspect = cameraRef.current.aspect;
            const fov = cameraRef.current.fov * (Math.PI / 180);
            // Get model size (already scaled)
            const boxWidth = size.x;
            const boxHeight = size.y;
            const boxDepth = size.z;
            // Fit 90% of viewport
            const fitRatio = 0.9;
            // Distance for height
            const distanceForHeight = (boxHeight / fitRatio) / (2 * Math.tan(fov / 2));
            // Distance for width
            const hfov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
            const distanceForWidth = (boxWidth / fitRatio) / (2 * Math.tan(hfov / 2));
            // Use the greater distance to ensure full fit
            let cameraDist = Math.max(distanceForHeight, distanceForWidth);
            // Add a small buffer for depth
            cameraDist += boxDepth * 0.5;
            // Camera targets the XZ center of the model, at Y=0 (top surface)
            const targetY = 0; 
            const camX = center.x + cameraDist / Math.sqrt(2); 
            const camY = targetY + cameraDist; // Position camera relative to Y=0               
            const camZ = center.z + cameraDist / Math.sqrt(2); 
            cameraRef.current.position.set(camX, camY, camZ);
            controlsRef.current.target.set(center.x, targetY, center.z); // Look at (center.x, 0, center.z)
            controlsRef.current.update();
        }
      },
      (xhr) => {
        // console.log(`[TerrainViewer] ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`);
      },
      (errorEvent) => {
        console.error('[TerrainViewer] Error loading GLTF:', errorEvent);
        const errorMessage = errorEvent.message || (errorEvent.target && errorEvent.target.statusText) || 'Failed to load terrain model.';
        setError(errorMessage);
        setIsLoading(false);
        if (onError) onError(errorMessage);
      }
    );
  }, [terrainUrl, onError, currentScale, onTerrainMetricsUpdate]); // Re-run if terrainUrl or currentScale changes, also add onTerrainMetricsUpdate

  // Function to create/update the custom rectangular grid
  const updateCustomGrid = (width, depth, gridCenter) => {
    if (gridHelperRef.current) {
      sceneRef.current.remove(gridHelperRef.current);
      gridHelperRef.current.geometry.dispose();
      gridHelperRef.current.material.dispose();
    }

    const points = [];
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const divisionsX = Math.ceil(width);
    const divisionsZ = Math.ceil(depth);

    // Lines parallel to Z-axis (covering X-dimension)
    for (let i = 0; i <= divisionsX; i++) {
      const x = (i / divisionsX) * width - halfWidth;
      points.push(new THREE.Vector3(x, 0, -halfDepth));
      points.push(new THREE.Vector3(x, 0, halfDepth));
    }

    // Lines parallel to X-axis (covering Z-dimension)
    for (let i = 0; i <= divisionsZ; i++) {
      const z = (i / divisionsZ) * depth - halfDepth;
      points.push(new THREE.Vector3(-halfWidth, 0, z));
      points.push(new THREE.Vector3(halfWidth, 0, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff }); // White grid lines
    const customGrid = new THREE.LineSegments(geometry, material);
    
    customGrid.position.set(gridCenter.x, 0, gridCenter.z);
    customGrid.visible = isGridVisible;
    
    sceneRef.current.add(customGrid);
    gridHelperRef.current = customGrid;
  };

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

  // Handle scale change
  const handleScaleChange = (event) => {
    const newScale = parseFloat(event.target.value);
    setCurrentScale(newScale);

    if (terrainModelRef.current && sceneRef.current) {
      terrainModelRef.current.scale.set(newScale, newScale, newScale);

      const scaledBox = new THREE.Box3().setFromObject(terrainModelRef.current);
      const scaledSizeVec = scaledBox.getSize(new THREE.Vector3());
      const scaledCenterVec = scaledBox.getCenter(new THREE.Vector3());

      updateCustomGrid(scaledSizeVec.x, scaledSizeVec.z, scaledCenterVec);
      
      // <-- ADDED CALL to onTerrainMetricsUpdate -->
      if (onTerrainMetricsUpdate) {
        onTerrainMetricsUpdate({
          width: scaledSizeVec.x,
          depth: scaledSizeVec.z,
          height: scaledSizeVec.y,
          centerX: scaledCenterVec.x,
          centerY: scaledCenterVec.y,
          centerZ: scaledCenterVec.z,
        });
      }
    }
    // TODO: Add API call here to persist the scale if desired
    // e.g., onScaleChange(terrainId, newScale);
  };

  // Handle name editing
  const handleNameInputChange = (e) => setEditedName(e.target.value);
  const handleNameEditSubmit = () => {
    if (editedName.trim() && editedName.trim() !== terrainName) {
      onTerrainNameChange(editedName.trim());
    }
    setIsEditingName(false);
  };

  // Handle terrain deletion
  const handleDeleteTerrain = async () => {
    if (!terrainId || !onTerrainDeleted) return;
    // Construct the API base URL correctly, assuming terrainUrl contains the full path to the GLB
    // Example terrainUrl: http://localhost:3001/assets/terrains/terrain_id.glb
    const baseUrlParts = terrainUrl.split('/').slice(0, 3); // Gets http://localhost:3001
    const apiBaseUrl = baseUrlParts.join('/');

    try {
        const response = await fetch(`${apiBaseUrl}/api/terrains/${terrainId}`, { // Use constructed API base
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Failed to delete terrain: ${response.status}` }));
            throw new Error(errorData.message);
        }
        const result = await response.json();
        onTerrainDeleted(terrainId, result.message);
    } catch (err) {
        console.error('Error deleting terrain:', err);
        if (onError) onError(err.message);
    }
  };
  
  useEffect(() => setEditedName(terrainName || ''), [terrainName]);

  // Key for re-rendering the entire viewer if terrainUrl changes, forcing a clean setup
  // This helps if direct state updates to Three.js objects become unreliable.
  const viewerKey = terrainUrl || 'no-terrain';

  return (
    <div key={viewerKey} style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: THEME.bgLight || '#f0f0f0' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {isLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', zIndex: 10 }}>
          <div style={{ borderWidth: '4px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', width: '40px', height: '40px', animation: 'spinViewer 1s linear infinite', marginBottom: '15px' }} />
          Loading terrain...
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(220,53,69,0.9)', color: 'white', zIndex: 10, padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '15px' }}>⚠️</div>
          <div>Error: {error}</div>
        </div>
      )}

      {!hideControls && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 5, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(40,44,52,0.8)', padding: '8px 12px', borderRadius: '6px' }}>
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={editedName}
                  onChange={handleNameInputChange}
                  onBlur={handleNameEditSubmit}
                  onKeyPress={(e) => e.key === 'Enter' && handleNameEditSubmit()}
                  style={{ color: THEME.textPrimary, backgroundColor: THEME.bgSecondary, border: `1px solid ${THEME.accentPrimary}`, borderRadius: '4px', padding: '6px 8px', marginRight: '8px' }}
                  autoFocus
                />
                <Button onClick={handleNameEditSubmit} variant="primary" size="small">Save</Button>
              </div>
            ) : (
              <h2 onClick={() => setIsEditingName(true)} title="Click to edit name" style={{ margin: 0, color: THEME.accentPrimary, fontSize: '18px', cursor: 'pointer' }}>
                {terrainName || 'Untitled Terrain'}
              </h2>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '10px'}}>
              <Button onClick={handleToggleGrid} variant={isGridVisible ? 'primary' : 'secondary'} style={{ padding: '8px 12px', fontSize: '14px' }}>
                Grid: {isGridVisible ? 'ON' : 'OFF'}
              </Button>
              <Button onClick={handleDeleteTerrain} variant="danger" style={{ padding: '8px 12px', fontSize: '14px' }}>
                Delete
              </Button>
            </div>
            {/* Scale Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(40,44,52,0.8)', padding: '8px 12px', borderRadius: '6px' }}>
              <label htmlFor="scaleSlider" style={{ color: THEME.textSecondary, fontSize: '12px', whiteSpace: 'nowrap' }}>Scale:</label>
              <input 
                type="range" 
                id="scaleSlider"
                min="0.1" 
                max="5" 
                step="0.05" 
                value={currentScale}
                onChange={handleScaleChange}
                style={{ width: '120px' /* Adjust as needed */ }}
              />
              <span style={{ color: THEME.textPrimary, fontSize: '12px', minWidth: '30px' }}>{currentScale.toFixed(2)}</span>
              <Button onClick={handleSaveScale} variant="primary" size="small" style={{ marginLeft: '8px' }}>Save Scale</Button>
              {saveStatus === 'saving' && <span style={{ color: THEME.textSecondary, fontSize: '12px', marginLeft: '6px' }}>Saving...</span>}
              {saveStatus === 'success' && <span style={{ color: 'lime', fontSize: '12px', marginLeft: '6px' }}>Saved!</span>}
              {saveStatus === 'error' && <span style={{ color: 'red', fontSize: '12px', marginLeft: '6px' }}>Error</span>}
            </div>
          </div>
        </div>
      )}
      
      {/* Add keyframes for spinner to avoid style conflicts */}
      <style>{`
        @keyframes spinViewer {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TerrainViewer; 