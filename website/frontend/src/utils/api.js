import CONFIG from '../config';

// Generic API fetch function
export const fetchFromApi = async (endpoint, errorMsg, options = {}) => {
  try {
    const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`${errorMsg}:`, err);
    throw new Error(`${errorMsg}: ${err.message}`);
  }
};

// Upload file helper
export const uploadFile = async (file, endpoint) => {
  const formData = new FormData();
  formData.append('model', file);
  
  const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Upload failed: ${response.status}`);
  }
  
  return await response.json();
};

// Update model helper
export const updateModel = async (modelId, updateData) => {
  const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.MODELS.BASE}/${modelId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Update failed: ${response.status}`);
  }
  
  return await response.json();
}; 