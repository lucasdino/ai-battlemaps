// Backend API Configuration
const path = require('path');
const API_KEYS = require('./apiKeys');

// External services configuration
const TRELLIS_HOST = '52.4.82.21';
const TRELLIS_PORT = 6571;

// Get the backend root directory (one level up from config folder)
const BACKEND_ROOT = path.join(__dirname, '..');

const CONFIG = {
  PORT: 3001,
  
  CORS: {
    ORIGIN: '*',
    METHODS: ['GET', 'POST', 'PUT', 'DELETE'],
    ALLOWED_HEADERS: ['Content-Type']
  },
  
  DIRECTORIES: {
    ASSETS_ROOT: path.join(BACKEND_ROOT, 'assets'),
    MODELS: path.join(BACKEND_ROOT, 'assets', '3d_models'),
    IMAGES: path.join(BACKEND_ROOT, 'assets', 'images'),
    ASSET_VIDEOS: path.join(BACKEND_ROOT, 'assets', 'asset_videos'),
    MODEL_ICONS: path.join(BACKEND_ROOT, 'assets', '3d_model_icons'),
    DATA: path.join(BACKEND_ROOT, 'data')
  },
  
  ENDPOINTS: {
    // Models API endpoints
    MODELS: '/api/models',
    MODELS_UPLOAD: '/api/models/upload',
    MODELS_VIDEOS: '/api/models/videos',
    
    // AI generation endpoints
    TRELLIS: '/api/trellis',
    GENERATE_IMAGE: '/api/generate-image',
    IMAGE_PROVIDERS: '/api/image-providers',
    EDIT_IMAGE: '/api/edit-image',
    
    // System configuration endpoints
    GET_SYSTEM_PROMPT: '/api/system-prompt',
    UPDATE_SYSTEM_PROMPT: '/api/system-prompt/update'
  },
  
  PARAMS: {
    TEMP_FOLDER: 'tempFolder'
  },
  
  FILE_TYPES: {
    MODELS: ['.glb'],
    IMAGES: ['.png', '.jpg', '.jpeg', '.webp'],
    VIDEOS: ['.mp4', '.webm']
  },
  
  EXTERNAL: {
    TRELLIS: {
      HOST: TRELLIS_HOST,
      PORT: TRELLIS_PORT,
      ENDPOINT: '/generate',
      URL: `http://${TRELLIS_HOST}:${TRELLIS_PORT}/generate`
    }
  },
  
  // Path to the model metadata file
  MODEL_METADATA_FILE: path.join(BACKEND_ROOT, 'data', 'model_metadata.json'),
  
  // Path to the system prompt file
  SYSTEM_PROMPT_FILE: path.join(BACKEND_ROOT, 'data', 'system_prompt.json'),
  
  // Thumbnail configuration
  THUMBNAILS: {
    FORMAT: 'png',
    SIZE: 200,
    QUALITY: 90,
    BACKGROUND: '#3a3a3a'
  },
  
  // Asset metadata types
  ASSET_TYPES: {
    UPLOADED_MODEL: 'uploaded_model',
    GENERATED_MODEL: 'generated_model',
    IMAGE_TO_3D: 'image_to_3d'
  },
  
  SOURCE_TYPES: {
    UPLOADED_IMAGE: 'uploaded_image',
    GENERATED_IMAGE: 'generated_image',
    EXTERNAL: 'external'
  },
  
  // Image generation configuration
  IMAGE_GENERATION: {
    DEFAULT_PROVIDER: 'openai',
    DEFAULT_SYSTEM_PROMPT: 'Generate an isometric projection of a 3D asset. Ensure the subject is the main focus, their full body is visible, visual depth, and there is no background.',
    PROVIDERS: {
      'openai': {
        NAME: 'OpenAI DALL-E',
        API_KEY: API_KEYS.OPENAI,
        MODEL: 'dall-e-3',
        SIZE: '1024x1024',
        DESCRIPTION: 'OpenAI DALL-E 3 (Image Generation).'
      },
      'stability': {
        NAME: 'Stability AI',
        API_KEY: API_KEYS.STABILITY,
        MODEL: 'stable-diffusion-xl',
        DESCRIPTION: 'Stability AI image generation with SDXL'
      },
      'google': {
        NAME: 'Google Imagen',
        API_KEY: API_KEYS.GOOGLE,
        API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict',
        MODEL: 'imagen-3.0-generate-002',
        DESCRIPTION: 'Google Gemini Imagen 3 (Image Generation).'
      },
      'openai-editor': {
        NAME: 'OpenAI Image Editor',
        API_KEY: API_KEYS.OPENAI,
        MODEL: 'gpt-image-1',
        SIZE: '1024x1024',
        DESCRIPTION: 'OpenAI GPT Image Model (Image Generation / Image Editing).'
      }
    }
  }
};

module.exports = CONFIG; 