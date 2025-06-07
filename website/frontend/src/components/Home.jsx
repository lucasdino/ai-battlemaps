import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import THEME from '../theme';

const styles = {
  homeContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundImage: 'url(/epicadventure.gif)',
    backgroundSize: 'cover',
    backgroundPosition: 'top left',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 1001,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  titleContainer: {
    position: 'relative',
    zIndex: 2,
    marginTop: '15vh',
    textAlign: 'center',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'normal',
    color: THEME.accentPrimary,
    textShadow: '3px 3px 0px rgba(0, 0, 0, 0.8), 6px 6px 0px rgba(0, 0, 0, 0.4)',
    fontFamily: "'Press Start 2P', cursive",
    letterSpacing: '0.1em',
    minHeight: '5rem',
    imageRendering: 'pixelated',
    textTransform: 'uppercase',
  },
  cursor: {
    animation: 'blink 1s infinite',
  },
  buttonContainer: {
    position: 'relative',
    zIndex: 2,
    marginBottom: '8vh',
    display: 'flex',
    gap: '3rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    padding: '1.5rem 2.5rem',
    fontSize: '0.8rem',
    fontWeight: 'normal',
    color: '#fff',
    backgroundColor: '#252525',
    border: `4px solid ${THEME.accentPrimary}`,
    borderRadius: '0px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textShadow: '2px 2px 0px rgba(0, 0, 0, 0.8)',
    fontFamily: "'Press Start 2P', cursive",
    minWidth: '280px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    imageRendering: 'pixelated',
    position: 'relative',
    boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.6)',
  },
  buttonHover: {
    backgroundColor: THEME.accentPrimary,
    color: '#000',
    transform: 'translate(-2px, -2px)',
    boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.8)',
    border: `4px solid #fff`,
  },
  buttonActive: {
    transform: 'translate(2px, 2px)',
    boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.6)',
  }
};

const Home = () => {
  const navigate = useNavigate();
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [buttonHover, setButtonHover] = useState({ forge: false, explore: false });
  const [buttonActive, setButtonActive] = useState({ forge: false, explore: false });
  const fullText = 'Dungeon Coder';

  // Import the font if not already imported
  useEffect(() => {
    const fontLink = document.getElementById('pixel-font-import');
    if (!fontLink) {
      const link = document.createElement('link');
      link.id = 'pixel-font-import';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Prevent scrolling when this component is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setShowCursor(false);
      }
    }, 150);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleButtonClick = (action) => {
    if (action === 'Forge New Assets') {
      navigate('/view-assets');
    } else if (action === 'Explore New Dungeons') {
      navigate('/view-terrains');
    }
  };

  return (
    <div style={styles.homeContainer}>
      <div style={styles.overlay}></div>
      
      <div style={styles.titleContainer}>
        <h1 style={styles.title}>
          {displayedText}
          {showCursor && <span style={styles.cursor}>|</span>}
        </h1>
      </div>

      <div style={styles.buttonContainer}>
        <button
          style={{
            ...styles.button,
            ...(buttonHover.forge ? styles.buttonHover : {}),
            ...(buttonActive.forge ? styles.buttonActive : {})
          }}
          onMouseEnter={() => setButtonHover(prev => ({ ...prev, forge: true }))}
          onMouseLeave={() => setButtonHover(prev => ({ ...prev, forge: false }))}
          onMouseDown={() => setButtonActive(prev => ({ ...prev, forge: true }))}
          onMouseUp={() => setButtonActive(prev => ({ ...prev, forge: false }))}
          onClick={() => handleButtonClick('Forge New Assets')}
        >
          Create 3D Models
        </button>
        
        <button
          style={{
            ...styles.button,
            ...(buttonHover.explore ? styles.buttonHover : {}),
            ...(buttonActive.explore ? styles.buttonActive : {})
          }}
          onMouseEnter={() => setButtonHover(prev => ({ ...prev, explore: true }))}
          onMouseLeave={() => setButtonHover(prev => ({ ...prev, explore: false }))}
          onMouseDown={() => setButtonActive(prev => ({ ...prev, explore: true }))}
          onMouseUp={() => setButtonActive(prev => ({ ...prev, explore: false }))}
          onClick={() => handleButtonClick('Explore New Dungeons')}
        >
          Generate Dungeons
        </button>
      </div>
    </div>
  );
};

export default Home; 