import CONFIG from '../config';

// Format filename without extension
export const formatFileName = (fileName) => {
  return fileName.replace(/\.glb$/i, '').replace(/_[a-f0-9]{8}$/i, '');
};

// Get URL for model
export const getModelUrl = (asset) => {
  const modelId = asset.id || asset.name;
  const url = `${CONFIG.API.BASE_URL}/${CONFIG.API.ASSET_PATHS.MODELS}/${modelId}`;
  return url;
};

// Process and normalize asset data
export const processAssetData = (asset) => {
  // Ensure icon paths are properly formatted
  let thumbnailUrl = asset.icon;
  if (thumbnailUrl && !thumbnailUrl.startsWith('http') && !thumbnailUrl.startsWith('/')) {
    thumbnailUrl = `/${thumbnailUrl}`;
  }
  
  // Ensure video paths are properly formatted
  let videoUrl = asset.video?.path || asset.video;
  if (videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('/')) {
    videoUrl = `/${videoUrl}`;
  }
  
  // Ensure we're not using asset_videos paths for icons
  if (thumbnailUrl && thumbnailUrl.includes('asset_videos')) {
    console.warn(`Found asset_videos in icon path: ${thumbnailUrl} - clearing it`);
    thumbnailUrl = null;
  }
  
  return {
    ...asset,
    id: asset.id || asset.name,
    displayName: asset.displayName || formatFileName(asset.name || asset.id),
    thumbnailUrl: thumbnailUrl,
    videoUrl: videoUrl,
    creationDate: asset.created
  };
};

// Validate if asset has required GLB file
export const isValidAsset = (asset) => {
  const hasGlbFile = asset.id?.toLowerCase().endsWith('.glb') || 
                    asset.modelFile || 
                    asset.modelPath?.includes('.glb');
  
  if (!hasGlbFile) {
    console.warn(`Excluding invalid asset without GLB file:`, asset);
  }
  
  return hasGlbFile;
};

// Format video mapping entries
export const formatVideoMapping = (videoMapping) => {
  const formattedMapping = {};
  
  // Process each video mapping entry
  Object.entries(videoMapping).forEach(([modelId, videoPath]) => {
    // Make sure the path starts with a slash
    let normalizedPath = videoPath;
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`;
    }
    
    // Make sure we're using asset_videos path
    if (!normalizedPath.includes('asset_videos')) {
      const filename = normalizedPath.split('/').pop();
      if (filename) {
        normalizedPath = `/assets/asset_videos/${filename}`;
      }
    }
    
    // Store the normalized path
    formattedMapping[modelId] = normalizedPath;
  });
  
  return formattedMapping;
}; 