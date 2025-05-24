import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // Standard controls
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
  hideControls = false,
  showGrid: initialShowGrid = true, // Renamed prop for clarity
  scale: initialScaleProp // Accept scale as prop if available
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null); // For OrbitControls
  const terrainModelRef = useRef(null); // Reference to the loaded GLTF scene
  const gridHelperRef = useRef(null); // Will now hold LineSegments for custom grid
  const animationFrameIdRef = useRef(null); // For cancelling animation frame
  // const originalModelSizeRef = useRef(null); // To store unscaled model dimensions

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(terrainName || '');
  const [isGridVisible, setIsGridVisible] = useState(initialShowGrid);
  const [currentScale, setCurrentScale] = useState(initialScaleProp || 1);
  const [saveStatus, setSaveStatus] = useState(null); // For save feedback

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

    // --- Carmack-Inspired Lighting: Simple, Bright, Top-Down --- 
    // Ambient light for overall scene visibility, prevents pitch black areas.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Moderate ambient
    scene.add(ambientLight);

    // Single, strong DirectionalLight from directly above.
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0); // Strong intensity
    sunLight.position.set(0, 50, 0); // Positioned very high, directly above origin
    sunLight.castShadow = true;

    // Configure shadows for the sunLight
    sunLight.shadow.mapSize.width = 1024; // Shadow map resolution
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100; // Increased far plane for high light
    // Adjust ortho shadow camera bounds to encompass typical terrain sizes
    const shadowCamSize = 20;
    sunLight.shadow.camera.left = -shadowCamSize;
    sunLight.shadow.camera.right = shadowCamSize;
    sunLight.shadow.camera.top = shadowCamSize;
    sunLight.shadow.camera.bottom = -shadowCamSize;
    sunLight.shadow.bias = -0.0001; // Helps prevent shadow acne on flat surfaces

    scene.add(sunLight);
    // scene.add(new THREE.CameraHelper(sunLight.shadow.camera)); // For debugging shadow camera
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
  }, [terrainUrl, onError]); // Re-run if terrainUrl changes

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