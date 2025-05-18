import numpy as np
from PIL import Image
from pathlib import Path
import torch
import clip
import json
from config_loader import ConfigLoader

# Initialize configuration loader
config_loader = ConfigLoader()
config_loader.override_with_env()
args = ConfigLoader.parse_args()
config_loader.override_with_args(args)
config = config_loader.get_config()

def label_image(image_path, output_dir):
    print(f"Labeling image: {image_path}")
    img = Image.open(image_path).convert("RGB")
    
    # Load CLIP model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = clip.load("ViT-B/32", device=device)

    # Preprocess image
    image_input = preprocess(img).unsqueeze(0).to(device)

    # Define possible labels
    labels = config['semantic_labeling']['labels']
    text_inputs = torch.cat([clip.tokenize(f"a photo of a {c}") for c in labels]).to(device)

    # Get features
    with torch.no_grad():
        image_features = model.encode_image(image_input)
        text_features = model.encode_text(text_inputs)

    # Calculate similarity
    similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
    label_map = similarity.argmax(dim=-1).cpu().numpy().reshape(img.size[1], img.size[0])

    # Save label map
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    np.save(f"{output_dir}/label_map_clip.npy", label_map)
    Image.fromarray((label_map * 60).astype(np.uint8)).save(f"{output_dir}/biome_map.png")
    print(f"Saved label_map_clip.npy and biome_map.png to {output_dir}")

if __name__ == "__main__":
    import sys
    image_path = sys.argv[1] if len(sys.argv) > 1 else "data/images/SD_input_image.png"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/labels"
    label_image(image_path, output_dir) 