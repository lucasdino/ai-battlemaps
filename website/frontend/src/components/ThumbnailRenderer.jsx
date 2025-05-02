import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import THEME from '../theme';

// This component renders a simple, low-quality preview of a 3D model
// It doesn't display on screen but returns a thumbnail image when rendered
const ThumbnailRenderer = ({ modelUrl, onRendered, onError, size = 60 }) => {
  const [isRendering, setIsRendering] = useState(true);
  const [instanceId] = useState(() => Math.random().toString(36).substring(2, 9));
  const canvasRef = useRef(null);

  useEffect(() => {
    // Skip if no URL provided
    if (!modelUrl) {
      console.warn(`[Thumbnail ${instanceId}] No model URL provided`);
      if (onError) onError('No model URL provided');
      return;
    }

    console.log(`[Thumbnail ${instanceId}] Generating thumbnail for ${modelUrl}`);
    
    // Create the renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false, // Lower quality for performance
      preserveDrawingBuffer: true
    });
    
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Very low quality settings for thumbnails
    renderer.setPixelRatio(1); // Low pixel ratio for performance
    
    // Create the scene
    const scene = new THREE.Scene();
    
    // Add lights (simplified lighting setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;
    camera.position.y = 2;
    camera.position.x = 2;
    
    // Load model with lower detail
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        try {
          console.log(`[Thumbnail ${instanceId}] Model loaded`);
          const model = gltf.scene;
          
          // Add model to scene
          scene.add(model);
          
          // Center and fit model to view
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Center the model
          model.position.x = -center.x;
          model.position.y = -center.y;
          model.position.z = -center.z;
          
          // Position camera to frame the model so it completely fills the frame
          // Consider the largest dimension to ensure model fills the thumbnail
          const maxDim = Math.max(size.x, size.y, size.z);
          const minDim = Math.min(size.x, size.y, size.z);
          const avgDim = (size.x + size.y + size.z) / 3;
          
          // Calculate optimal distance based on field of view
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
          
          // Adjust based on model's shape - ensure we're close enough
          // to fill frame but not so close that important parts are cut off
          const aspectRatio = Math.max(size.x, size.z) / size.y;
          
          // For tall/narrow models, we want to be a bit further back
          if (aspectRatio < 0.8) {
            cameraZ *= 1.2;
          }
          // For wide/flat models, we can be a bit closer
          else if (aspectRatio > 1.2) {
            cameraZ *= 0.9;
          }
          
          // Ensure we don't get too close
          cameraZ = Math.max(cameraZ, minDim * 1.5);
          
          // Position camera at an angle for better perspective
          camera.position.set(
            cameraZ * 0.7, // X component
            cameraZ * 0.5, // Y component
            cameraZ * 0.6  // Z component
          );
          
          // Look at the center of the model
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          
          // Add a slight rotation to the model for a better view
          model.rotation.y = Math.PI / 6; // 30 degrees rotation for better thumbnail angle
          
          // Render the scene
          renderer.render(scene, camera);
          
          // Get the image data
          const dataUrl = renderer.domElement.toDataURL('image/png');
          
          // Clean up resources
          renderer.dispose();
          
          // Model and material disposal
          model.traverse((node) => {
            if (node.isMesh) {
              if (node.geometry) node.geometry.dispose();
              if (node.material) {
                if (Array.isArray(node.material)) {
                  node.material.forEach(material => material.dispose());
                } else {
                  node.material.dispose();
                }
              }
            }
          });
          
          // Remove model from scene to help garbage collection
          scene.remove(model);
          
          // Return the thumbnail
          setIsRendering(false);
          if (onRendered) onRendered(dataUrl);
          
        } catch (err) {
          console.error(`[Thumbnail ${instanceId}] Error processing model:`, err);
          setIsRendering(false);
          if (onError) onError(`Failed to process model: ${err.message}`);
        }
      },
      undefined, // No progress callback needed for thumbnails
      (error) => {
        console.error(`[Thumbnail ${instanceId}] Error loading model:`, error);
        setIsRendering(false);
        if (onError) onError(`Failed to load model: ${error.message}`);
      }
    );
    
    // Create a hidden canvas element in case we need to examine it
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.display = 'none';
    canvasRef.current = canvas;
    
    // Clean up function
    return () => {
      console.log(`[Thumbnail ${instanceId}] Cleaning up resources`);
      renderer.dispose();
      if (canvasRef.current) {
        canvasRef.current = null;
      }
    };
  }, [modelUrl, onRendered, onError, size, instanceId]);

  // This component doesn't render anything visible
  return null;
};

export default ThumbnailRenderer; 