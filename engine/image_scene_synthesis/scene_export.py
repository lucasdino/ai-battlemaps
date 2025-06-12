import os
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

def export_scene(output_dir, 
                 rasterize_polygons=False, 
                 smooth_biomes=False, 
                 generate_prop_mask=False, 
                 generate_normal_map=False, 
                 generate_contour_overlay=False):
    """
    Gather all generated assets and write a scene_config.json in output_dir.
    Optionally perform postprocessing steps.
    """
    scene = {}
    output_dir = Path(output_dir)
    # Gather main assets
    scene['mesh'] = str(output_dir.parent / 'meshes' / 'terrain.obj')
    scene['tilemap'] = str(output_dir.parent / 'tiles' / 'tilemap.json')
    scene['tile_legend'] = str(output_dir.parent / 'tiles' / 'tile_legend.json')
    scene['biome_map'] = str(output_dir.parent / 'labels' / 'biome_map.png')
    scene['label_map'] = str(output_dir.parent / 'labels' / 'label_map_superpixel.npy')
    scene['heightmap'] = str(output_dir.parent / 'terrain' / 'terrain_heightmap.npy')
    scene['slope_map'] = str(output_dir.parent / 'terrain' / 'slope_map.png')
    scene['polygons'] = str(output_dir.parent / 'polygons' / 'biome_polygons.geojson')
    # Optional postprocessing
    if rasterize_polygons:
        # Rasterize polygons to grid
        try:
            import geopandas as gpd
            from rasterio import features
            polygons = gpd.read_file(scene['polygons'])
            shape = np.load(scene['heightmap']).shape
            mask = features.rasterize(
                ((geom, 1) for geom in polygons.geometry),
                out_shape=shape
            )
            np.save(output_dir / 'polygon_mask.npy', mask)
            scene['polygon_mask'] = str(output_dir / 'polygon_mask.npy')
        except Exception as e:
            print(f"[scene_export] Polygon rasterization failed: {e}")
    if smooth_biomes:
        # Smooth biome boundaries
        try:
            biome_map = Image.open(scene['biome_map'])
            smoothed = biome_map.filter(ImageFilter.GaussianBlur(radius=2))
            smoothed.save(output_dir / 'biome_map_smoothed.png')
            scene['biome_map_smoothed'] = str(output_dir / 'biome_map_smoothed.png')
        except Exception as e:
            print(f"[scene_export] Biome smoothing failed: {e}")
    if generate_prop_mask:
        # Generate a prop mask (e.g., open areas for props)
        try:
            label_map = np.load(scene['label_map'])
            prop_mask = (label_map == 0).astype(np.uint8)  # Example: label 0 = open/forest
            np.save(output_dir / 'prop_mask.npy', prop_mask)
            scene['prop_mask'] = str(output_dir / 'prop_mask.npy')
        except Exception as e:
            print(f"[scene_export] Prop mask generation failed: {e}")
    if generate_normal_map:
        # Generate a normal map from the heightmap
        try:
            heightmap = np.load(scene['heightmap']).astype(np.float32)
            dzdx = np.gradient(heightmap, axis=1)
            dzdy = np.gradient(heightmap, axis=0)
            normal = np.dstack((-dzdx, -dzdy, np.ones_like(heightmap)))
            norm = np.linalg.norm(normal, axis=2, keepdims=True)
            normal = (normal / (norm + 1e-8) + 1) * 127.5
            normal_img = Image.fromarray(normal.astype(np.uint8))
            normal_img.save(output_dir / 'normal_map.png')
            scene['normal_map'] = str(output_dir / 'normal_map.png')
        except Exception as e:
            print(f"[scene_export] Normal map generation failed: {e}")
    if generate_contour_overlay:
        # Generate a contour overlay from the heightmap
        try:
            import matplotlib.pyplot as plt
            heightmap = np.load(scene['heightmap'])
            plt.figure(figsize=(6,6))
            plt.contour(heightmap, colors='black', linewidths=0.5)
            plt.axis('off')
            plt.savefig(output_dir / 'contour_overlay.png', bbox_inches='tight', pad_inches=0)
            plt.close()
            scene['contour_overlay'] = str(output_dir / 'contour_overlay.png')
        except Exception as e:
            print(f"[scene_export] Contour overlay generation failed: {e}")
    # Write scene config
    with open(output_dir / 'scene_config.json', 'w') as f:
        json.dump(scene, f, indent=2)
    print(f"[scene_export] Scene exported to {output_dir / 'scene_config.json'}") 