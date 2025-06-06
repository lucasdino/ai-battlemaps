import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { eventBus, EVENTS } from '../events/eventBus';

export const useInteractions = ({ 
  rendererRef, 
  cameraRef, 
  raycasterRef, 
  sceneRef,
  getAssetObjects,
  calculateGridPosition,
  placedAssets = [],
  terrainId 
}) => {
  const [isDraggingAsset, setIsDraggingAsset] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editPopupPosition, setEditPopupPosition] = useState(null);
  const [highlightedSquare, setHighlightedSquare] = useState(null);
  const highlightSquareRef = useRef(null);
  const availablePositionSquaresRef = useRef([]);

  // Asset click handler
  const handleAssetClick = useCallback((event) => {
    if (!rendererRef.current || !cameraRef.current) return;

    // Calculate mouse position in normalized device coordinates
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast from camera
    raycasterRef.current.setFromCamera({ x: mouseX, y: mouseY }, cameraRef.current);

    // If we're in dragging mode, handle asset movement
    if (isDraggingAsset && selectedAssetId) {
      if (!calculateGridPosition || !sceneRef.current) return;
      
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
      
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const rawPosition = intersect.point;
        const gridPos = calculateGridPosition(rawPosition.x, rawPosition.z);
        
        if (gridPos) {
          // Check if position is occupied by another asset
          const isOccupied = placedAssets?.some(asset => {
            if (!asset.position || asset.id === selectedAssetId) return false; // Ignore the asset being moved
            const assetGridPos = calculateGridPosition(asset.position.x, asset.position.z);
            return assetGridPos && assetGridPos.gridX === gridPos.gridX && assetGridPos.gridZ === gridPos.gridZ;
          });
          
          if (!isOccupied) {
            // Move the asset to the new position
            const movingAsset = placedAssets?.find(asset => asset.id === selectedAssetId);
            if (movingAsset) {
              // Calculate proper Y position to keep asset on top of terrain
              const assetObjects = getAssetObjects();
              const assetObject = assetObjects.find(obj => obj.userData.assetId === selectedAssetId);
              
              let properY = rawPosition.y;
              if (assetObject && raycasterRef.current && sceneRef.current) {
                // Get the asset's bounding box to find its bottom
                let meshToBox = assetObject;
                if (assetObject.type === 'Group') {
                  meshToBox = assetObject.children.find(child => child.isMesh) || assetObject;
                }
                const tempClone = meshToBox.clone();
                tempClone.scale.copy(assetObject.scale);
                tempClone.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(tempClone, true);
                
                // Raycast down from above to find terrain height
                const rayOrigin = new THREE.Vector3(gridPos.centerX, 200, gridPos.centerZ);
                const rayDirection = new THREE.Vector3(0, -1, 0);
                raycasterRef.current.set(rayOrigin, rayDirection);
                
                const terrainIntersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
                const terrainHits = terrainIntersects.filter(intersect => {
                  let obj = intersect.object;
                  while (obj.parent) {
                    if (obj.userData && obj.userData.assetId) return false; // Skip other assets
                    obj = obj.parent;
                  }
                  return true;
                });
                
                if (terrainHits.length > 0) {
                  const terrainY = terrainHits[0].point.y;
                  // Calculate how much to lift the asset so its bottom sits on terrain
                  const bottomOffset = bbox.min.y - assetObject.position.y;
                  properY = terrainY - bottomOffset;
                }
              }
              
              eventBus.emit(EVENTS.ASSET_UPDATED, {
                id: selectedAssetId,
                modelUrl: movingAsset.modelUrl,
                name: movingAsset.name,
                position: { 
                  x: gridPos.centerX, 
                  y: properY, 
                  z: gridPos.centerZ 
                },
                rotation: movingAsset.rotation,
                scale: movingAsset.scale
              });
              
              // Exit move mode
              setIsDraggingAsset(false);
              setSelectedAssetId(null);
              eventBus.emit(EVENTS.GRID_CLEAR_HIGHLIGHT);
              eventBus.emit(EVENTS.ASSET_MOVE_FINISHED);
            }
          }
        }
      }
      return;
    }

    // Normal click handling (not in move mode)
    const assetObjects = getAssetObjects();
    const assetIntersects = raycasterRef.current.intersectObjects(assetObjects, true);

    if (assetIntersects.length > 0) {
      // Find the root asset object
      let assetObject = assetIntersects[0].object;
      while (assetObject.parent && !assetObject.userData.assetId) {
        assetObject = assetObject.parent;
      }

      if (assetObject.userData.assetId) {
        const assetId = assetObject.userData.assetId;
        
        // Find the asset data from placedAssets
        const assetData = placedAssets?.find(asset => asset.id === assetId);
        if (assetData) {
          setEditingAsset(assetData);
          setEditPopupPosition({ x: event.clientX, y: event.clientY });
        }

        setSelectedAssetId(assetId);
        eventBus.emit(EVENTS.ASSET_SELECTED, { id: assetId });
      }
    } else {
      // Clicked on empty space, deselect
      setEditingAsset(null);
      setEditPopupPosition(null);
      setSelectedAssetId(null);
      eventBus.emit(EVENTS.ASSET_SELECTED, { id: null });
    }
  }, [rendererRef, cameraRef, raycasterRef, getAssetObjects, placedAssets, isDraggingAsset, selectedAssetId, calculateGridPosition, sceneRef]);

  // Mouse move handler for move mode
  const handleMouseMove = useCallback((event) => {
    if (!isDraggingAsset || !selectedAssetId || !rendererRef.current || !cameraRef.current || !calculateGridPosition) return;

    // Calculate mouse position in normalized device coordinates
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast from camera
    raycasterRef.current.setFromCamera({ x: mouseX, y: mouseY }, cameraRef.current);
    
    if (!sceneRef.current) return;
    
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const rawPosition = intersect.point;
      const gridPos = calculateGridPosition(rawPosition.x, rawPosition.z);
      
      // Only proceed if we got a valid grid position (within terrain bounds)
      if (gridPos) {
        const squareKey = `${gridPos.gridX},${gridPos.gridZ}`;
        
        // Only update if we've moved to a different square
        if (highlightedSquare !== squareKey) {
          setHighlightedSquare(squareKey);
          
          // Check if position is occupied by another asset (excluding the one being moved)
          const isOccupied = placedAssets?.some(asset => {
            if (!asset.position || asset.id === selectedAssetId) return false;
            const assetGridPos = calculateGridPosition(asset.position.x, asset.position.z);
            return assetGridPos && assetGridPos.gridX === gridPos.gridX && assetGridPos.gridZ === gridPos.gridZ;
          });
          
          eventBus.emit(EVENTS.GRID_HIGHLIGHT, {
            position: { x: gridPos.centerX, z: gridPos.centerZ },
            size: { x: gridPos.stepX, z: gridPos.stepZ },
            isOccupied
          });
        }
      } else {
        // Mouse is outside valid terrain bounds - clear highlight
        if (highlightedSquare !== null) {
          setHighlightedSquare(null);
          eventBus.emit(EVENTS.GRID_CLEAR_HIGHLIGHT);
        }
      }
    } else {
      // No intersection - clear highlight
      if (highlightedSquare !== null) {
        setHighlightedSquare(null);
        eventBus.emit(EVENTS.GRID_CLEAR_HIGHLIGHT);
      }
    }
  }, [isDraggingAsset, selectedAssetId, rendererRef, cameraRef, raycasterRef, calculateGridPosition, sceneRef, placedAssets, highlightedSquare]);

  // Set up event listeners
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.domElement.addEventListener('click', handleAssetClick);
    
    if (isDraggingAsset) {
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      renderer.domElement.removeEventListener('click', handleAssetClick);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleAssetClick, handleMouseMove, isDraggingAsset]);

  // Handle drag and drop for asset placement
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!calculateGridPosition || !rendererRef.current || !cameraRef.current) {
      return;
    }
    
    // Calculate mouse position and show highlight
    const canvas = rendererRef.current.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast to find position
    raycasterRef.current.setFromCamera({ x: mouseX, y: mouseY }, cameraRef.current);
    
    if (!sceneRef.current) {
      return;
    }
    
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const rawPosition = intersect.point;
      
      const gridPos = calculateGridPosition(rawPosition.x, rawPosition.z);
      
      if (gridPos) {
        const squareKey = `${gridPos.gridX},${gridPos.gridZ}`;
        
        if (highlightedSquare !== squareKey) {
          setHighlightedSquare(squareKey);
          
          // Check if position is occupied
          const isOccupied = placedAssets?.some(asset => {
            if (!asset.position) return false;
            const assetGridPos = calculateGridPosition(asset.position.x, asset.position.z);
            return assetGridPos && assetGridPos.gridX === gridPos.gridX && assetGridPos.gridZ === gridPos.gridZ;
          });
          
          e.dataTransfer.dropEffect = isOccupied ? 'none' : 'copy';
          
          eventBus.emit(EVENTS.GRID_HIGHLIGHT, {
            position: { x: gridPos.centerX, z: gridPos.centerZ },
            size: { x: gridPos.stepX, z: gridPos.stepZ },
            isOccupied
          });
        }
      }
    }
  }, [calculateGridPosition, rendererRef, cameraRef, raycasterRef, placedAssets, highlightedSquare]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let draggedAssetData;
    try {
      const transferData = e.dataTransfer.getData('application/json');
      if (!transferData) {
        return;
      }
      draggedAssetData = JSON.parse(transferData);
    } catch (err) {
      console.error('Failed to parse drag data:', err);
      return;
    }

    if (!calculateGridPosition || !rendererRef.current || !cameraRef.current || !draggedAssetData) {
      return;
    }

    // Calculate mouse position
    const canvas = rendererRef.current.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to find placement position
    raycasterRef.current.setFromCamera({ x: mouseX, y: mouseY }, cameraRef.current);
    
    if (!sceneRef.current) {
      return;
    }
    
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const rawPosition = intersect.point;
      const gridPos = calculateGridPosition(rawPosition.x, rawPosition.z);
      
      if (!gridPos) return;
      
      // Check if position is occupied
      const isOccupied = placedAssets?.some(asset => {
        if (!asset.position) return false;
        const assetGridPos = calculateGridPosition(asset.position.x, asset.position.z);
        return assetGridPos && assetGridPos.gridX === gridPos.gridX && assetGridPos.gridZ === gridPos.gridZ;
      });
      
      if (isOccupied) {
        eventBus.emit(EVENTS.GRID_CLEAR_HIGHLIGHT);
        return;
      }
      
      const newAssetData = {
        id: `dragdrop-${draggedAssetData.id}-${Date.now()}`,
        modelUrl: draggedAssetData.url,
        name: draggedAssetData.name,
        position: { 
          x: gridPos.centerX, 
          y: rawPosition.y, 
          z: gridPos.centerZ 
        },
        rotation: draggedAssetData.rotation || { x: 0, y: 0, z: 0 },
        scale: { 
          x: gridPos.stepX * 0.9, 
          y: gridPos.stepX * 0.9, 
          z: gridPos.stepZ * 0.9 
        },
      };

      eventBus.emit(EVENTS.ASSET_ADDED, newAssetData);
      eventBus.emit(EVENTS.GRID_CLEAR_HIGHLIGHT);
    }
  }, [calculateGridPosition, rendererRef, cameraRef, raycasterRef, placedAssets]);

  const handleDragLeave = useCallback(() => {
    eventBus.emit(EVENTS.GRID_CLEAR_HIGHLIGHT);
  }, []);

  // Asset editing functions
  const handleAssetRotate = useCallback((newRotation) => {
    if (!editingAsset || !selectedAssetId) return;

    // Get the latest asset object from the scene
    const assetObjects = getAssetObjects();
    const assetObject = assetObjects.find(obj => obj.userData.assetId === selectedAssetId);

    let latestPosition = editingAsset.position;
    let latestScale = editingAsset.scale;
    if (assetObject) {
      assetObject.updateMatrixWorld(true);
      latestPosition = {
        x: assetObject.position.x,
        y: assetObject.position.y,
        z: assetObject.position.z
      };
      latestScale = {
        x: assetObject.scale.x,
        y: assetObject.scale.y,
        z: assetObject.scale.z
      };
    }

    eventBus.emit(EVENTS.ASSET_UPDATED, {
      id: selectedAssetId,
      modelUrl: editingAsset.modelUrl,
      name: editingAsset.name,
      position: latestPosition,
      rotation: { x: 0, y: newRotation, z: 0 },
      scale: latestScale
    });
  }, [editingAsset, selectedAssetId, getAssetObjects]);

  const handleAssetResize = useCallback((newScale) => {
    if (!editingAsset || !selectedAssetId) return;

    const assetObjects = getAssetObjects();
    const assetObject = assetObjects.find(obj => obj.userData.assetId === selectedAssetId);

    let latestPosition = editingAsset.position;
    let latestRotation = editingAsset.rotation;
    if (assetObject && raycasterRef.current && sceneRef.current) {
      // Clone the mesh and apply the new scale
      let meshToBox = assetObject;
      if (assetObject.type === 'Group') {
        meshToBox = assetObject.children.find(child => child.isMesh) || assetObject;
      }
      const clone = meshToBox.clone();
      clone.scale.set(newScale, newScale, newScale);
      clone.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(clone, true);
      const rayOrigin = new THREE.Vector3(assetObject.position.x, 200, assetObject.position.z);
      const rayDirection = new THREE.Vector3(0, -1, 0);
      raycasterRef.current.set(rayOrigin, rayDirection);
      let terrainY = 0;
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
      const terrainIntersects = intersects.filter(intersect => {
        let obj = intersect.object;
        while (obj.parent) {
          if (obj.userData && obj.userData.assetId) return false;
          obj = obj.parent;
        }
        return true;
      });
      if (terrainIntersects.length > 0) {
        terrainY = terrainIntersects[0].point.y;
      }
      const delta = bbox.min.y - assetObject.position.y;
      const newY = terrainY - delta;
      latestPosition = {
        x: assetObject.position.x,
        y: newY,
        z: assetObject.position.z
      };
      // Use the latest rotation from the scene
      latestRotation = {
        x: assetObject.rotation.x,
        y: assetObject.rotation.y,
        z: assetObject.rotation.z
      };
    }

    eventBus.emit(EVENTS.ASSET_UPDATED, {
      id: selectedAssetId,
      modelUrl: editingAsset.modelUrl,
      name: editingAsset.name,
      position: latestPosition,
      rotation: latestRotation,
      scale: { x: newScale, y: newScale, z: newScale }
    });
  }, [editingAsset, selectedAssetId, getAssetObjects, raycasterRef, sceneRef]);

  const handleAssetDelete = useCallback(() => {
    if (!editingAsset || !selectedAssetId) return;
    
    eventBus.emit(EVENTS.ASSET_DELETED, { id: selectedAssetId });
    setEditingAsset(null);
    setEditPopupPosition(null);
    setSelectedAssetId(null);
  }, [editingAsset, selectedAssetId]);

  const handleAssetPickUp = useCallback(() => {
    if (!editingAsset || !selectedAssetId) return;
    
    setIsDraggingAsset(true);
    // Close the popup and start move mode
    setEditingAsset(null);
    setEditPopupPosition(null);
    
    eventBus.emit(EVENTS.ASSET_MOVE_STARTED);
  }, [editingAsset, selectedAssetId]);

  const handleEditPopupClose = useCallback(() => {
    setEditingAsset(null);
    setEditPopupPosition(null);
  }, []);

  // Clear assets function
  const handleClearAllAssets = useCallback(async () => {
    if (!terrainId || !placedAssets || placedAssets.length === 0) return;
    
    // Clear editing states
    setEditingAsset(null);
    setEditPopupPosition(null);
    setIsDraggingAsset(false);
    setSelectedAssetId(null);
    
    // Emit delete events for all assets
    placedAssets.forEach(asset => {
      eventBus.emit(EVENTS.ASSET_DELETED, { id: asset.id });
    });
  }, [terrainId, placedAssets]);

  return {
    isDraggingAsset,
    selectedAssetId,
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
    handleClearAllAssets
  };
}; 