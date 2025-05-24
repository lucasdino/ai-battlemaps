import React, { useState, useEffect, useCallback, useRef } from 'react';
import CONFIG from '../config';
import TerrainViewer from './TerrainViewer';
import TerrainUploadPopup from './TerrainUploadPopup';
import { Button } from './common';
import styles, { getMobileStyles, KEYFRAMES } from '../styles/ViewTerrains';

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
  
  // Refs
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);

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

  // Initial load
  useEffect(() => {
    fetchTerrains();
  }, [fetchTerrains]);

  // Handle terrain selection
  const handleTerrainSelect = useCallback((terrain) => {
    setSelectedTerrain(terrain);
  }, []);

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
              terrainUrl={`${CONFIG.API.BASE_URL}/assets/terrains/${selectedTerrain.id}`}
              terrainName={selectedTerrain.name}
              terrainId={selectedTerrain.id}
              onError={handleTerrainViewerError}
              onTerrainNameChange={handleTerrainNameChange}
              onTerrainDeleted={handleTerrainDeleted}
              showGrid={true}
              scale={selectedTerrain.scale}
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

        {/* Hidden File Input */}
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
    </div>
  );
};

export default ViewTerrains; 