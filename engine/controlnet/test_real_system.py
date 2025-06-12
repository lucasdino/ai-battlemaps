#!/usr/bin/env python3
"""
Test script for the real ControlNet room generation system.
This bypasses the transformers dependency that was causing issues.
"""

import sys
from pathlib import Path
import logging
import time
import json

# Add the engine directory to Python path
engine_dir = Path(__file__).parent.parent
sys.path.append(str(engine_dir))

# Import only the components we can use without transformers
from controlnet.room_generator import RoomGenerator
from controlnet.segmenter import Segmenter
from controlnet.scene_builder import SceneBuilder

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SimplifiedRoomPipeline:
    """Simplified pipeline that doesn't require transformers."""

    def __init__(self):
        logger.info("Initializing ControlNet room generation pipeline...")

        try:
            # Initialize components
            self.room_generator = RoomGenerator()
            self.segmenter = Segmenter()
            self.scene_builder = SceneBuilder()

            logger.info("✓ Pipeline initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize pipeline: {e}")
            raise

    def generate_room_examples(self):
        """Generate example rooms for the report."""

        # Create output directory
        output_dir = Path("../../output/controlnet_examples")
        output_dir.mkdir(parents=True, exist_ok=True)

        # Test cases with different room types and prompts
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

        logger.info("Generating room examples...")
        logger.info("=" * 50)

        for i, test_case in enumerate(test_cases, 1):
            logger.info(f"\nTest Case {i}: {test_case['description']}")
            logger.info(f"Room Type: {test_case['room_type']}")
            logger.info(f"Prompt: {test_case['custom_prompt']}")

            start_time = time.time()

            try:
                # Generate room using the real system
                result = self.room_generator.generate_room(
                    room_type=test_case["room_type"],
                    size=512,
                    complexity=0.5,
                    custom_prompt=test_case["custom_prompt"],
                )

                # Save the layout image
                layout_path = (
                    output_dir / f"room_{i}_{test_case['room_type']}_layout.png"
                )
                result["layout_image"].save(layout_path)

                # Save the depth map if available
                if "depth_map" in result and result["depth_map"] is not None:
                    import numpy as np
                    from PIL import Image

                    # Convert depth map to image
                    depth_normalized = (
                        (result["depth_map"] - result["depth_map"].min())
                        / (result["depth_map"].max() - result["depth_map"].min())
                        * 255
                    ).astype(np.uint8)
                    depth_image = Image.fromarray(depth_normalized)
                    depth_path = (
                        output_dir / f"room_{i}_{test_case['room_type']}_depth.png"
                    )
                    depth_image.save(depth_path)
                else:
                    depth_path = None

                generation_time = time.time() - start_time

                # Create result record
                test_result = {
                    "test_id": i,
                    "room_type": test_case["room_type"],
                    "custom_prompt": test_case["custom_prompt"],
                    "description": test_case["description"],
                    "generation_time_seconds": round(generation_time, 3),
                    "layout_image_path": str(layout_path),
                    "depth_map_path": str(depth_path) if depth_path else None,
                    "output_scene_path": result.get("output_path"),
                    "success": True,
                }

                results.append(test_result)

                logger.info(f"✓ Generated successfully in {generation_time:.3f}s")
                logger.info(f"✓ Layout saved to: {layout_path}")
                if depth_path:
                    logger.info(f"✓ Depth map saved to: {depth_path}")
                if result.get("output_path"):
                    logger.info(f"✓ 3D scene saved to: {result['output_path']}")

            except Exception as e:
                generation_time = time.time() - start_time
                logger.error(f"✗ Failed to generate room: {e}")

                # Record the failure
                test_result = {
                    "test_id": i,
                    "room_type": test_case["room_type"],
                    "custom_prompt": test_case["custom_prompt"],
                    "description": test_case["description"],
                    "generation_time_seconds": round(generation_time, 3),
                    "error": str(e),
                    "success": False,
                }

                results.append(test_result)

        # Save comprehensive results
        results_path = output_dir / "controlnet_test_results.json"
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2)

        # Create report
        self._create_report(results, output_dir)

        return results

    def _create_report(self, results, output_dir):
        """Create a detailed report of the test results."""

        report_path = output_dir / "CONTROLNET_TEST_REPORT.md"

        successful_tests = [r for r in results if r["success"]]
        failed_tests = [r for r in results if not r["success"]]

        with open(report_path, "w") as f:
            f.write("# ControlNet Room Generation Test Report\n\n")
            f.write(
                "This report documents the testing of the ControlNet-based room generation system.\n\n"
            )

            f.write("## System Overview\n\n")
            f.write(
                "The ControlNet system uses Stable Diffusion inpainting to generate top-down room layouts:\n\n"
            )
            f.write("- **Room Generator**: Uses Stable Diffusion inpainting pipeline\n")
            f.write("- **Layout Creation**: Generates 2D top-down room layouts\n")
            f.write("- **Depth Mapping**: Creates depth maps for 3D scene generation\n")
            f.write(
                "- **3D Scene Building**: Converts 2D layouts to 3D scenes with trimesh\n"
            )
            f.write(
                "- **Asset Integration**: Places 3D assets based on room templates\n\n"
            )

            f.write("## Test Results Summary\n\n")
            f.write(f"- **Total Tests**: {len(results)}\n")
            f.write(f"- **Successful**: {len(successful_tests)}\n")
            f.write(f"- **Failed**: {len(failed_tests)}\n")

            if successful_tests:
                avg_time = sum(
                    r["generation_time_seconds"] for r in successful_tests
                ) / len(successful_tests)
                total_time = sum(r["generation_time_seconds"] for r in successful_tests)
                f.write(f"- **Average Generation Time**: {avg_time:.3f}s\n")
                f.write(f"- **Total Generation Time**: {total_time:.3f}s\n")

            f.write("\n## Successful Generations\n\n")

            for result in successful_tests:
                f.write(f"### {result['description']}\n\n")
                f.write(f"- **Room Type**: {result['room_type']}\n")
                f.write(f"- **Prompt**: {result['custom_prompt']}\n")
                f.write(
                    f"- **Generation Time**: {result['generation_time_seconds']}s\n"
                )
                f.write(
                    f"- **Layout Image**: `{Path(result['layout_image_path']).name}`\n"
                )
                if result["depth_map_path"]:
                    f.write(
                        f"- **Depth Map**: `{Path(result['depth_map_path']).name}`\n"
                    )
                if result["output_scene_path"]:
                    f.write(
                        f"- **3D Scene**: `{Path(result['output_scene_path']).name}`\n"
                    )
                f.write("\n")

            if failed_tests:
                f.write("## Failed Generations\n\n")
                for result in failed_tests:
                    f.write(f"### {result['description']} (FAILED)\n\n")
                    f.write(f"- **Room Type**: {result['room_type']}\n")
                    f.write(f"- **Prompt**: {result['custom_prompt']}\n")
                    f.write(f"- **Error**: {result['error']}\n")
                    f.write(
                        f"- **Time to Failure**: {result['generation_time_seconds']}s\n\n"
                    )

            f.write("## Technical Details\n\n")
            f.write("The system uses the following components:\n\n")
            f.write(
                "- **Stable Diffusion Model**: `runwayml/stable-diffusion-inpainting`\n"
            )
            f.write("- **Framework**: PyTorch with CUDA acceleration\n")
            f.write("- **Image Size**: 512x512 pixels\n")
            f.write(
                "- **Inference Steps**: 30 (initial layout) + 20 (asset placement)\n"
            )
            f.write("- **Guidance Scale**: 7.5\n")
            f.write("- **Memory Optimizations**: Attention slicing, VAE slicing\n\n")

        logger.info(f"✓ Report saved to: {report_path}")


def main():
    """Main test function."""
    try:
        # Create pipeline
        pipeline = SimplifiedRoomPipeline()

        # Generate examples
        results = pipeline.generate_room_examples()

        # Print summary
        successful = sum(1 for r in results if r["success"])
        total = len(results)

        print("\n" + "=" * 50)
        print(f"✓ ControlNet testing completed!")
        print(f"✓ Success rate: {successful}/{total} ({successful/total*100:.1f}%)")

        if successful > 0:
            avg_time = (
                sum(r["generation_time_seconds"] for r in results if r["success"])
                / successful
            )
            print(f"✓ Average generation time: {avg_time:.3f}s")

        print(f"✓ Results saved to: output/controlnet_examples/")

        return results

    except Exception as e:
        logger.error(f"Test failed: {e}")
        return None


if __name__ == "__main__":
    main()
