// This file will contain system prompt management routes. 

const express = require('express');
const fs = require('fs');
const CONFIG = require('../config/config'); // Adjusted path

const router = express.Router();

// Get the current system prompt
router.get(CONFIG.ENDPOINTS.GET_SYSTEM_PROMPT.replace('/api', ''), (req, res) => {
  try {
    // Read the system prompt from file
    const systemPromptData = JSON.parse(fs.readFileSync(CONFIG.SYSTEM_PROMPT_FILE, 'utf8'));
    
    res.json({ 
      systemPrompt: systemPromptData.systemPrompt || CONFIG.IMAGE_GENERATION.DEFAULT_SYSTEM_PROMPT 
    });
  } catch (error) {
    console.error('Error getting system prompt:', error);
    
    // If there's an error, return the default from config
    res.json({ 
      systemPrompt: CONFIG.IMAGE_GENERATION.DEFAULT_SYSTEM_PROMPT,
      isDefault: true
    });
  }
});

// Update the system prompt
// express.json() middleware is applied at the app level in server.js, so it's not needed here explicitly for the router
router.post(CONFIG.ENDPOINTS.UPDATE_SYSTEM_PROMPT.replace('/api', ''), (req, res) => {
  try {
    const { systemPrompt } = req.body;
    
    if (!systemPrompt) {
      return res.status(400).json({ error: 'System prompt is required' });
    }
    
    // Save the new system prompt
    fs.writeFileSync(
      CONFIG.SYSTEM_PROMPT_FILE, 
      JSON.stringify({ systemPrompt }, null, 2)
    );
    
    res.json({ 
      success: true, 
      systemPrompt,
      message: 'System prompt updated successfully'
    });
  } catch (error) {
    console.error('Error updating system prompt:', error);
    res.status(500).json({ error: 'Failed to update system prompt' });
  }
});

module.exports = router; 