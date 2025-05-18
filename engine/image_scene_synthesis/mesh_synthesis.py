# Moved to image_scene_synthesis directory 

import numpy as np
from pathlib import Path
from PIL import Image
from stl import mesh
import gin
import os

@gin.configurable
def synthesize_mesh(heightmap_path, biome_map_path, output_dir, output_format="obj"):
    print(f"Synthesizing mesh from: {heightmap_path}, {biome_map_path}")
    heightmap = np.load(heightmap_path)
    biome_map = np.array(Image.open(biome_map_path))

    # Create vertices and faces for the mesh
    vertices = []
    faces = []
    rows, cols = heightmap.shape
    for i in range(rows - 1):
        for j in range(cols - 1):
            # Define vertices for each quad
            v0 = (i, j, heightmap[i, j])
            v1 = (i + 1, j, heightmap[i + 1, j])
            v2 = (i, j + 1, heightmap[i, j + 1])
            v3 = (i + 1, j + 1, heightmap[i + 1, j + 1])
            vertices.extend([v0, v1, v2, v3])

            # Define two triangles for each quad
            faces.append((len(vertices) - 4, len(vertices) - 3, len(vertices) - 2))
            faces.append((len(vertices) - 3, len(vertices) - 1, len(vertices) - 2))

    # Create mesh
    terrain_mesh = mesh.Mesh(np.zeros(len(faces), dtype=mesh.Mesh.dtype))
    for i, f in enumerate(faces):
        for j in range(3):
            terrain_mesh.vectors[i][j] = vertices[f[j]]

    # Save mesh to OBJ
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    terrain_mesh.save(f"{output_dir}/terrain.{output_format}")
    print(f"Saved terrain.{output_format} to {output_dir}")

if __name__ == "__main__":
    import sys
    heightmap_path = sys.argv[1] if len(sys.argv) > 1 else "data/terrain/terrain_heightmap.npy"
    biome_map_path = sys.argv[2] if len(sys.argv) > 2 else "data/labels/biome_map.png"
    output_dir = sys.argv[3] if len(sys.argv) > 3 else "data/meshes"
    synthesize_mesh(heightmap_path, biome_map_path, output_dir) 