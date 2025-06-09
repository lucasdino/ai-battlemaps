export const parseDungeonGridToAssets = (dungeonGrid, defaultAssetsMap = new Map(), options = {}) => {
  const {
    cellSize = 1,
    floorHeight = 0.3,
    terrainId = 'dungeon',
  } = options;

  if (!Array.isArray(dungeonGrid)) {
    console.warn('parseDungeonGridToAssets: dungeonGrid is not an array');
    return [];
  }

  const assets = [];

  const rows = dungeonGrid.length;
  const cols = dungeonGrid[0]?.length || 0;

  // Helper to generate a unique asset instance ID
  const makeInstanceId = (baseId, row, col) => `${baseId}-${row}-${col}`;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellRaw = dungeonGrid[row][col];
      const cell = String(cellRaw); // Cast to string for safe comparisons

      // Skip floors (0, 1, 2) – assets only for IDs
      // 0 => empty, 1 => floor, 2 => wall (handled separately)
      if (cell === '0' || cell === '1' || cell === '2') continue;

      const assetMeta = defaultAssetsMap.get(cell);
      if (!assetMeta) {
        console.warn(`Asset id ${cell} not found in defaultAssetsMap`);
        continue;
      }

      // Calculate world position (centered around origin)
      const x = (col - cols / 2 + 0.5) * cellSize;
      const z = (row - rows / 2 + 0.5) * cellSize;
      const y = floorHeight; // place asset on top of floor

      const assetInstance = {
        id: makeInstanceId(cell, row, col),
        modelUrl: `/${assetMeta.modelPath.startsWith('/') ? assetMeta.modelPath.slice(1) : assetMeta.modelPath}`,
        name: assetMeta.name || cell,
        position: { x, y, z },
        rotation: assetMeta.defaultRotation || { x: 0, y: 0, z: 0 },
        scale: assetMeta.defaultScale || { x: 1, y: 1, z: 1 },
      };

      assets.push(assetInstance);
    }
  }

  return assets;
}; 