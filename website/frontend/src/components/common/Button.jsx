import React from 'react';
import THEME from '../../theme';

/**
 * Reusable Button component with standard styling and hover/focus handling
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Button variant: 'primary', 'secondary', 'tertiary', 'icon'
 * @param {Function} props.onClick - Click handler function
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS class names
 * @param {React.ReactNode} props.children - Button contents
 * @param {string} props.icon - Optional icon to display before the label
 * @param {Object} props.style - Additional inline styles
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false,
  style = {},
  ...props 
}) => {
  const getButtonStyle = () => {
    const baseStyle = {
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.7 : 1,
      border: 'none',
      outline: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      ...style
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: THEME.accentPrimary,
          color: '#fff',
          '&:hover': {
            backgroundColor: THEME.accentSecondary
          }
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: THEME.bgActive,
          color: THEME.textPrimary,
          border: `1px solid ${THEME.border}`,
          '&:hover': {
            borderColor: THEME.accentPrimary,
            color: THEME.accentPrimary
          }
        };
      case 'icon':
        return {
          ...baseStyle,
          padding: '4px 8px',
          backgroundColor: 'transparent',
          color: THEME.textSecondary,
          border: `1px solid ${THEME.border}`,
          minWidth: '30px',
          '&:hover': {
            color: THEME.textPrimary,
            borderColor: THEME.accentPrimary
          }
        };
      default:
        return baseStyle;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={getButtonStyle()}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 