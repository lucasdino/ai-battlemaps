import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import THEME from '../theme';
import styles, { getButtonStyle, getLoadingOverlayStyle, KEYFRAMES } from '../styles/ModelViewer';
import CONFIG from '../config';

// Add a style tag for the spinner animation
const addSpinnerAnimation = () => {
  // Check if the animation already exists
  if (!document.getElementById('spinner-animation')) {
    const style = document.createElement('style');
    style.id = 'spinner-animation';
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
};

const ModelViewer = ({ 
  modelUrl, 
  modelName, 
  modelId,
  videoUrl,
  onError,
  onModelNameChange,
  onModelDeleted,
  hideControls = false
}) => {
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationIdRef = useRef(null);
  const modelRef = useRef(null);
  const controlsHelpRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [error, setError] = useState(null);
  const [instanceId] = useState(() => Math.random().toString(36).substring(2, 9)); // Unique instance ID for debugging
  const [hoveredButton, setHoveredButton] = useState(null);
  const [activeButton, setActiveButton] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState(modelName || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [formattedVideoUrl, setFormattedVideoUrl] = useState(null);

  // Add spinner animation when component mounts
  useEffect(() => {
    addSpinnerAnimation();
  }, []);

  // Process video URL on component mount or URL change
  useEffect(() => {
    if (videoUrl) {
      // Ensure the video URL is properly formatted
      let processedUrl = videoUrl;
      
      // Make URL absolute if it's relative
      if (videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('blob:')) {
        processedUrl = videoUrl.startsWith('/') 
          ? `${CONFIG.API.BASE_URL}${videoUrl}` 
          : `${CONFIG.API.BASE_URL}/${videoUrl}`;
      }
      
      setFormattedVideoUrl(processedUrl);
    } else {
      setFormattedVideoUrl(null);
    }
  }, [videoUrl]);

  // Update editable name when model changes
  useEffect(() => {
    setEditableName(modelName || '');
    // Reset model ready state when model changes
    setIsModelReady(false);
    // Reset video state when model changes
    setShowVideo(false);
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
    if (canvasContainerRef.current) {
      while (canvasContainerRef.current.firstChild) {
        canvasContainerRef.current.removeChild(canvasContainerRef.current.firstChild);
      }
    }
    
    // Remove controls help if it exists
    if (controlsHelpRef.current && containerRef.current) {
      try {
        containerRef.current.removeChild(controlsHelpRef.current);
      } catch (err) {
        // Ignore if it was already removed
      }
      controlsHelpRef.current = null;
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
    if (!canvasContainerRef.current || !modelUrl) return;
    
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
        const aspect = canvasContainerRef.current.clientWidth / canvasContainerRef.current.clientHeight;
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
        
        renderer.setSize(canvasContainerRef.current.clientWidth, canvasContainerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.6;
        
        // Append canvas to container
        canvasContainerRef.current.appendChild(renderer.domElement);
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
        
        // Add lights (SIMPLIFIED)
        // Extremely even, bright lighting from all angles
        const ambientLight = new THREE.AmbientLight(0xffffff, 8.0);
        scene.add(ambientLight);

        // Key directional light (main)
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
        keyLight.position.set(3, 6, 3);
        keyLight.castShadow = false;
        scene.add(keyLight);

        // Fill directional light (opposite side, higher intensity)
        const fillLight = new THREE.DirectionalLight(0xffffff, 5.0);
        fillLight.position.set(-4, -8, -4);
        fillLight.castShadow = false;
        scene.add(fillLight);
        
        // Extra fill light from the side/below
        const sideLight = new THREE.DirectionalLight(0xffffff, 3);
        sideLight.position.set(0, -8, 4);
        sideLight.castShadow = false;
        scene.add(sideLight);
        
        // Fourth light from the back
        const backLight = new THREE.DirectionalLight(0xffffff, 3);
        backLight.position.set(0, 2, -8);
        backLight.castShadow = false;
        scene.add(backLight);
        
        // Add another fill directional light from the right
        const rightFillLight = new THREE.DirectionalLight(0xffffff, 3);
        rightFillLight.position.set(8, 0, 2);
        rightFillLight.castShadow = false;
        scene.add(rightFillLight);
        
        // Add a subtle grid to help with spatial orientation
        const gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
        gridHelper.position.y = -0.01; // Slight offset to prevent z-fighting
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);
        
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
          if (!canvasContainerRef.current || !cameraRef.current || !rendererRef.current) return;
          
          const width = canvasContainerRef.current.clientWidth;
          const height = canvasContainerRef.current.clientHeight;
          
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      } catch (err) {
        console.error("Scene setup error:", err);
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
              
              // Center and scale the model
              const box = new THREE.Box3().setFromObject(model);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());

              // Scale the model so its largest dimension is always 2 units
              const maxDim = Math.max(size.x, size.y, size.z);
              const scale = 2 / maxDim;
              model.scale.set(scale, scale, scale);

              // Recompute box and center after scaling
              const scaledBox = new THREE.Box3().setFromObject(model);
              const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
              model.position.x = -scaledCenter.x;
              model.position.y = -scaledCenter.y;
              model.position.z = -scaledCenter.z;

              // Calculate camera position to frame the model to fill 80% of the view
              const camera = cameraRef.current;
              const aspect = camera.aspect;
              const vfov = camera.fov * (Math.PI / 180);
              const scaledSize = scaledBox.getSize(new THREE.Vector3());
              const height = scaledSize.y;
              const width = scaledSize.x;
              const depth = scaledSize.z;

              // Calculate distances needed for height and width
              let distanceForHeight = height / (1.6 * Math.tan(vfov / 2));
              const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
              let distanceForWidth = width / (1.6 * Math.tan(hfov / 2));
              let distanceForDepth = depth / (1.6 * Math.tan(hfov / 2));

              // Use the maximum distance to ensure the entire model is visible
              let cameraZ = Math.max(distanceForHeight, distanceForWidth, distanceForDepth);
              cameraZ = cameraZ + Math.max(depth * 0.1, 0.5); // Add a small buffer
              cameraZ = Math.max(cameraZ, 2); // Ensure minimum reasonable distance

              // Place camera at an angle from above and to the side
              camera.position.set(cameraZ * 0.8, cameraZ * 0.5, cameraZ * 1);
              camera.lookAt(0, 0, 0);
              
              // Adjust controls
              if (controlsRef.current) {
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
              }
              
              // Update state
              setIsLoading(false);
              setLoadingProgress(100);
              
              // Add a slight delay before showing UI elements to ensure smooth transition
              setTimeout(() => {
                setIsModelReady(true);
                // Add controls help overlay once model is ready and controls are visible
                addControlsHelp();
              }, 300);
            } catch (err) {
              console.error("Model display error:", err);
              setError('Error displaying the model. The file may be corrupted.');
              setIsLoading(false);
            }
          },
          (xhr) => {
            const progress = (xhr.loaded / xhr.total) * 100;
            setLoadingProgress(progress);
          },
          (errorEvent) => {
            console.error("Model load error:", errorEvent);
            setError('Failed to load 3D model. The file might be inaccessible or corrupted.');
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error("GLTFLoader error:", err);
        setError('Could not load the 3D model. Please try again later.');
        setIsLoading(false);
      }
    };
    
    // Setup scene and load model
    setupScene();
    loadModel();
    
  }, [modelUrl]);
  
  // Add this new useEffect to check and set the video URL when model is ready
  useEffect(() => {
    // Only fetch video if model doesn't already have videoUrl prop and model is ready
    if (isModelReady && !formattedVideoUrl && !videoUrl && modelId) {
      fetch(`${CONFIG.API.BASE_URL}/api/models/${modelId}/video`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.videoPath) {
            let processedUrl = data.videoPath;
            if (!processedUrl.startsWith('http') && !processedUrl.startsWith('blob:')) {
              processedUrl = processedUrl.startsWith('/') 
                ? `${CONFIG.API.BASE_URL}${processedUrl}` 
                : `${CONFIG.API.BASE_URL}/${processedUrl}`;
            }
            setFormattedVideoUrl(processedUrl);
          }
        })
        .catch(() => {});
    }
  }, [isModelReady, formattedVideoUrl, videoUrl, modelId]);
  
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

  // Function to handle STL download
  const handleDownloadSTL = async () => {
    if (!modelId) {
      return;
    }
    
    try {
      // Request STL conversion from the backend
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/models/${modelId}/download/stl`);
      
      if (!response.ok) {
        throw new Error(`STL conversion failed: ${response.status}`);
      }
      
      // Get the STL data as a blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract model name and create STL filename
      const modelFileName = modelUrl?.split('/').pop() || 'model.glb';
      const baseName = modelFileName.replace(/\.glb$/i, '');
      link.download = `${baseName}.stl`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('STL download error:', err);
      setError("Could not download the STL file. Please try again.");
    }
  };
  
  // Function to reset the camera view
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current || !modelRef.current) return;
    
    try {
      // Ensure the model's world matrix is up to date
      modelRef.current.updateWorldMatrix(true, true);
      // Get model dimensions
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      modelRef.current.scale.set(scale, scale, scale);
      const scaledBox = new THREE.Box3().setFromObject(modelRef.current);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      const height = scaledSize.y;
      const width = scaledSize.x;
      const depth = scaledSize.z;
      const hfov = 2 * Math.atan(Math.tan(cameraRef.current.fov * (Math.PI / 180) / 2) * cameraRef.current.aspect);
      const distanceForHeight = height / (1.6 * Math.tan(cameraRef.current.fov * (Math.PI / 180) / 2));
      const distanceForWidth = width / (1.6 * Math.tan(hfov / 2));
      const distanceForDepth = depth / (1.6 * Math.tan(hfov / 2));
      let cameraZ = Math.max(distanceForHeight, distanceForWidth, distanceForDepth);
      cameraZ = cameraZ + Math.max(depth * 0.1, 0.5);
      cameraZ = Math.max(cameraZ, 2);
      cameraRef.current.position.set(cameraZ * 0.8, cameraZ * 0.5, cameraZ * 1);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      modelRef.current.rotation.y = 0; // No initial rotation
    } catch (err) {
      // Silently fail - not critical
    }
  };
  
  // Toggle video display
  const toggleVideo = () => {
    console.log("Toggle video called, current state:", showVideo, "URL:", formattedVideoUrl);
    setShowVideo(!showVideo);
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
  
  // Function to handle model deletion
  const handleDeleteModel = async () => {
    if (!modelId) return;
    
    setIsDeleting(true);
    
    try {
      // Call the API to delete the model
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/models/${modelId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Delete failed: ${response.status}`);
      }
      
      // Notify parent component about successful deletion
      if (onModelDeleted) {
        onModelDeleted(modelId, 'Model deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting model:', err);
      setError(`Failed to delete model: ${err.message}`);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  // Function to get button style with hover state
  const getActionButtonStyle = (isHovered, isActive, isPrimary = false, isDanger = false) => {
    return {
      background: isDanger 
        ? (isHovered ? '#ff5252' : '#e74c3c') 
        : isPrimary 
          ? (isHovered ? '#4dabf7' : THEME.primary) 
          : (isHovered ? '#f3a653' : '#e67e22'),
      border: isPrimary && !isDanger ? '2px solid white' : 'none',
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
  
  // Style for the video toggle button
  const videoToggleButtonStyle = {
    position: 'absolute',
    top: '15px',
    left: '15px',
    zIndex: 100, // Increase z-index significantly
    background: showVideo ? '#e67e22' : '#333',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'background-color 0.2s ease',
    pointerEvents: 'auto' // Ensure clicks are registered
  };
  
  // Update loading progress bar style
  const loadingProgressBarStyle = {
    ...styles.loadingProgressBar,
    width: `${loadingProgress}%`
  };

  // We'll define a memoized callback that ensures only one instance is added and only when controls are visible
  const addControlsHelp = () => {
    if (!containerRef.current || controlsHelpRef.current || hideControls) return;
    const helpText = document.createElement('div');
    helpText.className = 'controls-help-overlay';
    helpText.style.position = 'absolute';
    helpText.style.bottom = '10px';
    helpText.style.left = '10px';
    helpText.style.color = THEME.textSecondary;
    helpText.style.fontSize = '12px';
    helpText.style.pointerEvents = 'none';
    helpText.style.opacity = '0.7';
    helpText.innerHTML = 'Left-click + drag: Rotate | Scroll: Zoom | Right-click + drag: Pan';
    containerRef.current.appendChild(helpText);
    controlsHelpRef.current = helpText;
  };

  return (
    <div style={styles.container} ref={containerRef}>
      {/* Video Toggle Button - Only show if video is available */}
      {!isLoading && !error && isModelReady && formattedVideoUrl && !hideControls && (
        <button 
          style={videoToggleButtonStyle}
          onClick={toggleVideo}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = showVideo ? '#f39c12' : '#555';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = showVideo ? '#e67e22' : '#333';
          }}
        >
          {showVideo ? 'Hide Video' : 'Show Video'}
        </button>
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div style={styles.deleteConfirmDialog}>
          <h3 style={styles.deleteConfirmTitle}>
            Delete "{modelName || 'this model'}"?
          </h3>
          <p style={styles.deleteConfirmText}>
            This action cannot be undone. The model and all associated files will be permanently removed.
          </p>
          <div style={styles.deleteConfirmButtons}>
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              style={{
                ...styles.cancelButton,
                ...(isDeleting ? styles.disabledButton : {})
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteModel}
              disabled={isDeleting}
              style={{
                ...styles.deleteButton,
                ...(isDeleting ? styles.disabledButton : {})
              }}
            >
              {isDeleting ? (
                <>
                  <span style={styles.loadingSpinner}></span>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Model Name Header */}
      {!isLoading && !error && isModelReady && !hideControls && (
        <div style={styles.modelNameHeader}>
          {isEditingName ? (
            <div style={styles.modelNameContainer}>
              <input 
                type="text"
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                onBlur={saveModelName}
                onKeyPress={handleKeyPress}
                autoFocus
                style={styles.modelNameInput}
              />
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingName(true)}
              style={styles.modelNameDisplay}
              title="Click to edit model name"
            >
              {modelName || 'Unnamed Model'} ✏️
            </div>
          )}
        </div>
      )}
      
      {/* Delete Button */}
      {!isLoading && !error && isModelReady && !hideControls && (
        <div style={styles.deleteButtonContainer}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={getActionButtonStyle(hoveredButton === 'delete', activeButton === 'delete', false, true)}
            onMouseEnter={() => setHoveredButton('delete')}
            onMouseLeave={() => setHoveredButton(null)}
            onMouseDown={() => setActiveButton('delete')}
            onMouseUp={() => setActiveButton(null)}
            onBlur={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
            title="Delete this model"
          >
            Delete Model
          </button>
        </div>
      )}
      
      {/* Action Buttons */}
      {!isLoading && !error && isModelReady && !hideControls && (
        <div style={styles.actionButtonsContainer}>
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
          <button
            onClick={handleDownloadSTL}
            style={getActionButtonStyle(hoveredButton === 'stl', activeButton === 'stl')}
            onMouseEnter={() => setHoveredButton('stl')}
            onMouseLeave={() => setHoveredButton(null)}
            onMouseDown={() => setActiveButton('stl')}
            onMouseUp={() => setActiveButton(null)}
            onBlur={() => {
              setHoveredButton(null);
              setActiveButton(null);
            }}
            title="Download STL model file"
          >
            Download STL
          </button>
        </div>
      )}
      
      {/* Model canvas container */}
      <div 
        ref={canvasContainerRef}
        style={styles.canvasContainer}
        tabIndex="-1"
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

      {/* Video Player - In top left corner */}
      {formattedVideoUrl && showVideo && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '15px',
          width: '250px', 
          height: 'auto',
          zIndex: 50,
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 0 16px 4px rgba(230, 126, 34, 0.5)'
        }}>
          <video 
            key={`video-${formattedVideoUrl}`}
            src={formattedVideoUrl}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '8px',
              backgroundColor: '#000'
            }}
            autoPlay
            loop
            muted
            playsInline
            controls
            controlsList="nodownload"
            onError={(e) => {
              console.error("Video error:", e);
              setError("Could not load video. The file might be inaccessible or unsupported.");
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ModelViewer; 