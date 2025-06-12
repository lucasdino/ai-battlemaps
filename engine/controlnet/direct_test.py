#!/usr/bin/env python3
"""
Direct test of the ControlNet RoomGenerator without pipeline dependencies.
This bypasses the transformers import that's causing issues.
"""

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

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DirectRoomGenerator:
    """Direct room generator that doesn't require the full pipeline."""

    def __init__(self, model_path: str = "runwayml/stable-diffusion-v1-5"):
        self.logger = logging.getLogger(__name__)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        logger.info(f"Initializing ControlNet room generator on {self.device}...")

        # Clear CUDA cache if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

        try:
            # Initialize inpainting pipeline
            self.pipeline = StableDiffusionInpaintPipeline.from_pretrained(
                "runwayml/stable-diffusion-inpainting",
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                use_safetensors=True,
                variant="fp16" if self.device == "cuda" else None,
            ).to(self.device)

            # Enable memory optimization
            if self.device == "cuda":
                self.pipeline.enable_attention_slicing()
                self.pipeline.enable_vae_slicing()

            logger.info("✓ Stable Diffusion inpainting pipeline loaded")

        except Exception as e:
            logger.error(f"Failed to load Stable Diffusion pipeline: {e}")
            raise

        # Load room templates and rules
        self._load_templates()

        # Initialize 3D asset library
        self.asset_library = self._load_asset_library()

        logger.info("✓ Room generator initialized successfully")

    def _load_templates(self):
        """Load room templates and generation rules."""
        self.room_templates = {
            "dungeon": {
                "prompt": "top-down view of a dark dungeon room, stone walls, medieval architecture, torch lighting, detailed floor plan",
                "negative_prompt": "blurry, low quality, distorted, modern, bright lighting",
                "rules": {
                    "wall_height": 10,
                    "floor_texture": "stone",
                    "lighting": "torch",
                    "assets": ["chest", "barrel", "skeleton"],
                    "asset_rules": {
                        "chest": {"min_count": 1, "max_count": 3},
                        "barrel": {"min_count": 2, "max_count": 5},
                        "skeleton": {"min_count": 0, "max_count": 2},
                    },
                },
            },
            "tavern": {
                "prompt": "top-down view of a cozy tavern interior, wooden tables and chairs, fireplace, medieval fantasy style, detailed floor plan",
                "negative_prompt": "blurry, low quality, distorted, modern, bright lighting",
                "rules": {
                    "wall_height": 8,
                    "floor_texture": "wood",
                    "lighting": "fireplace",
                    "assets": ["table", "chair", "bar"],
                    "asset_rules": {
                        "table": {"min_count": 4, "max_count": 8},
                        "chair": {"min_count": 8, "max_count": 16},
                        "bar": {"min_count": 1, "max_count": 1},
                    },
                },
            },
            "throne": {
                "prompt": "top-down view of a grand throne room, ornate decorations, pillars, medieval architecture, detailed floor plan",
                "negative_prompt": "blurry, low quality, distorted, modern, bright lighting",
                "rules": {
                    "wall_height": 15,
                    "floor_texture": "marble",
                    "lighting": "chandelier",
                    "assets": ["throne", "pillar", "banner"],
                    "asset_rules": {
                        "throne": {"min_count": 1, "max_count": 1},
                        "pillar": {"min_count": 4, "max_count": 8},
                        "banner": {"min_count": 2, "max_count": 4},
                    },
                },
            },
        }

    def _load_asset_library(self) -> Dict:
        """Load 3D asset library from files."""
        assets_dir = Path(__file__).parent / "assets"
        assets_dir.mkdir(exist_ok=True)

        return {
            "chest": {"mesh": "chest.glb", "scale": 1.0},
            "barrel": {"mesh": "barrel.glb", "scale": 1.0},
            "skeleton": {"mesh": "skeleton.glb", "scale": 1.0},
            "table": {"mesh": "table.glb", "scale": 1.0},
            "chair": {"mesh": "chair.glb", "scale": 1.0},
            "bar": {"mesh": "bar.glb", "scale": 1.0},
            "throne": {"mesh": "throne.glb", "scale": 1.0},
            "pillar": {"mesh": "pillar.glb", "scale": 1.0},
            "banner": {"mesh": "banner.glb", "scale": 1.0},
        }

    def generate_room(
        self,
        room_type: str,
        size: int = 512,
        complexity: float = 0.5,
        custom_prompt: Optional[str] = None,
    ) -> Dict:
        """Generate a 3D room scene from user input."""
        try:
            logger.info(f"Generating {room_type} room...")

            # Get room template and rules
            template = self._get_room_template(room_type)

            # Generate 2D layout using inpainting
            logger.info("Generating 2D layout...")
            layout_image = self._generate_2d_layout(template, size, custom_prompt)

            # Generate depth map
            logger.info("Generating depth map...")
            depth_map = self._generate_depth_map(layout_image)

            # Create 3D scene
            logger.info("Creating 3D scene...")
            scene = self._create_3d_scene(layout_image, depth_map, template["rules"])

            # Export scene
            logger.info("Exporting scene...")
            output_path = self._export_scene(scene, room_type)

            return {
                "layout_image": layout_image,
                "depth_map": depth_map,
                "scene": scene,
                "output_path": output_path,
                "room_type": room_type,
                "template": template,
            }

        except Exception as e:
            self.logger.error(f"Error generating room: {str(e)}")
            raise

    def _generate_2d_layout(
        self, template: Dict, size: int, custom_prompt: Optional[str]
    ) -> Image.Image:
        """Generate 2D room layout using inpainting."""
        # Create base template with walls
        base_image = self._create_base_template(size)

        # Create mask for inpainting (everything except walls)
        mask = self._create_inpaint_mask(size)

        # Use custom prompt if provided, otherwise use template
        prompt = custom_prompt if custom_prompt else template["prompt"]

        logger.info(f"Generating with prompt: {prompt}")

        # Generate image using inpainting
        image = self.pipeline(
            prompt=prompt,
            image=base_image,
            mask_image=mask,
            negative_prompt=template["negative_prompt"],
            num_inference_steps=30,
            guidance_scale=7.5,
            width=size,
            height=size,
        ).images[0]

        return image

    def _create_base_template(self, size: int) -> Image.Image:
        """Create a base template with walls."""
        image = Image.new("RGB", (size, size), (128, 128, 128))  # Gray background
        draw = ImageDraw.Draw(image)

        # Draw room walls
        margin = size // 8
        wall_thickness = 10

        # Outer walls (dark)
        draw.rectangle([0, 0, size, size], fill=(40, 40, 40))

        # Inner floor area (lighter)
        draw.rectangle(
            [margin, margin, size - margin, size - margin], fill=(200, 180, 160)
        )

        return image

    def _create_inpaint_mask(self, size: int) -> Image.Image:
        """Create mask for inpainting (everything except walls)."""
        mask = Image.new("L", (size, size), 255)  # White = inpaint
        draw = ImageDraw.Draw(mask)

        # Draw walls as black (not to be inpainted)
        margin = size // 8

        # Keep outer border as walls (black)
        draw.rectangle([0, 0, size, margin], fill=0)  # Top wall
        draw.rectangle([0, 0, margin, size], fill=0)  # Left wall
        draw.rectangle([0, size - margin, size, size], fill=0)  # Bottom wall
        draw.rectangle([size - margin, 0, size, size], fill=0)  # Right wall

        return mask

    def _generate_depth_map(self, image: Image.Image) -> np.ndarray:
        """Generate depth map from the layout image."""
        # Convert to grayscale and create simple depth map
        gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)

        # Simple depth estimation: darker = closer, lighter = farther
        depth = (255 - gray).astype(np.float32) / 255.0

        # Smooth the depth map
        depth = cv2.GaussianBlur(depth, (5, 5), 0)

        return depth

    def _create_3d_scene(
        self, layout_image: Image.Image, depth_map: np.ndarray, rules: Dict
    ) -> trimesh.Scene:
        """Create a 3D scene from the layout and depth map."""
        scene = trimesh.Scene()

        # Create floor
        floor = self._create_floor(rules["floor_texture"])
        scene.add_geometry(floor, node_name="floor")

        # Create walls
        walls = self._create_walls(rules["wall_height"])
        scene.add_geometry(walls, node_name="walls")

        return scene

    def _create_floor(self, texture: str) -> trimesh.Trimesh:
        """Create a floor mesh."""
        # Simple floor plane
        vertices = np.array([[-5, -5, 0], [5, -5, 0], [5, 5, 0], [-5, 5, 0]])

        faces = np.array([[0, 1, 2], [0, 2, 3]])

        return trimesh.Trimesh(vertices=vertices, faces=faces)

    def _create_walls(self, height: float) -> trimesh.Trimesh:
        """Create wall meshes."""
        wall_vertices = []
        wall_faces = []

        # Simple box walls
        room_size = 5
        wall_thickness = 0.2

        # Front wall
        wall_verts = np.array(
            [
                [-room_size, -room_size, 0],
                [-room_size, -room_size, height],
                [room_size, -room_size, height],
                [room_size, -room_size, 0],
            ]
        )

        wall_vertices.extend(wall_verts)
        base_idx = len(wall_vertices) - 4
        wall_faces.extend(
            [
                [base_idx, base_idx + 1, base_idx + 2],
                [base_idx, base_idx + 2, base_idx + 3],
            ]
        )

        return trimesh.Trimesh(
            vertices=np.array(wall_vertices), faces=np.array(wall_faces)
        )

    def _export_scene(self, scene: trimesh.Scene, room_type: str) -> str:
        """Export the 3D scene to file."""
        output_dir = Path("../../output/controlnet_examples")
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{room_type}_scene.glb"
        scene.export(str(output_path))

        return str(output_path)

    def _get_room_template(self, room_type: str) -> Dict:
        """Get room template by type."""
        return self.room_templates.get(room_type, self.room_templates["dungeon"])


def test_controlnet_generation():
    """Test the ControlNet room generation system."""

    logger.info("Starting ControlNet room generation test...")

    try:
        # Initialize generator
        generator = DirectRoomGenerator()

        # Test cases
        test_cases = [
            {
                "room_type": "dungeon",
                "custom_prompt": "dark dungeon room with torches and treasure chest",
                "description": "Dark Dungeon with Torches and Treasure",
            },
            {
                "room_type": "tavern",
                "custom_prompt": "cozy tavern with wooden tables and fireplace",
                "description": "Cozy Tavern with Fireplace",
            },
            {
                "room_type": "throne",
                "custom_prompt": "grand throne room with pillars and ornate decorations",
                "description": "Grand Throne Room with Pillars",
            },
        ]

        results = []
        output_dir = Path("../../output/controlnet_examples")
        output_dir.mkdir(parents=True, exist_ok=True)

        for i, test_case in enumerate(test_cases, 1):
            logger.info(f"\n{'='*50}")
            logger.info(f"Test {i}: {test_case['description']}")
            logger.info(f"{'='*50}")

            start_time = time.time()

            try:
                # Generate room
                result = generator.generate_room(
                    room_type=test_case["room_type"],
                    size=512,
                    complexity=0.5,
                    custom_prompt=test_case["custom_prompt"],
                )

                generation_time = time.time() - start_time

                # Save layout image
                layout_path = (
                    output_dir / f"test_{i}_{test_case['room_type']}_layout.png"
                )
                result["layout_image"].save(layout_path)

                # Save depth map
                depth_path = output_dir / f"test_{i}_{test_case['room_type']}_depth.png"
                depth_normalized = (
                    (result["depth_map"] - result["depth_map"].min())
                    / (result["depth_map"].max() - result["depth_map"].min())
                    * 255
                ).astype(np.uint8)
                depth_image = Image.fromarray(depth_normalized)
                depth_image.save(depth_path)

                # Record results
                test_result = {
                    "test_id": i,
                    "room_type": test_case["room_type"],
                    "description": test_case["description"],
                    "custom_prompt": test_case["custom_prompt"],
                    "generation_time_seconds": round(generation_time, 3),
                    "layout_image_path": str(layout_path),
                    "depth_map_path": str(depth_path),
                    "scene_path": result["output_path"],
                    "success": True,
                }

                results.append(test_result)

                logger.info(f"✓ Generated successfully in {generation_time:.3f}s")
                logger.info(f"✓ Layout image: {layout_path}")
                logger.info(f"✓ Depth map: {depth_path}")
                logger.info(f"✓ 3D scene: {result['output_path']}")

            except Exception as e:
                generation_time = time.time() - start_time
                logger.error(f"✗ Failed: {e}")

                test_result = {
                    "test_id": i,
                    "room_type": test_case["room_type"],
                    "description": test_case["description"],
                    "custom_prompt": test_case["custom_prompt"],
                    "generation_time_seconds": round(generation_time, 3),
                    "error": str(e),
                    "success": False,
                }

                results.append(test_result)

        # Save results
        results_path = output_dir / "controlnet_test_results.json"
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2)

        # Create report
        create_test_report(results, output_dir)

        return results

    except Exception as e:
        logger.error(f"Failed to initialize ControlNet system: {e}")
        import traceback

        traceback.print_exc()
        return None


def create_test_report(results, output_dir):
    """Create a test report."""

    report_path = output_dir / "CONTROLNET_REPORT.md"
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]

    with open(report_path, "w") as f:
        f.write("# ControlNet Room Generation Test Report\n\n")
        f.write(
            "This report documents testing of the ControlNet-based room generation system.\n\n"
        )

        f.write("## System Architecture\n\n")
        f.write("The ControlNet system uses:\n")
        f.write(
            "- **Stable Diffusion Inpainting**: `runwayml/stable-diffusion-inpainting`\n"
        )
        f.write("- **Framework**: PyTorch with CUDA acceleration\n")
        f.write(
            "- **Pipeline**: 2D layout generation → depth mapping → 3D scene construction\n"
        )
        f.write("- **Output**: PNG layouts, depth maps, and GLB 3D scenes\n\n")

        f.write("## Test Results\n\n")
        f.write(f"- **Total Tests**: {len(results)}\n")
        f.write(f"- **Successful**: {len(successful)}\n")
        f.write(f"- **Failed**: {len(failed)}\n")

        if successful:
            avg_time = sum(r["generation_time_seconds"] for r in successful) / len(
                successful
            )
            f.write(f"- **Average Generation Time**: {avg_time:.3f}s\n")

        f.write("\n## Generated Examples\n\n")

        for result in successful:
            f.write(f"### {result['description']}\n\n")
            f.write(f"- **Room Type**: {result['room_type']}\n")
            f.write(f"- **Prompt**: {result['custom_prompt']}\n")
            f.write(f"- **Generation Time**: {result['generation_time_seconds']}s\n")
            f.write(f"- **Layout Image**: `{Path(result['layout_image_path']).name}`\n")
            f.write(f"- **Depth Map**: `{Path(result['depth_map_path']).name}`\n")
            f.write(f"- **3D Scene**: `{Path(result['scene_path']).name}`\n\n")

        if failed:
            f.write("## Failed Tests\n\n")
            for result in failed:
                f.write(f"### {result['description']} (FAILED)\n\n")
                f.write(f"- **Error**: {result['error']}\n\n")

    logger.info(f"✓ Report saved to: {report_path}")


if __name__ == "__main__":
    results = test_controlnet_generation()

    if results:
        successful = sum(1 for r in results if r["success"])
        total = len(results)

        print(f"\n{'='*50}")
        print("CONTROLNET TEST COMPLETED")
        print(f"{'='*50}")
        print(f"Success Rate: {successful}/{total} ({successful/total*100:.1f}%)")

        if successful > 0:
            avg_time = (
                sum(r["generation_time_seconds"] for r in results if r["success"])
                / successful
            )
            print(f"Average Generation Time: {avg_time:.3f}s")

        print("Results saved to: output/controlnet_examples/")
    else:
        print("ControlNet test failed to initialize")
