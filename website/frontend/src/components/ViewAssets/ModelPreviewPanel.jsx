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