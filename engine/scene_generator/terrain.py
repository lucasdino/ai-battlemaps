from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from pathlib import Path
import json
import logging
from .utils import generate_noise, blend_noise, normalize_array

logger = logging.getLogger(__name__)

@dataclass
class TerrainType:
    """Template for a terrain type with generation properties"""
    name: str
    description: str
    elevation_range: Tuple[float, float]
    moisture_range: Tuple[float, float]
    noise_scales: List[float]
    noise_weights: List[float]
    noise_octaves: List[int]
    noise_persistence: List[float]
    noise_lacunarity: List[float]
    blend_radius: float = 5.0
    style_tags: List[str] = None

class TerrainGenerator:
    """Handles terrain generation with multiple layers"""
    
    def __init__(self):
        """Initialize terrain generator"""
        self.terrain_types: Dict[str, TerrainType] = {}
        self._load_default_terrain_types()
    
    def _load_default_terrain_types(self):
        """Load default terrain types"""
        default_terrain = {
            'mountain': TerrainType(
                name='mountain',
                description='Steep rocky mountains with sharp peaks',
                elevation_range=(0.7, 1.0),
                moisture_range=(0.1, 0.5),
                noise_scales=[100.0, 50.0, 25.0],
                noise_weights=[0.5, 0.3, 0.2],
                noise_octaves=[6, 4, 3],
                noise_persistence=[0.5, 0.4, 0.3],
                noise_lacunarity=[2.0, 2.2, 2.4],
                blend_radius=8.0,
                style_tags=['rocky', 'steep', 'high']
            ),
            'hill': TerrainType(
                name='hill',
                description='Rolling hills with gentle slopes',
                elevation_range=(0.4, 0.7),
                moisture_range=(0.2, 0.6),
                noise_scales=[80.0, 40.0, 20.0],
                noise_weights=[0.4, 0.4, 0.2],
                noise_octaves=[5, 4, 3],
                noise_persistence=[0.4, 0.4, 0.3],
                noise_lacunarity=[2.0, 2.0, 2.0],
                blend_radius=6.0,
                style_tags=['rolling', 'gentle', 'medium']
            ),
            'plain': TerrainType(
                name='plain',
                description='Flat plains with slight undulations',
                elevation_range=(0.2, 0.4),
                moisture_range=(0.3, 0.7),
                noise_scales=[120.0, 60.0, 30.0],
                noise_weights=[0.3, 0.4, 0.3],
                noise_octaves=[4, 4, 4],
                noise_persistence=[0.3, 0.3, 0.3],
                noise_lacunarity=[1.8, 1.8, 1.8],
                blend_radius=4.0,
                style_tags=['flat', 'open', 'low']
            ),
            'swamp': TerrainType(
                name='swamp',
                description='Low-lying wetlands with scattered pools',
                elevation_range=(0.1, 0.3),
                moisture_range=(0.7, 1.0),
                noise_scales=[60.0, 30.0, 15.0],
                noise_weights=[0.2, 0.3, 0.5],
                noise_octaves=[3, 4, 5],
                noise_persistence=[0.3, 0.4, 0.5],
                noise_lacunarity=[1.6, 1.8, 2.0],
                blend_radius=5.0,
                style_tags=['wet', 'low', 'dense']
            ),
            'valley': TerrainType(
                name='valley',
                description='Deep valleys with steep sides',
                elevation_range=(0.2, 0.5),
                moisture_range=(0.4, 0.8),
                noise_scales=[90.0, 45.0, 22.5],
                noise_weights=[0.4, 0.3, 0.3],
                noise_octaves=[5, 4, 3],
                noise_persistence=[0.4, 0.3, 0.3],
                noise_lacunarity=[2.2, 2.0, 1.8],
                blend_radius=7.0,
                style_tags=['deep', 'narrow', 'medium']
            )
        }
        
        for terrain in default_terrain.values():
            self.add_terrain_type(terrain)
    
    def add_terrain_type(self, terrain_type: TerrainType):
        """Add a new terrain type"""
        self.terrain_types[terrain_type.name] = terrain_type
    
    def get_terrain_type(self, name: str) -> Optional[TerrainType]:
        """Get terrain type by name"""
        return self.terrain_types.get(name)
    
    def generate_terrain(
        self,
        shape: Tuple[int, int],
        terrain_type: TerrainType,
        seed: Optional[int] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Generate terrain and moisture maps for given type"""
        if seed is not None:
            np.random.seed(seed)
        
        # Generate base elevation
        elevation = np.zeros(shape)
        for scale, weight, octaves, persistence, lacunarity in zip(
            terrain_type.noise_scales,
            terrain_type.noise_weights,
            terrain_type.noise_octaves,
            terrain_type.noise_persistence,
            terrain_type.noise_lacunarity
        ):
            noise = generate_noise(
                shape,
                scale=scale,
                octaves=octaves,
                persistence=persistence,
                lacunarity=lacunarity,
                seed=seed,
                noise_type='perlin'
            )
            elevation += noise * weight
        
        # Normalize elevation
        elevation = normalize_array(elevation)
        
        # Scale to terrain type's elevation range
        min_elev, max_elev = terrain_type.elevation_range
        elevation = min_elev + elevation * (max_elev - min_elev)
        
        # Generate moisture map with different seed if provided
        moisture_seed = seed + 1 if seed is not None else None
        moisture = generate_noise(
            shape,
            scale=50.0,
            octaves=4,
            persistence=0.4,
            lacunarity=2.0,
            seed=moisture_seed,
            noise_type='simplex'
        )
        
        # Normalize moisture
        moisture = normalize_array(moisture)
        
        # Scale to terrain type's moisture range
        min_moist, max_moist = terrain_type.moisture_range
        moisture = min_moist + moisture * (max_moist - min_moist)
        
        # Apply elevation influence on moisture
        moisture = moisture * (1 - 0.5 * elevation)
        
        return elevation, moisture
    
    def blend_terrain(
        self,
        elevation1: np.ndarray,
        moisture1: np.ndarray,
        elevation2: np.ndarray,
        moisture2: np.ndarray,
        blend_map: np.ndarray,
        radius: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Blend two terrain types with smooth transition"""
        # Create distance field for blending
        from scipy.ndimage import gaussian_filter
        blend_map = gaussian_filter(blend_map, sigma=radius)
        
        # Blend elevation and moisture
        elevation = elevation1 * (1 - blend_map) + elevation2 * blend_map
        moisture = moisture1 * (1 - blend_map) + moisture2 * blend_map
        
        return elevation, moisture
    
    def save_terrain_types(self, path: Path):
        """Save terrain types to file"""
        data = {
            name: {
                'name': terrain.name,
                'description': terrain.description,
                'elevation_range': terrain.elevation_range,
                'moisture_range': terrain.moisture_range,
                'noise_scales': terrain.noise_scales,
                'noise_weights': terrain.noise_weights,
                'noise_octaves': terrain.noise_octaves,
                'noise_persistence': terrain.noise_persistence,
                'noise_lacunarity': terrain.noise_lacunarity,
                'blend_radius': terrain.blend_radius,
                'style_tags': terrain.style_tags
            }
            for name, terrain in self.terrain_types.items()
        }
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load_terrain_types(self, path: Path):
        """Load terrain types from file"""
        with open(path, 'r') as f:
            data = json.load(f)
        
        for name, terrain_data in data.items():
            terrain = TerrainType(
                name=terrain_data['name'],
                description=terrain_data['description'],
                elevation_range=tuple(terrain_data['elevation_range']),
                moisture_range=tuple(terrain_data['moisture_range']),
                noise_scales=terrain_data['noise_scales'],
                noise_weights=terrain_data['noise_weights'],
                noise_octaves=terrain_data['noise_octaves'],
                noise_persistence=terrain_data['noise_persistence'],
                noise_lacunarity=terrain_data['noise_lacunarity'],
                blend_radius=terrain_data['blend_radius'],
                style_tags=terrain_data['style_tags']
            )
            self.add_terrain_type(terrain) 