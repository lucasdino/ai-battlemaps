import numpy as np
from PIL import Image
from pathlib import Path

def generate_elevation(biome_map_path, output_dir, biome_elevation=None, generate_slope_map=True):
    """
    Convert biome_map.png into terrain_heightmap.npy and optionally slope_map.png.
    Args:
        biome_map_path (str): Path to biome_map.png
        output_dir (str): Directory to save outputs
        biome_elevation (dict): Mapping from biome label (int) to elevation value (float)
        generate_slope_map (bool): Whether to generate slope_map.png
    """
    print(f"[elevation_generation] Generating elevation from {biome_map_path}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    biome_map = np.array(Image.open(biome_map_path).convert('L'))
    # Default mapping: 0=forest, 1=river, 2=cliff, 3=valley
    if biome_elevation is None:
        biome_elevation = {0: 0.3, 1: 0.0, 2: 1.0, 3: 0.2}
    heightmap = np.zeros_like(biome_map, dtype=np.float32)
    for label, elev in biome_elevation.items():
        heightmap[biome_map == label * 60] = elev  # assumes biome_map uses multiples of 60 for labels
    np.save(f"{output_dir}/terrain_heightmap.npy", heightmap)
    print(f"[elevation_generation] Saved terrain_heightmap.npy to {output_dir}")
    if generate_slope_map:
        # Compute slope as gradient magnitude
        dzdx = np.gradient(heightmap, axis=1)
        dzdy = np.gradient(heightmap, axis=0)
        slope = np.sqrt(dzdx**2 + dzdy**2)
        slope_img = (255 * (slope / (slope.max() + 1e-8))).astype(np.uint8)
        Image.fromarray(slope_img).save(f"{output_dir}/slope_map.png")
        print(f"[elevation_generation] Saved slope_map.png to {output_dir}") 