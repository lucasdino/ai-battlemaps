import numpy as np
from typing import Tuple, List, Dict, Any
import torch
from noise import pnoise2, snoise2
import logging
from pathlib import Path
import json
import yaml
from PIL import Image
import io
import base64

logger = logging.getLogger(__name__)

def generate_noise(
    shape: Tuple[int, int],
    scale: float,
    octaves: int = 6,
    persistence: float = 0.5,
    lacunarity: float = 2.0,
    seed: int = None,
    noise_type: str = 'perlin'
) -> np.ndarray:
    """Generate noise map with specified parameters"""
    noise_func = pnoise2 if noise_type == 'perlin' else snoise2
    
    # Create coordinate grids
    x = np.linspace(0, shape[1]/scale, shape[1])
    y = np.linspace(0, shape[0]/scale, shape[0])
    X, Y = np.meshgrid(x, y)
    
    # Vectorized noise generation
    noise = np.vectorize(lambda x, y: noise_func(
        x, y,
        octaves=octaves,
        persistence=persistence,
        lacunarity=lacunarity,
        repeatx=shape[1],
        repeaty=shape[0],
        base=seed if seed is not None else np.random.randint(0, 1000000)
    ))(X, Y)
    
    return noise

def blend_noise(
    noise1: np.ndarray,
    noise2: np.ndarray,
    blend_factor: float
) -> np.ndarray:
    """Blend two noise maps with specified factor"""
    return noise1 * (1 - blend_factor) + noise2 * blend_factor

def normalize_array(arr: np.ndarray) -> np.ndarray:
    """Normalize array to 0-1 range"""
    return (arr - arr.min()) / (arr.max() - arr.min())

def calculate_distance_field(
    occupied: np.ndarray,
    metric: str = 'euclidean'
) -> np.ndarray:
    """Calculate distance field from occupied spaces"""
    from scipy.ndimage import distance_transform_edt
    
    if metric == 'euclidean':
        return distance_transform_edt(1 - occupied)
    else:
        raise ValueError(f"Unsupported metric: {metric}")

def get_environmental_fit(
    elevation: float,
    moisture: float,
    ranges: Dict[str, Tuple[float, float]]
) -> float:
    """Calculate environmental fit score"""
    elevation_fit = 1 - abs(elevation - np.mean(ranges['elevation_range']))
    moisture_fit = 1 - abs(moisture - np.mean(ranges['moisture_range']))
    return (elevation_fit + moisture_fit) / 2

def save_texture(
    texture: Image.Image,
    path: Path,
    format: str = 'PNG',
    quality: int = 95
):
    """Save texture to file"""
    path.parent.mkdir(parents=True, exist_ok=True)
    texture.save(path, format=format, quality=quality)

def texture_to_base64(texture: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    texture.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

def texture_to_data_uri(texture: Image.Image) -> str:
    """Convert PIL Image to data URI"""
    return f"data:image/png;base64,{texture_to_base64(texture)}"

def load_config(path: Path) -> Dict:
    """Load configuration from file"""
    with open(path, 'r') as f:
        if path.suffix == '.yaml' or path.suffix == '.yml':
            return yaml.safe_load(f)
        elif path.suffix == '.json':
            return json.load(f)
        else:
            raise ValueError(f"Unsupported config format: {path.suffix}")

def save_config(config: Dict, path: Path):
    """Save configuration to file"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        if path.suffix == '.yaml' or path.suffix == '.yml':
            yaml.dump(config, f, default_flow_style=False)
        elif path.suffix == '.json':
            json.dump(config, f, indent=2)
        else:
            raise ValueError(f"Unsupported config format: {path.suffix}")

def validate_config(config: Dict) -> List[str]:
    """Validate configuration dictionary"""
    errors = []
    # TODO
    
    
    return errors

def setup_logging(
    level: str = 'INFO',
    log_file: Path = None,
    format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level),
        format=format,
        filename=log_file,
        filemode='a' if log_file else None
    )

def cleanup_gpu():
    """Cleanup GPU memory"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def get_gpu_memory_usage() -> Dict[str, float]:
    """Get GPU memory usage in MB"""
    if not torch.cuda.is_available():
        return {}
    
    return {
        f"GPU {i}": torch.cuda.memory_allocated(i) / 1024**2
        for i in range(torch.cuda.device_count())
    }

def log_gpu_memory_usage():
    """Log GPU memory usage"""
    if not torch.cuda.is_available():
        logger.info("No GPU available")
        return
    
    for device, memory in get_gpu_memory_usage().items():
        logger.info(f"{device} memory usage: {memory:.2f} MB")

def to_json_serializable(data: Any, depth: int = 0, max_depth: int = 10, seen: set = None) -> Any:
    """Convert data to JSON serializable format
    
    Args:
        data: Data to convert (can be any type)
        depth: Current recursion depth
        max_depth: Maximum recursion depth
        seen: Set of already seen objects to handle circular references
        
    Returns:
        JSON serializable version of the data
    """
    if seen is None:
        seen = set()
    
    # Check recursion depth
    if depth > max_depth:
        return str(data)
    
    # Handle circular references
    if id(data) in seen:
        return str(data)
    
    # Add current object to seen set
    seen.add(id(data))
    
    try:
        if isinstance(data, np.ndarray):
            return data.tolist()
        elif isinstance(data, dict):
            return {k: to_json_serializable(v, depth + 1, max_depth, seen) for k, v in data.items()}
        elif isinstance(data, (list, tuple)):
            return [to_json_serializable(item, depth + 1, max_depth, seen) for item in data]
        elif isinstance(data, (int, float, str, bool, type(None))):
            return data
        elif hasattr(data, '__dict__'):
            return to_json_serializable(data.__dict__, depth + 1, max_depth, seen)
        else:
            return str(data)
    finally:
        # Remove current object from seen set
        seen.remove(id(data)) 