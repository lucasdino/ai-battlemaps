import THEME from '../theme';

export const terrainViewerStyles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  },

  errorOverlay: {
    color: 'red',
    position: 'absolute',
    top: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.5)',
    padding: '10px',
    borderRadius: '5px',
    zIndex: 10
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.7)',
    zIndex: 20,
    color: 'white'
  },

  layoutVisualizationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: THEME.bgSecondary || '#282c34',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15
  },

  layoutVisualizationContainer: {
    background: THEME.bgLighter || '#3a3a3a',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #404040',
    maxWidth: '90%',
    maxHeight: '90%',
    overflow: 'auto'
  },

  layoutVisualizationTitle: {
    color: THEME.textPrimary || '#e0e0e0',
    textAlign: 'center',
    marginBottom: '20px'
  },

  layoutInfo: {
    marginBottom: '20px',
    textAlign: 'center'
  },

  layoutInfoText: {
    color: THEME.textSecondary || '#ccc',
    margin: '5px 0'
  },

  layoutErrorText: {
    color: '#ff6b6b',
    margin: '5px 0',
    fontSize: '16px'
  },

  canvasContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #404040',
    minHeight: '200px'
  },

  canvas: {
    border: '2px solid #404040',
    borderRadius: '4px',
    maxWidth: '100%',
    maxHeight: '500px',
    minWidth: '300px',
    minHeight: '300px',
    imageRendering: 'pixelated'
  },

  canvasPlaceholder: {
    textAlign: 'center',
    color: THEME.textSecondary || '#ccc'
  },

  canvasPlaceholderIcon: {
    fontSize: '48px',
    marginBottom: '10px'
  },

  buttonContainer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },

  placeAssetsButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },

  placeAssetsButtonDisabled: {
    cursor: 'not-allowed',
    opacity: 0.6
  },

  backToViewButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },

  legend: {
    marginTop: '20px'
  },

  legendTitle: {
    color: THEME.textPrimary || '#e0e0e0',
    marginBottom: '10px'
  },

  legendItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    justifyContent: 'center'
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

  legendText: {
    color: THEME.textSecondary || '#ccc',
    fontSize: '14px'
  },

  renderContainer: {
    width: '100%',
    height: '100%'
  },

  transformPanel: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 15,
    background: THEME.bgLighter,
    padding: '12px',
    borderRadius: '6px',
    border: `2px solid ${THEME.accent}`,
    minWidth: '200px'
  },

  transformPanelTitle: {
    color: THEME.textPrimary,
    fontWeight: 'bold',
    marginBottom: '8px'
  },

  transformPanelMode: {
    color: THEME.textSecondary,
    fontSize: '12px',
    marginBottom: '8px'
  },

  transformModeButtons: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '5px',
    marginBottom: '8px'
  },

  transformModeButton: {
    flexGrow: 1,
    fontSize: '10px',
    padding: '4px'
  },

  transformActionButton: {
    width: '100%',
    marginBottom: '5px'
  },

  deleteButton: {
    width: '100%',
    backgroundColor: THEME.dangerButton || '#dc3545',
    color: 'white'
  },

  controlsPanel: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 5,
    background: 'rgba(0, 0, 0, 0.8)',
    padding: '15px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '200px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },

  scaleControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '5px',
  },

  scaleLabel: {
    color: '#fff',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },

  scaleInput: {
    width: '60px',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    fontSize: '12px',
  },

  nameEditContainer: {
    display: 'flex',
    gap: '5px',
    width: '100%',
  },

  nameInput: {
    flex: 1,
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    fontSize: '12px',
  },

  viewLayoutButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    width: '100%',
  },

  // Terrain Name Header styles (matching ModelViewer)
  terrainNameHeader: {
    position: 'absolute',
    top: '15px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    background: 'rgba(0, 0, 0, 0.8)',
    padding: '8px 16px',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    minWidth: '200px',
    textAlign: 'center',
    pointerEvents: 'auto'
  },

  terrainNameContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },

  terrainNameInput: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    padding: '6px 12px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center',
    outline: 'none',
    width: '100%',
    minWidth: '150px'
  },

  terrainNameDisplay: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
    userSelect: 'none',
    pointerEvents: 'auto'
  }
}; 