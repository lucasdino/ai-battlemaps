import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from PIL import Image
import numpy as np
from pathlib import Path
import logging
import json
from controlnet.interfaces import IRoomGenerator, ISegmenter, ISceneBuilder, IPromptParser
from controlnet.room_generator import RoomGenerator
from controlnet.segmenter import Segmenter
from controlnet.scene_builder import SceneBuilder
from diffusers import StableDiffusionInpaintPipeline, StableDiffusionControlNetPipeline, ControlNetModel
import cv2
import trimesh
import time

class PromptParser(IPromptParser):
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("gpt2")
        self.model = AutoModelForCausalLM.from_pretrained("gpt2")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cuda":
            self.model = self.model.to(self.device)
    
    def parse_prompt(self, prompt: str) -> dict:
        """Parse natural language prompt into structured data."""
        # Tokenize prompt
        inputs = self.tokenizer(prompt, return_tensors="pt")
        if self.device == "cuda":
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Generate completion
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=100,
                num_return_sequences=1,
                temperature=0.7
            )
        
        # Decode completion
        completion = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract room information
        return self._extract_room_info(completion)
    
    def _extract_room_info(self, text: str) -> dict:
        """Extract room information from generated text."""
        room_type = None
        complexity = 0.5
        custom_prompt = None
        properties = {}
        
        # Check for room type
        room_types = ['dungeon', 'tavern', 'throne']
        for type_name in room_types:
            if type_name.lower() in text.lower():
                room_type = type_name
                break
        
        if room_type is None:
            room_type = "dungeon"  # Default room type
        
        # Extract complexity
        if "complex" in text.lower():
            complexity = 0.8
        elif "simple" in text.lower():
            complexity = 0.3
        
        # Extract custom prompt
        if "with" in text.lower():
            custom_prompt = text.split("with")[-1].strip()
        
        return {
            'type': room_type,
            'complexity': complexity,
            'custom_prompt': custom_prompt,
            'properties': properties
        }

class RoomGenerationPipeline:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.room_generator = RoomGenerator()
        self.segmenter = Segmenter()
        self.scene_builder = SceneBuilder()
        
        # Load asset mappings
        self.asset_mappings = self._load_asset_mappings()
        self.texture_packs = self._load_texture_packs()
    
    def _load_asset_mappings(self) -> dict:
        """Load mappings between segmented regions and 3D assets."""
        assets_dir = Path(__file__).parent / "assets"
        mapping_file = assets_dir / "asset_mappings.json"
        
        if not mapping_file.exists():
            # Create default mappings
            mappings = {
                "chair": {
                    "model": "chair.glb",
                    "scale": 1.0,
                    "height": 1.0
                },
                "table": {
                    "model": "table.glb",
                    "scale": 1.0,
                    "height": 0.8
                },
                "chest": {
                    "model": "chest.glb",
                    "scale": 1.0,
                    "height": 0.6
                },
                "torch": {
                    "model": "torch.glb",
                    "scale": 1.0,
                    "height": 2.0
                },
                "fireplace": {
                    "model": "fireplace.glb",
                    "scale": 1.0,
                    "height": 1.5
                }
            }
            mapping_file.write_text(json.dumps(mappings, indent=2))
            return mappings
        
        return json.loads(mapping_file.read_text())
    
    def _load_texture_packs(self) -> dict:
        """Load texture packs for different room styles."""
        assets_dir = Path(__file__).parent / "assets"
        texture_file = assets_dir / "texture_packs.json"
        
        if not texture_file.exists():
            # Create default texture packs
            packs = {
                "dungeon": {
                    "floor": "stone_floor.png",
                    "wall": "stone_wall.png",
                    "ceiling": "stone_ceiling.png"
                },
                "tavern": {
                    "floor": "wooden_floor.png",
                    "wall": "wooden_wall.png",
                    "ceiling": "wooden_ceiling.png"
                },
                "throne": {
                    "floor": "marble_floor.png",
                    "wall": "marble_wall.png",
                    "ceiling": "marble_ceiling.png"
                }
            }
            texture_file.write_text(json.dumps(packs, indent=2))
            return packs
        
        return json.loads(texture_file.read_text())
    
    def generate_from_prompt(self, prompt: str, room_type: str = "dungeon") -> dict:
        """Generate a complete 3D room scene from a text prompt."""
        try:
            # 1. Generate top-down room layout
            self.logger.info("Generating room layout...")
            layout_image = self.room_generator.generate_room(
                room_type=room_type,
                size=512,
                custom_prompt=prompt
            )
            
            # 2. Segment the layout
            self.logger.info("Segmenting room layout...")
            segments = self.segmenter.segment_room(layout_image)
            
            # 3. Create 3D scene
            self.logger.info("Creating 3D scene...")
            scene = self.scene_builder.build_scene(
                room_image=layout_image,
                segments=segments,
                room_type=room_type,
                texture_pack=self.texture_packs[room_type]
            )
            
            # 4. Export scene
            self.logger.info("Exporting scene...")
            output_path = self._export_scene(scene, room_type)
            
            return {
                'layout_image': layout_image,
                'segments': segments,
                'scene': scene,
                'output_path': output_path
            }
            
        except Exception as e:
            self.logger.error(f"Error generating room: {str(e)}")
            raise
    
    def _export_scene(self, scene: trimesh.Scene, room_type: str) -> str:
        """Export scene to GLB file."""
        output_dir = Path(__file__).parent / "output"
        output_dir.mkdir(exist_ok=True)
        
        output_path = output_dir / f"{room_type}_{int(time.time())}.glb"
        scene.export(str(output_path))
        return str(output_path) 