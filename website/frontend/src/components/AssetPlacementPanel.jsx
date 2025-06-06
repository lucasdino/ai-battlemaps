import React, { useState, useEffect, useRef, useMemo } from 'react';
import CONFIG from '../config';
import { Button } from './common';

const AssetPlacementPanel = ({ 
  isOpen, 
  onClose, 
  placedAssets,
  terrainId,
  terrainName
}) => {
  const [availableAssets, setAvailableAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const draggedAssetRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [assetsPerPage] = useState(6); // Show 6 assets per page (2 columns x 3 rows)

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(availableAssets.length / assetsPerPage));
  
  // Get paginated assets
  const getPaginatedAssets = useMemo(() => {
    if (Array.isArray(availableAssets)) {
      const startIndex = (currentPage - 1) * assetsPerPage;
      const endIndex = startIndex + assetsPerPage;
      return availableAssets.slice(startIndex, endIndex);
    }
    return [];
  }, [availableAssets, currentPage, assetsPerPage]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  // Clean model ID for display
  const cleanModelIdForDisplay = (originalName, modelId) => {
    if (!originalName && !modelId) return 'Unnamed Model';
    
    let cleanedName = originalName || modelId;
    cleanedName = cleanedName.replace(/\.[^/.]+$/, '');
    cleanedName = cleanedName.replace(/[_-]/g, ' ');
    cleanedName = cleanedName.replace(/\s+/g, ' ');
    cleanedName = cleanedName.replace(/\b\w/g, l => l.toUpperCase());
    
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
          setCurrentPage(1); // Reset to first page when data loads
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

  // Reset to first page when assets change
  useEffect(() => {
    setCurrentPage(1);
  }, [availableAssets.length]);

  // Handle drag start
  const handleDragStart = (e, asset) => {
    console.log('Asset drag started:', asset.name, asset);
    draggedAssetRef.current = asset;
    
    // Set multiple data formats for better compatibility
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.setData('text/plain', asset.name);
    
    // Create a visible drag image
    const dragImage = e.target.cloneNode(true);
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'scale(0.8)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 50);
    
    // Clean up drag image after a delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    draggedAssetRef.current = null;
    console.log('Asset drag ended');
  };



  if (!isOpen) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Asset Placement</h3>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.instructions}>
          <p style={styles.instructionText}>
            🎯 Drag and drop assets onto the terrain
          </p>
        </div>

        <div style={styles.assetSection}>
          <div style={styles.assetSectionHeader}>
            <h4 style={styles.assetSectionTitle}>Available Assets</h4>
            {/* Pagination controls */}
            {availableAssets.length > assetsPerPage && !error && !isLoading && (
              <div style={styles.paginationControls}>
                <Button 
                  variant="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="small"
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
                  size="small"
                >
                  &gt;
                </Button>
              </div>
            )}
          </div>
          
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
              {getPaginatedAssets.map((asset) => (
                <div
                  key={asset.id}
                  draggable={true}
                  className="asset-item"
                  style={styles.assetItem}
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onDragEnd={handleDragEnd}
                  title={`Drag ${asset.name} to place on terrain`}
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


    </div>
  );
};

const styles = {
  panel: {
    position: 'absolute',
    left: '15px',
    top: '15px',
    bottom: '15px',
    width: '280px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: '12px',
    border: '1px solid #444',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #444',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
  },
  instructions: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(0, 123, 255, 0.3)',
  },
  instructionText: {
    color: '#e3f2fd',
    fontSize: '13px',
    margin: '4px 0',
    lineHeight: '1.4',
  },
  statsSection: {
    marginBottom: '16px',
    padding: '8px 12px',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    borderRadius: '6px',
    border: '1px solid rgba(40, 167, 69, 0.3)',
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#c8e6c9',
    fontSize: '13px',
  },
  statValue: {
    color: '#4caf50',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  assetSection: {
    flex: 1,
  },
  assetSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  assetSectionTitle: {
    color: '#fff',
    fontSize: '14px',
    margin: 0,
    fontWeight: 'bold',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pageIndicator: {
    color: '#ccc',
    fontSize: '12px',
    minWidth: '40px',
    textAlign: 'center',
  },
  assetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  assetItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#2a2a2a',
    border: '2px solid #444',
    borderRadius: '8px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    minHeight: '80px',
  },
  assetIcon: {
    width: '32px',
    height: '32px',
    objectFit: 'cover',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  assetIconFallback: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    marginBottom: '4px',
    backgroundColor: '#444',
    borderRadius: '4px',
  },
  assetName: {
    color: '#fff',
    fontSize: '10px',
    textAlign: 'center',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
    maxHeight: '24px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #444',
    borderTop: '2px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '8px',
  },
  loadingText: {
    color: '#ccc',
    fontSize: '12px',
  },
  errorContainer: {
    padding: '16px',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '12px',
  },
  emptyContainer: {
    padding: '16px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#ccc',
    fontSize: '12px',
  },
  actionSection: {
    padding: '16px',
    borderTop: '1px solid #444',
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  saveButtonDisabled: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  saveButtonSuccess: {
    backgroundColor: '#155724',
  },
  saveButtonError: {
    backgroundColor: '#721c24',
  },
  saveSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add CSS animations
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .asset-item:hover {
    border-color: #007bff !important;
    background-color: #1a3a5c !important;
    transform: translateY(-2px);
  }
  
  .asset-item:active {
    cursor: grabbing !important;
    transform: scale(0.95);
  }
  
  .asset-item {
    user-select: none;
    -webkit-user-drag: element;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
`;

if (!document.head.querySelector('style[data-asset-placement-animations]')) {
  styleElement.setAttribute('data-asset-placement-animations', 'true');
  document.head.appendChild(styleElement);
}

export default AssetPlacementPanel; 