/**
 * Main server application that sets up the Express server with all routes and middleware.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const CONFIG = require('./config/config');
const ModelMetadataUtil = require('./utils/modelMetadataUtil');
const cors = require('cors');
const terrainRoutes = require('./routes/terrain');
const { getTerrainParams } = require('./utils/terrain/terrainAgent');

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
const port = 3000; // Force port 3000 to match frontend proxy
const isDevelopment = process.env.NODE_ENV === 'development';

// Middleware
app.use(cors({
    origin: isDevelopment ? '*' : 'http://localhost:5173', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Development logging middleware
if (isDevelopment) {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

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
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            models: '/api/models',
            trellis: CONFIG.ENDPOINTS.TRELLIS,
            generateImage: CONFIG.ENDPOINTS.GENERATE_IMAGE,
            terrain: '/api/terrain'
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

// Routes
app.use('/api/terrain', terrainRoutes);

// API endpoint for terrain parameters from description
app.post('/api/terrain/params', (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }
  const params = getTerrainParams(description);
  res.json(params);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        details: isDevelopment ? err.stack : undefined
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
}); 