import React, { useRef, useEffect } from 'react';

const DungeonLayoutPopup = ({ 
  isOpen, 
  onClose, 
  layoutVisualizationData
}) => {
  const layoutCanvasRef = useRef(null);

  // function to draw layout visualization on canvas
  const drawLayoutVisualization = (layoutData) => {
    const canvas = layoutCanvasRef.current;
    if (!canvas || !layoutData || !layoutData.grid) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    const grid = layoutData.grid;
    const cellSize = 6; // Match GenerateDungeonPopup for better visibility
    
    canvas.width = grid[0].length * cellSize;
    canvas.height = grid.length * cellSize;
    
    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Use the same color scheme as GenerateDungeonPopup
    const colors = {
      0: '#1a1a1a',  // Empty - dark
      1: '#000000',  // Floor - white
      2: '#404040',  // Wall - gray
      3: '#000000',  // Corridor - white
      4: '#FF6B35',  // Door - orange
      5: '#000000',  // Treasure - white
      6: '#32CD32',  // Entrance - green
      7: '#000000'   // Boss - white
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
    if (isOpen && layoutVisualizationData && layoutVisualizationData.grid) {
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

  // Standard popup styles matching other popups on the site
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    
    modal: {
      backgroundColor: '#2a2a2a',
      borderRadius: '12px',
      width: '90vw',
      maxWidth: '700px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '1px solid #444',
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      borderBottom: '1px solid #444',
      backgroundColor: '#333',
    },
    
    title: {
      color: '#fff',
      margin: 0,
      fontSize: '20px',
      fontWeight: 'bold',
    },
    
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: '#fff',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '0',
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
    },
    
    content: {
      flex: 1,
      padding: '20px',
      overflowY: 'auto',
      backgroundColor: '#1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    
    canvasContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px',
      backgroundColor: '#000',
      borderRadius: '8px',
      padding: '20px',
      border: '1px solid #444',
      minHeight: '300px',
      minWidth: '400px',
    },
    
    canvas: {
      border: '1px solid #555',
      borderRadius: '4px',
      imageRendering: 'pixelated',
    },
    
    canvasPlaceholder: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ccc',
      fontSize: '14px',
      textAlign: 'center',
      minHeight: '200px',
    },
    
    canvasPlaceholderIcon: {
      fontSize: '48px',
      marginBottom: '15px',
    },
    
    legend: {
      backgroundColor: '#333',
      borderRadius: '8px',
      padding: '15px',
      border: '1px solid #555',
      width: '100%',
      maxWidth: '400px',
    },
    
    legendTitle: {
      color: '#fff',
      fontSize: '14px',
      marginBottom: '10px',
      fontWeight: 'bold',
    },
    
    legendItems: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
    },
    
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    
    legendColor: {
      width: '16px',
      height: '16px',
      borderRadius: '2px',
      border: '1px solid #666',
    },
    
    legendText: {
      color: '#fff',
      fontSize: '12px',
    },
    
    infoText: {
      color: '#ccc',
      marginBottom: '20px',
      textAlign: 'center',
      fontSize: '14px',
    },
    
    errorText: {
      color: '#ff6b6b',
      marginBottom: '20px',
      textAlign: 'center',
      fontSize: '14px',
    },
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Dungeon Layout</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.canvasContainer}>
            {layoutVisualizationData && layoutVisualizationData.grid ? (
              <canvas ref={layoutCanvasRef} style={styles.canvas} />
            ) : layoutVisualizationData ? (
              <div style={styles.canvasPlaceholder}>
                <div style={styles.canvasPlaceholderIcon}>⚠️</div>
                <p>Layout data found but missing grid</p>
                <p>Available keys: {Object.keys(layoutVisualizationData).join(', ')}</p>
              </div>
            ) : (
              <div style={styles.canvasPlaceholder}>
                <div style={styles.canvasPlaceholderIcon}>🗺️</div>
                <p>Layout visualization not available</p>
              </div>
            )}
          </div>

          {/* Legend */}
          {layoutVisualizationData && (
            <div style={styles.legend}>
              <h3 style={styles.legendTitle}>Legend:</h3>
              <div style={styles.legendItems}>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendColor, backgroundColor: '#32CD32'}}></div>
                  <span style={styles.legendText}>Entrance Room</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendColor, backgroundColor: '#FF6B35'}}></div>
                  <span style={styles.legendText}>Door</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DungeonLayoutPopup; 