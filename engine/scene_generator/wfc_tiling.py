import json
from pathlib import Path
import numpy as np
from wfc import WaveFunctionCollapse
from PIL import Image
from config_loader import ConfigLoader

# Initialize configuration loader
config_loader = ConfigLoader()
config_loader.override_with_env()
args = ConfigLoader.parse_args()
config_loader.override_with_args(args)
config = config_loader.get_config()

def wfc_tiling(biome_map_path, output_dir):
    print(f"Running WFC tiling on: {biome_map_path}")
    biome_map = np.array(Image.open(biome_map_path))

    # Define WFC parameters
    pattern_size = config['wfc_tiling']['pattern_size']
    output_size = (biome_map.shape[0], biome_map.shape[1])

    # Run WFC
    wfc = WaveFunctionCollapse(pattern_size=pattern_size, output_size=output_size)
    tilemap = wfc.run(biome_map)

    # Define tile legend
    legend = {0: "forest", 1: "river", 2: "cliff", 3: "valley"}

    # Save tilemap and legend
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(f"{output_dir}/tilemap.json", "w") as f:
        json.dump({"tilemap": tilemap.tolist()}, f)
    with open(f"{output_dir}/tile_legend.json", "w") as f:
        json.dump({"legend": legend}, f)
    print(f"Saved tilemap.json and tile_legend.json to {output_dir}")

if __name__ == "__main__":
    import sys
    biome_map_path = sys.argv[1] if len(sys.argv) > 1 else "data/labels/biome_map.png"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/tiles"
    wfc_tiling(biome_map_path, output_dir) 