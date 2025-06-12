import torch
import numpy as np
from PIL import Image
import cv2
import logging
from pathlib import Path
from controlnet.interfaces import ISegmenter, IAssetMapper
from typing import Dict, List, Any, Tuple

class AssetMapper(IAssetMapper):
    def __init__(self, assets_dir: Path):
        self.logger = logging.getLogger(__name__)
        self.assets_dir = assets_dir
        self.assets = self._load_assets()
    
    def _load_assets(self) -> Dict:
        """Load available 3D assets."""
        assets = {}
        models_dir = self.assets_dir / "models"
        
        # Load all GLB files in the models directory
        for model_file in models_dir.glob("*.glb"):
            asset_name = model_file.stem
            assets[asset_name] = {
                'path': str(model_file),
                'type': self._determine_asset_type(asset_name),
                'scale': self._get_asset_scale(asset_name)
            }
        
        return assets
    
    def _determine_asset_type(self, asset_name: str) -> str:
        """Determine the type of asset based on its name."""
        # Simple mapping based on asset names
        if 'chair' in asset_name:
            return 'chair'
        elif 'table' in asset_name:
            return 'table'
        elif 'chest' in asset_name:
            return 'chest'
        elif 'torch' in asset_name:
            return 'torch'
        elif 'fireplace' in asset_name:
            return 'fireplace'
        elif 'barrel' in asset_name:
            return 'barrel'
        elif 'pillar' in asset_name:
            return 'pillar'
        elif 'throne' in asset_name:
            return 'throne'
        return 'decoration'
    
    def _get_asset_scale(self, asset_name: str) -> float:
        """Get appropriate scale for asset."""
        # Default scales for different asset types
        scales = {
            'chair': 0.5,
            'table': 1.0,
            'chest': 0.7,
            'torch': 0.3,
            'fireplace': 1.2,
            'barrel': 0.4,
            'pillar': 1.5,
            'throne': 1.0,
            'decoration': 0.3
        }
        return scales.get(self._determine_asset_type(asset_name), 1.0)
    
    def map_segment_to_asset(self, segment: Dict) -> Dict:
        """Map a segment to a predefined 3D asset."""
        # Get segment properties
        area = segment['area']
        bbox = segment['bbox']
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        aspect_ratio = width / height if height > 0 else 0
        
        # Determine asset type based on segment properties
        if area > 10000:  # Large area
            if aspect_ratio > 1.5:  # Wide rectangle
                return self._get_asset('table')
            elif aspect_ratio < 0.7:  # Tall rectangle
                return self._get_asset('pillar')
            else:
                return self._get_asset('chest')
        elif area > 5000:  # Medium area
            if aspect_ratio > 1.2:
                return self._get_asset('chair')
            else:
                return self._get_asset('barrel')
        else:  # Small area
            if aspect_ratio > 1.5:
                return self._get_asset('torch')
            else:
                return self._get_asset('decoration')
    
    def _get_asset(self, asset_type: str) -> Dict:
        """Get a random asset of the specified type."""
        matching_assets = [
            asset for asset in self.assets.values()
            if asset['type'] == asset_type
        ]
        if matching_assets:
            return np.random.choice(matching_assets)
        return None
    
    def get_asset_placement(self, segment: Dict, room_type: str) -> Tuple[float, float, float]:
        """Get 3D placement coordinates for an asset."""
        # Get segment center
        bbox = segment['bbox']
        center_x = (bbox[0] + bbox[2]) / 2
        center_y = (bbox[1] + bbox[3]) / 2
        
        # Convert to 3D coordinates
        x = center_x / 512  # Normalize to 0-1
        y = center_y / 512
        z = 0  # Place on floor
        
        # Adjust height based on asset type
        if segment.get('asset', {}).get('type') == 'torch':
            z = 1.5  # Place torches on walls
        elif segment.get('asset', {}).get('type') == 'pillar':
            z = 0.5  # Place pillars partially in floor
        
        return (x, y, z)

class Segmenter(ISegmenter):
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.asset_mapper = AssetMapper(Path(__file__).parent / "assets")
    
    def segment_room(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Segment room image into regions and map to assets."""
        try:
            # Convert PIL image to numpy array
            image_np = np.array(image)
            
            # Convert to grayscale
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
            
            # Apply threshold to get binary image
            _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            
            # Find contours
            contours, _ = cv2.findContours(
                binary,
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )
            
            # Process each contour
            segments = []
            for contour in contours:
                # Get contour properties
                area = cv2.contourArea(contour)
                bbox = cv2.boundingRect(contour)
                
                # Skip very small contours
                if area < 100:
                    continue
                
                # Create segment
                segment = {
                    'contour': contour,
                    'area': area,
                    'bbox': bbox,
                    'center': (
                        bbox[0] + bbox[2] // 2,
                        bbox[1] + bbox[3] // 2
                    )
                }
                
                # Map to asset
                asset = self.asset_mapper.map_segment_to_asset(segment)
                if asset:
                    segment['asset'] = asset
                    segment['placement'] = self.asset_mapper.get_asset_placement(
                        segment,
                        'dungeon'  # Default room type
                    )
                    segments.append(segment)
            
            return segments
            
        except Exception as e:
            self.logger.error(f"Error segmenting room: {str(e)}")
            raise 