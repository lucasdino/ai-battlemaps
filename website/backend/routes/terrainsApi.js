/**
 * Terrain API for managing terrain images and GLB files
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const CONFIG = require('../config/config');
const { handleMulterError } = require('../utils/errorHandler');
const TerrainMetadataUtil = require('../utils/terrainMetadataUtil');
const TerrainProcessor = require('../utils/terrainProcessor');

const router = express.Router();

// Configure multer for terrain image uploads
const terrainImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, CONFIG.DIRECTORIES.TERRAIN_IMAGES);
  },
  filename: function (req, file, cb) {
    const uniqueName = TerrainMetadataUtil.generateUniqueTerrainName(file.originalname);
    cb(null, uniqueName);
  }
});

const terrainImageUpload = multer({
  storage: terrainImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, JPEG, WEBP) are allowed'));
    }
  }
});

// ===== TERRAIN ENDPOINTS =====

/**
 * Get all terrains with their metadata
 * GET /api/terrains
 */
router.get('/terrains', (req, res) => {
  try {
    // Get terrain metadata
    const allMetadata = TerrainMetadataUtil.getMetadata();
    
    // Convert metadata to terrains array
    const terrains = Object.entries(allMetadata).map(([filename, metadata]) => {
      return {
        id: filename,
        name: metadata.name || path.basename(filename, path.extname(filename)),
        type: 'terrain',
        created: metadata.created,
        icon: metadata.icon ? metadata.icon.path : null,
        sourceImage: metadata.sourceImage ? metadata.sourceImage.path : null,
        dimensions: metadata.dimensions || { width: 10, height: 10, depth: 0.1 },
        scale: typeof metadata.scale === 'number' ? metadata.scale : 1.0,
        placedAssets: metadata.placedAssets || []
      };
    });
    
    // Sort terrains by created date (newest first)
    terrains.sort((a, b) => (b.created || 0) - (a.created || 0));
    
    res.json({ terrains });
  } catch (error) {
    console.error("Error listing terrains:", error);
    res.status(500).json({ error: "Server error listing terrains" });
  }
});

/**
 * Get metadata for a specific terrain
 * GET /api/terrains/:terrainId
 */
router.get('/terrains/:terrainId', (req, res) => {
  try {
    const { terrainId } = req.params;
    const metadata = TerrainMetadataUtil.getTerrainMetadata(terrainId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Terrain not found' });
    }
    
    res.json({
      id: terrainId,
      ...metadata,
      scale: typeof metadata.scale === 'number' ? metadata.scale : 1.0,
      path: `/assets/terrains/${terrainId}`,
      placedAssets: metadata.placedAssets || []
    });
  } catch (error) {
    console.error('Error retrieving terrain metadata:', error);
    res.status(500).json({ error: 'Server error retrieving terrain' });
  }
});

/**
 * Upload a new terrain image and process it to GLB
 * POST /api/terrains/upload
 */
router.post('/terrains/upload', terrainImageUpload.single('terrain'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file type not allowed' });
  }
  
  try {
    // Get the uploaded image info
    const originalFilename = req.file.originalname;
    const uploadedImagePath = req.file.path;
    const uploadedImageName = req.file.filename;
    
    // Get terrain options from request body
    const { width = 10, height = 10, depth = 0.1, scale = 1.0 } = req.body;
    
    // Generate unique GLB filename
    const baseName = path.basename(uploadedImageName, path.extname(uploadedImageName));
    const glbFilename = `${baseName}.glb`;
    const glbPath = path.join(CONFIG.DIRECTORIES.TERRAINS, glbFilename);
    
    // Process image to GLB
    const success = await TerrainProcessor.processImageToGLB(uploadedImagePath, glbPath, {
      width: parseFloat(width),
      height: parseFloat(height), 
      depth: parseFloat(depth)
    });
    
    if (!success) {
      // Cleanup uploaded image on failure
      if (fs.existsSync(uploadedImagePath)) {
        fs.unlinkSync(uploadedImagePath);
      }
      return res.status(500).json({ error: 'Failed to process terrain image' });
    }
    
    // Generate thumbnail
    const iconName = `${baseName}_icon.png`;
    const iconPath = path.join(CONFIG.DIRECTORIES.TERRAIN_ICONS, iconName);
    
    try {
      await TerrainProcessor.generateThumbnail(uploadedImagePath, iconPath, {
        size: CONFIG.THUMBNAILS.SIZE
      });
    } catch (iconError) {
      console.warn(`Warning: Failed to generate icon for terrain ${glbFilename}:`, iconError);
    }
    
    // Create metadata for the terrain
    const displayName = path.basename(originalFilename, path.extname(originalFilename));
    const metadata = {
      name: displayName,
      type: 'terrain',
      originalFilename: originalFilename,
      dimensions: {
        width: parseFloat(width),
        height: parseFloat(height),
        depth: parseFloat(depth)
      },
      scale: typeof scale === 'number' ? scale : parseFloat(scale) || 1.0,
      sourceImage: {
        file: uploadedImageName,
        path: `/assets/terrain_images/${uploadedImageName}`
      }
    };
    
    // Add icon to metadata if generated successfully
    if (fs.existsSync(iconPath)) {
      metadata.icon = {
        file: iconName,
        path: `/assets/terrain_icons/${iconName}`
      };
    }
    
    // Update the metadata for the terrain
    await TerrainMetadataUtil.updateTerrainMetadata(glbFilename, metadata);
    
    // Send back success message with the terrain info
    res.json({ 
      message: 'Terrain uploaded and processed successfully', 
      id: glbFilename,
      name: displayName,
      path: `/assets/terrains/${glbFilename}`,
      icon: metadata.icon ? metadata.icon.path : null,
      sourceImage: metadata.sourceImage.path,
      dimensions: metadata.dimensions
    });
  } catch (error) {
    console.error('Error processing terrain upload:', error);
    
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ error: 'Server error processing terrain upload' });
  }
}, handleMulterError);

/**
 * Update terrain metadata
 * PUT /api/terrains/:terrainId
 */
router.put('/terrains/:terrainId', async (req, res) => {
  try {
    const { terrainId } = req.params;
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    // Verify the terrain exists
    if (!TerrainMetadataUtil.terrainExists(terrainId)) {
      return res.status(404).json({ error: 'Terrain not found' });
    }
    
    // Update the metadata
    const success = await TerrainMetadataUtil.updateTerrainMetadata(terrainId, updates);
    
    if (success) {
      const updatedMetadata = TerrainMetadataUtil.getTerrainMetadata(terrainId);
      return res.json({ 
        message: 'Terrain updated successfully',
        terrain: {
          id: terrainId,
          ...updatedMetadata,
          path: `/assets/terrains/${terrainId}`
        }
      });
    } else {
      return res.status(500).json({ error: 'Failed to update terrain' });
    }
  } catch (error) {
    console.error('Error updating terrain:', error);
    return res.status(500).json({ error: 'Server error updating terrain' });
  }
});

/**
 * Save asset layout for a terrain
 * PUT /api/terrains/:terrainId/layout
 */
router.put('/terrains/:terrainId/layout', async (req, res) => {
  try {
    const { terrainId } = req.params;
    const { placedAssets } = req.body;

    console.log(`Received request to save layout for terrain ID: ${terrainId}`);
    console.log(`Body (placedAssets type): ${typeof placedAssets}, isArray: ${Array.isArray(placedAssets)}`);
    if (Array.isArray(placedAssets)) {
      console.log(`Number of assets to save: ${placedAssets.length}`);
      if (placedAssets.length > 0) {
        console.log('First asset structure:', JSON.stringify(placedAssets[0]));
      }
    }

    if (!Array.isArray(placedAssets)) {
      return res.status(400).json({ error: 'Invalid placedAssets data: Must be an array.' });
    }

    // Basic validation for each asset object (can be more detailed)
    for (const asset of placedAssets) {
      if (!asset.id || !asset.modelUrl || !asset.position || !asset.rotation || !asset.scale) {
        console.log('Invalid asset structure detected:', JSON.stringify(asset));
        return res.status(400).json({ error: 'Invalid asset object structure in placedAssets.' });
      }
    }

    const terrainExists = TerrainMetadataUtil.terrainExists(terrainId);
    console.log(`Terrain exists check for ID (${terrainId}): ${terrainExists}`);

    if (!terrainExists) {
      return res.status(404).json({ error: 'Terrain not found' });
    }

    const success = await TerrainMetadataUtil.updateTerrainMetadata(terrainId, { placedAssets });
    console.log(`Update success status for ID (${terrainId}): ${success}`);

    if (success) {
      return res.json({ message: 'Terrain layout saved successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to save terrain layout' });
    }
  } catch (error) {
    console.error('Error saving terrain layout:', error);
    return res.status(500).json({ error: 'Server error saving terrain layout' });
  }
});

/**
 * Delete a terrain
 * DELETE /api/terrains/:terrainId
 */
router.delete('/terrains/:terrainId', async (req, res) => {
  try {
    const { terrainId } = req.params;
    
    // Get the metadata for the terrain to find associated files
    const metadata = TerrainMetadataUtil.getTerrainMetadata(terrainId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Terrain not found' });
    }
    
    const terrainPath = path.join(CONFIG.DIRECTORIES.TERRAINS, terrainId);
    let iconPath = null;
    let sourceImagePath = null;
    
    // Check if the terrain has an icon and get its path
    if (metadata.icon && metadata.icon.file) {
      iconPath = path.join(CONFIG.DIRECTORIES.TERRAIN_ICONS, metadata.icon.file);
    }
    
    // Check if the terrain has a source image and get its path
    if (metadata.sourceImage && metadata.sourceImage.file) {
      sourceImagePath = path.join(CONFIG.DIRECTORIES.TERRAIN_IMAGES, metadata.sourceImage.file);
    }
    
    // Delete the terrain GLB file
    if (fs.existsSync(terrainPath)) {
      fs.unlinkSync(terrainPath);
    }
    
    // Delete the icon file if it exists
    if (iconPath && fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
    }
    
    // Delete the source image file if it exists
    if (sourceImagePath && fs.existsSync(sourceImagePath)) {
      fs.unlinkSync(sourceImagePath);
    }
    
    // Delete the terrain metadata
    const success = await TerrainMetadataUtil.removeTerrain(terrainId);
    
    if (success) {
      return res.json({ message: 'Terrain and associated files deleted successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to delete terrain metadata' });
    }
  } catch (error) {
    console.error('Error deleting terrain:', error);
    return res.status(500).json({ error: 'Server error deleting terrain' });
  }
});

/**
 * Get terrain icon
 * GET /api/terrains/:terrainId/icon
 */
router.get('/terrains/:terrainId/icon', async (req, res) => {
  try {
    const { terrainId } = req.params;
    
    // Check if the terrain exists in metadata
    const metadata = TerrainMetadataUtil.getTerrainMetadata(terrainId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Terrain not found' });
    }

    // If the terrain has an icon and the file exists, return it
    if (metadata.icon && metadata.icon.file) {
      const iconPath = path.join(CONFIG.DIRECTORIES.TERRAIN_ICONS, metadata.icon.file);
      
      if (fs.existsSync(iconPath)) {
        return res.json({
          iconName: metadata.icon.file,
          iconPath: metadata.icon.path
        });
      }
    }

    // If no icon exists and we have a source image, generate one
    if (metadata.sourceImage && metadata.sourceImage.file) {
      const sourceImagePath = path.join(CONFIG.DIRECTORIES.TERRAIN_IMAGES, metadata.sourceImage.file);
      
      if (fs.existsSync(sourceImagePath)) {
        try {
          // Create a unique icon name
          const baseName = path.basename(terrainId, '.glb');
          const iconName = `${baseName}_icon.png`;
          const iconPath = path.join(CONFIG.DIRECTORIES.TERRAIN_ICONS, iconName);
          
          // Generate the thumbnail
          await TerrainProcessor.generateThumbnail(sourceImagePath, iconPath, {
            size: CONFIG.THUMBNAILS.SIZE
          });
          
          if (fs.existsSync(iconPath)) {
            // Update the terrain metadata with the new icon
            await TerrainMetadataUtil.updateTerrainMetadata(terrainId, {
              icon: {
                file: iconName,
                path: `/assets/terrain_icons/${iconName}`
              }
            });
            
            return res.json({
              iconName: iconName,
              iconPath: `/assets/terrain_icons/${iconName}`
            });
          }
        } catch (thumbnailError) {
          console.error('Failed to generate terrain icon:', thumbnailError);
        }
      }
    }
    
    return res.status(404).json({ error: 'No icon available for terrain' });
  } catch (error) {
    console.error('Error retrieving terrain icon:', error);
    return res.status(500).json({ error: 'Server error retrieving terrain icon' });
  }
});

module.exports = router; 