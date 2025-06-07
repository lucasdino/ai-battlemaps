import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import THEME from '../theme';
import CONFIG from '../config';

const DefaultAssetConfigViewer = ({ 
  asset, 
  onConfigChange, 
  onSave,
  onClose,
  onError 
}) => {
  // Refs
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const canvasRef = useRef(null); // Direct reference to the canvas element
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationIdRef = useRef(null);
  const modelRef = useRef(null);
  const unitSquareRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState({
    scale: asset?.defaultScale || { x: 1, y: 1, z: 1 },
    rotation: asset?.defaultRotation || { x: 0, y: 0, z: 0 }
  });

  // Clear just the model from the scene
  const clearModel = useCallback(() => {
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      modelRef.current = null;
    }
  }, []);

  // Clear scene function - DON'T TOUCH DOM, let React handle that
  const clearScene = useCallback(() => {
    // Stop animation loop
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Clear model first
    clearModel();

    if (unitSquareRef.current && sceneRef.current) {
      sceneRef.current.remove(unitSquareRef.current);
      unitSquareRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      unitSquareRef.current = null;
    }
    
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      sceneRef.current = null;
    }
    
    cameraRef.current = null;
  }, [clearModel]);

  // Create unit square reference
  const createUnitSquare = useCallback(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ 
      color: THEME.accentPrimary, 
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    const unitSquare = new THREE.LineSegments(edges, material);
    unitSquare.rotation.x = -Math.PI / 2; // Lay flat on ground
    unitSquare.position.y = 0.001; // Slightly above ground to avoid z-fighting
    
    // Add corner markers
    const cornerGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const cornerMaterial = new THREE.MeshBasicMaterial({ color: THEME.accentPrimary });
    
    const corners = [
      [-0.5, 0.001, -0.5],
      [0.5, 0.001, -0.5],
      [0.5, 0.001, 0.5],
      [-0.5, 0.001, 0.5]
    ];
    
    corners.forEach((pos) => {
      const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
      corner.position.set(...pos);
      unitSquare.add(corner);
    });

    // Add center marker
    const centerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshBasicMaterial({ color: THEME.accentSecondary })
    );
    centerMarker.position.set(0, 0.001, 0);
    unitSquare.add(centerMarker);

    return unitSquare;
  }, []);

  // Setup model material
  const setupModelMaterial = useCallback((node) => {
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
  }, []);

  // Create lights - match ModelViewer exactly
  const createLights = useCallback((scene) => {
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
  }, []);

  // Add spinner animation styles
  useEffect(() => {
    const styleId = 'default-asset-config-spinner';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  }, []);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Clean up on unmount only
  useEffect(() => {
    return () => {
      clearScene();
    };
  }, [clearScene]);

  // Initialize scene once
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    
    // Clear any existing scene
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
        camera.position.set(2, 2, 2);
        cameraRef.current = camera;
        
        // Create renderer using the React-managed canvas
        const renderer = new THREE.WebGLRenderer({ 
          canvas: canvasRef.current,
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
          minDistance: 0.5,
          maxDistance: 10,
          maxPolarAngle: Math.PI / 1.5,
          target: new THREE.Vector3(0, 0, 0)
        });
        controlsRef.current = controls;
        
        // Add lights
        createLights(scene);
        
        // Create and add unit square
        const unitSquare = createUnitSquare();
        scene.add(unitSquare);
        unitSquareRef.current = unitSquare;
        
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
    
    setupScene();
    
  }, []); // Only run once on mount
  
  // Load model when asset changes
  useEffect(() => {
    if (!asset || !sceneRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    const loadModel = () => {
      const loader = new GLTFLoader();
      const modelUrl = asset.modelPath?.startsWith('/') 
        ? `${CONFIG.API.BASE_URL}${asset.modelPath}`
        : `${CONFIG.API.BASE_URL}/${asset.modelPath}`;
      
      loader.load(
        modelUrl,
        (gltf) => {
          try {
            if (!sceneRef.current) {
              return;
            }
            
            // Clear any existing model first to prevent duplicates
            clearModel();
            
            const model = gltf.scene;
            modelRef.current = model;
            
            model.traverse(setupModelMaterial);
            
            // Apply current config
            model.position.set(0, 0, 0);
            model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
            model.scale.set(config.scale.x, config.scale.y, config.scale.z);
            
            sceneRef.current.add(model);
            
            // Center camera view
            cameraRef.current.position.set(2, 2, 2);
            cameraRef.current.lookAt(0, 0, 0);
            
            if (controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
            
            setIsLoading(false);
          } catch (err) {
            console.error("Model display error:", err);
            setError('Error displaying the model. The file may be corrupted.');
            setIsLoading(false);
          }
        },
        (xhr) => {
          // Progress callback - could add progress indicator here
        },
        (errorEvent) => {
          console.error("Model load error:", errorEvent);
          setError('Failed to load 3D model. The file might be inaccessible or corrupted.');
          setIsLoading(false);
        }
      );
    };
    
    // Small delay to ensure scene is ready
    setTimeout(loadModel, 50);
    
  }, [asset, clearModel]); // Load when asset changes

  // Update model when config changes - DON'T reload, just update transforms
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
      modelRef.current.scale.set(config.scale.x, config.scale.y, config.scale.z);
    }
    
    if (onConfigChange) {
      onConfigChange(config);
    }
  }, [config, onConfigChange]);

  // Handle scale change
  const handleScaleChange = useCallback((axis, value) => {
    setConfig(prev => ({
      ...prev,
      scale: {
        ...prev.scale,
        [axis]: value
      }
    }));
  }, []);

  // Handle rotation change
  const handleRotationChange = useCallback((axis, value) => {
    const radianValue = (value * Math.PI) / 180; // Convert degrees to radians
    setConfig(prev => ({
      ...prev,
      rotation: {
        ...prev.rotation,
        [axis]: radianValue
      }
    }));
  }, []);

  // Handle uniform scale change
  const handleUniformScaleChange = useCallback((value) => {
    setConfig(prev => ({
      ...prev,
      scale: {
        x: value,
        y: value,
        z: value
      }
    }));
  }, []);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setConfig({
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0 }
    });
  }, []);

  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    zIndex: 1000,
    fontFamily: 'Arial, sans-serif'
  };

  const viewerStyle = {
    flex: 1,
    position: 'relative',
    minHeight: '400px'
  };

  const controlsStyle = {
    width: '300px',
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderLeft: '1px solid #444',
    overflowY: 'auto',
    color: '#fff'
  };

  const sliderGroupStyle = {
    marginBottom: '20px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '14px'
  };

  const sliderStyle = {
    width: '100%',
    marginBottom: '8px'
  };

  const valueStyle = {
    fontSize: '12px',
    color: '#ccc',
    textAlign: 'right'
  };

  const buttonStyle = {
    padding: '10px 20px',
    margin: '5px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: THEME.primary,
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#666',
    color: 'white'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e74c3c',
    color: 'white'
  };

  if (!asset) return null;

  return (
    <div style={containerStyle}>
      {/* 3D Viewer */}
      <div style={viewerStyle}>
        <div 
          ref={canvasContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        >
          {/* React-managed canvas that Three.js will use */}
          <canvas 
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />
          {/* Loading overlay */}
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              color: '#fff'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #666',
                borderTop: '4px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '20px'
              }}></div>
              <div>Loading model...</div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(231, 76, 60, 0.9)',
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              maxWidth: '80%'
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Controls Panel */}
      <div style={controlsStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
          Configure: {asset.name}
        </h3>

        {/* Uniform Scale */}
        <div style={sliderGroupStyle}>
          <label style={labelStyle}>Uniform Scale</label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={config.scale.x}
            onChange={(e) => handleUniformScaleChange(parseFloat(e.target.value))}
            style={sliderStyle}
          />
          <div style={valueStyle}>{config.scale.x.toFixed(1)}</div>
        </div>

        {/* Individual Scale Controls */}
        <div style={sliderGroupStyle}>
          <label style={labelStyle}>Individual Scale</label>
          
          <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>X (Width)</label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={config.scale.x}
            onChange={(e) => handleScaleChange('x', parseFloat(e.target.value))}
            style={sliderStyle}
          />
          <div style={valueStyle}>{config.scale.x.toFixed(1)}</div>

          <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Y (Height)</label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={config.scale.y}
            onChange={(e) => handleScaleChange('y', parseFloat(e.target.value))}
            style={sliderStyle}
          />
          <div style={valueStyle}>{config.scale.y.toFixed(1)}</div>

          <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Z (Depth)</label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={config.scale.z}
            onChange={(e) => handleScaleChange('z', parseFloat(e.target.value))}
            style={sliderStyle}
          />
          <div style={valueStyle}>{config.scale.z.toFixed(1)}</div>
        </div>

        {/* Rotation Controls */}
        <div style={sliderGroupStyle}>
          <label style={labelStyle}>Rotation</label>
          
          <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Y (Turn)</label>
          <input
            type="range"
            min="-180"
            max="180"
            step="15"
            value={(config.rotation.y * 180) / Math.PI}
            onChange={(e) => handleRotationChange('y', parseFloat(e.target.value))}
            style={sliderStyle}
          />
          <div style={valueStyle}>{Math.round((config.rotation.y * 180) / Math.PI)}°</div>
        </div>

        {/* Reference Info */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#333', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Unit Square Reference:</div>
          <div style={{ color: '#ccc' }}>
            • Blue outline = 1x1 unit square<br/>
            • Blue corners = square boundaries<br/>
            • Orange center = (0,0,0) position<br/>
            • Use this to size your asset correctly
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={handleReset}
            style={secondaryButtonStyle}
          >
            Reset to Default
          </button>
          
          <button 
            onClick={() => onSave(config)}
            style={primaryButtonStyle}
          >
            Save Configuration
          </button>
          
          <button 
            onClick={onClose}
            style={dangerButtonStyle}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefaultAssetConfigViewer; 