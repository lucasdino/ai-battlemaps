import { useEffect, useRef } from 'react';
import { eventBus, EVENTS } from '../events/eventBus';

export const useAssetSync = ({ placedAssets = [] }) => {
  const prevAssetsRef = useRef({});
  const recentlyAddedAssetsRef = useRef(new Set());

  // Track assets added via drag and drop to prevent sync duplication
  useEffect(() => {
    const handleAssetAdded = (assetData) => {
      // Mark this asset as recently added to prevent sync duplication
      recentlyAddedAssetsRef.current.add(assetData.id);
    };

    eventBus.on(EVENTS.ASSET_ADDED, handleAssetAdded);
    
    return () => {
      eventBus.off(EVENTS.ASSET_ADDED, handleAssetAdded);
    };
  }, []);

  useEffect(() => {
    const currentAssets = {};
    const prevAssets = prevAssetsRef.current;

    // Build current assets map
    placedAssets.forEach(asset => {
      currentAssets[asset.id] = asset;
    });

    // Find new assets (in current but not in prev)
    placedAssets.forEach(asset => {
      if (!prevAssets[asset.id]) {
        // Check if this asset was recently added via drag and drop
        if (recentlyAddedAssetsRef.current.has(asset.id)) {
          // Don't emit event for recently added assets to prevent duplication
          recentlyAddedAssetsRef.current.delete(asset.id);
        } else {
          // New asset from external source (like terrain loading) - emit visual sync event only
          eventBus.emit(EVENTS.ASSET_VISUAL_SYNC, {
            id: asset.id,
            modelUrl: asset.modelUrl,
            name: asset.name,
            position: asset.position,
            rotation: asset.rotation,
            scale: asset.scale
          });
        }
      } else {
        // Existing asset - check if updated
        const prevAsset = prevAssets[asset.id];
        const hasChanged = (
          JSON.stringify(asset.position) !== JSON.stringify(prevAsset.position) ||
          JSON.stringify(asset.rotation) !== JSON.stringify(prevAsset.rotation) ||
          JSON.stringify(asset.scale) !== JSON.stringify(prevAsset.scale)
        );

        if (hasChanged) {
          eventBus.emit(EVENTS.ASSET_UPDATED, {
            id: asset.id,
            modelUrl: asset.modelUrl,
            name: asset.name,
            position: asset.position,
            rotation: asset.rotation,
            scale: asset.scale
          });
        }
      }
    });

    // Find deleted assets (in prev but not in current)
    Object.keys(prevAssets).forEach(assetId => {
      if (!currentAssets[assetId]) {
        eventBus.emit(EVENTS.ASSET_DELETED, { id: assetId });
      }
    });

    // Update prev assets ref
    prevAssetsRef.current = currentAssets;
  }, [placedAssets]);

  // Clear all assets when component unmounts or terrainId changes
  const clearAllAssets = () => {
    Object.keys(prevAssetsRef.current).forEach(assetId => {
      eventBus.emit(EVENTS.ASSET_DELETED, { id: assetId });
    });
    prevAssetsRef.current = {};
    recentlyAddedAssetsRef.current.clear();
  };

  return {
    clearAllAssets
  };
}; 