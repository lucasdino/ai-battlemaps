import React from 'react';
import THEME from '../theme';

const styles = {
  title: {
    color: THEME.accentPrimary,
    marginBottom: '1rem',
  },
  forgeBlurb: {
    color: THEME.textPrimary,
    fontSize: '1.1rem',
  },
  blurbHighlight: {
    color: THEME.accentPrimary,
    fontWeight: 'bold',
  }
};

const Home = () => {
  return (
    <div className="home-forge" style={THEME.forge}>
      <h2 style={styles.title}>Welcome to the Forge</h2>
      <p className="forge-blurb" style={styles.forgeBlurb}>
        Deep in the glowing heart of the mountain, the dwarves have discovered a new magic: <span style={styles.blurbHighlight}>AI-powered DnD Battlemap Generation</span>!<br/>
        Upload your .glb files and let the ancient runes and modern code craft your next adventure map, straight from the forge.
      </p>
    </div>
  );
};

export default Home; 