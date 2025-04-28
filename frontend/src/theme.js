/**
 * Shared theme constants for the entire application
 * This allows for consistent styling and easy updates across all components
 */
const THEME = {
  // Background colors
  bgPrimary: '#1a1a1a',
  bgSecondary: '#252525',
  bgActive: '#333333',
  
  // Text colors
  textPrimary: '#e0e0e0',
  textSecondary: '#bbb',
  
  // Accent colors
  accentPrimary: '#ff5e3a',
  accentSecondary: '#ff8a65',
  
  // Status colors
  successBg: '#2e3b2e',
  successText: '#a5d6a7',
  successBorder: '#388e3c',
  errorBg: '#3b2e2e',
  errorText: '#ef9a9a',
  errorBorder: '#d32f2f',
  
  // Misc
  border: '1px solid #444',
  borderAccent: '4px solid #ff5e3a',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
  
  // Component-specific styles
  forge: {
    backgroundColor: '#252525',
    borderRadius: '4px',
    padding: '2rem',
    marginBottom: '2rem',
    borderLeft: '4px solid #ff5e3a',
  }
};

export default THEME; 