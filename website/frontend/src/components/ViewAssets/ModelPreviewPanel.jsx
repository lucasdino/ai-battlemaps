import React from 'react';
import ModelViewer from '../ModelViewer';
import GenerationProgress from './GenerationProgress';
import styles from '../../styles/ViewAssets';
import { getModelUrl } from '../../utils/assetHelpers';

const ModelPreviewPanel = ({
  // State
  isLoading,
  generationStatus,
  selectedModel,
  assets,
  
  // Generation progress props
  progressCount,
  actionVideoUrl,
  actionModel,
  
  // Handlers
  onFileUpload,
  onModelError,
  onActionModelError,
  onModelNameChange,
  onModelDeleted,
  onGenerationClose,
  onOpenAssetConfig, // NEW: Handler for opening asset configuration
  
  // Dropzone
  isDragActive,
  getRootProps,
  getInputProps
}) => {
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading assets...</p>
      </div>
    );
  }

  if (generationStatus.inProgress || generationStatus.error) {
    return (
      <GenerationProgress
        generationStatus={generationStatus}
        progressCount={progressCount}
        actionVideoUrl={actionVideoUrl}
        actionModel={actionModel}
        onClose={onGenerationClose}
        onActionModelError={onActionModelError}
        onModelDeleted={onModelDeleted}
      />
    );
  }

  if (selectedModel) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ModelViewer 
          modelUrl={selectedModel.isDefault ? selectedModel.modelUrl : getModelUrl(selectedModel)} 
          modelName={selectedModel.displayName || selectedModel.name}
          modelId={selectedModel.id}
          videoUrl={selectedModel.videoUrl}
          onError={onModelError}
          onModelNameChange={selectedModel.isDefault ? undefined : onModelNameChange}
          onModelDeleted={selectedModel.isDefault ? undefined : onModelDeleted}
          hideControls={selectedModel.isDefault ? true : false}
        />
        
        {/* Configure button for default assets */}
        {selectedModel.isDefault && onOpenAssetConfig && (
          <button
            onClick={() => onOpenAssetConfig(selectedModel)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: '#e67e22',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 100,
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f39c12'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#e67e22'}
          >
            ⚙️ Configure Size
          </button>
        )}
      </div>
    );
  }

  // Dropzone when no model is selected
  return (
    <div 
      {...getRootProps()} 
      style={{
        ...styles.dropzone,
        ...(isDragActive ? styles.dropzoneActive : {})
      }}
    >
      <input {...getInputProps()} />
      <div style={styles.uploadIcon}>📤</div>
      {isDragActive ? (
        <p style={styles.dropzoneText}>Drop the .glb file here ...</p>
      ) : (
        <>
          <p style={styles.dropzoneText}>
            {assets.length > 0 ? "Click an asset or upload here" : "Upload some assets here!"}
          </p>
          <p style={styles.dropzoneSubText}>
            Drag & drop a .glb file or click to browse
          </p>
        </>
      )}
    </div>
  );
};

export default ModelPreviewPanel; 