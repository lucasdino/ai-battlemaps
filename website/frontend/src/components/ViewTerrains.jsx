import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three'; // Only if THREE is directly used in this component, otherwise remove.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'; // For type hints or direct use
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // For type hints or direct use

import TerrainViewer from './TerrainViewer';
import TerrainUploadPopup from './TerrainUploadPopup';
import { Button } from './common'; // Assuming Button is a custom component
import styles, { getMobileStyles, KEYFRAMES } from '../styles/ViewTerrains';
import CONFIG from '../config';
import THEME from '../theme'; // <-- ADDED IMPORT

// Define a list of available assets for placement
// TODO: Fetch this from an API or a more dynamic config
// const DEFAULT_AVAILABLE_ASSETS = [
//   { name: 'Wizard Dragon', url: '/assets/3d_models/wizard_dragon_1747769405175_a8ea3534.glb', scale: { x: 0.5, y: 0.5, z: 0.5 }, rotation: { x: 0, y: 0, z: 0 } },
//   { name: 'Funko Pop Swanson', url: '/assets/3d_models/funkopop_swanson_1747771324935_d59c54e0.glb', scale: { x: 0.3, y: 0.3, z: 0.3 }, rotation: { x: 0, y: 0, z: 0 } },
//   { name: 'Edited Asset', url: '/assets/3d_models/edited-1747771432094-386786_1747771466019_fe396e4e.glb', scale: { x: 1, y: 1, z: 1 }, rotation: { x: 0, y: 0, z: 0 } },
//   // Add more assets here as needed
// ];

// Helper function to generate a display-friendly name from a model ID (filename)
const cleanModelIdForDisplay = (originalName, modelId) => {
  // PERMANENTLY IGNORE originalName as backend metadata for name is not reliable
  // if (originalName && originalName.trim() !== '') {
  //   return originalName.trim();
  // }

  let name = modelId.replace(/\.glb$/i, ''); // Remove .glb extension
  let prefix = '';

  if (name.toLowerCase().startsWith('generated-')) {
    prefix = 'Generated';
    name = name.substring(10);
  } else if (name.toLowerCase().startsWith('edited-')) {
    prefix = 'Edited';
    name = name.substring(7);
  }

  const parts = name.split(/[-_]/);
  const keptParts = [];

  for (const part of parts) {
    if (!part) continue; // Skip empty parts that can result from multiple separators

    // Rule 1: Discard 13-digit timestamps
    if (/^\d{13}$/.test(part)) {
      continue;
    }

    // Rule 2: Discard common hex hash patterns (typically 6, 8, or 10 chars long)
    // To qualify as a hash, it must contain at least one a-f/A-F character.
    if ((/^[a-fA-F0-9]{6}$/.test(part) || /^[a-fA-F0-9]{8}$/.test(part) || /^[a-fA-F0-9]{10}$/.test(part)) && /[a-fA-F]/i.test(part)) {
      // Exception for a few common short words that might be all hex characters
      const commonHexWords = ['cafe', 'face', 'dead', 'beef', 'feed', 'babe']; 
      if (!commonHexWords.includes(part.toLowerCase())) {
        continue;
      }
    }
    
    // Rule 3: Discard other long purely numeric sequences (likely generic IDs)
    // (e.g., "386786" from an example, or other multipart IDs that aren't timestamps)
    if (/^\d{6,}$/.test(part) && part.length !== 13) { // ensure not a 13-digit timestamp (already handled)
        continue;
    }

    // If the part survived all checks, keep it
    keptParts.push(part);
  }

  let cleanedName = keptParts.join(' ').trim(); // Join and trim any leading/trailing spaces from preserved parts

  if (cleanedName && cleanedName.length > 0) {
    cleanedName = cleanedName.toLowerCase().split(' ')
        .filter(Boolean) // Filter out empty strings from multiple spaces after join
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  } else {
    cleanedName = ''; // Ensure name is empty string if nothing is left
  }

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
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hoveredTerrain, setHoveredTerrain] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layoutSaveStatus, setLayoutSaveStatus] = useState(null); // 'saving', 'success', 'error', null
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const terrainsPerPage = 12;
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [terrainDimensions, setTerrainDimensions] = useState({
    width: 10,
    height: 10,
    depth: 0.1
  });
  
  // Asset placement state
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loadingModelsError, setLoadingModelsError] = useState(null);
  const [currentSelectedAssetForPlacement, setCurrentSelectedAssetForPlacement] = useState(null);
  const [placedAssetsOnTerrain, setPlacedAssetsOnTerrain] = useState([]);
  const [currentAssetPlacementRotationY, setCurrentAssetPlacementRotationY] = useState(0); // Degrees
  const [agentPlacementConfig, setAgentPlacementConfig] = useState([]);
  const [terrainViewerMetrics, setTerrainViewerMetrics] = useState(null);
  const [globallySelectedPlacedAssetId, setGloballySelectedPlacedAssetId] = useState(null);
  const [transformMode, setTransformMode] = useState('translate'); // New state for transform mode
  
  // Refs
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const layoutFileInputRef = useRef(null);

  // Get responsive styles
  const mobileStyles = getMobileStyles(windowWidth);
  const combinedStyles = { ...styles, ...mobileStyles };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show message with auto-hide
  const showMessage = useCallback((text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // Memoized onError handler for TerrainViewer
  const handleTerrainViewerError = useCallback((errorText) => {
    showMessage(errorText, 'error');
  }, [showMessage]);

  // Callback from TerrainViewer to update local state with terrain's actual dimensions and center
  const handleTerrainMetricsUpdate = useCallback((metrics) => {
    setTerrainViewerMetrics(metrics);
  }, []); // No dependencies, setTerrainViewerMetrics is stable

  // Fetch terrains from API
  const fetchTerrains = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch terrains: ${response.status}`);
      }
      
      const data = await response.json();
      setTerrains(data.terrains || []);
      
      // Auto-select first terrain if none selected
      if (data.terrains && data.terrains.length > 0 && !selectedTerrain) {
        setSelectedTerrain(data.terrains[0]);
      }
    } catch (err) {
      console.error('Error fetching terrains:', err);
      setError(err.message);
      showMessage('Failed to load terrains', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTerrain]);

  // Fetch available 3D models for asset placement
  const fetchAvailableModels = useCallback(async () => {
    try {
      // Consider adding a loading state for models if needed
      setLoadingModelsError(null);
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MODELS.BASE}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      const data = await response.json();
      if (data.models && Array.isArray(data.models)) {
        const processedModels = data.models.map(model => {
          const modelName = cleanModelIdForDisplay(model.name, model.id);
          return {
            id: model.id, // Original filename, used as unique ID
            name: modelName, // Cleaned name for display
            url: `/assets/3d_models/${model.id}`,
            iconUrl: model.icon,
            scale: model.metadata?.scale || { x: 1.0, y: 1.0, z: 1.0 },
            rotation: model.metadata?.rotation || { x: 0, y: 0, z: 0 },
          };
        });
        setAvailableAssets(processedModels);
        // Initialize agentPlacementConfig based on available assets
        setAgentPlacementConfig(processedModels.map(asset => ({ ...asset, count: 0 })));
      } else {
        setAvailableAssets([]);
        setAgentPlacementConfig([]);
      }
    } catch (err) {
      console.error('Error fetching available models:', err);
      setLoadingModelsError(err.message);
      showMessage('Failed to load available 3D models for placement', 'error');
      setAvailableAssets([]); // Clear or set to default on error
      setAgentPlacementConfig([]);
    }
  }, [showMessage]);

  // Initial load
  useEffect(() => {
    fetchTerrains();
    fetchAvailableModels();
  }, [fetchTerrains, fetchAvailableModels]);

  // Handle terrain selection
  const handleTerrainSelect = useCallback((terrain) => {
    setSelectedTerrain(terrain);
    setCurrentSelectedAssetForPlacement(null);
    setCurrentAssetPlacementRotationY(0); 
    setTerrainViewerMetrics(null); 
    setGloballySelectedPlacedAssetId(null);
    setTransformMode('translate'); // Reset transform mode on new terrain
    // Logic for setPlacedAssetsOnTerrain is now moved to a dedicated useEffect below
  }, []);

  // Effect to initialize/reset placedAssetsOnTerrain when the selectedTerrain genuinely changes
  useEffect(() => {
    if (selectedTerrain) {
      if (selectedTerrain.placedAssets && Array.isArray(selectedTerrain.placedAssets)) {
        setPlacedAssetsOnTerrain(selectedTerrain.placedAssets);
      } else {
        setPlacedAssetsOnTerrain([]);
      }
    } else {
      // No terrain selected, clear assets
      setPlacedAssetsOnTerrain([]);
    }
  }, [selectedTerrain]); // React to changes in the selectedTerrain object reference

  // Handle terrain name change
  const handleTerrainNameChange = useCallback(async (newName) => {
    if (!selectedTerrain || !newName.trim()) return;

    try {
      const response = await fetch(
        `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${selectedTerrain.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update terrain name: ${response.status}`);
      }

      // Update local state
      const updatedTerrain = { ...selectedTerrain, name: newName.trim() };
      setSelectedTerrain(updatedTerrain);
      setTerrains(prev => prev.map(t => t.id === selectedTerrain.id ? updatedTerrain : t));
      
      showMessage('Terrain name updated successfully');
    } catch (err) {
      console.error('Error updating terrain name:', err);
      showMessage('Failed to update terrain name', 'error');
    }
  }, [selectedTerrain, showMessage]);

  // Handle terrain deletion
  const handleTerrainDeleted = useCallback(async (terrainId, message) => {
    // Remove from local state
    setTerrains(prev => prev.filter(t => t.id !== terrainId));
    
    // Select another terrain if the deleted one was selected
    if (selectedTerrain && selectedTerrain.id === terrainId) {
      const remainingTerrains = terrains.filter(t => t.id !== terrainId);
      setSelectedTerrain(remainingTerrains.length > 0 ? remainingTerrains[0] : null);
    }
    
    showMessage(message || 'Terrain deleted successfully');
  }, [selectedTerrain, terrains, showMessage]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('Please select a valid image file (PNG, JPG, JPEG, WEBP)', 'error');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('File size must be less than 10MB', 'error');
      return;
    }

    setUploadFile(file);
    setShowUploadForm(true);
  }, [showMessage]);

  // Process terrain upload
  const processTerrainUpload = useCallback(async () => {
    if (!uploadFile) return;

    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('terrain', uploadFile);
      formData.append('width', terrainDimensions.width.toString());
      formData.append('height', terrainDimensions.height.toString());
      formData.append('depth', terrainDimensions.depth.toString());

      const response = await fetch(
        `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.UPLOAD}`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Refresh terrains list
      await fetchTerrains();
      
      // Find and select the newly uploaded terrain
      const updatedTerrains = await fetchTerrainsForSelection();
      const newTerrain = updatedTerrains.find(t => t.id === result.id);
      
      if (newTerrain) {
        setSelectedTerrain(newTerrain);
      }
      
      showMessage(result.message || 'Terrain uploaded and processed successfully');
      
      // Reset upload state
      setUploadFile(null);
      setShowUploadForm(false);
      setTerrainDimensions({ width: 10, height: 10, depth: 0.1 });
      
    } catch (err) {
      console.error('Error uploading terrain:', err);
      showMessage(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadFile, terrainDimensions, fetchTerrains, showMessage]);

  // Helper function to fetch terrains and return them
  const fetchTerrainsForSelection = useCallback(async () => {
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch terrains: ${response.status}`);
      }
      
      const data = await response.json();
      return data.terrains || [];
    } catch (err) {
      console.error('Error fetching terrains for selection:', err);
      return [];
    }
  }, []);

  // Handle upload popup cancel
  const handleUploadCancel = useCallback(() => {
    if (!isProcessing) {
      setUploadFile(null);
      setShowUploadForm(false);
      setTerrainDimensions({ width: 10, height: 10, depth: 0.1 });
    }
  }, [isProcessing]);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Pagination calculations
  const totalPages = Math.ceil(terrains.length / terrainsPerPage);
  const startIndex = (currentPage - 1) * terrainsPerPage;
  const endIndex = startIndex + terrainsPerPage;
  const currentTerrains = terrains.slice(startIndex, endIndex);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Render terrain thumbnail
  const renderTerrainThumbnail = useCallback((terrain) => {
    if (terrain.icon) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              ...combinedStyles.terrainThumbnail,
              backgroundImage: `url(${CONFIG.API.BASE_URL}${terrain.icon})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div style={{ fontSize: '12px', color: '#fff', marginTop: '4px', textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%' }}>
            {terrain.name}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={combinedStyles.terrainThumbnail}>
          🗺️
        </div>
        <div style={{ fontSize: '12px', color: '#fff', marginTop: '4px', textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%' }}>
          {terrain.name}
        </div>
      </div>
    );
  }, [combinedStyles.terrainThumbnail]);

  // Add CSS keyframes to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${KEYFRAMES.FADE_IN} {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes ${KEYFRAMES.SPIN} {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes ${KEYFRAMES.THUMBNAIL_SPIN} {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Handle manual asset placement callback from TerrainViewer
  const handleManualAssetPlaced = useCallback((newAssetData) => {
    setPlacedAssetsOnTerrain(prev => [...prev, { ...newAssetData, id: newAssetData.id || `manual-${Date.now()}` }]);
    // setCurrentSelectedAssetForPlacement(null); // Do not automatically exit placement mode
    setGloballySelectedPlacedAssetId(null); // Deselect any placed asset when placing a new one
  }, []);

  // Handle agent-based asset placement
  const handleAgentPlaceAssets = useCallback(() => {
    if (!selectedTerrain) {
      showMessage('Please select a terrain first.', 'error');
      return;
    }
    // Use terrainViewerMetrics if available, otherwise fallback to metadata or defaults
    const currentTerrainWidth = terrainViewerMetrics?.width || selectedTerrain.metadata?.dimensions?.width || 20;
    const currentTerrainDepth = terrainViewerMetrics?.depth || selectedTerrain.metadata?.dimensions?.depth || 20;
    const terrainCenterX = terrainViewerMetrics?.centerX || 0;
    const terrainCenterZ = terrainViewerMetrics?.centerZ || 0; // Y center is not needed for XZ plane placement

    if (agentPlacementConfig.every(assetConfig => assetConfig.count === 0)) {
      showMessage('Please specify counts for assets to be placed by the agent.', 'info');
      return;
    }

    const newAgentAssets = [];
    
    const maxAttemptsPerAsset = 20; // Increased attempts slightly

    agentPlacementConfig.forEach(assetConfig => {
      if (assetConfig.count > 0) {
        const candidateAssetRadius = getAssetRadius(assetConfig); // Get radius for the asset type we are trying to place

        for (let i = 0; i < assetConfig.count; i++) {
          let position = null;
          let attempts = 0;

          while (attempts < maxAttemptsPerAsset) {
            const candidateX = terrainCenterX + (Math.random() - 0.5) * currentTerrainWidth;
            const candidateZ = terrainCenterZ + (Math.random() - 0.5) * currentTerrainDepth;
            let tooClose = false;

            // Check against other assets already placed in this NEW batch
            for (const placed of newAgentAssets) {
              const placedAssetRadius = getAssetRadius(placed);
              const requiredSeparation = candidateAssetRadius + placedAssetRadius;
              const minDistanceSqDynamic = requiredSeparation * requiredSeparation;
              
              const dx = candidateX - placed.position.x;
              const dz = candidateZ - placed.position.z;
              if ((dx * dx + dz * dz) < minDistanceSqDynamic) {
                tooClose = true;
                break;
              }
            }

            if (tooClose) {
              attempts++;
              continue; // Try a new random spot
            }

            // Check against assets already on terrain (from previous placements)
            for (const existing of placedAssetsOnTerrain) {
              const existingAssetRadius = getAssetRadius(existing);
              const requiredSeparation = candidateAssetRadius + existingAssetRadius;
              const minDistanceSqDynamic = requiredSeparation * requiredSeparation;

              const dx = candidateX - existing.position.x;
              const dz = candidateZ - existing.position.z;
              if ((dx * dx + dz * dz) < minDistanceSqDynamic) {
                tooClose = true;
                break;
              }
            }

            if (!tooClose) {
              position = { x: candidateX, y: 0, z: candidateZ };
              break;
            }
            attempts++;
          }

          if (position) {
            newAgentAssets.push({
              // Spread assetConfig properties and then override/add specific instance data
              ...assetConfig, // Includes name, scale, rotation (defaults)
              id: `agent-${assetConfig.id}-${Date.now()}-${i}`, // Unique instance ID
              modelUrl: assetConfig.url, // Ensure modelUrl is populated from assetConfig.url
              position,
              // Allow specific agent-placed rotation to be random if not set, or use default
              rotation: assetConfig.rotation || { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
              instance: null, // GLTF instance is null until loaded by TerrainViewer
            });
          } else {
            console.warn(`Agent could not find a suitable spot for ${assetConfig.name} (instance ${i + 1}) after ${maxAttemptsPerAsset} attempts.`);
          }
        }
      }
    });

    if (newAgentAssets.length > 0) {
      setPlacedAssetsOnTerrain(prev => {
        const updatedAssets = [...prev, ...newAgentAssets];
        return updatedAssets;
      });
      showMessage(`${newAgentAssets.length} assets placed by agent.`, 'success');
      setGloballySelectedPlacedAssetId(null); // Deselect any placed asset after agent places new ones
    } else if (agentPlacementConfig.some(ac => ac.count > 0)) {
      showMessage('Agent could not place the requested assets due to spacing constraints or lack of valid spots.', 'warning');
    }
  }, [selectedTerrain, agentPlacementConfig, showMessage, placedAssetsOnTerrain, terrainViewerMetrics]); // <-- ADDED terrainViewerMetrics to dependencies

  // Handle saving the current asset layout for the selected terrain
  const handleSaveLayout = useCallback(async () => {
    if (!selectedTerrain || !selectedTerrain.id) {
      showMessage('Please select a terrain first.', 'error');
      return;
    }
    setLayoutSaveStatus('saving');
    try {
      // We need to strip the 'instance' field before saving if it exists
      const assetsToSave = placedAssetsOnTerrain.map(({ instance, ...rest }) => rest);

      const response = await fetch(
        `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.BASE}/${selectedTerrain.id}/layout`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placedAssets: assetsToSave })
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save layout' }));
        throw new Error(errorData.error || 'Failed to save layout');
      }
      setLayoutSaveStatus('success');
      showMessage('Terrain layout saved successfully!', 'success');
      // Optionally, re-fetch terrain data to ensure UI consistency if backend modifies data upon save
      // fetchTerrains(); 
    } catch (err) {
      setLayoutSaveStatus('error');
      showMessage(err.message || 'Error saving terrain layout.', 'error');
      console.error('Error saving layout:', err);
    }
    setTimeout(() => setLayoutSaveStatus(null), 3000); // Clear status after 3s
  }, [selectedTerrain, placedAssetsOnTerrain, showMessage]);

  // Button to clear all placed assets for the current terrain
  const handleClearAllPlacedAssets = useCallback(() => {
    setPlacedAssetsOnTerrain([]);
    setGloballySelectedPlacedAssetId(null); // <-- RESET on clear all
    showMessage('All placed assets cleared for this terrain.', 'info');
  }, [showMessage]);

  // Handle downloading the current asset layout
  const handleDownloadLayout = useCallback(() => {
    if (!selectedTerrain) {
      showMessage('Please select a terrain first.', 'error');
      return;
    }
    if (placedAssetsOnTerrain.length === 0) {
      showMessage('No assets to download.', 'info');
      return;
    }

    try {
      const assetsToDownload = placedAssetsOnTerrain.map(({ instance, ...rest }) => rest);
      const jsonString = JSON.stringify(assetsToDownload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      const terrainName = selectedTerrain.name.replace(/[^a-z0-9_\-\.]/gi, '_') || 'terrain';
      link.download = `${terrainName}_layout.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      showMessage('Layout downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading layout:', error);
      showMessage('Failed to download layout.', 'error');
    }
  }, [selectedTerrain, placedAssetsOnTerrain, showMessage]);

  // Handle selecting a layout file to upload
  const handleLayoutFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.json')) {
      showMessage('Please select a valid JSON layout file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target.result;
        const loadedAssets = JSON.parse(jsonContent);

        if (!Array.isArray(loadedAssets)) {
          throw new Error('Layout file is not a valid array of assets.');
        }

        // Basic validation of asset structure (can be more comprehensive)
        for (const asset of loadedAssets) {
          if (
            typeof asset.id !== 'string' ||
            typeof asset.modelUrl !== 'string' ||
            typeof asset.name !== 'string' || // Added name check
            typeof asset.position !== 'object' ||
            typeof asset.rotation !== 'object' ||
            typeof asset.scale !== 'object'
          ) {
            throw new Error('Invalid asset structure in layout file.');
          }
        }
        // Ensure instances are null as they are live objects
        const assetsToSet = loadedAssets.map(asset => ({ ...asset, instance: null }));
        setPlacedAssetsOnTerrain(assetsToSet);
        showMessage('Layout loaded successfully! Click \'Save Layout\' to persist changes.', 'success');
      } catch (error) {
        console.error('Error loading layout file:', error);
        showMessage(`Failed to load layout: ${error.message}`, 'error');
      }
    };
    reader.onerror = () => {
      showMessage('Error reading layout file.', 'error');
    };
    reader.readAsText(file);

    // Reset file input to allow uploading the same file again if needed
    event.target.value = null;
  };

  // Callback from TerrainViewer when a placed asset is selected or deselected
  const handlePlacedAssetSelectionChange = useCallback((assetId) => {
    setGloballySelectedPlacedAssetId(assetId);
  }, []);

  // Callback from TerrainViewer when a placed asset has been moved
  const handlePlacedAssetMoved = useCallback((assetId, newPosition, newRotation, newScale) => {
    setPlacedAssetsOnTerrain(prevAssets =>
      prevAssets.map(asset => {
        if (asset.id === assetId) {
          // newPosition is a THREE.Vector3
          // newRotation is a THREE.Euler
          // newScale is a THREE.Vector3
          return {
            ...asset,
            position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
            // Storing Euler angles; ensure your loading logic expects this or convert as needed
            rotation: { x: newRotation.x, y: newRotation.y, z: newRotation.z },
            scale: { x: newScale.x, y: newScale.y, z: newScale.z },
          };
        }
        return asset;
      })
    );
    // No immediate save, user should click "Save Layout"
  }, []);

  // Handle deleting the currently selected placed asset
  const handleDeleteSelectedAsset = useCallback(() => {
    if (!globallySelectedPlacedAssetId) {
      showMessage('No asset selected to delete.', 'warning');
      return;
    }
    setPlacedAssetsOnTerrain(prev => prev.filter(asset => asset.id !== globallySelectedPlacedAssetId));
    setGloballySelectedPlacedAssetId(null); // Deselect after deletion
    showMessage('Selected asset deleted.', 'success');
  }, [globallySelectedPlacedAssetId, showMessage]);

  // Handle Escape key for deselecting placement asset AND selected placed asset, and T,R,S for transform modes
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        let escapeHandled = false;
        if (currentSelectedAssetForPlacement) {
          setCurrentSelectedAssetForPlacement(null);
          escapeHandled = true;
        }
        if (globallySelectedPlacedAssetId) {
          setGloballySelectedPlacedAssetId(null); // Deselect asset
          escapeHandled = true;
        }
        if (escapeHandled) {
          event.preventDefault(); // Prevent other escape actions if we handled it.
        }
      } else if (globallySelectedPlacedAssetId) { 
        let newMode = null;
        if (event.key.toLowerCase() === 't') {
          newMode = 'translate';
        } else if (event.key.toLowerCase() === 'r') {
          newMode = 'rotate';
        } else if (event.key.toLowerCase() === 's') {
          newMode = 'scale';
        }
        
        if (newMode && newMode !== transformMode) {
          setTransformMode(newMode);
          event.preventDefault(); // Prevent typing 't', 'r', 's' into other inputs
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSelectedAssetForPlacement, globallySelectedPlacedAssetId, transformMode]);

  return (
    <div style={combinedStyles.container}>
      {/* Message Display */}
      {message && (
        <div style={{
          ...combinedStyles.message,
          ...(messageType === 'error' ? combinedStyles.error : combinedStyles.success)
        }}>
          {message}
        </div>
      )}

      {/* Left Panel - Terrain Visualization */}
      <div style={combinedStyles.visualizationPanel}>
        {selectedTerrain ? (
          <div style={combinedStyles.terrainViewer}>
            <TerrainViewer
              key={selectedTerrain ? selectedTerrain.id : 'no-terrain'}
              terrainUrl={selectedTerrain ? `${CONFIG.API.BASE_URL}${selectedTerrain.url}` : null}
              terrainName={selectedTerrain ? selectedTerrain.name : null}
              terrainId={selectedTerrain ? selectedTerrain.id : null}
              onError={handleTerrainViewerError}
              onTerrainNameChange={(newName) => handleTerrainNameChange(selectedTerrain.id, newName)}
              onTerrainDeleted={handleTerrainDeleted}
              onTerrainMetricsUpdate={handleTerrainMetricsUpdate}
              scale={selectedTerrain?.metadata?.scale}
              selectedAsset={currentSelectedAssetForPlacement ? { ...currentSelectedAssetForPlacement, rotation: { x: 0, y: THREE.MathUtils.degToRad(currentAssetPlacementRotationY), z: 0 } } : null}
              onAssetPlaced={handleManualAssetPlaced}
              rawPlacedAssets={placedAssetsOnTerrain}
              onPlacedAssetSelected={handlePlacedAssetSelectionChange}
              onPlacedAssetMoved={handlePlacedAssetMoved}
              transformMode={transformMode}
              onTransformModeChange={setTransformMode}
              onPlacedAssetDeleted={handleDeleteSelectedAsset}
              floorPlanUrl="/assets/dungeon/floor_plan/plan1.json"
            />
          </div>
        ) : (
          <div style={combinedStyles.loadingContainer}>
            {isLoading ? (
              <>
                <div style={combinedStyles.spinner} />
                <div style={combinedStyles.loadingText}>Loading terrains...</div>
              </>
            ) : (
              <div
                ref={dropzoneRef}
                style={combinedStyles.dropzone}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={combinedStyles.uploadIcon}>🗺️</div>
                <div style={combinedStyles.dropzoneText}>
                  Upload Terrain Image
                </div>
                <div style={combinedStyles.dropzoneSubText}>
                  Drag & drop an image here, or click to select
                </div>
                <div style={combinedStyles.dropzoneSubText}>
                  Supports PNG, JPG, JPEG, WEBP (max 10MB)
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Terrain List */}
      <div style={combinedStyles.terrainListPanel}>
        <h2 style={combinedStyles.terrainListHeader}>Terrains</h2>
        
        {/* Processing Indicator - only show if processing and no popup */}
        {isProcessing && !showUploadForm && (
          <div style={combinedStyles.processingContainer}>
            <div style={combinedStyles.processingSpinner} />
            <div style={combinedStyles.processingText}>
              Processing terrain image...
              <br />
              This may take a few moments.
            </div>
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={combinedStyles.paginationControls}>
            <button
              style={{
                ...combinedStyles.pageButton,
                ...(currentPage === 1 ? combinedStyles.pageButtonDisabled : {})
              }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            
            <span style={combinedStyles.pageIndicator}>
              {currentPage} of {totalPages}
            </span>
            
            <button
              style={{
                ...combinedStyles.pageButton,
                ...(currentPage === totalPages ? combinedStyles.pageButtonDisabled : {})
              }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}

        {/* Terrain Grid */}
        <div style={combinedStyles.terrainListContainer}>
          <div style={combinedStyles.terrainGrid}>
            {currentTerrains.map((terrain) => (
              <div
                key={terrain.id}
                style={{
                  ...combinedStyles.terrainItem,
                  ...(selectedTerrain?.id === terrain.id ? combinedStyles.terrainItemSelected : {}),
                  ...(hoveredTerrain === terrain.id ? combinedStyles.terrainItemHover : {})
                }}
                onClick={() => handleTerrainSelect(terrain)}
                onMouseEnter={() => setHoveredTerrain(terrain.id)}
                onMouseLeave={() => setHoveredTerrain(null)}
              >
                {renderTerrainThumbnail(terrain)}
              </div>
            ))}
          </div>
        </div>

        {/* Upload Button */}
        <div style={combinedStyles.buttonContainer}>
          <button
            style={combinedStyles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isProcessing}
          >
            {isUploading ? 'Uploading...' : '+ Upload Terrain'}
          </button>
        </div>

        {/* Hidden File Input for Terrain Image*/}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
            }
            e.target.value = ''; // Reset input
          }}
        />

        {/* Hidden File Input for Layout JSON*/}
        <input
          ref={layoutFileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleLayoutFileSelect}
        />
      </div>

      {/* Upload Popup */}
      <TerrainUploadPopup
        isOpen={showUploadForm}
        uploadFile={uploadFile}
        terrainDimensions={terrainDimensions}
        setTerrainDimensions={setTerrainDimensions}
        onUpload={processTerrainUpload}
        onCancel={handleUploadCancel}
        isProcessing={isProcessing}
      />

      {/* Asset Placement Controls - Moved here for better layout with viewer */}
      {selectedTerrain && (
        <div style={combinedStyles.assetControlsContainer}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={combinedStyles.assetControlsTitle}>Place Assets</h3>
            {currentSelectedAssetForPlacement && (
              <Button 
                onClick={() => {
                  setCurrentSelectedAssetForPlacement(null);
                  showMessage('Asset placement cancelled', 'info');
                }}
                style={{...combinedStyles.actionButton, ...combinedStyles.cancelButton, padding: '5px 10px', fontSize: '12px'}}
              >
                Cancel Placement (Esc)
              </Button>
            )}
          </div>
          <div style={combinedStyles.assetSelection}>
            {availableAssets.map(asset => (
              <Button
                key={asset.url}
                onClick={() => {
                  // Ensure the selected asset object for placement has modelUrl
                  const assetToPlace = {
                    ...asset,
                    modelUrl: asset.url // Copy relative url to modelUrl
                  };
                  setCurrentSelectedAssetForPlacement(assetToPlace);
                  
                  // Set initial rotation from asset's default, or 0 if none
                  // Convert radians to degrees for the slider if stored in radians, or ensure consistency
                  let initialYRotationDegrees = 0;
                  if (asset.rotation?.y) {
                    // Assuming asset.rotation.y is in radians, convert to degrees
                    initialYRotationDegrees = THREE.MathUtils.radToDeg(asset.rotation.y);
                  }
                  setCurrentAssetPlacementRotationY(initialYRotationDegrees);
                }}
                style={{
                  ...combinedStyles.assetButton,
                  ...(currentSelectedAssetForPlacement && currentSelectedAssetForPlacement.url === asset.url ? combinedStyles.assetButtonSelected : {})
                }}
                title={`Select ${asset.name} to place manually`}
              >
                {asset.name}
              </Button>
            ))}
          </div>
          <div style={combinedStyles.assetActionButtons}>
            {/* New UI for per-asset agent placement counts */}
            <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px', border: combinedStyles.border, padding: '5px', borderRadius: '4px' }}>
              {agentPlacementConfig.map((assetConfig, index) => (
                <div key={assetConfig.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <label htmlFor={`agentCount-${assetConfig.id}`} title={assetConfig.name} style={{ color: combinedStyles.infoText.color, fontSize: '12px', marginRight: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
                    {assetConfig.name}:
                  </label>
                  <input
                    type="number"
                    id={`agentCount-${assetConfig.id}`}
                    value={assetConfig.count}
                    onChange={(e) => {
                      const newCount = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setAgentPlacementConfig(prevConfig =>
                        prevConfig.map(item =>
                          item.id === assetConfig.id ? { ...item, count: newCount } : item
                        )
                      );
                    }}
                    min="0"
                    max="20" // Reasonable max per asset type
                    style={{ width: '50px', padding: '3px', fontSize: '12px', textAlign: 'center', ...combinedStyles.inputFieldSmall }}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleAgentPlaceAssets} style={{...combinedStyles.actionButton }} disabled={!selectedTerrain}>
              Place by Agent
            </Button>
            <Button 
              onClick={handleSaveLayout} 
              style={combinedStyles.actionButton} 
              disabled={!selectedTerrain || layoutSaveStatus === 'saving'}
            >
              {layoutSaveStatus === 'saving' ? 'Saving...' : (layoutSaveStatus === 'success' ? 'Saved!' : 'Save Layout')}
            </Button>
            <Button onClick={handleDownloadLayout} style={combinedStyles.actionButton} disabled={!selectedTerrain || placedAssetsOnTerrain.length === 0}>
              Download Layout
            </Button>
            <Button onClick={() => layoutFileInputRef.current?.click()} style={combinedStyles.actionButton} disabled={!selectedTerrain}>
              Load Layout
            </Button>
            <Button onClick={handleClearAllPlacedAssets} style={{...combinedStyles.actionButton, ...combinedStyles.clearButton}} disabled={placedAssetsOnTerrain.length === 0}>
              Clear Placed Assets
            </Button>
            <Button 
                onClick={handleDeleteSelectedAsset} 
                style={{...combinedStyles.actionButton, backgroundColor: THEME.dangerButton, color: 'white'}} 
                disabled={!globallySelectedPlacedAssetId}
            >
                Delete Selected Asset
            </Button>
          </div>
           {currentSelectedAssetForPlacement && (
            <div style={{ marginTop: '15px' }}> {/* Container for selected info and slider */}
              <p style={combinedStyles.infoText}>Selected: {currentSelectedAssetForPlacement.name}. Click on terrain to place.</p>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="rotationSlider" style={{ color: combinedStyles.infoText.color, fontSize: '14px' }}>Rot Y:</label>
                <input 
                  type="range" 
                  id="rotationSlider"
                  min="0" 
                  max="360" 
                  step="1" 
                  value={currentAssetPlacementRotationY}
                  onChange={(e) => setCurrentAssetPlacementRotationY(parseFloat(e.target.value))}
                  style={{ flexGrow: 1 }}
                />
                <span style={{ color: combinedStyles.infoText.color, fontSize: '14px', minWidth: '40px', textAlign: 'right' }}>{currentAssetPlacementRotationY}°</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewTerrains; 