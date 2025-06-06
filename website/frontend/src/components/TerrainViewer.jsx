import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from './common';
import { terrainViewerStyles } from '../styles/TerrainViewer';
import DungeonLayoutPopup from './DungeonLayoutPopup';
import AssetPlacementPanel from './AssetPlacementPanel';
import AssetEditPopup from './AssetEditPopup';

// Import our new hooks
import { useThreeScene } from '../hooks/useThreeScene';
import { useTerrain } from '../hooks/useTerrain';
import { useAssets } from '../hooks/useAssets';
import { useInteractions } from '../hooks/useInteractions';
import { useGridHighlight } from '../hooks/useGridHighlight';
import { usePersistence } from '../hooks/usePersistence';
import { useAssetSync } from '../hooks/useAssetSync';
import { eventBus, EVENTS } from '../events/eventBus';

const TerrainViewer = ({ 
  terrainUrl, 
  terrainName, 
  terrainId, 
  onError, 
  onTerrainNameChange,
  onTerrainDeleted,
  onTerrainMetricsUpdate,
  hideTerrainControls = false,
  showGrid: initialShowGrid = true,
  scale: initialScaleProp,
  placedAssets = [],
  onAssetPlaced,
  onAssetMoved,
  onAssetDeleted,
  onAssetSelected,
  selectedAssetId,
  transformMode,
  onTransformModeChange,
  floorPlan,
  isDungeonLayout = false,
  layoutLoadError = false,
  placedDungeons = false,
}) => {
  // Refs
  const mountRef = useRef(null);

  // Local state for UI
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(terrainName || '');
  const [showLayoutVisualization, setShowLayoutVisualization] = useState(false);
  const [layoutVisualizationData, setLayoutVisualizationData] = useState(null);
  const [showAssetPlacementPanel, setShowAssetPlacementPanel] = useState(false);

  // Initialize all hooks
  const { sceneRef, rendererRef, cameraRef, raycasterRef, positionCamera, transformControlsRef } = useThreeScene(mountRef, { onError });
  
  const { terrainModelRef, isLoading, error, isGridVisible, calculateGridPosition } = useTerrain({
    sceneRef,
    terrainUrl,
    terrainId,
    terrainName,
    positionCamera,
    onTerrainMetricsUpdate,
    onError
  });

  const { getAssetObjects, clearAllAssets: clearAssetInstances } = useAssets({
    sceneRef,
    terrainModelRef,
    transformControlsRef,
    raycasterRef,
    terrainId,
    onAssetMoved,
    onAssetDeleted,
    onAssetSelected,
    onError
  });

    const {
    isDraggingAsset,
    selectedAssetId: localSelectedAssetId,
    editingAsset,
    editPopupPosition,
    handleDragOver,
    handleDrop,
    handleDragLeave,
    handleAssetRotate,
    handleAssetResize,
    handleAssetDelete,
    handleAssetPickUp,
    handleEditPopupClose,
    handleClearAllAssets: clearAssetsFromUI
  } = useInteractions({
    rendererRef,
    cameraRef,
    raycasterRef,
    sceneRef,
    getAssetObjects,
    calculateGridPosition,
    placedAssets,
    terrainId
  });

  useGridHighlight({ sceneRef });
  usePersistence({ terrainId, onAssetPlaced, onAssetMoved, onAssetDeleted, onError });
  
  const { clearAllAssets: clearAssetSync } = useAssetSync({ placedAssets });

  // Layout visualization data effect
  useEffect(() => {
    if (isDungeonLayout && !placedDungeons && floorPlan) {
      setLayoutVisualizationData(floorPlan);
    } else {
      setLayoutVisualizationData(null);
    }
  }, [isDungeonLayout, placedDungeons, floorPlan]);

  // Clear assets when terrain changes
  useEffect(() => {
    clearAssetInstances();
    // Note: Don't call clearAssetSync() here as it triggers deletion events
    // which show "Asset deleted successfully" messages when switching terrains
  }, [terrainId, clearAssetInstances]);

  // Set edited name when terrain name changes
  useEffect(() => {
    setEditedName(terrainName || '');
  }, [terrainName]);

  // Name editing handlers
  const handleNameClick = useCallback(() => {
    setEditedName(terrainName || '');
    setIsEditingName(true);
  }, [terrainName]);
  
  const handleNameEditSubmit = async () => {
    if (!terrainId || !editedName.trim() || editedName.trim() === terrainName) {
      setIsEditingName(false);
      return;
    }
    try {
      await onTerrainNameChange(terrainId, editedName.trim());
      setIsEditingName(false);
    } catch (err) {
      if (onError) onError("Failed to update terrain name.");
      setEditedName(terrainName || '');
      setIsEditingName(false);
    }
  };
  
  const handleNameEditCancel = useCallback(() => {
    setEditedName(terrainName || '');
    setIsEditingName(false);
  }, [terrainName]);

  const handleDeleteTerrain = async () => {
    if (!terrainId || !onTerrainDeleted) return;
    if (localSelectedAssetId && onAssetSelected) {
      onAssetSelected(null);
    }
    try {
      await onTerrainDeleted(terrainId); 
    } catch (err) {
      if (onError) onError(err.message || "Failed to delete terrain.");
    }
  };

  // Grid toggle handler
  const handleToggleGrid = useCallback(() => {
    eventBus.emit(EVENTS.GRID_TOGGLE);
  }, []);

  // Clear all assets handler
  const handleClearAllAssets = useCallback(async () => {
    try {
      await clearAssetsFromUI();
    } catch (error) {
      if (onError) onError(`Failed to clear assets: ${error.message}`);
    }
  }, [clearAssetsFromUI, onError]);

  return (
    <div style={terrainViewerStyles.container}>
      {error && <div style={terrainViewerStyles.errorOverlay}>Error: {error}</div>}
      {isLoading && (
        <div style={terrainViewerStyles.loadingOverlay}>
          Loading Dungeon...
        </div>
      )}
      
      {/* Terrain Name Header */}
      {!isLoading && !error && terrainUrl && !hideTerrainControls && (
        <div style={terrainViewerStyles.terrainNameHeader}>
          {isEditingName ? (
            <div style={terrainViewerStyles.terrainNameContainer}>
              <input 
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameEditSubmit}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleNameEditSubmit();
                  } else if (e.key === 'Escape') {
                    handleNameEditCancel();
                  }
                }}
                autoFocus
                style={terrainViewerStyles.terrainNameInput}
              />
            </div>
          ) : (
            <div 
              onClick={handleNameClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              style={terrainViewerStyles.terrainNameDisplay}
              title="Click to edit terrain name"
            >
              {terrainName || 'Unnamed Terrain'} ✏️
            </div>
          )}
        </div>
      )}
      
      {/* Dungeon Layout Popup */}
      <DungeonLayoutPopup
        isOpen={showLayoutVisualization}
        onClose={() => setShowLayoutVisualization(false)}
        layoutVisualizationData={layoutVisualizationData}
        onPlaceAssets={() => setShowPlaceAssetsPopup(true)}
      />
      
      {/* Main render container */}
      <div 
        ref={mountRef} 
        style={{
          ...terrainViewerStyles.renderContainer,
          display: showLayoutVisualization ? 'none' : 'block',
          ...(showAssetPlacementPanel ? {
            border: '2px dashed rgba(0, 123, 255, 0.3)',
            borderRadius: '8px',
          } : {}),
          ...(isDraggingAsset ? {
            border: '2px dashed rgba(255, 165, 0, 0.5)',
            borderRadius: '8px'
          } : {}),
          position: 'relative',
          pointerEvents: 'auto'
        }} 
        onDragEnter={(e) => {
          if (showAssetPlacementPanel) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDragOver={showAssetPlacementPanel ? handleDragOver : undefined}
        onDragLeave={showAssetPlacementPanel ? handleDragLeave : undefined}
        onDrop={showAssetPlacementPanel ? handleDrop : undefined}
      />
      
      {/* Controls Panel */}
      <div style={terrainViewerStyles.controlsPanel}>
        {!hideTerrainControls && (
          <>
            <Button onClick={handleToggleGrid} size="small">
              {isGridVisible ? 'Hide Grid' : 'Show Grid'}
            </Button>
            
            <Button 
              onClick={() => setShowAssetPlacementPanel(true)} 
              size="small"
              style={{backgroundColor: '#007bff', color: 'white'}}
            >
              Place Assets
            </Button>
            
            {placedAssets && placedAssets.length > 0 && (
              <Button 
                onClick={handleClearAllAssets}
                size="small"
                style={{backgroundColor: '#dc3545', color: 'white'}}
              >
                Clear All Assets
              </Button>
            )}
            
            {isDungeonLayout && (
              <Button 
                onClick={() => setShowLayoutVisualization(true)} 
                size="small" 
                style={terrainViewerStyles.viewLayoutButton}
              >
                View Layout 📊
              </Button>
            )}
              
            {terrainUrl && (
              <Button onClick={handleDeleteTerrain} variant="danger" size="small">
                Delete Dungeon
              </Button>
            )}
          </>
        )}
      </div>

      {/* Asset Placement Panel */}
      <AssetPlacementPanel
        isOpen={showAssetPlacementPanel}
        onClose={() => {
          setShowAssetPlacementPanel(false);
          eventBus.emit(EVENTS.GRID_CLEAR_HIGHLIGHT);
        }}
        placedAssets={placedAssets || []}
        terrainId={terrainId}
        terrainName={terrainName}
      />

      {/* Asset Edit Popup */}
      {editingAsset && editPopupPosition && (
        <AssetEditPopup
          asset={editingAsset}
          position={editPopupPosition}
          isDraggingAsset={isDraggingAsset}
          onRotate={handleAssetRotate}
          onResize={handleAssetResize}
          onDelete={handleAssetDelete}
          onPickUp={handleAssetPickUp}
          onClose={handleEditPopupClose}
        />
      )}
    </div>
  );
};

export default React.memo(TerrainViewer); 