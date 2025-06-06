import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three'; // Only if THREE is directly used in this component, otherwise remove.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'; // For type hints or direct use
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // For type hints or direct use

import TerrainViewer from './TerrainViewer';
import TerrainUploadPopup from './TerrainUploadPopup';
import GenerateDungeonPopup from './GenerateDungeonPopup';
import { Button } from './common';
import styles, { getMobileStyles, KEYFRAMES } from '../styles/ViewTerrains';
import CONFIG from '../config';
import THEME from '../theme'; // <-- ADDED IMPORT

// Constants for grid item dimensions (4x ViewAssets size, single column)
const GRID_ITEM_HEIGHT = 220; // 4x the size of ViewAssets cards
const GRID_ITEM_WIDTH = 120;  // Full width (not used since single column)
const GRID_GAP = 12; // Gap between items

// Helper function to generate a display-friendly name from a model ID (filename)
const cleanModelIdForDisplay = (originalName, modelId) => {
  // PERMANENTLY IGNORE originalName as backend metadata for name is not reliable
  // if (originalName && originalName.trim() !== '') {
  //   return originalName.trim();
  // }

  let name = modelId.replace(/\.glb$/i, ''); // Remove .glb extension
  let prefix = '';

  // Check for common prefixes and extract them
  const prefixPatterns = [
    { pattern: /^edited-\d+-\d+_/, replacement: 'Edited' },
    { pattern: /^funkopop_/, replacement: 'Funko Pop' },
    { pattern: /^wizard_/, replacement: 'Wizard' },
    { pattern: /^dragon_/, replacement: 'Dragon' },
    { pattern: /^character_/, replacement: 'Character' },
    { pattern: /^weapon_/, replacement: 'Weapon' },
    { pattern: /^armor_/, replacement: 'Armor' },
    { pattern: /^building_/, replacement: 'Building' },
    { pattern: /^vehicle_/, replacement: 'Vehicle' },
    { pattern: /^creature_/, replacement: 'Creature' },
    { pattern: /^monster_/, replacement: 'Monster' },
    { pattern: /^npc_/, replacement: 'NPC' },
    { pattern: /^prop_/, replacement: 'Prop' },
    { pattern: /^environment_/, replacement: 'Environment' },
    { pattern: /^terrain_/, replacement: 'Terrain' },
    { pattern: /^dungeon_/, replacement: 'Dungeon' },
    { pattern: /^castle_/, replacement: 'Castle' },
    { pattern: /^forest_/, replacement: 'Forest' },
    { pattern: /^mountain_/, replacement: 'Mountain' },
    { pattern: /^cave_/, replacement: 'Cave' },
    { pattern: /^temple_/, replacement: 'Temple' },
    { pattern: /^tower_/, replacement: 'Tower' },
    { pattern: /^bridge_/, replacement: 'Bridge' },
    { pattern: /^gate_/, replacement: 'Gate' },
    { pattern: /^wall_/, replacement: 'Wall' },
    { pattern: /^door_/, replacement: 'Door' },
    { pattern: /^chest_/, replacement: 'Chest' },
    { pattern: /^table_/, replacement: 'Table' },
    { pattern: /^chair_/, replacement: 'Chair' },
    { pattern: /^bed_/, replacement: 'Bed' },
    { pattern: /^torch_/, replacement: 'Torch' },
    { pattern: /^candle_/, replacement: 'Candle' },
    { pattern: /^book_/, replacement: 'Book' },
    { pattern: /^scroll_/, replacement: 'Scroll' },
    { pattern: /^potion_/, replacement: 'Potion' },
    { pattern: /^gem_/, replacement: 'Gem' },
    { pattern: /^coin_/, replacement: 'Coin' },
    { pattern: /^key_/, replacement: 'Key' },
    { pattern: /^ring_/, replacement: 'Ring' },
    { pattern: /^amulet_/, replacement: 'Amulet' },
    { pattern: /^staff_/, replacement: 'Staff' },
    { pattern: /^wand_/, replacement: 'Wand' },
    { pattern: /^sword_/, replacement: 'Sword' },
    { pattern: /^axe_/, replacement: 'Axe' },
    { pattern: /^bow_/, replacement: 'Bow' },
    { pattern: /^arrow_/, replacement: 'Arrow' },
    { pattern: /^shield_/, replacement: 'Shield' },
    { pattern: /^helmet_/, replacement: 'Helmet' },
    { pattern: /^boots_/, replacement: 'Boots' },
    { pattern: /^gloves_/, replacement: 'Gloves' },
    { pattern: /^cloak_/, replacement: 'Cloak' },
    { pattern: /^robe_/, replacement: 'Robe' },
  ];

  // Apply prefix patterns
  for (const { pattern, replacement } of prefixPatterns) {
    if (pattern.test(name)) {
      name = name.replace(pattern, '');
      prefix = replacement;
      break;
    }
  }

  // Clean up the remaining name
  let cleanedName = name
    .replace(/_\d{13}_[a-f0-9]{8}$/, '') // Remove timestamp and hash suffix
    .replace(/_+/g, ' ') // Replace underscores with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Capitalize each word
  cleanedName = cleanedName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  if (prefix) {
    cleanedName = cleanedName === '' ? `${prefix} Model` : `${prefix} ${cleanedName}`;
  }
  
  return cleanedName.trim() === '' ? 'Unnamed Model' : cleanedName.trim();
};

// Helper function to estimate an asset's radius based on its scale
const getAssetRadius = (asset) => {
  if (!asset || !asset.scale) {
    return 0.5; // Default small radius if scale is not available
  }
  // Use the largest dimension on the XZ plane as an estimate of diameter
  const diameter = Math.max(asset.scale.x, asset.scale.z);
  return diameter * 0.5; // Radius (can be adjusted with a factor if needed, e.g., * 0.6 for more spacing)
};

const ViewTerrains = () => {
  // State management
  const [terrains, setTerrains] = useState([]);
  const [selectedTerrain, setSelectedTerrain] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showGeneratePopup, setShowGeneratePopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layoutSaveStatus, setLayoutSaveStatus] = useState(null);
  
  // Pagination state (matching ViewAssets)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [terrainsPerPage, setTerrainsPerPage] = useState(9);
  const gridContainerRef = useRef(null);
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [terrainDimensions, setTerrainDimensions] = useState({
    width: 10,
    height: 10,
    depth: 0.1
  });
  
  // NEW ARCHITECTURE: Terrain-keyed asset management
  const [terrainAssets, setTerrainAssets] = useState(new Map()); // Map<terrainId, Asset[]>
  const [globallySelectedPlacedAssetId, setGloballySelectedPlacedAssetId] = useState(null);
  const [transformMode, setTransformMode] = useState('translate');
  const [terrainViewerMetrics, setTerrainViewerMetrics] = useState(null);
  
  // Create a stable selected terrain object to prevent unnecessary re-renders
  const stableSelectedTerrain = useMemo(() => {
    if (!selectedTerrain) return null;
    
    // Find the terrain in the current terrains list to get any updates
    const updatedTerrain = terrains.find(terrain => terrain.id === selectedTerrain.id);
    
    // If we found an updated version, use it, otherwise keep the current selection
    // This prevents re-renders when pagination changes but the selected terrain hasn't actually changed
    return updatedTerrain || selectedTerrain;
  }, [selectedTerrain?.id, selectedTerrain?.name, selectedTerrain?.displayName, terrains]);
  
  // Refs for throttled saves on resize/rotation
  const throttleTimeoutRef = useRef(null);
  const pendingMoveUpdatesRef = useRef(new Map());
  
  // Refs
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const layoutFileInputRef = useRef(null);

  // Constants for grid item dimensions (4x ViewAssets size, single column)
  const GRID_ITEM_HEIGHT = 220;
  const GRID_ITEM_WIDTH = 120;
  const GRID_GAP = 12;

  // Get current terrain assets
  const currentTerrainAssets = useMemo(() => {
    if (!stableSelectedTerrain?.id) return [];
    return terrainAssets.get(stableSelectedTerrain.id) || [];
  }, [stableSelectedTerrain?.id, terrainAssets]);

  // Calculate terrains per page based on container size (single column layout)
  const calculateTerrainsPerPage = useCallback(() => {
    if (!gridContainerRef.current) return;

    const container = gridContainerRef.current;
    const containerHeight = container.clientHeight - (GRID_GAP * 2);

    // Single column layout - only calculate how many rows can fit
    const rowsPerPage = Math.max(1, Math.floor((containerHeight + GRID_GAP) / (GRID_ITEM_HEIGHT + GRID_GAP)));

    // Items per page is just the number of rows since we have 1 column
    const itemsPerPage = rowsPerPage;
    
    // Update terrains per page if it's different
    if (itemsPerPage !== terrainsPerPage) {
      setTerrainsPerPage(itemsPerPage);
      // Adjust current page if necessary to keep items in view
      const newTotalPages = Math.max(1, Math.ceil(terrains.length / itemsPerPage));
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    }
  }, [terrainsPerPage, terrains.length, currentPage]);

  // Recalculate on window resize or container size change (matching ViewAssets)
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      calculateTerrainsPerPage();
    };

    window.addEventListener('resize', handleResize);
    
    // Initial calculation
    calculateTerrainsPerPage();
    
    // Set up resize observer for container
    const resizeObserver = new ResizeObserver(calculateTerrainsPerPage);
    if (gridContainerRef.current) {
      resizeObserver.observe(gridContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [calculateTerrainsPerPage]);

  // Get responsive styles
  const mobileStyles = useMemo(() => getMobileStyles(windowWidth), [windowWidth]);

  // Clear notifications after timeout (matching ViewAssets)
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Show message helper
  const showMessage = useCallback((message, type = 'success') => {
    setNotification({ message, type });
  }, []);

  // Save specific assets to backend
  const saveTerrainAssetsToBackend = useCallback(async (terrainId, assets) => {
    try {
      console.log('💾 Saving assets to backend:', assets.length, 'assets for terrain:', terrainId);
      
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placedAssets: assets.map(asset => ({
            id: asset.id,
            modelUrl: asset.modelUrl,
            name: asset.name,
            position: asset.position,
            rotation: asset.rotation,
            scale: asset.scale
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save assets');
      }
      
      console.log('✅ Successfully saved assets to backend');
    } catch (error) {
      console.error('❌ Failed to save assets to backend:', error);
      showMessage(`Failed to save assets: ${error.message}`, 'error');
    }
  }, [showMessage]);

  // Immediate save function for events like placement and deletion (uses current state)
  const saveTerrainAssetsImmediately = useCallback(async (terrainId) => {
    const assets = terrainAssets.get(terrainId) || [];
    await saveTerrainAssetsToBackend(terrainId, assets);
  }, [terrainAssets, saveTerrainAssetsToBackend]);

  // Throttled save function for resize/rotation operations
  const saveTerrainAssetsThrottled = useCallback((terrainId) => {
    // Store the pending update
    pendingMoveUpdatesRef.current.set(terrainId, true);
    
    // Clear existing timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }
    
    // Set new timeout for 800ms (longer than debounced to allow for multiple adjustments)
    throttleTimeoutRef.current = setTimeout(async () => {
      const terrainsToUpdate = Array.from(pendingMoveUpdatesRef.current.keys());
      pendingMoveUpdatesRef.current.clear();
      
      // Save all pending terrain updates
      for (const tId of terrainsToUpdate) {
        await saveTerrainAssetsImmediately(tId);
      }
    }, 800);
  }, [saveTerrainAssetsImmediately]);

  // Load terrain assets from backend
  const loadTerrainAssets = useCallback(async (terrainId) => {
    if (!terrainId) return;
    
    console.log(`🔄 Loading assets for terrain: ${terrainId}`);
    
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch terrain metadata: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.placedAssets && Array.isArray(data.placedAssets)) {
        console.log(`✅ Loaded ${data.placedAssets.length} assets for terrain ${terrainId}`);
        setTerrainAssets(prev => new Map(prev.set(terrainId, data.placedAssets)));
      } else {
        console.log(`✅ No assets found for terrain ${terrainId}`);
        setTerrainAssets(prev => new Map(prev.set(terrainId, [])));
      }
    } catch (error) {
      console.error(`❌ Error loading assets for terrain ${terrainId}:`, error);
      setTerrainAssets(prev => new Map(prev.set(terrainId, [])));
    }
  }, []);

  // NEW: Load layout data for dungeon layouts
  const loadLayoutData = useCallback(async (layoutPath) => {
    if (!layoutPath) return null;
    
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${layoutPath}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch layout data: ${response.status}`);
      }

      const layoutData = await response.json();
      return layoutData;
    } catch (error) {
      console.error(`❌ Error loading layout data:`, error);
      return null;
    }
  }, []);

  // Fetch terrains with pagination
  const fetchTerrains = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.LIST}?page=${currentPage}&per_page=${terrainsPerPage}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch terrains: ${response.status}`);
      }

      const data = await response.json();
      
      // Process the terrains array - directly from terrain_metadata.json
      const terrainsArray = Array.isArray(data.terrains) ? data.terrains : [];
      
      // Map terrains with proper icon handling and layout data loading
      const terrainsData = await Promise.all(terrainsArray.map(async (terrain) => {
        let thumbnailUrl = null;
        let iconEmoji = null;
        let layoutData = null;
        
        if (terrain.icon) {
          // If icon starts with '/' it's a path to an image
          if (terrain.icon.startsWith('/')) {
            thumbnailUrl = terrain.icon;
          } 
          // If icon is a single character or emoji, treat as emoji
          else if (terrain.icon.length <= 4) {
            iconEmoji = terrain.icon;
          }
          // Otherwise it might be a filename or other string, default to emoji fallback
          else {
            iconEmoji = '🗺️';
          }
        } else {
          // Default fallback when no icon is provided
          iconEmoji = '🗺️';
        }

        // Load layout data if this is a dungeon layout
        if (terrain.isDungeonLayout && terrain.layoutPath) {
          layoutData = await loadLayoutData(terrain.layoutPath);
        }
        
        return {
          ...terrain,
          displayName: terrain.name || 'Unnamed Dungeon',
          thumbnailUrl,
          iconEmoji,
          layoutData,
          type: terrain.isDungeonLayout ? 'dungeon_layout' : 'terrain',
          layoutLoadError: terrain.isDungeonLayout && terrain.layoutPath && !layoutData
        };
      }));

      setTerrains(terrainsData);
      setTotalPages(data.total_pages || Math.max(1, Math.ceil(terrainsData.length / terrainsPerPage)));

    } catch (err) {
      console.error('Error fetching terrains:', err);
      setError('Failed to load dungeons. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, terrainsPerPage, loadLayoutData]);

  // Load terrain assets when terrain is selected
  useEffect(() => {
    if (stableSelectedTerrain?.id) {
      loadTerrainAssets(stableSelectedTerrain.id);
    }
  }, [stableSelectedTerrain?.id, loadTerrainAssets]);

  // Handle page change (matching ViewAssets)
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  }, [currentPage, totalPages]);

  // Since the backend already returns paginated data, we don't need to paginate again on the frontend
  const getPaginatedTerrains = useMemo(() => {
    return terrains; // terrains is already paginated by the backend
  }, [terrains]);

  // Render terrain thumbnail
  const renderTerrainThumbnail = (terrain) => {
    const thumbnailStyle = {
      width: '100%',
      height: '120px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      backgroundColor: '#2a2a2a',
      marginBottom: '8px',
      overflow: 'hidden',
    };

    if (terrain.thumbnailUrl) {
      return (
        <div style={thumbnailStyle}>
          <img
            src={`${CONFIG.API.BASE_URL}${terrain.thumbnailUrl}`}
            alt={terrain.displayName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
            onError={(e) => {
              console.error('Failed to load thumbnail:', terrain.thumbnailUrl);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ ...thumbnailStyle, display: 'none', fontSize: '48px' }}>
            {terrain.iconEmoji}
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ ...thumbnailStyle, fontSize: '48px' }}>
          {terrain.iconEmoji}
        </div>
      );
    }
  };

  // Fetch terrains on mount and pagination changes
  useEffect(() => {
    fetchTerrains();
  }, [fetchTerrains]);

  // Handle file upload
  const handleFileUpload = useCallback((file) => {
    if (file) {
      setUploadFile(file);
      setShowUploadForm(true);
    }
  }, []);

  // Terrain viewer error handler
  const handleTerrainViewerError = useCallback((error) => {
    showMessage(error, 'error');
  }, [showMessage]);

  // Handle terrain name change
  const handleTerrainNameChange = useCallback(async (terrainId, newName) => {
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update terrain name');
      }

      // Update the terrain in our state
      setTerrains(prev => prev.map(terrain => 
        terrain.id === terrainId 
          ? { ...terrain, name: newName, displayName: newName }
          : terrain
      ));

      // Update selected terrain if it's the one being renamed
      if (selectedTerrain && selectedTerrain.id === terrainId) {
        setSelectedTerrain(prev => ({ ...prev, name: newName, displayName: newName }));
      }

      showMessage('Terrain name updated successfully!');
    } catch (error) {
      console.error('Error updating terrain name:', error);
      throw error; // Re-throw so TerrainViewer can handle it
    }
  }, [selectedTerrain, showMessage]);

  // Handle terrain deletion
  const handleTerrainDeleted = useCallback(async (terrainId) => {
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${terrainId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete terrain');
      }

      // Remove from terrains list
      setTerrains(prev => prev.filter(terrain => terrain.id !== terrainId));
      
      // Clear terrain assets
      setTerrainAssets(prev => {
        const newMap = new Map(prev);
        newMap.delete(terrainId);
        return newMap;
      });

      // Clear selection if this terrain was selected
      if (selectedTerrain && selectedTerrain.id === terrainId) {
        setSelectedTerrain(null);
        setGloballySelectedPlacedAssetId(null);
      }

      showMessage('Terrain deleted successfully!');
      
      // Refresh the terrain list to update pagination
      await fetchTerrains();

    } catch (error) {
      console.error('Error deleting terrain:', error);
      throw error; // Re-throw so TerrainViewer can handle it
    }
  }, [selectedTerrain, showMessage, fetchTerrains]);

  // Handle terrain metrics update
  const handleTerrainMetricsUpdate = useCallback((metrics) => {
    setTerrainViewerMetrics(metrics);
  }, []);

  // Handle asset placement
  const handleAssetPlaced = useCallback((newAssetData, terrainId) => {
    console.log('🏠 ViewTerrains.handleAssetPlaced called:', newAssetData.name, 'for terrain:', terrainId);
    
    if (!terrainId) {
      console.warn('🏠 No terrainId provided to handleAssetPlaced');
      return;
    }
    
    setTerrainAssets(prev => {
      const newMap = new Map(prev);
      const currentAssets = newMap.get(terrainId) || [];
      const updatedAssets = [...currentAssets, newAssetData];
      newMap.set(terrainId, updatedAssets);
      console.log('🏠 Updated terrain assets, new count:', updatedAssets.length);
      
      // Save immediately using the updated assets directly
      console.log('🏠 Saving updated assets to backend immediately');
      setTimeout(() => {
        saveTerrainAssetsToBackend(terrainId, updatedAssets);
      }, 50);
      
      return newMap;
    });
  }, []);

  // Handle asset moved (includes rotation and scaling)
  const handleAssetMoved = useCallback((assetId, position, rotation, scale, terrainId) => {
    if (!terrainId) return;
    
    setTerrainAssets(prev => {
      const newMap = new Map(prev);
      const currentAssets = newMap.get(terrainId) || [];
      const updatedAssets = currentAssets.map(asset => 
        asset.id === assetId 
          ? { ...asset, position, rotation, scale }
          : asset
      );
      newMap.set(terrainId, updatedAssets);
      return newMap;
    });
    
    // Use throttled save for move/resize/rotation events
    saveTerrainAssetsThrottled(terrainId);
  }, [saveTerrainAssetsThrottled]);

  // Handle asset deletion
  const handleAssetDeleted = useCallback((assetId, terrainId) => {
    if (!terrainId) return;
    
    setTerrainAssets(prev => {
      const newMap = new Map(prev);
      const currentAssets = newMap.get(terrainId) || [];
      const updatedAssets = currentAssets.filter(asset => asset.id !== assetId);
      newMap.set(terrainId, updatedAssets);
      return newMap;
    });
    
    // Clear selection if this asset was selected
    if (globallySelectedPlacedAssetId === assetId) {
      setGloballySelectedPlacedAssetId(null);
    }
    
    // Save immediately for deletion events
    setTimeout(() => saveTerrainAssetsImmediately(terrainId), 100);
    
    showMessage('Asset deleted successfully');
  }, [globallySelectedPlacedAssetId, saveTerrainAssetsImmediately, showMessage]);

  // Handle asset selection
  const handleAssetSelected = useCallback((assetId) => {
    setGloballySelectedPlacedAssetId(assetId);
  }, []);

  // Upload processing function
  const processTerrainUpload = useCallback(async (terrainName, gridScale) => {
    if (!uploadFile) {
      showMessage('No file selected for upload', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('terrain', uploadFile);
      formData.append('width', terrainDimensions.width.toString());
      formData.append('height', terrainDimensions.height.toString());
      formData.append('depth', terrainDimensions.depth.toString());
      
      // Add terrain name if provided
      if (terrainName && terrainName.trim()) {
        formData.append('name', terrainName.trim());
      }
      
      // Add grid scale if provided
      if (gridScale !== undefined) {
        formData.append('gridScale', gridScale.toString());
      }
      
      // Upload the terrain
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.UPLOAD}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload terrain');
      }

      const result = await response.json();
      
      // Success - refresh the terrain list and close popup
      await fetchTerrains();
      setShowUploadForm(false);
      setUploadFile(null);
      // Reset the file input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showMessage('Terrain uploaded successfully!');
      
    } catch (error) {
      console.error('Error uploading terrain:', error);
      showMessage(error.message || 'Failed to upload terrain', 'error');
      // Reset the file input value on error too
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsProcessing(false);
    }
  }, [uploadFile, terrainDimensions, showMessage, fetchTerrains]);

  // Handle upload popup cancel
  const handleUploadCancel = useCallback(() => {
    if (!isProcessing) {
      setShowUploadForm(false);
      setUploadFile(null);
      // Reset the file input value
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Reset dimensions to default
      setTerrainDimensions({
        width: 10,
        height: 10,
        depth: 0.1
      });
    }
  }, [isProcessing, setTerrainDimensions]);

  // Cleanup throttled save timeouts on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* Left panel - Visualization */}
      <div style={styles.visualizationPanel}>
        {/* Notification message */}
        {notification && (
        <div style={{
            ...styles.message, 
            ...(notification.type === 'error' ? styles.error : styles.success),
            position: 'absolute',
            top: '15px',
            right: '15px',
            left: 'auto',
            transform: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            maxWidth: '300px'
          }}>
            {notification.message}
        </div>
      )}

        {stableSelectedTerrain ? (
          <TerrainViewer
            key={`terrain-${stableSelectedTerrain.id}`}
            terrainUrl={stableSelectedTerrain.url}
            terrainName={stableSelectedTerrain.name}
            terrainId={stableSelectedTerrain.id}
            onError={handleTerrainViewerError}
            onTerrainNameChange={handleTerrainNameChange}
            onTerrainDeleted={handleTerrainDeleted}
            onTerrainMetricsUpdate={handleTerrainMetricsUpdate}
            hideTerrainControls={selectedTerrain.isNone}
            showGrid={true}
            placedAssets={currentTerrainAssets}
            onAssetPlaced={handleAssetPlaced}
            onAssetMoved={handleAssetMoved}
            onAssetDeleted={handleAssetDeleted}
            onAssetSelected={handleAssetSelected}
            selectedAssetId={globallySelectedPlacedAssetId}
            transformMode={transformMode}
            onTransformModeChange={setTransformMode}
            floorPlan={stableSelectedTerrain.layoutData}
            isDungeonLayout={stableSelectedTerrain.type === 'dungeon_layout'}
            layoutLoadError={stableSelectedTerrain.layoutLoadError}
            placedDungeons={currentTerrainAssets.length > 0}
          />
        ) : (
          <div 
            style={styles.dropzone}
            ref={dropzoneRef}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files);
              const imageFile = files.find(file => file.type.startsWith('image/'));
              if (imageFile) {
                handleFileUpload(imageFile);
              } else {
                showMessage('Please drop a valid image file', 'error');
              }
            }}
          >
            <div style={styles.uploadIcon}>📤</div>
            <p style={styles.dropzoneText}>
              {terrains.length > 0 ? "Click a dungeon or upload here" : "Upload some dungeons here!"}
            </p>
            <p style={styles.dropzoneSubText}>
              Drag & drop an image file or click to browse
            </p>
          </div>
        )}
        {/* Only show loading spinner if there is no selected terrain and we are loading */}
        {isLoading && !stableSelectedTerrain && (
          <div style={{
            ...styles.loadingContainer,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 50,
            pointerEvents: 'none',
          }}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading dungeons...</p>
          </div>
        )}
      </div>

      {/* Right panel - Dungeon list */}
      <div style={styles.terrainListPanel}>
        <h3 style={styles.terrainListHeader}>Dungeons</h3>
        
        {/* Pagination controls */}
        {terrains.length > 0 && !error && (
          <div style={styles.paginationControls}>
            <Button 
              variant="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lt;
            </Button>
            <span style={styles.pageIndicator}>
              {currentPage} / {totalPages}
            </span>
            <Button 
              variant="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              &gt;
            </Button>
          </div>
        )}

        {/* Scrollable dungeon grid */}
        <div style={styles.terrainListContainer} ref={gridContainerRef}>
          {error ? (
            <div style={{...styles.message, ...styles.error}}>
              {error}
            </div>
          ) : terrains.length > 0 ? (
            <div style={{...styles.terrainGrid, ...mobileStyles.terrainGrid}}>
              {getPaginatedTerrains.map((terrain) => (
              <div
                key={terrain.id}
                style={{
                    ...styles.terrainItem,
                    ...(selectedTerrain && selectedTerrain.id === terrain.id ? styles.terrainItemSelected : {})
                }}
                  onClick={() => setSelectedTerrain(terrain)}
              >
                {renderTerrainThumbnail(terrain)}
                  <div style={styles.terrainName}>
                    {terrain.displayName || terrain.name || '(no name)'}
                  </div>
              </div>
            ))}
          </div>
          ) : (
            <p style={{ color: THEME.textSecondary }}>No dungeons available</p>
          )}
        </div>

        {/* Button Container with Upload and Generate buttons */}
        <div style={styles.buttonContainer}>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current.click()}
            style={{ 
              width: '100%', 
              padding: '12px 24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Upload Image</span>
            <span>+</span>
          </Button>
          
          <Button
            variant="primary"
            onClick={() => setShowGeneratePopup(true)}
            style={{ width: '100%', padding: '12px 24px', fontWeight: 'bold', fontSize: '1rem' }}
          >
            Generate Dungeon
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files[0])}
        />
        
        {/* Upload Form Popup */}
      <TerrainUploadPopup
        isOpen={showUploadForm}
          onCancel={handleUploadCancel}
          onUpload={processTerrainUpload}
          isProcessing={isProcessing}
        uploadFile={uploadFile}
        terrainDimensions={terrainDimensions}
        setTerrainDimensions={setTerrainDimensions}
        />
        
        {/* Generate Dungeon Popup */}
        <GenerateDungeonPopup
          isOpen={showGeneratePopup}
          onClose={() => setShowGeneratePopup(false)}
          onDungeonGenerated={fetchTerrains}
                  />
                </div>
    </div>
  );
};

export default ViewTerrains; 