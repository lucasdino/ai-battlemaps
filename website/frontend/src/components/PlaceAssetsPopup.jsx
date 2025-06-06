import React, { useState, useEffect } from 'react';
import { placeAssetsStyles } from '../styles/PlaceAssets';

const PlaceAssetsPopup = ({ 
  isOpen, 
  onClose, 
  terrainData, 
  layoutVisualizationData, 
  onPlaceAssets,
  isPlacing = false 
}) => {
  const [hoverStates, setHoverStates] = useState({});

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

  const handleMouseEnter = (buttonType) => {
    setHoverStates(prev => ({ ...prev, [buttonType]: true }));
  };

  const handleMouseLeave = (buttonType) => {
    setHoverStates(prev => ({ ...prev, [buttonType]: false }));
  };

  const getButtonStyle = (baseStyle, hoverStyle, disabled = false) => {
    if (disabled) return { ...baseStyle, ...placeAssetsStyles.primaryButtonDisabled };
    return hoverStates.primary ? { ...baseStyle, ...hoverStyle } : baseStyle;
  };

  const getSecondaryButtonStyle = () => {
    return hoverStates.secondary 
      ? { ...placeAssetsStyles.secondaryButton, ...placeAssetsStyles.secondaryButtonHover }
      : placeAssetsStyles.secondaryButton;
  };

  return (
    <div style={placeAssetsStyles.overlay} onClick={handleOverlayClick}>
      <div style={placeAssetsStyles.modal}>
        <div style={placeAssetsStyles.header}>
          <h2 style={placeAssetsStyles.title}>
            Place Assets on {terrainData?.name || 'Terrain'}
          </h2>
          <button 
            style={placeAssetsStyles.closeButton}
            onClick={onClose}
            onMouseEnter={() => handleMouseEnter('close')}
            onMouseLeave={() => handleMouseLeave('close')}
          >
            ✕
          </button>
        </div>

        <div style={placeAssetsStyles.content}>
          {/* Information Section */}
          <div style={placeAssetsStyles.infoSection}>
            <h3 style={placeAssetsStyles.infoTitle}>🤖 AI Asset Placement</h3>
            <p style={placeAssetsStyles.infoText}>
              Our AI agent will automatically analyze your terrain and place appropriate assets 
              based on the layout and environment. This includes:
            </p>
            <ul style={{ ...placeAssetsStyles.infoText, paddingLeft: '20px' }}>
              <li>Strategic placement of decorative objects</li>
              <li>Environmental assets that match the terrain type</li>
              <li>Proper scaling and positioning for optimal gameplay</li>
              <li>Collision-aware placement to avoid obstacles</li>
            </ul>
            <p style={placeAssetsStyles.infoText}>
              <span style={placeAssetsStyles.warningText}>Note:</span> This will replace any existing manually placed assets.
            </p>
          </div>

          {/* Terrain Parameters */}
          {terrainData && (
            <div style={placeAssetsStyles.parametersSection}>
              <h3 style={placeAssetsStyles.infoTitle}>📐 Terrain Information</h3>
              <div style={placeAssetsStyles.parametersGrid}>
                <div style={placeAssetsStyles.parameterItem}>
                  <span style={placeAssetsStyles.parameterLabel}>Name:</span>
                  <span style={placeAssetsStyles.parameterValue}>{terrainData.name}</span>
                </div>
                <div style={placeAssetsStyles.parameterItem}>
                  <span style={placeAssetsStyles.parameterLabel}>Type:</span>
                  <span style={placeAssetsStyles.parameterValue}>
                    {terrainData.isDungeonLayout ? 'Dungeon Layout' : 'Terrain Model'}
                  </span>
                </div>
                {terrainData.scale && (
                  <div style={placeAssetsStyles.parameterItem}>
                    <span style={placeAssetsStyles.parameterLabel}>Scale:</span>
                    <span style={placeAssetsStyles.parameterValue}>{terrainData.scale}x</span>
                  </div>
                )}
                {terrainData.dimensions && (
                  <>
                    <div style={placeAssetsStyles.parameterItem}>
                      <span style={placeAssetsStyles.parameterLabel}>Width:</span>
                      <span style={placeAssetsStyles.parameterValue}>
                        {Math.round(terrainData.dimensions.width)} units
                      </span>
                    </div>
                    <div style={placeAssetsStyles.parameterItem}>
                      <span style={placeAssetsStyles.parameterLabel}>Depth:</span>
                      <span style={placeAssetsStyles.parameterValue}>
                        {Math.round(terrainData.dimensions.depth)} units
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Layout Parameters for Dungeon Layouts */}
          {layoutVisualizationData && layoutVisualizationData.parameters && (
            <div style={placeAssetsStyles.parametersSection}>
              <h3 style={placeAssetsStyles.infoTitle}>🏰 Layout Parameters</h3>
              <div style={placeAssetsStyles.parametersGrid}>
                {Object.entries(layoutVisualizationData.parameters).map(([key, value]) => (
                  <div key={key} style={placeAssetsStyles.parameterItem}>
                    <span style={placeAssetsStyles.parameterLabel}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                    </span>
                    <span style={placeAssetsStyles.parameterValue}>
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Section */}
          <div style={placeAssetsStyles.statusSection}>
            <div style={placeAssetsStyles.statusIndicator}>
              <span style={placeAssetsStyles.statusIcon}>
                {isPlacing ? '⚙️' : '✅'}
              </span>
              <div>
                <div style={placeAssetsStyles.statusText}>
                  {isPlacing ? 'Placing Assets...' : 'Ready for Asset Placement'}
                </div>
                <div style={placeAssetsStyles.statusDescription}>
                  {isPlacing 
                    ? 'The AI agent is analyzing your terrain and placing assets. This may take a few moments.'
                    : 'Click "Place Assets" to begin automatic asset placement using AI.'
                  }
                </div>
              </div>
            </div>

            {isPlacing && (
              <div style={placeAssetsStyles.progressBar}>
                <div 
                  style={{
                    ...placeAssetsStyles.progressFill,
                    width: '100%',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={placeAssetsStyles.actionButtons}>
          <button
            style={getSecondaryButtonStyle()}
            onClick={onClose}
            onMouseEnter={() => handleMouseEnter('secondary')}
            onMouseLeave={() => handleMouseLeave('secondary')}
            disabled={isPlacing}
          >
            Cancel
          </button>
          <button
            style={getButtonStyle(
              placeAssetsStyles.primaryButton,
              placeAssetsStyles.primaryButtonHover,
              isPlacing
            )}
            onClick={onPlaceAssets}
            onMouseEnter={() => handleMouseEnter('primary')}
            onMouseLeave={() => handleMouseLeave('primary')}
            disabled={isPlacing}
          >
            {isPlacing && (
              <span style={placeAssetsStyles.loadingSpinner} />
            )}
            {isPlacing ? 'Placing Assets...' : 'Place Assets 🤖'}
          </button>
        </div>

        {/* CSS for animations */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PlaceAssetsPopup; 