/**
 * Main server application that sets up the Express server with all routes and middleware.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const CONFIG = require('./config/config');
const ModelMetadataUtil = require('./utils/modelMetadataUtil');

// Import middleware and router utilities
const { setupCommonMiddleware, setupStaticServing } = require('./utils/middleware');
const { setupRouters } = require('./utils/router');

// Require routers
const modelsApiRouter = require('./routes/modelsApi');
const imagesRouter = require('./routes/images');
const trellisRouter = require('./routes/trellis');
const systemPromptRouter = require('./routes/systemPrompt');
const debugRouter = require('./routes/debug');

// Initialize Express app
const app = express();
const port = CONFIG.PORT;

// Ensure all necessary directories exist
const ensureDirectoriesExist = () => {
  const directories = [
    CONFIG.DIRECTORIES.ASSETS_ROOT,
    CONFIG.DIRECTORIES.MODELS,
    CONFIG.DIRECTORIES.MODEL_ICONS,
    CONFIG.DIRECTORIES.DATA,
    CONFIG.DIRECTORIES.IMAGES,
    CONFIG.DIRECTORIES.ASSET_VIDEOS
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
      
      // Add a .gitkeep file to ensure the directory is tracked by git
      const gitkeepPath = path.join(dir, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '# This file ensures the directory is tracked by git\n');
        console.log(`Added .gitkeep file to ${dir}`);
      }
    }
  });
};

// Call the function before setting up routes
ensureDirectoriesExist();

// Initialize the metadata file
ModelMetadataUtil.initMetadataFile();

// Initialize the system prompt file if it doesn't exist
if (!fs.existsSync(CONFIG.SYSTEM_PROMPT_FILE)) {
  fs.writeFileSync(
    CONFIG.SYSTEM_PROMPT_FILE, 
    JSON.stringify({ 
      systemPrompt: CONFIG.IMAGE_GENERATION.DEFAULT_SYSTEM_PROMPT 
    }, null, 2)
  );
  console.log(`Created system prompt file at ${CONFIG.SYSTEM_PROMPT_FILE}`);
}

// Setup common middleware (CORS, JSON parsing)
setupCommonMiddleware(app);

// Setup static file serving for assets
setupStaticServing(app);

// Setup all API routers using the unified models API
setupRouters(app, {
  modelsApi: modelsApiRouter,
  images: imagesRouter, 
  trellis: trellisRouter,
  systemPrompt: systemPromptRouter,
  debug: debugRouter
});

// Add a verification endpoint to check if the server is running
app.get('/api/status', (req, res) => {
  const status = {
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      models: '/api/models',
      trellis: CONFIG.ENDPOINTS.TRELLIS,
      generateImage: CONFIG.ENDPOINTS.GENERATE_IMAGE
    },
    staticPaths: {
      models: '/assets/3d_models',
      modelIcons: '/assets/3d_model_icons',
      images: '/assets/images',
      assetVideos: '/assets/asset_videos'
    }
  };
  res.json(status);
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
}); 