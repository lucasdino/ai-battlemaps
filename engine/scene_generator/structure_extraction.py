import numpy as np
from pathlib import Path
import json
from PIL import Image
from skimage import measure
from shapely.geometry import Polygon, mapping
from config_loader import ConfigLoader

# Initialize configuration loader
config_loader = ConfigLoader()
config_loader.override_with_env()
args = ConfigLoader.parse_args()
config_loader.override_with_args(args)
config = config_loader.get_config()

def extract_structure(biome_map_path, slope_map_path, output_dir):
    print(f"Extracting structure from: {biome_map_path}, {slope_map_path}")
    biome_map = np.array(Image.open(biome_map_path))
    slope_map = np.array(Image.open(slope_map_path))

    # Detect contours using Marching Squares
    contour_level = config['structure_extraction']['contour_level']
    contours = measure.find_contours(biome_map, level=contour_level)

    # Convert contours to polygons
    polygons = [Polygon(contour) for contour in contours if len(contour) > 2]

    # Save polygons as GeoJSON
    features = [
        {
            "type": "Feature",
            "geometry": mapping(polygon),
            "properties": {}
        }
        for polygon in polygons
    ]
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(f"{output_dir}/biome_polygons.geojson", "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)

    # Save contour data
    with open(f"{output_dir}/marching_squares_contours.json", "w") as f:
        json.dump({"contours": [contour.tolist() for contour in contours]}, f)

    print(f"Saved biome_polygons.geojson and marching_squares_contours.json to {output_dir}")

if __name__ == "__main__":
    import sys
    biome_map_path = sys.argv[1] if len(sys.argv) > 1 else "data/labels/biome_map.png"
    slope_map_path = sys.argv[2] if len(sys.argv) > 2 else "data/terrain/slope_map.png"
    output_dir = sys.argv[3] if len(sys.argv) > 3 else "data/polygons"
    extract_structure(biome_map_path, slope_map_path, output_dir) 