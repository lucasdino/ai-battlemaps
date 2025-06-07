/**
 * Centralized middleware setup for the Express application
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const CONFIG = require('../config/config');
const ModelMetadataUtil = require('./modelMetadataUtil');

/**
 * Configure common middleware for an Express application
 * @param {Object} app - Express application
 */
const setupCommonMiddleware = (app) => {
  // Configure CORS
  app.use(cors({
    origin: CONFIG.CORS.ORIGIN,
    methods: CONFIG.CORS.METHODS,
    allowedHeaders: CONFIG.CORS.ALLOWED_HEADERS,
  }));

  // JSON parsing middleware
  app.use(express.json());
};

/**
 * Configure static file serving middleware for assets
 * @param {Object} app - Express application
 */
const setupStaticServing = (app) => {
  // Primary asset directories
  app.use('/assets/3d_models', express.static(CONFIG.DIRECTORIES.MODELS));
  app.use('/assets/3d_model_icons', express.static(CONFIG.DIRECTORIES.MODEL_ICONS));
  app.use('/assets/images', express.static(CONFIG.DIRECTORIES.IMAGES));
  app.use('/assets/asset_videos', express.static(CONFIG.DIRECTORIES.ASSET_VIDEOS));
  
  // Terrain asset directories
  console.log(`[DEBUG] Serving terrains from physical path: ${CONFIG.DIRECTORIES.TERRAINS}`);
  app.use('/assets/terrains', express.static(CONFIG.DIRECTORIES.TERRAINS));
  app.use('/assets/terrain_images', express.static(CONFIG.DIRECTORIES.TERRAIN_IMAGES));
  app.use('/assets/terrain_icons', express.static(CONFIG.DIRECTORIES.TERRAIN_ICONS));
  
  // Dungeon assets directory
  console.log(`[DEBUG] Serving dungeon assets from physical path: ${CONFIG.DIRECTORIES.DUNGEON}`);
  app.use('/assets/dungeon', express.static(CONFIG.DIRECTORIES.DUNGEON));
  
  // Dungeon layouts directory (for serving layout JSON files)
  console.log(`[DEBUG] Serving dungeon layouts from physical path: ${CONFIG.DIRECTORIES.DUNGEON_LAYOUTS}`);
  app.use('/assets/dungeon_layouts', express.static(CONFIG.DIRECTORIES.DUNGEON_LAYOUTS));
  
  // Dungeon defaults directory (for serving default models and icons)
  console.log(`[DEBUG] Serving dungeon defaults from physical path: ${CONFIG.DIRECTORIES.DUNGEON_DEFAULTS}`);
  app.use('/assets/dungeon_defaults', express.static(CONFIG.DIRECTORIES.DUNGEON_DEFAULTS));
  
  // Log the static serving paths for debugging
  console.log('Serving static files from:');
  console.log(`- ${CONFIG.DIRECTORIES.MODELS} at /assets/3d_models`);
  console.log(`- ${CONFIG.DIRECTORIES.MODEL_ICONS} at /assets/3d_model_icons`);
  console.log(`- ${CONFIG.DIRECTORIES.IMAGES} at /assets/images`);
  console.log(`- ${CONFIG.DIRECTORIES.ASSET_VIDEOS} at /assets/asset_videos`);
  console.log(`- ${CONFIG.DIRECTORIES.TERRAINS} at /assets/terrains`);
  console.log(`- ${CONFIG.DIRECTORIES.TERRAIN_IMAGES} at /assets/terrain_images`);
  console.log(`- ${CONFIG.DIRECTORIES.TERRAIN_ICONS} at /assets/terrain_icons`);
  console.log(`- ${CONFIG.DIRECTORIES.DUNGEON} at /assets/dungeon`);
  console.log(`- ${CONFIG.DIRECTORIES.DUNGEON_LAYOUTS} at /assets/dungeon_layouts`);
  console.log(`- ${CONFIG.DIRECTORIES.DUNGEON_DEFAULTS} at /assets/dungeon_defaults`);
};

/**
 * Create multer storage configuration for model uploads
 */
const createModelUpload = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, CONFIG.DIRECTORIES.MODELS);
    },
    filename: (req, file, cb) => {
      // Generate unique filename for models
      const uniqueFilename = ModelMetadataUtil.generateUniqueModelName(file.originalname);
      cb(null, uniqueFilename);
    }
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (CONFIG.FILE_TYPES.MODELS.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${CONFIG.FILE_TYPES.MODELS.join(', ')} files are allowed!`), false);
      }
    }
  });
};

/**
 * Create multer storage configuration for image uploads
 */
const createImageUpload = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, CONFIG.DIRECTORIES.IMAGES);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `image-${uniqueSuffix}${ext}`);
    }
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (CONFIG.FILE_TYPES.IMAGES.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${CONFIG.FILE_TYPES.IMAGES.join(', ')} files are allowed!`), false);
      }
    }
  });
};

/**
 * Create multer storage configuration for icon uploads
 */
const createIconUpload = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, CONFIG.DIRECTORIES.MODEL_ICONS);
    },
    filename: (req, file, cb) => {
      // The model name is expected to be in the request body
      const modelName = req.body.modelName || 'unknown';
      const ext = path.extname(file.originalname);
      cb(null, `${modelName}-icon${ext}`);
    }
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (CONFIG.FILE_TYPES.IMAGES.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${CONFIG.FILE_TYPES.IMAGES.join(', ')} files are allowed!`), false);
      }
    }
  });
};

/**
 * Create multer storage configuration for video uploads
 */
const createVideoUpload = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, CONFIG.DIRECTORIES.ASSET_VIDEOS);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `video-${uniqueSuffix}${ext}`);
    }
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (CONFIG.FILE_TYPES.VIDEOS.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${CONFIG.FILE_TYPES.VIDEOS.join(', ')} files are allowed!`), false);
      }
    }
  });
};

module.exports = {
  setupCommonMiddleware,
  setupStaticServing,
  createModelUpload,
  createImageUpload,
  createIconUpload,
  createVideoUpload
}; 