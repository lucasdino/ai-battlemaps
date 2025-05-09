/**
 * Unified API for 3D model management
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const CONFIG = require('../config/config');
const { handleMulterError } = require('../utils/errorHandler');
const { createModelUpload, createIconUpload, createVideoUpload } = require('../utils/middleware');
const ModelMetadataUtil = require('../utils/modelMetadataUtil');
const ModelThumbnailRenderer = require('../utils/modelThumbnailRenderer');

const router = express.Router();
const modelUpload = createModelUpload();
const iconUpload = createIconUpload();
const videoUpload = createVideoUpload();

// ===== MODELS ENDPOINTS =====

/**
 * Get all models with their metadata
 * GET /api/models
 */
router.get('/models', (req, res) => {
  try {
    // Get model metadata
    const allMetadata = ModelMetadataUtil.getMetadata();
    
    // Convert metadata to models array
    const models = Object.entries(allMetadata).map(([filename, metadata]) => {
      return {
        id: filename,
        name: metadata.name || path.basename(filename, path.extname(filename)),
        type: metadata.type || CONFIG.ASSET_TYPES.UPLOADED_MODEL,
        source: metadata.source || CONFIG.SOURCE_TYPES.EXTERNAL,
        created: metadata.created,
        icon: metadata.icon ? metadata.icon.path : null,
        video: metadata.video ? metadata.video.path : null,
        sourceImage: metadata.sourceImage ? metadata.sourceImage.path : null
      };
    });
    
    // Sort models by created date (newest first)
    models.sort((a, b) => (b.created || 0) - (a.created || 0));
    
    res.json({ models });
  } catch (error) {
    console.error("Error listing models:", error);
    res.status(500).json({ error: "Server error listing models" });
  }
});

/**
 * Get videos mapping for all models
 * GET /api/models/videos
 */
router.get('/models/videos', (req, res) => {
  try {
    // Get model metadata
    const allMetadata = ModelMetadataUtil.getMetadata();
    
    // Create video mapping object
    const videoMapping = {};
    
    // Populate video mapping
    Object.entries(allMetadata).forEach(([filename, metadata]) => {
      if (metadata.video && metadata.video.path) {
        videoMapping[filename] = metadata.video.path;
      }
    });
    
    res.json({ videoMapping });
  } catch (error) {
    console.error("Error retrieving model videos:", error);
    res.status(500).json({ error: "Server error retrieving model videos" });
  }
});

/**
 * Get metadata for a specific model
 * GET /api/models/:modelId
 */
router.get('/models/:modelId', (req, res) => {
  try {
    const { modelId } = req.params;
    const metadata = ModelMetadataUtil.getModelMetadata(modelId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json({
      id: modelId,
      ...metadata,
      path: `/assets/3d_models/${modelId}`
    });
  } catch (error) {
    console.error('Error retrieving model metadata:', error);
    res.status(500).json({ error: 'Server error retrieving model' });
  }
});

/**
 * Upload a new model
 * POST /api/models/upload
 */
router.post('/models/upload', modelUpload.single('model'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file type not allowed' });
  }
  
  try {
    // Get original filename and new unique filename
    const originalFilename = req.file.originalname;
    const uniqueFilename = ModelMetadataUtil.generateUniqueModelName(originalFilename);
    
    // Get path to current uploaded file and new location with unique name
    const currentPath = req.file.path;
    const newPath = path.join(path.dirname(currentPath), uniqueFilename);
    
    // Rename the file to use the unique filename
    fs.renameSync(currentPath, newPath);
    
    // Create metadata for the uploaded model
    const displayName = path.basename(originalFilename, path.extname(originalFilename));
    const metadata = {
      name: displayName,
      type: CONFIG.ASSET_TYPES.UPLOADED_MODEL,
      source: CONFIG.SOURCE_TYPES.EXTERNAL,
      originalFilename: originalFilename
    };
    
    // Update the metadata for the model
    await ModelMetadataUtil.updateModelMetadata(uniqueFilename, metadata);
    
    // Send back success message with the filenames
    res.json({ 
      message: 'Model uploaded successfully', 
      id: uniqueFilename,
      name: displayName,
      path: `/assets/3d_models/${uniqueFilename}`
    });
  } catch (error) {
    console.error('Error processing uploaded model:', error);
    return res.status(500).json({ error: 'Server error processing uploaded model' });
  }
}, handleMulterError);

/**
 * Update model metadata
 * PUT /api/models/:modelId
 */
router.put('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    // Verify the model exists
    if (!ModelMetadataUtil.modelExists(modelId)) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Update the metadata
    const success = await ModelMetadataUtil.updateModelMetadata(modelId, updates);
    
    if (success) {
      const updatedMetadata = ModelMetadataUtil.getModelMetadata(modelId);
      return res.json({ 
        message: 'Model updated successfully',
        model: {
          id: modelId,
          ...updatedMetadata,
          path: `/assets/3d_models/${modelId}`
        }
      });
    } else {
      return res.status(500).json({ error: 'Failed to update model' });
    }
  } catch (error) {
    console.error('Error updating model:', error);
    return res.status(500).json({ error: 'Server error updating model' });
  }
});

/**
 * Delete a model
 * DELETE /api/models/:modelId
 */
router.delete('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    
    // Get the metadata for the model to find associated files
    const metadata = ModelMetadataUtil.getModelMetadata(modelId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    const modelPath = path.join(CONFIG.DIRECTORIES.MODELS, modelId);
    let iconPath = null;
    let videoPath = null;
    
    // Check if the model has an icon and get its path
    if (metadata.icon && metadata.icon.file) {
      iconPath = path.join(CONFIG.DIRECTORIES.MODEL_ICONS, metadata.icon.file);
    }
    
    // Check if the model has a video and get its path
    if (metadata.video && metadata.video.file) {
      videoPath = path.join(CONFIG.DIRECTORIES.ASSET_VIDEOS, metadata.video.file);
    }
    
    // Delete the model file
    if (fs.existsSync(modelPath)) {
      fs.unlinkSync(modelPath);
    }
    
    // Delete the icon file if it exists
    if (iconPath && fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
    }
    
    // Delete the video file if it exists
    if (videoPath && fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    
    // Delete the model metadata
    const success = await ModelMetadataUtil.removeModel(modelId);
    
    if (success) {
      return res.json({ message: 'Model and associated files deleted successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to delete model metadata' });
    }
  } catch (error) {
    console.error('Error deleting model:', error);
    return res.status(500).json({ error: 'Server error deleting model' });
  }
});

// ===== ASSET ATTACHMENT ENDPOINTS =====

/**
 * Upload or update model icon
 * POST /api/models/:modelId/icon
 */
router.post('/models/:modelId/icon', iconUpload.single('icon'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No icon uploaded or file type not allowed' });
  }
  
  try {
    const { modelId } = req.params;
    
    // Check if the model exists
    if (!ModelMetadataUtil.modelExists(modelId)) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Update model metadata with icon information
    const iconName = req.file.filename;
    const success = await ModelMetadataUtil.updateModelMetadata(modelId, {
      icon: {
        file: iconName,
        path: `/assets/3d_model_icons/${iconName}`
      }
    });
    
    if (success) {
      return res.json({ 
        message: 'Icon uploaded successfully',
        iconPath: `/assets/3d_model_icons/${iconName}`
      });
    } else {
      return res.status(500).json({ error: 'Failed to update model metadata with icon' });
    }
  } catch (error) {
    console.error('Error processing icon upload:', error);
    return res.status(500).json({ error: 'Server error processing icon upload' });
  }
}, handleMulterError);

/**
 * Get icon for a model, generating one if needed
 * GET /api/models/:modelId/icon
 */
router.get('/models/:modelId/icon', async (req, res) => {
  try {
    const { modelId } = req.params;
    
    // Check if the model exists in metadata
    const metadata = ModelMetadataUtil.getModelMetadata(modelId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // If the model has an icon and the file exists, return it
    if (metadata.icon && metadata.icon.file) {
      const iconPath = path.join(CONFIG.DIRECTORIES.MODEL_ICONS, metadata.icon.file);
      
      if (fs.existsSync(iconPath)) {
        return res.json({
          iconName: metadata.icon.file,
          iconPath: metadata.icon.path
        });
      } else {
        // If no valid icon exists, generate one
        const modelPath = path.join(CONFIG.DIRECTORIES.MODELS, modelId);
        
        if (!fs.existsSync(modelPath)) {
          return res.status(404).json({ error: 'Model file not found' });
        }
        
        try {
          // Create a unique icon name (PNG format)
          const baseName = path.basename(modelId, '.glb');
          const iconName = `${baseName}-${Date.now()}.${CONFIG.THUMBNAILS.FORMAT}`;
          const iconPath = path.join(CONFIG.DIRECTORIES.MODEL_ICONS, iconName);
          
          // Try to generate the thumbnail
          let generated = false;
          try {
            // Generate the thumbnail
            await ModelThumbnailRenderer.generateThumbnail(modelPath, iconPath, {
              size: CONFIG.THUMBNAILS.SIZE,
              backgroundColor: CONFIG.THUMBNAILS.BACKGROUND
            });
            
            // Verify the icon was created successfully
            if (fs.existsSync(iconPath)) {
              generated = true;
            } else {
              throw new Error('Failed to create icon file');
            }
          } catch (thumbnailError) {
            // If thumbnail generation fails, do not create or return a fallback icon
            return res.status(500).json({ error: 'Failed to generate icon for model' });
          }
          
          // Create the icon path for the response
          const iconResponsePath = `/assets/3d_model_icons/${iconName}`;
          
          // Update the model metadata with the new icon (and never use video as icon)
          await ModelMetadataUtil.updateModelMetadata(modelId, {
            icon: {
              file: iconName,
              path: iconResponsePath
            }
          });
          
          // Return the icon information
          return res.json({
            iconName: iconName,
            iconPath: iconResponsePath,
            generated: generated,
            isPlaceholder: false
          });
        } catch (genError) {
          return res.status(500).json({ error: 'Server error generating icon' });
        }
      }
    } else {
      // Check if metadata contains a video path being incorrectly used as icon
      if (metadata.video && metadata.video.path) {
        console.warn(`IMPORTANT: Model ${modelId} has video but no icon. Video path:`, metadata.video.path);
      }
    }
  } catch (error) {
    console.error('Error getting model icon:', error);
    return res.status(500).json({ error: 'Server error retrieving icon' });
  }
});

/**
 * Upload or update model video
 * POST /api/models/:modelId/video
 */
router.post('/models/:modelId/video', videoUpload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded or file type not allowed' });
  }
  
  try {
    const { modelId } = req.params;
    
    // Check if the model exists
    if (!ModelMetadataUtil.modelExists(modelId)) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Update model metadata with video information
    const videoName = req.file.filename;
    const success = await ModelMetadataUtil.updateModelMetadata(modelId, {
      video: {
        file: videoName,
        path: `/assets/asset_videos/${videoName}`
      }
    });
    
    if (success) {
      return res.json({ 
        message: 'Video uploaded successfully',
        videoPath: `/assets/asset_videos/${videoName}`
      });
    } else {
      return res.status(500).json({ error: 'Failed to update model metadata with video' });
    }
  } catch (error) {
    console.error('Error processing video upload:', error);
    return res.status(500).json({ error: 'Server error processing video upload' });
  }
}, handleMulterError);

/**
 * Get video for a model
 * GET /api/models/:modelId/video
 */
router.get('/models/:modelId/video', (req, res) => {
  try {
    const { modelId } = req.params;
    
    // Check if the model exists in metadata
    const metadata = ModelMetadataUtil.getModelMetadata(modelId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // If the model has a video and the file exists, return it
    if (metadata.video && metadata.video.file) {
      // Always use asset_videos path
      const videoPath = path.join(CONFIG.DIRECTORIES.ASSET_VIDEOS, metadata.video.file);
      
      if (fs.existsSync(videoPath)) {
        return res.json({
          videoName: metadata.video.file,
          videoPath: `/assets/asset_videos/${metadata.video.file}`
        });
      } else {
        return res.status(404).json({ error: 'Video file not found' });
      }
    } else {
      return res.status(404).json({ error: 'No video associated with this model' });
    }
  } catch (error) {
    console.error('Error getting model video:', error);
    return res.status(500).json({ error: 'Server error retrieving video' });
  }
});

module.exports = router; 