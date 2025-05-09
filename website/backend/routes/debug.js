// This file will contain debug-related routes. 

const express = require('express');
const path = require('path');
const fs = require('fs');
const CONFIG = require('../config/config'); // Adjusted path

const router = express.Router();

// Add a route to check if a file exists (for debugging)
router.get('/check-file', (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }
  
  // Construct the full path relative to ASSETS_ROOT as it was in server.js
  const fullPath = path.join(CONFIG.DIRECTORIES.ASSETS_ROOT, filePath);
  
  // Check if the file exists
  const exists = fs.existsSync(fullPath);
  const stats = exists ? fs.statSync(fullPath) : null;
  
  res.json({
    path: filePath,
    fullPath,
    exists,
    isFile: stats ? stats.isFile() : false,
    isDirectory: stats ? stats.isDirectory() : false,
    size: stats ? stats.size : null,
    info: exists ? 'File exists' : 'File not found'
  });
});

module.exports = router; 