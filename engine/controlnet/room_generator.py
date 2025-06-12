import torch
from diffusers import StableDiffusionInpaintPipeline
from PIL import Image, ImageDraw
import numpy as np
import cv2
import logging
from pathlib import Path
from typing import Dict, Optional, List, Tuple
import gc
import trimesh
import json
import time

from .interfaces import IRoomGenerator

class RoomGenerator(IRoomGenerator):
    def __init__(self, model_path: str = "runwayml/stable-diffusion-v1-5"):
        self.logger = logging.getLogger(__name__)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Clear CUDA cache if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
        
        # Initialize inpainting pipeline
        self.pipeline = StableDiffusionInpaintPipeline.from_pretrained(
            "runwayml/stable-diffusion-inpainting",
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            use_safetensors=True,
            variant="fp16" if self.device == "cuda" else None
        ).to(self.device)
        
        # Enable memory optimization
        if self.device == "cuda":
            self.pipeline.enable_attention_slicing()
            self.pipeline.enable_vae_slicing()
        
        # Load room templates and rules
        self._load_templates()
        
        # Initialize 3D asset library
        self.asset_library = self._load_asset_library()
    
    def _load_templates(self):
        """Load room templates and generation rules."""
        self.room_templates = {
            'dungeon': {
                'prompt': "top-down view of a dark dungeon room, stone walls, medieval architecture, torch lighting, detailed floor plan",
                'negative_prompt': "blurry, low quality, distorted, modern, bright lighting",
                'rules': {
                    'wall_height': 10,
                    'floor_texture': 'stone',
                    'lighting': 'torch',
                    'assets': ['chest', 'barrel', 'skeleton'],
                    'asset_rules': {
                        'chest': {'min_count': 1, 'max_count': 3},
                        'barrel': {'min_count': 2, 'max_count': 5},
                        'skeleton': {'min_count': 0, 'max_count': 2}
                    }
                }
            },
            'tavern': {
                'prompt': "top-down view of a cozy tavern interior, wooden tables and chairs, fireplace, medieval fantasy style, detailed floor plan",
                'negative_prompt': "blurry, low quality, distorted, modern, bright lighting",
                'rules': {
                    'wall_height': 8,
                    'floor_texture': 'wood',
                    'lighting': 'fireplace',
                    'assets': ['table', 'chair', 'bar'],
                    'asset_rules': {
                        'table': {'min_count': 4, 'max_count': 8},
                        'chair': {'min_count': 8, 'max_count': 16},
                        'bar': {'min_count': 1, 'max_count': 1}
                    }
                }
            },
            'throne': {
                'prompt': "top-down view of a grand throne room, ornate decorations, pillars, medieval architecture, detailed floor plan",
                'negative_prompt': "blurry, low quality, distorted, modern, bright lighting",
                'rules': {
                    'wall_height': 15,
                    'floor_texture': 'marble',
                    'lighting': 'chandelier',
                    'assets': ['throne', 'pillar', 'banner'],
                    'asset_rules': {
                        'throne': {'min_count': 1, 'max_count': 1},
                        'pillar': {'min_count': 4, 'max_count': 8},
                        'banner': {'min_count': 2, 'max_count': 4}
                    }
                }
            }
        }
    
    def _load_asset_library(self) -> Dict:
        """Load 3D asset library from files."""
        assets_dir = Path(__file__).parent / "assets"
        assets_dir.mkdir(exist_ok=True)
        
        # This would load actual 3D models, but for now we'll use placeholder data
        return {
            'chest': {'mesh': 'chest.glb', 'scale': 1.0},
            'barrel': {'mesh': 'barrel.glb', 'scale': 1.0},
            'skeleton': {'mesh': 'skeleton.glb', 'scale': 1.0},
            'table': {'mesh': 'table.glb', 'scale': 1.0},
            'chair': {'mesh': 'chair.glb', 'scale': 1.0},
            'bar': {'mesh': 'bar.glb', 'scale': 1.0},
            'throne': {'mesh': 'throne.glb', 'scale': 1.0},
            'pillar': {'mesh': 'pillar.glb', 'scale': 1.0},
            'banner': {'mesh': 'banner.glb', 'scale': 1.0}
        }
    
    def generate_room(self, room_type: str, size: int = 512, complexity: float = 0.5, custom_prompt: Optional[str] = None) -> Dict:
        """Generate a 3D room scene from user input."""
        try:
            # Get room template and rules
            template = self._get_room_template(room_type)
            
            # Generate 2D layout using inpainting
            layout_image = self._generate_2d_layout(template, size, custom_prompt)
            
            # Generate depth map
            depth_map = self._generate_depth_map(layout_image)
            
            # Create 3D scene
            scene = self._create_3d_scene(layout_image, depth_map, template['rules'])
            
            # Export scene
            output_path = self._export_scene(scene, room_type)
            
            return {
                'layout_image': layout_image,
                'depth_map': depth_map,
                'scene': scene,
                'output_path': output_path
            }
            
        except Exception as e:
            self.logger.error(f"Error generating room: {str(e)}")
            raise
    
    def _generate_2d_layout(self, template: Dict, size: int, custom_prompt: Optional[str]) -> Image.Image:
        """Generate 2D room layout using inpainting."""
        # Create base template with walls
        base_image = self._create_base_template(size)
        
        # Create mask for inpainting (everything except walls)
        mask = self._create_inpaint_mask(size)
        
        # Generate image using inpainting
        image = self.pipeline(
            prompt=template['prompt'] if not custom_prompt else custom_prompt,
            image=base_image,
            mask_image=mask,
            negative_prompt=template['negative_prompt'],
            num_inference_steps=30,
            guidance_scale=7.5,
            width=size,
            height=size
        ).images[0]
        
        # Add assets using inpainting
        for asset_type in template['rules']['assets']:
            asset_mask = self._create_asset_mask(size, asset_type)
            image = self.pipeline(
                prompt=f"{template['prompt']}, with {asset_type}",
                image=image,
                mask_image=asset_mask,
                negative_prompt=template['negative_prompt'],
                num_inference_steps=20,
                guidance_scale=7.5
            ).images[0]
        
        return image
    
    def _create_inpaint_mask(self, size: int) -> Image.Image:
        """Create mask for inpainting (everything except walls)."""
        mask = Image.new('L', (size, size), 255)
        draw = ImageDraw.Draw(mask)
        
        # Draw walls as black (not to be inpainted)
        margin = size // 8
        draw.rectangle(
            [(margin, margin), (size - margin, size - margin)],
            fill=0,
            outline=0,
            width=2
        )
        
        return mask
    
    def _create_asset_mask(self, size: int, asset_type: str) -> Image.Image:
        """Create mask for asset placement."""
        mask = Image.new('L', (size, size), 0)
        draw = ImageDraw.Draw(mask)
        
        # Create random position for asset
        margin = size // 8
        asset_size = size // 8
        
        x = np.random.randint(margin, size - margin - asset_size)
        y = np.random.randint(margin, size - margin - asset_size)
        
        # Draw asset area as white (to be inpainted)
        draw.rectangle(
            [(x, y), (x + asset_size, y + asset_size)],
            fill=255
        )
        
        return mask
    
    def _generate_depth_map(self, image: Image.Image) -> np.ndarray:
        """Generate depth map from layout image."""
        # Convert to grayscale
        gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Generate depth map (simplified version)
        depth_map = cv2.Laplacian(blurred, cv2.CV_64F)
        depth_map = np.absolute(depth_map)
        depth_map = cv2.normalize(depth_map, None, 0, 1, cv2.NORM_MINMAX)
        
        return depth_map
    
    def _create_3d_scene(self, layout_image: Image.Image, depth_map: np.ndarray, rules: Dict) -> trimesh.Scene:
        """Create 3D scene from layout and depth map."""
        scene = trimesh.Scene()
        
        # Add floor
        floor = self._create_floor(rules['floor_texture'])
        scene.add_geometry(floor)
        
        # Add walls
        walls = self._create_walls(rules['wall_height'])
        scene.add_geometry(walls)
        
        # Add assets based on rules
        for asset_type, rule in rules['asset_rules'].items():
            count = np.random.randint(rule['min_count'], rule['max_count'] + 1)
            for _ in range(count):
                asset = self._create_asset(asset_type)
                position = self._get_random_position(layout_image, depth_map)
                scene.add_geometry(asset, transform=self._get_transform(position))
        
        return scene
    
    def _create_floor(self, texture: str) -> trimesh.Trimesh:
        """Create floor mesh with specified texture."""
        # Create a simple plane
        vertices = np.array([
            [0, 0, 0],
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 0]
        ])
        faces = np.array([[0, 1, 2], [0, 2, 3]])
        return trimesh.Trimesh(vertices=vertices, faces=faces)
    
    def _create_walls(self, height: float) -> trimesh.Trimesh:
        """Create wall meshes."""
        # Create walls around the perimeter
        vertices = []
        faces = []
        
        # Add wall vertices and faces
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
        
        return trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
    
    def _create_asset(self, asset_type: str) -> trimesh.Trimesh:
        """Create asset mesh from library."""
        asset_info = self.asset_library[asset_type]
        # Load mesh from file
        mesh = trimesh.load(asset_info['mesh'])
        mesh.apply_scale(asset_info['scale'])
        return mesh
    
    def _get_random_position(self, layout_image: Image.Image, depth_map: np.ndarray) -> Tuple[float, float, float]:
        """Get random position for asset placement."""
        # Use depth map to find suitable positions
        # This is a simplified version
        x = np.random.uniform(0, 1)
        y = np.random.uniform(0, 1)
        z = 0  # Place on floor
        return (x, y, z)
    
    def _get_transform(self, position: Tuple[float, float, float]) -> np.ndarray:
        """Get transformation matrix for asset placement."""
        # Create transformation matrix
        transform = np.eye(4)
        transform[:3, 3] = position
        return transform
    
    def _export_scene(self, scene: trimesh.Scene, room_type: str) -> str:
        """Export scene to GLB file."""
        output_dir = Path(__file__).parent / "output"
        output_dir.mkdir(exist_ok=True)
        
        output_path = output_dir / f"{room_type}_{int(time.time())}.glb"
        scene.export(str(output_path))
        return str(output_path)

    def _get_room_template(self, room_type: str) -> Dict:
        """Get room template configuration."""
        if room_type not in self.room_templates:
            raise ValueError(f"Unknown room type: {room_type}")
        return self.room_templates[room_type]
    
    def _create_base_template(self, size: int) -> Image.Image:
        """Create a base template with walls and grid lines."""
        # Create blank image
        image = Image.new('RGB', (size, size), color='white')
        draw = ImageDraw.Draw(image)
        
        # Draw outer walls
        margin = size // 8
        draw.rectangle(
            [(margin, margin), (size - margin, size - margin)],
            outline='black',
            width=2
        )
        
        # Draw grid lines
        grid_spacing = size // 16
        for i in range(1, 16):
            # Vertical lines
            draw.line(
                [(margin + i * grid_spacing, margin),
                 (margin + i * grid_spacing, size - margin)],
                fill='gray',
                width=1
            )
            # Horizontal lines
            draw.line(
                [(margin, margin + i * grid_spacing),
                 (size - margin, margin + i * grid_spacing)],
                fill='gray',
                width=1
            )
        
        return image 