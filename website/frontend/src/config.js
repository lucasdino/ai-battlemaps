// Frontend API Configuration
const CONFIG = {
  API: {
    BASE_URL: 'http://localhost:3001',
    ENDPOINTS: {
      MODELS: {
        BASE: '/api/models',
        UPLOAD: '/api/models/upload',
        VIDEOS: '/api/models/videos',
        ICON: '/api/models/:id/icon',
        VIDEO: '/api/models/:id/video'
      },
      TERRAINS: {
        BASE: '/api/terrains',
        UPLOAD: '/api/terrains/upload',
        ICON: '/api/terrains/:id/icon'
      },
      TRELLIS: '/api/trellis', // 3D asset generation endpoint that connects to external service
      GENERATE_IMAGE: '/api/generate-image', // Endpoint to generate images with AI
      IMAGE_PROVIDERS: '/api/image-providers', // Endpoint to get available image generation providers
      EDIT_IMAGE: '/api/edit-image', // Endpoint to edit existing images
      GET_SYSTEM_PROMPT: '/api/system-prompt', // Endpoint to get the default system prompt
      UPDATE_SYSTEM_PROMPT: '/api/system-prompt/update', // Endpoint to update the system prompt
    },
    PARAMS: {
      TEMP_FOLDER: 'tempFolder' // Parameter to signal storing in temporary folder (kept for backwards compatibility)
    },
    ASSET_PATHS: {
      MODELS: 'assets/3d_models',
      IMAGE_GEN: 'assets/image_gen',
      IMAGE_UPLOADS: 'assets/image_uploads',
      MODEL_ICONS: 'assets/3d_model_icons',
      ASSET_VIDEOS: 'assets/asset_videos',
      TERRAINS: 'assets/terrains',
      TERRAIN_IMAGES: 'assets/terrain_images',
      TERRAIN_ICONS: 'assets/terrain_icons'
    }
  }
};

export default CONFIG; 