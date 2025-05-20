import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles, { importFont, addNavbarAnimations, KEYFRAMES } from '../styles/Navbar';

const Navbar = () => {
  const [hoveredLink, setHoveredLink] = useState(null);
  
  // Import font and add animations on component mount
  useEffect(() => {
    importFont();
    const cleanup = addNavbarAnimations();
    return cleanup;
  }, []);

  return (
    <nav style={styles.navbar}>
      <Link 
        to="/" 
        style={styles.navbarTitle}
        onMouseEnter={() => setHoveredLink('title')}
        onMouseLeave={() => setHoveredLink(null)}
      >
        <span style={styles.titleText}>Dungeon Coder</span>
        {/* Flame effect element */}
        <span 
          style={{
            ...styles.linkFlameEffect,
            ...(hoveredLink === 'title' ? styles.linkFlameEffectHover : {})
          }}
        />
      </Link>
      <div style={styles.navbarLinks}>
        <Link 
          to="/" 
          style={styles.navbarLink}
          onMouseEnter={() => setHoveredLink('home')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Home
          <span 
            style={{
              ...styles.linkFlameEffect,
              ...(hoveredLink === 'home' ? styles.linkFlameEffectHover : {})
            }}
          />
        </Link>
        <Link 
          to="/view-assets" 
          style={styles.navbarLink}
          onMouseEnter={() => setHoveredLink('assets')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          3D Models
          <span 
            style={{
              ...styles.linkFlameEffect,
              ...(hoveredLink === 'assets' ? styles.linkFlameEffectHover : {})
            }}
          />
        </Link>
        <Link 
          to="/terrain-generator" 
          style={styles.navbarLink}
          onMouseEnter={() => setHoveredLink('terrain')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Terrain Generator
          <span 
            style={{
              ...styles.linkFlameEffect,
              ...(hoveredLink === 'terrain' ? styles.linkFlameEffectHover : {})
            }}
          />
        </Link>
      </div>
    </nav>
  );
};

export default Navbar; 