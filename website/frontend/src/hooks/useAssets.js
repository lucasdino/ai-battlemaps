import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { loadAssetModel, disposeObject, snapToTerrain } from '../utils/threeSceneUtils';
import { eventBus, EVENTS } from '../events/eventBus';
import CONFIG from '../config';

// Constants for LOD distances
const LOD_DISTANCES = {
  HIGH: 12,   // High detail up to 12 units
  MEDIUM: 25, // Medium detail up to 25 units
};

export const useAssets = ({ 
  sceneRef, 
  terrainModelRef, 
  transformControlsRef, 
  raycasterRef,
  terrainId,
  onAssetMoved,
  onAssetDeleted,
  onAssetSelected,
  onError 
}) => {
  const assetInstancesRef = useRef({});
  const isMovingRef = useRef(false);

  // Handle asset added/updated events
  const handleAssetAddedOrUpdated = useCallback(async (payload) => {
    const { id, modelUrl, position, rotation, scale, name, fromTransform } = payload;
    
    if (!sceneRef.current) return;

    const existing = assetInstancesRef.current[id];

    if (existing) {
      // Update existing asset - skip only if this update came from transform controls
      if (!fromTransform) {
        // Handle position with proper Y fallback
        const posY = position.y !== null && position.y !== undefined ? position.y : existing.position.y;
        existing.position.set(position.x, posY, position.z);
        
        // Handle rotation
        if (rotation && typeof rotation._x !== 'undefined') {
          existing.rotation.set(rotation._x || 0, rotation._y || 0, rotation._z || 0);
        } else if (rotation) {
          existing.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
        }
        
        if (scale) {
          existing.scale.set(scale.x, scale.y, scale.z);
        }
      }
      
      // If this update came from transform controls, call the parent callback
      if (fromTransform && onAssetMoved) {
        onAssetMoved(id, position, rotation, scale, terrainId);
      }
      return;
    }

    // Load new asset
    try {
      let fullUrl;
      if (modelUrl.startsWith('http')) {
        fullUrl = modelUrl;
      } else {
        const cleanUrl = modelUrl.startsWith('/') ? modelUrl.slice(1) : modelUrl;
        fullUrl = `${CONFIG.API.BASE_URL}/${cleanUrl}`;
      }

      const modelInstance = await loadAssetModel(fullUrl);
      
      // --- NEW: Level of Detail (LOD) implementation ---
      const lod = new THREE.LOD();

      // For now, we use the same model for all levels.
      // For real performance gains, you should provide simplified
      // versions of the models for medium and low detail levels.
      const highDetailModel = modelInstance;

      // --- OPTIMIZATION: Use a cheaper material for the medium level ---
      const mediumDetailModel = highDetailModel.clone();
      mediumDetailModel.traverse(child => {
        if (child.isMesh && child.material) {
          // Swap to a cheaper material, keeping the texture but removing lighting calculations
          const oldMaterial = child.material;
          child.material = new THREE.MeshBasicMaterial({
              map: oldMaterial.map,
              color: oldMaterial.color,
          });
          oldMaterial.dispose();
        }
      });
      
      // For the lowest level, use a simple box to maximize performance
      const box = new THREE.Box3().setFromObject(highDetailModel);
      const size = box.getSize(new THREE.Vector3());
      const lowDetailGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const lowDetailMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true });
      const lowDetailModel = new THREE.Mesh(lowDetailGeometry, lowDetailMaterial);

      lod.addLevel(highDetailModel, 0);
      lod.addLevel(mediumDetailModel, LOD_DISTANCES.HIGH);
      lod.addLevel(lowDetailModel, LOD_DISTANCES.MEDIUM);
      // Beyond the last level, the object won't be rendered.

      // Set position, rotation, scale on the LOD object itself
      const posY = position.y !== null && position.y !== undefined ? position.y : 0;
      lod.position.set(position.x, posY, position.z);
      
      if (rotation && typeof rotation._x !== 'undefined') {
        lod.rotation.set(rotation._x || 0, rotation._y || 0, rotation._z || 0);
      } else if (rotation) {
        lod.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
      }
      
      if (scale) {
        lod.scale.set(scale.x, scale.y, scale.z);
      }
      
      lod.userData = { assetId: id, name: name || id };

      // Optimize for performance (applies to all levels)
      lod.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.frustumCulled = true;
        }
      });

      // Snap to terrain
      if (terrainModelRef.current) {
        snapToTerrain(lod, terrainModelRef.current, raycasterRef.current);
      } else {
        // This is likely a dungeon layout. The floor top is at y=0.3.
        // We need to snap the asset to this floor.
        const floorTopY = 0.3;

        // The logic from snapToTerrain can be adapted.
        lod.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(lod, true);
        
        const modelOriginY = lod.position.y;
        const modelBottomY = bbox.min.y;
        const offset = modelOriginY - modelBottomY;
        
        lod.position.y = floorTopY + offset;
      }

      sceneRef.current.add(lod);
      assetInstancesRef.current[id] = lod;

    } catch (error) {
      console.error(`Failed to load asset ${id}:`, error);
      if (onError) onError(`Failed to load asset: ${name || id}`);
    }
  }, [sceneRef, terrainModelRef, raycasterRef, terrainId, onAssetMoved, onError]);

  // Handle asset deleted events
  const handleAssetDeleted = useCallback((payload) => {
    const { id } = payload;
    
    if (!sceneRef.current) return;

    const instance = assetInstancesRef.current[id];
    if (!instance) return;

    sceneRef.current.remove(instance);
    disposeObject(instance);
    delete assetInstancesRef.current[id];

    // Detach from transform controls if selected
    if (transformControlsRef.current && transformControlsRef.current.object === instance) {
      transformControlsRef.current.detach();
    }

    // Call parent callback if provided
    if (onAssetDeleted) {
      onAssetDeleted(id, terrainId);
    }
  }, [sceneRef, transformControlsRef, terrainId, onAssetDeleted]);

  // Handle asset selection events
  const handleAssetSelected = useCallback((payload) => {
    const { id } = payload;
    
    if (!transformControlsRef.current) return;

    if (id && assetInstancesRef.current[id]) {
      // No longer using transform controls for movement
    } else {
      // No longer using transform controls for movement  
    }

    if (onAssetSelected) {
      onAssetSelected(id);
    }
  }, [transformControlsRef, onAssetSelected]);

  // Handle move started/finished events
  const handleMoveStarted = useCallback(() => {
    isMovingRef.current = true;
  }, []);

  const handleMoveFinished = useCallback(() => {
    // Add a small delay to prevent race conditions
    setTimeout(() => {
      isMovingRef.current = false;
    }, 100);
  }, []);

  // Set up event listeners
  useEffect(() => {
    eventBus.on(EVENTS.ASSET_ADDED, handleAssetAddedOrUpdated);
    eventBus.on(EVENTS.ASSET_VISUAL_SYNC, handleAssetAddedOrUpdated); // Handle visual sync events
    eventBus.on(EVENTS.ASSET_UPDATED, handleAssetAddedOrUpdated);
    eventBus.on(EVENTS.ASSET_DELETED, handleAssetDeleted);
    eventBus.on(EVENTS.ASSET_SELECTED, handleAssetSelected);
    eventBus.on(EVENTS.ASSET_MOVE_STARTED, handleMoveStarted);
    eventBus.on(EVENTS.ASSET_MOVE_FINISHED, handleMoveFinished);

    return () => {
      eventBus.off(EVENTS.ASSET_ADDED, handleAssetAddedOrUpdated);
      eventBus.off(EVENTS.ASSET_VISUAL_SYNC, handleAssetAddedOrUpdated); // Clean up visual sync listener
      eventBus.off(EVENTS.ASSET_UPDATED, handleAssetAddedOrUpdated);
      eventBus.off(EVENTS.ASSET_DELETED, handleAssetDeleted);
      eventBus.off(EVENTS.ASSET_SELECTED, handleAssetSelected);
      eventBus.off(EVENTS.ASSET_MOVE_STARTED, handleMoveStarted);
      eventBus.off(EVENTS.ASSET_MOVE_FINISHED, handleMoveFinished);
    };
  }, [
    handleAssetAddedOrUpdated,
    handleAssetDeleted,
    handleAssetSelected,
    handleMoveStarted,
    handleMoveFinished
  ]);

  // Clean up all assets when terrain changes
  const clearAllAssets = useCallback(() => {
    if (!sceneRef.current) return;

    Object.values(assetInstancesRef.current).forEach((instance) => {
      sceneRef.current.remove(instance);
      disposeObject(instance);
    });
    assetInstancesRef.current = {};

    // Detach transform controls
    if (transformControlsRef.current) {
      transformControlsRef.current.detach();
    }
  }, [sceneRef, transformControlsRef]);

  // Get asset instances for raycasting
  const getAssetObjects = useCallback(() => {
    return Object.values(assetInstancesRef.current);
  }, []);

  return {
    assetInstancesRef,
    clearAllAssets,
    getAssetObjects
  };
}; 