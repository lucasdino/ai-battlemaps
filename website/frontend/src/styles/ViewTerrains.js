import THEME from '../theme';

// Media query breakpoint (matching ViewAssets)
export const MOBILE_BREAKPOINT = 768;
export const SINGLE_COLUMN_BREAKPOINT = 480;

// Add keyframe names (matching ViewAssets)
export const KEYFRAMES = {
  FADE_IN: 'fadeIn',
  SPIN: 'spin',
  THUMBNAIL_SPIN: 'thumbnailSpin'
};

// CSS for styling (matching ViewAssets structure)
const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 60px)', // Full height minus navbar
    overflow: 'hidden',
    backgroundColor: THEME.bgPrimary,
    maxHeight: 'calc(100vh - 60px)',
    position: 'fixed',
    width: '100%',
    top: '60px',
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
    height: '100%',
  },
  // Right panel - 1/3 width for terrain list
  terrainListPanel: {
    flex: '1',
    padding: '20px',
    backgroundColor: THEME.bgPrimary,
    borderLeft: THEME.border,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: '250px',
    maxWidth: '400px',
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
    maxHeight: 'calc(100% - 160px)',
    display: 'flex',
    flexDirection: 'column',
  },
  terrainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr', // Single column - full width cards
    gap: '12px',
    width: '100%',
    alignContent: 'start',
    minHeight: 0,
  },
  terrainItem: {
    padding: '16px', // Reduce padding to give more space for content
    borderRadius: '8px',
    backgroundColor: THEME.bgSecondary,
    display: 'flex',
    flexDirection: 'column', // Vertical layout - icon above text
    alignItems: 'center',
    boxShadow: THEME.boxShadow,
    border: `1px solid transparent`,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 0,
    height: '220px', // 4x the size (2x width, 2x height)
    justifyContent: 'flex-start', // Align to top to ensure text has space
    position: 'relative',
  },
    terrainItemSelected: {
    border: `1px solid ${THEME.accentPrimary}`,
    backgroundColor: THEME.bgActive,
    outline: 'none',
  },
  terrainThumbnail: {
    width: '140px', // Slightly smaller to leave room for text
    height: '140px', // Slightly smaller to leave room for text
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.bgActive,
    borderRadius: '8px',
    marginBottom: '8px', // Space between icon and text
    marginTop: '8px', // Space from top
    fontSize: '70px', // Slightly smaller emoji to fit better
    color: THEME.accentPrimary,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  },
  terrainName: {
    fontSize: '12px', // Back to smaller font size as requested
    color: '#fff', // White font as requested
    textAlign: 'center', // Center align for vertical layout
    width: '100%',
    whiteSpace: 'nowrap', // Prevent wrapping to ensure visibility
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    lineHeight: '1.2',
    fontWeight: '500', // Slightly bold
    height: 'auto', // Let height be automatic
    flex: '0 0 auto', // Don't grow or shrink, keep natural size
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
    marginTop: 'auto',
  },
  message: {
    padding: '10px 15px',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '10px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '300px',
    zIndex: 1000,
  },
  success: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    color: '#28a745',
    border: '1px solid rgba(40, 167, 69, 0.3)',
  },
  error: {
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    color: '#dc3545',
    border: '1px solid rgba(220, 53, 69, 0.3)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${THEME.bgActive}`,
    borderTop: `4px solid ${THEME.accentPrimary}`,
    borderRadius: '50%',
    animation: `${KEYFRAMES.SPIN} 1s linear infinite`,
  },
  loadingText: {
    marginTop: '15px',
    color: THEME.textSecondary,
    fontSize: '14px',
  },
  // Pagination controls (matching ViewAssets)
  paginationControls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '15px',
  },
  pageIndicator: {
    color: THEME.textPrimary,
    fontSize: '14px',
  },
};

// Mobile styles (matching ViewAssets)
export const getMobileStyles = (windowWidth) => {
  if (windowWidth <= MOBILE_BREAKPOINT) {
    return {
      container: {
        flexDirection: 'column',
      },
      visualizationPanel: {
        flex: '1',
        minHeight: '50vh',
      },
      terrainListPanel: {
        flex: 'none',
        maxWidth: '100%',
        height: '50vh',
        borderLeft: 'none',
        borderTop: THEME.border,
      },
      terrainGrid: {
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      },
    };
  }
  return {};
};

export default styles; 