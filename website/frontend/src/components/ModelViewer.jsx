import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import THEME from '../theme';
import styles, { getButtonStyle, getLoadingOverlayStyle, KEYFRAMES } from '../styles/ModelViewer';
import CONFIG from '../config';

// Utility functions
const addSpinnerAnimation = () => {
  if (!document.getElementById('spinner-animation')) {
    const style = document.createElement('style');
    style.id = 'spinner-animation';
    style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
};

const formatVideoUrl = (videoUrl) => {
  if (!videoUrl) return null;
  if (videoUrl.startsWith('http') || videoUrl.startsWith('blob:')) return videoUrl;
  return videoUrl.startsWith('/') 
    ? `${CONFIG.API.BASE_URL}${videoUrl}` 
    : `${CONFIG.API.BASE_URL}/${videoUrl}`;
};

const disposeObject = (object) => {
  if (object.geometry) object.geometry.dispose();
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => material.dispose());
    } else {
      object.material.dispose();
    }
  }
};

const createLights = (scene) => {
  const lights = [
    { type: 'ambient', color: 0xffffff, intensity: 8.0 },
    { type: 'directional', color: 0xffffff, intensity: 2.0, position: [3, 6, 3] },
    { type: 'directional', color: 0xffffff, intensity: 5.0, position: [-4, -8, -4] },
    { type: 'directional', color: 0xffffff, intensity: 3, position: [0, -8, 4] },
    { type: 'directional', color: 0xffffff, intensity: 3, position: [0, 2, -8] },
    { type: 'directional', color: 0xffffff, intensity: 3, position: [8, 0, 2] }
  ];

  lights.forEach(lightConfig => {
    const light = lightConfig.type === 'ambient' 
      ? new THREE.AmbientLight(lightConfig.color, lightConfig.intensity)
      : new THREE.DirectionalLight(lightConfig.color, lightConfig.intensity);
    
    if (lightConfig.position) {
      light.position.set(...lightConfig.position);
      light.castShadow = false;
    }
    scene.add(light);
  });
};

const setupModelMaterial = (node) => {
  if (!node.isMesh || !node.material) return;
  
  node.castShadow = true;
  node.receiveShadow = true;
  
  const material = node.material;
  if (material.metalness !== undefined) material.metalness = Math.min(material.metalness + 0.15, 1.0);
  if (material.roughness !== undefined) material.roughness = Math.max(0.15, Math.min(material.roughness, 0.75));
  if (material.shadowSide === undefined) material.shadowSide = THREE.FrontSide;
  if (material.normalMap) material.normalScale.set(1.2, 1.2);
  if (material.emissive && material.emissiveIntensity !== undefined) material.emissiveIntensity *= 1.2;
  material.needsUpdate = true;
};

const calculateCameraPosition = (model, camera) => {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim;
  
  model.scale.set(scale, scale, scale);
  
  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  const scaledSize = scaledBox.getSize(new THREE.Vector3());
  
  model.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);
  
  const vfov = camera.fov * (Math.PI / 180);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  
  const distanceForHeight = scaledSize.y / (1.6 * Math.tan(vfov / 2));
  const distanceForWidth = scaledSize.x / (1.6 * Math.tan(hfov / 2));
  const distanceForDepth = scaledSize.z / (1.6 * Math.tan(hfov / 2));
  
  let cameraZ = Math.max(distanceForHeight, distanceForWidth, distanceForDepth);
  cameraZ = Math.max(cameraZ + Math.max(scaledSize.z * 0.1, 0.5), 2);
  
  return { x: cameraZ * 0.8, y: cameraZ * 0.5, z: cameraZ * 1 };
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
  // Refs
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationIdRef = useRef(null);
  const modelRef = useRef(null);
  const controlsHelpRef = useRef(null);

  // State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [activeButton, setActiveButton] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState(modelName || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [formattedVideoUrl, setFormattedVideoUrl] = useState(null);

  // Initialize spinner animation
  useEffect(() => {
    addSpinnerAnimation();
  }, []);

  // Process video URL
  useEffect(() => {
    setFormattedVideoUrl(formatVideoUrl(videoUrl));
  }, [videoUrl]);

  // Update editable name when model changes
  useEffect(() => {
    setEditableName(modelName || '');
    setIsModelReady(false);
    setShowVideo(false);
  }, [modelName]);

  // Clear scene function
  const clearScene = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current.traverse(disposeObject);
      modelRef.current = null;
    }
    
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    if (canvasContainerRef.current) {
      while (canvasContainerRef.current.firstChild) {
        canvasContainerRef.current.removeChild(canvasContainerRef.current.firstChild);
      }
    }
    
    if (controlsHelpRef.current && containerRef.current) {
      try {
        containerRef.current.removeChild(controlsHelpRef.current);
      } catch (err) {
        // Ignore if already removed
      }
      controlsHelpRef.current = null;
    }
    
    if (sceneRef.current) {
      sceneRef.current.traverse(disposeObject);
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
      sceneRef.current = null;
    }
    
    cameraRef.current = null;
  };

  // Handle errors
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

  // Setup scene and load model
  useEffect(() => {
    if (!canvasContainerRef.current || !modelUrl) return;
    
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    clearScene();
    
    const setupScene = () => {
      try {
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;
        
        // Create camera
        const aspect = canvasContainerRef.current.clientWidth / canvasContainerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        camera.position.set(2, 2, 5);
        cameraRef.current = camera;
        
        // Create renderer
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'default'
        });
        
        renderer.setSize(canvasContainerRef.current.clientWidth, canvasContainerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.6;
        
        canvasContainerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        renderer.domElement.style.outline = 'none';
        renderer.domElement.tabIndex = -1;
        
        // Setup controls
        const controls = new OrbitControls(camera, renderer.domElement);
        Object.assign(controls, {
          enableDamping: true,
          dampingFactor: 0.1,
          enableZoom: true,
          zoomSpeed: 1.2,
          rotateSpeed: 1.0,
          panSpeed: 1.0,
          screenSpacePanning: true,
          minDistance: 1,
          maxDistance: 20,
          maxPolarAngle: Math.PI / 1.5
        });
        controlsRef.current = controls;
        
        // Add lights
        createLights(scene);
        
        // Add grid
        const gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
        gridHelper.position.y = -0.01;
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);
        
        // Animation loop
        const animate = () => {
          if (!controlsRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
            return;
          }
          animationIdRef.current = requestAnimationFrame(animate);
          controlsRef.current.update();
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        animate();
        
        // Handle resize
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
    
    const loadModel = () => {
      if (!sceneRef.current) {
        setError('Cannot load model: scene not initialized');
        return;
      }
      
      const loader = new GLTFLoader();
      
      loader.load(
        modelUrl,
        (gltf) => {
          try {
            const model = gltf.scene;
            modelRef.current = model;
            
            model.traverse(setupModelMaterial);
            sceneRef.current.add(model);
            
            const cameraPos = calculateCameraPosition(model, cameraRef.current);
            cameraRef.current.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
            cameraRef.current.lookAt(0, 0, 0);
            
            if (controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
            
            setIsLoading(false);
            setLoadingProgress(100);
            
            setTimeout(() => {
              setIsModelReady(true);
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
    };
    
    setupScene();
    loadModel();
    
  }, [modelUrl]);
  
  // Fetch video URL if not provided (skip for default assets)
  useEffect(() => {
    if (isModelReady && !formattedVideoUrl && !videoUrl && modelId && !hideControls) {
      fetch(`${CONFIG.API.BASE_URL}/api/models/${modelId}/video`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.videoPath) {
            setFormattedVideoUrl(formatVideoUrl(data.videoPath));
          }
        })
        .catch(() => {});
    }
  }, [isModelReady, formattedVideoUrl, videoUrl, modelId, hideControls]);
  
  // Action handlers
  const handleDownloadPNG = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    try {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
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
  
  const handleDownloadGLB = () => {
    if (!modelUrl) return;
    
    try {
      const link = document.createElement('a');
      link.href = modelUrl;
      link.download = modelUrl.split('/').pop() || 'model.glb';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError("Could not download the GLB file.");
    }
  };

  const handleDownloadSTL = async () => {
    if (!modelId) return;
    
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/models/${modelId}/download/stl`);
      if (!response.ok) throw new Error(`STL conversion failed: ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const modelFileName = modelUrl?.split('/').pop() || 'model.glb';
      const baseName = modelFileName.replace(/\.glb$/i, '');
      link.download = `${baseName}.stl`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('STL download error:', err);
      setError("Could not download the STL file. Please try again.");
    }
  };
  
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current || !modelRef.current) return;
    
    try {
      const cameraPos = calculateCameraPosition(modelRef.current, cameraRef.current);
      cameraRef.current.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      modelRef.current.rotation.y = 0;
    } catch (err) {
      // Silently fail - not critical
    }
  };
  
  const toggleVideo = () => {
    setShowVideo(!showVideo);
  };
  
  const saveModelName = () => {
    if (onModelNameChange && editableName !== modelName) {
      onModelNameChange(editableName);
    }
    setIsEditingName(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveModelName();
    }
  };
  
  const handleDeleteModel = async () => {
    if (!modelId) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/models/${modelId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Delete failed: ${response.status}`);
      }
      
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
  
  const videoToggleButtonStyle = {
    position: 'absolute',
    top: '15px',
    left: '15px',
    zIndex: 100,
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
    pointerEvents: 'auto'
  };
  
  const loadingProgressBarStyle = {
    ...styles.loadingProgressBar,
    width: `${loadingProgress}%`
  };

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
      {/* Video Toggle Button */}
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

      {/* Video Player */}
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