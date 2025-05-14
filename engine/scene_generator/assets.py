from typing import Dict, List, Tuple, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import noise
import colorsys
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class AssetGenerator:
    def __init__(self, output_dir: str = "assets"):
        """Initialize asset generator
        
        Args:
            output_dir: Directory to save generated assets
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.output_dir / "textures").mkdir(exist_ok=True)
        (self.output_dir / "models").mkdir(exist_ok=True)
        
        # Initialize texture sizes
        self.texture_size = 1024
        self.normal_size = 1024
        
        # Initialize color palettes
        self.palettes = {
            "fantasy": {
                "water": ["#0077be", "#0099cc", "#00aaff"],
                "sand": ["#c2b280", "#e6d5a7", "#f5e6c3"],
                "grass": ["#355e3b", "#4a7c59", "#5c9c6f"],
                "mountain": ["#808080", "#a9a9a9", "#d3d3d3"],
                "tree": ["#2d5a27", "#3d7a37", "#4d9a47"],
                "rock": ["#696969", "#808080", "#a9a9a9"],
                "building": ["#8b4513", "#a0522d", "#cd853f"]
            },
            "dungeon": {
                "stone": ["#696969", "#808080", "#a9a9a9"],
                "wood": ["#8b4513", "#a0522d", "#cd853f"],
                "metal": ["#708090", "#778899", "#b0c4de"],
                "carpet": ["#800000", "#8b0000", "#a52a2a"],
                "torch": ["#ff4500", "#ff6347", "#ff7f50"]
            }
        }
    
    def generate_terrain_textures(self, style: str = "fantasy") -> Dict[str, Dict[str, str]]:
        """Generate terrain textures for the given style
        
        Returns:
            Dictionary mapping texture types to their file paths
        """
        textures = {}
        palette = self.palettes[style]
        
        # Generate water texture
        water_path = self._generate_water_texture(palette["water"])
        textures["water"] = {
            "diffuse": str(water_path),
            "normal": str(self._generate_normal_map(water_path))
        }
        
        # Generate sand texture
        sand_path = self._generate_sand_texture(palette["sand"])
        textures["sand"] = {
            "diffuse": str(sand_path),
            "normal": str(self._generate_normal_map(sand_path))
        }
        
        # Generate grass texture
        grass_path = self._generate_grass_texture(palette["grass"])
        textures["grass"] = {
            "diffuse": str(grass_path),
            "normal": str(self._generate_normal_map(grass_path))
        }
        
        # Generate mountain texture
        mountain_path = self._generate_mountain_texture(palette["mountain"])
        textures["mountain"] = {
            "diffuse": str(mountain_path),
            "normal": str(self._generate_normal_map(mountain_path))
        }
        
        return textures
    
    def generate_feature_textures(self, style: str = "fantasy") -> Dict[str, Dict[str, str]]:
        """Generate feature textures for the given style"""
        textures = {}
        palette = self.palettes[style]
        
        # Generate tree textures
        tree_path = self._generate_tree_texture(palette["tree"])
        textures["tree"] = {
            "diffuse": str(tree_path),
            "normal": str(self._generate_normal_map(tree_path))
        }
        
        # Generate rock textures
        rock_path = self._generate_rock_texture(palette["rock"])
        textures["rock"] = {
            "diffuse": str(rock_path),
            "normal": str(self._generate_normal_map(rock_path))
        }
        
        # Generate building textures
        building_path = self._generate_building_texture(palette["building"])
        textures["building"] = {
            "diffuse": str(building_path),
            "normal": str(self._generate_normal_map(building_path))
        }
        
        # Generate temple textures
        temple_path = self._generate_temple_texture(palette["building"])
        textures["temple"] = {
            "diffuse": str(temple_path),
            "normal": str(self._generate_normal_map(temple_path))
        }
        
        # Generate ruins textures
        ruins_path = self._generate_ruins_texture(palette["building"])
        textures["ruins"] = {
            "diffuse": str(ruins_path),
            "normal": str(self._generate_normal_map(ruins_path))
        }
        
        # Generate well textures
        well_path = self._generate_well_texture(palette["building"])
        textures["well"] = {
            "diffuse": str(well_path),
            "normal": str(self._generate_normal_map(well_path))
        }
        
        # Generate camp textures
        camp_path = self._generate_camp_texture(palette["building"])
        textures["camp"] = {
            "diffuse": str(camp_path),
            "normal": str(self._generate_normal_map(camp_path))
        }
        
        return textures
    
    def _generate_water_texture(self, colors: List[str]) -> Path:
        """Generate a water texture"""
        # Create base image
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate noise pattern
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/100, y/100,
                    octaves=6,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply colors
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                # Get color based on noise value
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                
                # Add some variation
                r, g, b = self._hex_to_rgb(color)
                variation = int(noise_data[y, x] * 20)
                r = max(0, min(255, r + variation))
                g = max(0, min(255, g + variation))
                b = max(0, min(255, b + variation))
                
                draw.point((x, y), fill=(r, g, b))
        
        # Apply blur for smoothness
        img = img.filter(ImageFilter.GaussianBlur(radius=2))
        
        # Save texture
        output_path = self.output_dir / "textures" / "water.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_sand_texture(self, colors: List[str]) -> Path:
        """Generate a sand texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate noise pattern
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/50, y/50,
                    octaves=4,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply colors with grain
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                # Get base color
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                
                # Add grain
                r, g, b = self._hex_to_rgb(color)
                grain = np.random.randint(-10, 10)
                r = max(0, min(255, r + grain))
                g = max(0, min(255, g + grain))
                b = max(0, min(255, b + grain))
                
                draw.point((x, y), fill=(r, g, b))
        
        # Add some larger variations
        for _ in range(100):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            size = np.random.randint(5, 15)
            color = colors[np.random.randint(0, len(colors))]
            draw.ellipse(
                (x-size, y-size, x+size, y+size),
                fill=color
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "sand.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_grass_texture(self, colors: List[str]) -> Path:
        """Generate a grass texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate base noise
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/100, y/100,
                    octaves=6,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply base color
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                draw.point((x, y), fill=color)
        
        # Add grass blades
        for _ in range(1000):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            length = np.random.randint(5, 15)
            angle = np.random.uniform(0, 360)
            
            # Calculate end point
            end_x = x + length * np.cos(np.radians(angle))
            end_y = y + length * np.sin(np.radians(angle))
            
            # Draw grass blade
            color = colors[np.random.randint(0, len(colors))]
            draw.line(
                (x, y, end_x, end_y),
                fill=color,
                width=1
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "grass.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_mountain_texture(self, colors: List[str]) -> Path:
        """Generate a mountain texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate noise pattern
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/200, y/200,
                    octaves=8,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply colors with cracks
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                # Get base color
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                
                # Add variation
                r, g, b = self._hex_to_rgb(color)
                variation = int(noise_data[y, x] * 30)
                r = max(0, min(255, r + variation))
                g = max(0, min(255, g + variation))
                b = max(0, min(255, b + variation))
                
                draw.point((x, y), fill=(r, g, b))
        
        # Add cracks
        for _ in range(50):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            length = np.random.randint(20, 100)
            angle = np.random.uniform(0, 360)
            
            # Calculate end point
            end_x = x + length * np.cos(np.radians(angle))
            end_y = y + length * np.sin(np.radians(angle))
            
            # Draw crack
            draw.line(
                (x, y, end_x, end_y),
                fill='#000000',
                width=2
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "mountain.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_normal_map(self, texture_path: Path) -> Path:
        """Generate a normal map from a texture"""
        # Load texture
        img = Image.open(texture_path)
        img = img.convert('L')  # Convert to grayscale
        
        # Calculate normal map
        width, height = img.size
        normal_map = np.zeros((height, width, 3))
        
        # Convert to numpy array
        img_array = np.array(img)
        
        # Calculate gradients
        dx = np.gradient(img_array, axis=1)
        dy = np.gradient(img_array, axis=0)
        
        # Create normal vectors
        normal_map[..., 0] = -dx
        normal_map[..., 1] = 1.0
        normal_map[..., 2] = -dy
        
        # Normalize
        norm = np.sqrt(np.sum(normal_map * normal_map, axis=2, keepdims=True))
        normal_map = normal_map / norm
        
        # Convert to image
        normal_img = Image.fromarray(
            (normal_map * 127.5 + 127.5).astype(np.uint8)
        )
        
        # Save normal map
        output_path = texture_path.parent / f"{texture_path.stem}_normal.jpg"
        normal_img.save(output_path, quality=95)
        return output_path
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _generate_tree_texture(self, colors: List[str]) -> Path:
        """Generate a tree texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate base noise
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/100, y/100,
                    octaves=6,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply base color
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                draw.point((x, y), fill=color)
        
        # Add bark texture
        for _ in range(100):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            length = np.random.randint(10, 30)
            angle = np.random.uniform(0, 360)
            
            # Calculate end point
            end_x = x + length * np.cos(np.radians(angle))
            end_y = y + length * np.sin(np.radians(angle))
            
            # Draw bark line
            color = colors[np.random.randint(0, len(colors))]
            draw.line(
                (x, y, end_x, end_y),
                fill=color,
                width=2
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "tree.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_rock_texture(self, colors: List[str]) -> Path:
        """Generate a rock texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate noise pattern
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/200, y/200,
                    octaves=8,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply colors with cracks
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                # Get base color
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                
                # Add variation
                r, g, b = self._hex_to_rgb(color)
                variation = int(noise_data[y, x] * 30)
                r = max(0, min(255, r + variation))
                g = max(0, min(255, g + variation))
                b = max(0, min(255, b + variation))
                
                draw.point((x, y), fill=(r, g, b))
        
        # Add cracks
        for _ in range(50):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            length = np.random.randint(20, 100)
            angle = np.random.uniform(0, 360)
            
            # Calculate end point
            end_x = x + length * np.cos(np.radians(angle))
            end_y = y + length * np.sin(np.radians(angle))
            
            # Draw crack
            draw.line(
                (x, y, end_x, end_y),
                fill='#000000',
                width=2
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "rock.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_building_texture(self, colors: List[str]) -> Path:
        """Generate a building texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate base noise
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/50, y/50,
                    octaves=4,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply base color
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                draw.point((x, y), fill=color)
        
        # Add wood grain
        for _ in range(200):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            length = np.random.randint(5, 20)
            angle = np.random.uniform(0, 360)
            
            # Calculate end point
            end_x = x + length * np.cos(np.radians(angle))
            end_y = y + length * np.sin(np.radians(angle))
            
            # Draw grain line
            color = colors[np.random.randint(0, len(colors))]
            draw.line(
                (x, y, end_x, end_y),
                fill=color,
                width=1
            )
        
        # Add some knots
        for _ in range(20):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            size = np.random.randint(5, 15)
            color = colors[np.random.randint(0, len(colors))]
            draw.ellipse(
                (x-size, y-size, x+size, y+size),
                fill=color
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "building.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_temple_texture(self, colors: List[str]) -> Path:
        """Generate a temple texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate base noise
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/100, y/100,
                    octaves=6,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply base color
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                draw.point((x, y), fill=color)
        
        # Add stone patterns
        for _ in range(100):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            size = np.random.randint(10, 30)
            color = colors[np.random.randint(0, len(colors))]
            draw.rectangle(
                (x-size, y-size, x+size, y+size),
                fill=color,
                outline='#000000'
            )
        
        # Add decorative elements
        for _ in range(50):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            size = np.random.randint(5, 15)
            color = colors[np.random.randint(0, len(colors))]
            draw.ellipse(
                (x-size, y-size, x+size, y+size),
                fill=color,
                outline='#000000'
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "temple.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_ruins_texture(self, colors: List[str]) -> Path:
        """Generate ruins texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate noise pattern
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/150, y/150,
                    octaves=8,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply colors with weathering
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                # Get base color
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                
                # Add weathering
                r, g, b = self._hex_to_rgb(color)
                weathering = int(noise_data[y, x] * 40)
                r = max(0, min(255, r - weathering))
                g = max(0, min(255, g - weathering))
                b = max(0, min(255, b - weathering))
                
                draw.point((x, y), fill=(r, g, b))
        
        # Add cracks and damage
        for _ in range(100):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            length = np.random.randint(20, 100)
            angle = np.random.uniform(0, 360)
            
            # Calculate end point
            end_x = x + length * np.cos(np.radians(angle))
            end_y = y + length * np.sin(np.radians(angle))
            
            # Draw crack
            draw.line(
                (x, y, end_x, end_y),
                fill='#000000',
                width=2
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "ruins.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_well_texture(self, colors: List[str]) -> Path:
        """Generate a well texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate base noise
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/100, y/100,
                    octaves=6,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply base color
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                draw.point((x, y), fill=color)
        
        # Add stone patterns
        for _ in range(200):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            size = np.random.randint(5, 15)
            color = colors[np.random.randint(0, len(colors))]
            draw.rectangle(
                (x-size, y-size, x+size, y+size),
                fill=color,
                outline='#000000'
            )
        
        # Add moss and weathering
        for _ in range(50):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            size = np.random.randint(10, 30)
            color = '#355e3b'  # Moss green
            draw.ellipse(
                (x-size, y-size, x+size, y+size),
                fill=color
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "well.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def _generate_camp_texture(self, colors: List[str]) -> Path:
        """Generate a camp texture"""
        img = Image.new('RGB', (self.texture_size, self.texture_size))
        draw = ImageDraw.Draw(img)
        
        # Generate base noise
        noise_data = np.zeros((self.texture_size, self.texture_size))
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                noise_data[y, x] = noise.pnoise2(
                    x/100, y/100,
                    octaves=6,
                    persistence=0.5,
                    lacunarity=2.0
                )
        
        # Normalize noise
        noise_data = (noise_data - noise_data.min()) / (noise_data.max() - noise_data.min())
        
        # Apply base color
        for y in range(self.texture_size):
            for x in range(self.texture_size):
                color_idx = int(noise_data[y, x] * (len(colors) - 1))
                color = colors[color_idx]
                draw.point((x, y), fill=color)
        
        # Add tent fabric texture
        for _ in range(200):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            length = np.random.randint(5, 20)
            angle = np.random.uniform(0, 360)
            
            # Calculate end point
            end_x = x + length * np.cos(np.radians(angle))
            end_y = y + length * np.sin(np.radians(angle))
            
            # Draw fabric line
            color = colors[np.random.randint(0, len(colors))]
            draw.line(
                (x, y, end_x, end_y),
                fill=color,
                width=1
            )
        
        # Add ground texture
        for _ in range(100):
            x = np.random.randint(0, self.texture_size)
            y = np.random.randint(0, self.texture_size)
            size = np.random.randint(5, 15)
            color = '#8B4513'  # Brown color for ground
            draw.ellipse(
                (x-size, y-size, x+size, y+size),
                fill=color
            )
        
        # Add fire pit texture
        center_x = self.texture_size // 2
        center_y = self.texture_size // 2
        draw.ellipse(
            (center_x-50, center_y-50, center_x+50, center_y+50),
            fill='#4A4A4A'  # Dark gray for fire pit
        )
        
        # Add some ash and ember effects
        for _ in range(50):
            x = np.random.randint(center_x-40, center_x+40)
            y = np.random.randint(center_y-40, center_y+40)
            size = np.random.randint(2, 5)
            color = '#FF4500'  # Orange-red for embers
            draw.ellipse(
                (x-size, y-size, x+size, y+size),
                fill=color
            )
        
        # Save texture
        output_path = self.output_dir / "textures" / "camp.jpg"
        img.save(output_path, quality=95)
        return output_path
    
    def generate_asset_manifest(self) -> Dict:
        """Generate asset manifest for the scene"""
        manifest = {
            "textures": {
                "terrain": {},
                "features": {},
                "props": {}
            },
            "models": {
                "features": {},
                "props": {}
            }
        }
        
        # Add terrain textures
        terrain_textures = self.generate_terrain_textures()
        manifest["textures"]["terrain"] = terrain_textures
        
        # Add feature textures
        feature_textures = self.generate_feature_textures()
        manifest["textures"]["features"] = feature_textures
        
        # Save manifest
        manifest_path = self.output_dir / "manifest.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        return manifest 