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
  { id: 'preprocessing', label: 'Preprocessing', count: 2 },
  { id: 'rendering_video', label: 'Rendering Video', count: 3 },
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
  const [generationStatus, setGenerationStatus] = useState({
    inProgress: false,
    error: false,
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get responsive styles
  const mobileStyles = getMobileStyles(windowWidth);

  // Clear notifications after timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
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
      setTotalPages(data.totalPages || Math.max(1, Math.ceil(mapped.length / ASSETS_PER_PAGE)));
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
  }, [fetchFromApi]);

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

  // Helper: map backend info to sub-step index
  const getStepIndexFromBackend = (info) => {
    console.log('[DEBUG-STEP-INDEX] Determining step index from:', info);
    // You may want to refine this mapping based on backend messages
    const msg = (info.message || '').toLowerCase();
    const step = (info.step || '').toLowerCase();
    if (step.includes('preprocess')) {
      if (msg.includes('1') || msg.includes('start')) return 0;
      return 1;
    }
    if (step.includes('rendering video')) {
      if (msg.includes('1') || msg.includes('start')) return 2;
      if (msg.includes('2')) return 3;
      return 4;
    }
    if (step.includes('generating glb') || step.includes('generating 3d asset')) {
      if (msg.includes('1') || msg.includes('mesh')) return 5;
      return 6;
    }
    // fallback: use progress
    if (info.progress !== undefined) {
      return Math.floor((info.progress / 100) * (PROGRESS_STEPS.length - 1));
    }
    return 0;
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
              setActionModel({
                id: data.id, // Ensure id is present
                name: data.name,
                displayName: data.displayName || data.name, // Use displayName if available
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
      }
    }
    // If this is a progress message, increment the count (max 7)
    if (info.inProgress && info.message && info.error !== true && info.success !== true && info.status === 'progress') {
      setProgressCount(prev => Math.min(prev + 1, 7));
    }
    setGenerationStatus(prev => ({
      ...prev,
      inProgress: info.inProgress || (!info.success && !info.error),
      error: !!info.error,
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
      setTimeout(fetchAssets, 1000);
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
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Try to extract JSON from buffer (very simple, expects one JSON per chunk)
        const matches = buffer.match(/\{[\s\S]*?\}/g);
        if (matches) {
          matches.forEach(jsonStr => {
            try {
              const data = JSON.parse(jsonStr);
              handleAssetCreated({
                inProgress: data.status === 'progress',
                error: data.status === 'error',
                errorMessage: data.status === 'error' ? data.message : '',
                message: data.message,
                progress: undefined, // progress is now handled by progressCount
                videoUrl: data.videoUrl,
                assetName: data.glbFile,
                status: data.status
              });
            } catch {}
          });
          buffer = '';
        }
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
      const startIndex = (currentPage - 1) * ASSETS_PER_PAGE;
      const endIndex = startIndex + ASSETS_PER_PAGE;
      return assets.slice(startIndex, endIndex);
    }
    return [];
  }, [assets, currentPage]);

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

  return (
    <div style={{...styles.container, ...mobileStyles.container}}>
      {/* Left panel - Visualization */}
      <div style={{...styles.visualizationPanel, ...mobileStyles.visualizationPanel}}>
        {/* Notification message */}
        {notification && (
          <div style={{
            ...styles.message, 
            ...(notification.type === 'error' ? styles.error : styles.success)
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
                      width: `${(progressCount / 7) * 100}%`,
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
                    <video 
                      src={actionVideoUrl}
                      style={styles.generationPreviewVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                    />
                  </div>
                )}
                {/* Render model viewer if GLB saved and model data is available */}
                {actionModel && (
                  <ModelViewer 
                    modelUrl={getModelUrl(actionModel)} // Use getModelUrl for consistency
                    modelName={actionModel.displayName || actionModel.name}
                    modelId={actionModel.id}
                    onError={handleActionModelError} // Use dedicated error handler
                    // onModelNameChange is not needed for this temporary preview
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
            onError={handleModelError}
            onModelNameChange={handleModelNameChange}
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
        <div style={styles.assetListContainer}>
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
                    ...(selectedModel && (selectedModel.id === asset.id || selectedModel.name === asset.name) ? styles.assetItemSelected : {})
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
        />
      </div>
    </div>
  );
};

export default ViewAssets;
