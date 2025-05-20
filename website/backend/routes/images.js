/**
 * Image generation and editing API routes
 */
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const FormData = require('form-data');
const CONFIG = require('../config/config');

const router = express.Router();

// Multer setup for memory storage (to get buffers)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Example: 50MB limit per file
});

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
      case 'google':
        imageData = await generateGoogleImage(prompt, systemPrompt, providerConfig);
        break;
      case 'openai-editor':
        imageData = await generateOpenAIImage(prompt, systemPrompt, providerConfig);
        break;
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
    console.error('Error generating image route:', error.message); 
    if (error.response) {
      console.error('API Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.config) {
      // console.error('Axios request config:', JSON.stringify(error.config, null, 2)); // Can be very verbose
    }
    res.status(500).json({ 
      error: 'Failed to generate image', 
      details: error.response ? error.response.data : (error.message || 'Unknown error')
    });
  }
});

/**
 * Edit an existing image using AI
 * POST /api/edit-image
 */
router.post(CONFIG.ENDPOINTS.EDIT_IMAGE.replace('/api', ''), upload.array('images', 5), async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const providerConfig = CONFIG.IMAGE_GENERATION.PROVIDERS['openai-editor'];
    const filename = `edited-${Date.now()}-${Math.round(Math.random() * 1E6)}.png`;
    const outputPath = path.join(CONFIG.DIRECTORIES.IMAGES, filename);
    
    const imageBuffers = files.map(file => file.buffer);
    
    const editedImageData = await editImagesWithOpenAI(imageBuffers, prompt, systemPrompt, providerConfig);
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

  // Build the request body dynamically; GPT-Image (gpt-image-1) rejects the
  // "response_format" parameter, whereas DALL-E 3 still expects it for base64.
  const requestBody = {
    model: config.MODEL || 'dall-e-3',
    prompt: fullPrompt,
    n: 1,
    size: config.SIZE || '1024x1024',
  };

  if ((config.MODEL || 'dall-e-3') !== 'gpt-image-1') {
    // DALL-E models accept response_format; GPT-Image does not
    requestBody.response_format = 'b64_json';
  }

  const response = await axios.post('https://api.openai.com/v1/images/generations', requestBody, {
    headers: {
      'Authorization': `Bearer ${config.API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  // OpenAI will always return base64 data for GPT-Image and for DALL-E when
  // response_format is set to b64_json. The JSON structure is consistent.
  const b64Data = response.data.data[0].b64_json;
  return Buffer.from(b64Data, 'base64');
}

// Helper function for OpenAI image editing (handles multiple buffers)
async function editImagesWithOpenAI(imageBuffers, prompt, systemPrompt, config) {
  if (!imageBuffers || imageBuffers.length === 0) {
    throw new Error('At least one image buffer must be provided.');
  }

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const form = new FormData();

  // Attach all image buffers as image[] fields, with debug logging
  imageBuffers.forEach((buf, i) => {
    console.log(`Adding image buffer #${i} - size: ${buf.length} bytes`);
    form.append('image[]', buf, { filename: `image${i}.png`, contentType: 'image/png' });
  });

  form.append('model', config.MODEL || 'gpt-image-1');
  form.append('prompt', fullPrompt);
  if (config.SIZE) form.append('size', config.SIZE);

  try {
    const response = await axios.post('https://api.openai.com/v1/images/edits', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${config.API_KEY}`,
      },
      maxBodyLength: Infinity, // To support large image uploads
    });

    // The response is always base64, no need for response_format param
    const b64Data = response.data.data[0].b64_json;
    return Buffer.from(b64Data, 'base64');
  } catch (err) {
    console.error("OpenAI API Error:", err.response?.data || err.message || err);
    throw err;
  }
}

// Helper function for Google Gemini image generation
async function generateGoogleImage(prompt, systemPrompt, config) {
  console.log(`Generating image with Google using prompt: ${prompt}`);
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  
  const response = await axios.post(
    `${config.API_ENDPOINT}?key=${config.API_KEY}`, 
    {
      instances: [
        {
          prompt: fullPrompt
        }
      ],
      parameters: {
        sampleCount: 1
      }
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  const b64Data = response.data.predictions[0].bytesBase64Encoded;
  return Buffer.from(b64Data, 'base64');
}

module.exports = router; 