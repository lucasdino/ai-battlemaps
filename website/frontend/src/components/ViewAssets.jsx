import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import THEME from '../theme';
import ModelViewer from './ModelViewer';
import AssetCreationPopup from './AssetCreationPopup';
import CONFIG from '../config';
import styles, { getMobileStyles, MOBILE_BREAKPOINT, SINGLE_COLUMN_BREAKPOINT } from '../styles/ViewAssets';
import addGlobalAnimations from '../styles/animations';
import { Button } from './common';

// Constants
const ASSETS_PER_PAGE = 9; // Number of assets to display per page

// Constants for grid item dimensions (including gap)
const GRID_ITEM_HEIGHT = 96; // Base height of each grid item (matching styles)
const GRID_ITEM_WIDTH = 120;  // Base width of each grid item (matching styles)
const GRID_GAP = 12; // Gap between items (matching styles)

// Define the steps we'll use in this component
const GENERATION_STEPS = [
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'rendering_video', label: 'Rendering Video' },
  { id: 'generating_model', label: 'Generating 3D Asset' }
];

// 1. Define granular steps for progress tracking
const PROGRESS_STEPS = [
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'rendering_video', label: 'Rendering Video' },
  { id: 'generating_model', label: 'Generating 3D Asset' }
];
const MAJOR_STEPS = [
  { id: 'preprocessing', label: 'Preprocessing', count: 1 },
  { id: 'rendering_video', label: 'Rendering Video', count: 2 },
  { id: 'generating_model', label: 'Generating GLB', count: 2 },
];

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
  const [assetsPerPage, setAssetsPerPage] = useState(9);
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

  // 2. Add a state to track the current sub-step index
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Track number of progress messages
  const [progressCount, setProgressCount] = useState(0);
  // Track video preview and temp model for action steps
  const [actionVideoUrl, setActionVideoUrl] = useState(null);
  const [actionModel, setActionModel] = useState(null);

  // Calculate assets per page based on container size
  const calculateAssetsPerPage = useCallback(() => {
    if (!gridContainerRef.current) return;

    const container = gridContainerRef.current;
    const containerWidth = container.clientWidth - (GRID_GAP * 2); // Account for container padding
    const containerHeight = container.clientHeight - (GRID_GAP * 2); // Account for container padding

    // Calculate how many items can fit in a row, accounting for gaps
    const columnsPerRow = Math.max(1, Math.floor((containerWidth + GRID_GAP) / (GRID_ITEM_WIDTH + GRID_GAP)));
    
    // Calculate how many rows can fit, accounting for gaps
    const rowsPerPage = Math.max(1, Math.floor((containerHeight + GRID_GAP) / (GRID_ITEM_HEIGHT + GRID_GAP)));

    // Calculate total items that can fit
    const itemsPerPage = columnsPerRow * rowsPerPage;
    
    // Update assets per page if it's different
    if (itemsPerPage !== assetsPerPage) {
      setAssetsPerPage(itemsPerPage);
      // Adjust current page if necessary to keep items in view
      const newTotalPages = Math.max(1, Math.ceil(assets.length / itemsPerPage));
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    }
  }, [assetsPerPage, assets.length, currentPage]);

  // Recalculate on window resize or container size change
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      calculateAssetsPerPage();
    };

    window.addEventListener('resize', handleResize);
    
    // Initial calculation
    calculateAssetsPerPage();
    
    // Set up resize observer for container
    const resizeObserver = new ResizeObserver(calculateAssetsPerPage);
    if (gridContainerRef.current) {
      resizeObserver.observe(gridContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [calculateAssetsPerPage]);

  // Get responsive styles
  const mobileStyles = getMobileStyles(windowWidth);

  // Clear notifications after timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Generic API fetch function
  const fetchFromApi = useCallback(async (endpoint, errorMsg) => {
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`${errorMsg}:`, err);
      setError(`${errorMsg}: ${err.message}`);
      return null;
    }
  }, []);

  // Fetch videos for models
  const fetchModelVideos = useCallback(async () => {
    const data = await fetchFromApi(
      CONFIG.API.ENDPOINTS.MODELS.VIDEOS, 
      'Failed to fetch model videos'
    );
    
    if (data && data.videoMapping) {
      // Ensure all video paths are properly formatted and use asset_videos
      const formattedMapping = {};
      
      // Process each video mapping entry
      Object.entries(data.videoMapping).forEach(([modelId, videoPath]) => {
        // Make sure the path starts with a slash
        let normalizedPath = videoPath;
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = `/${normalizedPath}`;
        }
        
        // Make sure we're using asset_videos path
        if (!normalizedPath.includes('asset_videos')) {
          const filename = normalizedPath.split('/').pop();
          if (filename) {
            normalizedPath = `/assets/asset_videos/${filename}`;
          }
        }
        
        // Store the normalized path
        formattedMapping[modelId] = normalizedPath;
      });
      
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
  }, [fetchFromApi]);

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
      
      // Filter out invalid assets (must have a GLB file)
      const validAssets = assetArray.filter(asset => {
        const hasGlbFile = asset.id?.toLowerCase().endsWith('.glb') || 
                          asset.modelFile || 
                          asset.modelPath?.includes('.glb');
        
        if (!hasGlbFile) {
          console.warn(`Excluding invalid asset without GLB file:`, asset);
        }
        
        return hasGlbFile;
      });
      
      // Map assets with enhanced properties
      const mapped = validAssets.map(asset => {
        // Ensure icon paths are properly formatted
        let thumbnailUrl = asset.icon;
        if (thumbnailUrl && !thumbnailUrl.startsWith('http') && !thumbnailUrl.startsWith('/')) {
          thumbnailUrl = `/${thumbnailUrl}`;
        }
        
        // Ensure video paths are properly formatted
        let videoUrl = asset.video?.path || asset.video;
        if (videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('/')) {
          videoUrl = `/${videoUrl}`;
        }
        
        // Ensure we're not using asset_videos paths for icons
        if (thumbnailUrl && thumbnailUrl.includes('asset_videos')) {
          console.warn(`Found asset_videos in icon path: ${thumbnailUrl} - clearing it`);
          thumbnailUrl = null;
        }
        
        return {
          ...asset,
          id: asset.id || asset.name,
          displayName: asset.displayName || formatFileName(asset.name || asset.id),
          thumbnailUrl: thumbnailUrl,
          videoUrl: videoUrl,
          creationDate: asset.created
        };
      });
      
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
      setError(`Failed to fetch assets: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromApi, assetsPerPage]);

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

  // Format filename without extension
  const formatFileName = (fileName) => {
    return fileName.replace(/\.glb$/i, '').replace(/_[a-f0-9]{8}$/i, '');
  };

  // Get URL for model
  const getModelUrl = (asset) => {
    const modelId = asset.id || asset.name;
    const url = `${CONFIG.API.BASE_URL}/${CONFIG.API.ASSET_PATHS.MODELS}/${modelId}`;
    return url;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setNotification({ type: 'error', message: 'Only .glb files are allowed.' });
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('model', file);
    
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MODELS.UPLOAD}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed: ${response.status}`);
      }
      
      const data = await response.json();
      
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
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  // Get paginated assets
  const getPaginatedAssets = useMemo(() => {
    if (Array.isArray(assets)) {
      const startIndex = (currentPage - 1) * assetsPerPage;
      const endIndex = startIndex + assetsPerPage;
      return assets.slice(startIndex, endIndex);
    }
    return [];
  }, [assets, currentPage, assetsPerPage]);

  // Update model name
  const handleModelNameChange = useCallback(async (newName) => {
    if (!selectedModel) return;
    
    try {
      // Create update data
      const updateData = {
        name: newName
      };
      
      // Send update to backend
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MODELS.BASE}/${selectedModel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Update failed: ${response.status}`);
      }
      
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

  // Render asset thumbnail with explicit debugging
  const renderAssetThumbnail = (asset) => { 
    if (asset.thumbnailUrl) {
      let thumbnailSrc;
      if (asset.thumbnailUrl.startsWith('http') || asset.thumbnailUrl.startsWith('data:')) {
        thumbnailSrc = asset.thumbnailUrl;
      } else {
        // Ensure leading slash for relative paths
        thumbnailSrc = `${CONFIG.API.BASE_URL}${asset.thumbnailUrl.startsWith('/') ? '' : '/'}${asset.thumbnailUrl}`;
      }
      
      return (
        <div style={styles.assetThumbnail}>
          <img 
            src={thumbnailSrc}
            alt={asset.displayName || asset.name || asset.id}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.dataset.thumbnailError = 'true';
              e.target.onerror = null; 
              const parent = e.currentTarget.parentNode;
              if (parent) {
                parent.innerHTML = '<span style="font-size: 24px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">📦</span>';
              }
            }}
          />
        </div>
      );
    }

    // Priority 2: Default placeholder icon if no image thumbnail is available
    // Video is not used as a fallback for the static grid icon.
    return (
      <div style={styles.assetThumbnail}>
        <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>📦</span>
      </div>
    );
  };

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
    setTotalPages(Math.max(1, Math.ceil(assets.length / assetsPerPage)));
  }, [assets.length, assetsPerPage]);

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
        {/* Notification message - now positioned in top right with fixed styling */}
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

        {isLoading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading assets...</p>
          </div>
        ) : generationStatus.inProgress || generationStatus.error ? (
          /* Generation Progress Display */
          <div style={styles.generationContainer}>
            <div style={styles.generationHeader}>
              {!generationStatus.error && <div style={styles.generationSpinner}></div>}
              <h3 style={styles.generationTitle}>
                {generationStatus.error ? 'Generation Failed' : 'Generating 3D Asset'}
              </h3>
            </div>
            {generationStatus.error ? (
              <>
                <div style={styles.generationError}>
                  {generationStatus.errorMessage || 'An error occurred during generation'}
                </div>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setGenerationStatus({ 
                      inProgress: false, error: false, errorMessage: '', 
                      message: '', progress: 0, previewUrl: null, assetName: null 
                    });
                    setActionVideoUrl(null);
                    setActionModel(null);
                  }}
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                {/* Progress Bar */}
                <div style={styles.progress.stepsContainer}>
                  <div style={styles.progress.progressLine}></div>
                  <div 
                    style={{
                      ...styles.progress.progressFill,
                      width: `${(progressCount / 5) * 100}%`,
                      transition: 'width 0.7s cubic-bezier(.4,1.4,.6,1)',
                      boxShadow: '0 0 16px 2px #00aaff88',
                    }}
                  ></div>
                </div>
                <div style={styles.progress.statusMessage}>
                  {generationStatus.message || 'Processing...'}
                </div>
                {/* Render video if available from action */}
                {actionVideoUrl && !actionModel && (
                  <div style={styles.generationPreviewContainer}>
                    <div style={{position: 'relative', width: '100%', height: '100%'}}>
                      <video 
                        src={actionVideoUrl}
                        style={styles.generationPreviewVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 32px 4px #00ffaa99'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = styles.generationPreviewVideo.boxShadow}
                      />
                      {/* Optional: Overlay play icon on hover */}
                      {/* <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', opacity: 0.7, fontSize: 64, color: '#00ffaa'}}>▶</div> */}
                    </div>
                  </div>
                )}
                {/* Render model viewer if GLB saved and model data is available */}
                {actionModel && (
                  <ModelViewer 
                    modelUrl={getModelUrl(actionModel)} // Use getModelUrl for consistency
                    modelName={actionModel.displayName || actionModel.name}
                    modelId={actionModel.id}
                    videoUrl={actionModel.videoUrl}
                    onError={handleActionModelError} // Use dedicated error handler
                    hideControls={true}
                    onModelDeleted={handleModelDeleted}
                  />
                )}
                {/* Fallback to previewUrl if present and not overridden by action video or model */}
                {!actionVideoUrl && !actionModel && generationStatus.previewUrl && (
                  <div style={styles.generationPreviewContainer}>
                    <video 
                      src={generationStatus.previewUrl}
                      style={styles.generationPreviewVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : selectedModel ? (
          /* 3D Model Viewer */
          <ModelViewer 
            modelUrl={getModelUrl(selectedModel)} 
            modelName={selectedModel.displayName || selectedModel.name}
            modelId={selectedModel.id}
            videoUrl={selectedModel.videoUrl}
            onError={handleModelError}
            onModelNameChange={handleModelNameChange}
            onModelDeleted={handleModelDeleted}
          />
        ) : (
          /* Dropzone when no model is selected */
          <div 
            {...getRootProps()} 
            style={{
              ...styles.dropzone,
              ...(isDragActive ? styles.dropzoneActive : {})
            }}
          >
            <input {...getInputProps()} />
            <div style={styles.uploadIcon}>📤</div>
            {isDragActive ? (
              <p style={styles.dropzoneText}>Drop the .glb file here ...</p>
            ) : (
              <>
                <p style={styles.dropzoneText}>
                  {assets.length > 0 ? "Click an asset or upload here" : "Upload some assets here!"}
                </p>
                <p style={styles.dropzoneSubText}>
                  Drag & drop a .glb file or click to browse
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right panel - Asset list */}
      <div style={{...styles.assetListPanel, ...mobileStyles.assetListPanel}}>
        <h3 style={styles.assetListHeader}>Your 3D Models</h3>
        
        {/* Pagination controls */}
        {assets.length > 0 && !error && (
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
        
        {/* Scrollable asset grid */}
        <div style={styles.assetListContainer} ref={gridContainerRef}>
          {error ? (
            <div style={{...styles.message, ...styles.error}}>
              {error}
            </div>
          ) : assets.length > 0 ? (
            <div style={{...styles.assetGrid, ...mobileStyles.assetGrid}}>
              {getPaginatedAssets.map((asset, index) => (
                <div 
                  key={asset.id || index} 
                  style={{
                    ...styles.assetItem,
                    ...(selectedModel && selectedModel.id === asset.id ? styles.assetItemSelected : {})
                  }}
                  onClick={() => setSelectedModel(asset)}
                >
                  {renderAssetThumbnail(asset)}
                  <div style={styles.assetName}>{asset.displayName || formatFileName(asset.name)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: THEME.textSecondary }}>No models available</p>
          )}
        </div>
        
        {/* Button Container with Upload and Create buttons */}
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
            style={{ width: '100%', padding: '12px 24px' }}
          >
            Create 3D Asset
          </Button>
        </div>
        
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
    </div>
  );
};

export default ViewAssets;
