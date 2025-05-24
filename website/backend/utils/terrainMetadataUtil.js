/**
 * Terrain metadata management utility
 */
const fs = require('fs');
const path = require('path');
const CONFIG = require('../config/config');

class TerrainMetadataUtil {
  
  static get TERRAIN_METADATA_FILE() {
    return path.join(CONFIG.DIRECTORIES.DATA, 'terrain_metadata.json');
  }

  /**
   * Initialize the metadata file if it doesn't exist
   */
  static initMetadataFile() {
    if (!fs.existsSync(this.TERRAIN_METADATA_FILE)) {
      this.saveMetadata({});
      console.log(`Created terrain metadata file at ${this.TERRAIN_METADATA_FILE}`);
    }
  }

  /**
   * Load all terrain metadata
   * @returns {object} - All terrain metadata
   */
  static getMetadata() {
    try {
      if (!fs.existsSync(this.TERRAIN_METADATA_FILE)) {
        return {};
      }
      const data = fs.readFileSync(this.TERRAIN_METADATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading terrain metadata:', error);
      return {};
    }
  }

  /**
   * Save terrain metadata
   * @param {object} metadata - Metadata to save
   */
  static saveMetadata(metadata) {
    try {
      fs.writeFileSync(this.TERRAIN_METADATA_FILE, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Error saving terrain metadata:', error);
    }
  }

  /**
   * Get metadata for a specific terrain
   * @param {string} terrainId - Terrain ID
   * @returns {object|null} - Terrain metadata
   */
  static getTerrainMetadata(terrainId) {
    const allMetadata = this.getMetadata();
    return allMetadata[terrainId] || null;
  }

  /**
   * Update metadata for a specific terrain
   * @param {string} terrainId - Terrain ID
   * @param {object} updates - Metadata updates
   * @returns {boolean} - Success status
   */
  static async updateTerrainMetadata(terrainId, updates) {
    try {
      const allMetadata = this.getMetadata();
      
      if (!allMetadata[terrainId]) {
        allMetadata[terrainId] = {
          created: Date.now()
        };
      }
      
      // Merge updates with existing metadata
      allMetadata[terrainId] = {
        ...allMetadata[terrainId],
        ...updates,
        updated: Date.now()
      };
      
      this.saveMetadata(allMetadata);
      return true;
    } catch (error) {
      console.error('Error updating terrain metadata:', error);
      return false;
    }
  }

  /**
   * Remove terrain metadata
   * @param {string} terrainId - Terrain ID
   * @returns {boolean} - Success status
   */
  static async removeTerrain(terrainId) {
    try {
      const allMetadata = this.getMetadata();
      delete allMetadata[terrainId];
      this.saveMetadata(allMetadata);
      return true;
    } catch (error) {
      console.error('Error removing terrain metadata:', error);
      return false;
    }
  }

  /**
   * Check if terrain exists
   * @param {string} terrainId - Terrain ID
   * @returns {boolean} - Existence status
   */
  static terrainExists(terrainId) {
    const metadata = this.getTerrainMetadata(terrainId);
    return metadata !== null;
  }

  /**
   * Generate unique terrain name
   * @param {string} originalName - Original filename
   * @returns {string} - Unique terrain name
   */
  static generateUniqueTerrainName(originalName) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseName}_${timestamp}_${randomSuffix}${ext}`;
  }
}

module.exports = TerrainMetadataUtil; 