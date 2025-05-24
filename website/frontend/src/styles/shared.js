import THEME from '../theme';

/**
 * Shared styles for common UI elements across the application
 */
const sharedStyles = {
  // Button styles
  buttons: {
    // Primary action button (filled)
    primary: {
      backgroundColor: THEME.accentPrimary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      padding: '0.75rem 1.25rem',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      outline: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      position: 'relative',
      // Ensure no outline on all browsers
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    },
    primaryHover: {
      backgroundColor: THEME.accentSecondary,
      transform: 'translateY(-1px)',
      boxShadow: '0 3px 6px rgba(0, 0, 0, 0.3)',
    },
    primaryPressed: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    },
    primaryFocus: {
      boxShadow: `0 0 0 3px ${THEME.accentPrimary}40`,
    },
    
    // Secondary button (outlined)
    secondary: {
      backgroundColor: 'transparent',
      color: THEME.textPrimary,
      border: `1px solid ${THEME.textSecondary}`,
      borderRadius: '4px',
      padding: '0.75rem 1.25rem',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      position: 'relative',
      // Ensure no outline on all browsers
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    },
    secondaryHover: {
      backgroundColor: THEME.bgActive,
      border: `1px solid ${THEME.textPrimary}`,
    },
    secondaryPressed: {
      transform: 'translateY(1px)',
    },
    secondaryFocus: {
      boxShadow: `0 0 0 3px ${THEME.textSecondary}40`,
    },
    
    // Tertiary button (text only)
    tertiary: {
      backgroundColor: 'transparent',
      color: THEME.textPrimary,
      border: 'none',
      padding: '0.5rem 0.75rem',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative',
      // Ensure no outline on all browsers
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    },
    tertiaryHover: {
      color: THEME.accentPrimary,
    },
    tertiaryFocus: {
      boxShadow: `0 0 0 3px ${THEME.textSecondary}30`,
    },
    
    // Icon button
    icon: {
      backgroundColor: 'transparent',
      color: THEME.textPrimary,
      border: 'none',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      position: 'relative',
      // Ensure no outline on all browsers
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    },
    iconHover: {
      backgroundColor: THEME.bgActive,
    },
    iconFocus: {
      boxShadow: `0 0 0 3px ${THEME.textSecondary}30`,
    },
    
    // Disabled state (applies to all buttons)
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      pointerEvents: 'none',
      boxShadow: 'none',
    },
  },
  
  // Form input styles
  inputs: {
    base: {
      backgroundColor: THEME.bgSecondary,
      color: THEME.textPrimary,
      border: THEME.border,
      borderRadius: '4px',
      padding: '0.75rem 1rem',
      fontSize: '14px',
      width: '100%',
      outline: 'none',
      transition: 'border-color 0.2s ease',
    },
    focus: {
      borderColor: THEME.accentPrimary,
    },
    error: {
      borderColor: THEME.errorBorder,
    },
  },

  // Card styles
  cards: {
    base: {
      backgroundColor: THEME.bgSecondary,
      borderRadius: '6px',
      border: THEME.border,
      padding: '1.5rem',
      boxShadow: THEME.boxShadow,
    },
    interactive: {
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    interactiveHover: {
      transform: 'translateY(-3px)',
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.3)',
    },
  },

  // Typography styles
  typography: {
    heading1: {
      fontSize: '28px',
      fontWeight: '700',
      color: THEME.textPrimary,
      marginBottom: '1.5rem',
    },
    heading2: {
      fontSize: '22px',
      fontWeight: '600',
      color: THEME.textPrimary,
      marginBottom: '1.25rem',
    },
    heading3: {
      fontSize: '18px',
      fontWeight: '600',
      color: THEME.textPrimary,
      marginBottom: '1rem',
    },
    body: {
      fontSize: '14px',
      lineHeight: '1.5',
      color: THEME.textPrimary,
    },
    label: {
      fontSize: '12px',
      fontWeight: '500',
      color: THEME.textSecondary,
      marginBottom: '0.5rem',
      display: 'block',
    },
    error: {
      fontSize: '12px',
      color: THEME.errorText,
      marginTop: '0.5rem',
    },
  },
  
  // Progress indicators
  progress: {
    trackBase: {
      width: '100%',
      height: '8px',
      backgroundColor: THEME.bgActive,
      borderRadius: '4px',
      overflow: 'hidden',
    },
    fillerBase: {
      height: '100%',
      backgroundColor: THEME.accentPrimary,
      borderRadius: '4px',
      transition: 'width 0.3s ease-in-out',
    },
    spinner: {
      border: '3px solid rgba(255, 255, 255, 0.1)',
      borderTop: `3px solid ${THEME.accentPrimary}`,
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      animation: 'spin 1s linear infinite',
    },
    step: {
      container: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
      },
      indicator: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '10px',
        fontSize: '12px',
        fontWeight: 'bold',
      },
      pending: {
        backgroundColor: THEME.bgActive,
        border: THEME.border,
      },
      active: {
        backgroundColor: THEME.accentPrimary,
        color: '#fff',
      },
      complete: {
        backgroundColor: '#388e3c',
        color: '#fff',
      },
      error: {
        backgroundColor: THEME.errorBorder,
        color: '#fff',
      },
    },
  },

  // Utility styles
  utils: {
    flexRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    flexColumn: {
      display: 'flex',
      flexDirection: 'column',
    },
    spaceBetween: {
      justifyContent: 'space-between',
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    gap8: {
      gap: '8px',
    },
    gap16: {
      gap: '16px',
    },
  }
};

export default sharedStyles; 