import React, { useState, useRef, useEffect, useCallback } from 'react';
import THEME from '../theme';
import CONFIG from '../config';
import styles from '../styles/AssetCreationPopup';
import { Button } from './common';

const AssetCreationPopup = ({ isOpen, onClose, onAssetCreated }) => {
  const isMountedRef = useRef(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [assetBaseName, setAssetBaseName] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [imagePrompt, setImagePrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalSystemPrompt, setOriginalSystemPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [providers, setProviders] = useState([]);
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState('');
  const [isSystemPromptChanged, setIsSystemPromptChanged] = useState(false);
  const [systemPromptStatus, setSystemPromptStatus] = useState('');
  const [isLoadingSystemPrompt, setIsLoadingSystemPrompt] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState(null);
  const currentGenerationIdRef = useRef(null);
  const [abortController, setAbortController] = useState(null);
  const [showImageActions, setShowImageActions] = useState(false);

  const buttonStyles = React.useMemo(() => ({
    primaryButton: {
      ...styles.primaryButton,
      ...(uploadedImage ? {} : styles.disabledButton)
    },
  }), [uploadedImage]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (currentGenerationIdRef.current && isGenerating && abortController) {
        console.log('[AssetCreationPopup] Unmounting, attempting to abort generation ID:', currentGenerationIdRef.current);
        abortController.abort();
      }
    };
  }, [isGenerating, abortController]);

  const fetchData = useCallback(async (url, errorMessage) => {
    const response = await fetch(`${CONFIG.API.BASE_URL}${url}`);
    if (!response.ok) throw new Error(`${errorMessage}: ${response.statusText}`);
    return await response.json();
  }, []);

  useEffect(() => {
    let didCancel = false;
    if (isOpen && isInitialLoading) {
      const loadInitialData = async () => {
        try {
          const [providersData, systemPromptData] = await Promise.all([
            fetchData(CONFIG.API.ENDPOINTS.IMAGE_PROVIDERS, 'Failed to fetch providers'),
            fetchData(CONFIG.API.ENDPOINTS.GET_SYSTEM_PROMPT, 'Failed to fetch system prompt')
          ]);
          if (isMountedRef.current && !didCancel) {
            if (providersData && Array.isArray(providersData)) {
              setProviders(providersData);
              if (providersData.length > 0) setSelectedProvider(providersData[0].id);
            }
            if (systemPromptData && systemPromptData.systemPrompt) {
              setSystemPrompt(systemPromptData.systemPrompt);
              setOriginalSystemPrompt(systemPromptData.systemPrompt);
            }
            setIsInitialLoading(false);
          }
        } catch (error) {
          if (isMountedRef.current && !didCancel) {
            setError(`Failed to load initial data: ${error.message}`);
            setIsInitialLoading(false);
          }
        }
      };
      loadInitialData();
    }
    return () => { didCancel = true; };
  }, [isOpen, fetchData]);

  useEffect(() => {
    setIsSystemPromptChanged(originalSystemPrompt && systemPrompt !== originalSystemPrompt);
  }, [systemPrompt, originalSystemPrompt]);

  const saveSystemPrompt = async () => {
    if (!isMountedRef.current) return;
    setSystemPromptStatus('Saving...');
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.UPDATE_SYSTEM_PROMPT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt })
      });
      if (!response.ok) throw new Error(`Failed to save: ${response.statusText}`);
      const data = await response.json();
      if (isMountedRef.current) {
        setOriginalSystemPrompt(data.systemPrompt);
        setIsSystemPromptChanged(false);
        setSystemPromptStatus('Saved!');
        setTimeout(() => { if (isMountedRef.current) setSystemPromptStatus(''); }, 3000);
      }
    } catch (error) {
      if (isMountedRef.current) setSystemPromptStatus(`Error: ${error.message}`);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file || !isMountedRef.current) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setIsImageUploading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isMountedRef.current) {
        setUploadedImage({ file, preview: e.target.result, filename: file.name });
        const base = file.name.replace(/\.[^/.]+$/, '');
        setAssetBaseName(base);
        setIsImageUploading(false);
      }
    };
    reader.onerror = () => {
      if (isMountedRef.current) {
        setError('Failed to read the image file.');
        setIsImageUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadButtonClick = () => fileInputRef.current.click();
  const handleGenerateImageClick = () => setActiveTab('generate');

  // --- IMAGE GENERATION ---
  const handleAIImageGeneration = async () => {
    if (!imagePrompt.trim()) { setError('Please enter a prompt for image generation.'); return; }
    if (!selectedProvider) { setError('Please select an image generation provider.'); return; }
    setIsGenerating(true); setError(null);
    setShowImageActions(false); // Hide actions while generating
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.GENERATE_IMAGE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, systemPrompt, provider: selectedProvider }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (isMountedRef.current) {
        const imageUrl = `${CONFIG.API.BASE_URL}${data.url}`;
        let base = data.filename ? data.filename.replace(/\.[^/.]+$/, '') : imagePrompt.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
        setUploadedImage({ file: null, preview: imageUrl, filename: data.filename, url: data.url });
        setAssetBaseName(base);
        setLastGeneratedPrompt(imagePrompt);
        setShowImageActions(true);
        setActiveTab('upload');
      }
    } catch (error) {
      if (isMountedRef.current) setError(`Failed to generate image: ${error.message}`);
    } finally {
      if (isMountedRef.current) setIsGenerating(false);
    }
  };

  const handleEditImage = async () => {
    if (!uploadedImage || !uploadedImage.url) { setError('No image available to edit.'); return; }
    const editPrompt = prompt('Enter instructions for editing the image:', '');
    if (!editPrompt) return;
    setIsGenerating(true); setError(null);
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.EDIT_IMAGE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadedImage.url, prompt: editPrompt, systemPrompt }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (isMountedRef.current) {
        const editedImageUrl = `${CONFIG.API.BASE_URL}${data.url}`;
        let base = data.filename ? data.filename.replace(/\.[^/.]+$/, '') : assetBaseName;
        setUploadedImage({ file: null, preview: editedImageUrl, filename: data.filename, url: data.url });
        setAssetBaseName(base);
        setShowImageActions(true);
      }
    } catch (error) {
      if (isMountedRef.current) setError(`Failed to edit image: ${error.message}`);
    } finally {
      if (isMountedRef.current) setIsGenerating(false);
    }
  };

  const handleNewImageGeneration = () => {
    if (lastGeneratedPrompt) setImagePrompt(lastGeneratedPrompt);
    setActiveTab('generate');
    setShowImageActions(false);
  };

  // --- 3D ASSET GENERATION ---
  const handleGenerateClick = async () => {
    if (!uploadedImage || !isMountedRef.current) { 
      setError('You need to upload an image first.'); 
      return; 
    }
    
    setIsGenerating(true);
    setError(null);
    setShowImageActions(false);
    
    // Generate a unique ID for this generation process
    const generationId = Date.now().toString();
    setCurrentGenerationId(generationId);
    currentGenerationIdRef.current = generationId;

    // Inform parent component that generation is starting
    if (onAssetCreated) {
      onAssetCreated({ 
        inProgress: true, 
        step: 'starting', 
        message: 'Preparing image for generation...', 
        progress: 0,
        generationId: generationId
      });
    }

    try {
      // Prepare the image file
      let imageFile = uploadedImage.file;
      if (!imageFile && uploadedImage.preview) {
        if (onAssetCreated) {
          onAssetCreated({ 
            inProgress: true, 
            step: 'starting', 
            message: 'Fetching image data...', 
            progress: 5, 
            generationId 
          });
        }
        
        try {
          const response = await fetch(uploadedImage.preview);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          const blob = await response.blob();
          const ext = blob.type === 'image/png' ? '.png' : (blob.type === 'image/jpeg' ? '.jpg' : '.png');
          imageFile = new File([blob], (assetBaseName || 'generated-image') + ext, { type: blob.type || 'image/png' });
        } catch (fetchError) {
          setError(`Failed to prepare image: ${fetchError.message}`);
          setIsGenerating(false);
          if (onAssetCreated) {
            onAssetCreated({ 
              error: true, 
              errorMessage: `Failed to prepare image: ${fetchError.message}`, 
              generationId 
            });
          }
          return;
        }
      }
      
      if (!imageFile) { 
        setError('Could not retrieve the image data for 3D generation.'); 
        setIsGenerating(false); 
        if (onAssetCreated) {
          onAssetCreated({ 
            error: true, 
            errorMessage: 'Could not retrieve image data.', 
            generationId 
          });
        }
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('targetFolder', 'assets/image_uploads');
      const outputBase = (assetBaseName || 'asset') + '_' + generationId;
      formData.append('outputBase', outputBase);
      
      if (onAssetCreated) {
        onAssetCreated({ 
          inProgress: true, 
          step: 'preprocessing', 
          message: 'Sending image to generation service...', 
          progress: 10, 
          generationId 
        });
      }

      // Create abort controller for the request
      const newAbortController = new AbortController();
      setAbortController(newAbortController);

      // Send image to backend and let the parent component handle the rest
      const apiUrl = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TRELLIS}`;
      onAssetCreated({
        inProgress: true,
        step: 'preprocessing',
        message: 'Connecting to 3D generation service...',
        progress: 15,
        formData,
        apiUrl,
        generationId,
        abortController: newAbortController
      });
      
      // Close the popup after sending the image
      onClose();
      
    } catch (error) {
      console.error(`[3D Generation] Error initiating 3D asset generation:`, error);
      if (isMountedRef.current) {
        setError(`Failed to start 3D generation: ${error.message}`);
        setIsGenerating(false);
        if (onAssetCreated) {
          onAssetCreated({ 
            error: true, 
            errorMessage: `Failed to start 3D asset generation: ${error.message}`, 
            generationId 
          });
        }
      }
    }
  };

  if (!isOpen) return null;
  if (isInitialLoading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.popup}>
          <button style={styles.closeButton} onClick={onClose}>×</button>
          <h2 style={styles.title}>Create 3D Asset</h2>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading asset creator...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    if (isGenerating && currentGenerationIdRef.current) {
      const confirmed = window.confirm('Generation is in progress. Are you sure you want to close this dialog? The current generation process will be cancelled.');
      if (confirmed) {
        if (abortController) {
          console.log('[AssetCreationPopup] User confirmed close, aborting generation ID:', currentGenerationIdRef.current);
          abortController.abort();
        }
        if (onAssetCreated) {
            onAssetCreated({ error: true, errorMessage: 'Generation cancelled by user from popup.', generationId: currentGenerationIdRef.current, cancelled: true });
        }
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div style={styles.popup}>
        <button style={styles.closeButton} onClick={handleClose}>×</button>
        <h2 style={styles.title}>Create 3D Asset</h2>
        <div style={styles.tabsContainer}>
          <div style={{ ...styles.tab, ...(activeTab === 'upload' ? styles.activeTab : {}) }} onClick={() => setActiveTab('upload')}>Upload Image</div>
          <div style={{ ...styles.tab, ...(activeTab === 'generate' ? styles.activeTab : {}) }} onClick={() => setActiveTab('generate')}>Generate Image</div>
        </div>
        {activeTab === 'upload' ? (
          <>
            <div style={styles.imageContainer}>
              {isImageUploading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner}></div>
                  <p style={styles.loadingText}>Uploading image...</p>
                </div>
              ) : uploadedImage ? (
                <>
                  <img src={uploadedImage.preview} alt="Uploaded" style={styles.imagePreview} />
                </>
              ) : (
                <div style={styles.noImagePlaceholder}>
                  <div style={styles.uploadIcon}>🖼️</div>
                  <p style={styles.uploadText}>No image selected</p>
                  <p>Upload an image or generate one to create a 3D asset</p>
                </div>
              )}
            </div>
            <div style={styles.buttonsContainer}>
              <Button variant="secondary" onClick={handleUploadButtonClick} style={{ flex: 1, minHeight: 48, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} icon="📤">Upload Image</Button>
              <Button variant="secondary" onClick={handleGenerateImageClick} style={{ flex: 1, minHeight: 48, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} icon="✨">Generate Image</Button>
              {uploadedImage && (
                <Button variant="secondary" onClick={handleEditImage} style={{ flex: 1, minHeight: 48, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} icon="✏️">Edit Image</Button>
              )}
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
            </div>
            {isGenerating && !isImageUploading && activeTab === 'upload' && (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Generating image...</p>
              </div>
            )}
            {showImageActions && uploadedImage && !isGenerating && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <Button
                  variant="primary"
                  onClick={handleGenerateClick}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: '#ff5e3a', // THEME.accentPrimary
                    color: '#fff',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    padding: '1rem 0',
                    width: '70%',
                    margin: '0 auto 1rem auto',
                    display: 'block',
                    boxShadow: '0 4px 16px 0 #ff5e3a44',
                  }}
                  icon="🧊"
                >
                  Turn into 3D Asset
                </Button>
              </div>
            )}
          </>
        ) : (
          <div style={styles.promptContainer}>
            <div>
              <label style={styles.label}>Image Provider</label>
              <select style={styles.providerSelect} value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
                {providers.length === 0 && <option value="">Loading providers...</option>}
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Image Prompt</label>
              <textarea style={styles.promptTextarea} placeholder="Describe the image you want to generate..." value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} />
            </div>
            <div>
              <div style={styles.systemPromptHeader}>
                <label style={styles.secondaryLabel}>System Prompt (Style & Settings)</label>
                {isSystemPromptChanged && (
                  <Button variant="tertiary" onClick={saveSystemPrompt} style={{ padding: '4px 8px', fontSize: '12px' }}>Save as Default</Button>
                )}
              </div>
              <textarea style={styles.systemPromptTextarea} placeholder={isLoadingSystemPrompt ? "Loading system prompt..." : "Optional system prompt to set style and parameters..."} value={isLoadingSystemPrompt ? "Loading..." : systemPrompt} onChange={e => setSystemPrompt(e.target.value)} disabled={isLoadingSystemPrompt} />
              <div style={styles.progressStatusMessage}>
                {systemPromptStatus && (
                  <span style={systemPromptStatus === 'Saved!' ? styles.successMessage : systemPromptStatus === 'Saving...' ? styles.loadingMessage : null}>{systemPromptStatus}</span>
                )}
              </div>
            </div>
            <Button variant="primary" onClick={handleAIImageGeneration} disabled={!imagePrompt.trim() || !selectedProvider || isGenerating || isLoadingSystemPrompt}>Generate Image</Button>
          </div>
        )}
        {error && (
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>❌</div>
            <div style={styles.errorTitle}>Generation Failed</div>
            <div style={styles.errorMessage}>{error}</div>
            <Button variant="secondary" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}
        {isGenerating && activeTab === 'upload' ? (
             <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Initiating 3D model generation...</p>
             </div>
        ) : (
          activeTab === 'upload' && !showImageActions && uploadedImage && (
            <button style={buttonStyles.primaryButton} onClick={handleGenerateClick} disabled={!uploadedImage || isGenerating}>Generate 3D Asset</button>
          )
        )}
      </div>
    </div>
  );
};

export default AssetCreationPopup; 