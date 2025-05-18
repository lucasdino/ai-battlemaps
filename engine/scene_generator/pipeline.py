import os
import sys
from pathlib import Path

# Import components from scene_generator
from scene_generator.scene_export import export_scene
from scene_generator.elevation_generation import generate_elevation

# Import components from image_scene_synthesis
from image_scene_synthesis.prompt_to_image import generate_image
from image_scene_synthesis.semantic_labeling import label_image
from image_scene_synthesis.structure_extraction import extract_structure
from image_scene_synthesis.mesh_synthesis import synthesize_mesh
from image_scene_synthesis.wfc_tiling import wfc_tiling

def run(cmd):
    print(f"\n[PIPELINE] Running: {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"[PIPELINE] Step failed: {cmd}")
        sys.exit(1)

def main(prompt):
    Path("data/images").mkdir(parents=True, exist_ok=True)
    Path("data/labels").mkdir(parents=True, exist_ok=True)
    Path("data/terrain").mkdir(parents=True, exist_ok=True)
    Path("data/polygons").mkdir(parents=True, exist_ok=True)
    Path("data/meshes").mkdir(parents=True, exist_ok=True)
    Path("data/tiles").mkdir(parents=True, exist_ok=True)
    Path("data/exports").mkdir(parents=True, exist_ok=True)

    generate_image(prompt, "data/images")
    label_image("data/images/SD_input_image.png", "data/labels")
    generate_elevation("data/labels/biome_map.png", "data/terrain")
    extract_structure("data/labels/biome_map.png", "data/terrain/slope_map.png", "data/polygons")
    synthesize_mesh("data/terrain/terrain_heightmap.npy", "data/labels/biome_map.png", "data/meshes")
    wfc_tiling("data/labels/biome_map.png", "data/tiles")
    export_scene("data/exports")
    print("\n[PIPELINE] All steps complete! See data/exports/scene_config.json")

if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A fantasy landscape with a river"
    main(prompt) 