import trimesh
import numpy as np
from PIL import Image
import logging
from typing import Dict, List, Any
from pathlib import Path

from .interfaces import ISceneBuilder

class SceneBuilder(ISceneBuilder):
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.assets_dir = Path(__file__).parent / "assets"
    
    def build_scene(self, room_image: Image.Image, segments: List[Dict[str, Any]], 
                   room_type: str, texture_pack: Dict) -> trimesh.Scene:
        """Build 3D scene from room image and segments."""
        try:
            # Create base scene
            scene = trimesh.Scene()
            
            # Add floor
            floor = self._create_floor(texture_pack['floor'])
            scene.add_geometry(floor)
            
            # Add walls
            walls = self._create_walls(texture_pack['wall'])
            scene.add_geometry(walls)
            
            # Add ceiling
            ceiling = self._create_ceiling(texture_pack['ceiling'])
            scene.add_geometry(ceiling)
            
            # Add assets
            for segment in segments:
                if 'asset' in segment and 'placement' in segment:
                    asset = self._create_asset(segment['asset'])
                    if asset:
                        # Get placement information
                        position = segment['placement']
                        transform = self._get_transform(position)
                        
                        # Add asset to scene
                        scene.add_geometry(asset, transform=transform)
            
            return scene
            
        except Exception as e:
            self.logger.error(f"Error building scene: {str(e)}")
            raise
    
    def _create_floor(self, texture: str) -> trimesh.Trimesh:
        """Create floor mesh with texture."""
        # Create a simple plane
        vertices = np.array([
            [0, 0, 0],
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 0]
        ])
        faces = np.array([[0, 1, 2], [0, 2, 3]])
        
        # Create mesh
        floor = trimesh.Trimesh(vertices=vertices, faces=faces)
        
        # Apply texture
        texture_path = self.assets_dir / "textures" / texture
        if texture_path.exists():
            floor.visual.texture = trimesh.load_image(str(texture_path))
        
        return floor
    
    def _create_walls(self, texture: str) -> trimesh.Trimesh:
        """Create wall meshes."""
        # Create walls around the perimeter
        vertices = []
        faces = []
        
        # Wall height
        height = 1.0
        
        # Add vertices for each wall
        # Front wall
        vertices.extend([
            [0, 0, 0],
            [1, 0, 0],
            [1, 0, height],
            [0, 0, height]
        ])
        faces.extend([[0, 1, 2], [0, 2, 3]])
        
        # Back wall
        vertices.extend([
            [0, 1, 0],
            [1, 1, 0],
            [1, 1, height],
            [0, 1, height]
        ])
        faces.extend([[4, 5, 6], [4, 6, 7]])
        
        # Left wall
        vertices.extend([
            [0, 0, 0],
            [0, 1, 0],
            [0, 1, height],
            [0, 0, height]
        ])
        faces.extend([[8, 9, 10], [8, 10, 11]])
        
        # Right wall
        vertices.extend([
            [1, 0, 0],
            [1, 1, 0],
            [1, 1, height],
            [1, 0, height]
        ])
        faces.extend([[12, 13, 14], [12, 14, 15]])
        
        # Create mesh
        walls = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
        
        # Apply texture
        texture_path = self.assets_dir / "textures" / texture
        if texture_path.exists():
            walls.visual.texture = trimesh.load_image(str(texture_path))
        
        return walls
    
    def _create_ceiling(self, texture: str) -> trimesh.Trimesh:
        """Create ceiling mesh with texture."""
        # Create a simple plane at the top
        vertices = np.array([
            [0, 0, 1],
            [1, 0, 1],
            [1, 1, 1],
            [0, 1, 1]
        ])
        faces = np.array([[0, 1, 2], [0, 2, 3]])
        
        # Create mesh
        ceiling = trimesh.Trimesh(vertices=vertices, faces=faces)
        
        # Apply texture
        texture_path = self.assets_dir / "textures" / texture
        if texture_path.exists():
            ceiling.visual.texture = trimesh.load_image(str(texture_path))
        
        return ceiling
    
    def _create_asset(self, asset_info: Dict) -> trimesh.Trimesh:
        """Create asset mesh from asset info."""
        try:
            # Load mesh from file
            mesh_path = self.assets_dir / "models" / asset_info['path']
            if not mesh_path.exists():
                self.logger.warning(f"Asset file not found: {mesh_path}")
                return None
            
            mesh = trimesh.load(str(mesh_path))
            
            # Apply scale
            if 'scale' in asset_info:
                mesh.apply_scale(asset_info['scale'])
            
            return mesh
            
        except Exception as e:
            self.logger.error(f"Error creating asset: {str(e)}")
            return None
    
    def _get_transform(self, position: tuple) -> np.ndarray:
        """Get transformation matrix for asset placement."""
        # Create transformation matrix
        transform = np.eye(4)
        transform[:3, 3] = position
        return transform 