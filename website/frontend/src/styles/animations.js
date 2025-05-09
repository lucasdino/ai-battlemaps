/**
 * Global CSS animations
 */

// Animation keyframes for CSS animations
export const KEYFRAMES = {
  FADE_IN: 'fadeIn',
  SPIN: 'spin',
  THUMBNAIL_SPIN: 'thumbnailSpin'
};

// Inject global keyframe animations to document head
export const addGlobalAnimations = () => {
  // Create animations only once
  if (typeof document !== 'undefined') {
    // Create a style element for animations if it doesn't exist
    const existingStyle = document.getElementById('global-animations');
    if (!existingStyle) {
      const styleEl = document.createElement('style');
      styleEl.id = 'global-animations';
      styleEl.innerHTML = `
        @keyframes ${KEYFRAMES.FADE_IN} {
          from { opacity: 0; transform: translateY(-10px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
        @keyframes ${KEYFRAMES.SPIN} {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ${KEYFRAMES.THUMBNAIL_SPIN} {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        // Clean up function
        if (styleEl) {
          document.head.removeChild(styleEl);
        }
      };
    }
  }
  
  // Return empty cleanup function for SSR
  return () => {};
};

export default addGlobalAnimations; 