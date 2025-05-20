// This file will contain system prompt management routes. 

const express = require('express');
const fs = require('fs');
const CONFIG = require('../config/config'); // Adjusted path

const router = express.Router();

// Get all system prompts
router.get(CONFIG.ENDPOINTS.GET_SYSTEM_PROMPT.replace('/api', ''), (req, res) => {
  let responseData = {};
  try {
    const fileDataString = fs.readFileSync(CONFIG.SYSTEM_PROMPT_FILE, 'utf8');
    const fileData = JSON.parse(fileDataString);
    // Start with all data from file
    responseData = { ...fileData };

    // Ensure critical prompts have fallbacks if not in file or if file data is null/undefined for them
    // If fileData itself is null or not an object, these will also correctly use the default.
    responseData.generation_systemPrompt = (fileData && fileData.generation_systemPrompt) || CONFIG.IMAGE_GENERATION.DEFAULT_SYSTEM_PROMPT;
    responseData.imageEdit_systemPrompt = (fileData && fileData.imageEdit_systemPrompt) || CONFIG.IMAGE_GENERATION.DEFAULT_EDIT_SYSTEM_PROMPT;

    res.json(responseData);
  } catch (error) {
    console.error('Error getting system prompts:', error.message);
    // If there's an error reading or parsing the file, return the defaults from config for critical prompts
    res.json({
      generation_systemPrompt: CONFIG.IMAGE_GENERATION.DEFAULT_SYSTEM_PROMPT,
      imageEdit_systemPrompt: CONFIG.IMAGE_GENERATION.DEFAULT_EDIT_SYSTEM_PROMPT,
      isDefault: true, // Indicates these are defaults due to error
      message: "Failed to read or parse system prompt file, serving default generation/edit prompts."
    });
  }
});

// Update the system prompts
// express.json() middleware is applied at the app level in server.js, so it's not needed here explicitly for the router
router.post(CONFIG.ENDPOINTS.UPDATE_SYSTEM_PROMPT.replace('/api', ''), (req, res) => {
  try {
    const updatesToApply = req.body;

    if (!updatesToApply || Object.keys(updatesToApply).length === 0) {
      return res.status(400).json({ error: 'Request body is empty or invalid. At least one system prompt key-value pair is required.' });
    }

    // Read current data
    let currentData = {};
    try {
      const currentFileContent = fs.readFileSync(CONFIG.SYSTEM_PROMPT_FILE, 'utf8');
      currentData = JSON.parse(currentFileContent);
    } catch (err) {
      // If file doesn't exist or is invalid JSON, start with an empty object.
      // fs.readFileSync will throw if file doesn't exist (ENOENT). JSON.parse will throw for invalid JSON.
      if (err.code !== 'ENOENT') { // ENOENT = file not found, which is acceptable for a first write.
          console.warn('Warning: Error reading or parsing system_prompt.json during update. File might be created or overwritten. Error:', err.message);
      }
      // Initialize currentData to empty object if file not found or unparsable, so it can be created/overwritten.
      currentData = {};
    }

    // Merge updates into current data
    const updatedData = {
      ...currentData,
      ...updatesToApply
    };

    // Save the updated system prompts
    fs.writeFileSync(
      CONFIG.SYSTEM_PROMPT_FILE,
      JSON.stringify(updatedData, null, 2) // Use null, 2 for pretty printing
    );

    // Return the full updated data along with success message
    res.json({
      success: true,
      ...updatedData, // Send back all prompts
      message: 'System prompts updated successfully.'
    });
  } catch (error) {
    console.error('Error updating system prompts:', error);
    res.status(500).json({ error: 'Failed to update system prompts. Check server logs for details.' });
  }
});

module.exports = router; 