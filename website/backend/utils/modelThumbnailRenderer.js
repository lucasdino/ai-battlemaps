const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const CONFIG = require('../config/config');

/**
 * Generates 3D thumbnails from GLB models using headless browser and Three.js
 */
class ModelThumbnailRenderer {
  /**
   * Generate a thumbnail for a 3D model
   * @param {string} modelPath - Path to the model file
   * @param {string} outputPath - Path to save the thumbnail
   * @param {Object} options - Options for thumbnail generation
   * @returns {Promise<string>} - Path to the generated thumbnail
   * @throws {Error} If thumbnail generation fails
   */
  static async generateThumbnail(modelPath, outputPath, options = {}) {
    const {
      size = CONFIG.THUMBNAILS.SIZE,
      format = CONFIG.THUMBNAILS.FORMAT,
      backgroundColor = CONFIG.THUMBNAILS.BACKGROUND
    } = options;
    
    // Make sure the model exists
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found at path: ${modelPath}`);
    }
    
    try {
      // Read the model file directly instead of trying to serve it
      const modelBuffer = fs.readFileSync(modelPath);
      const modelBase64 = modelBuffer.toString('base64');
      
      // Get screenshot using base64 encoded model
      const screenshot = await this._renderModelToImage(modelBase64, size, backgroundColor);
      
      // Process and save the image
      const sharpInstance = sharp(screenshot).resize(size, size);
      
      if (format.toLowerCase() === 'png') {
        await sharpInstance.png({ quality: CONFIG.THUMBNAILS.QUALITY }).toFile(outputPath);
      } else if (format.toLowerCase() === 'jpeg' || format.toLowerCase() === 'jpg') {
        await sharpInstance.jpeg({ quality: CONFIG.THUMBNAILS.QUALITY }).toFile(outputPath);
      } else {
        await sharpInstance.toFormat(format).toFile(outputPath);
      }
      
      return outputPath;
    } catch (error) {
      console.error(`Error generating thumbnail for ${modelPath}:`, error.message);
      throw error; 
    }
  }
  
  /**
   * Render a 3D model to an image using Puppeteer and Three.js
   * @private
   */
  static async _renderModelToImage(modelBase64, size, backgroundColor) {
    let browser = null;
    
    try {
      // Launch headless browser
      browser = await puppeteer.launch({ 
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security'
        ]
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: size, height: size });
      
      // Only log errors from the browser
      page.on('pageerror', err => console.error(`Browser error: ${err.message}`));
      
      // Use data URI for model loading instead of server URL
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>3D Model Renderer</title>
          <style>
            body { margin: 0; overflow: hidden; background-color: ${backgroundColor}; }
            canvas { display: block; }
          </style>
          <!-- Using CDN for Three.js -->
          <script src="https://cdn.jsdelivr.net/npm/three@0.137.0/build/three.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/three@0.137.0/examples/js/loaders/GLTFLoader.js"></script>
        </head>
        <body>
          <script>
            // Wait for scripts to load
            window.onload = function() {
              const modelBase64 = "${modelBase64}";
              const size = ${size};
              
              try {
                // Create renderer
                const renderer = new THREE.WebGLRenderer({ 
                  alpha: true, 
                  antialias: true, 
                  preserveDrawingBuffer: true,
                  failIfMajorPerformanceCaveat: true
                });
                renderer.setSize(size, size);
                renderer.setClearColor(0x000000, 0);
                renderer.setPixelRatio(1);
                document.body.appendChild(renderer.domElement);
                
                // Create scene
                const scene = new THREE.Scene();
                
                // Add lights (matching ModelViewer.jsx setup)
                // Extremely even, bright lighting from all angles
                const ambientLight = new THREE.AmbientLight(0xffffff, 8.0);
                scene.add(ambientLight);

                // Key directional light (main)
                const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
                keyLight.position.set(3, 6, 3);
                scene.add(keyLight);

                // Fill directional light (opposite side, higher intensity)
                const fillLight = new THREE.DirectionalLight(0xffffff, 5.0);
                fillLight.position.set(-4, -8, -4);
                scene.add(fillLight);

                // Extra fill light from the side/below
                const sideLight = new THREE.DirectionalLight(0xffffff, 3);
                sideLight.position.set(0, -8, 4);
                scene.add(sideLight);

                // Fourth light from the back
                const backLight = new THREE.DirectionalLight(0xffffff, 3);
                backLight.position.set(0, 2, -8);
                scene.add(backLight);

                // Add another fill directional light from the right
                const rightFillLight = new THREE.DirectionalLight(0xffffff, 3);
                rightFillLight.position.set(8, 0, 2);
                scene.add(rightFillLight);
                
                // Create camera
                const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
                
                // Convert base64 to blob URL
                const binary = atob(modelBase64);
                const len = binary.length;
                const buffer = new ArrayBuffer(len);
                const view = new Uint8Array(buffer);
                for (let i = 0; i < len; i++) {
                  view[i] = binary.charCodeAt(i);
                }
                const blob = new Blob([buffer], {type: 'application/octet-stream'});
                const modelUrl = URL.createObjectURL(blob);
                
                // Load the model
                const loader = new THREE.GLTFLoader();
                loader.load(
                  modelUrl,
                  function(gltf) {
                    const model = gltf.scene;
                    scene.add(model);
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                    
                    // Size the camera to fit the model
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const fov = camera.fov * (Math.PI / 180);
                    
                    // Calculate distances needed for height and width
                    const aspect = 1; // Square thumbnail
                    const hfov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
                    const distanceForHeight = size.y / (2.8 * Math.tan(fov / 2));
                    const distanceForWidth = size.x / (2.8 * Math.tan(hfov / 2));
                    const distanceForDepth = size.z / (2.8 * Math.tan(hfov / 2));
                    
                    // Use the maximum distance to ensure the entire model is visible
                    let cameraZ = Math.max(distanceForHeight, distanceForWidth, distanceForDepth);
                    
                    // Minimal margin for extremely tight framing
                    cameraZ = Math.max(cameraZ * 1.01, 1.1);
                    
                    // Position camera at an angle (increased Y multiplier from 0.5 to 0.7 for higher angle)
                    camera.position.set(cameraZ * 0.8, cameraZ * 0.7, cameraZ * 1);
                    camera.lookAt(new THREE.Vector3(0, 0, 0));
                    
                    // Rotate the model slightly for a better view (matching ModelViewer.jsx)
                    model.rotation.y = Math.PI / 6;
                    
                    // Render the scene
                    renderer.render(scene, camera);
                    
                    // Clean up
                    URL.revokeObjectURL(modelUrl);
                    
                    // Signal rendering is complete
                    window.renderedSuccessfully = true;
                  },
                  undefined, // Progress function (removed logging)
                  function(error) {
                    // Error
                    window.renderError = error.message || "Error loading model";
                  }
                );
              } catch (error) {
                window.renderError = error.message;
              }
            };
          </script>
        </body>
        </html>
      `);
      
      // Wait for rendering to complete or fail
      await page.waitForFunction(() => {
        return window.renderedSuccessfully || window.renderError;
      }, { timeout: 15000 });
      
      // Check for render errors
      const renderError = await page.evaluate(() => window.renderError);
      if (renderError) {
        throw new Error(`Browser rendering error: ${renderError}`);
      }
      
      // Take screenshot
      const screenshot = await page.screenshot({ 
        type: 'png',
        omitBackground: false // Include background to avoid transparency issues
      });
      
      return screenshot;
    } catch (err) {
      console.error(`Rendering error: ${err.message}`);
      throw err;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = ModelThumbnailRenderer; 