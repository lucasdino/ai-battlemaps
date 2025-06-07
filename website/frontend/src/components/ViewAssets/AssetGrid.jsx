import React from 'react';
import THEME from '../../theme';
import styles from '../../styles/ViewAssets';
import AssetGridItem from './AssetGridItem';

const AssetGrid = ({ 
  assets, 
  selectedModel, 
  onAssetSelect, 
  loading, 
  error, 
  emptyMessage, 
  gridMaxHeight, 
  mobileStyles,
  isDefault = false 
}) => {
  if (loading) {
    return (
      <div style={{ color: THEME.textSecondary, textAlign: 'center', padding: '20px' }}>
        {loading}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{...styles.message, ...styles.error}}>
        {error}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <p style={{ color: THEME.textSecondary }}>
        {emptyMessage || 'No assets available'}
      </p>
    );
  }

  return (
    <div style={{
      ...styles.assetGrid, 
      ...mobileStyles?.assetGrid,
      ...(gridMaxHeight && { maxHeight: `${gridMaxHeight}px`, overflow: 'hidden' })
    }}>
      {assets.map((asset, index) => (
        <AssetGridItem
          key={asset.id || index}
          asset={asset}
          isSelected={selectedModel && selectedModel.id === asset.id}
          onClick={() => onAssetSelect(asset)}
          isDefault={isDefault}
        />
      ))}
    </div>
  );
};

export default AssetGrid; 