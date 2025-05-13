from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from pathlib import Path
import json
import logging
from PIL import Image, ImageEnhance, ImageFilter
import torch
import torch.nn.functional as F

logger = logging.getLogger(__name__)

@dataclass
class VisualStyle:
    """Template for a visual style with post-processing properties"""
    name: str
    description: str
    brightness: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    sharpness: float = 1.0
    blur_radius: float = 0.0
    noise_amount: float = 0.0
    color_temperature: float = 0.0  # -1.0 (cool) to 1.0 (warm)
    vignette_strength: float = 0.0
    style_tags: List[str] = None

class VisualProcessor:
    """Handles visual effects and post-processing"""
    
    def __init__(self):
        """Initialize visual processor"""
        self.styles: Dict[str, VisualStyle] = {}
        self._load_default_styles()
    
    def _load_default_styles(self):
        """Load default visual styles"""
        default_styles = {
            'realistic': VisualStyle(
                name='realistic',
                description='Natural-looking style with balanced colors',
                brightness=1.0,
                contrast=1.1,
                saturation=1.0,
                sharpness=1.2,
                blur_radius=0.0,
                noise_amount=0.02,
                color_temperature=0.0,
                vignette_strength=0.1,
                style_tags=['natural', 'balanced']
            ),
            'fantasy': VisualStyle(
                name='fantasy',
                description='Vibrant style with enhanced colors',
                brightness=1.1,
                contrast=1.2,
                saturation=1.3,
                sharpness=1.1,
                blur_radius=0.5,
                noise_amount=0.01,
                color_temperature=0.2,
                vignette_strength=0.2,
                style_tags=['vibrant', 'magical']
            ),
            'gritty': VisualStyle(
                name='gritty',
                description='Dark and moody style with high contrast',
                brightness=0.9,
                contrast=1.3,
                saturation=0.8,
                sharpness=1.4,
                blur_radius=0.0,
                noise_amount=0.05,
                color_temperature=-0.2,
                vignette_strength=0.3,
                style_tags=['dark', 'moody']
            ),
            'cartoon': VisualStyle(
                name='cartoon',
                description='Stylized look with bold colors',
                brightness=1.2,
                contrast=1.4,
                saturation=1.5,
                sharpness=1.3,
                blur_radius=1.0,
                noise_amount=0.0,
                color_temperature=0.1,
                vignette_strength=0.0,
                style_tags=['stylized', 'bold']
            ),
            'noir': VisualStyle(
                name='noir',
                description='Black and white style with high contrast',
                brightness=0.8,
                contrast=1.5,
                saturation=0.0,
                sharpness=1.2,
                blur_radius=0.0,
                noise_amount=0.03,
                color_temperature=0.0,
                vignette_strength=0.4,
                style_tags=['monochrome', 'dramatic']
            )
        }
        
        for style in default_styles.values():
            self.add_style(style)
    
    def add_style(self, style: VisualStyle):
        """Add a new visual style"""
        self.styles[style.name] = style
    
    def get_style(self, name: str) -> Optional[VisualStyle]:
        """Get visual style by name"""
        return self.styles.get(name)
    
    def apply_style(
        self,
        image: Image.Image,
        style: VisualStyle,
        high_res: bool = False
    ) -> Image.Image:
        """Apply visual style to image"""
        # Convert to float for processing
        img_array = np.array(image).astype(np.float32) / 255.0
        
        # Apply brightness
        if style.brightness != 1.0:
            img_array = img_array * style.brightness
        
        # Apply contrast
        if style.contrast != 1.0:
            mean = np.mean(img_array)
            img_array = mean + (img_array - mean) * style.contrast
        
        # Apply saturation
        if style.saturation != 1.0:
            hsv = self._rgb_to_hsv(img_array)
            hsv[..., 1] = np.clip(hsv[..., 1] * style.saturation, 0, 1)
            img_array = self._hsv_to_rgb(hsv)
        
        # Apply color temperature
        if style.color_temperature != 0.0:
            img_array = self._adjust_color_temperature(img_array, style.color_temperature)
        
        # Convert back to PIL Image
        img_array = np.clip(img_array * 255, 0, 255).astype(np.uint8)
        image = Image.fromarray(img_array)
        
        # Apply sharpness
        if style.sharpness != 1.0:
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(style.sharpness)
        
        # Apply blur
        if style.blur_radius > 0:
            image = image.filter(ImageFilter.GaussianBlur(style.blur_radius))
        
        # Apply noise
        if style.noise_amount > 0:
            noise = np.random.normal(0, style.noise_amount, image.size + (3,))
            img_array = np.array(image).astype(np.float32) / 255.0
            img_array = np.clip(img_array + noise, 0, 1)
            image = Image.fromarray((img_array * 255).astype(np.uint8))
        
        # Apply vignette
        if style.vignette_strength > 0:
            image = self._apply_vignette(image, style.vignette_strength)
        
        # Upscale if high resolution requested
        if high_res:
            image = image.resize(
                (image.width * 2, image.height * 2),
                Image.LANCZOS
            )
        
        return image
    
    def _rgb_to_hsv(self, rgb: np.ndarray) -> np.ndarray:
        """Convert RGB to HSV color space"""
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        
        maxc = np.maximum(np.maximum(r, g), b)
        minc = np.minimum(np.minimum(r, g), b)
        v = maxc
        
        deltac = maxc - minc
        s = np.zeros_like(v)
        s[maxc != 0] = deltac[maxc != 0] / maxc[maxc != 0]
        
        h = np.zeros_like(v)
        rc = (maxc - r) / (deltac + 1e-6)
        gc = (maxc - g) / (deltac + 1e-6)
        bc = (maxc - b) / (deltac + 1e-6)
        
        h[maxc == r] = bc[maxc == r] - gc[maxc == r]
        h[maxc == g] = 2.0 + rc[maxc == g] - bc[maxc == g]
        h[maxc == b] = 4.0 + gc[maxc == b] - rc[maxc == b]
        
        h = (h / 6.0) % 1.0
        
        return np.stack([h, s, v], axis=-1)
    
    def _hsv_to_rgb(self, hsv: np.ndarray) -> np.ndarray:
        """Convert HSV to RGB color space"""
        h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
        
        i = np.floor(h * 6.0)
        f = (h * 6.0) - i
        p = v * (1.0 - s)
        q = v * (1.0 - s * f)
        t = v * (1.0 - s * (1.0 - f))
        i = i % 6
        
        rgb = np.zeros_like(hsv)
        rgb[i == 0] = np.stack([v, t, p], axis=-1)[i == 0]
        rgb[i == 1] = np.stack([q, v, p], axis=-1)[i == 1]
        rgb[i == 2] = np.stack([p, v, t], axis=-1)[i == 2]
        rgb[i == 3] = np.stack([p, q, v], axis=-1)[i == 3]
        rgb[i == 4] = np.stack([t, p, v], axis=-1)[i == 4]
        rgb[i == 5] = np.stack([v, p, q], axis=-1)[i == 5]
        
        return rgb
    
    def _adjust_color_temperature(
        self,
        img_array: np.ndarray,
        temperature: float
    ) -> np.ndarray:
        """Adjust color temperature of image"""
        # Temperature ranges from -1.0 (cool) to 1.0 (warm)
        if temperature > 0:
            # Warm: increase red, decrease blue
            img_array[..., 0] = np.clip(img_array[..., 0] * (1 + temperature * 0.2), 0, 1)
            img_array[..., 2] = np.clip(img_array[..., 2] * (1 - temperature * 0.1), 0, 1)
        else:
            # Cool: increase blue, decrease red
            img_array[..., 2] = np.clip(img_array[..., 2] * (1 - temperature * 0.2), 0, 1)
            img_array[..., 0] = np.clip(img_array[..., 0] * (1 + temperature * 0.1), 0, 1)
        
        return img_array
    
    def _apply_vignette(
        self,
        image: Image.Image,
        strength: float
    ) -> Image.Image:
        """Apply vignette effect to image"""
        width, height = image.size
        x = np.linspace(-1, 1, width)
        y = np.linspace(-1, 1, height)
        X, Y = np.meshgrid(x, y)
        
        # Calculate distance from center
        distance = np.sqrt(X**2 + Y**2)
        
        # Create vignette mask
        mask = 1 - np.clip(distance * strength, 0, 1)
        mask = np.expand_dims(mask, axis=-1)
        
        # Apply mask
        img_array = np.array(image).astype(np.float32) / 255.0
        img_array = img_array * mask
        
        return Image.fromarray((img_array * 255).astype(np.uint8))
    
    def save_styles(self, path: Path):
        """Save visual styles to file"""
        data = {
            name: {
                'name': style.name,
                'description': style.description,
                'brightness': style.brightness,
                'contrast': style.contrast,
                'saturation': style.saturation,
                'sharpness': style.sharpness,
                'blur_radius': style.blur_radius,
                'noise_amount': style.noise_amount,
                'color_temperature': style.color_temperature,
                'vignette_strength': style.vignette_strength,
                'style_tags': style.style_tags
            }
            for name, style in self.styles.items()
        }
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load_styles(self, path: Path):
        """Load visual styles from file"""
        with open(path, 'r') as f:
            data = json.load(f)
        
        for name, style_data in data.items():
            style = VisualStyle(
                name=style_data['name'],
                description=style_data['description'],
                brightness=style_data['brightness'],
                contrast=style_data['contrast'],
                saturation=style_data['saturation'],
                sharpness=style_data['sharpness'],
                blur_radius=style_data['blur_radius'],
                noise_amount=style_data['noise_amount'],
                color_temperature=style_data['color_temperature'],
                vignette_strength=style_data['vignette_strength'],
                style_tags=style_data['style_tags']
            )
            self.add_style(style) 