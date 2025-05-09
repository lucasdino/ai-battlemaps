import THEME from '../theme';

// Media query breakpoint
export const MOBILE_BREAKPOINT = 768;
export const SINGLE_COLUMN_BREAKPOINT = 480;

// Add keyframe names
export const KEYFRAMES = {
  FADE_IN: 'fadeIn',
  SPIN: 'spin',
  THUMBNAIL_SPIN: 'thumbnailSpin'
};

// Add keyframe for pulse animation
const pulseKeyframes = `
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 #00aaff44; }
  70% { box-shadow: 0 0 16px 8px #00aaff44; }
  100% { box-shadow: 0 0 0 0 #00aaff44; }
}`;
if (typeof document !== 'undefined' && !document.getElementById('pulse-keyframes')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'pulse-keyframes';
  styleEl.innerHTML = pulseKeyframes;
  document.head.appendChild(styleEl);
}

// CSS for styling
const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 60px)', // Full height minus navbar
    overflow: 'hidden', // Prevent scrolling on the container itself
    backgroundColor: THEME.bgPrimary,
    maxHeight: 'calc(100vh - 60px)', // Enforce maximum height
    position: 'fixed', // Fix position to avoid spacing issues
    width: '100%',
    top: '60px', // Position right below the navbar
    left: 0,
  },
  // Left panel - 2/3 width for model visualization
  visualizationPanel: {
    flex: '2',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    position: 'relative',
    overflow: 'hidden',
    height: '100%', // Fill the height of the parent container
  },
  // Right panel - 1/3 width for asset list
  assetListPanel: {
    flex: '1',
    padding: '20px',
    backgroundColor: THEME.bgPrimary,
    borderLeft: THEME.border,
    display: 'flex',
    flexDirection: 'column',
    height: '100%', // Fill the height of the parent container
    minWidth: '250px', // Ensure panel doesn't get too narrow
    maxWidth: '400px', // Limit maximum width
  },
  assetListHeader: {
    marginBottom: '15px',
    color: THEME.accentPrimary,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  assetListContainer: {
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    marginBottom: '15px',
    padding: '5px',
    maxHeight: 'calc(100% - 160px)', // Space for header, pagination, and buttons
    display: 'flex',
    flexDirection: 'column',
  },
  assetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', // Dynamic columns based on container width
    gap: '12px',
    width: '100%',
    alignContent: 'start', // Align grid items to the top
    minHeight: 0, // Allow container to shrink
  },
  assetGridSingleColumn: {
    gridTemplateColumns: '1fr', // 1 column for small screens
  },
  assetItem: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: THEME.bgSecondary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: THEME.boxShadow,
    border: `1px solid transparent`,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 0,
    height: '96px', // Fixed height for consistent grid
  },
  assetItemHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${THEME.accentPrimary}`,
    outline: 'none',
  },
  assetItemSelected: {
    border: `1px solid ${THEME.accentPrimary}`,
    backgroundColor: THEME.bgActive,
    outline: 'none',
  },
  assetThumbnail: {
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.bgActive,
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '32px',
    color: THEME.accentPrimary,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    overflow: 'hidden',
    position: 'relative', // For loading indicator positioning
    flexShrink: 0, // Prevent thumbnail from shrinking
  },
  thumbnailLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    fontSize: '10px',
    color: THEME.textSecondary,
  },
  thumbnailSpinner: {
    width: '20px',
    height: '20px',
    border: `2px solid ${THEME.bgActive}`,
    borderTop: `2px solid ${THEME.accentPrimary}`,
    borderRadius: '50%',
    animation: `${KEYFRAMES.THUMBNAIL_SPIN} 1s linear infinite`,
  },
  assetName: {
    fontSize: '12px',
    color: THEME.textPrimary,
    textAlign: 'center',
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0, // Allows text to ellipsis properly
  },
  dropzone: {
    border: `2px dashed ${THEME.accentPrimary}`,
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(37, 37, 37, 0.7)',
    boxShadow: THEME.boxShadow,
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneActive: {
    borderColor: THEME.accentSecondary,
    backgroundColor: 'rgba(51, 51, 51, 0.7)',
  },
  uploadIcon: {
    fontSize: '48px',
    color: THEME.accentPrimary,
    marginBottom: '15px',
  },
  dropzoneText: {
    fontSize: '18px',
    color: THEME.textPrimary,
    marginBottom: '10px',
    fontWeight: 'bold',
  },
  dropzoneSubText: {
    fontSize: '14px',
    color: THEME.textSecondary,
    marginTop: '5px',
  },
  buttonContainer: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    gap: '10px',
    marginTop: 'auto', // Push to bottom of container
  },
  message: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    padding: '10px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    animation: `${KEYFRAMES.FADE_IN} 0.3s ease-in-out`,
    maxWidth: '90%',
  },
  success: {
    backgroundColor: THEME.successBg,
    color: THEME.successText,
    border: `1px solid ${THEME.successBorder}`,
  },
  error: {
    backgroundColor: THEME.errorBg,
    color: THEME.errorText,
    border: `1px solid ${THEME.errorBorder}`,
  },
  modelViewer: {
    width: '100%',
    height: '100%',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  spinner: {
    border: `4px solid ${THEME.bgActive}`,
    borderTop: `4px solid ${THEME.accentPrimary}`,
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: `${KEYFRAMES.SPIN} 1s linear infinite`,
    marginBottom: '20px',
  },
  loadingText: {
    color: THEME.textSecondary,
  },
  // Add pagination controls styles
  paginationControls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '15px',
  },
  pageButton: {
    backgroundColor: 'transparent',
    color: THEME.textPrimary,
    border: `1px solid ${THEME.accentPrimary}`,
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '30px',
  },
  pageButtonDisabled: {
    backgroundColor: 'transparent',
    color: THEME.textSecondary,
    border: `1px solid ${THEME.textSecondary}`,
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  pageButtonActive: {
    backgroundColor: THEME.accentPrimary,
    color: 'white',
  },
  pageIndicator: {
    color: THEME.textPrimary,
    fontSize: '14px',
  },
  modelPreviewVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '8px',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: '5px',
    right: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    fontSize: '8px',
    padding: '2px 4px',
    borderRadius: '2px',
    zIndex: 2,
  },
  generationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '500px',
    padding: '20px',
    borderRadius: '8px',
    backgroundColor: THEME.bgSecondary,
    textAlign: 'center',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    zIndex: 5,
  },
  generationHeader: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  generationSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${THEME.bgActive}`,
    borderTopColor: THEME.accentPrimary,
    borderRadius: '50%',
    animation: `${KEYFRAMES.SPIN} 1s linear infinite`,
    marginBottom: '15px',
  },
  generationTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: THEME.accentPrimary,
    marginBottom: '5px',
  },
  generationText: {
    color: THEME.textPrimary,
    marginBottom: '15px',
  },
  generationProgressBar: {
    width: '100%',
    height: '10px',
    backgroundColor: THEME.bgActive,
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '15px',
  },
  generationProgressFill: {
    height: '100%',
    backgroundColor: THEME.accentPrimary,
    borderRadius: '10px',
    transition: 'width 0.3s ease',
  },
  generationStep: {
    color: THEME.textSecondary,
    fontSize: '14px',
    marginBottom: '10px',
  },
  generationInfo: {
    fontSize: '12px',
    color: THEME.textSecondary,
    marginTop: '10px',
    fontStyle: 'italic',
  },
  generationPreviewContainer: {
    width: '100%',
    maxWidth: '600px',
    minHeight: '320px',
    height: '340px',
    marginTop: '24px',
    borderRadius: '18px',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #ff5e3a 0%, #ffb347 100%)',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25), 0 1.5px 8px 0 #ff5e3a33',
    border: '2.5px solid #ff5e3a88',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '18px',
    transition: 'box-shadow 0.3s, border 0.3s',
  },
  generationPreviewVideo: {
    width: '100%',
    height: '100%',
    maxWidth: '560px',
    maxHeight: '300px',
    borderRadius: '14px',
    boxShadow: '0 2px 16px 0 #00aaff44',
    objectFit: 'cover',
    background: '#111',
    border: '1.5px solid #00ffaa55',
    transition: 'box-shadow 0.3s, border 0.3s',
  },
  generationPreviewPlaceholder: {
    color: THEME.textSecondary,
    fontSize: '14px',
  },
  generationError: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    border: '1px solid #dc3545',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '15px',
    marginBottom: '10px',
    color: '#dc3545',
    fontSize: '14px',
    textAlign: 'center',
  },
  generationCloseButton: {
    backgroundColor: THEME.bgActive,
    color: THEME.textPrimary,
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  generationCloseButtonHover: {
    backgroundColor: THEME.accentPrimary,
    color: 'white',
  },
  uploadButton: {
    backgroundColor: THEME.bgActive,
    color: THEME.textPrimary,
    borderRadius: '4px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
    width: '100%',
    border: `1px solid ${THEME.textSecondary}`, // Match the secondary button style
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonHover: {
    backgroundColor: THEME.bgActive,
    borderColor: THEME.textPrimary,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
  },
  createButton: {
    backgroundColor: '#ff5e3a', // Fire orange
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 5px rgba(255, 94, 58, 0.3)',
    width: '100%', // Full width for vertical stacking
  },
  createButtonHover: {
    backgroundColor: '#ff3b1c', // Brighter orange/red when hovering
    boxShadow: '0 4px 8px rgba(255, 59, 28, 0.5)',
    transform: 'translateY(-2px)',
  },
  // Progress indicator styles
  progress: {
    stepsContainer: {
      display: 'block',
      width: '100%',
      position: 'relative',
      marginBottom: '36px',
      marginTop: '28px',
      minHeight: '80px',
      height: '80px',
    },
    progressLine: {
      position: 'absolute',
      top: '26px',
      left: '0',
      right: '0',
      height: '8px',
      background: 'linear-gradient(90deg, #00aaff 0%, #00ffaa 100%)',
      borderRadius: '4px',
      zIndex: 0,
      opacity: 0.18,
    },
    progressFill: {
      position: 'absolute',
      top: '26px',
      left: '0',
      height: '8px',
      background: 'linear-gradient(90deg, #00aaff 0%, #00ffaa 100%)',
      borderRadius: '4px',
      zIndex: 1,
      transition: 'width 0.7s cubic-bezier(.4,1.4,.6,1)',
      boxShadow: '0 0 16px 2px #00aaff88',
    },
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 2,
      minWidth: '0',
      position: 'absolute',
      width: '32px',
      transition: 'left 0.5s cubic-bezier(.4,1.4,.6,1)',
    },
    stepBubble: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: THEME.bgPrimary,
      border: `3px solid ${THEME.bgActive}`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '10px',
      fontWeight: 600,
      fontSize: '18px',
      transition: 'all 0.3s cubic-bezier(.4,1.4,.6,1)',
      position: 'relative',
      boxSizing: 'border-box',
      boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
    },
    stepBubbleActive: {
      border: `3px solid #00aaff`,
      backgroundColor: THEME.bgPrimary,
      animation: 'pulse 1.2s infinite',
      boxShadow: '0 0 16px 4px #00aaff88',
    },
    stepBubbleComplete: {
      border: 'none',
      background: 'linear-gradient(135deg, #00ffaa 0%, #00aaff 100%)',
      color: '#fff',
      boxShadow: '0 2px 12px 0 #00ffaa88',
    },
    stepBubbleIcon: {
      fontSize: '18px',
      color: '#fff',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    },
    stepLabel: {
      fontSize: '15px',
      fontWeight: '600',
      textAlign: 'center',
      width: '100px',
      marginTop: '8px',
      letterSpacing: '0.01em',
      transition: 'color 0.3s ease',
      color: THEME.textSecondary,
      position: 'absolute',
      top: '38px',
      left: '50%',
      transform: 'translateX(-50%)',
      whiteSpace: 'nowrap',
    },
    stepLabelActive: {
      color: '#00aaff',
      fontWeight: 700,
      textShadow: '0 0 8px #00aaff88',
    },
    stepLabelComplete: {
      color: '#00ffaa',
      fontWeight: 700,
      textShadow: '0 0 8px #00ffaa88',
    },
    statusMessage: {
      textAlign: 'center',
      margin: '50px 0 0 0',
      padding: '0 20px',
      minHeight: '24px',
      fontSize: '14px',
      lineHeight: '1.5',
      color: THEME.textPrimary,
      transition: 'opacity 0.3s ease',
    },
  },
};

// Responsive styles for mobile/small screens
export const getMobileStyles = (windowWidth) => {
  const mobileStyles = {};
  
  if (windowWidth <= MOBILE_BREAKPOINT) {
    mobileStyles.container = {
      flexDirection: 'column',
      height: 'auto',
      overflow: 'auto',
      position: 'relative',
      maxHeight: 'none',
    };
    mobileStyles.visualizationPanel = {
      flex: 'none',
      height: 'auto',
      minHeight: '50vh',
    };
    mobileStyles.assetListPanel = {
      flex: 'none',
      minHeight: '40vh',
      borderLeft: 'none',
      borderTop: THEME.border,
      maxWidth: '100%',
      maxHeight: '50vh',
      overflow: 'hidden',
    };
    mobileStyles.assetListContainer = {
      maxHeight: 'calc(50vh - 160px)', // Adjusted for pagination controls
      overflowY: 'auto',
      overflowX: 'hidden',
    };
    mobileStyles.paginationControls = {
      marginBottom: '5px', // Smaller margin on mobile
    };
    mobileStyles.assetGrid = {
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', // Smaller items on mobile
      gap: '8px',
    };
    mobileStyles.assetItem = {
      padding: '8px',
      height: '80px', // Smaller height on mobile
    };
  }
  
  if (windowWidth <= SINGLE_COLUMN_BREAKPOINT) {
    mobileStyles.assetGrid = {
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', // Even smaller on very small screens
      gap: '6px',
    };
    mobileStyles.assetItem = {
      padding: '6px',
      height: '70px', // Even smaller height on very small screens
    };
  }
  
  return mobileStyles;
};

export default styles; 