import React, { useState, useEffect, useCallback } from 'react';
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

  // Local state for the "master" size input by the user (can be string during input)
  const [masterSizeInput, setMasterSizeInput] = useState('10');
  // Local state for the depth input string
  const [depthInput, setDepthInput] = useState(terrainDimensions.depth ? terrainDimensions.depth.toString() : '0.1');

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
          
          const initialMasterSizeStr = '10';
          setMasterSizeInput(initialMasterSizeStr);
          // Initialize depthInput based on parent's terrainDimensions.depth or a default
          setDepthInput(terrainDimensions.depth ? terrainDimensions.depth.toString() : '0.1');
          
          const parsedMasterSize = parseFloat(initialMasterSizeStr) || 10;
          const parsedDepth = parseFloat(depthInput) || 0.1; // Use current depthInput or default
          updateParentDimensions(parsedMasterSize, aspectRatio, parsedDepth);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(uploadFile);
    } else {
      setImagePreview(null);
      setImageAspectRatio(1);
      setImagePixelDimensions({ width: 0, height: 0 });
      setMasterSizeInput('10'); // Reset master size input
      setDepthInput(terrainDimensions.depth ? terrainDimensions.depth.toString() : '0.1'); // Reset depth input
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFile]); // updateParentDimensions removed from deps to avoid loop, it's stable

  useEffect(() => {
    // Sync local depthInput if parent terrainDimensions.depth changes externally
    // and is different from what localDepth would parse to.
    const parentDepthStr = terrainDimensions.depth ? terrainDimensions.depth.toString() : '0.1';
    if (parseFloat(depthInput) !== terrainDimensions.depth) {
        setDepthInput(parentDepthStr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainDimensions.depth]);

  // Callback to update parent's terrainDimensions state
  const updateParentDimensions = useCallback((currentMasterSize, currentAspectRatio, currentDepth) => {
    let newWidth, newHeight;
    // Clamp masterSize for calculation
    const clampedMasterSize = Math.max(1, Math.min(100, currentMasterSize));

    if (currentAspectRatio >= 1) { // Landscape or square
      newWidth = clampedMasterSize;
      newHeight = clampedMasterSize / currentAspectRatio;
    } else { // Portrait
      newHeight = clampedMasterSize; 
      newWidth = clampedMasterSize * currentAspectRatio;
    }
    // Clamp depth for parent update
    const clampedDepth = Math.max(0.01, Math.min(5, currentDepth));

    setTerrainDimensions({ 
      width: parseFloat(newWidth.toFixed(2)),
      height: parseFloat(newHeight.toFixed(2)),
      depth: parseFloat(clampedDepth.toFixed(2))
    });
  }, [setTerrainDimensions]);

  // Handle master size input change
  const handleMasterSizeChange = (value) => {
    setMasterSizeInput(value);
    const newParsedMasterSize = parseFloat(value);
    if (!isNaN(newParsedMasterSize)) {
      // Update parent with potentially un-clamped value, clamping happens in updateParentDimensions
      updateParentDimensions(newParsedMasterSize, imageAspectRatio, parseFloat(depthInput) || 0.1);
    } else if (value === "" || value === "-") {
      // Allow empty or minus for typing, parent will use last valid or default
      // Or, decide on a default to pass if input is invalid for calculation
      updateParentDimensions(1, imageAspectRatio, parseFloat(depthInput) || 0.1); // Pass a default if current input is not a number
    }
  };
  
  const handleMasterSizeBlur = () => {
    let finalMasterSize = parseFloat(masterSizeInput);
    if (isNaN(finalMasterSize)) finalMasterSize = 10; // Default if invalid
    finalMasterSize = Math.max(1, Math.min(100, finalMasterSize)); // Clamp
    setMasterSizeInput(finalMasterSize.toString());
    updateParentDimensions(finalMasterSize, imageAspectRatio, parseFloat(depthInput) || 0.1);
  };

  // Handle depth input change
  const handleDepthChange = (value) => {
    setDepthInput(value);
    const newParsedDepth = parseFloat(value);
    const currentMaster = parseFloat(masterSizeInput) || 10;
    if (!isNaN(newParsedDepth)) {
      // Update parent with potentially un-clamped value, clamping happens in updateParentDimensions
      updateParentDimensions(currentMaster, imageAspectRatio, newParsedDepth);
    } else if (value === "" || value === "-") {
       updateParentDimensions(currentMaster, imageAspectRatio, 0.01); // Pass a default if current input is not a number
    }
  };

  const handleDepthBlur = () => {
    let finalDepth = parseFloat(depthInput);
    if (isNaN(finalDepth)) finalDepth = 0.1; // Default if invalid
    finalDepth = Math.max(0.01, Math.min(5, finalDepth)); // Clamp
    setDepthInput(finalDepth.toString());
    const currentMaster = parseFloat(masterSizeInput) || 10;
    updateParentDimensions(currentMaster, imageAspectRatio, finalDepth);
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
    popup: { backgroundColor: THEME.bgSecondary, borderRadius: '12px', borderWidth: '2px', borderStyle: 'solid', borderColor: THEME.accentPrimary, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' },
    header: { padding: '20px 20px 0 20px', borderBottom: `1px solid ${THEME.bgActive}`, marginBottom: '20px' },
    title: { fontSize: '20px', fontWeight: 'bold', color: THEME.accentPrimary, margin: 0, marginBottom: '8px' },
    subtitle: { fontSize: '14px', color: THEME.textSecondary, margin: 0, marginBottom: '15px' },
    content: { padding: '0 20px 20px 20px' },
    previewSection: { marginBottom: '25px' },
    previewLabel: { fontSize: '16px', fontWeight: '600', color: THEME.textPrimary, marginBottom: '12px', display: 'block' },
    imagePreviewContainer: { width: '100%', maxHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bgActive, borderRadius: '8px', overflow: 'hidden', borderWidth: '1px', borderStyle: 'solid', borderColor: THEME.bgActive },
    imagePreview: { maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' },
    imageInfo: { backgroundColor: THEME.bgActive, padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', color: THEME.textSecondary, lineHeight: 1.5 },
    dimensionsSection: { marginBottom: '25px' },
    dimensionsLabel: { fontSize: '16px', fontWeight: '600', color: THEME.textPrimary, marginBottom: '12px', display: 'block' },
    dimensionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    inputLabel: { fontSize: '14px', color: THEME.textPrimary, fontWeight: '500' },
    input: { backgroundColor: THEME.bgActive, borderWidth: '1px', borderStyle: 'solid', borderColor: THEME.textSecondary, borderRadius: '6px', padding: '10px 12px', color: THEME.textPrimary, fontSize: '14px', fontFamily: 'inherit' },
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
          <p style={styles.subtitle}>Adjust settings for your terrain model.</p>
        </div>
        <div style={styles.content}>
          <div style={styles.previewSection}>
            <label style={styles.previewLabel}>Image Preview</label>
            <div style={styles.imagePreviewContainer}>
              {imagePreview ? (
                <img src={imagePreview} alt="Terrain preview" style={styles.imagePreview} />
              ) : (
                <div style={{color: THEME.textSecondary, fontSize: '14px'}}>No image selected</div>
              )}
            </div>
          </div>

          {uploadFile && imagePixelDimensions.width > 0 && (
            <div style={styles.imageInfo}>
              <div>Original Image: {imagePixelDimensions.width} × {imagePixelDimensions.height} px</div>
              <div>Image Aspect Ratio: {imageAspectRatio.toFixed(2)} ({imageAspectRatio >= 1 ? 'Landscape/Square' : 'Portrait'})</div>
              <div>Calculated Terrain: {terrainDimensions.width.toFixed(1)} × {terrainDimensions.height.toFixed(1)} units (based on master size)</div>
            </div>
          )}

          <div style={styles.dimensionsSection}>
            <label style={styles.dimensionsLabel}>Terrain Model Dimensions</label>
            <div style={styles.dimensionsGrid}>
              <div style={styles.inputGroup}>
                <label htmlFor="masterSizeInput" style={styles.inputLabel}>Master Size (units)</label>
                <input
                  id="masterSizeInput"
                  type="text"
                  value={masterSizeInput}
                  onChange={(e) => handleMasterSizeChange(e.target.value)}
                  onBlur={handleMasterSizeBlur}
                  style={styles.input}
                  disabled={isProcessing || !uploadFile}
                />
              </div>
              <div style={styles.inputGroup}>
                <label htmlFor="depthInput" style={styles.inputLabel}>Thickness (units)</label>
                <input
                  id="depthInput"
                  type="text"
                  value={depthInput}
                  onChange={(e) => handleDepthChange(e.target.value)}
                  onBlur={handleDepthBlur}
                  style={styles.input}
                  disabled={isProcessing || !uploadFile}
                />
              </div>
            </div>
          </div>

          <div style={styles.buttonContainer}>
            <Button onClick={onCancel} variant="secondary" disabled={isProcessing}>Cancel</Button>
            <Button onClick={onUpload} variant="primary" disabled={isProcessing || !uploadFile}>
              {isProcessing ? 'Creating...' : 'Create Terrain'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerrainUploadPopup; 