import React from 'react';
import CONFIG from '../../config';
import styles from '../../styles/ViewAssets';
import { formatFileName } from '../../utils/assetHelpers';

const AssetGridItem = ({ asset, isSelected, onClick, isDefault = false }) => {
  // Render asset thumbnail for user assets
  const renderAssetThumbnail = (asset) => { 
    if (asset.thumbnailUrl) {
      let thumbnailSrc;
      if (asset.thumbnailUrl.startsWith('http') || asset.thumbnailUrl.startsWith('data:')) {
        thumbnailSrc = asset.thumbnailUrl;
      } else {
        // Ensure leading slash for relative paths
        thumbnailSrc = `${CONFIG.API.BASE_URL}${asset.thumbnailUrl.startsWith('/') ? '' : '/'}${asset.thumbnailUrl}`;
      }
      
      return (
        <div style={styles.assetThumbnail}>
          <img 
            src={thumbnailSrc}
            alt={asset.displayName || asset.name || asset.id}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.dataset.thumbnailError = 'true';
              e.target.onerror = null; 
              const parent = e.currentTarget.parentNode;
              if (parent) {
                parent.innerHTML = '<span style="font-size: 24px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">📦</span>';
              }
            }}
          />
        </div>
      );
    }

    // Default placeholder icon if no image thumbnail is available
    return (
      <div style={styles.assetThumbnail}>
        <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>📦</span>
      </div>
    );
  };

  // Render thumbnail for default assets
  const renderDefaultAssetThumbnail = (asset) => {
    const iconUrl = asset.iconUrl;
    
    if (iconUrl) {
      const fullIconUrl = iconUrl.startsWith('http') 
        ? iconUrl 
        : `${CONFIG.API.BASE_URL}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`;
      
      return (
        <div style={styles.assetThumbnail}>
          <img 
            src={fullIconUrl}
            alt={asset.name || 'Default asset thumbnail'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null; 
              const parent = e.currentTarget.parentNode;
              if (parent) {
                parent.innerHTML = '<span style="font-size: 24px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🏛️</span>';
              }
            }}
          />
        </div>
      );
    }
    
    return (
      <div style={styles.assetThumbnail}>
        <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>🏛️</span>
      </div>
    );
  };

  const displayName = isDefault 
    ? (asset.name || '(no name)')
    : (asset.displayName || formatFileName(asset.name) || '(no name)');

  return (
    <div 
      style={{
        ...styles.assetItem,
        ...(isSelected ? styles.assetItemSelected : {})
      }}
      onClick={onClick}
    >
      {isDefault ? renderDefaultAssetThumbnail(asset) : renderAssetThumbnail(asset)}
      <div style={{
        ...styles.assetName,
        color: '#fff', // Force white font
        fontSize: '11px', // Small font
        marginTop: '4px',
        lineHeight: '1.2',
        textShadow: '0 1px 2px #000a',
      }}>
        {displayName}
      </div>
    </div>
  );
};

export default AssetGridItem; 