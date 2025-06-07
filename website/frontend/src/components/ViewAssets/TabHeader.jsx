import React, { useState } from 'react';
import styles from '../../styles/ViewAssets';

const TabHeader = ({ activeTab, onTabSwitch }) => {
  const [hoveredTab, setHoveredTab] = useState(null);

  const getTabStyle = (tabName) => {
    const isActive = activeTab === tabName;
    const isHovered = hoveredTab === tabName;
    
    return {
      ...styles.tabButton,
      ...(isActive ? styles.tabButtonActive : styles.tabButtonInactive),
      ...(isHovered && !isActive ? styles.tabButtonInactiveHover : {})
    };
  };

  return (
    <div style={styles.tabContainer}>
      <button
        style={getTabStyle('my_models')}
        onClick={() => onTabSwitch('my_models')}
        onMouseEnter={() => setHoveredTab('my_models')}
        onMouseLeave={() => setHoveredTab(null)}
      >
        My Models
      </button>
      <button
        style={getTabStyle('default_models')}
        onClick={() => onTabSwitch('default_models')}
        onMouseEnter={() => setHoveredTab('default_models')}
        onMouseLeave={() => setHoveredTab(null)}
      >
        Default Models
      </button>
    </div>
  );
};

export default TabHeader; 