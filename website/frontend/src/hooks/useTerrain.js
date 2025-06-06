import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { loadTerrainModel, createGridHelper, createTerrainConformingGrid, disposeObject } from '../utils/threeSceneUtils';
import { eventBus, EVENTS } from '../events/eventBus';
import CONFIG from '../config';

export const useTerrain = ({ 
  sceneRef, 
  terrainUrl, 
  terrainId, 
  terrainName,
  positionCamera,
  onTerrainMetricsUpdate,
  onError 
}) => {
  const terrainModelRef = useRef(null);
  const gridHelperRef = useRef(null);
  const [isLoading, setIsLoading] = useState(!!terrainUrl);
  const [error, setError] = useState(null);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [terrainMetadata, setTerrainMetadata] = useState(null);
  const [scaledSize, setScaledSize] = useState(new THREE.Vector3(20, 0, 20));
  const [scaledCenter, setScaledCenter] = useState(new THREE.Vector3());

  // Fetch terrain metadata
  useEffect(() => {
    if (!terrainId) return;

    const controller = new AbortController();
    const { signal } = controller;

    fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}`, { signal })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setTerrainMetadata(data);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch terrain metadata:', err);
      });

    return () => controller.abort();
  }, [terrainId]);

  // Create terrain-conforming grid
  const createTerrainGrid = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !terrainModelRef.current) return;

    // Remove existing grid
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      disposeObject(gridHelperRef.current);
      gridHelperRef.current = null;
    }

    // Get grid dimensions from terrain metadata
    let gridDimensions = null;
    let gridScale = 1.0;
    
    if (terrainMetadata) {
      if (terrainMetadata.dimensions) {
        gridDimensions = {
          width: terrainMetadata.dimensions.width,
          height: terrainMetadata.dimensions.height
        };
      }
      if (terrainMetadata.gridScale) {
        gridScale = terrainMetadata.gridScale;
      }
    }

    // Create new terrain-conforming grid
    const terrainGrid = createTerrainConformingGrid(terrainModelRef.current, gridDimensions, gridScale);
    if (terrainGrid) {
      terrainGrid.visible = isGridVisible;
      scene.add(terrainGrid);
      gridHelperRef.current = terrainGrid;
    }
  }, [sceneRef, terrainMetadata, isGridVisible]);

  // Create fallback grid for when no terrain is loaded
  const createFallbackGrid = useCallback((width, depth, center) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      disposeObject(gridHelperRef.current);
      gridHelperRef.current = null;
    }

    if (width > 0 && depth > 0) {
      const gridHelper = createGridHelper(width, depth, center, null);
      gridHelper.visible = isGridVisible;
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;
    }
  }, [sceneRef, isGridVisible]);

  // Load terrain model
  useEffect(() => {
    if (!sceneRef.current) return;

    setIsLoading(!!terrainUrl);
    setError(null);

    if (terrainUrl) {
      loadTerrainModel(terrainUrl, 1.0)
        .then((model) => {
          if (!sceneRef.current) return;

          // Remove old terrain
          if (terrainModelRef.current) {
            sceneRef.current.remove(terrainModelRef.current);
            disposeObject(terrainModelRef.current);
          }
          
          sceneRef.current.add(model);
          terrainModelRef.current = model;
          
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          setScaledSize(size);
          setScaledCenter(center);

          if (onTerrainMetricsUpdate) {
            onTerrainMetricsUpdate({
              width: size.x, 
              depth: size.z, 
              height: size.y,
              centerX: center.x, 
              centerY: center.y, 
              centerZ: center.z,
            });
          }

          // Position camera
          if (positionCamera) {
            positionCamera(center, size);
          }

          setIsLoading(false);
          eventBus.emit(EVENTS.TERRAIN_LOADED, { terrainId, size, center });
        })
        .catch((error) => {
          const errorMsg = `Failed to load dungeon: ${terrainName}. Details: ${error.message}`;
          setError(errorMsg);
          if (onError) onError(errorMsg);
          setIsLoading(false);
          eventBus.emit(EVENTS.TERRAIN_ERROR, { terrainId, error: errorMsg });
        });
    } else {
      // Default view setup
      setIsLoading(false);
      const defaultCenter = new THREE.Vector3(0, 0, 0);
      const defaultSize = new THREE.Vector3(20, 0, 20);
      
      setScaledSize(defaultSize);
      setScaledCenter(defaultCenter);
      
      if (positionCamera) {
        positionCamera(defaultCenter, defaultSize);
      }
    }
  }, [sceneRef, terrainUrl, terrainName, positionCamera, onTerrainMetricsUpdate, onError]);

  // Update grid when terrain or metadata changes
  useEffect(() => {
    if (terrainModelRef.current && terrainMetadata) {
      createTerrainGrid();
    } else if (!terrainModelRef.current && scaledSize && scaledCenter) {
      createFallbackGrid(scaledSize.x, scaledSize.z, scaledCenter);
    }
  }, [terrainMetadata, scaledSize, scaledCenter, createTerrainGrid, createFallbackGrid]);

  // Handle grid toggle events
  useEffect(() => {
    const handleGridToggle = () => {
      setIsGridVisible(prev => {
        const newVisibility = !prev;
        if (gridHelperRef.current) {
          gridHelperRef.current.visible = newVisibility;
        }
        return newVisibility;
      });
    };

    eventBus.on(EVENTS.GRID_TOGGLE, handleGridToggle);
    return () => eventBus.off(EVENTS.GRID_TOGGLE, handleGridToggle);
  }, []);

  // Calculate grid position helper
  const calculateGridPosition = useCallback((worldX, worldZ) => {
    if (!terrainModelRef.current) return null;

    const bbox = new THREE.Box3().setFromObject(terrainModelRef.current);
    const size = bbox.getSize(new THREE.Vector3());
    
    let gridWidth, gridHeight;
    if (terrainMetadata && terrainMetadata.dimensions) {
      gridWidth = terrainMetadata.dimensions.width;
      gridHeight = terrainMetadata.dimensions.height;
    } else {
      const cellSize = terrainMetadata?.gridScale || 1.0;
      gridWidth = Math.max(10, Math.round(size.x / cellSize));
      gridHeight = Math.max(10, Math.round(size.z / cellSize));
    }
    
    const stepX = size.x / gridWidth;
    const stepZ = size.z / gridHeight;
    
    const relativeX = worldX - bbox.min.x;
    const relativeZ = worldZ - bbox.min.z;
    
    const gridX = Math.floor(relativeX / stepX);
    const gridZ = Math.floor(relativeZ / stepZ);
    
    // Check if the grid position is within valid bounds
    if (gridX < 0 || gridX >= gridWidth || gridZ < 0 || gridZ >= gridHeight) {
      return null; // Outside terrain bounds
    }
    
    const cellCenterX = bbox.min.x + (gridX + 0.5) * stepX;
    const cellCenterZ = bbox.min.z + (gridZ + 0.5) * stepZ;
    
    return {
      gridX,
      gridZ,
      centerX: cellCenterX,
      centerZ: cellCenterZ,
      stepX,
      stepZ
    };
  }, [terrainMetadata]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (terrainModelRef.current && sceneRef.current) {
        sceneRef.current.remove(terrainModelRef.current);
        disposeObject(terrainModelRef.current);
        terrainModelRef.current = null;
      }
      
      if (gridHelperRef.current && sceneRef.current) {
        sceneRef.current.remove(gridHelperRef.current);
        disposeObject(gridHelperRef.current);
        gridHelperRef.current = null;
      }
    };
  }, [sceneRef]);

  return {
    terrainModelRef,
    isLoading,
    error,
    isGridVisible,
    terrainMetadata,
    scaledSize,
    scaledCenter,
    calculateGridPosition
  };
}; 