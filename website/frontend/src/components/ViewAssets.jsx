import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import THEME from '../theme';
import ModelViewer from './ModelViewer';
import ThumbnailRenderer from './ThumbnailRenderer';

// Media query breakpoint
const MOBILE_BREAKPOINT = 768;
const SINGLE_COLUMN_BREAKPOINT = 480;

// Add global keyframe animations
const addGlobalStyle = () => {
  useEffect(() => {
    // Create a style element for animations
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px) translateX(-50%); }
        to { opacity: 1; transform: translateY(0) translateX(-50%); }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes thumbnailSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleEl);
    
    // Cleanup function
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
};

// CSS for styling
const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 60px)', // Full height minus navbar
    overflow: 'hidden', // Prevent scrolling on the container itself
    backgroundColor: THEME.bgPrimary,
    maxHeight: 'calc(100vh - 60px)', // Enforce maximum height
    position: 'fixed', // Fix position to avoid spacing issues
    width: '100%',
    top: '60px', // Position right below the navbar
    left: 0,
  },
  // Left panel - 2/3 width for model visualization
  visualizationPanel: {
    flex: '2',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    position: 'relative',
    overflow: 'hidden',
    height: '100%', // Fill the height of the parent container
  },
  // Right panel - 1/3 width for asset list
  assetListPanel: {
    flex: '1',
    padding: '20px',
    backgroundColor: THEME.bgPrimary,
    borderLeft: THEME.border,
    display: 'flex',
    flexDirection: 'column',
    height: '100%', // Fill the height of the parent container
    minWidth: '250px', // Ensure panel doesn't get too narrow
    maxWidth: '400px', // Limit maximum width
  },
  assetListHeader: {
    marginBottom: '15px',
    color: THEME.accentPrimary,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  assetListContainer: {
    overflowY: 'auto',
    flex: 1,
    marginBottom: '15px',
    padding: '5px',
    maxHeight: 'calc(100% - 120px)', // Leave space for header and button
  },
  assetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', // 2 columns by default
    gap: '12px',
    width: '100%',
  },
  assetGridSingleColumn: {
    gridTemplateColumns: '1fr', // 1 column for small screens
  },
  assetItem: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: THEME.bgSecondary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: THEME.boxShadow,
    border: `1px solid transparent`,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    outline: 'none',
  },
  assetItemHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${THEME.accentPrimary}`,
    outline: 'none',
  },
  assetItemSelected: {
    border: `1px solid ${THEME.accentPrimary}`,
    backgroundColor: THEME.bgActive,
    outline: 'none',
  },
  assetThumbnail: {
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.bgActive,
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '32px',
    color: THEME.accentPrimary,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    overflow: 'hidden',
    position: 'relative', // For loading indicator positioning
  },
  thumbnailLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    fontSize: '10px',
    color: THEME.textSecondary,
  },
  thumbnailSpinner: {
    width: '20px',
    height: '20px',
    border: `2px solid ${THEME.bgActive}`,
    borderTop: `2px solid ${THEME.accentPrimary}`,
    borderRadius: '50%',
    animation: 'thumbnailSpin 1s linear infinite',
  },
  '@keyframes thumbnailSpin': undefined, // Use global animation instead
  assetName: {
    fontSize: '12px',
    color: THEME.textPrimary,
    textAlign: 'center',
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dropzone: {
    border: `2px dashed ${THEME.accentPrimary}`,
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(37, 37, 37, 0.7)',
    boxShadow: THEME.boxShadow,
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneActive: {
    borderColor: THEME.accentSecondary,
    backgroundColor: 'rgba(51, 51, 51, 0.7)',
  },
  uploadIcon: {
    fontSize: '48px',
    color: THEME.accentPrimary,
    marginBottom: '15px',
  },
  dropzoneText: {
    fontSize: '18px',
    color: THEME.textPrimary,
    marginBottom: '10px',
    fontWeight: 'bold',
  },
  dropzoneSubText: {
    fontSize: '14px',
    color: THEME.textSecondary,
    marginTop: '5px',
  },
  uploadButton: {
    backgroundColor: '#ff5e3a', // Fire orange
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 5px rgba(255, 94, 58, 0.3)',
    alignSelf: 'stretch',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto', // Push to bottom of flex container
  },
  uploadButtonHover: {
    backgroundColor: '#ff3b1c', // Brighter orange/red when hovering
    boxShadow: '0 4px 8px rgba(255, 59, 28, 0.5)',
    transform: 'translateY(-2px)',
  },
  message: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    padding: '10px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    animation: 'fadeIn 0.3s ease-in-out',
    maxWidth: '90%',
  },
  success: {
    backgroundColor: THEME.successBg,
    color: THEME.successText,
    border: `1px solid ${THEME.successBorder}`,
  },
  error: {
    backgroundColor: THEME.errorBg,
    color: THEME.errorText,
    border: `1px solid ${THEME.errorBorder}`,
  },
  modelViewer: {
    width: '100%',
    height: '100%',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  '@keyframes fadeIn': undefined, // Use global animation instead
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  spinner: {
    border: `4px solid ${THEME.bgActive}`,
    borderTop: `4px solid ${THEME.accentPrimary}`,
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  '@keyframes spin': undefined,   // Use global animation instead
  loadingText: {
    color: THEME.textSecondary,
  }
};

// Responsive styles for mobile/small screens
const getMobileStyles = (windowWidth) => {
  const styles = {};
  
  if (windowWidth <= MOBILE_BREAKPOINT) {
    styles.container = {
      flexDirection: 'column',
      overflow: 'auto',
    };
    styles.visualizationPanel = {
      flex: 'none',
      height: 'auto',
      minHeight: '50vh',
    };
    styles.assetListPanel = {
      flex: 'none',
      minHeight: '40vh',
      borderLeft: 'none',
      borderTop: THEME.border,
      maxWidth: '100%',
    };
  }
  
  if (windowWidth <= SINGLE_COLUMN_BREAKPOINT) {
    styles.assetGrid = {
      gridTemplateColumns: '1fr', // Switch to single column
    };
  }
  
  return styles;
};

const ViewAssets = () => {
  // Add the global animations
  addGlobalStyle();
  
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [isUploadButtonHover, setIsUploadButtonHover] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const fileInputRef = useRef(null);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbnailsRendering, setThumbnailsRendering] = useState({});

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get responsive styles
  const mobileStyles = getMobileStyles(windowWidth);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (uploadError || uploadSuccess) {
      const timer = setTimeout(() => {
        setUploadError(null);
        setUploadSuccess(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [uploadError, uploadSuccess]);

  // Fetch assets function
  const fetchAssets = useCallback(() => {
    setIsLoading(true);
    console.log('Fetching assets from:', 'http://localhost:3001/api/assets');
    
    fetch('http://localhost:3001/api/assets')
      .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Received assets data:', data);
        setAssets(data);
        setError(null);
      })
      .catch(error => {
        console.error('Error fetching assets:', error);
        setError('Failed to load assets. Is the backend running?');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAssets();
    
    // Set up polling to check for server availability
    const interval = setInterval(() => {
      if (error) {
        console.log('Retrying connection to server...');
        fetchAssets();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchAssets, error]);

  // Upload logic
  const onDrop = useCallback(acceptedFiles => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = acceptedFiles[0];
    if (!file) return;

    // Basic validation
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setUploadError('Only .glb files are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('asset', file);

    console.log('Uploading file:', file.name);
    
    fetch('http://localhost:3001/upload', {
      method: 'POST',
      body: formData,
    })
    .then(response => {
        console.log('Upload response status:', response.status);
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }).catch(() => {
                throw new Error(`HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
      console.log('Upload successful:', data);
      setUploadSuccess(`Successfully uploaded ${file.name}!`);
      fetchAssets();
    })
    .catch(error => {
      console.error('Error uploading asset:', error);
      setUploadError(`Upload failed: ${error.message}`);
    });
  }, [fetchAssets]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: '.glb',
    multiple: false
  });

  // Get URL for model based on its source directory
  const getModelUrl = (asset) => {
    return `http://localhost:3001/${asset.source}/${asset.name}`;
  };

  // Handle thumbnail rendering completion
  const handleThumbnailRendered = (assetName, thumbnailUrl) => {
    console.log(`Thumbnail generated for ${assetName}`);
    setThumbnails(prev => ({
      ...prev,
      [assetName]: thumbnailUrl
    }));
    setThumbnailsRendering(prev => ({
      ...prev,
      [assetName]: false
    }));
  };

  // Handle thumbnail rendering error
  const handleThumbnailError = (assetName, error) => {
    console.error(`Error generating thumbnail for ${assetName}:`, error);
    setThumbnailsRendering(prev => ({
      ...prev,
      [assetName]: false
    }));
  };

  // Format filename without extension
  const formatFileName = (fileName) => {
    return fileName.replace(/\.glb$/i, '');
  };

  // Handle upload button click
  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
  };

  // Handle file input change
  const handleFileInputChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      onDrop([files[0]]);
    }
  };

  // Add this function after getModelUrl to handle model loading errors
  const handleModelError = (errorMessage) => {
    console.error('Model loading error:', errorMessage);
    setError(`Failed to load model: ${errorMessage}`);
    // Optionally reset the selected model after a short delay
    setTimeout(() => {
      setSelectedModel(null);
      setError(null);
    }, 3000);
  };

  // Queue thumbnails for rendering when assets change
  useEffect(() => {
    if (assets.length > 0) {
      // Mark all thumbnails as being rendered
      const renderingState = {};
      assets.forEach(asset => {
        // Only start rendering if we don't already have this thumbnail
        if (!thumbnails[asset.name]) {
          renderingState[asset.name] = true;
        }
      });
      setThumbnailsRendering(renderingState);
    }
  }, [assets, thumbnails]);

  return (
    <div style={{...styles.container, ...mobileStyles.container}}>
      {/* Left panel - Visualization */}
      <div style={{...styles.visualizationPanel, ...mobileStyles.visualizationPanel}}>
        {/* Messages - Notifications */}
        {uploadError && (
          <div style={{...styles.message, ...styles.error}}>
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div style={{...styles.message, ...styles.success}}>
            {uploadSuccess}
          </div>
        )}

        {isLoading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading assets...</p>
          </div>
        ) : selectedModel ? (
          /* 3D Model Viewer */
          <ModelViewer 
            modelUrl={getModelUrl(selectedModel)} 
            onError={handleModelError}
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
                  {assets.length > 0 
                    ? "Click an asset or upload here" 
                    : "Upload some assets here!"}
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
        
        {/* Scrollable asset grid */}
        <div style={styles.assetListContainer}>
          {error ? (
            <div style={{...styles.message, ...styles.error}}>
              {error}
            </div>
          ) : assets.length > 0 ? (
            <div style={{...styles.assetGrid, ...mobileStyles.assetGrid}}>
              {assets.map((asset, index) => (
                <div 
                  key={index} 
                  style={{
                    ...styles.assetItem,
                    ...(hoverIndex === index ? styles.assetItemHover : {}),
                    ...(selectedModel && selectedModel.name === asset.name ? styles.assetItemSelected : {})
                  }}
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={() => setSelectedModel(asset)}
                >
                  <div 
                    style={{
                      ...styles.assetThumbnail,
                      ...(thumbnails[asset.name] ? {
                        backgroundImage: `url(${thumbnails[asset.name]})`,
                        fontSize: 0, // Hide the emoji when we have a thumbnail
                      } : {})
                    }}
                  >
                    {!thumbnails[asset.name] && !thumbnailsRendering[asset.name] && '🧊'}
                    
                    {/* Loading indicator */}
                    {thumbnailsRendering[asset.name] && (
                      <div style={styles.thumbnailLoading}>
                        <div style={styles.thumbnailSpinner}></div>
                      </div>
                    )}
                  </div>
                  <div style={styles.assetName}>{formatFileName(asset.name)}</div>
                  
                  {/* Render thumbnails in the background */}
                  {thumbnailsRendering[asset.name] && (
                    <ThumbnailRenderer
                      modelUrl={getModelUrl(asset)}
                      onRendered={(thumbnailUrl) => handleThumbnailRendered(asset.name, thumbnailUrl)}
                      onError={(error) => handleThumbnailError(asset.name, error)}
                      size={120} // Higher resolution for better quality
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: THEME.textSecondary }}>No models available</p>
          )}
        </div>
        
        {/* Upload button */}
        <div 
          style={{
            ...styles.uploadButton,
            ...(isUploadButtonHover ? styles.uploadButtonHover : {})
          }}
          onMouseEnter={() => setIsUploadButtonHover(true)}
          onMouseLeave={() => setIsUploadButtonHover(false)}
          onClick={handleUploadButtonClick}
        >
          <span style={{ marginRight: '8px' }}>Upload New Model</span>
          <span>+</span>
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".glb"
          onChange={handleFileInputChange}
        />
      </div>
    </div>
  );
};

export default ViewAssets;