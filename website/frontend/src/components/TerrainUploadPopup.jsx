import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './common';
import THEME from '../theme';

const TerrainUploadPopup = ({ 
  isOpen, 
  uploadFile, 
  terrainDimensions, // Parent state: { width, height, depth }
  setTerrainDimensions, // Parent's setState for terrainDimensions
  onUpload, 
  onCancel, 
  isProcessing 
}) => {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [imagePixelDimensions, setImagePixelDimensions] = useState({ width: 0, height: 0 });
  const [displayedImageDimensions, setDisplayedImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);

  // Local state for grid scale (units per square)
  const [gridScale, setGridScale] = useState(1.0); // 1 unit per grid square
  // Local state for the depth input string
  const [depthInput, setDepthInput] = useState('0.3');
  // Local state for terrain name
  const [terrainName, setTerrainName] = useState('');
  
  // Calculate square grid dimensions based on scale and image aspect ratio
  const calculateSquareGridDimensions = (scale, aspectRatio) => {
    // Base grid size - this determines how many squares we want
    const baseGridSize = 20; // Base number of squares for the longer dimension
    const cellsPerUnit = 1 / scale; // How many grid cells per unit
    
    // Calculate grid dimensions to create square cells
    if (aspectRatio >= 1) {
      // Landscape or square - width is longer
      const gridWidth = Math.max(1, Math.round(baseGridSize / scale));
      const gridHeight = Math.max(1, Math.round(gridWidth / aspectRatio));
      return { width: gridWidth, height: gridHeight };
    } else {
      // Portrait - height is longer
      const gridHeight = Math.max(1, Math.round(baseGridSize / scale));
      const gridWidth = Math.max(1, Math.round(gridHeight * aspectRatio));
      return { width: gridWidth, height: gridHeight };
    }
  };
  
  const gridDimensions = calculateSquareGridDimensions(gridScale, imageAspectRatio);

  // Update displayed image dimensions when image loads
  const handleImageLoad = () => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      setDisplayedImageDimensions({ 
        width: imageRef.current.offsetWidth, 
        height: imageRef.current.offsetHeight 
      });
    }
  };

  // Update grid when scale changes
  useEffect(() => {
    if (imageAspectRatio > 0) {
      const newDimensions = calculateSquareGridDimensions(gridScale, imageAspectRatio);
      updateParentDimensions(newDimensions.width, newDimensions.height, parseFloat(depthInput) || 0.1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridScale, imageAspectRatio]);

  // Create image preview and get aspect ratio
  useEffect(() => {
    if (uploadFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        const img = new Image();
        img.onload = () => {
          setImagePixelDimensions({ width: img.width, height: img.height });
          const aspectRatio = img.width > 0 && img.height > 0 ? img.width / img.height : 1;
          setImageAspectRatio(aspectRatio);
          
          // Initialize grid scale and terrain name
          setGridScale(1.0);
          setDepthInput('0.3');
          
          // Set default terrain name from file name
          const fileName = uploadFile.name;
          const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
          setTerrainName(nameWithoutExt);
          
          // Calculate initial dimensions
          const initialDimensions = calculateSquareGridDimensions(1.0, aspectRatio);
          updateParentDimensions(initialDimensions.width, initialDimensions.height, 0.1);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(uploadFile);
    } else {
      setImagePreview(null);
      setImageAspectRatio(1);
      setImagePixelDimensions({ width: 0, height: 0 });
      setGridScale(1.0);
      setDepthInput('0.3');
      setTerrainName('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFile]);

  // Callback to update parent's terrainDimensions state
  const updateParentDimensions = useCallback((width, height, depth) => {
    // Clamp values
    const clampedWidth = Math.max(1, Math.min(100, width));
    const clampedHeight = Math.max(1, Math.min(100, height));
    const clampedDepth = Math.max(0.01, Math.min(5, depth));

    setTerrainDimensions({ 
      width: parseFloat(clampedWidth.toFixed(2)),
      height: parseFloat(clampedHeight.toFixed(2)),
      depth: parseFloat(clampedDepth.toFixed(2))
    });
  }, [setTerrainDimensions]);

  // Handle grid scale change
  const handleGridScaleChange = (value) => {
    const newScale = parseFloat(value);
    setGridScale(newScale);
    const newDimensions = calculateSquareGridDimensions(newScale, imageAspectRatio);
    updateParentDimensions(newDimensions.width, newDimensions.height, parseFloat(depthInput) || 0.1);
  };

  // Handle depth input change
  const handleDepthChange = (value) => {
    setDepthInput(value);
    const newParsedDepth = parseFloat(value);
    if (!isNaN(newParsedDepth)) {
      updateParentDimensions(gridDimensions.width, gridDimensions.height, newParsedDepth);
    } else if (value === "" || value === "-") {
       updateParentDimensions(gridDimensions.width, gridDimensions.height, 0.01);
    }
  };

  const handleDepthBlur = () => {
    let finalDepth = parseFloat(depthInput);
    if (isNaN(finalDepth)) finalDepth = 0.3;
    finalDepth = Math.max(0.01, Math.min(5, finalDepth));
    setDepthInput(finalDepth.toString());
    updateParentDimensions(gridDimensions.width, gridDimensions.height, finalDepth);
  };
  
  // Close popup on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, isProcessing, onCancel]);

  // Spinner animation
  useEffect(() => {
    if (isProcessing && isOpen) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spinPopup {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [isProcessing, isOpen]);

  if (!isOpen) return null;

  const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    popup: { backgroundColor: THEME.bgSecondary, borderRadius: '12px', borderWidth: '2px', borderStyle: 'solid', borderColor: THEME.accentPrimary, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' },
    header: { padding: '20px 20px 0 20px', borderBottom: `1px solid ${THEME.bgActive}`, marginBottom: '20px' },
    title: { fontSize: '20px', fontWeight: 'bold', color: THEME.accentPrimary, margin: 0, marginBottom: '8px' },
    subtitle: { fontSize: '14px', color: THEME.textSecondary, margin: 0, marginBottom: '15px' },
    content: { padding: '0 20px 20px 20px' },
    previewSection: { marginBottom: '25px' },
    imagePreviewContainer: { width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bgActive, borderRadius: '8px', overflow: 'hidden', borderWidth: '1px', borderStyle: 'solid', borderColor: THEME.bgActive, position: 'relative' },
    imagePreview: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', display: 'block' },
    gridOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 },
    controlsSection: { marginBottom: '25px' },
    controlsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    inputLabel: { fontSize: '14px', color: THEME.textPrimary, fontWeight: '500' },
    input: { backgroundColor: THEME.bgActive, borderWidth: '1px', borderStyle: 'solid', borderColor: THEME.textSecondary, borderRadius: '6px', padding: '10px 12px', color: THEME.textPrimary, fontSize: '14px', fontFamily: 'inherit' },
    slider: { backgroundColor: THEME.bgActive, borderWidth: '1px', borderStyle: 'solid', borderColor: THEME.textSecondary, borderRadius: '6px', padding: '8px', color: THEME.textPrimary, fontSize: '14px', fontFamily: 'inherit', cursor: 'pointer' },
    sliderValue: { fontSize: '12px', color: THEME.textSecondary, textAlign: 'center', marginTop: '4px' },
    buttonContainer: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' },
    processingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', zIndex: 10 },
    processingSpinner: { width: '40px', height: '40px', borderWidth: '3px', borderStyle: 'solid', borderColor: THEME.bgActive, borderTopColor: THEME.accentPrimary, borderRadius: '50%', animation: 'spinPopup 1s linear infinite', marginBottom: '15px' },
    processingText: { color: THEME.textPrimary, fontSize: '16px', textAlign: 'center', lineHeight: 1.4 },
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && !isProcessing && onCancel()}>
      <div style={styles.popup}>
        {isProcessing && (
          <div style={styles.processingOverlay}>
            <div style={styles.processingSpinner} />
            <div style={styles.processingText}>Processing terrain image...<br />This may take a moment.</div>
          </div>
        )}
        <div style={styles.header}>
          <h2 style={styles.title}>Create New Terrain</h2>
        </div>
        <div style={styles.content}>
          <div style={styles.previewSection}>
            <div style={styles.imagePreviewContainer}>
              {imagePreview ? (
                <>
                  <img 
                    src={imagePreview} 
                    alt="Terrain preview" 
                    style={styles.imagePreview}
                    ref={imageRef}
                    onLoad={handleImageLoad}
                  />
                  {displayedImageDimensions.width > 0 && displayedImageDimensions.height > 0 && (
                    <svg 
                      style={{
                        ...styles.gridOverlay,
                        width: displayedImageDimensions.width,
                        height: displayedImageDimensions.height,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                      viewBox={`0 0 ${gridDimensions.width} ${gridDimensions.height}`}
                      preserveAspectRatio="none"
                    >
                      {/* Vertical grid lines */}
                      {Array.from({ length: gridDimensions.width + 1 }, (_, i) => (
                        <line
                          key={`v-${i}`}
                          x1={i}
                          y1={0}
                          x2={i}
                          y2={gridDimensions.height}
                          stroke="#ffffff"
                          strokeWidth="0.7"
                          strokeOpacity="1.0"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                      {/* Horizontal grid lines */}
                      {Array.from({ length: gridDimensions.height + 1 }, (_, i) => (
                        <line
                          key={`h-${i}`}
                          x1={0}
                          y1={i}
                          x2={gridDimensions.width}
                          y2={i}
                          stroke="#ffffff"
                          strokeWidth="0.7"
                          strokeOpacity="1.0"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </svg>
                  )}
                </>
              ) : (
                <div style={{color: THEME.textSecondary, fontSize: '14px'}}>No image selected</div>
              )}
            </div>
          </div>

          <div style={styles.controlsSection}>
            <div style={styles.controlsGrid}>
              <div style={styles.inputGroup}>
                <label htmlFor="terrainNameInput" style={styles.inputLabel}>Terrain Name</label>
                <input
                  id="terrainNameInput"
                  type="text"
                  value={terrainName}
                  onChange={(e) => setTerrainName(e.target.value)}
                  style={styles.input}
                  disabled={isProcessing || !uploadFile}
                  placeholder="Enter terrain name..."
                />
              </div>
              <div style={styles.inputGroup}>
                <label htmlFor="gridScaleSlider" style={styles.inputLabel}>Grid Scale</label>
                <input
                  id="gridScaleSlider"
                  type="range"
                  min="0.25"
                  max="2.0"
                  step="0.05"
                  value={gridScale}
                  onChange={(e) => handleGridScaleChange(e.target.value)}
                  style={styles.slider}
                  disabled={isProcessing || !uploadFile}
                />
                <div style={styles.sliderValue}>{gridScale} units/square ({gridDimensions.width}×{gridDimensions.height} grid)</div>
              </div>
              <div style={styles.inputGroup}>
                <label htmlFor="depthInput" style={styles.inputLabel}>Thickness</label>
                <input
                  id="depthInput"
                  type="text"
                  value={depthInput}
                  onChange={(e) => handleDepthChange(e.target.value)}
                  onBlur={handleDepthBlur}
                  style={styles.input}
                  disabled={isProcessing || !uploadFile}
                  placeholder="0.3"
                />
              </div>
            </div>
          </div>

          <div style={styles.buttonContainer}>
            <Button onClick={onCancel} variant="secondary" disabled={isProcessing}>Cancel</Button>
            <Button onClick={() => onUpload(terrainName, gridScale)} variant="primary" disabled={isProcessing || !uploadFile}>
              {isProcessing ? 'Creating...' : 'Create Terrain'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerrainUploadPopup; 