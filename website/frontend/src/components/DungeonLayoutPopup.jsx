import React, { useRef, useEffect } from 'react';
import { terrainViewerStyles } from '../styles/TerrainViewer';

const DungeonLayoutPopup = ({ 
  isOpen, 
  onClose, 
  layoutVisualizationData, 
  onPlaceAssets,
  isPlacingAssets 
}) => {
  const layoutCanvasRef = useRef(null);

  // function to draw layout visualization on canvas
  const drawLayoutVisualization = (layoutData) => {
    const canvas = layoutCanvasRef.current;
    if (!canvas || !layoutData || !layoutData.grid) return;
    
    const ctx = canvas.getContext('2d');
    const grid = layoutData.grid;
    const cellSize = 8;
    
    canvas.width = grid[0].length * cellSize;
    canvas.height = grid.length * cellSize;
    
    const colors = {
      0: '#1a1a1a',  // Empty - dark
      1: '#8B4513',  // Floor - brown
      2: '#404040',  // Wall - gray
      3: '#D2B48C',  // Corridor - tan
      4: '#FF6B35',  // Door - orange
      5: '#FFD700',  // Treasure - gold
      6: '#32CD32',  // Entrance - green
      7: '#DC143C'   // Boss - red
    };
    
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        ctx.fillStyle = colors[cell] || '#000000';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        
        // Add grid lines for better visibility
        if (cell !== 0) {
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      });
    });
  };

  useEffect(() => {
    if (isOpen && layoutVisualizationData) {
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        drawLayoutVisualization(layoutVisualizationData);
      }, 100);
    }
  }, [isOpen, layoutVisualizationData]);

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

  return (
    <div style={terrainViewerStyles.layoutVisualizationOverlay} onClick={handleOverlayClick}>
      <div style={terrainViewerStyles.layoutVisualizationContainer}>
        <h2 style={terrainViewerStyles.layoutVisualizationTitle}>
          Dungeon Layout Visualization
        </h2>
        
        {layoutVisualizationData ? (
          <div style={terrainViewerStyles.layoutInfo}>
            <p style={terrainViewerStyles.layoutInfoText}>
              Layout: {layoutVisualizationData.parameters?.rooms || 'Unknown'} rooms, 
              {layoutVisualizationData.parameters?.graph_type || 'Unknown'} type
            </p>
            <p style={terrainViewerStyles.layoutInfoText}>
              Generated in {((layoutVisualizationData.generation_time || 0) * 1000).toFixed(1)}ms
            </p>
          </div>
        ) : (
          <div style={terrainViewerStyles.layoutInfo}>
            <p style={terrainViewerStyles.layoutErrorText}>
              ⚠️ Could not load layout data
            </p>
            <p style={terrainViewerStyles.layoutInfoText}>
              The layout file may be missing or corrupted. You can still use the "Place Assets" feature.
            </p>
          </div>
        )}
        
        <div style={terrainViewerStyles.canvasContainer}>
          {layoutVisualizationData ? (
            <canvas ref={layoutCanvasRef} style={terrainViewerStyles.canvas} />
          ) : (
            <div style={terrainViewerStyles.canvasPlaceholder}>
              <div style={terrainViewerStyles.canvasPlaceholderIcon}>🗺️</div>
              <p>Layout visualization not available</p>
            </div>
          )}
        </div>
        
        <div style={terrainViewerStyles.buttonContainer}>
          <button
            onClick={onPlaceAssets}
            disabled={isPlacingAssets}
            style={{
              ...terrainViewerStyles.placeAssetsButton,
              ...(isPlacingAssets ? terrainViewerStyles.placeAssetsButtonDisabled : {})
            }}
          >
            {isPlacingAssets ? 'Placing Assets...' : 'Place Assets 🤖'}
          </button>
          
          <button
            onClick={onClose}
            style={terrainViewerStyles.backToViewButton}
          >
            Back to 3D View
          </button>
        </div>

        {/* Legend */}
        {layoutVisualizationData && layoutVisualizationData.grid_key && (
          <div style={terrainViewerStyles.legend}>
            <h3 style={terrainViewerStyles.legendTitle}>Legend:</h3>
            <div style={terrainViewerStyles.legendItems}>
              {Object.entries(layoutVisualizationData.grid_key).map(([value, info]) => (
                <div key={value} style={terrainViewerStyles.legendItem}>
                  <div style={{
                    ...terrainViewerStyles.legendColor,
                    backgroundColor: info.color
                  }}></div>
                  <span style={terrainViewerStyles.legendText}>
                    {info.name}: {info.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DungeonLayoutPopup; 