from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
import yaml
import os
import logging
from pathlib import Path

@dataclass
class LayerConfig:
    enabled: bool = True
    cache_size: int = 1000
    batch_size: int = 10
    debug_mode: bool = False

@dataclass
class TerrainConfig(LayerConfig):
    noise_scales: Dict[str, float] = None
    octaves: int = 6
    persistence: float = 0.5
    lacunarity: float = 2.0
    seed: Optional[int] = None

@dataclass
class FeatureConfig(LayerConfig):
    min_distance: int = 2
    max_density: float = 0.3
    similarity_threshold: float = 0.3
    max_features: int = 100

@dataclass
class PropConfig(LayerConfig):
    density: float = 0.3
    cluster_size: Tuple[int, int] = (2, 5)
    min_distance: int = 1
    max_props: int = 500

@dataclass
class VisualConfig(LayerConfig):
    style: str = "fantasy"
    high_res: bool = False
    post_process: bool = True
    texture_size: Tuple[int, int] = (1024, 1024)

@dataclass
class SceneGeneratorConfig:
    width: int = 64
    height: int = 64
    grid_size: Tuple[int, int] = (32, 32)
    output_dir: str = "output"
    cache_dir: str = "cache"
    log_level: str = "INFO"
    
    # Use default_factory for mutable defaults
    terrain: TerrainConfig = field(default_factory=TerrainConfig)
    feature: FeatureConfig = field(default_factory=FeatureConfig)
    prop: PropConfig = field(default_factory=PropConfig)
    visual: VisualConfig = field(default_factory=VisualConfig)
    
    def __post_init__(self):
        # Create output and cache directories
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Setup logging
        logging.basicConfig(
            level=getattr(logging, self.log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Initialize noise scales if not provided
        if self.terrain.noise_scales is None:
            self.terrain.noise_scales = {
                'large': 100.0,
                'medium': 50.0,
                'small': 25.0
            }
    
    @classmethod
    def from_yaml(cls, path: str) -> 'SceneGeneratorConfig':
        """Load configuration from YAML file"""
        with open(path, 'r') as f:
            config_dict = yaml.safe_load(f)
        return cls(**config_dict)
    
    def to_yaml(self, path: str):
        """Save configuration to YAML file"""
        config_dict = {
            'width': self.width,
            'height': self.height,
            'grid_size': self.grid_size,
            'output_dir': self.output_dir,
            'cache_dir': self.cache_dir,
            'log_level': self.log_level,
            'terrain': {
                'enabled': self.terrain.enabled,
                'cache_size': self.terrain.cache_size,
                'batch_size': self.terrain.batch_size,
                'debug_mode': self.terrain.debug_mode,
                'noise_scales': self.terrain.noise_scales,
                'octaves': self.terrain.octaves,
                'persistence': self.terrain.persistence,
                'lacunarity': self.terrain.lacunarity,
                'seed': self.terrain.seed
            },
            'feature': {
                'enabled': self.feature.enabled,
                'cache_size': self.feature.cache_size,
                'batch_size': self.feature.batch_size,
                'debug_mode': self.feature.debug_mode,
                'min_distance': self.feature.min_distance,
                'max_density': self.feature.max_density,
                'similarity_threshold': self.feature.similarity_threshold,
                'max_features': self.feature.max_features
            },
            'prop': {
                'enabled': self.prop.enabled,
                'cache_size': self.prop.cache_size,
                'batch_size': self.prop.batch_size,
                'debug_mode': self.prop.debug_mode,
                'density': self.prop.density,
                'cluster_size': self.prop.cluster_size,
                'min_distance': self.prop.min_distance,
                'max_props': self.prop.max_props
            },
            'visual': {
                'enabled': self.visual.enabled,
                'cache_size': self.visual.cache_size,
                'batch_size': self.visual.batch_size,
                'debug_mode': self.visual.debug_mode,
                'style': self.visual.style,
                'high_res': self.visual.high_res,
                'post_process': self.visual.post_process,
                'texture_size': self.visual.texture_size
            }
        }
        
        with open(path, 'w') as f:
            yaml.dump(config_dict, f, default_flow_style=False)
    
    def validate(self) -> List[str]:
        """Validate configuration values"""
        errors = []
        
        # Validate dimensions
        if self.width <= 0 or self.height <= 0:
            errors.append("Width and height must be positive")
        if self.grid_size[0] <= 0 or self.grid_size[1] <= 0:
            errors.append("Grid size must be positive")
        
        # Validate terrain config
        if self.terrain.octaves < 1:
            errors.append("Terrain octaves must be at least 1")
        if not 0 < self.terrain.persistence < 1:
            errors.append("Terrain persistence must be between 0 and 1")
        if self.terrain.lacunarity <= 0:
            errors.append("Terrain lacunarity must be positive")
        
        # Validate feature config
        if not 0 < self.feature.max_density <= 1:
            errors.append("Feature max density must be between 0 and 1")
        if not 0 < self.feature.similarity_threshold <= 1:
            errors.append("Feature similarity threshold must be between 0 and 1")
        
        # Validate prop config
        if not 0 < self.prop.density <= 1:
            errors.append("Prop density must be between 0 and 1")
        if self.prop.cluster_size[0] > self.prop.cluster_size[1]:
            errors.append("Prop cluster size min must be less than max")
        
        # Validate visual config
        if self.visual.texture_size[0] <= 0 or self.visual.texture_size[1] <= 0:
            errors.append("Texture size must be positive")
        
        return errors 