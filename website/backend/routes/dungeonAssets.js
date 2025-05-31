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

module.exports = router; 