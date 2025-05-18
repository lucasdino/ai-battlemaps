# Moved to image_scene_synthesis directory 

import numpy as np
from PIL import Image
from pathlib import Path
import gin
import os
from skimage.segmentation import slic
from skimage.util import img_as_float

# Load the gin configuration file
# config_path = os.path.join(os.path.dirname(__file__), 'config.gin')
# gin.parse_config_file(config_path)

@gin.configurable
def label_image(image_path, output_dir, labels=["forest", "river", "cliff", "valley"], n_superpixels=200, n_colors=4):
    """
    Label an image using superpixel clustering and color quantization with rule-based mapping.

    Args:
        image_path (str): The path to the image to be labeled.
        output_dir (str): The directory where the label map and biome map will be saved.
        labels (list of str, optional): List of semantic labels.
        n_superpixels (int, optional): Number of superpixels for SLIC.
        n_colors (int, optional): Number of quantized colors/labels.

    Returns:
        None
    """
    print(f"Labeling image (superpixel clustering): {image_path}")
    img = Image.open(image_path).convert("RGB")
    img_np = np.array(img)
    img_float = img_as_float(img_np)

    # Segment image into superpixels
    segments = slic(img_float, n_segments=n_superpixels, compactness=10, start_label=0)
    print(f"Superpixels generated: {segments.max() + 1}")

    # Compute mean color for each superpixel
    mean_colors = np.zeros((segments.max() + 1, 3))
    for i in range(segments.max() + 1):
        mask = segments == i
        mean_colors[i] = img_np[mask].mean(axis=0)

    # Quantize mean colors
    from sklearn.cluster import KMeans
    kmeans = KMeans(n_clusters=n_colors, n_init=10)
    quant_labels = kmeans.fit_predict(mean_colors)

    # Map each superpixel to a quantized label
    label_map = np.zeros_like(segments, dtype=np.uint8)
    for i in range(segments.max() + 1):
        label_map[segments == i] = quant_labels[i]

    # Save label map and biome map
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    np.save(f"{output_dir}/label_map_superpixel.npy", label_map)
    # For visualization, map label indices to grayscale
    Image.fromarray((label_map * (255 // max(1, n_colors-1))).astype(np.uint8)).save(f"{output_dir}/biome_map.png")
    print(f"Saved label_map_superpixel.npy and biome_map.png to {output_dir}")

if __name__ == "__main__":
    import sys
    image_path = sys.argv[1] if len(sys.argv) > 1 else "data/images/SD_input_image.png"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/labels"
    label_image(image_path, output_dir) 