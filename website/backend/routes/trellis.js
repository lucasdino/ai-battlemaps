// This file will contain the Trellis integration route. 

const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const CONFIG = require('../config/config');
const { handleMulterError } = require('../utils/errorHandler');
const { createImageUpload } = require('../utils/middleware');
const ModelThumbnailRenderer = require('../utils/modelThumbnailRenderer');
const ModelMetadataUtil = require('../utils/modelMetadataUtil');

// Create router and image upload middleware
const router = express.Router();
const imageUpload = createImageUpload();

// Helper function to generate a thumbnail for a GLB model
const generateThumbnailForModel = async (modelPath, modelName) => {
  try {
    const baseName = path.basename(modelName, '.glb');
    const thumbnailName = `${baseName}.${CONFIG.THUMBNAILS.FORMAT}`;
    const thumbnailPath = path.join(CONFIG.DIRECTORIES.MODEL_ICONS, thumbnailName);
    
    console.log(`Generating thumbnail for model: ${modelPath} -> ${thumbnailPath}`);
    
    if (!fs.existsSync(path.dirname(thumbnailPath))) {
      fs.mkdirSync(path.dirname(thumbnailPath), { recursive: true });
    }
    
    await ModelThumbnailRenderer.generateThumbnail(modelPath, thumbnailPath, {
      size: CONFIG.THUMBNAILS.SIZE,
      backgroundColor: CONFIG.THUMBNAILS.BACKGROUND
    });
    
    console.log(`Thumbnail generated successfully: ${thumbnailPath}`);
    return {
      path: thumbnailPath,
      filename: thumbnailName
    };
  } catch (error) {
    console.error(`Error generating thumbnail for ${modelPath}:`, error);
    return null;
  }
};

// TRELLIS endpoint for image processing and 3D asset generation using external service
router.post(CONFIG.ENDPOINTS.TRELLIS.replace('/api', ''), imageUpload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image uploaded or file type not allowed.');
  }

  const uploadedImagePath = req.file.path;
  const uploadedImageFileName = req.file.filename;
  // Extract the base name from the original image file (without extension)
  const uploadedImageBaseName = path.basename(uploadedImageFileName, path.extname(uploadedImageFileName));
  
  const uploadedImageSource = req.file.mimetype.startsWith('image/') 
    ? CONFIG.SOURCE_TYPES.UPLOADED_IMAGE 
    : CONFIG.SOURCE_TYPES.EXTERNAL;
  
  // For custom naming, check if the request includes an outputBase parameter
  const outputBase = req.body.outputBase || uploadedImageBaseName;
  
  // Create unique model filename that preserves the uploaded image base name
  const uniqueModelName = ModelMetadataUtil.generateUniqueModelName(`${outputBase}.glb`);
  
  let glbFileName = uniqueModelName;
  let glbFilePath = path.join(CONFIG.DIRECTORIES.MODELS, uniqueModelName);
  let videoFileName = null;
  let thumbnailInfo = null;
  let clientDisconnected = false;

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(uploadedImagePath));

    console.log(`Sending image to Trellis service: ${CONFIG.EXTERNAL.TRELLIS.URL}`);
    
    const trellisRequest = axios({
      method: 'post',
      url: CONFIG.EXTERNAL.TRELLIS.URL,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        'Accept': 'multipart/mixed, application/octet-stream'
      },
      responseType: 'stream',
      params: {
        stream: true
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const trellisResponse = await trellisRequest;
    
    // Debug the content type header
    console.log("Trellis response content-type:", trellisResponse.headers['content-type']);
    
    let boundary;
    let boundaryBuffer;
    let headerSeparatorBuffer;
    let finalBoundaryBuffer;
    let finalBoundaryWithCRLFBuffer;
    
    const contentTypeHeader = trellisResponse.headers['content-type'];
    const boundaryMatch = contentTypeHeader && contentTypeHeader.match(/boundary=([^;]+)/);
    
    if (!boundaryMatch) {
      // Try an alternative approach to get the boundary
      console.warn("Boundary not found in Content-Type header, using default 'frame' boundary");
      boundary = "frame"; // Default boundary from your Python code
    } else {
      boundary = boundaryMatch[1];
      // Major event: boundary found (not needed for normal operation, so remove log)
    }
    
    boundaryBuffer = Buffer.from(`--${boundary}`);
    headerSeparatorBuffer = Buffer.from('\r\n\r\n');
    finalBoundaryBuffer = Buffer.from(`--${boundary}--`);
    finalBoundaryWithCRLFBuffer = Buffer.from(`--${boundary}--\r\n`);

    res.setHeader('Content-Type', `multipart/mixed; boundary=${boundary}`); 
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Connection', 'keep-alive');

    const initialMetadata = {
      name: path.basename(uniqueModelName, '.glb'),
      type: CONFIG.ASSET_TYPES.IMAGE_TO_3D,
      source: uploadedImageSource,
      sourceImage: { file: uploadedImageFileName, path: `/assets/images/${uploadedImageFileName}`, source: uploadedImageSource },
      status: 'processing'
    };
    await ModelMetadataUtil.updateModelMetadata(uniqueModelName, initialMetadata);
    
    req.on('close', function() {
      clientDisconnected = true;
      console.log('Client disconnected, processing will continue.');
    });
    
    let accumulatedDataBuffer = Buffer.alloc(0);
    let allPartsProcessed = false;

    trellisResponse.data.on('data', (chunk) => {
      if (allPartsProcessed) return;
      accumulatedDataBuffer = Buffer.concat([accumulatedDataBuffer, chunk]);
      processBufferedData();
    });

    trellisResponse.data.on('end', () => {
      if (!allPartsProcessed) { 
        processBufferedData(true); 
      }
      console.log('Trellis stream ended.');
      finalizeRequest();
    });

    trellisResponse.data.on('error', (error) => {
      console.error('Stream error:', error);
      allPartsProcessed = true; 
      if (!clientDisconnected && !res.headersSent) {
        res.status(500).json({ status: 'error', message: 'Stream error from Trellis service.' });
      } else if (!clientDisconnected) {
        try {
            res.write(`--${boundary}\r\n`);
            res.write(`Content-Type: application/json\r\n\r\n`);
            res.write(JSON.stringify({ status: 'error', message: error.message || 'Stream error' }));
            res.write('\r\n');
            res.write(`--${boundary}--\r\n`);
            res.end();
        } catch (e) { console.error("Error sending stream error part:", e); res.end(); }
      }
    });

    function processBufferedData(streamEnded = false) {
      if (allPartsProcessed) return;
      let currentSearchOffset = 0;
      // Remove chunk/boundary logs here
      while (true) {
        const partBoundaryStartIndex = accumulatedDataBuffer.indexOf(boundaryBuffer, currentSearchOffset);
        if (partBoundaryStartIndex === -1) {
          if (streamEnded && accumulatedDataBuffer.length > currentSearchOffset) {
            // Only log error if truly unexpected leftover data
            if (accumulatedDataBuffer.length - currentSearchOffset > 0) {
              console.error("Stream ended with unprocessed data segment.");
            }
          }
          accumulatedDataBuffer = accumulatedDataBuffer.slice(currentSearchOffset);
          break; 
        }
        if (accumulatedDataBuffer.slice(partBoundaryStartIndex).indexOf(finalBoundaryBuffer) === 0) {
          allPartsProcessed = true;
          accumulatedDataBuffer = Buffer.alloc(0);
          break;
        }
        const actualHeadersStartIndex = partBoundaryStartIndex + boundaryBuffer.length + 2; 
        const headersEndIndex = accumulatedDataBuffer.indexOf(headerSeparatorBuffer, actualHeadersStartIndex);
        if (headersEndIndex === -1) {
          accumulatedDataBuffer = accumulatedDataBuffer.slice(partBoundaryStartIndex);
          break;
        }
        const headersPartBuffer = accumulatedDataBuffer.slice(actualHeadersStartIndex, headersEndIndex);
        const headers = parseHeaders(headersPartBuffer.toString('utf-8'));
        const contentStartIndex = headersEndIndex + headerSeparatorBuffer.length;
        let nextPartEffectiveBoundaryIndex = accumulatedDataBuffer.indexOf(boundaryBuffer, contentStartIndex);
        let isFinalPart = false;
        if (nextPartEffectiveBoundaryIndex === -1) {
            const finalBoundaryCheckIndex = accumulatedDataBuffer.indexOf(finalBoundaryBuffer, contentStartIndex);
            if (finalBoundaryCheckIndex !== -1) {
                nextPartEffectiveBoundaryIndex = finalBoundaryCheckIndex;
                isFinalPart = true;
            } else if (streamEnded) {
                nextPartEffectiveBoundaryIndex = accumulatedDataBuffer.length;
            } else {
                accumulatedDataBuffer = accumulatedDataBuffer.slice(partBoundaryStartIndex);
                break;
            }
        }
        const contentEndIndex = isFinalPart ? nextPartEffectiveBoundaryIndex : nextPartEffectiveBoundaryIndex - 2;
        if (contentEndIndex < contentStartIndex) {
            console.error("ContentEndIndex calculated before contentStartIndex.");
            accumulatedDataBuffer = accumulatedDataBuffer.slice(partBoundaryStartIndex + boundaryBuffer.length);
            currentSearchOffset = 0;
            continue;
        }
        const contentBodyBuffer = accumulatedDataBuffer.slice(contentStartIndex, contentEndIndex);
        processPartData(headers, contentBodyBuffer);
        accumulatedDataBuffer = accumulatedDataBuffer.slice(nextPartEffectiveBoundaryIndex);
        currentSearchOffset = 0;
        if (isFinalPart) {
            if (accumulatedDataBuffer.equals(finalBoundaryBuffer) || accumulatedDataBuffer.equals(finalBoundaryWithCRLFBuffer)) {
                 accumulatedDataBuffer = Buffer.alloc(0);
            }
            allPartsProcessed = true; 
            break;
        } else if (streamEnded && accumulatedDataBuffer.length === 0) {
            allPartsProcessed = true;
            break;
        }
      }
    }

    function parseHeaders(headerString) {
      const headers = {};
      headerString.split('\r\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts.shift().trim();
          const value = parts.join(':').trim();
          headers[key] = value;
        }
      });
      return headers;
    }

    function processPartData(headers, contentBuffer) {
      const partContentType = headers['Content-Type'];
      // Remove per-part processing logs
      if (partContentType === 'application/json') {
        let jsonData;
        try {
          jsonData = JSON.parse(contentBuffer.toString('utf-8'));
        } catch (err) {
          console.error('Error parsing JSON part:', err, contentBuffer.toString('utf-8'));
          return;
        }
        let responsePayload;
        if (jsonData.status === 'complete') {
            responsePayload = { 
              status: 'complete', 
              message: jsonData.message || 'All files generated.',
              glbFile: jsonData.glbFile || (glbFileName ? path.basename(glbFileName) : null)
            };
            if (glbFileName) ModelMetadataUtil.updateModelMetadata(glbFileName, { status: 'complete' }); 
        } else if (jsonData.status === 'progress' && jsonData.step) {
            responsePayload = { status: 'progress', step: jsonData.step, message: jsonData.message };
            let internalStatus = 'processing';
            const stepLower = jsonData.step.toLowerCase();
            if (stepLower.includes("preprocess")) {
              internalStatus = 'preprocessing';
            }
            else if (stepLower.includes("rendering video")) {
              internalStatus = 'rendering_video';
            }
            else if (stepLower.includes("generating glb")) {
              internalStatus = 'generating_model';
            }
            if (glbFileName) ModelMetadataUtil.updateModelMetadata(glbFileName, { status: internalStatus });
        } else if (jsonData.status === 'error') {
            responsePayload = { 
              status: 'error', 
              step: jsonData.step || 'error',
              message: jsonData.message || 'An error occurred during processing' 
            };
            if (glbFileName) ModelMetadataUtil.updateModelMetadata(glbFileName, { 
              status: 'error',
              error: jsonData.message || 'An error occurred during processing'
            });
        } else {
            return; 
        }
        if (responsePayload && !clientDisconnected && !allPartsProcessed) {
            console.log(`[SEND] application/json: ${JSON.stringify(responsePayload)}`);
            res.write(`--${boundary}\r\n`);
            res.write(`Content-Type: application/json\r\n\r\n`);
            res.write(JSON.stringify(responsePayload));
            res.write('\r\n');
        }

      } else if (partContentType === 'video/mp4') {
        // Get video filename from headers, but use our own naming convention
        let videoExtension = '.mp4';
        let partFileName = null;
        if (headers['Content-Disposition']) {
          const filenameMatch = headers['Content-Disposition'].match(/filename="([^"]+)"/);
          if (filenameMatch && filenameMatch[1]) {
            partFileName = filenameMatch[1];
            const partExtension = path.extname(partFileName);
            if (partExtension) {
              videoExtension = partExtension;
            }
          }
        }
        videoFileName = `${outputBase}-preview${videoExtension}`;
        const outputPath = path.join(CONFIG.DIRECTORIES.ASSET_VIDEOS, videoFileName);
        fs.writeFileSync(outputPath, contentBuffer);
        if (glbFileName) {
          ModelMetadataUtil.updateModelMetadata(glbFileName, {
            status: 'video_saved',
            video: { file: videoFileName, path: `/assets/asset_videos/${videoFileName}` }
          }).catch(err => console.error('Error updating metadata with video info:', err));
        }
        // Send message to client about video saved
        const videoSavedPayload = { status: 'action', step: 'video saved', message: videoFileName, modelId: glbFileName };
        console.log(`[SEND] application/json: ${JSON.stringify(videoSavedPayload)}`);
        res.write(`--${boundary}\r\n`);
        res.write(`Content-Type: application/json\r\n\r\n`);
        res.write(JSON.stringify(videoSavedPayload));
        res.write('\r\n');
      } else if (partContentType === 'application/octet-stream' || (partContentType && partContentType.includes('model/gltf'))) {
        const outputPath = glbFilePath;
        fs.writeFileSync(outputPath, contentBuffer);
        ModelMetadataUtil.updateModelMetadata(glbFileName, {
          status: 'model_saved', 
          modelFile: glbFileName, modelPath: `/assets/3d_models/${glbFileName}`
        }).catch(err => console.error('Error updating metadata with model info:', err));
        // Send message to client about GLB saved
        const glbSavedPayload = { status: 'action', step: 'glb saved', message: glbFileName, modelId: glbFileName };
        console.log(`[SEND] application/json: ${JSON.stringify(glbSavedPayload)}`);
        res.write(`--${boundary}\r\n`);
        res.write(`Content-Type: application/json\r\n\r\n`);
        res.write(JSON.stringify(glbSavedPayload));
        res.write('\r\n');
      } else {
        console.log(`Skipping part with unhandled Content-Type ${partContentType}`);
      }
    }

    async function finalizeRequest() {
      if (clientDisconnected && !allPartsProcessed) {
         console.log("Client disconnected before all parts processed, but finalizing anyway.");
      }

      if (glbFilePath && fs.existsSync(glbFilePath)) {
        try {
          thumbnailInfo = await generateThumbnailForModel(glbFilePath, glbFileName);
          if (thumbnailInfo) {
          } else {
            console.error('Thumbnail generation returned null.');
          }
        } catch (thumbnailError) {
          console.error(`Error generating thumbnail: ${thumbnailError.message}`);
        }
      } else {
        console.error(`Cannot generate thumbnail - GLB file does not exist or path incorrect: ${glbFilePath}`);
      }
      
      if (glbFileName) {
        const finalMetadataUpdate = {
          status: 'complete', 
          completed: Date.now()
        };
        if (videoFileName) { 
          finalMetadataUpdate.video = { file: videoFileName, path: `/assets/asset_videos/${videoFileName}` };
        }
        if (thumbnailInfo) {
          finalMetadataUpdate.icon = { file: thumbnailInfo.filename, path: `/assets/3d_model_icons/${thumbnailInfo.filename}` };
        }
        await ModelMetadataUtil.updateModelMetadata(glbFileName, finalMetadataUpdate);
        console.log(`Final metadata updated for model: ${glbFileName}`);
      }
      
      if (!clientDisconnected && !res.writableEnded) {
          if (allPartsProcessed && accumulatedDataBuffer.length === 0) { 
            res.write(`--${boundary}--\r\n`);
            res.end();
          } else {
            console.warn("Finalizing request with potentially incomplete data or stream errors. Accumulated buffer size:", accumulatedDataBuffer.length);
            if (!res.headersSent) { 
                res.status(503).json({status: 'error', message: 'Processing incomplete or stream error.'});
            } else {
                res.write(`--${boundary}\r\n`);
                res.write(`Content-Type: application/json\r\n\r\n`);
                res.write(JSON.stringify({ status: 'error', message: 'Processing did not complete fully or stream error.' }));
                res.write('\r\n');
                res.write(`--${boundary}--\r\n`);
                res.end();
            }
          }
      } else if (clientDisconnected) {
        console.log("Client was disconnected, no final response sent to client.");
      } else if (res.writableEnded) {
        console.log("Response stream already ended during finalization.");
      }
    }

  } catch (error) {
    console.error('Error processing image with Trellis:', error.message);
    if (error.response) {
      console.error('Trellis Error Response Data:', error.response.data ? Buffer.from(error.response.data).toString() : 'No data');
      console.error('Trellis Error Response Status:', error.response.status);
    } else if (error.request) {
      console.error('Trellis No Response Received:', error.request);
    }
    
    let clientErrorMessage = 'Error processing image. External service may be unavailable.';
    if (error.response && error.response.status) {
        clientErrorMessage += ` (Service status: ${error.response.status})`;
    } else if (error.code) {
         clientErrorMessage += ` (Code: ${error.code})`;
    }

    if (!res.headersSent) {
      res.status(500).json({ 
        status: 'error', 
        message: clientErrorMessage + ' ' + error.message 
      });
    } else if (!res.writableEnded) {
        try {
            const tempBoundary = "errorBoundary"; 
            res.write(`--${tempBoundary}\r\n`);
            res.write(`Content-Type: application/json\r\n\r\n`);
            res.write(JSON.stringify({ status: 'error', message: clientErrorMessage + ' ' + error.message }));
            res.write('\r\n');
            res.write(`--${tempBoundary}--\r\n`);
            res.end();
        } catch (e) { console.error("Error sending error part during catch:", e); res.end(); }
    }
  }
}, handleMulterError);

module.exports = router;
