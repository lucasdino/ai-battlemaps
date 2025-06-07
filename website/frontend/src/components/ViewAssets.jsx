import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import THEME from '../theme';
import ModelViewer from './ModelViewer';
import AssetCreationPopup from './AssetCreationPopup';
import DefaultAssetConfigViewer from './DefaultAssetConfigViewer';
import CONFIG from '../config';
import styles, { getMobileStyles, MOBILE_BREAKPOINT, SINGLE_COLUMN_BREAKPOINT } from '../styles/ViewAssets';
import addGlobalAnimations from '../styles/animations';
import { Button } from './common';
import NotificationToast from './ViewAssets/NotificationToast';
import Pagination from './ViewAssets/Pagination';
import TabHeader from './ViewAssets/TabHeader';
import AssetGrid from './ViewAssets/AssetGrid';
import GenerationProgress from './ViewAssets/GenerationProgress';
import ModelPreviewPanel from './ViewAssets/ModelPreviewPanel';
import useResponsiveGrid from '../hooks/useResponsiveGrid';
import { formatFileName, getModelUrl, processAssetData, isValidAsset, formatVideoMapping } from '../utils/assetHelpers';
import { fetchFromApi, uploadFile, updateModel, updateDefaultAssetConfig } from '../utils/api';
import { ASSETS_PER_PAGE, GENERATION_STEPS, PROGRESS_STEPS, MAJOR_STEPS } from '../utils/constants';

// Note: Constants moved to utils/constants.js

const ViewAssets = () => {
  // Initialize global animations
  useEffect(() => {
    const cleanup = addGlobalAnimations();
    return cleanup;
  }, []);
  
  // Main state
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isCreationPopupOpen, setIsCreationPopupOpen] = useState(false);
  const fileInputRef = useRef(null);
  const gridContainerRef = useRef(null);
  const [generationStatus, setGenerationStatus] = useState({
    inProgress: false,
    error: false,
    success: false,
    errorMessage: '',
    message: '',
    progress: 0,
    previewUrl: null,
    assetName: null
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Tab state for switching between My Models and Default Models
  const [activeTab, setActiveTab] = useState('my_models'); // 'my_models' or 'default_models'
  const [defaultAssets, setDefaultAssets] = useState([]);
  const [defaultAssetsLoading, setDefaultAssetsLoading] = useState(false);
  const [defaultAssetsError, setDefaultAssetsError] = useState(null);
  const [defaultCurrentPage, setDefaultCurrentPage] = useState(1);
  const [defaultTotalPages, setDefaultTotalPages] = useState(1);

  // 2. Add a state to track the current sub-step index
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Track number of progress messages
  const [progressCount, setProgressCount] = useState(0);
  // Track video preview and temp model for action steps
  const [actionVideoUrl, setActionVideoUrl] = useState(null);
  const [actionModel, setActionModel] = useState(null);

  // Default asset configuration state
  const [isConfigViewerOpen, setIsConfigViewerOpen] = useState(false);
  const [assetToConfigured, setAssetToConfigured] = useState(null);

  // Use responsive grid hook (after all state declarations)
  const { assetsPerPage, gridMaxHeight } = useResponsiveGrid(
    gridContainerRef, 
    assets.length, 
    defaultAssets.length, 
    activeTab
  );

  // Window width tracking for mobile styles
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get responsive styles
  const mobileStyles = getMobileStyles(windowWidth);

  // Note: Notification timeout logic moved to NotificationToast component

  // Note: API functions moved to utils/api.js

  // Fetch videos for models
  const fetchModelVideos = useCallback(async () => {
    try {
      const data = await fetchFromApi(
        CONFIG.API.ENDPOINTS.MODELS.VIDEOS, 
        'Failed to fetch model videos'
      );
      
      if (data && data.videoMapping) {
        const formattedMapping = formatVideoMapping(data.videoMapping);
        
        setAssets(prevAssets => 
          prevAssets.map(asset => {
            if (asset.id && formattedMapping[asset.id]) {
              return {
                ...asset,
                videoUrl: formattedMapping[asset.id]
              };
            }
            return asset;
          })
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Fetch default assets
  const fetchDefaultAssets = useCallback(async (page = 1) => {
    setDefaultAssetsLoading(true);
    setDefaultAssetsError(null);
    
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DUNGEON_ASSETS.DEFAULTS}?page=${page}&limit=${assetsPerPage}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch default assets: ${response.status}`);
      }
      
      const data = await response.json();
      setDefaultAssets(data.assets || []);
      setDefaultTotalPages(data.pagination?.totalPages || Math.max(1, Math.ceil((data.totalCount || (data.assets || []).length) / assetsPerPage)));
      setDefaultCurrentPage(data.pagination?.currentPage || page);
      
      // Generate icons for assets that don't have them in metadata
      const assetsNeedingIcons = (data.assets || []).filter(asset => !asset.icon || !asset.icon.path);
      
      if (assetsNeedingIcons.length > 0) {
        console.log(`Found ${assetsNeedingIcons.length} assets needing icons`);
        
        // Generate icons sequentially to avoid overwhelming the server
        for (const asset of assetsNeedingIcons) {
          try {
            console.log(`Generating icon for ${asset.name} (${asset.id})`);
            const generateResponse = await fetch(
              `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DUNGEON_ASSETS.ICON.replace(':id', asset.id)}`
            );
            if (generateResponse.ok) {
              const iconData = await generateResponse.json();
              console.log(`✓ Generated icon for ${asset.name}: ${iconData.iconPath}`);
            } else {
              const errorData = await generateResponse.json().catch(() => ({}));
              console.warn(`✗ Failed to generate icon for ${asset.name}: ${errorData.error || 'Unknown error'}`);
            }
            
            // Small delay between requests to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.warn(`✗ Error generating icon for ${asset.name}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching default assets:', err);
      setDefaultAssetsError(err.message);
    } finally {
      setDefaultAssetsLoading(false);
    }
  }, [assetsPerPage]);

  // Update default asset metadata
  const updateDefaultAsset = useCallback(async (assetId, updates) => {
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DUNGEON_ASSETS.DEFAULTS}/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update asset: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update the asset in the local state
      setDefaultAssets(prevAssets => 
        prevAssets.map(asset => 
          asset.id === assetId ? { ...asset, ...updates } : asset
        )
      );
      
      return data;
    } catch (err) {
      console.error('Error updating default asset:', err);
      throw err;
    }
  }, []);

  // Fetch all assets
  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const data = await fetchFromApi(
        CONFIG.API.ENDPOINTS.MODELS.BASE, 
        'Failed to fetch assets'
      );
      
      if (!data) {
        setIsLoading(false);
        return;
      }
      
      // Process the assets array
      const assetArray = Array.isArray(data.models) ? data.models : (Array.isArray(data) ? data : []);
      
      if (assetArray.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // Filter out invalid assets and process them
      const validAssets = assetArray.filter(isValidAsset);
      const mapped = validAssets.map(processAssetData);
      
      setAssets(mapped);
      
      // Update pagination
      setTotalPages(data.totalPages || Math.max(1, Math.ceil(mapped.length / assetsPerPage)));
      if (data.currentPage) setCurrentPage(data.currentPage);
      
      setError(null);
      
      // Ensure all assets have icons by requesting them if needed
      mapped.forEach(async (asset) => {
        if (!asset.thumbnailUrl) {
          try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/api/models/${asset.id}/icon`);
            if (response.ok) {
              const iconData = await response.json();
              if (iconData.iconPath) {
                setAssets(prevAssets => 
                  prevAssets.map(a => 
                    a.id === asset.id 
                      ? { ...a, thumbnailUrl: iconData.iconPath } 
                      : a
                  )
                );
              }
            }
          } catch (err) {
            // Ignore any errors - this is just a background icon generation
          }
        }
      });
    } catch (err) {
      console.error('Error in fetchAssets:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [assetsPerPage]);

  // Initial fetch and reconnection attempts
  useEffect(() => {
    fetchAssets();
    
    // Retry connection if error occurred
    const interval = error ? setInterval(fetchAssets, 5000) : null;
    return () => interval && clearInterval(interval);
  }, [fetchAssets]);
  
  // Fetch model videos separately
  useEffect(() => {
    if (!isLoading && assets.length > 0) {
      fetchModelVideos();
    }
    // Only run when assets are first loaded, not on every assets change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchModelVideos, isLoading]);

  // Fetch default assets when tab changes to default models
  useEffect(() => {
    if (activeTab === 'default_models') {
      fetchDefaultAssets(defaultCurrentPage);
    }
  }, [activeTab, defaultCurrentPage, fetchDefaultAssets]);

  // Note: Utility functions moved to utils/assetHelpers.js

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setNotification({ type: 'error', message: 'Only .glb files are allowed.' });
      return;
    }

    try {
      const data = await uploadFile(file, CONFIG.API.ENDPOINTS.MODELS.UPLOAD);
      
      // After successful upload, trigger icon generation
      if (data.id) {
        try {
          // Request icon generation
          const iconResponse = await fetch(`${CONFIG.API.BASE_URL}/api/models/${data.id}/icon`);
          if (!iconResponse.ok) {
            console.warn('Icon generation failed:', await iconResponse.text());
          }
        } catch (iconErr) {
          console.warn('Error generating icon:', iconErr);
        }
      }
      
      setNotification({ type: 'success', message: `Successfully uploaded ${file.name}!` });
      setCurrentPage(1);
      fetchAssets();
    } catch (err) {
      console.error('Error uploading asset:', err);
      setNotification({ type: 'error', message: err.message });
    }
  }, [fetchAssets]);

  // Dropzone integration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: acceptedFiles => handleFileUpload(acceptedFiles[0]),
    accept: {
      'model/gltf-binary': ['.glb']
    },
    multiple: false
  });

  // Handle model loading error
  const handleModelError = (errorMessage) => {
    setNotification({ type: 'error', message: `Failed to load model: ${errorMessage}` });
    setTimeout(() => {
      setSelectedModel(null);
    }, 3000);
  };

  // Handle model loading error for the action model preview
  const handleActionModelError = (errorMessage) => {
    setNotification({ type: 'error', message: `Failed to load preview model: ${errorMessage}` });
    setActionModel(null); // Clear the action model on error
  };

  // Handle asset creation events from AssetCreationPopup
  const handleAssetCreated = (info) => {
    if (info.formData && info.apiUrl) {
      setProgressCount(0); // Reset on new generation
      setActionVideoUrl(null);
      setActionModel(null);
      initiateAssetGeneration(info);
      return;
    }
    // Handle 'action' status messages
    if (info.status === 'action') {
      let isMounted = true;
      setTimeout(() => { isMounted = false; }, 10000); // 10s safety window
      if (info.step === 'video saved' && info.modelId) {
        setActionModel(null); // Clear model preview immediately
        // Use modelId from backend for video fetch
        fetch(`${CONFIG.API.BASE_URL}/api/models/${info.modelId}/video`)
          .then(res => res.json())
          .then(data => {
            if (isMounted && data.videoPath) {
              // Ensure the video path is absolute or correctly prefixed
              let videoSrc = data.videoPath;
              if (!videoSrc.startsWith('http') && !videoSrc.startsWith('/')) {
                videoSrc = `/${videoSrc}`;
              }
              if (!videoSrc.startsWith('http')) {
                videoSrc = `${CONFIG.API.BASE_URL}${videoSrc}`;
              }
              setActionVideoUrl(videoSrc);
            }
          })
          .catch(err => {
            console.error("Error fetching action video:", err);
            if (isMounted) setNotification({ type: 'error', message: 'Could not load preview video.' });
          });
      } else if (info.step === 'glb saved' && info.modelId) {
        setActionVideoUrl(null); // Clear video preview immediately
        // Use modelId from backend for model fetch
        fetch(`${CONFIG.API.BASE_URL}/api/models/${info.modelId}`)
          .then(res => res.json())
          .then(data => {
            if (isMounted && data) { // Check if data is not null/undefined
              // Extract and normalize video URL if present
              let vUrl = data.video?.path || data.video;
              if (vUrl && !vUrl.startsWith('http') && !vUrl.startsWith('/')) {
                vUrl = `/${vUrl}`;
              }
              setActionModel({
                id: data.id, // Ensure id is present
                name: data.name,
                displayName: data.displayName || data.name, // Use displayName if available
                videoUrl: vUrl,
                ...data
              });
            } else if (isMounted) {
              throw new Error("Model data not found after GLB saved.");
            }
          })
          .catch(err => {
            console.error("Error fetching action model:", err);
            if (isMounted) {
              setNotification({ type: 'error', message: 'Could not load preview model.' });
              setActionModel(null); // Ensure model is cleared on error
            }
          });
      } else if (info.step === 'thumbnail saved' && info.modelId) {
        // Refresh asset list to include new thumbnail
        fetchAssets();
      }
      
      // For action status, update UI state but don't show the message in progress indicator
      setGenerationStatus(prev => ({
        ...prev,
        inProgress: info.inProgress || (!info.success && !info.error),
        error: !!info.error,
        success: !!info.success,
        errorMessage: info.errorMessage || '',
        // Don't update message for action status
        progress: info.progress !== undefined ? info.progress : prev.progress,
        previewUrl: info.videoUrl || prev.previewUrl,
        assetName: info.assetName || prev.assetName,
        status: info.status,
        step: info.step
      }));
      return; // Exit early for action status
    }
    
    // If this is a progress message, increment the count (5)
    console.log('info', info);
    if (info.inProgress && info.message && info.error !== true && info.success !== true && info.status === 'progress') {
      setProgressCount(prev => Math.min(prev + 1, 5));
    }
    
    setGenerationStatus(prev => ({
      ...prev,
      inProgress: info.inProgress || (!info.success && !info.error),
      error: !!info.error,
      success: !!info.success,
      errorMessage: info.errorMessage || '',
      message: info.message || '',
      progress: info.progress !== undefined ? info.progress : prev.progress,
      previewUrl: info.videoUrl || prev.previewUrl,
      assetName: info.assetName || prev.assetName,
      status: info.status,
      step: info.step
    }));
    
    if (info.success) {
      setNotification({ type: 'success', message: '3D Asset generated successfully!' });
      setIsCreationPopupOpen(false);
    } else if (info.error) {
      setNotification({ type: 'error', message: info.errorMessage || 'Asset generation failed' });
    }
  };

  // Streaming handler: just update progress/message as they come in
  const initiateAssetGeneration = async ({ formData, apiUrl, abortController }) => {
    try {
      const response = await fetch(apiUrl, { method: 'POST', body: formData, signal: abortController?.signal });
      if (!response.ok) throw new Error((await response.json()).message || response.statusText);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Helper to extract and handle any complete JSON objects in the buffer
      const processBuffer = () => {
        const matches = buffer.match(/\{[\s\S]*?\}/g);
        if (matches) {
          let lastIndex = 0;
          matches.forEach(jsonStr => {
            const startIdx = buffer.indexOf(jsonStr, lastIndex);
            lastIndex = startIdx + jsonStr.length;
            try {
              const data = JSON.parse(jsonStr);
              handleAssetCreated({
                inProgress: data.status === 'progress',
                error: data.status === 'error',
                success: data.status === 'complete',
                errorMessage: data.status === 'error' ? data.message : '',
                message: data.message,
                progress: undefined, // progress is now handled by progressCount
                videoUrl: data.videoUrl,
                assetName: data.glbFile,
                status: data.status,
                step: data.step,
                modelId: data.modelId || data.glbFile
              });
            } catch {}
          });
          // Keep any trailing partial JSON in the buffer
          buffer = buffer.slice(lastIndex);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Decode any remaining bytes and break
          buffer += decoder.decode(value || new Uint8Array(), { stream: false });
          processBuffer();
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }
    } catch (error) {
      handleAssetCreated({ error: true, errorMessage: error.message });
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (activeTab === 'my_models') {
      if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    } else {
      if (newPage >= 1 && newPage <= defaultTotalPages && newPage !== defaultCurrentPage) {
        setDefaultCurrentPage(newPage);
      }
    }
  };

  // Handle tab switching
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSelectedModel(null); // Clear selected model when switching tabs
  };

  // Handle default asset name/description changes
  const handleDefaultAssetUpdate = async (assetId, field, value) => {
    try {
      const updates = { [field]: value };
      await updateDefaultAsset(assetId, updates);
      setNotification({ type: 'success', message: `${field === 'name' ? 'Name' : 'Description'} updated successfully!` });
    } catch (err) {
      setNotification({ type: 'error', message: `Failed to update ${field}: ${err.message}` });
    }
  };

  // Handle opening default asset configuration
  const handleOpenAssetConfig = useCallback((asset) => {
    setAssetToConfigured(asset);
    setIsConfigViewerOpen(true);
  }, []);

  // Handle closing default asset configuration
  const handleCloseAssetConfig = useCallback(() => {
    setIsConfigViewerOpen(false);
    setAssetToConfigured(null);
  }, []);

  // Handle saving default asset configuration
  const handleSaveAssetConfig = useCallback(async (config) => {
    if (!assetToConfigured) return;

    try {
      const updates = {
        defaultScale: config.scale,
        defaultRotation: config.rotation
      };
      
      await updateDefaultAsset(assetToConfigured.id, updates);
      
      // Update the selected model if it's the same asset
      if (selectedModel && selectedModel.id === assetToConfigured.id) {
        setSelectedModel(prev => ({
          ...prev,
          defaultScale: config.scale,
          defaultRotation: config.rotation
        }));
      }
      
      setNotification({ type: 'success', message: 'Asset configuration saved successfully!' });
      handleCloseAssetConfig();
    } catch (err) {
      setNotification({ type: 'error', message: `Failed to save configuration: ${err.message}` });
    }
  }, [assetToConfigured, updateDefaultAsset, selectedModel, handleCloseAssetConfig]);

  // Handle default asset configuration error
  const handleAssetConfigError = useCallback((errorMessage) => {
    setNotification({ type: 'error', message: errorMessage });
  }, []);

  // Get paginated assets
  const getPaginatedAssets = useMemo(() => {
    if (Array.isArray(assets)) {
      const startIndex = (currentPage - 1) * assetsPerPage;
      const endIndex = startIndex + assetsPerPage;
      return assets.slice(startIndex, endIndex);
    }
    return [];
  }, [assets, currentPage, assetsPerPage]);

  // Get paginated assets for default models
  const getPaginatedDefaultAssets = useMemo(() => {
    if (Array.isArray(defaultAssets)) {
      // If we have server-side pagination (indicated by defaultTotalPages > 1), return all assets
      // Otherwise, handle client-side pagination
      if (defaultTotalPages > 1) {
        return defaultAssets; // Server already returned the correct page
      } else {
        const startIndex = (defaultCurrentPage - 1) * assetsPerPage;
        const endIndex = startIndex + assetsPerPage;
        return defaultAssets.slice(startIndex, endIndex);
      }
    }
    return [];
  }, [defaultAssets, defaultCurrentPage, assetsPerPage, defaultTotalPages]);

  // Update model name
  const handleModelNameChange = useCallback(async (newName) => {
    if (!selectedModel) return;
    
    try {
      await updateModel(selectedModel.id, { name: newName });
      
      // Update the local state
      setAssets(prevAssets => 
        prevAssets.map(asset => {
          if (asset.id === selectedModel.id) {
            return { 
              ...asset, 
              name: newName,
              displayName: newName
            };
          }
          return asset;
        })
      );
      
      // Update selected model
      setSelectedModel(prev => ({
        ...prev,
        name: newName,
        displayName: newName
      }));
      
      setNotification({ type: 'success', message: 'Model name updated' });
    } catch (err) {
      console.error('Error updating model name:', err);
      setNotification({ type: 'error', message: err.message });
    }
  }, [selectedModel]);

  // Note: Thumbnail rendering functions moved to AssetGridItem component

  // Show generated asset in preview when generation completes
  useEffect(() => {
    if (generationStatus.success && generationStatus.assetName) {
      // We won't immediately show the model to prevent buttons flashing before model loads
      // First clear any existing temporary models
      setActionModel(null);
      
      // Fetch the generated model and show in viewer & asset list
      fetch(`${CONFIG.API.BASE_URL}/api/models/${generationStatus.assetName}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            const modelObj = {
              id: data.id,
              name: data.name,
              displayName: data.displayName || data.name,
              videoUrl: (() => {
                let v = data.video?.path || data.video;
                if (v && !v.startsWith('http') && !v.startsWith('/')) {
                  v = `/${v}`;
                }
                return v;
              })(),
              ...data
            };
            // Refresh assets list so thumbnail/video show up asap
            fetchAssets();
            
            // Short delay before showing the model to ensure a smoother transition
            setTimeout(() => {
              setSelectedModel(modelObj); // Show in main viewer after a delay
            }, 300);
          }
        })
        .catch(err => {
          console.error('Error fetching generated model:', err);
          setNotification({ type: 'error', message: 'Could not load generated asset.' });
        });
    }
  }, [generationStatus.success, generationStatus.assetName, fetchAssets]);

  // Update pagination when assets or assetsPerPage changes
  useEffect(() => {
    if (activeTab === 'my_models') {
      setTotalPages(Math.max(1, Math.ceil(assets.length / assetsPerPage)));
    }
  }, [assets.length, assetsPerPage, activeTab]);

  // Separate effect for default assets pagination - only when not relying on server pagination
  useEffect(() => {
    if (activeTab === 'default_models' && defaultAssets.length > 0) {
      // Only update if we don't already have server-provided pagination info
      if (defaultTotalPages <= 1) {
        setDefaultTotalPages(Math.max(1, Math.ceil(defaultAssets.length / assetsPerPage)));
      }
    }
  }, [defaultAssets.length, assetsPerPage, activeTab, defaultTotalPages]);

  // Handle model deletion
  const handleModelDeleted = useCallback((modelId, message) => {
    // Remove the deleted model from assets list
    setAssets(prevAssets => prevAssets.filter(asset => asset.id !== modelId));
    
    // Clear the selected model
    setSelectedModel(null);
    
    // Show success notification
    setNotification({ type: 'success', message: message || 'Model deleted successfully' });
    
    // Refresh the asset list
    fetchAssets();
  }, [fetchAssets]);

  return (
    <div style={{...styles.container, ...mobileStyles.container}}>
      {/* Left panel - Visualization */}
      <div style={{...styles.visualizationPanel, ...mobileStyles.visualizationPanel}}>
        {/* Notification Toast */}
        <NotificationToast 
          notification={notification} 
          onHide={() => setNotification(null)} 
        />

        <ModelPreviewPanel
          isLoading={isLoading}
          generationStatus={generationStatus}
          selectedModel={selectedModel}
          assets={assets}
          progressCount={progressCount}
          actionVideoUrl={actionVideoUrl}
          actionModel={actionModel}
          onFileUpload={handleFileUpload}
          onModelError={handleModelError}
          onActionModelError={handleActionModelError}
          onModelNameChange={handleModelNameChange}
          onModelDeleted={handleModelDeleted}
          onOpenAssetConfig={handleOpenAssetConfig}
          onGenerationClose={() => {
            setGenerationStatus({ 
              inProgress: false, error: false, errorMessage: '', 
              message: '', progress: 0, previewUrl: null, assetName: null 
            });
            setActionVideoUrl(null);
            setActionModel(null);
          }}
          isDragActive={isDragActive}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
        />
      </div>

      {/* Right panel - Asset list */}
      <div style={{...styles.assetListPanel, ...mobileStyles.assetListPanel}} data-panel="asset-list">
        {/* Tab Headers */}
        <TabHeader 
          activeTab={activeTab} 
          onTabSwitch={handleTabSwitch} 
        />
        
        {/* Pagination controls */}
        {activeTab === 'my_models' && assets.length > 0 && !error && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
        {activeTab === 'default_models' && !defaultAssetsLoading && !defaultAssetsError && defaultTotalPages > 1 && (
          <Pagination
            currentPage={defaultCurrentPage}
            totalPages={defaultTotalPages}
            onPageChange={handlePageChange}
          />
        )}
        
        {/* Scrollable asset grid */}
        <div style={styles.assetListContainer} ref={gridContainerRef}>
          {activeTab === 'my_models' ? (
            <AssetGrid
              assets={getPaginatedAssets}
              selectedModel={selectedModel}
              onAssetSelect={setSelectedModel}
              error={error}
              emptyMessage="No models available"
              gridMaxHeight={gridMaxHeight}
              mobileStyles={mobileStyles}
              isDefault={false}
            />
          ) : (
            <AssetGrid
              assets={getPaginatedDefaultAssets}
              selectedModel={selectedModel}
              onAssetSelect={(asset) => setSelectedModel({
                ...asset,
                isDefault: true,
                displayName: asset.name,
                modelUrl: asset.modelPath?.startsWith('/') 
                  ? `${CONFIG.API.BASE_URL}${asset.modelPath}`
                  : `${CONFIG.API.BASE_URL}/${asset.modelPath}`
              })}
              loading={defaultAssetsLoading ? 'Loading default assets...' : null}
              error={defaultAssetsError}
              emptyMessage="No default models available"
              gridMaxHeight={gridMaxHeight}
              mobileStyles={mobileStyles}
              isDefault={true}
            />
          )}
        </div>
        
        {/* Button Container with Upload and Create buttons - Only for My Models */}
        {activeTab === 'my_models' && (
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
              <span>Upload Model</span>
              <span>+</span>
            </Button>
            
            <Button
              variant="primary"
              onClick={() => setIsCreationPopupOpen(true)}
              style={{ width: '100%', padding: '12px 24px', fontWeight: 'bold', fontSize: '1rem' }}
            >
              Create 3D Asset
            </Button>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".glb,model/gltf-binary"
          onChange={(e) => handleFileUpload(e.target.files[0])}
        />
        
        {/* Asset Creation Popup */}
        <AssetCreationPopup 
          isOpen={isCreationPopupOpen}
          onClose={() => setIsCreationPopupOpen(false)}
          onAssetCreated={handleAssetCreated}
          generationStatus={generationStatus}
        />
      </div>

      {/* Default Asset Configuration Viewer */}
      {isConfigViewerOpen && assetToConfigured && (
        <DefaultAssetConfigViewer
          asset={assetToConfigured}
          onSave={handleSaveAssetConfig}
          onClose={handleCloseAssetConfig}
          onError={handleAssetConfigError}
        />
      )}
    </div>
  );
};

export default ViewAssets;
