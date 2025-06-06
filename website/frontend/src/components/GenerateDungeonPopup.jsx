import React, { useState, useRef, useEffect } from 'react';
import CONFIG from '../config';

const GenerateDungeonPopup = ({ isOpen, onClose, onDungeonGenerated }) => {
  const [params, setParams] = useState({
    rooms: 8,
    graph_type: 'linear',
    room_scale: 3,
    margin: 3,
    max_attempts: 100,
    width: 50,
    height: 50
  });
  
  const [layoutResult, setLayoutResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [layoutName, setLayoutName] = useState('');
  const canvasRef = useRef(null);

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

  const handleParamChange = (key, value) => {
    // Handle numeric conversions with proper validation
    if (typeof value === 'string' && ['rooms', 'room_scale', 'width', 'height', 'margin', 'max_attempts'].includes(key)) {
      const numValue = parseInt(value);
      const validatedValue = isNaN(numValue) ? params[key] : numValue; // Keep current value if NaN
      setParams(prev => ({ ...prev, [key]: validatedValue }));
    } else {
      setParams(prev => ({ ...prev, [key]: value }));
    }
  };

  const generateLayout = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${CONFIG.API.LAYOUT_BASE_URL}${CONFIG.API.ENDPOINTS.LAYOUT.GENERATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLayoutResult(data);
        drawLayout(data.grid);
      } else {
        setError(data.error || 'Layout generation failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Layout generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const drawLayout = (grid) => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = 6; // Smaller for popup
    
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

  const saveLayout = async () => {
    if (!layoutResult || !layoutName.trim()) {
      setError('Please generate a layout and enter a name before saving');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const layoutData = {
        ...layoutResult,
        params: params,
        savedAt: new Date().toISOString()
      };

      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TERRAINS.SAVE_LAYOUT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layoutData: layoutData,
          layoutName: layoutName.trim()
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSaveSuccess(`Layout "${layoutName}" saved successfully as dungeon!`);
        setLayoutName(''); // Clear the name input
        
        // Call the callback to refresh the terrain list
        if (onDungeonGenerated) {
          onDungeonGenerated();
        }
        
        setTimeout(() => {
          setSaveSuccess(null);
          onClose(); // Close popup after successful save
        }, 2000);
      } else {
        setError(data.error || 'Failed to save layout');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Layout save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Generate Dungeon Layout</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.leftPanel}>
            <h3 style={styles.sectionTitle}>Parameters</h3>
            
            <div style={styles.paramGroup}>
              <label style={styles.label}>
                Rooms: {params.rooms}
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={params.rooms || 8}
                  onChange={(e) => handleParamChange('rooms', e.target.value)}
                  style={styles.slider}
                />
              </label>
              
              <label style={styles.label}>
                Graph Type:
                <select
                  value={params.graph_type}
                  onChange={(e) => handleParamChange('graph_type', e.target.value)}
                  style={styles.select}
                >
                  <option value="linear">Linear</option>
                  <option value="tree">Tree</option>
                  <option value="mesh">Mesh</option>
                </select>
              </label>
              
              <label style={styles.label}>
                Room Scale: {params.room_scale}
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={params.room_scale || 3}
                  onChange={(e) => handleParamChange('room_scale', e.target.value)}
                  style={styles.slider}
                />
              </label>
              
              <label style={styles.label}>
                Grid Size:
                <div style={styles.gridSizeControls}>
                  <input
                    type="number"
                    value={params.width || 50}
                    onChange={(e) => handleParamChange('width', e.target.value)}
                    style={styles.numberInput}
                    placeholder="Width"
                  />
                  <span style={{color: '#fff', margin: '0 8px'}}>×</span>
                  <input
                    type="number"
                    value={params.height || 50}
                    onChange={(e) => handleParamChange('height', e.target.value)}
                    style={styles.numberInput}
                    placeholder="Height"
                  />
                </div>
              </label>
            </div>
            
            <button
              onClick={generateLayout}
              disabled={isGenerating}
              style={{
                ...styles.generateButton,
                ...(isGenerating ? styles.generateButtonDisabled : {})
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Layout'}
            </button>
            
            {layoutResult && (
              <div style={styles.saveSection}>
                <h4 style={styles.saveTitle}>Save Layout</h4>
                <label style={styles.label}>
                  Layout Name:
                  <input
                    type="text"
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    placeholder="Enter layout name..."
                    style={styles.nameInput}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && layoutName.trim() && !isSaving) {
                        saveLayout();
                      }
                    }}
                  />
                </label>
                <button
                  onClick={saveLayout}
                  disabled={isSaving || !layoutName.trim()}
                  style={{
                    ...styles.saveButton,
                    ...(isSaving || !layoutName.trim() ? styles.saveButtonDisabled : {})
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save as Dungeon 🏰'}
                </button>
              </div>
            )}
            
            {error && (
              <div style={styles.error}>
                Error: {error}
              </div>
            )}
            
            {saveSuccess && (
              <div style={styles.success}>
                {saveSuccess}
              </div>
            )}
          </div>
          
          <div style={styles.rightPanel}>
            <h3 style={styles.sectionTitle}>Preview</h3>
            
            {layoutResult && (
              <div style={styles.resultInfo}>
                <p style={styles.infoText}>
                  Generated {layoutResult.rooms?.length || 0} rooms with {layoutResult.doors?.length || 0} doors 
                  in {(layoutResult.generation_time * 1000).toFixed(1)}ms
                </p>
              </div>
            )}
            
            <div style={styles.canvasContainer}>
              <canvas ref={canvasRef} style={styles.canvas} />
            </div>
            
            {layoutResult && (
              <div style={styles.legend}>
                <h4 style={styles.legendTitle}>Legend:</h4>
                <div style={styles.legendItems}>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#8B4513'}}></div>
                    <span>Floor</span>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#404040'}}></div>
                    <span>Wall</span>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#FF6B35'}}></div>
                    <span>Door</span>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#32CD32'}}></div>
                    <span>Entrance</span>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#DC143C'}}></div>
                    <span>Boss Room</span>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#FFD700'}}></div>
                    <span>Treasure</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
    maxWidth: '900px',
    height: '80vh',
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
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  
  leftPanel: {
    width: '300px',
    padding: '20px',
    borderRight: '1px solid #444',
    overflowY: 'auto',
    backgroundColor: '#2a2a2a',
  },
  
  rightPanel: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#1e1e1e',
  },
  
  sectionTitle: {
    color: '#fff',
    fontSize: '16px',
    marginBottom: '15px',
    fontWeight: 'bold',
  },
  
  paramGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px',
  },
  
  label: {
    color: '#fff',
    fontSize: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  
  slider: {
    width: '100%',
    height: '6px',
    backgroundColor: '#444',
    borderRadius: '3px',
    outline: 'none',
  },
  
  select: {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  
  gridSizeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  numberInput: {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    outline: 'none',
    width: '80px',
  },
  
  generateButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    width: '100%',
  },
  
  generateButtonDisabled: {
    backgroundColor: '#555',
    cursor: 'not-allowed',
  },
  
  saveSection: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#333',
    borderRadius: '8px',
    border: '1px solid #555',
  },
  
  saveTitle: {
    color: '#fff',
    fontSize: '14px',
    marginBottom: '10px',
    fontWeight: 'bold',
  },
  
  nameInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  },
  
  saveButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    width: '100%',
    marginTop: '10px',
  },
  
  saveButtonDisabled: {
    backgroundColor: '#555',
    cursor: 'not-allowed',
  },
  
  error: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#dc3545',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '14px',
  },
  
  success: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#28a745',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '14px',
  },
  
  resultInfo: {
    marginBottom: '15px',
  },
  
  infoText: {
    color: '#ccc',
    fontSize: '13px',
    margin: 0,
  },
  
  canvasContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
    backgroundColor: '#000',
    borderRadius: '8px',
    padding: '10px',
    border: '1px solid #444',
  },
  
  canvas: {
    maxWidth: '100%',
    maxHeight: '300px',
    border: '1px solid #555',
  },
  
  legend: {
    backgroundColor: '#333',
    borderRadius: '8px',
    padding: '15px',
    border: '1px solid #555',
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
};

export default GenerateDungeonPopup; 