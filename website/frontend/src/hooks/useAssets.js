import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { loadAssetModel, disposeObject, snapToTerrain } from '../utils/threeSceneUtils';
import { eventBus, EVENTS } from '../events/eventBus';
import CONFIG from '../config';

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
      
      // Set position, rotation, scale
      const posY = position.y !== null && position.y !== undefined ? position.y : 0;
      modelInstance.position.set(position.x, posY, position.z);
      
      if (rotation && typeof rotation._x !== 'undefined') {
        modelInstance.rotation.set(rotation._x || 0, rotation._y || 0, rotation._z || 0);
      } else if (rotation) {
        modelInstance.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
      }
      
      if (scale) {
        modelInstance.scale.set(scale.x, scale.y, scale.z);
      }
      
      modelInstance.userData = { assetId: id, name: name || id };

      // Optimize for performance
      modelInstance.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.frustumCulled = true;
        }
      });

      // Snap to terrain
      if (terrainModelRef.current) {
        snapToTerrain(modelInstance, terrainModelRef.current, raycasterRef.current);
      }

      sceneRef.current.add(modelInstance);
      assetInstancesRef.current[id] = modelInstance;

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