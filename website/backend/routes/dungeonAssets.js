const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Advanced filter endpoint for dungeon assets
router.get('/filter', (req, res) => {
  const assetLibraryPath = path.resolve(__dirname, '../assets/dungeon/asset_library.json');
  fs.readFile(assetLibraryPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Could not read asset library.' });
    }
    let assets = JSON.parse(data);

    // Filtering logic
    const { category, tag, name, minWidth, maxWidth, minHeight, maxHeight } = req.query;

    if (category) {
      assets = assets.filter(asset => asset.category === category);
    }
    if (tag) {
      // tag can be a single tag or comma-separated list
      const tags = tag.split(',').map(t => t.trim());
      assets = assets.filter(asset => tags.some(t => asset.tags.includes(t)));
    }
    if (name) {
      assets = assets.filter(asset => asset.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (minWidth) {
      assets = assets.filter(asset => asset.dimensions.width >= parseFloat(minWidth));
    }
    if (maxWidth) {
      assets = assets.filter(asset => asset.dimensions.width <= parseFloat(maxWidth));
    }
    if (minHeight) {
      assets = assets.filter(asset => asset.dimensions.height >= parseFloat(minHeight));
    }
    if (maxHeight) {
      assets = assets.filter(asset => asset.dimensions.height <= parseFloat(maxHeight));
    }

    res.json(assets);
  });
});

// Get paginated default assets
router.get('/defaults', (req, res) => {
  const defaultAssetsPath = path.resolve(__dirname, '../data/default_assets_metadata.json');
  
  fs.readFile(defaultAssetsPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Could not read default assets metadata.' });
    }
    
    try {
      const assets = JSON.parse(data);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 9;
      const offset = (page - 1) * limit;
      
      // Add icon URLs to assets
      const assetsWithIcons = assets.map(asset => ({
        ...asset,
        iconUrl: asset.icon?.path || `/assets/dungeon_defaults/model_icons/${asset.id}.png`,
        modelUrl: `/assets/dungeon_defaults/models/${asset.modelPath.split('/').pop()}`
      }));
      
      const paginatedAssets = assetsWithIcons.slice(offset, offset + limit);
      const totalAssets = assets.length;
      const totalPages = Math.ceil(totalAssets / limit);
      
      res.json({
        assets: paginatedAssets,
        pagination: {
          currentPage: page,
          totalPages,
          totalAssets,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (parseErr) {
      res.status(500).json({ error: 'Failed to parse default assets metadata.' });
    }
  });
});

// Generate icon for default asset
router.get('/defaults/:id/icon', async (req, res) => {
  const assetId = req.params.id;
  const defaultAssetsPath = path.resolve(__dirname, '../data/default_assets_metadata.json');
  const ModelThumbnailRenderer = require('../utils/modelThumbnailRenderer');
  
  try {
    // Read the default assets metadata to find the asset
    const data = fs.readFileSync(defaultAssetsPath, 'utf8');
    const assets = JSON.parse(data);
    const asset = assets.find(a => a.id === assetId);
    
    if (!asset) {
      console.error(`Asset not found: ${assetId}`);
      return res.status(404).json({ error: 'Default asset not found.' });
    }
    
    // Check if asset already has icon metadata
    if (asset.icon && asset.icon.path) {
      console.log(`Asset ${assetId} already has icon metadata: ${asset.icon.path}`);
      return res.json({ 
        iconPath: asset.icon.path,
        message: 'Icon already exists'
      });
    }
    
    console.log(`Generating icon for asset: ${assetId} (${asset.name})`);
    
    // Construct the model file path
    const modelFileName = asset.modelPath.split('/').pop();
    const modelPath = path.resolve(__dirname, '../assets/dungeon_defaults/models', modelFileName);
    
    if (!fs.existsSync(modelPath)) {
      console.error(`Model file not found: ${modelPath}`);
      return res.status(404).json({ error: 'Model file not found.' });
    }
    
    // Generate icon using the existing thumbnail renderer
    const iconName = `${assetId}.png`;
    const iconOutputPath = path.resolve(__dirname, '../assets/dungeon_defaults/model_icons', iconName);
    
    // Ensure the icons directory exists
    const iconsDir = path.dirname(iconOutputPath);
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    
    const generatedPath = await ModelThumbnailRenderer.generateThumbnail(modelPath, iconOutputPath, {
      size: 200,
      backgroundColor: '#3a3a3a'
    });
    
    if (generatedPath && fs.existsSync(generatedPath)) {
      // Update the metadata to include the icon information
      try {
        console.log(`Updating metadata for asset: ${assetId}`);
        
        // Re-read the metadata to ensure we have the latest version
        const latestData = fs.readFileSync(defaultAssetsPath, 'utf8');
        const latestAssets = JSON.parse(latestData);
        
        const updatedAssets = latestAssets.map(a => {
          if (a.id === assetId) {
            console.log(`Found asset to update: ${a.id}`);
            return {
              ...a,
              icon: {
                file: iconName,
                path: `/assets/dungeon_defaults/model_icons/${iconName}`
              }
            };
          }
          return a;
        });
        
        // Write the updated metadata back to the file
        fs.writeFileSync(defaultAssetsPath, JSON.stringify(updatedAssets, null, 2), 'utf8');
        console.log(`Successfully updated metadata for asset: ${assetId}`);
        
        res.json({ 
          iconPath: `/assets/dungeon_defaults/model_icons/${iconName}`,
          message: 'Icon generated and metadata updated successfully'
        });
      } catch (metadataError) {
        console.error('Error updating metadata:', metadataError);
        // Still return success since icon was generated, just warn about metadata
        res.json({ 
          iconPath: `/assets/dungeon_defaults/model_icons/${iconName}`,
          message: 'Icon generated successfully (metadata update failed)'
        });
      }
    } else {
      console.error(`Failed to generate icon at path: ${iconOutputPath}`);
      res.status(500).json({ error: 'Failed to generate icon' });
    }
  } catch (error) {
    console.error('Error generating default asset icon:', error);
    res.status(500).json({ error: 'Failed to generate icon: ' + error.message });
  }
});

// Update default asset metadata (name and description)
router.put('/defaults/:id', (req, res) => {
  const assetId = req.params.id;
  const { name, description } = req.body;
  const defaultAssetsPath = path.resolve(__dirname, '../data/default_assets_metadata.json');
  
  if (!name && !description) {
    return res.status(400).json({ error: 'Name or description is required.' });
  }
  
  fs.readFile(defaultAssetsPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Could not read default assets metadata.' });
    }
    
    try {
      const assets = JSON.parse(data);
      const assetIndex = assets.findIndex(asset => asset.id === assetId);
      
      if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found.' });
      }
      
      // Update the asset
      if (name) assets[assetIndex].name = name;
      if (description) assets[assetIndex].description = description;
      
      // Write back to file
      fs.writeFile(defaultAssetsPath, JSON.stringify(assets, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          return res.status(500).json({ error: 'Could not save asset metadata.' });
        }
        
        res.json({
          message: 'Asset updated successfully',
          asset: assets[assetIndex]
        });
      });
    } catch (parseErr) {
      res.status(500).json({ error: 'Failed to parse default assets metadata.' });
    }
  });
});

module.exports = router; 