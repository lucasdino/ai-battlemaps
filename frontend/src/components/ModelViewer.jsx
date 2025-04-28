import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import THEME from '../theme';

const ModelViewer = ({ modelUrl, onError }) => {
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

  // Clear all THREE.js resources and DOM elements
  const clearScene = () => {
    console.log(`[${instanceId}] Clearing scene resources`);

    // Stop animation loop
    if (animationIdRef.current) {
      console.log(`[${instanceId}] Cancelling animation frame: ${animationIdRef.current}`);
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Clear existing model
    if (modelRef.current && sceneRef.current) {
      console.log(`[${instanceId}] Removing model from scene`);
      sceneRef.current.remove(modelRef.current);
      
      // Dispose geometries and materials
      modelRef.current.traverse((child) => {
        if (child.isMesh) {
          console.log(`[${instanceId}] Disposing of mesh resources`);
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
      console.log(`[${instanceId}] Disposing of controls`);
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    
    // Dispose of renderer
    if (rendererRef.current) {
      console.log(`[${instanceId}] Disposing of renderer`);
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    // Clear container's DOM elements
    if (containerRef.current) {
      console.log(`[${instanceId}] Clearing container DOM elements`);
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    }
    
    // Clear scene
    if (sceneRef.current) {
      console.log(`[${instanceId}] Clearing scene`);
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
    
    console.log(`[${instanceId}] Scene clearing complete`);
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
      console.log(`[${instanceId}] Component unmounting, cleaning up resources`);
      clearScene();
    };
  }, [instanceId]);

  // Initialize scene when component mounts or modelUrl changes
  useEffect(() => {
    console.log(`[${instanceId}] ModelUrl changed: ${modelUrl}`);
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
        console.log(`[${instanceId}] Setting up new scene`);
        
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
        
        // Create renderer
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
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
          helpText.style.top = '10px';
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
            console.warn(`[${instanceId}] Animation loop stopping due to missing resources`);
            return;
          }
          
          animationIdRef.current = requestAnimationFrame(animate);
          controlsRef.current.update();
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        
        console.log(`[${instanceId}] Starting animation loop`);
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
        console.error(`[${instanceId}] Error initializing Three.js scene:`, err);
        setError('Could not initialize 3D viewer. Please ensure WebGL is enabled in your browser.');
        setIsLoading(false);
        return null;
      }
    };
    
    // Load the 3D model
    const loadModel = () => {
      if (!sceneRef.current) {
        console.error(`[${instanceId}] Cannot load model: scene not initialized`);
        return;
      }
      
      console.log(`[${instanceId}] Loading model: ${modelUrl}`);
      const loader = new GLTFLoader();
      
      try {
        loader.load(
          modelUrl,
          (gltf) => {
            try {
              console.log(`[${instanceId}] Model loaded successfully`);
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
              
              console.log(`[${instanceId}] Model positioned, size:`, size);
              
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
              console.log(`[${instanceId}] Model fully setup and rendered`);
            } catch (err) {
              console.error(`[${instanceId}] Error processing loaded model:`, err);
              setError('Error displaying the model. The file may be corrupted.');
              setIsLoading(false);
            }
          },
          (xhr) => {
            const progress = (xhr.loaded / xhr.total) * 100;
            setLoadingProgress(progress);
          },
          (errorEvent) => {
            console.error(`[${instanceId}] Error loading model:`, errorEvent);
            setError('Failed to load 3D model. The file might be inaccessible or corrupted.');
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error(`[${instanceId}] Error setting up model loader:`, err);
        setError('Could not load the 3D model. Please try again later.');
        setIsLoading(false);
      }
    };
    
    // Setup scene and load model
    setupScene();
    loadModel();
    
  }, [modelUrl, instanceId]);
  
  // Function to handle PNG download
  const handleDownloadPNG = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      console.error(`[${instanceId}] Download failed: renderer, scene, or camera not available`);
      return;
    }
    
    try {
      console.log(`[${instanceId}] Generating PNG download`);
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
      console.log(`[${instanceId}] PNG download complete`);
    } catch (err) {
      console.error(`[${instanceId}] Error generating PNG:`, err);
      setError("Could not generate PNG image.");
    }
  };
  
  // Function to handle GLB download
  const handleDownloadGLB = () => {
    if (!modelUrl) {
      console.error(`[${instanceId}] Download GLB failed: model URL not available`);
      return;
    }
    
    try {
      console.log(`[${instanceId}] Initiating GLB download from: ${modelUrl}`);
      
      // Create a link to download the original GLB file
      const link = document.createElement('a');
      link.href = modelUrl;
      
      // Extract filename from URL or use a default name
      const fileName = modelUrl.split('/').pop() || 'model.glb';
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`[${instanceId}] GLB download initiated`);
    } catch (err) {
      console.error(`[${instanceId}] Error downloading GLB:`, err);
      setError("Could not download the GLB file.");
    }
  };
  
  // Button style with animation
  const getButtonStyle = (buttonId) => {
    const isHovered = hoveredButton === buttonId;
    const isActive = activeButton === buttonId;
    // Use the same fire red and hover color as upload button
    return {
      backgroundColor: isHovered ? '#ff3b1c' : '#ff5e3a',
      color: 'white',
      border: 'none',
      padding: '10px 15px',
      margin: '10px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      boxShadow: isHovered && !isActive 
        ? '0 4px 8px rgba(255, 59, 28, 0.5)'
        : '0 2px 5px rgba(255, 94, 58, 0.3)',
      transform: isActive 
        ? 'translateY(1px)' 
        : isHovered 
          ? 'translateY(-2px)' 
          : 'translateY(0)',
      position: 'relative',
      overflow: 'hidden',
      outline: 'none',
    };
  };
  
  // Create canvas container styling with explicit outline prevention
  const canvasContainerStyle = {
    width: '100%', 
    flexGrow: 1,
    position: 'relative',
    borderRadius: '4px',
    overflow: 'hidden',
    outline: 'none', // Prevent outline
    border: '1px solid transparent', // Remove any colored border
  };
  
  // Loading overlay styles
  const loadingStyles = {
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(25, 25, 25, 0.8)',
      zIndex: 10,
      pointerEvents: isLoading ? 'auto' : 'none',
      opacity: isLoading ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    progress: {
      width: '60%',
      height: '8px',
      backgroundColor: THEME.bgActive,
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '15px',
    },
    progressBar: {
      height: '100%',
      width: `${loadingProgress}%`,
      backgroundColor: THEME.accentPrimary,
      transition: 'width 0.3s ease',
    },
    text: {
      color: THEME.textPrimary,
      fontSize: '16px',
      marginBottom: '8px',
    },
    percentage: {
      color: THEME.accentPrimary,
      fontSize: '14px',
      marginTop: '8px',
    },
    error: {
      color: THEME.errorText,
      backgroundColor: THEME.errorBg,
      padding: '10px 15px',
      borderRadius: '4px',
      margin: '15px',
      textAlign: 'center',
    }
  };
  
  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div 
        ref={containerRef}
        style={canvasContainerStyle}
        tabIndex="-1" // Make it unfocusable
      >
        {/* Loading Overlay */}
        <div style={loadingStyles.overlay}>
          {error ? (
            <div style={loadingStyles.error}>{error}</div>
          ) : (
            <>
              <div style={loadingStyles.text}>Loading 3D Model</div>
              <div style={loadingStyles.progress}>
                <div style={loadingStyles.progressBar}></div>
              </div>
              <div style={loadingStyles.percentage}>{Math.round(loadingProgress)}%</div>
            </>
          )}
        </div>
      </div>
      {/* Download Buttons */} 
      {!isLoading && !error && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '10px' 
        }}>
          <button
            onClick={handleDownloadPNG}
            style={getButtonStyle('png')}
            className="custom-download-btn"
            onMouseEnter={() => setHoveredButton('png')}
            onMouseLeave={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
            onMouseDown={() => setActiveButton('png')}
            onMouseUp={() => setActiveButton(null)}
            onBlur={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
          >
            Download PNG
          </button>
          <button
            onClick={handleDownloadGLB}
            style={getButtonStyle('glb')}
            className="custom-download-btn"
            onMouseEnter={() => setHoveredButton('glb')}
            onMouseLeave={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
            onMouseDown={() => setActiveButton('glb')}
            onMouseUp={() => setActiveButton(null)}
            onBlur={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
          >
            Download GLB
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelViewer; 