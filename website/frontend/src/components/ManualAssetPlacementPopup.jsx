import React, { useState, useEffect } from 'react';
import { placeAssetsStyles } from '../styles/PlaceAssets';
import CONFIG from '../config';

const ManualAssetPlacementPopup = ({ 
  isOpen, 
  onClose, 
  onAssetSelected,
  currentSelectedAsset
}) => {
  const [availableAssets, setAvailableAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clean model ID for display
  const cleanModelIdForDisplay = (originalName, modelId) => {
    if (!originalName && !modelId) return 'Unnamed Model';
    
    let cleanedName = originalName || modelId;
    cleanedName = cleanedName.replace(/\.[^/.]+$/, ''); // Remove file extension
    cleanedName = cleanedName.replace(/[_-]/g, ' '); // Replace underscores and hyphens with spaces
    cleanedName = cleanedName.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    
    // Capitalize each word
    cleanedName = cleanedName.replace(/\b\w/g, l => l.toUpperCase());
    
    // Handle special prefixes
    const prefixMap = {
      'model': '',
      'asset': '',
      '3d': '3D',
      'obj': '',
      'gltf': '',
      'glb': ''
    };
    
    let prefix = '';
    for (const [key, value] of Object.entries(prefixMap)) {
      if (cleanedName.toLowerCase().startsWith(key.toLowerCase())) {
        prefix = value;
        cleanedName = cleanedName.substring(key.length).trim();
        break;
      }
    }
    
    if (prefix) {
      cleanedName = cleanedName === '' ? `${prefix} Model` : `${prefix} ${cleanedName}`;
    }
    
    return cleanedName.trim() === '' ? 'Unnamed Model' : cleanedName.trim();
  };

  // Fetch available models
  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailableModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MODELS.BASE}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          const processedModels = data.models.map(model => {
            const modelName = cleanModelIdForDisplay(model.name, model.id);
            return {
              id: model.id,
              name: modelName,
              url: `/assets/3d_models/${model.id}`,
              iconUrl: model.icon,
              scale: model.metadata?.scale || { x: 1.0, y: 1.0, z: 1.0 },
              rotation: model.metadata?.rotation || { x: 0, y: 0, z: 0 },
            };
          });
          setAvailableAssets(processedModels);
        } else {
          setAvailableAssets([]);
        }
      } catch (err) {
        console.error('Error fetching available models:', err);
        setError(err.message);
        setAvailableAssets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableModels();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAssetClick = (asset) => {
    if (currentSelectedAsset?.id === asset.id) {
      // Deselect if clicking on the same asset
      onAssetSelected(null);
    } else {
      // Select the new asset
      onAssetSelected(asset);
    }
  };

  return (
    <div style={placeAssetsStyles.overlay} onClick={handleOverlayClick}>
      <div style={placeAssetsStyles.modal}>
        <div style={placeAssetsStyles.header}>
          <h2 style={placeAssetsStyles.title}>
            Place Assets Manually
          </h2>
          <button 
            style={placeAssetsStyles.closeButton}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={placeAssetsStyles.content}>
          {/* Instructions Section */}
          <div style={placeAssetsStyles.infoSection}>
            <h3 style={placeAssetsStyles.infoTitle}>📍 Manual Asset Placement</h3>
            <p style={placeAssetsStyles.infoText}>
              1. Click on an asset below to select it for placement
            </p>
            <p style={placeAssetsStyles.infoText}>
              2. Click anywhere on the dungeon to place the selected asset
            </p>
            <p style={placeAssetsStyles.infoText}>
              3. Press <strong>Escape</strong> to deselect the current asset
            </p>
            {currentSelectedAsset && (
              <p style={{...placeAssetsStyles.infoText, color: '#28a745', fontWeight: 'bold'}}>
                Selected: {currentSelectedAsset.name} (Click on dungeon to place)
              </p>
            )}
          </div>

          {/* Assets Grid */}
          <div style={styles.assetSection}>
            <h4 style={styles.assetSectionTitle}>Available Assets</h4>
            
            {isLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>Loading assets...</p>
              </div>
            ) : error ? (
              <div style={styles.errorContainer}>
                <p style={styles.errorText}>Error: {error}</p>
              </div>
            ) : availableAssets.length === 0 ? (
              <div style={styles.emptyContainer}>
                <p style={styles.emptyText}>No assets available</p>
              </div>
            ) : (
              <div style={styles.assetGrid}>
                {availableAssets.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      ...styles.assetButton,
                      ...(currentSelectedAsset?.id === asset.id ? styles.assetButtonSelected : {})
                    }}
                    onClick={() => handleAssetClick(asset)}
                  >
                    {asset.iconUrl ? (
                      <img
                        src={asset.iconUrl.startsWith('http') ? asset.iconUrl : `${CONFIG.API.BASE_URL}${asset.iconUrl.startsWith('/') ? '' : '/'}${asset.iconUrl}`}
                        alt={asset.name}
                        style={styles.assetIcon}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      style={{
                        ...styles.assetIconFallback,
                        display: asset.iconUrl ? 'none' : 'flex'
                      }}
                    >
                      📦
                    </div>
                    <span style={styles.assetName}>{asset.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={placeAssetsStyles.actionButtons}>
          {currentSelectedAsset && (
            <button
              style={{
                ...placeAssetsStyles.secondaryButton,
                backgroundColor: '#dc3545',
                borderColor: '#dc3545'
              }}
              onClick={() => onAssetSelected(null)}
            >
              Deselect Asset
            </button>
          )}
          <button
            style={placeAssetsStyles.primaryButton}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Additional styles specific to this component
const styles = {
  assetSection: {
    marginTop: '20px',
  },
  
  assetSectionTitle: {
    color: '#fff',
    fontSize: '16px',
    marginBottom: '15px',
    fontWeight: 'bold',
  },
  
  assetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '5px',
  },
  
  assetButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#2a2a2a',
    border: '2px solid #444',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '100px',
  },
  
  assetButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#1a3a5c',
    boxShadow: '0 0 10px rgba(0, 123, 255, 0.3)',
  },
  
  assetIcon: {
    width: '48px',
    height: '48px',
    objectFit: 'cover',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  
  assetIconFallback: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '8px',
    backgroundColor: '#444',
    borderRadius: '4px',
  },
  
  assetName: {
    color: '#fff',
    fontSize: '12px',
    textAlign: 'center',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
    maxHeight: '32px',
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
  },
  
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #444',
    borderTop: '3px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '10px',
  },
  
  loadingText: {
    color: '#ccc',
    fontSize: '14px',
  },
  
  errorContainer: {
    padding: '20px',
    textAlign: 'center',
  },
  
  errorText: {
    color: '#dc3545',
    fontSize: '14px',
  },
  
  emptyContainer: {
    padding: '20px',
    textAlign: 'center',
  },
  
  emptyText: {
    color: '#ccc',
    fontSize: '14px',
  },
};

export default ManualAssetPlacementPopup;

// Add CSS for animations
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-spin-animation]')) {
  styleElement.setAttribute('data-spin-animation', 'true');
  document.head.appendChild(styleElement);
} 