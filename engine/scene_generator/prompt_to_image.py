import sys
import os
from pathlib import Path
from diffusers import StableDiffusionPipeline
import torch
import json
from config_loader import ConfigLoader

# Initialize configuration loader
config_loader = ConfigLoader()
config_loader.override_with_env()
args = ConfigLoader.parse_args()
config_loader.override_with_args(args)
config = config_loader.get_config()

def generate_image(prompt, output_dir):
    print(f"Generating image for prompt: {prompt}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Load Stable Diffusion model
    model_id = config['prompt_to_image']['model_id']
    device = config['prompt_to_image']['device']
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
    pipe = pipe.to(device)

    # Generate image
    image = pipe(prompt).images[0]
    
    # Save the generated image
    image.save(f"{output_dir}/SD_input_image.png")
    print(f"Saved SD_input_image.png to {output_dir}")

if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A fantasy landscape"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/images"
    generate_image(prompt, output_dir) 