// Constants for asset display and pagination
export const ASSETS_PER_PAGE = 9; // Number of assets to display per page

// Constants for grid item dimensions (including gap)
export const GRID_ITEM_HEIGHT = 110; // Base height of each grid item (matching styles.assetItem.height)
export const GRID_ITEM_WIDTH = 120;  // Base width of each grid item (matching styles)
export const GRID_GAP = 12; // Gap between items (matching styles)
export const RESERVED_HEIGHT = 160; // Space reserved for header, pagination, and buttons (matching styles.assetListContainer.maxHeight)

// Generation steps for progress tracking
export const GENERATION_STEPS = [
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'rendering_video', label: 'Rendering Video' },
  { id: 'generating_model', label: 'Generating 3D Asset' }
];

export const PROGRESS_STEPS = [
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'rendering_video', label: 'Rendering Video' },
  { id: 'generating_model', label: 'Generating 3D Asset' }
];

export const MAJOR_STEPS = [
  { id: 'preprocessing', label: 'Preprocessing', count: 1 },
  { id: 'rendering_video', label: 'Rendering Video', count: 2 },
  { id: 'generating_model', label: 'Generating GLB', count: 2 },
]; 