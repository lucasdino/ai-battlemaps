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

export default styles; 