import React, { useState } from 'react';

const AssetEditPopup = ({ 
  asset, 
  position, 
  isDraggingAsset = false,
  onRotate, 
  onResize, 
  onDelete, 
  onPickUp, 
  onClose 
}) => {
  const [scale, setScale] = useState(asset ? asset.scale.x : 1);
  const [rotation, setRotation] = useState(asset ? asset.rotation.y : 0);

  if (!asset || !position) {
    return null;
  }

  const popupStyle = {
    position: 'absolute',
    left: position.x + 10,
    top: position.y - 10,
    background: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    minWidth: '200px',
    fontSize: '14px'
  };

  const buttonStyle = {
    background: '#007bff',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '2px',
    fontSize: '12px'
  };

  const sliderStyle = {
    width: '100%',
    margin: '5px 0'
  };

  return (
    <div style={popupStyle} onClick={(e) => e.stopPropagation()}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        Edit: {asset.name}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label>Scale: {scale.toFixed(2)}</label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={scale}
          onChange={(e) => {
            const newScale = parseFloat(e.target.value);
            setScale(newScale);
            onResize(newScale);
          }}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Rotation: {Math.round(rotation * 180 / Math.PI)}°</label>
        <input
          type="range"
          min="0"
          max={Math.PI * 2}
          step="0.1"
          value={rotation}
          onChange={(e) => {
            const newRotation = parseFloat(e.target.value);
            setRotation(newRotation);
            onRotate(newRotation);
          }}
          style={sliderStyle}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        <button style={buttonStyle} onClick={onPickUp}>
          {isDraggingAsset ? 'Moving...' : 'Move Asset'}
        </button>
        <button style={{...buttonStyle, background: '#dc3545'}} onClick={onDelete}>
          Delete
        </button>
        <button style={{...buttonStyle, background: '#6c757d'}} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default AssetEditPopup; 