from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from pathlib import Path
import json
import logging
from .utils import generate_noise, blend_noise, calculate_distance_field

logger = logging.getLogger(__name__)

@dataclass
class PropType:
    """Template for a prop type with placement properties"""
    name: str
    description: str
    elevation_range: Tuple[float, float]
    moisture_range: Tuple[float, float]
    sun_preference: float  # 0-1, where 0 is shade-loving and 1 is sun-loving
    cluster_size: Tuple[int, int]
    min_distance: float
    weight: float = 1.0
    noise_ratio: float = 0.5
    max_density: float = 0.1
    style_tags: List[str] = None

class PropPlacer:
    """Handles prop placement with environmental awareness"""
    
    def __init__(self):
        """Initialize prop placer"""
        self.prop_types: Dict[str, PropType] = {}
        self._load_default_props()
    
    def _load_default_props(self):
        """Load default prop types"""
        default_props = {
            'tree': PropType(
                name='tree',
                description='Large deciduous tree with spreading canopy',
                elevation_range=(0.2, 0.8),
                moisture_range=(0.3, 0.8),
                sun_preference=0.7,
                cluster_size=(3, 5),
                min_distance=2.0,
                weight=1.0,
                noise_ratio=0.4,
                max_density=0.15,
                style_tags=['natural', 'vegetation']
            ),
            'rock': PropType(
                name='rock',
                description='Large weathered rock formation',
                elevation_range=(0.1, 0.9),
                moisture_range=(0.1, 0.7),
                sun_preference=0.5,
                cluster_size=(2, 4),
                min_distance=1.5,
                weight=0.8,
                noise_ratio=0.3,
                max_density=0.1,
                style_tags=['natural', 'stone']
            ),
            'bush': PropType(
                name='bush',
                description='Dense shrubbery with small leaves',
                elevation_range=(0.1, 0.7),
                moisture_range=(0.2, 0.9),
                sun_preference=0.6,
                cluster_size=(2, 3),
                min_distance=1.0,
                weight=1.2,
                noise_ratio=0.5,
                max_density=0.2,
                style_tags=['natural', 'vegetation']
            ),
            'flower': PropType(
                name='flower',
                description='Colorful wildflowers in small patches',
                elevation_range=(0.2, 0.6),
                moisture_range=(0.3, 0.7),
                sun_preference=0.8,
                cluster_size=(1, 2),
                min_distance=0.5,
                weight=0.9,
                noise_ratio=0.6,
                max_density=0.25,
                style_tags=['natural', 'vegetation', 'colorful']
            ),
            'mushroom': PropType(
                name='mushroom',
                description='Clusters of small mushrooms',
                elevation_range=(0.1, 0.5),
                moisture_range=(0.5, 0.9),
                sun_preference=0.2,
                cluster_size=(1, 3),
                min_distance=0.8,
                weight=0.7,
                noise_ratio=0.7,
                max_density=0.15,
                style_tags=['natural', 'fungi']
            )
        }
        
        for prop in default_props.values():
            self.add_prop_type(prop)
    
    def add_prop_type(self, prop_type: PropType):
        """Add a new prop type"""
        self.prop_types[prop_type.name] = prop_type
    
    def get_prop_type(self, name: str) -> Optional[PropType]:
        """Get prop type by name"""
        return self.prop_types.get(name)
    
    def place_props(
        self,
        elevation_map: np.ndarray,
        moisture_map: np.ndarray,
        sun_map: np.ndarray,
        occupied_map: np.ndarray,
        prop_type: PropType,
        seed: Optional[int] = None
    ) -> Tuple[np.ndarray, List[Tuple[int, int]]]:
        """Place props of given type based on environmental conditions"""
        if seed is not None:
            np.random.seed(seed)
        
        # Generate noise for prop placement
        noise = generate_noise(
            elevation_map.shape,
            scale=20.0,
            octaves=4,
            persistence=0.5,
            lacunarity=2.0,
            seed=seed,
            noise_type='perlin'
        )
        
        # Blend with moisture-based noise
        moisture_seed = seed + 1 if seed is not None else None
        moisture_noise = generate_noise(
            elevation_map.shape,
            scale=15.0,
            octaves=3,
            persistence=0.4,
            lacunarity=1.8,
            seed=moisture_seed,
            noise_type='simplex'
        )
        
        noise = blend_noise(noise, moisture_noise, prop_type.noise_ratio)
        
        # Calculate environmental fit
        elevation_fit = np.clip(
            1 - np.abs(elevation_map - np.mean(prop_type.elevation_range)),
            0, 1
        )
        moisture_fit = np.clip(
            1 - np.abs(moisture_map - np.mean(prop_type.moisture_range)),
            0, 1
        )
        sun_fit = np.clip(
            1 - np.abs(sun_map - prop_type.sun_preference),
            0, 1
        )
        
        # Combine environmental factors
        fit_map = (elevation_fit + moisture_fit + sun_fit) / 3
        
        # Apply noise and environmental fit
        placement_map = noise * fit_map
        
        # Calculate distance field
        distance_field = calculate_distance_field(occupied_map)
        
        # Apply distance constraints
        placement_map[distance_field < prop_type.min_distance] = 0
        
        # Normalize and threshold
        placement_map = (placement_map - placement_map.min()) / (placement_map.max() - placement_map.min())
        threshold = 1 - prop_type.max_density
        placement_map[placement_map < threshold] = 0
        
        # Find cluster centers
        cluster_centers = []
        while np.any(placement_map > 0):
            # Find best placement
            best_idx = np.unravel_index(
                np.argmax(placement_map),
                placement_map.shape
            )
            
            if placement_map[best_idx] > 0:
                cluster_centers.append(best_idx)
                
                # Clear area around placement
                min_size, max_size = prop_type.cluster_size
                size = np.random.randint(min_size, max_size + 1)
                y, x = best_idx
                y1, y2 = max(0, y - size), min(placement_map.shape[0], y + size + 1)
                x1, x2 = max(0, x - size), min(placement_map.shape[1], x + size + 1)
                placement_map[y1:y2, x1:x2] = 0
            else:
                break
        
        return placement_map, cluster_centers
    
    def save_prop_types(self, path: Path):
        """Save prop types to file"""
        data = {
            name: {
                'name': prop.name,
                'description': prop.description,
                'elevation_range': prop.elevation_range,
                'moisture_range': prop.moisture_range,
                'sun_preference': prop.sun_preference,
                'cluster_size': prop.cluster_size,
                'min_distance': prop.min_distance,
                'weight': prop.weight,
                'noise_ratio': prop.noise_ratio,
                'max_density': prop.max_density,
                'style_tags': prop.style_tags
            }
            for name, prop in self.prop_types.items()
        }
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load_prop_types(self, path: Path):
        """Load prop types from file"""
        with open(path, 'r') as f:
            data = json.load(f)
        
        for name, prop_data in data.items():
            prop = PropType(
                name=prop_data['name'],
                description=prop_data['description'],
                elevation_range=tuple(prop_data['elevation_range']),
                moisture_range=tuple(prop_data['moisture_range']),
                sun_preference=prop_data['sun_preference'],
                cluster_size=tuple(prop_data['cluster_size']),
                min_distance=prop_data['min_distance'],
                weight=prop_data['weight'],
                noise_ratio=prop_data['noise_ratio'],
                max_density=prop_data['max_density'],
                style_tags=prop_data['style_tags']
            )
            self.add_prop_type(prop) 