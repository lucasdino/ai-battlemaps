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
  // Left panel - 2/3 width for terrain visualization
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
  // Right panel - 1/3 width for terrain list
  terrainListPanel: {
    flex: '1',
    padding: '20px',
    backgroundColor: THEME.bgPrimary,
    borderLeft: THEME.border,
    display: 'flex',
    flexDirection: 'column',
    height: '100%', // Fill the height of the parent container
    minWidth: '250px', // Ensure panel doesn't get too narrow
    maxWidth: '320px', // Limit maximum width
  },
  terrainListHeader: {
    marginBottom: '15px',
    color: THEME.accentPrimary,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  terrainListContainer: {
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    marginBottom: '15px',
    padding: '5px',
    maxHeight: 'calc(100% - 160px)', // Space for header, pagination, and buttons
    display: 'flex',
    flexDirection: 'column',
  },
  terrainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', // Dynamic columns based on container width
    gap: '12px',
    width: '100%',
    alignContent: 'start', // Align grid items to the top
    minHeight: 0, // Allow container to shrink
  },
  terrainGridSingleColumn: {
    gridTemplateColumns: '1fr', // 1 column for small screens
  },
  terrainItem: {
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
    height: '120px', // Increased height for name text
    justifyContent: 'flex-start',
  },
  terrainItemHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${THEME.accentPrimary}`,
    outline: 'none',
  },
  terrainItemSelected: {
    border: `1px solid ${THEME.accentPrimary}`,
    backgroundColor: THEME.bgActive,
    outline: 'none',
  },
  terrainThumbnail: {
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
  terrainName: {
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
  terrainViewer: {
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
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: THEME.accentPrimary,
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
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: THEME.textSecondary,
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
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: THEME.textSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonHover: {
    backgroundColor: THEME.bgActive,
    borderColor: THEME.textPrimary,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
  },
  // Upload form styles
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    padding: '20px',
    backgroundColor: THEME.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${THEME.accentPrimary}`,
    marginBottom: '15px',
  },
  uploadFormTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: THEME.accentPrimary,
    marginBottom: '10px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  formLabel: {
    fontSize: '14px',
    color: THEME.textPrimary,
    fontWeight: '500',
  },
  formInput: {
    backgroundColor: THEME.bgActive,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: THEME.textSecondary,
    borderRadius: '4px',
    padding: '8px 12px',
    color: THEME.textPrimary,
    fontSize: '14px',
  },
  formInputFocus: {
    borderColor: THEME.accentPrimary,
    outline: 'none',
  },
  dimensionsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
  },
  processingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: THEME.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${THEME.accentPrimary}`,
    marginBottom: '15px',
  },
  processingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${THEME.bgActive}`,
    borderTopColor: THEME.accentPrimary,
    borderRadius: '50%',
    animation: `${KEYFRAMES.SPIN} 1s linear infinite`,
    marginBottom: '15px',
  },
  processingText: {
    color: THEME.textPrimary,
    fontSize: '14px',
    textAlign: 'center',
  },
  // Styles for Asset Placement UI
  assetControlsContainer: {
    flex: '0.7',
    padding: '15px',
    backgroundColor: THEME.bgPrimary,
    borderLeft: THEME.border,
    borderRadius: '8px',
    boxShadow: THEME.boxShadow,
    height: '100%',
    overflowY: 'auto',
    maxWidth: '280px',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
  },
  assetControlsTitle: {
    fontSize: '16px',
    color: THEME.accentPrimary,
    marginBottom: '10px',
    fontWeight: 'bold',
  },
  assetSelection: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '15px',
  },
  assetButton: {
    // Using common button styles from './common' is preferred if they fit
    // These are overrides or specific styles if common Button can't be fully styled via props
    padding: '8px 12px',
    fontSize: '13px',
    backgroundColor: THEME.bgSecondary,
    color: THEME.textPrimary,
    border: `1px solid ${THEME.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  assetButtonSelected: {
    backgroundColor: THEME.accentPrimary,
    color: THEME.bgPrimary, // Or THEME.textLight if accentPrimary is dark
    borderColor: THEME.accentPrimary,
    boxShadow: `0 0 5px ${THEME.accentPrimary}`,
  },
  assetActionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '10px',
    alignItems: 'stretch',
  },
  actionButton: {
    // Again, prefer common Button component and style via its props if possible
    padding: '8px 15px',
    fontSize: '13px',
    // Uses default Button styling primarily
  },
  clearButton: {
    backgroundColor: THEME.dangerBg, // Example for a danger action
    color: THEME.textLight,
    // Add hover effects if Button component doesn't provide them sufficiently
  },
  infoText: {
    fontSize: '12px',
    color: THEME.textSecondary,
    marginTop: '5px',
    minHeight: '18px', // Reserve space to prevent layout shifts
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
    mobileStyles.terrainListPanel = {
      flex: 'none',
      minHeight: '40vh',
      borderLeft: 'none',
      borderTop: THEME.border,
      maxWidth: '100%',
      maxHeight: '50vh',
      overflow: 'hidden',
    };
    mobileStyles.terrainListContainer = {
      maxHeight: 'calc(50vh - 160px)', // Adjusted for pagination controls
      overflowY: 'auto',
      overflowX: 'hidden',
    };
    mobileStyles.paginationControls = {
      marginBottom: '5px', // Smaller margin on mobile
    };
    mobileStyles.terrainGrid = {
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', // Smaller items on mobile
      gap: '8px',
    };
    mobileStyles.terrainItem = {
      padding: '8px',
      height: '80px', // Smaller height on mobile
    };
    mobileStyles.dimensionsContainer = {
      gridTemplateColumns: '1fr', // Stack vertically on mobile
      gap: '8px',
    };
  }
  
  if (windowWidth <= SINGLE_COLUMN_BREAKPOINT) {
    mobileStyles.terrainGrid = {
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', // Even smaller on very small screens
      gap: '6px',
    };
    mobileStyles.terrainItem = {
      padding: '6px',
      height: '70px', // Even smaller height on very small screens
    };
  }
  
  return mobileStyles;
};

export default styles; 