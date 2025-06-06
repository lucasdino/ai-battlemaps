import React, { useState, useRef, useEffect, useCallback } from 'react';
import THEME from '../theme';
import CONFIG from '../config';
import styles from '../styles/AssetCreationPopup';
import { Button } from './common';

const AssetCreationPopup = ({ isOpen, onClose, onAssetCreated, generationStatus }) => {
  const isMountedRef = useRef(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [assetBaseName, setAssetBaseName] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [view, setView] = useState('upload'); // Default to 'upload' tab
  const [imagePrompt, setImagePrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [generationSystemPrompt, setGenerationSystemPrompt] = useState('');
  const [editSystemPrompt, setEditSystemPrompt] = useState('');
  const [originalGenerationSystemPrompt, setOriginalGenerationSystemPrompt] = useState('');
  const [originalEditSystemPrompt, setOriginalEditSystemPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [providers, setProviders] = useState([]);
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState('');
  const [isGenerationSystemPromptChanged, setIsGenerationSystemPromptChanged] = useState(false);
  const [isEditSystemPromptChanged, setIsEditSystemPromptChanged] = useState(false);
  const [systemPromptStatus, setSystemPromptStatus] = useState('');
  const [isLoadingSystemPrompt, setIsLoadingSystemPrompt] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState(null);
  const currentGenerationIdRef = useRef(null);
  const [abortController, setAbortController] = useState(null);
  const [showImageActions, setShowImageActions] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showEditSystemPrompt, setShowEditSystemPrompt] = useState(false);
  const [imagesForEditing, setImagesForEditing] = useState([]);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [modelAssets, setModelAssets] = useState([]);
  const [modelAssetsPage, setModelAssetsPage] = useState(1);
  const MODEL_ASSETS_PER_PAGE = 12;
  const [editImagePage, setEditImagePage] = useState(0);
  const [editImageWarning, setEditImageWarning] = useState('');
  const carouselRef = useRef(null);
  const IMAGES_PER_PAGE = 1;

  const buttonStyles = React.useMemo(() => ({
    primaryButton: {
      ...styles.primaryButton,
      ...(uploadedImage ? {} : styles.disabledButton)
    },
  }), [uploadedImage]);

  // Separate file input ref for editing images so we can reuse the original one for uploads
  const editFileInputRef = useRef(null);

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
            if (systemPromptData) {
              setGenerationSystemPrompt(systemPromptData.generation_systemPrompt || '');
              setOriginalGenerationSystemPrompt(systemPromptData.generation_systemPrompt || '');
              setEditSystemPrompt(systemPromptData.imageEdit_systemPrompt || '');
              setOriginalEditSystemPrompt(systemPromptData.imageEdit_systemPrompt || '');
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
    setIsGenerationSystemPromptChanged(originalGenerationSystemPrompt && generationSystemPrompt !== originalGenerationSystemPrompt);
  }, [generationSystemPrompt, originalGenerationSystemPrompt]);

  useEffect(() => {
    setIsEditSystemPromptChanged(originalEditSystemPrompt && editSystemPrompt !== originalEditSystemPrompt);
  }, [editSystemPrompt, originalEditSystemPrompt]);

  const saveGenerationSystemPrompt = async () => {
    if (!isMountedRef.current) return;
    setSystemPromptStatus('Saving...');
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.UPDATE_SYSTEM_PROMPT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_systemPrompt: generationSystemPrompt })
      });
      if (!response.ok) throw new Error(`Failed to save: ${response.statusText}`);
      const data = await response.json();
      if (isMountedRef.current) {
        setOriginalGenerationSystemPrompt(data.generation_systemPrompt);
        setIsGenerationSystemPromptChanged(false);
        setSystemPromptStatus('Saved!');
        setTimeout(() => { if (isMountedRef.current) setSystemPromptStatus(''); }, 3000);
      }
    } catch (error) {
      if (isMountedRef.current) setSystemPromptStatus(`Error: ${error.message}`);
    }
  };

  const saveEditSystemPrompt = async () => {
    if (!isMountedRef.current) return;
    setSystemPromptStatus('Saving...');
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.UPDATE_SYSTEM_PROMPT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageEdit_systemPrompt: editSystemPrompt })
      });
      if (!response.ok) throw new Error(`Failed to save: ${response.statusText}`);
      const data = await response.json();
      if (isMountedRef.current) {
        setOriginalEditSystemPrompt(data.imageEdit_systemPrompt);
        setIsEditSystemPromptChanged(false);
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
        // After a successful upload, return to main view
        setView('main');
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
  const handleGenerateImageClick = () => setView('generate');
  const handleEditImageClick = async () => {
    setEditPrompt('');
    setImagesForEditing([]);

    if (uploadedImage) {
      let imgFile = uploadedImage.file;
      try {
        if (!imgFile && uploadedImage.preview) {
          const resp = await fetch(uploadedImage.preview);
          if (resp.ok) {
            const blob = await resp.blob();
            const ext = blob.type === 'image/png' ? '.png' : (blob.type === 'image/jpeg' ? '.jpg' : '.png');
            imgFile = new File([blob], (uploadedImage.filename ? uploadedImage.filename.replace(/\.[^/.]+$/, '') : 'image') + ext, { type: blob.type || 'image/png' });
          }
        }
        if (imgFile) {
          const preview = URL.createObjectURL(imgFile);
          setImagesForEditing([{ file: imgFile, preview, id: `${Date.now()}-${Math.random().toString(36).substr(2,9)}` }]);
        }
      } catch (err) {
        console.error('Error preparing image for edit:', err);
      }
    }

    setView('edit');
  };

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
        body: JSON.stringify({ 
          prompt: imagePrompt, 
          systemPrompt: generationSystemPrompt,
          provider: selectedProvider 
        }),
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
        setView('main');
      }
    } catch (error) {
      if (isMountedRef.current) setError(`Failed to generate image: ${error.message}`);
    } finally {
      if (isMountedRef.current) setIsGenerating(false);
    }
  };

  const handleEditImage = async () => {
    if (imagesForEditing.length === 0) { 
      setError('Please select at least one image to edit.'); 
      return; 
    }
    if (!editPrompt.trim()) {
      setError('Please enter instructions for editing the image.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('prompt', editPrompt);
    formData.append('systemPrompt', editSystemPrompt);
    imagesForEditing.forEach(img => {
      formData.append('images', img.file);
    });
    
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.EDIT_IMAGE}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (isMountedRef.current) {
        const editedImageUrl = `${CONFIG.API.BASE_URL}${data.url}`;
        let base = data.filename ? data.filename.replace(/\.[^/.]+$/, '') : assetBaseName || 'edited-image';
        setUploadedImage({ file: null, preview: editedImageUrl, filename: data.filename, url: data.url });
        setAssetBaseName(base);
        setShowImageActions(true);
        setView('main');
        imagesForEditing.forEach(img => URL.revokeObjectURL(img.preview));
        setImagesForEditing([]);
      }
    } catch (error) {
      if (isMountedRef.current) setError(`Failed to edit image: ${error.message}`);
    } finally {
      if (isMountedRef.current) setIsGenerating(false);
    }
  };

  const handleNewImageGeneration = () => {
    if (lastGeneratedPrompt) setImagePrompt(lastGeneratedPrompt);
    setView('generate');
    setShowImageActions(false);
  };

  // --- 3D ASSET GENERATION ---
  const handleGenerateClick = async () => {
    if (!uploadedImage || !isMountedRef.current) { 
      setError('You need to upload an image first.'); 
      return; 
    }
    
    console.log('[AssetCreationPopup] Starting 3D asset generation');
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

  // Reset generation state and view when popup is reopened
  useEffect(() => {
    if (isOpen && generationStatus && !generationStatus.inProgress) {
      // Reset our internal generation state when the popup is opened and no generation is in progress
      setIsGenerating(false);
      setCurrentGenerationId(null);
      currentGenerationIdRef.current = null;
      if (abortController) {
        abortController.abort();
        setAbortController(null);
      }
      setView('upload'); // Always go to upload tab on open
      // Clean up any lingering imagesForEditing previews if the popup was closed abruptly from edit view
      if (imagesForEditing.length > 0) {
        imagesForEditing.forEach(img => URL.revokeObjectURL(img.preview));
        setImagesForEditing([]);
      }
    }
  }, [isOpen, generationStatus, abortController]);

  // Effect for cleaning up Object URLs from imagesForEditing when component unmounts or view changes from 'edit'
  useEffect(() => {
    // Cleanup function to run when component unmounts or dependencies change
    return () => {
      if (imagesForEditing.length > 0) {
        // This will run on unmount
        imagesForEditing.forEach(img => URL.revokeObjectURL(img.preview));
      }
    };
  }, [imagesForEditing]); // Run when imagesForEditing array instance changes

  useEffect(() => {
    if (view !== 'edit' && imagesForEditing.length > 0) {
        imagesForEditing.forEach(img => URL.revokeObjectURL(img.preview));
        setImagesForEditing([]);
    }
  }, [view]); // Run when view changes

  // Fetch assets for model picker
  const fetchModelAssets = useCallback(async () => {
    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MODELS.BASE}`);
      if (!response.ok) throw new Error(`Failed to fetch assets: ${response.status}`);
      const data = await response.json();
      const arr = Array.isArray(data.models) ? data.models : (Array.isArray(data) ? data : []);
      setModelAssets(arr);
    } catch (e) {
      console.error('Model picker fetch error:', e);
    }
  }, []);

  const openModelPicker = () => {
    if (modelAssets.length === 0) fetchModelAssets();
    setIsModelPickerOpen(true);
  };

  const closeModelPicker = () => setIsModelPickerOpen(false);

  const addAssetIconToEditing = async (asset) => {
    if (!asset || !asset.icon) return;
    try {
      let iconUrl = asset.icon;
      if (!iconUrl.startsWith('http')) {
        iconUrl = `${CONFIG.API.BASE_URL}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`;
      }
      const resp = await fetch(iconUrl);
      if (!resp.ok) throw new Error('Failed to fetch icon');
      const blob = await resp.blob();
      const ext = blob.type === 'image/png' ? '.png' : (blob.type === 'image/jpeg' ? '.jpg' : '.png');
      const file = new File([blob], (asset.displayName || asset.name || asset.id) + ext, { type: blob.type || 'image/png' });
      const preview = URL.createObjectURL(file);
      setImagesForEditing(prev => [...prev, { file, preview, id: `${Date.now()}-${Math.random().toString(36).substr(2,9)}` }]);
      setIsModelPickerOpen(false);
    } catch (err) {
      console.error('Error adding asset icon:', err);
    }
  };

  // Clamp images array to max 4 & adjust carousel page safely
  useEffect(() => {
    if (imagesForEditing.length > 4) {
      setImagesForEditing(prev => prev.slice(0, 4));
      return; // wait until length clamped before adjusting page
    }
    const maxPage = Math.max(0, Math.ceil(imagesForEditing.length / IMAGES_PER_PAGE) - 1);
    setEditImagePage(p => (p > maxPage ? maxPage : p));
  }, [imagesForEditing]);

  const nextPage = () => {
    setEditImagePage(p => {
      const maxPage = Math.max(0, Math.ceil(imagesForEditing.length / IMAGES_PER_PAGE) - 1);
      const newPage = Math.min(maxPage, p + 1);
      return newPage;
    });
  };

  const prevPage = () => {
    setEditImagePage(p => Math.max(0, p - 1));
  };

  // Carousel movement handled by CSS transform; no manual scroll needed
  useEffect(() => {}, [editImagePage]);

  // Derived carousel metrics
  const slideWidthPercent = imagesForEditing.length > 0 ? 100 / imagesForEditing.length : 100;
  const trackWidthPercent = 100 * imagesForEditing.length;

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
      console.log('[AssetCreationPopup] User closing dialog with active generation', 
        { isGenerating, generationId: currentGenerationIdRef.current });
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
      console.log('[AssetCreationPopup] Closing popup, no active generation', { isGenerating });
      onClose();
    }
  };

  // Helper functions for managing imagesForEditing
  const handleEditFilesSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substr(2, 9)}` // More robust unique ID
    }));

    setImagesForEditing(prev => {
      // Simple concatenation, could add checks for duplicates if necessary
      return [...prev, ...newImages];
    });

    // Clear the file input value to allow selecting the same file again if removed
    if (event.target) {
      event.target.value = null;
    }
  };

  const removeImageForEditing = (idToRemove) => {
    setImagesForEditing(prevImages => 
      prevImages.filter(image => {
        if (image.id === idToRemove) {
          URL.revokeObjectURL(image.preview); // Clean up object URL for the removed image
          return false;
        }
        return true;
      })
    );
  };

  // --- UI rendering ---
  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div style={styles.popup}>
        <button style={styles.closeButton} onClick={handleClose}>×</button>
        <h2 style={styles.title}>Create 3D Asset</h2>
        {(view === 'upload' || view === 'generate' || view === 'edit') && (
          <div style={styles.tabsContainer}>
            <div
              style={{ ...styles.tab, ...(view === 'upload' ? styles.activeTab : {}) }}
              onClick={() => setView('upload')}
            >
              Upload Image
            </div>
            <div
              style={{ ...styles.tab, ...(view === 'generate' ? styles.activeTab : {}) }}
              onClick={() => setView('generate')}
            >
              Generate Image
            </div>
            <div
              style={{ ...styles.tab, ...(view === 'edit' ? styles.activeTab : {}) }}
              onClick={() => setView('edit')}
            >
              Edit Image
            </div>
          </div>
        )}
        {view === 'main' ? (
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
              <Button variant="secondary" onClick={() => setView('upload')} style={{ flex: 1, minHeight: 48, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} icon="📤">Upload New Image</Button>
              <Button variant="secondary" onClick={handleGenerateImageClick} style={{ flex: 1, minHeight: 48, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} icon="✨">Generate New Image</Button>
              {uploadedImage && (
                <Button variant="secondary" onClick={handleEditImageClick} style={{ flex: 1, minHeight: 48, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} icon="✏️">Edit Image</Button>
              )}
            </div>
            {isGenerating && !isImageUploading && (
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
                    backgroundColor: '#ff5e3a',
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
            {isGenerating && (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Initiating 3D model generation...</p>
              </div>
            )}
            {!showImageActions && uploadedImage && !isGenerating && (
              <button style={buttonStyles.primaryButton} onClick={handleGenerateClick} disabled={!uploadedImage || isGenerating}>Generate 3D Asset</button>
            )}
          </>
        ) : view === 'upload' ? (
          /* Upload Image View */
          <div style={{ ...styles.promptContainer, justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <div style={styles.uploadBox} onClick={handleUploadButtonClick}>
              {isImageUploading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner}></div>
                  <p style={styles.loadingText}>Uploading...</p>
                </div>
              ) : (
                <>
                  <div style={{ ...styles.uploadIcon, fontSize: '3.5rem', marginBottom: 12 }}>📤</div>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 24,
                    color: '#fff',
                    marginBottom: 4,
                    textShadow: '0 2px 8px rgba(0,0,0,0.25), 0 1px 0 #000',
                    letterSpacing: 0.5,
                  }}>
                    Click to Upload Image
                  </div>
                  <div style={{ color: '#ff5e3a', fontSize: 14, marginBottom: 0, fontWeight: 500 }}>PNG, JPG, or GIF up to 10MB</div>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        ) : view === 'generate' ? (
          // Generate Image View
          <div style={{ ...styles.promptContainer, justifyContent: 'flex-start', alignItems: 'stretch', minHeight: 400, gap: 8, paddingTop: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={styles.label}>Image Provider</label>
              <select style={styles.providerSelect} value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
                {providers.length === 0 && <option value="">Loading providers...</option>}
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={styles.label}>Image Prompt</label>
              <textarea style={styles.promptTextarea} placeholder="Describe the image you want to generate..." value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} />
            </div>
            <div style={{ marginBottom: 8, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={styles.secondaryLabel}>Style & Settings</label>
                <Button
                  variant="tertiary"
                  onClick={() => setShowSystemPrompt(v => !v)}
                  style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}
                  icon="⚙️"
                >
                  {showSystemPrompt ? 'Hide' : 'Edit'}
                </Button>
              </div>
              {showSystemPrompt && (
                <>
                  <textarea
                    style={{ ...styles.systemPromptTextarea, marginTop: 8 }}
                    placeholder={isLoadingSystemPrompt ? "Loading system prompt..." : "Optional system prompt to set style and parameters..."}
                    value={isLoadingSystemPrompt ? "Loading..." : generationSystemPrompt}
                    onChange={e => setGenerationSystemPrompt(e.target.value)}
                    disabled={isLoadingSystemPrompt}
                  />
                  <div style={styles.progressStatusMessage}>
                    {systemPromptStatus && (
                      <span style={systemPromptStatus === 'Saved!' ? styles.successMessage : systemPromptStatus === 'Saving...' ? styles.loadingMessage : null}>{systemPromptStatus}</span>
                    )}
                    {isGenerationSystemPromptChanged && (
                      <Button variant="tertiary" onClick={saveGenerationSystemPrompt} style={{ padding: '4px 8px', fontSize: '12px', marginLeft: 8 }}>Save as Default</Button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, width: '100%' }}>
              <Button
                variant="primary"
                onClick={handleAIImageGeneration}
                disabled={!imagePrompt.trim() || !selectedProvider || isGenerating || isLoadingSystemPrompt}
                style={{ ...styles.makeEditButton, width: '100%', minHeight: 48, position: 'relative' }}
              >
                Generate Image
              </Button>
            </div>
            {isGenerating && (
              <div style={styles.generationSpinnerContainer}>
                <div style={styles.spinnerLarge} />
                <div style={styles.generationSpinnerText}>Generating image...</div>
              </div>
            )}
          </div>
        ) : (
          // Edit Image View
          <div style={styles.editImageContainer}>
            <div style={styles.editImagePreviewContainer}>
              {imagesForEditing.length === 0 ? (
                <div style={styles.noImagePlaceholder}>
                  <div style={styles.uploadIcon}>🖼️</div>
                  <p style={styles.uploadText}>No images selected for editing.</p>
                  <p>Click below to select images.</p>
                </div>
              ) : (
                <div style={styles.editImagesCarousel}>
                  {/* Left Arrow ‑ always visible */}
                  <button
                    onClick={prevPage}
                    disabled={imagesForEditing.length <= 1 || editImagePage === 0}
                    style={{
                      ...styles.carouselArrow,
                      ...((imagesForEditing.length <= 1 || editImagePage === 0) ? styles.carouselArrowDisabled : {})
                    }}
                  >
                    {'‹'}
                  </button>
                  {/* Images Viewport */}
                  <div ref={carouselRef} style={{ overflow: 'hidden', width: '100%' }}>
                    <div
                      style={{
                        ...styles.carouselImagesContainer,
                        gap: 0,
                        overflowX: 'hidden',
                        width: `${trackWidthPercent}%`,
                        transform: `translateX(-${editImagePage * slideWidthPercent}%)`,
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      {imagesForEditing.map(img => (
                        <div
                          key={img.id}
                          style={{
                            ...styles.editImageCard,
                            flex: `0 0 ${slideWidthPercent}%`,
                            maxWidth: `${slideWidthPercent}%`,
                          }}
                        >
                          <img src={img.preview} alt="Edit" style={styles.editImage} />
                          <button
                            onClick={() => removeImageForEditing(img.id)}
                            style={styles.removeImageButtonLarge}
                            onMouseOver={e => { Object.assign(e.currentTarget.style, styles.removeImageButtonHover); }}
                            onMouseOut={e => {
                              Object.keys(styles.removeImageButtonHover).forEach(k => { e.currentTarget.style[k] = ''; });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Right Arrow ‑ always visible */}
                  <button
                    onClick={nextPage}
                    disabled={imagesForEditing.length <= 1 || editImagePage >= Math.ceil(imagesForEditing.length / IMAGES_PER_PAGE) - 1}
                    style={{
                      ...styles.carouselArrow,
                      ...((imagesForEditing.length <= 1 || editImagePage >= Math.ceil(imagesForEditing.length / IMAGES_PER_PAGE) - 1) ? styles.carouselArrowDisabled : {})
                    }}
                  >
                    {'›'}
                  </button>
                </div>
              )}
              {imagesForEditing.length > 0 && (
                <div style={styles.imageCountIndicator}>{`${editImagePage + 1} / ${imagesForEditing.length}`}</div>
              )}
              {editImageWarning && <div style={styles.editWarning}>{editImageWarning}</div>}
            </div>
            
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={e => {
                if (imagesForEditing.length >= 4) {
                  setEditImageWarning('You can only add up to 4 images.');
                  setTimeout(() => setEditImageWarning(''), 2000);
                  return;
                }
                handleEditFilesSelect(e);
              }}
              ref={editFileInputRef}
              style={{ display: 'none' }} 
            />
            <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
              <Button 
                variant="secondary" 
                onClick={() => editFileInputRef.current && editFileInputRef.current.click()} 
                icon="➕"
                style={{ flex: 1 }}
              >
                Upload Image
              </Button>
              <Button
                variant="secondary"
                onClick={openModelPicker}
                icon="📦"
                style={{ flex: 1 }}
              >
                Use Existing Model
              </Button>
            </div>
            
            <div style={styles.editPromptContainer}>
              <label style={styles.editPromptLabel}>Edit Instructions</label>
              <textarea 
                style={styles.editPromptTextarea} 
                placeholder="Describe how you want to edit the image..."
                value={editPrompt}
                onChange={e => setEditPrompt(e.target.value)}
              />
            </div>
            
            <div style={{ marginBottom: 8, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={styles.secondaryLabel}>Edit Style & Settings</label>
                <Button
                  variant="tertiary"
                  onClick={() => setShowEditSystemPrompt(v => !v)}
                  style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}
                  icon="⚙️"
                >
                  {showEditSystemPrompt ? 'Hide' : 'Edit'}
                </Button>
              </div>
              {showEditSystemPrompt && (
                <>
                  <textarea
                    style={{ ...styles.systemPromptTextarea, marginTop: 8 }}
                    placeholder={isLoadingSystemPrompt ? "Loading system prompt..." : "Optional system prompt for image editing..."}
                    value={isLoadingSystemPrompt ? "Loading..." : editSystemPrompt}
                    onChange={e => setEditSystemPrompt(e.target.value)}
                    disabled={isLoadingSystemPrompt}
                  />
                  <div style={styles.progressStatusMessage}>
                    {systemPromptStatus && (
                      <span style={systemPromptStatus === 'Saved!' ? styles.successMessage : systemPromptStatus === 'Saving...' ? styles.loadingMessage : null}>{systemPromptStatus}</span>
                    )}
                    {isEditSystemPromptChanged && (
                      <Button variant="tertiary" onClick={saveEditSystemPrompt} style={{ padding: '4px 8px', fontSize: '12px', marginLeft: 8 }}>Save as Default</Button>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div style={styles.editImageActions}>
              <Button
                variant="primary"
                onClick={handleEditImage}
                style={styles.makeEditButton}
                disabled={!editPrompt.trim() || isGenerating}
              >
                Make Edit
              </Button>
            </div>
            
            {isGenerating && (
              <div style={styles.generationSpinnerContainer}>
                <div style={styles.spinnerLarge} />
                <div style={styles.generationSpinnerText}>Editing image...</div>
              </div>
            )}
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
        {/* Model Picker Overlay */}
        {isModelPickerOpen && (
          <div style={{
            position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1200,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <div style={{ backgroundColor: '#1e1e1e', padding: 20, borderRadius: 8, width: '80%', maxWidth: 800, maxHeight: '80vh', overflow: 'auto', position: 'relative' }}>
              <button onClick={closeModelPicker} style={{ position: 'absolute', top: 10, right: 14, background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
              <h3 style={{ color: '#fff', margin: '0 0 12px 0' }}>Select a 3D Model Icon</h3>
              {modelAssets.length === 0 ? (
                <div style={{ color: '#fff', textAlign: 'center' }}>Loading assets...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 12 }}>
                  {modelAssets.slice((modelAssetsPage-1)*MODEL_ASSETS_PER_PAGE, modelAssetsPage*MODEL_ASSETS_PER_PAGE).map(asset => (
                    <div key={asset.id} style={{ cursor: 'pointer', border: '1px solid #444', borderRadius: 4, padding: 4, background: '#2a2a2a' }} onClick={() => addAssetIconToEditing(asset)}>
                      {asset.icon ? (
                        <img src={asset.icon.startsWith('http') ? asset.icon : `${CONFIG.API.BASE_URL}${asset.icon.startsWith('/') ? '' : '/'}${asset.icon}`}
                          alt={asset.name}
                          style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 2 }} />
                      ) : (
                        <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 24 }}>📦</div>
                      )}
                      <div style={{ color: '#fff', fontSize: 12, marginTop: 4, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.displayName || asset.name}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Pagination */}
              {modelAssets.length > MODEL_ASSETS_PER_PAGE && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 8 }}>
                  <button onClick={() => setModelAssetsPage(p => Math.max(1, p-1))} disabled={modelAssetsPage===1} style={{ padding: '6px 10px', cursor: 'pointer' }}>{'<'}</button>
                  <span style={{ color: '#fff' }}>{modelAssetsPage} / {Math.ceil(modelAssets.length / MODEL_ASSETS_PER_PAGE)}</span>
                  <button onClick={() => setModelAssetsPage(p => Math.min(Math.ceil(modelAssets.length / MODEL_ASSETS_PER_PAGE), p+1))} disabled={modelAssetsPage>=Math.ceil(modelAssets.length / MODEL_ASSETS_PER_PAGE)} style={{ padding: '6px 10px', cursor: 'pointer' }}>{'>'}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetCreationPopup;