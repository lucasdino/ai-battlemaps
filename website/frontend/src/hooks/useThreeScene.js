import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { createScene, createTransformControls } from '../utils/threeSceneUtils';
import { eventBus, EVENTS } from '../events/eventBus';

export const useThreeScene = (mountRef, options = {}) => {
  const { onError } = options;
  
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    try {
      // Create scene using utility
      const { scene, camera, renderer, orbitControls } = createScene(currentMount, onError);
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = orbitControls;

      // Disable shadow map for performance
      renderer.shadowMap.enabled = false;

      // Create transform controls
      const transformControls = createTransformControls(camera, renderer, onError);
      if (transformControls) {
        scene.add(transformControls);
        transformControlsRef.current = transformControls;

        // Set up transform control events
        transformControls.addEventListener('dragging-changed', (event) => {
          orbitControls.enabled = !event.value;
          
          if (event.value) {
            eventBus.emit(EVENTS.ASSET_MOVE_STARTED);
          } else {
            eventBus.emit(EVENTS.ASSET_MOVE_FINISHED);
          }
        });

        transformControls.addEventListener('objectChange', () => {
          if (transformControls.object && transformControls.object.userData.assetId) {
            const assetId = transformControls.object.userData.assetId;
            eventBus.emit(EVENTS.ASSET_UPDATED, {
              id: assetId,
              position: transformControls.object.position.clone(),
              rotation: transformControls.object.rotation.clone(),
              scale: transformControls.object.scale.clone(),
              fromTransform: true
            });
          }
        });
      }

      // Animation loop
      const animate = () => {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        orbitControls.update();
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
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        window.removeEventListener('resize', handleResize);

        if (transformControlsRef.current) {
          const tc = transformControlsRef.current;
          if (tc.object) tc.detach();
          tc.dispose();
          transformControlsRef.current = null;
        }

        if (controlsRef.current) {
          controlsRef.current.dispose();
          controlsRef.current = null;
        }

        if (rendererRef.current) {
          rendererRef.current.dispose();
          if (rendererRef.current.domElement && currentMount.contains(rendererRef.current.domElement)) {
            currentMount.removeChild(rendererRef.current.domElement);
          }
          rendererRef.current = null;
        }

        sceneRef.current = null;
        cameraRef.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize Three.js scene:', error);
      if (onError) onError(error.message);
    }
  }, [mountRef, onError]);

  // Camera positioning helper
  const positionCamera = useCallback((target, size) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    const fitOffset = 1.2;
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.max(size.x, size.y, size.z) / (2 * Math.tan(fov / 2));
    
    camera.position.set(
      target.x + distance * fitOffset,
      target.y + distance * fitOffset * 0.7,
      target.z + distance * fitOffset
    );
    camera.lookAt(target);
    controls.target.copy(target);
    controls.update();
  }, []);

  return {
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    transformControlsRef,
    raycasterRef,
    positionCamera
  };
}; 