import json
from pathlib import Path

def export_scene(output_dir):
    print(f"Exporting scene to: {output_dir}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    scene_config = {
        "terrain_mesh": "data/meshes/terrain.obj",
        "biome_map": "data/labels/biome_map.png",
        "heightmap": "data/terrain/terrain_heightmap.npy",
        "tilemap": "data/tiles/tilemap.json",
        "walkability": "data/polygons/walkability.csv",
        "biome_polygons": "data/polygons/biome_polygons.geojson",
        "adjacency_graph": "data/polygons/adjacency_graph.json"
    }
    with open(f"{output_dir}/scene_config.json", "w") as f:
        json.dump(scene_config, f, indent=2)
    print(f"Saved scene_config.json to {output_dir}")

if __name__ == "__main__":
    import sys
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "data/exports"
    export_scene(output_dir) 