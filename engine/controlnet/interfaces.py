from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from PIL import Image
import numpy as np
import trimesh

class IRoomGenerator(ABC):
    @abstractmethod
    def generate_room(self, room_type: str, size: int = 512, complexity: float = 0.5, custom_prompt: Optional[str] = None) -> Image.Image:
        """Generate a 2D room layout."""
        pass

class ISceneAnalyzer(ABC):
    @abstractmethod
    def analyze_scene(self, image: Image.Image) -> Dict:
        """Analyze a scene and return analysis data."""
        pass

class ISceneGenerator(ABC):
    @abstractmethod
    def generate_scene(self, room_image: Image.Image, 
                      depth_map: np.ndarray, segments: List[Dict], 
                      room_type: str) -> trimesh.Scene:
        """Generate a 3D scene from 2D layout."""
        pass

class IAssetManager(ABC):
    @abstractmethod
    def get_assets_by_type(self, asset_type: str) -> List[Dict]:
        """Get assets of a specific type."""
        pass
    
    @abstractmethod
    def place_asset(self, image: Image.Image, asset: Dict, 
                   position: Tuple[int, int], rotation: float) -> Image.Image:
        """Place an asset on the image."""
        pass

class ISegmenter(ABC):
    @abstractmethod
    def segment_room(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Segment room image into regions and map to assets."""
        pass

class ISceneBuilder(ABC):
    @abstractmethod
    def build_scene(self, room_image: Image.Image, segments: List[Dict[str, Any]], room_type: str) -> trimesh.Scene:
        """Build 3D scene from room image and segments."""
        pass

class IAssetMapper(ABC):
    @abstractmethod
    def map_segment_to_asset(self, segment: Dict) -> Dict:
        """Map a segment to a predefined 3D asset."""
        pass
    
    @abstractmethod
    def get_asset_placement(self, segment: Dict, room_type: str) -> Tuple[float, float, float]:
        """Get 3D placement coordinates for an asset."""
        pass

class IPromptParser(ABC):
    @abstractmethod
    def parse_prompt(self, prompt: str) -> Dict[str, Any]:
        """Parse natural language prompt into structured data."""
        pass 