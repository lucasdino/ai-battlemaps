import os
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from PIL import Image


def visualize_intermediates():
    data_dir = Path("data")
    if not data_dir.exists():
        print(f"Data directory {data_dir} does not exist.")
        return

    # Load generated image
    image_path = data_dir / "images" / "generated_image.png"
    if image_path.exists():
        image = Image.open(image_path)
        plt.figure(figsize=(10, 5))
        plt.subplot(1, 3, 1)
        plt.imshow(image)
        plt.title("Generated Image")
        plt.axis("off")
    else:
        print(f"Generated image not found at {image_path}")

    # Load elevation map
    elevation_path = data_dir / "terrain" / "elevation_map.npy"
    if elevation_path.exists():
        elevation = np.load(elevation_path)
        plt.subplot(1, 3, 2)
        plt.imshow(elevation, cmap="terrain")
        plt.title("Elevation Map")
        plt.colorbar()
        plt.axis("off")
    else:
        print(f"Elevation map not found at {elevation_path}")

    # Load final mesh (if available)
    mesh_path = data_dir / "meshes" / "final_mesh.obj"
    if mesh_path.exists():
        # For simplicity, we'll just display a placeholder for the mesh
        plt.subplot(1, 3, 3)
        plt.text(0.5, 0.5, "Final Mesh (3D)", ha="center", va="center", fontsize=12)
        plt.axis("off")
    else:
        print(f"Final mesh not found at {mesh_path}")

    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    visualize_intermediates()
