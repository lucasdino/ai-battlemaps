import sys
import os
from pathlib import Path
from diffusers import StableDiffusionPipeline
import torch
import gin


@gin.configurable
def generate_image(
    prompt,
    output_dir,
    model_id="runwayml/stable-diffusion-v1-5",
    device="auto",
    num_inference_steps=50,
):
    """
    Generate an image based on a text prompt using the Stable Diffusion model.

    Args:
        prompt (str): The text prompt to generate the image from.
        output_dir (str): The directory where the generated image will be saved.
        model_id (str, optional): The model ID for the Stable Diffusion model. Defaults to 'CompVis/stable-diffusion-v1-4'.
        device (str, optional): The device to run the model on ('auto', 'cpu', or 'cuda'). Defaults to 'auto'.

    Returns:
        str: The path to the generated image.
    """
    print(f"Generating image for prompt: {prompt}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Load Stable Diffusion model
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
    pipe = pipe.to(device)

    # Generate image
    image = pipe(prompt).images[0]

    # Save the generated image
    image_path = f"{output_dir}/SD_input_image.png"
    image.save(image_path)
    print(f"Saved SD_input_image.png to {output_dir}")
    return image_path


if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A fantasy landscape"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/images"
    generate_image(prompt, output_dir)
