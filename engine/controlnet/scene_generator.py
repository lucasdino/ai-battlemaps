import torch
import numpy as np
from PIL import Image
import trimesh
from pathlib import Path
import json
from typing import Dict, List, Tuple
from .interfaces import ISceneGenerator

class SceneGenerator(ISceneGenerator):
    def __init__(self, assets_dir: str = "assets"):
        self.assets_dir = Path(assets_dir)
        self.assets_dir.mkdir(exist_ok=True)
        self.load_asset_templates()
    
    def load_asset_templates(self):
        """Load 3D asset templates for different room elements."""
        self.templates = {
            'wall': {
                'mesh': trimesh.load(self.assets_dir / "templates/wall.glb"),
                'height': 3.0,  # meters
                'texture_scale': 1.0
            },
            'floor': {
                'mesh': trimesh.load(self.assets_dir / "templates/floor.glb"),
                'height': 0.0,
                'texture_scale': 2.0
            },
            'ceiling': {
                'mesh': trimesh.load(self.assets_dir / "templates/ceiling.glb"),
                'height': 3.0,
                'texture_scale': 1.0
            }
        }
    
    def generate_scene(self, room_image: Image.Image, depth_map: np.ndarray, 
                      segments: List[Dict], room_type: str) -> trimesh.Scene:
        """Generate a 3D scene from 2D room layout."""
        # Create base scene
        scene = trimesh.Scene()
        
        # Add floor
        floor = self._create_floor(room_image.size[0], room_image.size[1])
        scene.add_geometry(floor)
        
        # Add walls based on edge detection
        walls = self._create_walls(room_image, depth_map)
        for wall in walls:
            scene.add_geometry(wall)
        
        # Add ceiling
        ceiling = self._create_ceiling(room_image.size[0], room_image.size[1])
        scene.add_geometry(ceiling)
        
        # Add furniture and decorations
        furniture = self._create_furniture(segments, room_type)
        for item in furniture:
            scene.add_geometry(item)
        
        return scene
    
    def _create_floor(self, width: int, height: int) -> trimesh.Trimesh:
        """Create floor mesh."""
        vertices = np.array([
            [0, 0, 0],
            [width, 0, 0],
            [width, height, 0],
            [0, height, 0]
        ])
        faces = np.array([[0, 1, 2], [0, 2, 3]])
        
        floor = trimesh.Trimesh(vertices=vertices, faces=faces)
        floor.visual.material = self.templates['floor']['mesh'].visual.material
        
        return floor
    
    def _create_walls(self, room_image: Image.Image, 
                     depth_map: np.ndarray) -> List[trimesh.Trimesh]:
        """Create wall meshes based on room layout."""
        walls = []
        
        # Convert image to edges
        edges = np.array(room_image.convert('L'))
        edges = (edges > 127).astype(np.uint8) * 255
        
        # Find wall contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Create wall meshes
        for contour in contours:
            points = contour.reshape(-1, 2)
            wall = self._create_wall_mesh(points, depth_map)
            if wall is not None:
                walls.append(wall)
        
        return walls
    
    def _create_wall_mesh(self, points: np.ndarray, 
                         depth_map: np.ndarray) -> trimesh.Trimesh:
        """Create a single wall mesh."""
        if len(points) < 2:
            return None
        
        # Get wall height from depth map
        wall_height = np.mean(depth_map) * self.templates['wall']['height']
        
        # Create vertices
        vertices = []
        for point in points:
            x, y = point
            vertices.append([x, y, 0])
            vertices.append([x, y, wall_height])
        
        # Create faces
        faces = []
        for i in range(0, len(vertices) - 2, 2):
            faces.append([i, i+1, i+2])
            faces.append([i+1, i+3, i+2])
        
        wall = trimesh.Trimesh(vertices=vertices, faces=faces)
        wall.visual.material = self.templates['wall']['mesh'].visual.material
        
        return wall
    
    def _create_ceiling(self, width: int, height: int) -> trimesh.Trimesh:
        """Create ceiling mesh."""
        vertices = np.array([
            [0, 0, self.templates['ceiling']['height']],
            [width, 0, self.templates['ceiling']['height']],
            [width, height, self.templates['ceiling']['height']],
            [0, height, self.templates['ceiling']['height']]
        ])
        faces = np.array([[0, 1, 2], [0, 2, 3]])
        
        ceiling = trimesh.Trimesh(vertices=vertices, faces=faces)
        ceiling.visual.material = self.templates['ceiling']['mesh'].visual.material
        
        return ceiling
    
    def _create_furniture(self, segments: List[Dict], 
                         room_type: str) -> List[trimesh.Trimesh]:
        """Create furniture meshes based on segments."""
        furniture = []
        
        # Load furniture templates for room type
        furniture_templates = self._load_furniture_templates(room_type)
        
        for segment in segments:
            x, y, w, h = segment['bbox']
            center_x, center_y = segment['center']
            
            furniture_type = self._determine_furniture_type(segment, room_type)
            
            if furniture_type in furniture_templates:
                furniture_mesh = self._create_furniture_mesh(
                    furniture_templates[furniture_type],
                    (center_x, center_y),
                    (w, h)
                )
                if furniture_mesh is not None:
                    furniture.append(furniture_mesh)
        
        return furniture
    
    def _load_furniture_templates(self, room_type: str) -> Dict:
        """Load furniture templates for specific room type."""
        template_path = self.assets_dir / f"templates/{room_type}_furniture.json"
        if template_path.exists():
            with open(template_path) as f:
                return json.load(f)
        return {}
    
    def _determine_furniture_type(self, segment: Dict, 
                                room_type: str) -> str:
        """Determine furniture type based on segment properties."""
        area = segment['area']
        if area < 1000:
            return 'small_prop'
        elif area < 5000:
            return 'medium_prop'
        else:
            return 'large_prop'
    
    def export_scene(self, scene: trimesh.Scene, output_path: str):
        """Export scene to GLB format."""
        scene.export(output_path) 