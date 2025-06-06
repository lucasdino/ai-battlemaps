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
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 12;

    // Get terrain metadata
    const allMetadata = TerrainMetadataUtil.getMetadata();
    
    // Convert metadata to terrains array
    const allTerrains = Object.entries(allMetadata).map(([filename, metadata]) => {
      return {
        id: filename,
        name: metadata.name || path.basename(filename, path.extname(filename)),
        type: metadata.type || 'terrain',
        url: metadata.isDungeonLayout ? null : `/assets/terrains/${filename}`,
        created: metadata.created,
        icon: metadata.icon ? (typeof metadata.icon === 'string' ? metadata.icon : metadata.icon.path) : null,
        sourceImage: metadata.sourceImage ? metadata.sourceImage.path : null,
        dimensions: metadata.dimensions || { width: 10, height: 10, depth: 0.1 },
        scale: typeof metadata.scale === 'number' ? metadata.scale : 1.0,
        placedAssets: metadata.placedAssets || [],
        layoutPath: metadata.layoutPath || null,
        isDungeonLayout: metadata.isDungeonLayout || false,
        placed_dungeons: metadata.placed_dungeons || false
      };
    });
    
    // Sort terrains by created date (newest first)
    allTerrains.sort((a, b) => (b.created || 0) - (a.created || 0));

    // Calculate pagination
    const total = allTerrains.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    // Get paginated terrains
    const terrains = allTerrains.slice(startIndex, endIndex);
    
    res.json({ 
      terrains,
      total,
      page,
      per_page: perPage,
      total_pages: totalPages
    });
  } catch (error) {
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
    
    const responseData = {
      id: terrainId,
      ...metadata,
      scale: typeof metadata.scale === 'number' ? metadata.scale : 1.0,
      path: `/assets/terrains/${terrainId}`,
      placedAssets: metadata.placedAssets || []
    };
    
    res.json(responseData);
  } catch (error) {
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
    const { width = 10, height = 10, depth = 0.1, scale = 1.0, name, gridScale } = req.body;
    
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
          // Failed to generate icon - continue without it
        }
    
    // Create metadata for the terrain
    const displayName = name && name.trim() ? name.trim() : path.basename(originalFilename, path.extname(originalFilename));
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
      gridScale: gridScale ? parseFloat(gridScale) : undefined,
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

    if (!Array.isArray(placedAssets)) {
      return res.status(400).json({ error: 'Invalid placedAssets data: Must be an array.' });
    }

    // Validate each asset object only if the array is not empty
    if (placedAssets.length > 0) {
      for (const asset of placedAssets) {
        if (!asset.id || !asset.modelUrl || !asset.position || !asset.rotation || !asset.scale) {
          return res.status(400).json({ error: 'Invalid asset object structure in placedAssets.' });
        }
      }
    }

    const terrainExists = TerrainMetadataUtil.terrainExists(terrainId);

    if (!terrainExists) {
      return res.status(404).json({ error: 'Terrain not found' });
    }

    const success = await TerrainMetadataUtil.updateTerrainMetadata(terrainId, { placedAssets });

    if (success) {
      return res.json({ 
        message: placedAssets.length === 0 ? 'All assets cleared successfully' : 'Terrain layout saved successfully',
        assetsCount: placedAssets.length
      });
    } else {
      return res.status(500).json({ error: 'Failed to save terrain layout' });
    }
  } catch (error) {
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
    let layoutPath = null;
    
    // Check if the terrain has an icon and get its path
    if (metadata.icon && metadata.icon.file) {
      iconPath = path.join(CONFIG.DIRECTORIES.TERRAIN_ICONS, metadata.icon.file);
    }
    
    // Check if the terrain has a source image and get its path
    if (metadata.sourceImage && metadata.sourceImage.file) {
      sourceImagePath = path.join(CONFIG.DIRECTORIES.TERRAIN_IMAGES, metadata.sourceImage.file);
    }
    
    // Check if this is a dungeon layout and get the layout file path
    if (metadata.isDungeonLayout && metadata.layoutFile) {
      layoutPath = path.join(CONFIG.DIRECTORIES.DUNGEON_LAYOUTS, metadata.layoutFile);
    }
    
    // Delete the terrain GLB file (only exists for regular terrains, not dungeon layouts)
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
    
    // Delete the dungeon layout file if it exists
    if (layoutPath && fs.existsSync(layoutPath)) {
      fs.unlinkSync(layoutPath);
    }
    
    // Delete the terrain metadata
    const success = await TerrainMetadataUtil.removeTerrain(terrainId);
    
    if (success) {
      return res.json({ message: 'Terrain and associated files deleted successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to delete terrain metadata' });
    }
  } catch (error) {
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
          // Failed to generate terrain icon
        }
      }
    }
    
    return res.status(404).json({ error: 'No icon available for terrain' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error retrieving terrain icon' });
  }
});

/**
 * Save a dungeon layout and create a new terrain for it
 * POST /api/terrains/save-layout
 */
router.post('/terrains/save-layout', async (req, res) => {
  try {
    const { layoutData, layoutName } = req.body;
    
    if (!layoutData || !layoutName) {
      return res.status(400).json({ error: 'Layout data and name are required' });
    }

    // Generate unique filename for the layout
    const timestamp = Date.now();
    const sanitizedName = layoutName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const layoutFilename = `${sanitizedName}_${timestamp}.json`;
    const layoutPath = path.join(CONFIG.DIRECTORIES.DUNGEON_LAYOUTS, layoutFilename);

    // Save the layout data to file
    fs.writeFileSync(layoutPath, JSON.stringify(layoutData, null, 2));

    // Create terrain metadata for the dungeon layout
    const terrainId = `dungeon_${sanitizedName}_${timestamp}.glb`; // Even though it's not a real GLB
    const metadata = {
      name: layoutName,
      type: 'dungeon_layout',
      originalFilename: layoutFilename,
      layoutFile: layoutFilename,
      layoutPath: `/assets/dungeon_layouts/${layoutFilename}`,
      dimensions: {
        width: layoutData.params?.width || 50,
        height: layoutData.params?.height || 50,
        depth: 0.1
      },
      scale: 1.0,
      icon: '🏰', // Default dungeon emoji
      created: timestamp,
      isDungeonLayout: true,
      placed_dungeons: false // This is a saved layout, not a placed dungeon with 3D assets
    };

    // Update the terrain metadata
    const success = await TerrainMetadataUtil.updateTerrainMetadata(terrainId, metadata);
    
    if (success) {
      res.json({ 
        message: 'Layout saved and terrain created successfully',
        terrainId: terrainId,
        layoutPath: `/assets/dungeon_layouts/${layoutFilename}`,
        metadata: metadata
      });
    } else {
      return res.status(500).json({ error: 'Failed to create terrain metadata' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server error saving layout' });
  }
});

/**
 * Save asset layout for a terrain
 * POST /api/terrains/:terrainId/assets
 */
router.post('/terrains/:terrainId/assets', async (req, res) => {
  try {
    const { terrainId } = req.params;
    const { assets } = req.body;
    
    if (!assets || !Array.isArray(assets)) {
      return res.status(400).json({ error: 'Assets array is required' });
    }
    
    // Check if terrain exists
    const metadata = TerrainMetadataUtil.getTerrainMetadata(terrainId);
    if (!metadata) {
      return res.status(404).json({ error: 'Terrain not found' });
    }
    
    // Validate asset data
    const validAssets = assets.filter(asset => {
      return asset.id && asset.modelUrl && asset.name && 
             asset.position && asset.rotation && asset.scale;
    });
    
    if (validAssets.length !== assets.length) {
      // Some assets were invalid and filtered out
    }
    
    // Update terrain metadata with placed assets
    const updateData = {
      placedAssets: validAssets,
      placed_dungeons: validAssets.length > 0, // Mark as having placed assets
      updated: Date.now()
    };
    
    const success = await TerrainMetadataUtil.updateTerrainMetadata(terrainId, updateData);
    
    if (success) {
      res.json({ 
        message: 'Asset layout saved successfully',
        assetsCount: validAssets.length,
        terrainId: terrainId
      });
    } else {
      return res.status(500).json({ error: 'Failed to save asset layout' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server error saving asset layout' });
  }
});

/**
 * Get all saved dungeon layouts
 * GET /api/terrains/layouts
 */
router.get('/terrains/layouts', (req, res) => {
  try {
    const allMetadata = TerrainMetadataUtil.getMetadata();
    
    // Filter only dungeon layout terrains
    const dungeonLayouts = Object.entries(allMetadata)
      .filter(([_, metadata]) => metadata.isDungeonLayout === true)
      .map(([terrainId, metadata]) => ({
        id: terrainId,
        name: metadata.name,
        created: metadata.created,
        layoutPath: metadata.layoutPath,
        icon: metadata.icon || '🏰'
      }));
    
    // Sort by created date (newest first)
    dungeonLayouts.sort((a, b) => (b.created || 0) - (a.created || 0));
    
    res.json({ layouts: dungeonLayouts });
  } catch (error) {
    res.status(500).json({ error: 'Server error listing layouts' });
  }
});

module.exports = router; 