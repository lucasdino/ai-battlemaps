const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Endpoint to get the floor plan
router.get('/floor_plan', async (req, res) => {
  try {
    const floorPlanPath = path.join(__dirname, '../assets/dungeon/floor_plan/plan1.json');
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
    const mappingPath = path.join(__dirname, '../assets/dungeon/asset_mapping.json');
    // const mappingPath = path.join(__dirname, '../assets/dungeon/id_idx.json');
    const mappingData = await fs.readFile(mappingPath, 'utf8');
    res.json(JSON.parse(mappingData));
  } catch (error) {
    console.error('Error reading asset mapping:', error);
    res.status(500).json({ error: 'Failed to read asset mapping' });
  }
});

module.exports = router; 