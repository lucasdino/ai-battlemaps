import THEME from '../theme';

// Animation keyframes
export const KEYFRAMES = {
  SPIN: 'spin'
};

const styles = {
  // Container styles
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  canvasContainer: {
    width: '100%', 
    flexGrow: 1,
    position: 'relative',
    borderRadius: '4px',
    overflow: 'hidden',
    outline: 'none',
    border: '1px solid transparent',
  },
  
  // Loading overlay styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    zIndex: 10,
    pointerEvents: 'auto',
    opacity: 1,
    transition: 'opacity 0.3s ease',
  },
  loadingOverlayHidden: {
    pointerEvents: 'none',
    opacity: 0,
  },
  loadingProgress: {
    width: '60%',
    height: '8px',
    backgroundColor: THEME.bgActive,
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '15px',
  },
  loadingProgressBar: {
    height: '100%',
    width: '0%',
    backgroundColor: THEME.accentPrimary,
    transition: 'width 0.3s ease',
  },
  loadingText: {
    color: THEME.textPrimary,
    fontSize: '16px',
    marginBottom: '8px',
  },
  loadingPercentage: {
    color: THEME.accentPrimary,
    fontSize: '14px',
    marginTop: '8px',
  },
  loadingError: {
    color: THEME.errorText,
    backgroundColor: THEME.errorBg,
    padding: '10px 15px',
    borderRadius: '4px',
    margin: '15px',
    textAlign: 'center',
  },

  // Model name header styles
  modelNameHeader: {
    position: 'absolute',
    top: '10px',
    left: '0',
    right: '0',
    textAlign: 'center',
    zIndex: 10,
    pointerEvents: 'auto'
  },
  modelNameContainer: {
    display: 'inline-block',
    background: 'rgba(0,0,0,0.6)',
    padding: '5px 10px',
    borderRadius: '4px'
  },
  modelNameInput: {
    background: 'transparent',
    border: `1px solid ${THEME.primary}`,
    color: THEME.textPrimary,
    padding: '5px 8px',
    borderRadius: '3px',
    fontSize: '16px',
    fontWeight: '500',
    minWidth: '200px',
  },
  modelNameDisplay: {
    display: 'inline-block',
    background: 'rgba(0,0,0,0.6)',
    padding: '5px 15px',
    borderRadius: '4px',
    color: THEME.textPrimary,
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  // Delete button container
  deleteButtonContainer: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 10,
  },

  // Action buttons container
  actionButtonsContainer: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'flex-end'
  },

  // Delete confirmation dialog
  deleteConfirmDialog: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: '20px',
    borderRadius: '8px',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    minWidth: '300px'
  },
  deleteConfirmTitle: {
    color: THEME.textPrimary,
    margin: '0 0 10px 0',
    textAlign: 'center'
  },
  deleteConfirmText: {
    color: THEME.textSecondary,
    margin: '0 0 15px 0',
    textAlign: 'center',
    fontSize: '14px'
  },
  deleteConfirmButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },
  cancelButton: {
    padding: '8px 20px',
    backgroundColor: 'transparent',
    color: THEME.textPrimary,
    border: `1px solid ${THEME.textSecondary}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '8px 20px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    animation: 'spin 1s linear infinite'
  },
  disabledButton: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  
  // Download buttons styles
  downloadButtonsContainer: {
    display: 'flex', 
    justifyContent: 'center', 
    marginTop: '10px' 
  },
  downloadButton: {
    backgroundColor: '#ff5e3a',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    margin: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 5px rgba(255, 94, 58, 0.3)',
    transform: 'translateY(0)',
    position: 'relative',
    overflow: 'hidden',
    outline: 'none',
  },
  downloadButtonHover: {
    backgroundColor: '#ff3b1c',
    boxShadow: '0 4px 8px rgba(255, 59, 28, 0.5)',
    transform: 'translateY(-2px)',
  },
  downloadButtonActive: {
    transform: 'translateY(1px)',
  },
};

// Helper function to get button style based on state
export const getButtonStyle = (isHovered, isActive) => {
  return {
    ...styles.downloadButton,
    ...(isHovered && !isActive ? styles.downloadButtonHover : {}),
    ...(isActive ? styles.downloadButtonActive : {})
  };
};

// Helper function to get loading overlay style based on loading state
export const getLoadingOverlayStyle = (isLoading) => {
  return {
    ...styles.loadingOverlay,
    ...(isLoading ? {} : styles.loadingOverlayHidden)
  };
};

// Helper function to get action button style
export const getActionButtonStyle = (isHovered, isActive, isPrimary = false, isDanger = false) => {
  return {
    background: isDanger 
      ? (isHovered ? '#ff5252' : '#e74c3c') 
      : isPrimary 
        ? (isHovered ? '#4dabf7' : THEME.primary) 
        : (isHovered ? '#f3a653' : '#e67e22'),
    border: isPrimary && !isDanger ? '2px solid white' : 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    marginLeft: '6px',
    transition: 'none',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
  };
};

export default styles; 