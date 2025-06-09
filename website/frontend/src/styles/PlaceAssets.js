import THEME from '../theme';

export const placeAssetsStyles = {
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
    zIndex: 1000
  },

  modal: {
    background: THEME.bgLighter || '#3a3a3a',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '1200px',
    maxHeight: '85vh',
    width: '95%',
    overflow: 'auto',
    border: `2px solid ${THEME.accent || '#007bff'}`,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: `1px solid ${THEME.border || '#404040'}`,
    paddingBottom: '12px'
  },

  title: {
    color: THEME.textPrimary || '#e0e0e0',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },

  closeButton: {
    background: 'transparent',
    border: 'none',
    color: THEME.textSecondary || '#ccc',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },

  closeButtonHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },

  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  infoSection: {
    background: THEME.bgSecondary || '#2a2a2a',
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${THEME.border || '#404040'}`
  },

  infoTitle: {
    color: THEME.textPrimary || '#e0e0e0',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px'
  },

  infoText: {
    color: THEME.textSecondary || '#ccc',
    lineHeight: 1.5,
    marginBottom: '8px'
  },

  highlightText: {
    color: THEME.accent || '#007bff',
    fontWeight: 'bold'
  },

  warningText: {
    color: '#ffc107',
    fontWeight: 'bold'
  },

  parametersSection: {
    background: THEME.bgSecondary || '#2a2a2a',
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${THEME.border || '#404040'}`
  },

  parametersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },

  parameterItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: THEME.bgPrimary || '#1a1a1a',
    borderRadius: '6px',
    border: `1px solid ${THEME.border || '#404040'}`
  },

  parameterLabel: {
    color: THEME.textSecondary || '#ccc',
    fontSize: '14px',
    fontWeight: 'bold'
  },

  parameterValue: {
    color: THEME.textPrimary || '#e0e0e0',
    fontSize: '14px'
  },

  statusSection: {
    background: THEME.bgSecondary || '#2a2a2a',
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${THEME.border || '#404040'}`
  },

  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },

  statusIcon: {
    fontSize: '24px'
  },

  statusText: {
    color: THEME.textPrimary || '#e0e0e0',
    fontSize: '16px',
    fontWeight: 'bold'
  },

  statusDescription: {
    color: THEME.textSecondary || '#ccc',
    fontSize: '14px',
    lineHeight: 1.4
  },

  progressBar: {
    width: '100%',
    height: '8px',
    background: THEME.bgPrimary || '#1a1a1a',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '12px'
  },

  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${THEME.accent || '#007bff'}, ${THEME.secondary || '#28a745'})`,
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },

  actionButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: `1px solid ${THEME.border || '#404040'}`
  },

  primaryButton: {
    background: THEME.accent || '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  primaryButtonHover: {
    background: THEME.accentDark || '#0056b3',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
  },

  primaryButtonDisabled: {
    background: '#666',
    cursor: 'not-allowed',
    opacity: 0.6,
    transform: 'none',
    boxShadow: 'none'
  },

  secondaryButton: {
    background: 'transparent',
    color: THEME.textSecondary || '#ccc',
    border: `2px solid ${THEME.textSecondary || '#ccc'}`,
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  secondaryButtonHover: {
    color: THEME.textPrimary || '#e0e0e0',
    borderColor: THEME.textPrimary || '#e0e0e0',
    background: 'rgba(255, 255, 255, 0.05)'
  },

  loadingSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  errorMessage: {
    background: 'rgba(220, 53, 69, 0.1)',
    border: '1px solid #dc3545',
    borderRadius: '6px',
    padding: '12px',
    color: '#dc3545',
    fontSize: '14px',
    marginTop: '12px'
  },

  successMessage: {
    background: 'rgba(40, 167, 69, 0.1)',
    border: '1px solid #28a745',
    borderRadius: '6px',
    padding: '12px',
    color: '#28a745',
    fontSize: '14px',
    marginTop: '12px'
  }
}; 