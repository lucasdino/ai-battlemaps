import numpy as np
from PIL import Image
from pathlib import Path

def generate_elevation(biome_map_path, output_dir):
    print(f"Generating elevation from: {biome_map_path}")
    biome_map = np.array(Image.open(biome_map_path))
    heightmap = (biome_map / biome_map.max() * 255).astype(np.uint8)
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    np.save(f"{output_dir}/terrain_heightmap.npy", heightmap)
    Image.fromarray(heightmap).save(f"{output_dir}/slope_map.png")
    print(f"Saved terrain_heightmap.npy and slope_map.png to {output_dir}")

if __name__ == "__main__":
    import sys
    biome_map_path = sys.argv[1] if len(sys.argv) > 1 else "data/labels/biome_map.png"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/terrain"
    generate_elevation(biome_map_path, output_dir) 