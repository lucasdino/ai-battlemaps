# Moved to image_scene_synthesis directory

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from pathlib import Path
import gin
import os
from skimage.segmentation import slic
from skimage.util import img_as_float
import torch
import cv2
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator
import json

# Load the gin configuration file
# config_path = os.path.join(os.path.dirname(__file__), 'config.gin')
# gin.parse_config_file(config_path)


def get_asset_name(mask, index, image_shape):
    """Generate a descriptive name for an asset based on its properties."""
    # Calculate basic properties
    area = mask["area"]
    bbox = mask["bbox"]  # [x, y, width, height]
    center_x = bbox[0] + bbox[2] / 2
    center_y = bbox[1] + bbox[3] / 2

    # Determine position
    position = []
    if center_x < image_shape[1] / 3:
        position.append("west")
    elif center_x > 2 * image_shape[1] / 3:
        position.append("east")
    if center_y < image_shape[0] / 3:
        position.append("north")
    elif center_y > 2 * image_shape[0] / 3:
        position.append("south")

    # Determine size category
    if area < 1000:
        size = "small"
    elif area < 5000:
        size = "medium"
    else:
        size = "large"

    # Determine shape
    aspect_ratio = bbox[2] / bbox[3]
    if 0.9 <= aspect_ratio <= 1.1:
        shape = "square"
    elif aspect_ratio > 1.1:
        shape = "horizontal"
    else:
        shape = "vertical"

    # Combine properties into a name
    position_str = "-".join(position) if position else "central"
    name = f"{size}-{shape}-{position_str}-object"

    return name


def create_side_by_side_comparison(original_image, raw_mask, labeled_mask, output_path):
    """Create a side-by-side comparison of the three images."""
    # Ensure all images are in RGB mode
    original_image = original_image.convert("RGB")
    raw_mask = raw_mask.convert("RGB")
    labeled_mask = labeled_mask.convert("RGB")

    # Get dimensions
    width = original_image.width
    height = original_image.height

    # Create a new image with triple width
    comparison = Image.new("RGB", (width * 3, height))

    # Paste images side by side
    comparison.paste(original_image, (0, 0))
    comparison.paste(raw_mask, (width, 0))
    comparison.paste(labeled_mask, (width * 2, 0))

    # Add labels
    draw = ImageDraw.Draw(comparison)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 30)
    except:
        font = ImageFont.load_default()

    # Add titles
    draw.text((width // 2 - 100, 10), "Original", fill=(255, 255, 255), font=font)
    draw.text(
        (width + width // 2 - 100, 10), "Raw Mask", fill=(255, 255, 255), font=font
    )
    draw.text(
        (width * 2 + width // 2 - 100, 10),
        "Labeled Mask",
        fill=(255, 255, 255),
        font=font,
    )

    # Save the comparison
    comparison.save(output_path)


@gin.configurable
def label_image(
    image_path, output_dir, sam_checkpoint="sam_vit_b_01ec64.pth", model_type="vit_b"
):
    print(f"Labeling image with SAM: {image_path}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    # Download checkpoint if not present
    if not Path(sam_checkpoint).exists():
        import requests

        url = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
        print("Downloading SAM checkpoint...")
        r = requests.get(url)
        with open(sam_checkpoint, "wb") as f:
            f.write(r.content)
    sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
    sam.to(device)

    # Configure SAM for better asset detection
    mask_generator = SamAutomaticMaskGenerator(
        model=sam,
        points_per_side=32,  # Increased for better detail
        pred_iou_thresh=0.86,  # Higher threshold for more confident detections
        stability_score_thresh=0.92,  # Higher threshold for more stable masks
        crop_n_layers=1,  # Process at multiple scales
        crop_n_points_downscale_factor=2,
        min_mask_region_area=100,  # Minimum size for detected regions
    )

    # Load and process image
    original_image = Image.open(image_path).convert("RGB")
    image = np.array(original_image)
    masks = mask_generator.generate(image)

    # Sort masks by area and confidence
    masks = sorted(masks, key=lambda x: (x["area"], x["predicted_iou"]), reverse=True)

    # Generate names for each asset
    asset_names = [get_asset_name(m, i, image.shape) for i, m in enumerate(masks)]

    # Create label map with distinct IDs for each asset
    label_map = np.zeros(image.shape[:2], dtype=np.uint8)
    for i, m in enumerate(masks):
        label_map[m["segmentation"]] = i + 1

    # Save the raw label map
    np.save(f"{output_dir}/label_map_sam.npy", label_map)

    # Create a colored visualization of the assets (raw mask)
    colored_map = np.zeros((*image.shape[:2], 3), dtype=np.uint8)
    colors = np.random.randint(0, 255, (len(masks), 3), dtype=np.uint8)

    # Create raw mask visualization
    for i, m in enumerate(masks):
        colored_map[m["segmentation"]] = colors[i]

    raw_mask_image = Image.fromarray(colored_map)

    # Create labeled visualization
    # First, create a semi-transparent overlay
    overlay = np.zeros((*image.shape[:2], 4), dtype=np.uint8)
    for i, m in enumerate(masks):
        mask = m["segmentation"]
        color = colors[i]
        overlay[mask] = [*color, 128]  # Add alpha channel

    # Convert to PIL Image for drawing
    base_image = original_image.copy()
    overlay_image = Image.fromarray(overlay)
    labeled_image = Image.alpha_composite(base_image.convert("RGBA"), overlay_image)
    draw = ImageDraw.Draw(labeled_image)

    # Try to load a font, fall back to default if not available
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 20)
    except:
        font = ImageFont.load_default()

    # Create masks directory
    masks_dir = Path(output_dir) / "masks"
    masks_dir.mkdir(exist_ok=True)

    # Draw labels and save individual masks
    for i, (m, name) in enumerate(zip(masks, asset_names)):
        mask = m["segmentation"]

        # Save individual mask
        mask_img = Image.fromarray(mask.astype(np.uint8) * 255)
        mask_img.save(masks_dir / f"{name}.png")

        # Calculate center of mass for label placement
        y_indices, x_indices = np.where(mask)
        center_y = int(np.mean(y_indices))
        center_x = int(np.mean(x_indices))

        # Create label text with confidence score
        confidence = m["predicted_iou"]
        label_text = f"{name}\nConf: {confidence:.2f}"

        # Draw label with background for better visibility
        text_bbox = draw.textbbox((center_x, center_y), label_text, font=font)
        draw.rectangle(
            [text_bbox[0] - 2, text_bbox[1] - 2, text_bbox[2] + 2, text_bbox[3] + 2],
            fill=(0, 0, 0, 200),
        )
        draw.text((center_x, center_y), label_text, fill=(255, 255, 255), font=font)

    # Create side-by-side comparison
    create_side_by_side_comparison(
        original_image, raw_mask_image, labeled_image, f"{output_dir}/comparison.png"
    )

    # Create a legend image
    legend_height = min(800, 50 + len(masks) * 30)
    legend = Image.new("RGB", (400, legend_height), (255, 255, 255))
    legend_draw = ImageDraw.Draw(legend)

    # Add title
    legend_draw.text((10, 10), "Asset Legend", fill=(0, 0, 0), font=font)

    # Add each asset to legend
    for i, (m, name) in enumerate(zip(masks, asset_names)):
        y_pos = 50 + i * 30
        # Draw color swatch
        legend_draw.rectangle([10, y_pos, 30, y_pos + 20], fill=tuple(colors[i]))
        # Draw asset info
        info = f"{name}: Conf={m['predicted_iou']:.2f}, Area={m['area']}"
        legend_draw.text((40, y_pos), info, fill=(0, 0, 0), font=font)

    legend.save(f"{output_dir}/asset_legend.png")

    # Save asset metadata
    metadata = {
        "assets": [
            {
                "name": name,
                "confidence": float(m["predicted_iou"]),
                "area": int(m["area"]),
                "bbox": m["bbox"],
                "mask_path": f"masks/{name}.png",
            }
            for name, m in zip(asset_names, masks)
        ]
    }
    with open(f"{output_dir}/asset_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Detected {len(masks)} distinct assets")
    print(
        f"Saved comparison.png, asset_legend.png, and individual masks to {output_dir}"
    )

    return f"{output_dir}/biome_map.png"


if __name__ == "__main__":
    import sys

    image_path = sys.argv[1] if len(sys.argv) > 1 else "data/images/SD_input_image.png"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/labels"
    label_image(image_path, output_dir)
