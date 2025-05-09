const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CONFIG = require('../config/config');

// Simple Promise-based mutex for serializing file writes
class Mutex {
  constructor() {
    this._queue = [];
    this._locked = false;
  }
  lock() {
    return new Promise(resolve => {
      if (this._locked) {
        this._queue.push(resolve);
      } else {
        this._locked = true;
        resolve();
      }
    });
  }
  unlock() {
    if (this._queue.length > 0) {
      const next = this._queue.shift();
      next();
    } else {
      this._locked = false;
    }
  }
}

// Shared mutex for metadata file writes
const metadataMutex = new Mutex();

/**
 * Utility to manage metadata for 3D models
 */
class ModelMetadataUtil {
  /**
   * Initialize the model metadata file if it doesn't exist
   */
  static initMetadataFile() {
    try {
      // Ensure the data directory exists
      const dataDir = path.dirname(CONFIG.MODEL_METADATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created data directory at ${dataDir}`);
      }
      
      if (!fs.existsSync(CONFIG.MODEL_METADATA_FILE)) {
        // Create an empty metadata object and save it
        fs.writeFileSync(CONFIG.MODEL_METADATA_FILE, JSON.stringify({}, null, 2));
        console.log(`Created model metadata file at ${CONFIG.MODEL_METADATA_FILE}`);
      }
    } catch (error) {
      console.error('Error initializing model metadata file:', error);
    }
  }

  /**
   * Get all model metadata
   * @returns {Object} The model metadata
   */
  static getMetadata() {
    try {
      // Initialize the file if it doesn't exist
      this.initMetadataFile();
      
      // Read and parse the metadata file
      const data = fs.readFileSync(CONFIG.MODEL_METADATA_FILE, 'utf8');
      try {
        const metadata = JSON.parse(data);
        return metadata;
      } catch (parseError) {
        console.error('Error parsing model metadata JSON:', parseError);
        // If the file is corrupt, create a new one
        fs.writeFileSync(CONFIG.MODEL_METADATA_FILE, JSON.stringify({}, null, 2));
        return {};
      }
    } catch (error) {
      console.error('Error reading model metadata:', error);
      return {};
    }
  }

  /**
   * Generate a unique filename for a model
   * @param {string} originalName - The original name of the file
   * @returns {string} A unique filename
   */
  static generateUniqueModelName(originalName) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const hash = crypto.randomBytes(4).toString('hex');
    return `${sanitizedName}_${hash}${ext}`;
  }

  /**
   * Add or update model metadata
   * @param {string} modelName - The name of the 3D model file
   * @param {Object} metadata - The model metadata
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  static async updateModelMetadata(modelName, metadata) {
    await metadataMutex.lock();
    try {
      // Get current metadata
      const allMetadata = this.getMetadata();
      
      // Merge with existing metadata if it exists
      if (allMetadata[modelName]) {
        allMetadata[modelName] = {
          ...allMetadata[modelName],
          ...metadata,
          updated: Date.now()
        };
      } else {
        // Add new metadata with timestamp
        allMetadata[modelName] = {
          ...metadata,
          created: Date.now(),
          updated: Date.now()
        };
      }
      
      // Save the updated metadata
      fs.writeFileSync(CONFIG.MODEL_METADATA_FILE, JSON.stringify(allMetadata, null, 2));
      
      return true;
    } catch (error) {
      console.error('Error updating model metadata:', error);
      return false;
    } finally {
      metadataMutex.unlock();
    }
  }

  /**
   * Get metadata for a specific model
   * @param {string} modelName - The name of the 3D model
   * @returns {Object|null} The model metadata or null if not found
   */
  static getModelMetadata(modelName) {
    const allMetadata = this.getMetadata();
    return allMetadata[modelName] || null;
  }

  /**
   * Check if a model exists in the metadata
   * @param {string} modelName - The name of the 3D model
   * @returns {boolean} Whether the model exists in metadata
   */
  static modelExists(modelName) {
    const allMetadata = this.getMetadata();
    return !!allMetadata[modelName];
  }

  /**
   * Remove a model from the metadata
   * @param {string} modelName - The name of the 3D model
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  static async removeModel(modelName) {
    await metadataMutex.lock();
    try {
      const allMetadata = this.getMetadata();
      if (modelName in allMetadata) {
        delete allMetadata[modelName];
        fs.writeFileSync(CONFIG.MODEL_METADATA_FILE, JSON.stringify(allMetadata, null, 2));
        console.log(`Removed metadata for model: ${modelName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing model metadata:', error);
      return false;
    } finally {
      metadataMutex.unlock();
    }
  }
}

module.exports = ModelMetadataUtil; 