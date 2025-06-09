const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const TerrainMetadataUtil = require('../utils/terrainMetadataUtil');
const CONFIG = require('../config/config');

// Endpoint to get the floor plan
router.get('/floor_plan', async (req, res) => {
  try {
    const floorPlanPath = path.join(CONFIG.DIRECTORIES.DUNGEON_DESIGNED_LAYOUT, 'floor_plan/plan1.json');
    const floorPlanData = await fs.readFile(floorPlanPath, 'utf8');
    res.json(JSON.parse(floorPlanData));
  } catch (error) {
    console.error('Error reading floor plan:', error);
    res.status(500).json({ error: 'Failed to read floor plan' });
  }
});

// Endpoint to get the asset mapping
router.get('/asset_mapping', async (req, res) => {
  try {
    const mappingPath = path.join(CONFIG.DIRECTORIES.DUNGEON_DESIGNED_LAYOUT, 'asset_mapping.json');
    // const mappingPath = path.join(CONFIG.DIRECTORIES.DUNGEON_DESIGNED_LAYOUT, 'id_idx.json');
    const mappingData = await fs.readFile(mappingPath, 'utf8');
    res.json(JSON.parse(mappingData));
  } catch (error) {
    console.error('Error reading asset mapping:', error);
    res.status(500).json({ error: 'Failed to read asset mapping' });
  }
});

// Endpoint to generate a complete dungeon design
router.post('/generate', async (req, res) => {
  try {
    const { dungeon_data, dungeon_design_prompt, layout_name } = req.body;
    
    if (!dungeon_data) {
      return res.status(400).json({ 
        success: false,
        error: 'dungeon_data is required' 
      });
    }
    
    if (!layout_name || !layout_name.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'layout_name is required' 
      });
    }
    
    // Load the default assets metadata
    const defaultAssetsPath = path.join(CONFIG.DIRECTORIES.DATA, 'default_assets_metadata.json');
    const defaultAssetsData = await fs.readFile(defaultAssetsPath, 'utf8');
    const default_assets = JSON.parse(defaultAssetsData);
    
    // Prepare the request payload for the Flask server
    const flaskPayload = {
      dungeon_data: dungeon_data,
      default_assets: default_assets,
      dungeon_design_prompt: dungeon_design_prompt || null
    };
    
    // Make the request to the Flask server
    const flaskResponse = await axios.post('http://localhost:3000/api/dungeon/generate', flaskPayload, {
      timeout: 120000 // 2 minutes timeout since AI generation can take time
    });
    
    if (flaskResponse.data.success) {
      // Generate filenames
      const timestamp = Date.now();
      const sanitizedName = layout_name.replace(/[^a-zA-Z0-9]/g, '_');
      const dungeonFilename = `designed_dungeon_${sanitizedName}_${timestamp}.json`;
      const initialLayoutFilename = `layout_${sanitizedName}_${timestamp}.json`;
      const terrainId = `dungeon_${sanitizedName}_${timestamp}`;
      
      // Save the initial layout to the dungeon_initial_layout folder
      const initialLayoutPath = path.join(CONFIG.DIRECTORIES.DUNGEON_INITIAL_LAYOUT, initialLayoutFilename);
      try {
        await fs.mkdir(CONFIG.DIRECTORIES.DUNGEON_INITIAL_LAYOUT, { recursive: true });
      } catch (mkdirError) {
        // Directory already exists or creation failed, continue
        console.log('Dungeon initial layout directory check:', mkdirError.code === 'EEXIST' ? 'exists' : mkdirError.message);
      }
      await fs.writeFile(initialLayoutPath, JSON.stringify(dungeon_data, null, 2));
      console.log(`Initial layout saved to: ${initialLayoutPath}`);
      
      // Save the designed dungeon to the dungeon_designed_layout folder
      const dungeonPath = path.join(CONFIG.DIRECTORIES.DUNGEON_DESIGNED_LAYOUT, dungeonFilename);
      const dungeonData = {
        ...flaskResponse.data,
        layout_name: layout_name.trim(),
        generated_at: new Date().toISOString(),
        filename: dungeonFilename
      };
      try {
        await fs.mkdir(CONFIG.DIRECTORIES.DUNGEON_DESIGNED_LAYOUT, { recursive: true });
      } catch (mkdirError) {
        // Directory already exists or creation failed, continue
        console.log('Dungeon designed layout directory check:', mkdirError.code === 'EEXIST' ? 'exists' : mkdirError.message);
      }
      await fs.writeFile(dungeonPath, JSON.stringify(dungeonData, null, 2));
      console.log(`Dungeon data saved to: ${dungeonPath}`);
      
      // Create terrain metadata entry for the designed dungeon
      const terrainMetadata = {
        name: layout_name.trim(),
        type: 'dungeon_layout',
        originalFilename: dungeonFilename,
        initialLayout: {
          file: initialLayoutFilename,
          path: `/assets/dungeon_initial_layout/${initialLayoutFilename}`
        },
        designedLayout: {
          file: dungeonFilename,
          path: `/assets/dungeon_designed_layout/${dungeonFilename}`
        },
        dimensions: {
          width: dungeon_data.params?.width || 50,
          height: dungeon_data.params?.height || 50,
          depth: 0.3
        },
        scale: 1.0,
        created: timestamp,
        isDungeonLayout: true,
        placed_dungeons: true // This is a designed dungeon with 3D assets
      };
      // Update terrain metadata
      console.log(`Creating terrain metadata for: ${terrainId}`);
      const metadataSuccess = await TerrainMetadataUtil.updateTerrainMetadata(terrainId, terrainMetadata);
      if (!metadataSuccess) {
        console.error('Failed to create terrain metadata for dungeon:', terrainId);
        // Don't fail the request, but log the error
      } else {
        console.log(`Terrain metadata created successfully for: ${terrainId}`);
      }
      res.json({
        success: true,
        message: `Dungeon "${layout_name}" has been designed and saved successfully!`,
        filename: dungeonFilename,
        terrainId: terrainId,
        dungeonPath: `/assets/dungeon_designed_layout/${dungeonFilename}`,
        initialLayoutPath: `/assets/dungeon_initial_layout/${initialLayoutFilename}`,
        ...flaskResponse.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: flaskResponse.data.error || 'Dungeon generation failed'
      });
    }
    
  } catch (error) {
    console.error('Error generating dungeon:', error);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        success: false,
        error: 'Dungeon generation service is unavailable. Please ensure the Flask server is running on port 3000.' 
      });
    } else if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: error.response.data.error || 'Dungeon generation failed'
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate dungeon: ' + error.message 
      });
    }
  }
});

module.exports = router; 