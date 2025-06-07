import React from 'react';
import { Button } from '../common';
import ModelViewer from '../ModelViewer';
import styles from '../../styles/ViewAssets';
import { getModelUrl } from '../../utils/assetHelpers';

const GenerationProgress = ({ 
  generationStatus, 
  progressCount, 
  actionVideoUrl, 
  actionModel, 
  onClose, 
  onActionModelError, 
  onModelDeleted 
}) => {
  return (
    <div style={styles.generationContainer}>
      <div style={styles.generationHeader}>
        {!generationStatus.error && <div style={styles.generationSpinner}></div>}
        <h3 style={styles.generationTitle}>
          {generationStatus.error ? 'Generation Failed' : 'Generating 3D Asset'}
        </h3>
      </div>
      
      {generationStatus.error ? (
        <>
          <div style={styles.generationError}>
            {generationStatus.errorMessage || 'An error occurred during generation'}
          </div>
          <Button 
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </>
      ) : (
        <>
          {/* Progress Bar */}
          <div style={styles.progress.stepsContainer}>
            <div style={styles.progress.progressLine}></div>
            <div 
              style={{
                ...styles.progress.progressFill,
                width: `${(progressCount / 5) * 100}%`,
                transition: 'width 0.7s cubic-bezier(.4,1.4,.6,1)',
                boxShadow: '0 0 16px 2px #00aaff88',
              }}
            ></div>
          </div>
          <div style={styles.progress.statusMessage}>
            {generationStatus.message || 'Processing...'}
          </div>
          
          {/* Render video if available from action */}
          {actionVideoUrl && !actionModel && (
            <div style={styles.generationPreviewContainer}>
              <div style={{position: 'relative', width: '100%', height: '100%'}}>
                <video 
                  src={actionVideoUrl}
                  style={styles.generationPreviewVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 32px 4px #00ffaa99'}
                  onMouseOut={e => e.currentTarget.style.boxShadow = styles.generationPreviewVideo.boxShadow}
                />
              </div>
            </div>
          )}
          
          {/* Render model viewer if GLB saved and model data is available */}
          {actionModel && (
            <ModelViewer 
              modelUrl={getModelUrl(actionModel)}
              modelName={actionModel.displayName || actionModel.name}
              modelId={actionModel.id}
              videoUrl={actionModel.videoUrl}
              onError={onActionModelError}
              hideControls={true}
              onModelDeleted={onModelDeleted}
            />
          )}
          
          {/* Fallback to previewUrl if present and not overridden by action video or model */}
          {!actionVideoUrl && !actionModel && generationStatus.previewUrl && (
            <div style={styles.generationPreviewContainer}>
              <video 
                src={generationStatus.previewUrl}
                style={styles.generationPreviewVideo}
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GenerationProgress; 