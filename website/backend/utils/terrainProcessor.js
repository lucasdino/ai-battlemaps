/**
 * Terrain processing utility for converting images to flat GLB planes
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class TerrainProcessor {
  
  /**
   * Process an image into a flat GLB plane
   * @param {string} imagePath - Path to the source image
   * @param {string} outputPath - Path where the GLB file should be saved
   * @param {object} options - Processing options
   * @returns {Promise<boolean>} - Success status
   */
  static async processImageToGLB(imagePath, outputPath, options = {}) {
    try {
      const {
        width = 10,      // Width of the plane in 3D units
        height = 10,     // Height of the plane in 3D units
        depth = 0.1      // Small height/thickness of the terrain
      } = options;

      // Get image dimensions to maintain aspect ratio
      const imageMetadata = await sharp(imagePath).metadata();
      const imageWidth = imageMetadata.width;
      const imageHeight = imageMetadata.height;
      const aspectRatio = imageWidth / imageHeight;

      // Adjust plane dimensions to match image aspect ratio
      let planeWidth = width;
      let planeHeight = height;
      
      if (aspectRatio > 1) {
        // Image is wider than tall
        planeHeight = width / aspectRatio;
      } else {
        // Image is taller than wide
        planeWidth = height * aspectRatio;
      }

      // Process the image to optimize it for GLB embedding
      // Keep it at reasonable size but good quality for terrain texture
      const processedImageBuffer = await sharp(imagePath)
        .resize(1024, 1024, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Create the GLB content with the processed image embedded
      const glbContent = this.createTerrainGLB(processedImageBuffer, planeWidth, planeHeight, depth);
      
      // Write the GLB file
      fs.writeFileSync(outputPath, glbContent);
      
      return true;
    } catch (error) {
      console.error('Error processing terrain:', error);
      return false;
    }
  }

  /**
   * Create a simple GLB file with a textured plane
   * @param {Buffer} imageBuffer - Processed image buffer
   * @param {number} width - Width of the plane
   * @param {number} height - Height of the plane  
   * @param {number} depth - Depth/thickness of the plane
   * @returns {Buffer} - GLB file content
   */
  static createTerrainGLB(imageBuffer, width, height, depth) {
    const halfW = width / 2;
    const halfH = height / 2;

    // Vertex data: Y coordinates adjusted
    // Top face Y = 0
    // Bottom face Y = -depth
    const vertices = new Float32Array([
      // Top face (Y = 0)
      -halfW,  0, -halfH,  // 0
       halfW,  0, -halfH,  // 1
       halfW,  0,  halfH,  // 2
      -halfW,  0,  halfH,  // 3

      // Bottom face (Y = -depth)
      -halfW, -depth, -halfH,  // 4
       halfW, -depth, -halfH,  // 5
       halfW, -depth,  halfH,  // 6
      -halfW, -depth,  halfH,  // 7

      // Front face (Z = -halfH)
      -halfW,  0, -halfH,  // 8 (Top-left-front)
       halfW,  0, -halfH,  // 9 (Top-right-front)
       halfW, -depth, -halfH,  // 10 (Bottom-right-front)
      -halfW, -depth, -halfH,  // 11 (Bottom-left-front)
      
      // Back face (Z = +halfH)
      -halfW,  0,  halfH,  // 12 (Top-left-back)
       halfW,  0,  halfH,  // 13 (Top-right-back)
       halfW, -depth,  halfH,  // 14 (Bottom-right-back)
      -halfW, -depth,  halfH,  // 15 (Bottom-left-back)

      // Right face (X = +halfW)
       halfW,  0, -halfH,  // 16 (Top-right-front)
       halfW,  0,  halfH,  // 17 (Top-right-back)
       halfW, -depth,  halfH,  // 18 (Bottom-right-back)
       halfW, -depth, -halfH,  // 19 (Bottom-right-front)

      // Left face (X = -halfW)
      -halfW,  0, -halfH,  // 20 (Top-left-front)
      -halfW,  0,  halfH,  // 21 (Top-left-back)
      -halfW, -depth,  halfH,  // 22 (Bottom-left-back)
      -halfW, -depth, -halfH,  // 23 (Bottom-left-front)
    ]);

    const normals = new Float32Array([
      // Top face (0, 1, 0)
      0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
      // Bottom face (0, -1, 0)
      0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
      // Front face (0, 0, -1)
      0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
      // Back face (0, 0, 1)
      0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
      // Right face (1, 0, 0)
      1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
      // Left face (-1, 0, 0)
     -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0,
    ]);

    const uvs = new Float32Array([
      // Top face (texture mapped)
      0, 1,  // 0 
      1, 1,  // 1
      1, 0,  // 2
      0, 0,  // 3
      // Bottom, Front, Back, Right, Left faces (all UVs at 0,0)
      0,0, 0,0, 0,0, 0,0, // Bottom (4-7)
      0,0, 0,0, 0,0, 0,0, // Front (8-11)
      0,0, 0,0, 0,0, 0,0, // Back (12-15)
      0,0, 0,0, 0,0, 0,0, // Right (16-19)
      0,0, 0,0, 0,0, 0,0, // Left (20-23)
    ]);

    // Indices (winding order corrected previously)
    const indices = new Uint16Array([
         0, 2, 1,   0, 3, 2,    // Top
         4, 6, 7,   4, 5, 6,    // Bottom
         8, 10,11,  8, 9, 10,   // Front
        12, 14,13, 12, 15,14,   // Back
        16, 18,19, 16, 17,18,   // Right
        20, 22,21, 20, 23,22,   // Left
    ]);
    
    const textureMimeType = 'image/jpeg';

    // --- Prepare binary buffers ---
    const verticesBin = Buffer.from(vertices.buffer);
    const normalsBin = Buffer.from(normals.buffer);
    const uvsBin = Buffer.from(uvs.buffer);
    const indicesBin = Buffer.from(indices.buffer);
    const imageBin = imageBuffer; // This is already a Buffer

    // --- Calculate byte offsets and define bufferViews for a single combined buffer ---
    let currentOffset = 0;
    const bufferViewsData = [];

    // BufferView 0: Positions
    bufferViewsData.push({
      buffer: 0, byteOffset: currentOffset, byteLength: verticesBin.length, target: 34962 // ARRAY_BUFFER
    });
    currentOffset += verticesBin.length;

    // BufferView 1: Normals
    bufferViewsData.push({
      buffer: 0, byteOffset: currentOffset, byteLength: normalsBin.length, target: 34962 // ARRAY_BUFFER
    });
    currentOffset += normalsBin.length;

    // BufferView 2: UVs
    bufferViewsData.push({
      buffer: 0, byteOffset: currentOffset, byteLength: uvsBin.length, target: 34962 // ARRAY_BUFFER
    });
    currentOffset += uvsBin.length;
    
    // BufferView 3: Indices
    bufferViewsData.push({
      buffer: 0, byteOffset: currentOffset, byteLength: indicesBin.length, target: 34963 // ELEMENT_ARRAY_BUFFER
    });
    currentOffset += indicesBin.length;

    // BufferView 4: Image data
    bufferViewsData.push({
      buffer: 0, byteOffset: currentOffset, byteLength: imageBin.length
      // No target for image data bufferView
    });
    currentOffset += imageBin.length;
    
    const totalBinaryDataLength = currentOffset;

    const gltf = {
      asset: { generator: "AI Battlemaps Terrain Generator", version: "2.0" },
      scene: 0,
      scenes: [ { nodes: [0] } ],
      nodes: [ { mesh: 0, name: "TerrainSolidBox" } ],
      meshes: [ {
        primitives: [ {
          attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, // Accessor indices
          indices: 3, // Accessor index for indices
          material: 0,
          mode: 4 // TRIANGLES
        } ]
      } ],
      materials: [ {
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 }, // Texture index
          metallicFactor: 0.0,
          roughnessFactor: 1.0
        },
        name: "TerrainMaterial",
        doubleSided: false,
        alphaMode: "OPAQUE"
      } ],
      textures: [ { source: 0, sampler: 0 } ], // Image index, Sampler index
      samplers: [ { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 } ], // LINEAR, LINEAR_MIPMAP_LINEAR, REPEAT
      images: [ { mimeType: textureMimeType, bufferView: 4 } ], // BufferView index for image (now 4)
      accessors: [
        { // 0: POSITION
          bufferView: 0, // BufferView index for positions
          componentType: 5126, count: 24, type: "VEC3", // FLOAT
          max: [ halfW,  0,  halfH], min: [-halfW, -depth, -halfH] // Adjusted Y min/max
        },
        { // 1: NORMAL
          bufferView: 1, // BufferView index for normals
          componentType: 5126, count: 24, type: "VEC3" // FLOAT
        },
        { // 2: TEXCOORD_0 (UVs)
          bufferView: 2, // BufferView index for UVs
          componentType: 5126, count: 24, type: "VEC2" // FLOAT
        },
        { // 3: INDICES
          bufferView: 3, // BufferView index for indices
          componentType: 5123, count: indices.length, type: "SCALAR" // UNSIGNED_SHORT
        }
      ],
      bufferViews: bufferViewsData,
      buffers: [
        // Single buffer entry representing the entire BIN chunk
        { byteLength: totalBinaryDataLength } // This length will be updated after padding the combined binary
      ]
    };

    // --- GLB Packaging --- 
    // Combine all binary data into a single buffer
    const combinedBinaryData = Buffer.concat([
        verticesBin,
        normalsBin,
        uvsBin,
        indicesBin,
        imageBin
    ]);

    // Ensure the combined length matches calculation
    if (combinedBinaryData.length !== totalBinaryDataLength) {
        console.error("Mismatch in combined binary data length calculation!");
        // Handle error appropriately, though this should not happen if offsets are correct
    }
    
    // Pad the combined binary data to be 4-byte aligned for the BIN chunk
    const binaryPaddingLength = (4 - (combinedBinaryData.length % 4)) % 4;
    const paddedCombinedBinaryData = Buffer.concat([
        combinedBinaryData,
        Buffer.alloc(binaryPaddingLength, 0)
    ]);

    // Update the single buffer's byteLength in GLTF JSON to the padded length
    gltf.buffers[0].byteLength = paddedCombinedBinaryData.length;

    // JSON Chunk
    const gltfJson = JSON.stringify(gltf);
    const gltfJsonBuffer = Buffer.from(gltfJson, 'utf8');
    const jsonPaddingLength = (4 - (gltfJsonBuffer.length % 4)) % 4;
    const paddedJsonBuffer = Buffer.concat([
        gltfJsonBuffer,
        Buffer.alloc(jsonPaddingLength, 0x20) // Pad with spaces
    ]);

    // BIN Chunk Data is already prepared as paddedCombinedBinaryData

    // GLB Header
    const totalLength = 12 + (8 + paddedJsonBuffer.length) + (8 + paddedCombinedBinaryData.length);
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546C67, 0); // 'glTF'
    header.writeUInt32LE(2, 4);          // version 2
    header.writeUInt32LE(totalLength, 8);

    // JSON Chunk Header
    const jsonChunkHeader = Buffer.alloc(8);
    jsonChunkHeader.writeUInt32LE(paddedJsonBuffer.length, 0);
    jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

    // Binary Chunk Header
    const binaryChunkHeader = Buffer.alloc(8);
    binaryChunkHeader.writeUInt32LE(paddedCombinedBinaryData.length, 0);
    binaryChunkHeader.writeUInt32LE(0x004E4942, 4); // 'BIN ' (but typically written as 'BIN ')

    return Buffer.concat([
        header,
        jsonChunkHeader, paddedJsonBuffer,
        binaryChunkHeader, paddedCombinedBinaryData
    ]);
  }

  /**
   * Generate a thumbnail for terrain
   * @param {string} imagePath - Path to the source image
   * @param {string} outputPath - Path where thumbnail should be saved
   * @param {object} options - Thumbnail options
   * @returns {Promise<boolean>} - Success status
   */
  static async generateThumbnail(imagePath, outputPath, options = {}) {
    try {
      const { size = 200, quality = 90 } = options;
      
      await sharp(imagePath)
        .resize(size, size, { fit: 'cover' })
        .png({ quality })
        .toFile(outputPath);
        
      return true;
    } catch (error) {
      console.error('Error generating terrain thumbnail:', error);
      return false;
    }
  }
}

module.exports = TerrainProcessor; 