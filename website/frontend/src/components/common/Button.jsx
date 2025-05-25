import React, { useState, useRef, useEffect } from 'react';
import sharedStyles from '../../styles/shared';
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
  variant = 'primary', 
  onClick, 
  disabled = false, 
  className = '', 
  children, 
  icon,
  style = {},
  ...rest 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const buttonRef = useRef(null);

  // Ensure consistent styling by storing a stable reference to the styles
  const stableStyles = useRef({
    primary: { ...sharedStyles.buttons.primary },
    secondary: { ...sharedStyles.buttons.secondary },
    tertiary: { ...sharedStyles.buttons.tertiary },
    icon: { ...sharedStyles.buttons.icon },
    primaryHover: { ...sharedStyles.buttons.primaryHover },
    secondaryHover: { ...sharedStyles.buttons.secondaryHover },
    tertiaryHover: { ...sharedStyles.buttons.tertiaryHover },
    iconHover: { ...sharedStyles.buttons.iconHover },
    primaryFocus: { ...sharedStyles.buttons.primaryFocus },
    secondaryFocus: { ...sharedStyles.buttons.secondaryFocus },
    tertiaryFocus: { ...sharedStyles.buttons.tertiaryFocus },
    iconFocus: { ...sharedStyles.buttons.iconFocus },
    primaryPressed: { ...sharedStyles.buttons.primaryPressed },
    secondaryPressed: { ...sharedStyles.buttons.secondaryPressed },
    disabled: { ...sharedStyles.buttons.disabled },
  }).current;

  // Get base styles based on variant
  const getBaseStyles = () => {
    switch (variant) {
      case 'secondary':
        return stableStyles.secondary;
      case 'tertiary':
        return stableStyles.tertiary;
      case 'icon':
        return stableStyles.icon;
      case 'primary':
      default:
        return stableStyles.primary;
    }
  };

  // Get hover styles based on variant
  const getHoverStyles = () => {
    if (!isHovered) return {};

    switch (variant) {
      case 'secondary':
        return stableStyles.secondaryHover;
      case 'tertiary':
        return stableStyles.tertiaryHover;
      case 'icon':
        return stableStyles.iconHover;
      case 'primary':
      default:
        return stableStyles.primaryHover;
    }
  };

  // Get pressed styles based on variant
  const getPressedStyles = () => {
    if (!isPressed) return {};

    switch (variant) {
      case 'secondary':
        return stableStyles.secondaryPressed;
      case 'primary':
      default:
        return stableStyles.primaryPressed;
    }
  };

  // Get focus styles based on variant
  const getFocusStyles = () => {
    if (!isFocused) return {};

    switch (variant) {
      case 'secondary':
        return stableStyles.secondaryFocus;
      case 'tertiary':
        return stableStyles.tertiaryFocus;
      case 'icon':
        return stableStyles.iconFocus;
      case 'primary':
      default:
        return stableStyles.primaryFocus;
    }
  };

  // Handle keyboard interactions for accessibility
  useEffect(() => {
    const button = buttonRef.current;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setIsPressed(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setIsPressed(false);
        onClick && onClick(e);
      }
    };
    
    if (button) {
      button.addEventListener('keydown', handleKeyDown);
      button.addEventListener('keyup', handleKeyUp);
    }
    
    return () => {
      if (button) {
        button.removeEventListener('keydown', handleKeyDown);
        button.removeEventListener('keyup', handleKeyUp);
      }
    };
  }, [onClick]);

  // Handle focus detection
  const handleFocus = (e) => {
    setIsFocused(true);
  };

  // Combine all styles - give special attention to "Upload Model +" button
  // by ensuring border styles are preserved correctly
  const getButtonStyle = () => {
    // Start with the base
    const baseStyle = getBaseStyles();
    const hoverStyle = getHoverStyles();
    const focusStyle = getFocusStyles();
    const pressedStyle = getPressedStyles();
    
    let combinedStyle = {
      ...baseStyle,
      ...focusStyle,
      ...hoverStyle, // Apply hover styles, which might include borderColor
      ...pressedStyle,
      ...(disabled ? stableStyles.disabled : {}),
    };

    // For secondary variant, hover directly changes borderColor from hoverStyle.
    // No need for the specific ternary operator for border here anymore if sharedStyles are correct.
    // If baseStyle or hoverStyle for secondary now correctly uses longhand, this complex line is simpler:
    // border: variant === 'secondary' ? `1px solid ${isHovered ? THEME.textPrimary : THEME.textSecondary}` : baseStyle.border,

      // Apply custom styles last to allow for overrides
    combinedStyle = { ...combinedStyle, ...style };

    return combinedStyle;
  };

  return (
    <button
      ref={buttonRef}
      style={getButtonStyle()}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onFocus={handleFocus}
      onBlur={() => setIsFocused(false)}
      className={className}
      {...rest}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default Button; 