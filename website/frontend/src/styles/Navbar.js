// Navbar styles converted from CSS to JS object
// This imports the same font that was used in the original CSS
export const importFont = () => {
  // Create and insert a stylesheet to import the font if it doesn't exist
  if (typeof document !== 'undefined') {
    const fontLink = document.getElementById('pixel-font-import');
    if (!fontLink) {
      const link = document.createElement('link');
      link.id = 'pixel-font-import';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
      document.head.appendChild(link);
    }
  }
};

// Animation keyframes
export const KEYFRAMES = {
  PIXEL_FLAME: 'pixelFlame'
};

// Add global keyframe animations to document head
export const addNavbarAnimations = () => {
  if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('navbar-animations');
    if (!existingStyle) {
      const styleEl = document.createElement('style');
      styleEl.id = 'navbar-animations';
      styleEl.innerHTML = `
        @keyframes ${KEYFRAMES.PIXEL_FLAME} {
          0% {
            clip-path: polygon(
              0% 100%, 3% 90%, 7% 80%, 10% 95%, 13% 70%, 17% 92%, 20% 60%,
              23% 85%, 27% 65%, 30% 90%, 33% 60%, 37% 80%, 40% 55%, 43% 75%,
              47% 60%, 50% 100%, 53% 60%, 57% 75%, 60% 55%, 63% 80%, 67% 60%,
              70% 90%, 73% 65%, 77% 85%, 80% 60%, 83% 92%, 87% 70%, 90% 95%,
              93% 80%, 97% 90%, 100% 100%
            );
          }
          33% {
            clip-path: polygon(
              0% 100%, 3% 85%, 7% 95%, 10% 70%, 13% 92%, 17% 60%, 20% 85%,
              23% 65%, 27% 90%, 30% 60%, 33% 80%, 37% 55%, 40% 75%, 43% 60%,
              47% 100%, 50% 60%, 53% 75%, 57% 55%, 60% 80%, 63% 60%, 67% 90%,
              70% 65%, 73% 85%, 77% 60%, 80% 92%, 83% 70%, 87% 95%, 90% 80%,
              93% 90%, 97% 85%, 100% 100%
            );
          }
          66% {
            clip-path: polygon(
              0% 100%, 3% 92%, 7% 70%, 10% 85%, 13% 60%, 17% 90%, 20% 55%,
              23% 80%, 27% 60%, 30% 75%, 33% 55%, 37% 100%, 40% 60%, 43% 90%,
              47% 65%, 50% 80%, 53% 60%, 57% 90%, 60% 55%, 63% 75%, 67% 60%,
              70% 85%, 73% 100%, 77% 60%, 80% 70%, 83% 95%, 87% 80%, 90% 92%,
              93% 60%, 97% 85%, 100% 100%
            );
          }
          100% {
            clip-path: polygon(
              0% 100%, 3% 90%, 7% 80%, 10% 95%, 13% 70%, 17% 92%, 20% 60%,
              23% 85%, 27% 65%, 30% 90%, 33% 60%, 37% 80%, 40% 55%, 43% 75%,
              47% 60%, 50% 100%, 53% 60%, 57% 75%, 60% 55%, 63% 80%, 67% 60%,
              70% 90%, 73% 65%, 77% 85%, 80% 60%, 83% 92%, 87% 70%, 90% 95%,
              93% 80%, 97% 90%, 100% 100%
            );
          }
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        if (styleEl) {
          document.head.removeChild(styleEl);
        }
      };
    }
  }
  
  return () => {};
};

const styles = {
  navbar: {
    width: '100%',
    backgroundColor: '#252525',
    borderBottom: '6px solid #ff5e3a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem 2rem',
    imageRendering: 'pixelated',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1000,
    height: '60px',
  },
  navbarTitle: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '1.6rem',
    color: '#ff5e3a',
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    textDecoration: 'none',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'transform 0.2s',
    position: 'relative',
    paddingBottom: '0.5rem',
  },
  navbarTitleHover: {
    transform: 'scale(1.05)',
    color: '#ff8c00',
  },
  pixelPickaxe: {
    display: 'none',
  },
  titleText: {
    // No text shadow
  },
  navbarLinks: {
    display: 'flex',
    gap: '2rem',
  },
  navbarLink: {
    position: 'relative',
    color: '#e0e0e0',
    textDecoration: 'none',
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '0.9rem',
    padding: '0.6rem 1rem 0.8rem 1rem',
    transition: 'all 0.3s',
    overflow: 'visible',
    textTransform: 'uppercase',
    border: 'none',
    boxShadow: 'none',
    height: '100%',
  },
  navbarLinkHover: {
    color: '#ff5e3a',
    transform: 'translateY(-2px)',
    border: 'none',
  },
  // Pseudo-elements need to be handled in the component with separate elements
  linkFlameEffect: {
    content: "''",
    position: 'absolute',
    bottom: '-6px',
    left: 0,
    width: '100%',
    height: '28px',
    background: 'linear-gradient(to top, #ff5e3a 0%, #ffb300 60%, transparent 100%)',
    opacity: 0,
    transform: 'scaleY(1)',
    transformOrigin: 'bottom',
    transition: 'opacity 0.2s',
    zIndex: 5,
    imageRendering: 'pixelated',
  },
  linkFlameEffectHover: {
    opacity: 1,
    animation: `${KEYFRAMES.PIXEL_FLAME} 0.32s steps(1) infinite`,
  },
};

export default styles; 