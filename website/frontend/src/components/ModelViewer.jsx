import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import THEME from '../theme';
import styles, { getButtonStyle, getLoadingOverlayStyle, KEYFRAMES } from '../styles/ModelViewer';

const ModelViewer = ({ 
  modelUrl, 
  modelName, 
  modelId,
  onError,
  onModelNameChange 
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationIdRef = useRef(null);
  const modelRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instanceId] = useState(() => Math.random().toString(36).substring(2, 9)); // Unique instance ID for debugging
  const [hoveredButton, setHoveredButton] = useState(null);
  const [activeButton, setActiveButton] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState(modelName || '');

  // Update editable name when model changes
  useEffect(() => {
    setEditableName(modelName || '');
  }, [modelName]);

  // Clear all THREE.js resources and DOM elements
  const clearScene = () => {
    // Stop animation loop
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Clear existing model
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current);
      
      // Dispose geometries and materials
      modelRef.current.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      
      modelRef.current = null;
    }
    
    // Dispose of controls
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    
    // Dispose of renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    // Clear container's DOM elements
    if (containerRef.current) {
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    }
    
    // Clear scene
    if (sceneRef.current) {
      // Dispose of all textures, materials, and geometries in the scene
      sceneRef.current.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              Object.keys(material).forEach(prop => {
                if (material[prop] && material[prop].isTexture) {
                  material[prop].dispose();
                }
              });
              material.dispose();
            });
          } else {
            Object.keys(object.material).forEach(prop => {
              if (object.material[prop] && object.material[prop].isTexture) {
                object.material[prop].dispose();
              }
            });
            object.material.dispose();
          }
        }
      });
      
      // Clear all objects from scene
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
      
      sceneRef.current = null;
    }
    
    // Clear camera reference
    cameraRef.current = null;
  };

  // Handle errors by notifying parent component if needed
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearScene();
    };
  }, []);

  // Initialize scene when component mounts or modelUrl changes
  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;
    
    // Reset state
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    
    // Clean up previous resources
    clearScene();
    
    // Function to initialize scene
    const setupScene = () => {
      try {
        // Create new scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;
        
        // Create camera
        const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        camera.position.z = 5;
        camera.position.y = 2;
        camera.position.x = 2;
        cameraRef.current = camera;
        
        // Try to create WebGL renderer with fallback options
        let renderer;
        
        try {
          // First try with best quality settings
          renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: 'default'
          });
        } catch (err) {
          try {
            // Fallback to basic settings
            renderer = new THREE.WebGLRenderer({ 
              antialias: false,
              alpha: true,
              preserveDrawingBuffer: true
            });
          } catch (fallbackErr) {
            throw new Error('WebGL is not supported in your browser');
          }
        }
        
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.6;
        
        // Append canvas to container
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Explicitly remove focus/outline styles
        renderer.domElement.style.outline = 'none';
        renderer.domElement.tabIndex = -1; // Make it unfocusable
        
        // Add event listener to prevent focus outline
        renderer.domElement.addEventListener('mousedown', (e) => {
          e.preventDefault();
          renderer.domElement.style.outline = 'none';
        });
        
        // Setup controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.2;
        controls.rotateSpeed = 1.0;
        controls.panSpeed = 1.0;
        controls.screenSpacePanning = true;
        controls.minDistance = 1;
        controls.maxDistance = 20;
        controls.maxPolarAngle = Math.PI / 1.5;
        controlsRef.current = controls;
        
        // Add lights
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.8);
        scene.add(ambientLight);
        
        // Directional lights
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
        keyLight.position.set(5, 5, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.bias = 0.0001;
        keyLight.shadow.normalBias = 0.02;
        keyLight.shadow.radius = 3;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -10;
        keyLight.shadow.camera.right = 10;
        keyLight.shadow.camera.top = 10;
        keyLight.shadow.camera.bottom = -10;
        scene.add(keyLight);
        
        // Fill light from opposite direction
        const fillLight = new THREE.DirectionalLight(0xffffff, 2.2);
        fillLight.position.set(-5, 0, 2);
        scene.add(fillLight);
        
        // Back light
        const backLight = new THREE.DirectionalLight(0xffffff, 2.0);
        backLight.position.set(0, 0, -5);
        scene.add(backLight);
        
        // Bottom light
        const bottomLight = new THREE.DirectionalLight(0xffffff, 1.4);
        bottomLight.position.set(0, -5, 0);
        scene.add(bottomLight);
        
        // Add rim light for better edge definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
        rimLight.position.set(-5, 5, -5);
        scene.add(rimLight);
        
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1.6);
        scene.add(hemiLight);
        
        // Add a subtle grid to help with spatial orientation
        const gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
        gridHelper.position.y = -0.01; // Slight offset to prevent z-fighting
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);
        
        // Add controls help
        const addControlsHelp = () => {
          const helpText = document.createElement('div');
          helpText.style.position = 'absolute';
          helpText.style.bottom = '10px';
          helpText.style.left = '10px';
          helpText.style.color = THEME.textSecondary;
          helpText.style.fontSize = '12px';
          helpText.style.pointerEvents = 'none';
          helpText.style.opacity = '0.7';
          helpText.innerHTML = 'Left-click + drag: Rotate | Scroll: Zoom | Right-click + drag: Pan';
          containerRef.current.appendChild(helpText);
        };
        addControlsHelp();
        
        // Setup animation loop
        const animate = () => {
          if (!controlsRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
            return;
          }
          
          animationIdRef.current = requestAnimationFrame(animate);
          controlsRef.current.update();
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        
        animate();
        
        // Handle window resize
        const handleResize = () => {
          if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      } catch (err) {
        setError('Could not initialize 3D viewer. Please ensure WebGL is enabled in your browser.');
        setIsLoading(false);
        return null;
      }
    };
    
    // Load the 3D model
    const loadModel = () => {
      if (!sceneRef.current) {
        setError('Cannot load model: scene not initialized');
        return;
      }
      
      const loader = new GLTFLoader();
      
      try {
        loader.load(
          modelUrl,
          (gltf) => {
            try {
              const model = gltf.scene;
              modelRef.current = model;
              
              // Configure model materials and shadows
              model.traverse((node) => {
                if (node.isMesh) {
                  node.castShadow = true;
                  node.receiveShadow = true;
                  
                  if (node.material) {
                    if (node.material.metalness !== undefined) {
                      node.material.metalness = Math.min(node.material.metalness + 0.15, 1.0);
                    }
                    
                    if (node.material.roughness !== undefined) {
                      node.material.roughness = Math.max(0.15, Math.min(node.material.roughness, 0.75));
                    }
                    
                    if (node.material.shadowSide === undefined) {
                      node.material.shadowSide = THREE.FrontSide;
                    }
                    
                    if (node.material.normalMap) {
                      node.material.normalScale.set(1.2, 1.2);
                    }
                    
                    if (node.material.emissive && node.material.emissiveIntensity !== undefined) {
                      node.material.emissiveIntensity *= 1.2;
                    }
                    
                    node.material.needsUpdate = true;
                  }
                }
              });
              
              // Add model to scene
              sceneRef.current.add(model);
              
              // Apply a slight initial rotation for a better view
              model.rotation.y = Math.PI / 8; // 22.5 degrees rotation
              
              // Center and scale the model
              const box = new THREE.Box3().setFromObject(model);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              
              model.position.x = -center.x;
              model.position.y = -center.y;
              model.position.z = -center.z;
              
              // Calculate camera position to frame the model to fill 90% of the view
              const camera = cameraRef.current;
              const aspect = camera.aspect;
              const vfov = camera.fov * (Math.PI / 180);
              const height = size.y;
              const width = size.x;
              const depth = size.z;
              
              // Calculate distances needed for height and width
              let distanceForHeight = height / (1.8 * Math.tan(vfov / 2));
              
              const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
              let distanceForWidth = width / (1.8 * Math.tan(hfov / 2));
              
              // Also consider depth for very deep models
              let distanceForDepth = depth / (1.8 * Math.tan(hfov / 2));
              
              // Use the maximum distance to ensure the entire model is visible
              let cameraZ = Math.max(distanceForHeight, distanceForWidth, distanceForDepth);
              
              // Adjust to fill approximately 90% of the view (reducing distance slightly)
              cameraZ = cameraZ * 0.9;
              
              // Add a small buffer to ensure nothing is cut off
              cameraZ = cameraZ + Math.max(size.z * 0.1, 0.5);
              
              // Ensure minimum reasonable distance
              cameraZ = Math.max(cameraZ, 2);
              
              // Calculate final camera position at an angle for better perspective
              const cameraDistance = cameraZ * 1.1;
              camera.position.set(
                cameraDistance * 0.7,  // X position
                cameraDistance * 0.4,  // Y position
                cameraDistance * 0.7   // Z position
              );
              
              // Adjust controls
              if (controlsRef.current) {
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
              }
              
              // Update state
              setIsLoading(false);
              setLoadingProgress(100);
            } catch (err) {
              setError('Error displaying the model. The file may be corrupted.');
              setIsLoading(false);
            }
          },
          (xhr) => {
            const progress = (xhr.loaded / xhr.total) * 100;
            setLoadingProgress(progress);
          },
          (errorEvent) => {
            setError('Failed to load 3D model. The file might be inaccessible or corrupted.');
            setIsLoading(false);
          }
        );
      } catch (err) {
        setError('Could not load the 3D model. Please try again later.');
        setIsLoading(false);
      }
    };
    
    // Setup scene and load model
    setupScene();
    loadModel();
    
  }, [modelUrl]);
  
  // Function to handle PNG download
  const handleDownloadPNG = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }
    
    try {
      // Render the current view to ensure it's up to date
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Get data URL and trigger download
      const canvas = rendererRef.current.domElement;
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'model-view.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError("Could not generate PNG image.");
    }
  };
  
  // Function to handle GLB download
  const handleDownloadGLB = () => {
    if (!modelUrl) {
      return;
    }
    
    try {
      // Create a link to download the original GLB file
      const link = document.createElement('a');
      link.href = modelUrl;
      
      // Extract filename from URL or use a default name
      const fileName = modelUrl.split('/').pop() || 'model.glb';
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError("Could not download the GLB file.");
    }
  };
  
  // Function to reset the camera view
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current || !modelRef.current) return;
    
    try {
      // Get model dimensions
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const size = box.getSize(new THREE.Vector3());
      
      // Calculate ideal camera distance
      const camera = cameraRef.current;
      const aspect = camera.aspect;
      const vfov = camera.fov * (Math.PI / 180);
      
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
      const distanceForHeight = size.y / (1.8 * Math.tan(vfov / 2));
      const distanceForWidth = size.x / (1.8 * Math.tan(hfov / 2));
      const distanceForDepth = size.z / (1.8 * Math.tan(hfov / 2));
      
      let cameraZ = Math.max(distanceForHeight, distanceForWidth, distanceForDepth);
      cameraZ = cameraZ * 0.9; // 90% to fill view
      cameraZ = cameraZ + Math.max(size.z * 0.1, 0.5); // Add buffer
      cameraZ = Math.max(cameraZ, 2); // Minimum distance
      
      // Set camera to initial position
      const cameraDistance = cameraZ * 1.1;
      camera.position.set(
        cameraDistance * 0.7,  // X position
        cameraDistance * 0.4,  // Y position
        cameraDistance * 0.7   // Z position
      );
      
      // Reset controls target
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      
      // Apply initial rotation
      modelRef.current.rotation.y = Math.PI / 8; // 22.5 degrees
    } catch (err) {
      // Silently fail - not critical
    }
  };
  
  // Save name change and exit edit mode
  const saveModelName = () => {
    if (onModelNameChange && editableName !== modelName) {
      onModelNameChange(editableName);
    }
    setIsEditingName(false);
  };

  // Handle key press in the input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveModelName();
    }
  };
  
  // Function to get button style with hover state
  const getActionButtonStyle = (isHovered, isActive, isPrimary = false) => {
    return {
      background: isPrimary 
        ? (isHovered ? '#4dabf7' : THEME.primary) 
        : (isHovered ? '#f3a653' : '#e67e22'),
      border: isPrimary ? '2px solid white' : 'none',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      marginLeft: '6px',
      transition: 'none',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    };
  };
  
  // Update loading progress bar style
  const loadingProgressBarStyle = {
    ...styles.loadingProgressBar,
    width: `${loadingProgress}%`
  };
  
  return (
    <div style={styles.container}>
      {/* Model Name Header */}
      {!isLoading && !error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '0',
          right: '0',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'auto'
        }}>
          {isEditingName ? (
            <div style={{
              display: 'inline-block',
              background: 'rgba(0,0,0,0.6)',
              padding: '5px 10px',
              borderRadius: '4px'
            }}>
              <input 
                type="text"
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                onBlur={saveModelName}
                onKeyPress={handleKeyPress}
                autoFocus
                style={{
                  background: 'transparent',
                  border: `1px solid ${THEME.primary}`,
                  color: THEME.textPrimary,
                  padding: '5px 8px',
                  borderRadius: '3px',
                  fontSize: '16px',
                  fontWeight: '500',
                  minWidth: '200px',
                }}
              />
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingName(true)}
              style={{
                display: 'inline-block',
                background: 'rgba(0,0,0,0.6)',
                padding: '5px 15px',
                borderRadius: '4px',
                color: THEME.textPrimary,
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              title="Click to edit model name"
            >
              {modelName || 'Unnamed Model'} ✏️
            </div>
          )}
        </div>
      )}
      
      {/* Action Buttons - Reset View, Download PNG, Download GLB */}
      {!isLoading && !error && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={resetView}
            style={getActionButtonStyle(hoveredButton === 'reset', activeButton === 'reset', true)}
            onMouseEnter={() => setHoveredButton('reset')}
            onMouseLeave={() => setHoveredButton(null)}
            onMouseDown={() => setActiveButton('reset')}
            onMouseUp={() => setActiveButton(null)}
            onBlur={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
            title="Reset camera view"
          >
            Reset View
          </button>
          <button
            onClick={handleDownloadPNG}
            style={getActionButtonStyle(hoveredButton === 'png', activeButton === 'png')}
            onMouseEnter={() => setHoveredButton('png')}
            onMouseLeave={() => setHoveredButton(null)}
            onMouseDown={() => setActiveButton('png')}
            onMouseUp={() => setActiveButton(null)}
            onBlur={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
            title="Download as PNG image"
          >
            Download PNG
          </button>
          <button
            onClick={handleDownloadGLB}
            style={getActionButtonStyle(hoveredButton === 'glb', activeButton === 'glb')}
            onMouseEnter={() => setHoveredButton('glb')}
            onMouseLeave={() => setHoveredButton(null)}
            onMouseDown={() => setActiveButton('glb')}
            onMouseUp={() => setActiveButton(null)}
            onBlur={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
            title="Download GLB model file"
          >
            Download GLB
          </button>
        </div>
      )}
      
      <div 
        ref={containerRef}
        style={styles.canvasContainer}
        tabIndex="-1" // Make it unfocusable
      >
        {/* Loading Overlay */}
        <div style={getLoadingOverlayStyle(isLoading)}>
          {error ? (
            <div style={styles.loadingError}>{error}</div>
          ) : (
            <>
              <div style={styles.loadingText}>Loading 3D Model</div>
              <div style={styles.loadingProgress}>
                <div style={loadingProgressBarStyle}></div>
              </div>
              <div style={styles.loadingPercentage}>{Math.round(loadingProgress)}%</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelViewer; 