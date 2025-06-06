import { useEffect, useCallback } from 'react';
import { eventBus, EVENTS } from '../events/eventBus';
import CONFIG from '../config';

export const usePersistence = ({ 
  terrainId, 
  onAssetPlaced, 
  onAssetMoved, 
  onAssetDeleted,
  onError 
}) => {
  
  // Handle asset added events (save to backend)
  const handleAssetAdded = useCallback(async (assetData) => {
    if (!terrainId || !onAssetPlaced) {
      return;
    }
    
    try {
      await onAssetPlaced(assetData, terrainId);
    } catch (error) {
      console.error('❌ Failed to save new asset:', error);
      if (onError) onError(`Failed to save asset: ${assetData.name}`);
    }
  }, [terrainId, onAssetPlaced, onError]);

  // Handle asset updated events (save to backend)
  const handleAssetUpdated = useCallback(async (payload) => {
    if (!terrainId || !onAssetMoved || payload.fromTransform) return;
    
    try {
      const { id, position, rotation, scale } = payload;
      await onAssetMoved(id, position, rotation, scale, terrainId);
    } catch (error) {
      console.error('Failed to save asset update:', error);
      if (onError) onError(`Failed to update asset`);
    }
  }, [terrainId, onAssetMoved, onError]);

  // Handle asset deleted events (save to backend)
  const handleAssetDeleted = useCallback(async (payload) => {
    if (!terrainId || !onAssetDeleted) return;
    
    try {
      const { id } = payload;
      await onAssetDeleted(id, terrainId);
    } catch (error) {
      console.error('Failed to delete asset:', error);
      if (onError) onError(`Failed to delete asset`);
    }
  }, [terrainId, onAssetDeleted, onError]);

  // Set up event listeners
  useEffect(() => {
    eventBus.on(EVENTS.ASSET_ADDED, handleAssetAdded);
    eventBus.on(EVENTS.ASSET_UPDATED, handleAssetUpdated);
    eventBus.on(EVENTS.ASSET_DELETED, handleAssetDeleted);

    return () => {
      eventBus.off(EVENTS.ASSET_ADDED, handleAssetAdded);
      eventBus.off(EVENTS.ASSET_UPDATED, handleAssetUpdated);
      eventBus.off(EVENTS.ASSET_DELETED, handleAssetDeleted);
    };
  }, [handleAssetAdded, handleAssetUpdated, handleAssetDeleted]);

  // Clear all assets function
  const clearAllAssets = useCallback(async () => {
    if (!terrainId) return;
    
    try {
      // Make API call to clear all assets in backend
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ placedAssets: [] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear assets');
      }
    } catch (error) {
      console.error('Failed to clear assets:', error);
      if (onError) onError(`Failed to clear assets: ${error.message}`);
      throw error;
    }
  }, [terrainId, onError]);

  return {
    clearAllAssets
  };
}; 