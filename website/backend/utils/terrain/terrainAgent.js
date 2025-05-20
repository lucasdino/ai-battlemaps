// TerrainAgent: Maps natural language descriptions to terrain parameters

const EXAMPLES = [
  {
    description: 'A lush green valley with gentle hills and a river',
    params: {
      colorSand: '#e2c290',
      colorGrass: '#6bbf59',
      colorSnow: '#ffffff',
      colorRock: '#8d8d7a',
      noiseIterations: 2,
      positionFrequency: 0.12,
      warpFrequency: 2,
      warpStrength: 0.5,
      strength: 3,
    }
  },
  {
    description: 'A snowy mountain range with sharp peaks',
    params: {
      colorSand: '#e0e0e0',
      colorGrass: '#b0c4b1',
      colorSnow: '#f8f8ff',
      colorRock: '#b0b0b0',
      noiseIterations: 5,
      positionFrequency: 0.22,
      warpFrequency: 7,
      warpStrength: 1.2,
      strength: 8,
    }
  },
  {
    description: 'A dry desert with rolling dunes',
    params: {
      colorSand: '#ffe894',
      colorGrass: '#e2c290',
      colorSnow: '#fffbe0',
      colorRock: '#bfbd8d',
      noiseIterations: 1,
      positionFrequency: 0.08,
      warpFrequency: 1,
      warpStrength: 0.2,
      strength: 2,
    }
  },
  {
    description: 'A rocky canyon with steep cliffs',
    params: {
      colorSand: '#c2b280',
      colorGrass: '#bfa76f',
      colorSnow: '#e0e0e0',
      colorRock: '#7a5c2e',
      noiseIterations: 3,
      positionFrequency: 0.18,
      warpFrequency: 4,
      warpStrength: 0.8,
      strength: 6,
    }
  },
  {
    description: 'A tropical island with palm trees and beaches',
    params: {
      colorSand: '#ffe894',
      colorGrass: '#85d534',
      colorSnow: '#ffffff',
      colorRock: '#bfbd8d',
      noiseIterations: 2,
      positionFrequency: 0.13,
      warpFrequency: 2,
      warpStrength: 0.4,
      strength: 3,
    }
  },
  {
    description: 'A windswept arctic tundra',
    params: {
      colorSand: '#e0e0e0',
      colorGrass: '#b0c4b1',
      colorSnow: '#f8f8ff',
      colorRock: '#b0b0b0',
      noiseIterations: 2,
      positionFrequency: 0.10,
      warpFrequency: 2,
      warpStrength: 0.3,
      strength: 2,
    }
  },
  {
    description: 'A dense forest with mossy ground',
    params: {
      colorSand: '#bfa76f',
      colorGrass: '#2d5a27',
      colorSnow: '#e0e0e0',
      colorRock: '#6b5c3e',
      noiseIterations: 2,
      positionFrequency: 0.11,
      warpFrequency: 2,
      warpStrength: 0.3,
      strength: 2,
    }
  },
  {
    description: 'A volcanic landscape with black rocks',
    params: {
      colorSand: '#3a2c1a',
      colorGrass: '#4a3b2a',
      colorSnow: '#e0e0e0',
      colorRock: '#2d2d2d',
      noiseIterations: 4,
      positionFrequency: 0.19,
      warpFrequency: 6,
      warpStrength: 1.0,
      strength: 7,
    }
  }
];

function similarity(a, b) {
  // Simple similarity: count shared words
  const wa = a.toLowerCase().split(/\W+/);
  const wb = b.toLowerCase().split(/\W+/);
  return wa.filter(w => wb.includes(w)).length;
}

function getTerrainParams(description) {
  // Find the most similar example
  let best = EXAMPLES[0];
  let bestScore = similarity(description, EXAMPLES[0].description);
  for (let i = 1; i < EXAMPLES.length; ++i) {
    const score = similarity(description, EXAMPLES[i].description);
    if (score > bestScore) {
      best = EXAMPLES[i];
      bestScore = score;
    }
  }
  return best.params;
}

module.exports = { getTerrainParams }; 