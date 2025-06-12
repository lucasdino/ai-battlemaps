import torch
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
from diffusers import ControlNetModel, StableDiffusionControlNetPipeline
import numpy as np
from PIL import Image
import cv2
import logging
from .interfaces import ISceneAnalyzer

class SceneAnalyzer(ISceneAnalyzer):
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Initialize depth estimation model
        self.depth_processor = AutoImageProcessor.from_pretrained("Intel/dpt-large")
        self.depth_model = AutoModelForDepthEstimation.from_pretrained("Intel/dpt-large")
        if self.device == "cuda":
            self.depth_model = self.depth_model.to(self.device)
        
        # Initialize ControlNet models
        self.canny_controlnet = ControlNetModel.from_pretrained(
            "lllyasviel/sd-controlnet-canny",
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
        )
        
        self.depth_controlnet = ControlNetModel.from_pretrained(
            "lllyasviel/sd-controlnet-depth",
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
        )
        
        # Initialize pipelines
        self.canny_pipeline = StableDiffusionControlNetPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            controlnet=self.canny_controlnet,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
        )
        
        self.depth_pipeline = StableDiffusionControlNetPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            controlnet=self.depth_controlnet,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
        )
        
        if self.device == "cuda":
            self.canny_pipeline = self.canny_pipeline.to(self.device)
            self.depth_pipeline = self.depth_pipeline.to(self.device)
            self.canny_pipeline.enable_xformers_memory_efficient_attention()
            self.depth_pipeline.enable_xformers_memory_efficient_attention()
    
    def analyze_scene(self, image: Image.Image) -> dict:
        """Analyze a scene and return analysis data."""
        try:
            # Convert image to numpy array
            img_array = np.array(image)
            
            # Generate edge map
            edge_map = self._generate_edge_map(img_array)
            
            # Generate depth map
            depth_map = self._generate_depth_map(img_array)
            
            # Segment image
            segments = self._segment_image(img_array)
            
            return {
                'edge_map': edge_map,
                'depth_map': depth_map,
                'segments': segments
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing scene: {str(e)}")
            raise
    
    def _generate_edge_map(self, image: np.ndarray) -> np.ndarray:
        """Generate edge map using Canny edge detection."""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Detect edges
        edges = cv2.Canny(blurred, 50, 150)
        
        return edges
    
    def _generate_depth_map(self, image: np.ndarray) -> np.ndarray:
        """Generate depth map using simple heuristics."""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Normalize to 0-1 range
        depth = gray.astype(np.float32) / 255.0
        
        return depth
    
    def _segment_image(self, image: np.ndarray) -> list:
        """Segment image into regions."""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Apply threshold
        _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Convert contours to segments
        segments = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            segments.append({
                'bbox': [x, y, w, h],
                'center': [x + w//2, y + h//2],
                'area': cv2.contourArea(contour)
            })
        
        return segments 