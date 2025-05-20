import THEME from '../theme';
import sharedStyles from './shared';

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(3px)',
  },
  popup: {
    backgroundColor: THEME.bgSecondary,
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    padding: '1.5rem',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: THEME.textSecondary,
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    '&:hover': {
      color: THEME.textPrimary,
    },
  },
  title: {
    ...sharedStyles.typography.heading2,
    margin: '0 0 1.5rem 0',
    textAlign: 'center',
  },
  
  // Tabs
  tabsContainer: {
    display: 'flex',
    borderBottom: THEME.border,
    marginBottom: '1.5rem',
  },
  tab: {
    padding: '0.75rem 1.25rem',
    cursor: 'pointer',
    transition: 'color 0.2s',
    color: THEME.textSecondary,
    borderBottom: '3px solid transparent',
    fontSize: '14px',
    fontWeight: '500',
  },
  activeTab: {
    color: THEME.accentPrimary,
    borderBottom: `3px solid ${THEME.accentPrimary}`,
  },
  
  // Image container
  imageContainer: {
    width: '100%',
    height: '300px',
    backgroundColor: THEME.bgPrimary,
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: '1.5rem',
    border: THEME.border,
    position: 'relative',
  },
  imagePreview: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  noImagePlaceholder: {
    textAlign: 'center',
    padding: '2rem',
    color: THEME.textSecondary,
  },
  uploadIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  uploadText: {
    marginBottom: '0.5rem',
    fontWeight: '500',
  },
  // Dotted upload box for Upload view
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed rgba(0,0,0,0.2)',
    borderRadius: '4px',
    padding: '1.5rem',
    cursor: 'pointer',
    backgroundColor: THEME.bgPrimary,
    color: THEME.textSecondary,
    minHeight: '220px',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: THEME.bgSecondary,
    },
  },
  generatedImageInfo: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: THEME.textPrimary,
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '12px',
  },
  
  // Action buttons
  buttonsContainer: {
    ...sharedStyles.utils.flexRow,
    ...sharedStyles.utils.gap16,
    marginBottom: '1.5rem',
  },
  actionButton: {
    ...sharedStyles.buttons.secondary,
    flex: 1,
  },
  actionButtonHover: {
    ...sharedStyles.buttons.secondaryHover,
  },
  
  // Image action buttons
  imageActionsContainer: {
    ...sharedStyles.utils.flexRow,
    ...sharedStyles.utils.gap8,
    marginBottom: '1.5rem',
  },
  imageActionButton: {
    ...sharedStyles.buttons.secondary,
    flex: 1,
    padding: '0.5rem',
  },
  imageActionButtonHover: {
    ...sharedStyles.buttons.secondaryHover,
  },
  
  // Primary button for generate action
  primaryButton: {
    ...sharedStyles.buttons.primary,
    width: '100%',
    marginTop: '1rem',
  },
  disabledButton: {
    ...sharedStyles.buttons.disabled,
  },
  
  // Loading container (general purpose, not just for progress bar)
  loadingContainer: {
    ...sharedStyles.utils.flexColumn,
    ...sharedStyles.utils.centered,
    marginTop: '1rem',
    width: '100%',
  },
  spinner: {
    ...sharedStyles.progress.spinner, // Assuming sharedStyles.progress.spinner is generic enough
    width: '36px',
    height: '36px',
  },
  loadingText: {
    ...sharedStyles.typography.body,
    marginTop: '1rem',
  },
    
  // Error container
  errorContainer: {
    ...sharedStyles.utils.flexColumn,
    ...sharedStyles.utils.centered,
    padding: '1.5rem',
    backgroundColor: THEME.errorBg,
    borderRadius: '4px',
    border: `1px solid ${THEME.errorBorder}`,
    marginTop: '1rem',
  },
  errorIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  errorTitle: {
    ...sharedStyles.typography.heading3,
    margin: '0 0 0.5rem 0',
    color: THEME.errorText,
  },
  errorMessage: {
    ...sharedStyles.typography.body,
    color: THEME.errorText,
    marginBottom: '1rem',
    textAlign: 'center',
  },
  tryAgainButton: {
    ...sharedStyles.buttons.secondary,
  },
  tryAgainButtonHover: {
    ...sharedStyles.buttons.secondaryHover,
  },
  
  // Prompt container (for image generation)
  promptContainer: {
    ...sharedStyles.utils.flexColumn,
    ...sharedStyles.utils.gap8,
    marginBottom: 0,
  },
  label: {
    ...sharedStyles.typography.label,
  },
  secondaryLabel: {
    ...sharedStyles.typography.label,
  },
  promptTextarea: {
    ...sharedStyles.inputs.base,
    minHeight: '100px',
    resize: 'vertical',
  },
  systemPromptTextarea: {
    ...sharedStyles.inputs.base,
    minHeight: '80px',
    resize: 'vertical',
  },
  systemPromptHeader: {
    ...sharedStyles.utils.flexRow,
    ...sharedStyles.utils.spaceBetween,
    marginBottom: '0.5rem',
  },
  saveButton: {
    ...sharedStyles.buttons.tertiary,
    padding: '4px 8px',
    fontSize: '12px',
  },
  saveButtonHover: {
    ...sharedStyles.buttons.tertiaryHover,
  },
  successMessage: {
    color: THEME.successText,
  },
  loadingMessage: {
    color: THEME.textSecondary,
  },
  
  // Provider selection
  providerSelect: {
    ...sharedStyles.inputs.base,
  },
  
  // Additional utilities
  progressStatusMessage: {
    fontSize: '12px',
    textAlign: 'right',
    height: '20px',
    marginTop: '4px',
  },
  
  // Spinner for inline button loading
  spinnerInline: {
    display: 'inline-block',
    width: 22,
    height: 22,
    border: '3px solid #eee',
    borderTop: `3px solid ${THEME.accentPrimary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    verticalAlign: 'middle',
    margin: '0 auto',
  },
  // Large spinner for below button
  spinnerLarge: {
    display: 'block',
    width: 36,
    height: 36,
    border: '4px solid #eee',
    borderTop: `4px solid ${THEME.accentPrimary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  generationSpinnerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 0,
    width: '100%',
  },
  generationSpinnerText: {
    marginTop: 8,
    color: THEME.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Edit Image View
  editImageContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '1.5rem',
  },
  editImagePreviewContainer: {
    width: '100%',
    height: '300px',
    backgroundColor: THEME.bgPrimary,
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    border: THEME.border,
    position: 'relative',
  },
  editPromptContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  editPromptLabel: {
    ...sharedStyles.typography.label,
  },
  editPromptTextarea: {
    ...sharedStyles.inputs.base,
    minHeight: '100px',
    resize: 'vertical',
  },
  editImageActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    marginTop: '1rem',
  },
  backButton: {
    ...sharedStyles.buttons.secondary,
    flex: 1,
  },
  makeEditButton: {
    ...sharedStyles.buttons.primary,
    flex: 2,
  },
  
  // === Edit Images Carousel ===
  editImagesCarousel: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '720px',
    margin: '0 auto',
    minHeight: '360px',
    gap: '0',
    position: 'relative',
  },
  carouselArrow: {
    background: 'none',
    border: 'none',
    color: THEME.accentPrimary,
    fontSize: '36px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 4,
    width: 40,
    height: 360,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselArrowDisabled: {
    color: '#888',
    cursor: 'not-allowed',
  },
  carouselImagesContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 0,
    width: '100%',
    height: '100%',
    transition: 'transform 0.3s ease',
  },
  editImageCard: {
    position: 'relative',
    width: '100%',
    height: '240px',
    background: THEME.bgPrimary,
    borderRadius: '16px',
    overflow: 'hidden',
    border: `2px solid ${THEME.accentPrimary}`,
    boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    background: '#181818',
    display: 'block',
  },
  removeImageButtonLarge: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: '#444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    width: 32,
    height: 32,
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButtonHover: {
    background: THEME.accentPrimary,
    color: '#fff',
  },
  editWarning: {
    color: THEME.accentPrimary,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  imageCountIndicator: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
    pointerEvents: 'none',
  },
};

// Add keyframes for spin animation
const styleSheet = typeof document !== 'undefined' ? document.styleSheets[0] : null;
if (styleSheet && !Array.from(styleSheet.cssRules).some(rule => rule.name === 'spin')) {
  styleSheet.insertRule(`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`, styleSheet.cssRules.length);
}

export default styles; 