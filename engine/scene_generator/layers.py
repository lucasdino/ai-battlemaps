from typing import Dict, List, Tuple, Optional, Union
import numpy as np
import torch
from PIL import Image
import logging
from pathlib import Path
from tqdm import tqdm
from diffusers import StableDiffusionPipeline

from .base import BaseLayer
from .config import LayerConfig, TerrainConfig, FeatureConfig, PropConfig, VisualConfig, SceneGeneratorConfig
from .terrain import TerrainGenerator, TerrainType
from .features import FeatureMatcher, FeatureTemplate
from .props import PropPlacer, PropType
from .visual import VisualProcessor, VisualStyle
from .utils import (
    generate_noise, blend_noise, normalize_array,
    calculate_distance_field, get_environmental_fit,
    save_texture, texture_to_base64, texture_to_data_uri,
    to_json_serializable
)
from .assets import AssetGenerator
from .models import ModelGenerator

logger = logging.getLogger(__name__)

class TerrainLayer(BaseLayer):
    def __init__(self, config: TerrainConfig):
        super().__init__(config)
        self.generator = TerrainGenerator()
    
    def generate(self, width: int, height: int, seed: Optional[int] = None) -> Dict[str, np.ndarray]:
        """Generate terrain using the terrain generator"""
        if not self._validate_input(width=width, height=height):
            return None
        
        # Get default terrain type
        terrain_type = self.generator.get_terrain_type('hill')
        if not terrain_type:
            logger.error("Default terrain type not found")
            return None
        
        # Generate base terrain
        elevation, moisture = self.generator.generate_terrain(
            shape=(height, width),
            terrain_type=terrain_type,
            seed=seed
        )
        
        # Generate height layers for 2.5D
        height_layers = self._generate_height_layers(elevation)
        
        # Calculate normal map
        normal_map = self._calculate_normal_map(elevation)
        
        # Calculate slope map
        slope_map = self._calculate_slope_map(elevation)
        
        # Store debug state if enabled
        if self.config.debug_mode:
            self._store_debug_state('elevation', elevation)
            self._store_debug_state('moisture', moisture)
            self._store_debug_state('height_layers', height_layers)
            self._store_debug_state('normal_map', normal_map)
            self._store_debug_state('slope_map', slope_map)
        
        return {
            "elevation": elevation,
            "moisture": moisture,
            "height_layers": height_layers,
            "normal_map": normal_map,
            "slope_map": slope_map
        }
    
    def _generate_height_layers(self, elevation: np.ndarray) -> Dict[str, np.ndarray]:
        """Generate height layers for 2.5D terrain"""
        layers = {
            'water': np.zeros_like(elevation),
            'sand': np.zeros_like(elevation),
            'grass': np.zeros_like(elevation),
            'mountain': np.zeros_like(elevation)
        }
        
        # Water layer (below 0.2)
        layers['water'] = np.where(elevation < 0.2, 1.0, 0.0)
        
        # Sand layer (0.2 to 0.3)
        layers['sand'] = np.where(
            (elevation >= 0.2) & (elevation < 0.3),
            1.0 - (elevation - 0.2) * 10,  # Smooth transition
            0.0
        )
        
        # Grass layer (0.3 to 0.7)
        layers['grass'] = np.where(
            (elevation >= 0.3) & (elevation < 0.7),
            1.0 - abs(elevation - 0.5) * 2,  # Smooth transition
            0.0
        )
        
        # Mountain layer (above 0.7)
        layers['mountain'] = np.where(
            elevation >= 0.7,
            (elevation - 0.7) * 3.33,  # Scale to 0-1
            0.0
        )
        
        return layers
    
    def _calculate_normal_map(self, elevation: np.ndarray) -> np.ndarray:
        """Calculate normal map for better lighting"""
        normal_map = np.zeros((elevation.shape[0], elevation.shape[1], 3))
        
        # Calculate gradients
        dx = np.gradient(elevation, axis=1)
        dy = np.gradient(elevation, axis=0)
        
        # Create normal vectors
        normal_map[..., 0] = -dx
        normal_map[..., 1] = 1.0
        normal_map[..., 2] = -dy
        
        # Normalize
        norm = np.sqrt(np.sum(normal_map * normal_map, axis=2, keepdims=True))
        normal_map = normal_map / norm
        
        return normal_map
    
    def _calculate_slope_map(self, elevation: np.ndarray) -> np.ndarray:
        """Calculate slope map for walkable areas"""
        dx = np.gradient(elevation, axis=1)
        dy = np.gradient(elevation, axis=0)
        
        # Calculate slope in degrees
        slope = np.arctan(np.sqrt(dx * dx + dy * dy)) * 180 / np.pi
        
        return slope

class FeatureLayer(BaseLayer):
    def __init__(self, config: FeatureConfig):
        super().__init__(config)
        self.matcher = FeatureMatcher()
        self.feature_grid = None
    
    def generate(
        self,
        terrain_data: Dict[str, np.ndarray],
        grid_size: Tuple[int, int],
        prompt: str
    ) -> Dict:
        """Generate features using semantic matching"""
        if not self._validate_input(
            terrain_data=terrain_data,
            grid_size=grid_size,
            prompt=prompt
        ):
            return None
        
        # Initialize feature grid
        self.feature_grid = np.full(grid_size, -1)
        features = []
        
        # Find matching features
        matches = self.matcher.find_matches(
            prompt,
            threshold=self.config.similarity_threshold,
            max_matches=self.config.max_features
        )
        
        # Place features
        for feature_name, similarity in matches:
            template = self.matcher.get_template(feature_name)
            if not template:
                continue
            
            # Calculate environmental fit
            elevation = terrain_data['elevation']
            moisture = terrain_data['moisture']
            
            # Place feature
            placed = self._place_feature(
                template,
                elevation,
                moisture,
                similarity
            )
            
            if placed:
                features.append(placed)
        
        # Store debug state if enabled
        if self.config.debug_mode:
            self._store_debug_state('feature_grid', self.feature_grid)
            self._store_debug_state('features', features)
        
        return {
            "features": features,
            "grid": self.feature_grid
        }
    
    def _place_feature(
        self,
        template: FeatureTemplate,
        elevation: np.ndarray,
        moisture: np.ndarray,
        similarity: float
    ) -> Optional[Dict]:
        """Place a single feature based on environmental conditions"""
        # Find valid positions
        valid_positions = []
        for y in range(elevation.shape[0]):
            for x in range(elevation.shape[1]):
                if self._is_valid_position(x, y, template):
                    # Calculate environmental fit
                    fit = get_environmental_fit(
                        elevation[y, x],
                        moisture[y, x],
                        {
                            'elevation_range': template.elevation_range,
                            'moisture_range': template.moisture_range
                        }
                    )
                    
                    # Calculate slope
                    if x > 0 and x < elevation.shape[1]-1 and y > 0 and y < elevation.shape[0]-1:
                        dx = abs(elevation[y, x+1] - elevation[y, x-1])
                        dy = abs(elevation[y+1, x] - elevation[y-1, x])
                        slope = max(dx, dy) * 100  # Convert to degrees
                    else:
                        slope = 0
                    
                    # Calculate normal
                    if x > 0 and x < elevation.shape[1]-1 and y > 0 and y < elevation.shape[0]-1:
                        dx = elevation[y, x+1] - elevation[y, x-1]
                        dy = elevation[y+1, x] - elevation[y-1, x]
                        normal = np.array([-dx, 1.0, -dy])
                        normal = normal / np.linalg.norm(normal)
                    else:
                        normal = np.array([0, 1, 0])
                    
                    valid_positions.append((x, y, fit, slope, normal))
        
        if not valid_positions:
            return None
        
        # Sort by environmental fit and slope
        valid_positions.sort(key=lambda x: (x[2], -x[3]), reverse=True)
        
        # Place feature at best position
        x, y, fit, slope, normal = valid_positions[0]
        self.feature_grid[y, x] = len(self.feature_grid)
        
        # Calculate rotation to align with normal
        rotation = self._calculate_rotation_from_normal(normal)
        
        return {
            'type': template.name,
            'position': (x, y),
            'size': template.size,
            'similarity': similarity,
            'environmental_fit': fit,
            'slope': slope,
            'normal': normal.tolist(),
            'rotation': rotation
        }
    
    def _calculate_rotation_from_normal(self, normal: np.ndarray) -> Dict[str, float]:
        """Calculate rotation angles from normal vector"""
        # Convert normal to rotation angles
        pitch = np.arctan2(normal[1], np.sqrt(normal[0]**2 + normal[2]**2))
        yaw = np.arctan2(normal[0], normal[2])
        
        return {
            'x': float(np.degrees(pitch)),
            'y': float(np.degrees(yaw)),
            'z': 0.0
        }
    
    def _is_valid_position(
        self,
        x: int,
        y: int,
        template: FeatureTemplate
    ) -> bool:
        """Check if position is valid for feature placement"""
        # Check grid bounds
        if not (0 <= x < self.feature_grid.shape[1] and
                0 <= y < self.feature_grid.shape[0]):
            return False
        
        # Check if position is already occupied
        if self.feature_grid[y, x] != -1:
            return False
        
        # Check minimum distance from other features
        min_distance = int(template.min_distance)
        for dx in range(-min_distance, min_distance + 1):
            for dy in range(-min_distance, min_distance + 1):
                nx, ny = x + dx, y + dy
                if (0 <= nx < self.feature_grid.shape[1] and
                    0 <= ny < self.feature_grid.shape[0]):
                    if self.feature_grid[ny, nx] != -1:
                        return False
        
        return True

class PropLayer(BaseLayer):
    def __init__(self, config: PropConfig):
        super().__init__(config)
        self.placer = PropPlacer()
    
    def generate(
        self,
        terrain_data: Dict[str, np.ndarray],
        feature_data: Dict,
        seed: Optional[int] = None
    ) -> Dict:
        """Generate props using the prop placer"""
        if not self._validate_input(
            terrain_data=terrain_data,
            feature_data=feature_data
        ):
            return None
        
        props = []
        occupied = np.zeros_like(terrain_data['elevation'], dtype=bool)
        
        # Mark feature positions as occupied
        for feature in feature_data['features']:
            x, y = feature['position']
            size = feature['size']
            occupied[
                max(0, y - size[1]//2):min(occupied.shape[0], y + size[1]//2 + 1),
                max(0, x - size[0]//2):min(occupied.shape[1], x + size[0]//2 + 1)
            ] = True
        
        # Place props for each type
        for prop_type in self.placer.prop_types.values():
            # Calculate sun map (simplified)
            sun_map = 1 - terrain_data['elevation'] * 0.5
            
            # Place props
            placement_map, cluster_centers = self.placer.place_props(
                elevation_map=terrain_data['elevation'],
                moisture_map=terrain_data['moisture'],
                sun_map=sun_map,
                occupied_map=occupied,
                prop_type=prop_type,
                seed=seed
            )
            
            # Add placed props
            for center in cluster_centers:
                y, x = center
                props.append({
                    'type': prop_type.name,
                    'position': (x, y),
                    'cluster_size': prop_type.cluster_size
                })
                
                # Mark as occupied
                min_size, max_size = prop_type.cluster_size
                size = np.random.randint(min_size, max_size + 1)
                occupied[
                    max(0, y - size):min(occupied.shape[0], y + size + 1),
                    max(0, x - size):min(occupied.shape[1], x + size + 1)
                ] = True
        
        # Store debug state if enabled
        if self.config.debug_mode:
            self._store_debug_state('props', props)
            self._store_debug_state('occupied', occupied)
        
        return {
            "props": props,
            "occupied": occupied
        }

class VisualPolishLayer(BaseLayer):
    def __init__(self, config: VisualConfig):
        super().__init__(config)
        self.processor = VisualProcessor()
        self.pipeline = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16
        )
        if torch.cuda.is_available():
            self.pipeline = self.pipeline.to("cuda")
    
    def generate(
        self,
        scene_data: Dict,
        style_prompt: str
    ) -> Dict:
        """Apply visual polish using the visual processor"""
        if not self._validate_input(scene_data=scene_data, style_prompt=style_prompt):
            return None
        
        # Get visual style
        style = self.processor.get_style(self.config.style)
        if not style:
            logger.error(f"Visual style '{self.config.style}' not found")
            return None
        
        # Generate base image
        prompt = self._create_scene_description(scene_data)
        image = self.pipeline(
            prompt,
            num_inference_steps=50,
            guidance_scale=7.5
        ).images[0]
        
        # Apply visual style
        image = self.processor.apply_style(
            image,
            style,
            high_res=self.config.high_res
        )
        
        # Store debug state if enabled
        if self.config.debug_mode:
            self._store_debug_state('image', image)
            self._store_debug_state('prompt', prompt)
        
        return {
            "image": image,
            "prompt": prompt
        }
    
    def _create_scene_description(self, scene_data: Dict) -> str:
        """Create a detailed scene description for image generation"""
        # Extract key elements
        features = scene_data.get('features', [])
        props = scene_data.get('props', [])
        
        # Build description
        desc = "A detailed battlemap showing "
        
        # Add features
        if features:
            feature_types = {}
            for feature in features:
                feature_type = feature['type']
                feature_types[feature_type] = feature_types.get(feature_type, 0) + 1
            
            feature_desc = []
            for feature_type, count in feature_types.items():
                if count == 1:
                    feature_desc.append(f"a {feature_type}")
                else:
                    feature_desc.append(f"{count} {feature_type}s")
            
            desc += ", ".join(feature_desc)
        
        # Add props
        if props:
            prop_types = {}
            for prop in props:
                prop_type = prop['type']
                prop_types[prop_type] = prop_types.get(prop_type, 0) + 1
            
            prop_desc = []
            for prop_type, count in prop_types.items():
                if count == 1:
                    prop_desc.append(f"a {prop_type}")
                else:
                    prop_desc.append(f"{count} {prop_type}s")
            
            if feature_desc:
                desc += " surrounded by "
            desc += ", ".join(prop_desc)
        
        # Add style
        desc += f", in a {self.config.style} style"
        
        return desc

class SceneGenerator:
    def __init__(self, config: Optional[Union[str, SceneGeneratorConfig]] = None):
        """Initialize scene generator with configuration
        
        Args:
            config: Either a path to a YAML config file or a SceneGeneratorConfig object
        """
        if isinstance(config, str):
            self.config = SceneGeneratorConfig.from_yaml(config)
        elif isinstance(config, SceneGeneratorConfig):
            self.config = config
        else:
            self.config = SceneGeneratorConfig()
        
        # Initialize layers
        self.terrain_layer = TerrainLayer(self.config.terrain)
        self.feature_layer = FeatureLayer(self.config.feature)
        self.prop_layer = PropLayer(self.config.prop)
        self.visual_layer = VisualPolishLayer(self.config.visual)
        
        # Initialize asset generators
        self.asset_generator = AssetGenerator(output_dir="assets/textures")
        self.model_generator = ModelGenerator(output_dir="assets/models")
        
        # Setup logging
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    def generate(
        self,
        prompt: str,
        style: str = "fantasy",
        batch_views: List[str] = None,
        high_res: bool = False
    ) -> Dict:
        """Generate a complete scene"""
        # Update visual style
        self.config.visual.style = style
        self.config.visual.high_res = high_res
        
        # Generate assets
        logger.info("Generating assets...")
        textures = self.asset_generator.generate_terrain_textures(style)
        feature_textures = self.asset_generator.generate_feature_textures(style)
        models = self.model_generator.generate_all_models()
        
        # Generate terrain
        logger.info("Generating terrain...")
        terrain_data = self.terrain_layer.generate(
            self.config.width,
            self.config.height
        )
        if not terrain_data:
            return None
        
        # Generate features
        logger.info("Generating features...")
        feature_data = self.feature_layer.generate(
            terrain_data,
            self.config.grid_size,
            prompt
        )
        if not feature_data:
            return None
        
        # Generate props
        logger.info("Generating props...")
        prop_data = self.prop_layer.generate(
            terrain_data,
            feature_data
        )
        if not prop_data:
            return None
        
        # Generate visual polish
        logger.info("Generating visual polish...")
        visual_data = self.visual_layer.generate(
            {
                'features': feature_data['features'],
                'props': prop_data['props']
            },
            prompt
        )
        if not visual_data:
            return None
        
        # Combine all data
        scene_data = {
            'terrain': terrain_data,
            'features': feature_data,
            'props': prop_data,
            'visual': visual_data,
            'assets': {
                'textures': {
                    'terrain': textures,
                    'features': feature_textures
                },
                'models': models
            }
        }
        
        # Generate additional views if requested
        if batch_views:
            scene_data['views'] = {}
            for view in batch_views:
                scene_data['views'][view] = self._transform_for_view(scene_data, view)
        
        return scene_data
    
    def _transform_for_view(self, scene_data: Dict, angle: float) -> Dict:
        """Transform scene data for a different viewing angle"""
        # TODO: Implement view transformation
        return scene_data
    
    def _export_to_tiled(self, scene_data: Dict) -> Dict:
        """Export scene data as a tiled environment
        
        Returns a dictionary containing:
        - tilemap: 2D array of tile types
        - tileset: Dictionary of tile definitions
        - assets: List of placeable assets with positions
        - metadata: Additional scene information
        """
        # Convert terrain data to tile types
        elevation = scene_data['terrain']['elevation']
        moisture = scene_data['terrain']['moisture']
        
        # Create tilemap based on elevation and moisture
        tilemap = np.zeros((elevation.shape[0], elevation.shape[1]), dtype=int)
        tileset = {
            0: {'name': 'water', 'walkable': False},
            1: {'name': 'sand', 'walkable': True},
            2: {'name': 'grass', 'walkable': True},
            3: {'name': 'forest', 'walkable': True},
            4: {'name': 'mountain', 'walkable': False},
            5: {'name': 'snow', 'walkable': True}
        }
        
        # Convert elevation and moisture to tile types
        for y in range(elevation.shape[0]):
            for x in range(elevation.shape[1]):
                elev = elevation[y, x]
                moist = moisture[y, x]
                
                # Determine tile type based on elevation and moisture
                if elev < 0.2:
                    tilemap[y, x] = 0  # Water
                elif elev < 0.3:
                    tilemap[y, x] = 1  # Sand
                elif elev < 0.7:
                    if moist > 0.6:
                        tilemap[y, x] = 3  # Forest
                    else:
                        tilemap[y, x] = 2  # Grass
                elif elev < 0.9:
                    tilemap[y, x] = 4  # Mountain
                else:
                    tilemap[y, x] = 5  # Snow
        
        # Convert features to placeable assets
        assets = []
        for feature in scene_data['features']['features']:
            x, y = feature['position']
            assets.append({
                'type': feature['type'],
                'position': (x, y),
                'size': feature['size'],
                'category': 'feature'
            })
        
        # Convert props to placeable assets
        for prop in scene_data['props']['props']:
            x, y = prop['position']
            assets.append({
                'type': prop['type'],
                'position': (x, y),
                'cluster_size': prop['cluster_size'],
                'category': 'prop'
            })
        
        # Create metadata
        metadata = {
            'width': elevation.shape[1],
            'height': elevation.shape[0],
            'tile_size': 32,  # Default tile size in pixels
            'style': self.config.visual.style,
            'prompt': scene_data['visual']['prompt']
        }
        
        return {
            'tilemap': tilemap.tolist(),
            'tileset': tileset,
            'assets': assets,
            'metadata': metadata
        }

    def export_to_json(self, scene_data: Dict, format: str = 'unity') -> Dict:
        """Export scene data to JSON format"""
        # Clear debug state from all layers
        self.terrain_layer._clear_debug_state()
        self.feature_layer._clear_debug_state()
        self.prop_layer._clear_debug_state()
        self.visual_layer._clear_debug_state()
        
        if format == 'unity':
            return to_json_serializable(self._export_to_unity(scene_data))
        elif format == 'web':
            return to_json_serializable(self._export_to_web(scene_data))
        elif format == 'blender':
            return to_json_serializable(self._export_to_blender(scene_data))
        elif format == 'tiled':
            return to_json_serializable(self._export_to_tiled(scene_data))
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def _export_to_unity(self, scene_data: Dict) -> Dict:
        """Export scene data for Unity with 3D positioning and navigation data"""
        # Extract terrain data
        elevation = scene_data['terrain']['elevation']
        moisture = scene_data['terrain']['moisture']
        
        # Create navigation mesh data
        nav_mesh = np.zeros_like(elevation, dtype=bool)
        for y in range(elevation.shape[0]):
            for x in range(elevation.shape[1]):
                # Mark walkable areas (not water, not too steep)
                elev = elevation[y, x]
                nav_mesh[y, x] = elev >= 0.2 and elev < 0.9
        
        # Convert features to Unity prefab placements
        features = []
        for feature in scene_data['features']['features']:
            x, y = feature['position']
            # Convert 2D position to 3D (Unity uses y-up)
            position = {
                'x': float(x),
                'y': float(elevation[y, x]),  # Use elevation for height
                'z': float(y)
            }
            features.append({
                'prefab_name': feature['type'],
                'position': position,
                'rotation': {'x': 0, 'y': 0, 'z': 0},  # Default rotation
                'scale': {'x': 1, 'y': 1, 'z': 1},     # Default scale
                'size': feature['size'],
                'is_static': True,  # Features are static objects
                'collider_enabled': True
            })
        
        # Convert props to Unity prefab placements
        props = []
        for prop in scene_data['props']['props']:
            x, y = prop['position']
            # Convert 2D position to 3D
            position = {
                'x': float(x),
                'y': float(elevation[y, x]),
                'z': float(y)
            }
            props.append({
                'prefab_name': prop['type'],
                'position': position,
                'rotation': {'x': 0, 'y': 0, 'z': 0},
                'scale': {'x': 1, 'y': 1, 'z': 1},
                'cluster_size': prop['cluster_size'],
                'is_static': True,
                'collider_enabled': True
            })
        
        # Create terrain data for Unity Terrain component
        terrain_data = {
            'height_map': elevation.tolist(),
            'size': {
                'width': elevation.shape[1],
                'height': elevation.shape[0],
                'depth': 1.0  # Unity terrain depth
            },
            'height_scale': 1.0,  # Adjust based on your needs
            'texture_layers': [
                {
                    'name': 'water',
                    'threshold': 0.2,
                    'tiling': {'x': 1, 'y': 1}
                },
                {
                    'name': 'sand',
                    'threshold': 0.3,
                    'tiling': {'x': 1, 'y': 1}
                },
                {
                    'name': 'grass',
                    'threshold': 0.7,
                    'tiling': {'x': 1, 'y': 1}
                },
                {
                    'name': 'mountain',
                    'threshold': 0.9,
                    'tiling': {'x': 1, 'y': 1}
                }
            ]
        }
        
        # Create navigation data
        navigation = {
            'nav_mesh': nav_mesh.tolist(),
            'walkable_height': 2.0,  # Unity default
            'walkable_radius': 0.5,  # Unity default
            'walkable_climb': 0.5,   # Unity default
            'walkable_slope': 45.0   # Unity default
        }
        
        return {
            'terrain': terrain_data,
            'features': features,
            'props': props,
            'navigation': navigation,
            'metadata': {
                'world_size': {
                    'width': elevation.shape[1],
                    'height': elevation.shape[0]
                },
                'grid_size': 1.0,  # Unity units per grid cell
                'style': self.config.visual.style,
                'prompt': scene_data['visual']['prompt']
            }
        }
    
    def _export_to_web(self, scene_data: Dict) -> Dict:
        """Export scene data for web"""
        # Extract terrain data
        elevation = scene_data['terrain']['elevation']
        moisture = scene_data['terrain']['moisture']
        height_layers = scene_data['terrain']['height_layers']
        normal_map = scene_data['terrain']['normal_map']
        slope_map = scene_data['terrain']['slope_map']
        
        # Get assets
        textures = scene_data['assets']['textures']
        models = scene_data['assets']['models']
        
        # Create terrain data
        terrain_data = {
            'size': {
                'width': elevation.shape[1],
                'height': elevation.shape[0]
            },
            'height_map': elevation.tolist(),
            'moisture_map': moisture.tolist(),
            'normal_map': normal_map.tolist(),
            'slope_map': slope_map.tolist(),
            'height_layers': {
                name: layer.tolist() for name, layer in height_layers.items()
            },
            'height_scale': 1.0,
            'texture_layers': [
                {
                    'name': 'water',
                    'threshold': 0.2,
                    'tiling': {'x': 4, 'y': 4},
                    'texture': textures['terrain']['water'],
                    'material': {
                        'color': '#0077be',
                        'roughness': 0.1,
                        'metalness': 0.8,
                        'normal_scale': 1.0
                    }
                },
                {
                    'name': 'sand',
                    'threshold': 0.3,
                    'tiling': {'x': 8, 'y': 8},
                    'texture': textures['terrain']['sand'],
                    'material': {
                        'color': '#c2b280',
                        'roughness': 0.9,
                        'metalness': 0.1,
                        'normal_scale': 0.5
                    }
                },
                {
                    'name': 'grass',
                    'threshold': 0.7,
                    'tiling': {'x': 16, 'y': 16},
                    'texture': textures['terrain']['grass'],
                    'material': {
                        'color': '#355e3b',
                        'roughness': 0.8,
                        'metalness': 0.2,
                        'normal_scale': 1.5
                    }
                },
                {
                    'name': 'mountain',
                    'threshold': 0.9,
                    'tiling': {'x': 32, 'y': 32},
                    'texture': textures['terrain']['mountain'],
                    'material': {
                        'color': '#808080',
                        'roughness': 0.9,
                        'metalness': 0.3,
                        'normal_scale': 2.0
                    }
                }
            ]
        }
        
        # Create navigation mesh with proper walkable areas
        nav_mesh = np.zeros_like(elevation, dtype=bool)
        for y in range(elevation.shape[0]):
            for x in range(elevation.shape[1]):
                # Determine if walkable based on height and slope
                nav_mesh[y, x] = (
                    elevation[y, x] >= 0.2 and elevation[y, x] < 0.9 and  # Height constraints
                    slope_map[y, x] < 45.0     # Slope constraint
                )
        
        # Process features with proper 3D data
        features = []
        for f in scene_data['features']['features']:
            x, y = f['position']
            elev = float(elevation[y, x])
            
            # Handle size tuple
            size = f['size']
            if isinstance(size, tuple):
                scale_x = float(size[0])
                scale_y = float(size[1]) if len(size) > 1 else scale_x
                scale_z = float(size[2]) if len(size) > 2 else scale_x
            else:
                scale_x = scale_y = scale_z = float(size)
            
            features.append({
                'type': f['type'],
                'position': {
                    'x': float(x),
                    'y': elev,
                    'z': float(y)
                },
                'rotation': f.get('rotation', {
                    'x': 0,
                    'y': np.random.uniform(0, 360),
                    'z': 0
                }),
                'scale': {
                    'x': scale_x,
                    'y': scale_y,
                    'z': scale_z
                },
                'normal': f.get('normal', [0, 1, 0]),
                'slope': float(f.get('slope', 0)),
                'model': models['features'][f['type']],
                'texture': textures['features'][f['type']],
                'material': {
                    'color': self._get_feature_color(f['type']),
                    'roughness': 0.8,
                    'metalness': 0.2,
                    'normal_scale': 1.0
                }
            })
        
        # Process props with proper 3D data
        props = []
        for p in scene_data['props']['props']:
            x, y = p['position']
            elev = float(elevation[y, x])
            
            # Calculate normal at prop position
            normal = normal_map[y, x] if y > 0 and y < normal_map.shape[0]-1 and x > 0 and x < normal_map.shape[1]-1 else [0, 1, 0]
            
            # Calculate rotation to align with normal
            rotation = self._calculate_rotation_from_normal(normal)
            
            # Handle cluster size
            cluster_size = p['cluster_size']
            if isinstance(cluster_size, tuple):
                scale_x = float(cluster_size[0])
                scale_y = float(cluster_size[1]) if len(cluster_size) > 1 else scale_x
                scale_z = float(cluster_size[2]) if len(cluster_size) > 2 else scale_x
            else:
                scale_x = scale_y = scale_z = float(cluster_size)
            
            props.append({
                'type': p['type'],
                'position': {
                    'x': float(x),
                    'y': elev,
                    'z': float(y)
                },
                'rotation': rotation,
                'scale': {
                    'x': scale_x,
                    'y': scale_y,
                    'z': scale_z
                },
                'normal': normal if isinstance(normal, list) else normal.tolist(),
                'slope': float(slope_map[y, x]),
                'model': models['props'][p['type']],
                'texture': textures['features'][p['type']],
                'material': {
                    'color': self._get_prop_color(p['type']),
                    'roughness': 0.8,
                    'metalness': 0.2,
                    'normal_scale': 1.0
                }
            })
        
        return {
            'terrain': terrain_data,
            'features': features,
            'props': props,
            'navigation': {
                'nav_mesh': nav_mesh.tolist(),
                'walkable_slopes': slope_map.tolist(),
                'walkable_height': 2.0,
                'walkable_radius': 0.5,
                'walkable_climb': 0.5,
                'walkable_slope': 45.0
            },
            'metadata': {
                'world_size': {
                    'width': elevation.shape[1],
                    'height': elevation.shape[0]
                },
                'style': self.config.visual.style,
                'prompt': scene_data['visual']['prompt']
            }
        }
    
    def _get_feature_color(self, feature_type: str) -> str:
        """Get color for feature type"""
        colors = {
            'tree': '#2d5a27',
            'rock': '#808080',
            'building': '#8b4513',
            'water': '#0077be',
            'mountain': '#696969'
        }
        return colors.get(feature_type.lower(), '#808080')
    
    def _get_prop_color(self, prop_type: str) -> str:
        """Get color for prop type"""
        colors = {
            'bush': '#355e3b',
            'flower': '#ff69b4',
            'stone': '#808080',
            'log': '#8b4513',
            'mushroom': '#ff4500'
        }
        return colors.get(prop_type.lower(), '#808080')
    
    def _export_to_blender(self, scene_data: Dict) -> Dict:
        """Export scene data for Blender"""
        # Extract only the necessary data for Blender
        return {
            'terrain': {
                'elevation': scene_data['terrain']['elevation'],
                'moisture': scene_data['terrain']['moisture']
            },
            'features': [
                {
                    'type': f['type'],
                    'position': f['position'],
                    'size': f['size']
                }
                for f in scene_data['features']['features']
            ],
            'props': [
                {
                    'type': p['type'],
                    'position': p['position'],
                    'cluster_size': p['cluster_size']
                }
                for p in scene_data['props']['props']
            ]
        } 