/**
 * Image generation and editing API routes
 */
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const CONFIG = require('../config/config');

const router = express.Router();

/**
 * Generate an image using AI
 * POST /api/generate-image
 */
router.post(CONFIG.ENDPOINTS.GENERATE_IMAGE.replace('/api', ''), async (req, res) => {
  try {
    const { prompt, provider, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!provider || !Object.keys(CONFIG.IMAGE_GENERATION.PROVIDERS).includes(provider)) {
      return res.status(400).json({ error: 'Valid provider is required' });
    }
    
    const providerConfig = CONFIG.IMAGE_GENERATION.PROVIDERS[provider];
    const filename = `generated-${Date.now()}-${Math.round(Math.random() * 1E6)}.png`;
    const outputPath = path.join(CONFIG.DIRECTORIES.IMAGES, filename);
    let imageData;
    
    switch (provider) {
      case 'openai':
        imageData = await generateOpenAIImage(prompt, systemPrompt, providerConfig);
        break;
      case 'stability':
        imageData = await generateStabilityAIImage(prompt, systemPrompt, providerConfig);
        break;
      case 'google':
        imageData = await generateGoogleImage(prompt, systemPrompt, providerConfig);
        break;
      case 'openai-editor':
        return res.status(400).json({ error: 'Image editor cannot be used for initial generation' });
      default:
        return res.status(400).json({ error: 'Unsupported provider' });
    }
    
    fs.writeFileSync(outputPath, imageData, 'binary');
    
    res.json({
      success: true,
      filename,
      url: `/assets/images/${filename}`,
      message: `Image generated successfully using ${provider}`
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image', 
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Edit an existing image using AI
 * POST /api/edit-image
 */
router.post(CONFIG.ENDPOINTS.EDIT_IMAGE.replace('/api', ''), async (req, res) => {
  try {
    const { imageUrl, prompt, systemPrompt } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const providerConfig = CONFIG.IMAGE_GENERATION.PROVIDERS['openai-editor'];
    const filename = `edited-${Date.now()}-${Math.round(Math.random() * 1E6)}.png`;
    const outputPath = path.join(CONFIG.DIRECTORIES.IMAGES, filename);
    let imagePath;

    if (imageUrl.startsWith('/assets/')) {
      const relativePath = imageUrl.replace('/assets/', '');
      imagePath = path.join(CONFIG.DIRECTORIES.ASSETS_ROOT, relativePath);
    } else {
      return res.status(400).json({ error: 'Unsupported image URL format. Must be a server asset path.' });
    }
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Source image not found' });
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const editedImageData = await editImageWithOpenAI(imageBuffer, prompt, systemPrompt, providerConfig);
    fs.writeFileSync(outputPath, editedImageData, 'binary');
    
    res.json({
      success: true,
      filename,
      url: `/assets/images/${filename}`,
      message: 'Image edited successfully'
    });
    
  } catch (error) {
    console.error('Error editing image:', error);
    res.status(500).json({ 
      error: 'Failed to edit image', 
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Get available image generation providers
 * GET /api/image-providers
 */
router.get(CONFIG.ENDPOINTS.IMAGE_PROVIDERS.replace('/api', ''), (req, res) => {
  try {
    const providers = Object.keys(CONFIG.IMAGE_GENERATION.PROVIDERS).map(key => ({
      id: key,
      name: CONFIG.IMAGE_GENERATION.PROVIDERS[key].NAME || key.charAt(0).toUpperCase() + key.slice(1)
    }));
    res.json(providers);
  } catch (error) {
    console.error('Error fetching image generation providers:', error);
    res.status(500).json({ error: 'Server error fetching providers' });
  }
});

// Helper function for OpenAI image generation
async function generateOpenAIImage(prompt, systemPrompt, config) {
  console.log(`Generating image with OpenAI using prompt: ${prompt}`);
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const response = await axios.post('https://api.openai.com/v1/images/generations', {
    model: config.MODEL || "dall-e-3",
    prompt: fullPrompt,
    n: 1,
    size: config.SIZE || "1024x1024",
    response_format: "b64_json"
  }, {
    headers: {
      'Authorization': `Bearer ${config.API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const b64Data = response.data.data[0].b64_json;
  return Buffer.from(b64Data, 'base64');
}

// Helper function for OpenAI image editing
async function editImageWithOpenAI(imageBuffer, prompt, systemPrompt, config) {
  console.log(`Editing image with OpenAI using prompt: ${prompt}`);
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const b64Image = imageBuffer.toString('base64');
  const response = await axios.post('https://api.openai.com/v1/images/generations', {
    model: config.MODEL || "gpt-image-1", // This might need to be an actual edit model endpoint
    prompt: fullPrompt,
    n: 1,
    size: config.SIZE || "1024x1024",
    response_format: "b64_json",
    reference_image: b64Image // Parameter name might vary for actual edit APIs
  }, {
    headers: {
      'Authorization': `Bearer ${config.API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const b64Data = response.data.data[0].b64_json;
  return Buffer.from(b64Data, 'base64');
}

// Helper function for Stability AI image generation
async function generateStabilityAIImage(prompt, systemPrompt, config) {
  console.log(`Generating image with Stability AI using prompt: ${prompt}`);
  const fullPrompt = systemPrompt ? `${systemPrompt}. ${prompt}` : prompt;
  const response = await axios.post(`https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`, {
    text_prompts: [
      {
        text: fullPrompt,
        weight: 1
      }
    ],
    cfg_scale: 7,
    height: 1024,
    width: 1024,
    samples: 1,
  }, {
    headers: {
      'Authorization': `Bearer ${config.API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}

// Helper function for Google image generation
async function generateGoogleImage(prompt, systemPrompt, config) {
  console.log(`Generating image with Google Imagen using prompt: ${prompt}`);
  const fullPrompt = systemPrompt ? `${systemPrompt}. ${prompt}` : prompt;
  const response = await axios.post(`${config.API_ENDPOINT}`, {
    prompt: fullPrompt,
    model: config.MODEL || "imagen-1.0",
    width: 1024,
    height: 1024
  }, {
    headers: {
      'Authorization': `Bearer ${config.API_KEY}`,
      'Content-Type': 'application/json'
    },
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}

module.exports = router; 