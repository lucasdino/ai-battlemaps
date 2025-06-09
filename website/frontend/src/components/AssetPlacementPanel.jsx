import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

  // Tab state for switching between My Models and Default Models
  const [activeTab, setActiveTab] = useState('my_models'); // 'my_models' or 'default_models'
  const [defaultAssets, setDefaultAssets] = useState([]);
  const [defaultAssetsLoading, setDefaultAssetsLoading] = useState(false);
  const [defaultAssetsError, setDefaultAssetsError] = useState(null);

  // Dynamic pagination state based on container height
  const [currentPage, setCurrentPage] = useState(1);
  const [assetsPerPage, setAssetsPerPage] = useState(6); // Dynamic based on container height
  const [defaultCurrentPage, setDefaultCurrentPage] = useState(1);
  const [defaultTotalPages, setDefaultTotalPages] = useState(1);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef(null);

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

  // Get paginated default assets
  const getPaginatedDefaultAssets = useMemo(() => {
    if (Array.isArray(defaultAssets)) {
      return defaultAssets; // Server already returned the correct page
    }
    return [];
  }, [defaultAssets]);

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
      const processedAssets = (data.assets || []).map(asset => ({
        id: asset.id,
        name: asset.name,
        url: asset.modelPath?.startsWith('/') 
          ? `${CONFIG.API.BASE_URL}${asset.modelPath}`
          : `${CONFIG.API.BASE_URL}/${asset.modelPath}`,
        iconUrl: asset.iconUrl,
        scale: asset.defaultScale || { x: 1.0, y: 1.0, z: 1.0 },
        rotation: asset.defaultRotation || { x: 0, y: 0, z: 0 },
        isDefault: true
      }));
      
      setDefaultAssets(processedAssets);
      setDefaultTotalPages(data.pagination?.totalPages || Math.max(1, Math.ceil((data.totalCount || processedAssets.length) / assetsPerPage)));
      setDefaultCurrentPage(data.pagination?.currentPage || page);
    } catch (err) {
      console.error('Error fetching default assets:', err);
      setDefaultAssetsError(err.message);
    } finally {
      setDefaultAssetsLoading(false);
    }
  }, [assetsPerPage]);

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

    if (activeTab === 'my_models') {
      fetchAvailableModels();
    }
  }, [isOpen, activeTab]);

  // Fetch default assets when tab changes to default models
  useEffect(() => {
    if (isOpen && activeTab === 'default_models') {
      fetchDefaultAssets(defaultCurrentPage);
    }
  }, [isOpen, activeTab, defaultCurrentPage, fetchDefaultAssets]);

  // Reset to first page when assets change
  useEffect(() => {
    setCurrentPage(1);
  }, [availableAssets.length]);

  // Reset to first page when default assets change  
  useEffect(() => {
    setDefaultCurrentPage(1);
  }, [defaultAssets.length]);

  // Calculate dynamic assets per page based on container height
  useEffect(() => {
    const calculateAssetsPerPage = () => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const availableHeight = containerRect.height;
      setContainerHeight(availableHeight);
      
      // Asset item dimensions: 120px minHeight + 12px gap = 132px per row
      // 2 columns, so each "row" shows 2 assets
      const ASSET_ROW_HEIGHT = 132; // 120px item + 12px gap
      const HEADER_HEIGHT = 60; // Space for tab + section header + pagination
      const INSTRUCTIONS_HEIGHT = 60; // Space for instructions
      
      const usableHeight = availableHeight - HEADER_HEIGHT - INSTRUCTIONS_HEIGHT;
      const maxRows = Math.max(2, Math.floor(usableHeight / ASSET_ROW_HEIGHT));
      const newAssetsPerPage = Math.max(4, maxRows * 2); // 2 columns per row, minimum 4 assets
      
      console.log('Dynamic calculation:', {
        availableHeight,
        usableHeight,
        maxRows,
        newAssetsPerPage
      });
      
      if (newAssetsPerPage !== assetsPerPage) {
        setAssetsPerPage(newAssetsPerPage);
        // Reset to first page when changing page size
        setCurrentPage(1);
        setDefaultCurrentPage(1);
      }
    };

    // Calculate on mount and when panel opens
    if (isOpen && containerRef.current) {
      calculateAssetsPerPage();
    }

    // Recalculate on window resize
    const handleResize = () => {
      if (isOpen) {
        setTimeout(calculateAssetsPerPage, 100); // Small delay to ensure DOM is updated
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, assetsPerPage]);

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
        {/* Drag and Drop Instructions - Back at Top */}
        <div style={styles.instructions}>
          <p style={styles.instructionText}>
            🎯 Drag and drop assets onto the terrain
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'my_models' ? styles.tabButtonActive : styles.tabButtonInactive)
            }}
            onClick={() => handleTabSwitch('my_models')}
          >
            My Models
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'default_models' ? styles.tabButtonActive : styles.tabButtonInactive)
            }}
            onClick={() => handleTabSwitch('default_models')}
          >
            Default Models
          </button>
        </div>

        <div style={styles.assetSection} ref={containerRef}>
          <div style={styles.assetSectionHeader}>
            <h4 style={styles.assetSectionTitle}>
              {activeTab === 'my_models' ? 'My Assets' : 'Default Assets'}
            </h4>
            {/* Pagination controls */}
            {(
              (activeTab === 'my_models' && totalPages > 1 && !error && !isLoading) ||
              (activeTab === 'default_models' && defaultTotalPages > 1 && !defaultAssetsError && !defaultAssetsLoading)
            ) && (
              <div style={styles.paginationControls}>
                <Button 
                  variant="icon"
                  onClick={() => handlePageChange(
                    activeTab === 'my_models' ? currentPage - 1 : defaultCurrentPage - 1
                  )}
                  disabled={
                    activeTab === 'my_models' ? currentPage === 1 : defaultCurrentPage === 1
                  }
                  size="small"
                >
                  &lt;
                </Button>
                <span style={styles.pageIndicator}>
                  {activeTab === 'my_models' 
                    ? `${currentPage} / ${totalPages}` 
                    : `${defaultCurrentPage} / ${defaultTotalPages}`
                  }
                </span>
                <Button 
                  variant="icon"
                  onClick={() => handlePageChange(
                    activeTab === 'my_models' ? currentPage + 1 : defaultCurrentPage + 1
                  )}
                  disabled={
                    activeTab === 'my_models' ? currentPage === totalPages : defaultCurrentPage === defaultTotalPages
                  }
                  size="small"
                >
                  &gt;
                </Button>
              </div>
            )}
          </div>
          
          {activeTab === 'my_models' ? (
            // My Models content
            isLoading ? (
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
            )
          ) : (
            // Default Models content
            defaultAssetsLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>Loading default assets...</p>
              </div>
            ) : defaultAssetsError ? (
              <div style={styles.errorContainer}>
                <p style={styles.errorText}>Error: {defaultAssetsError}</p>
              </div>
            ) : defaultAssets.length === 0 ? (
              <div style={styles.emptyContainer}>
                <p style={styles.emptyText}>No default assets available</p>
              </div>
            ) : (
              <div style={styles.assetGrid}>
                {getPaginatedDefaultAssets.map((asset) => (
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
                      🏛️
                    </div>
                    <span style={styles.assetName}>{asset.name}</span>
                  </div>
                ))}
              </div>
            )
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
    width: '420px',
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
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0, // Allow flex child to shrink
  },
  tabContainer: {
    display: 'flex',
    marginBottom: '16px',
    gap: '8px',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.3)',
    padding: '8px',
    borderRadius: '8px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  tabButtonActive: {
    color: '#fff',
    backgroundColor: '#e67e22',
    boxShadow: '0 2px 8px rgba(230, 126, 34, 0.3)',
  },
  tabButtonInactive: {
    color: '#ccc',
    backgroundColor: 'transparent',
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
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0, // Allow flex child to shrink
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
  assetCount: {
    color: '#ccc',
    fontSize: '12px',
    fontWeight: '500',
  },
  assetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    alignContent: 'start',
  },
  assetItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#2a2a2a',
    border: '2px solid #444',
    borderRadius: '8px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    minHeight: '120px',
  },
  assetIcon: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  assetIconFallback: {
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '8px',
    backgroundColor: '#444',
    borderRadius: '6px',
  },
  assetName: {
    color: '#fff',
    fontSize: '12px',
    textAlign: 'center',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
    maxHeight: '32px',
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