import React, { useState, useRef } from 'react';
import CONFIG from '../config';

const LayoutGenerator = () => {
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
  const canvasRef = useRef(null);

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
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/layout/generate`, {
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

  const downloadJSON = () => {
    if (!layoutResult) return;
    
    const dataStr = JSON.stringify(layoutResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `layout_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `layout_${Date.now()}.png`;
    link.click();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Layout Generator</h1>
      
      <div style={styles.content}>
        <div style={styles.controls}>
          <h2 style={styles.sectionTitle}>Parameters</h2>
          
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
                <span>×</span>
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
          
          {error && (
            <div style={styles.error}>
              Error: {error}
            </div>
          )}
        </div>
        
        <div style={styles.visualization}>
          <h2 style={styles.sectionTitle}>Result</h2>
          
          {layoutResult && (
            <div style={styles.resultInfo}>
              <p>Generated {layoutResult.rooms?.length || 0} rooms with {layoutResult.doors?.length || 0} doors in {(layoutResult.generation_time * 1000).toFixed(1)}ms</p>
              <div style={styles.downloadButtons}>
                <button onClick={downloadJSON} style={styles.downloadButton}>
                  Download JSON
                </button>
                <button onClick={downloadImage} style={styles.downloadButton}>
                  Download Image
                </button>
              </div>
            </div>
          )}
          
          <div style={styles.canvasContainer}>
            <canvas ref={canvasRef} style={styles.canvas} />
          </div>
          
          {layoutResult && layoutResult.doors && layoutResult.doors.length > 0 && (
            <div style={styles.doorsSection}>
              <h3 style={styles.subsectionTitle}>Doors ({layoutResult.doors.length})</h3>
              <div style={styles.doorsList}>
                {layoutResult.doors.slice(0, 10).map(door => (
                  <div key={door.id} style={styles.doorItem}>
                    <span>Door {door.id}: </span>
                    <span style={styles.doorPosition}>({door.position[0]}, {door.position[1]})</span>
                    <span style={styles.doorType}>{door.type}</span>
                  </div>
                ))}
                {layoutResult.doors.length > 10 && (
                  <div style={styles.moreIndicator}>
                    ... and {layoutResult.doors.length - 10} more doors
                  </div>
                )}
              </div>
            </div>
          )}
          
          {layoutResult && (
            <div style={styles.legend}>
              <h3>Grid Legend:</h3>
              <div style={styles.legendItems}>
                {layoutResult.grid_key && Object.entries(layoutResult.grid_key).map(([value, info]) => (
                  <div key={value} style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: info.color}}></div>
                    <span>{info.name}: {info.description}</span>
                  </div>
                ))}
                {!layoutResult.grid_key && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    color: '#e0e0e0',
    backgroundColor: '#1a1a1a',
    minHeight: '100vh'
  },
  title: {
    textAlign: 'center',
    color: '#ff6b35',
    marginBottom: '30px',
    fontSize: '2.5rem'
  },
  content: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap'
  },
  controls: {
    flex: '1',
    minWidth: '300px',
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #404040'
  },
  visualization: {
    flex: '2',
    minWidth: '500px',
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #404040'
  },
  sectionTitle: {
    color: '#ff6b35',
    marginBottom: '20px',
    fontSize: '1.5rem'
  },
  paramGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '15px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  slider: {
    width: '100%',
    marginTop: '5px',
    height: '6px',
    backgroundColor: '#404040',
    outline: 'none',
    borderRadius: '3px'
  },
  select: {
    width: '100%',
    marginTop: '5px',
    padding: '8px',
    backgroundColor: '#404040',
    color: '#e0e0e0',
    border: '1px solid #666',
    borderRadius: '4px'
  },
  gridSizeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '5px'
  },
  numberInput: {
    width: '80px',
    padding: '8px',
    backgroundColor: '#404040',
    color: '#e0e0e0',
    border: '1px solid #666',
    borderRadius: '4px'
  },
  generateButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#ff6b35',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  generateButtonDisabled: {
    backgroundColor: '#666',
    cursor: 'not-allowed'
  },
  error: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#660000',
    color: '#ffcccc',
    borderRadius: '4px'
  },
  resultInfo: {
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#0a4d0a',
    borderRadius: '4px'
  },
  downloadButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  },
  downloadButton: {
    padding: '8px 16px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  canvasContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #404040'
  },
  canvas: {
    border: '2px solid #404040',
    borderRadius: '4px'
  },
  legend: {
    fontSize: '14px'
  },
  legendItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
    border: '1px solid #666'
  },
  doorsSection: {
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#0a4d0a',
    borderRadius: '4px'
  },
  subsectionTitle: {
    color: '#ff6b35',
    marginBottom: '10px',
    fontSize: '1.2rem'
  },
  doorsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  doorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  doorPosition: {
    fontSize: '12px',
    color: '#ff6b35'
  },
  doorType: {
    fontSize: '12px',
    color: '#ff6b35'
  },
  moreIndicator: {
    fontSize: '12px',
    color: '#ff6b35'
  }
};

export default LayoutGenerator; 