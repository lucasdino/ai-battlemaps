import React, { useState, useRef, useEffect } from 'react';
import CONFIG from '../config';
import styles from '../styles/GenerateDungeonPopup';

const GenerateDungeonPopup = ({ isOpen, onClose, onDungeonGenerated }) => {
  const [params, setParams] = useState({
    rooms: 6,
    graph_type: 'mesh',
    room_scale: 3,
    margin: 3,
    max_attempts: 100,
    width: 40,
    height: 40
  });
  
  const [layoutResult, setLayoutResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isDesigning, setIsDesigning] = useState(false);
  const [designSuccess, setDesignSuccess] = useState(null);
  const [layoutName, setLayoutName] = useState('');
  const [dungeonPrompt, setDungeonPrompt] = useState('');
  const [isGenerateHovered, setIsGenerateHovered] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add custom CSS for slider styling
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-track {
        background: #444;
        height: 6px;
        border-radius: 3px;
      }
      input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        background: #FF6B35;
        height: 18px;
        width: 18px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #E55A2B;
      }
      input[type="range"]::-moz-range-track {
        background: #444;
        height: 6px;
        border-radius: 3px;
        border: none;
      }
      input[type="range"]::-moz-range-thumb {
        background: #FF6B35;
        height: 18px;
        width: 18px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      input[type="range"]::-moz-range-thumb:hover {
        background: #E55A2B;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.head.removeChild(style);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!document.head.querySelector('style[data-generate-dungeon-spinner]')) {
      const style = document.createElement('style');
      style.setAttribute('data-generate-dungeon-spinner', 'true');
      style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  }, []);

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

  const saveInitialLayout = async (layoutData) => {
    try {
      // Generate a unique name for the initial layout
      const timestamp = Date.now();
      const layoutName = `Layout_${timestamp}`;
      
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/terrains/save-layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layoutData: layoutData,
          layoutName: layoutName
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.message) {
        console.log('Initial layout saved successfully:', data);
        // Call the callback to refresh the terrain list
        if (onDungeonGenerated) {
          onDungeonGenerated();
        }
      } else {
        console.warn('Failed to save initial layout:', data.error);
      }
    } catch (err) {
      console.warn('Error saving initial layout:', err);
      // Don't show error to user as this is a background operation
    }
  };

  const drawLayout = (grid) => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    
    const ctx = canvas.getContext('2d');
    // Fixed canvas size regardless of grid dimensions
    const canvasWidth = 300;
    const canvasHeight = 300;
    const cellWidth = canvasWidth / grid[0].length;
    const cellHeight = canvasHeight / grid.length;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Not splitting out these specifically since agent will plan the dungeon
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
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        
        // Add grid lines for better visibility
        if (cell !== 0) {
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
      });
    });
  };

  const designDungeon = async () => {
    if (!layoutResult || !layoutName.trim()) {
      setError('Please generate a layout and enter a name before designing the dungeon');
      return;
    }

    setIsDesigning(true);
    setError(null);
    setDesignSuccess(null);

    try {
      const requestPayload = {
        dungeon_data: layoutResult,
        dungeon_design_prompt: dungeonPrompt.trim() || null,
        layout_name: layoutName.trim()
      };

      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DUNGEON.GENERATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setDesignSuccess(`Dungeon "${layoutName}" is being designed in the background! You'll find it in your dungeon library once complete.`);
        setLayoutName(''); // Clear the name input
        setDungeonPrompt(''); // Clear the prompt input
        
        // Call the callback to refresh the terrain list
        if (onDungeonGenerated) {
          onDungeonGenerated();
        }
        
        setTimeout(() => {
          setDesignSuccess(null);
          onClose(); // Close popup after successful submission
        }, 3000);
      } else {
        setError(data.error || 'Failed to start dungeon design');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Dungeon design error:', err);
    } finally {
      setIsDesigning(false);
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
                  min="4"
                  max="10"
                  value={params.rooms || 6}
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
                  min="3"
                  max="6"
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
                    min="30"
                    max="50"
                    value={params.width || 40}
                    onChange={(e) => handleParamChange('width', e.target.value)}
                    style={styles.numberInput}
                    placeholder="Width"
                  />
                  <span style={{color: '#fff', margin: '0 8px'}}>×</span>
                  <input
                    type="number"
                    min="30"
                    max="75"
                    value={params.height || 40}
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
              onMouseEnter={() => setIsGenerateHovered(true)}
              onMouseLeave={() => setIsGenerateHovered(false)}
              style={{
                ...styles.generateButton,
                ...(isGenerating ? styles.generateButtonDisabled : {}),
                ...(isGenerateHovered && !isGenerating ? { backgroundColor: '#E55A2B' } : {})
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Layout'}
            </button>
          </div>
          
          <div style={styles.rightPanel}>
            <h3 style={styles.sectionTitle}>Preview</h3>
            
            <div style={styles.canvasContainer}>
              <canvas ref={canvasRef} style={styles.canvas} />
            </div>
            
            {layoutResult && (
              <div style={styles.legend}>
                <h4 style={styles.legendTitle}>Legend:</h4>
                <div style={styles.legendItems}>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#32CD32'}}></div>
                    <span>Entrance Room</span>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={{...styles.legendColor, backgroundColor: '#FF6B35'}}></div>
                    <span>Door</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Design Dungeon Section - Now at bottom with full width */}
        {layoutResult && (
          <div style={styles.designSection}>
            <div style={styles.designControls}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  Name
                  <input
                    type="text"
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    placeholder="My Dungeon"
                    style={styles.nameInput}
                  />
                </label>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  Theme (Optional)
                  <input
                    type="text"
                    value={dungeonPrompt}
                    onChange={(e) => setDungeonPrompt(e.target.value)}
                    placeholder="Basement of a wealthy vampire's castle"
                    style={styles.promptInput}
                  />
                </label>
              </div>
              
              <button
                onClick={designDungeon}
                disabled={isDesigning || !layoutName.trim()}
                style={{
                  ...styles.designButton,
                  ...(isDesigning || !layoutName.trim() ? styles.designButtonDisabled : {})
                }}
              >
                {isDesigning ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: 18,
                      height: 18,
                      border: '3px solid #fff',
                      borderTop: '3px solid #FF6B35',
                      borderRadius: '50%',
                      marginRight: 10,
                      verticalAlign: 'middle',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Starting Design Process...
                  </>
                ) : (
                  'Let AI Do Its Thing'
                )}
              </button>
            </div>
            
            {error && (
              <div style={styles.error}>
                Error: {error}
              </div>
            )}
            
            {designSuccess && (
              <div style={styles.success}>
                {designSuccess}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateDungeonPopup; 