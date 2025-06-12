import os
import sys
from pathlib import Path
import gin

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from image_scene_synthesis.prompt_to_image import generate_image
from image_scene_synthesis.semantic_labeling import label_image
from image_scene_synthesis.structure_extraction import extract_structure
from image_scene_synthesis.mesh_synthesis import synthesize_mesh
from image_scene_synthesis.wfc_tiling import wfc_tiling
from image_scene_synthesis.scene_export import export_scene
from image_scene_synthesis.elevation_generation import generate_elevation

# Register functions with gin
gin.enter_interactive_mode()
gin.external_configurable(generate_image)
gin.external_configurable(label_image)
gin.external_configurable(extract_structure)
gin.external_configurable(synthesize_mesh)
gin.external_configurable(wfc_tiling)
gin.external_configurable(export_scene)

# Load gin config
config_path = os.path.join(os.path.dirname(__file__), "config.gin")
gin.parse_config_file(config_path)


def main(text_prompt):
    # Create output directories
    output_dirs = [
        "outputs/images",
        "outputs/labels",
        "outputs/terrain",
        "outputs/structures",
        "outputs/meshes",
        "outputs/tiles",
        "outputs/scene",
    ]

    for dir_path in output_dirs:
        os.makedirs(dir_path, exist_ok=True)

    # Run pipeline steps
    print("Step 1: Generating image from prompt...")
    image_path = generate_image(text_prompt)

    print("Step 2: Labeling image...")
    label_path = label_image(image_path)

    print("Step 2.5: Generating elevation and slope map...")
    terrain_dir = "outputs/terrain"
    generate_elevation(label_path, terrain_dir)
    heightmap_path = f"{terrain_dir}/terrain_heightmap.npy"
    slope_map_path = f"{terrain_dir}/slope_map.png"

    print("Step 3: Extracting structures...")
    structure_path = extract_structure(label_path, slope_map_path)

    print("Step 4: Synthesizing mesh...")
    mesh_path = synthesize_mesh(heightmap_path, label_path)

    print("Step 5: Performing WFC tiling...")
    tile_path = wfc_tiling(label_path)

    print("Step 6: Exporting scene...")
    scene_path = export_scene(tile_path)

    print("Pipeline completed successfully!")
    print(f"Final scene exported to: {scene_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print('Usage: python pipeline.py "text prompt"')
        sys.exit(1)

    main(sys.argv[1])
