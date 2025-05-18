from pathlib import Path
import logging
from typing import Dict, List, Optional

from .config import SceneGeneratorConfig
from .layers import SceneGenerator
from .utils import save_texture, texture_to_data_uri


def setup_logging(level: str = "INFO"):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def create_default_config(output_dir: str = "output") -> SceneGeneratorConfig:
    """Create a default configuration"""
    config = SceneGeneratorConfig()
    config.output_dir = output_dir
    # Increase map size for a larger tile map
    config.width = 256
    config.height = 256
    # Smaller grid size for more detailed tile placement
    config.grid_size = (16, 16)
    
    # Configure terrain generation
    config.terrain.enabled = True
    config.terrain.noise_scales = {
        "large": 200.0,  # Increased for larger terrain features
        "medium": 100.0,
        "small": 50.0,
    }
    
    # Configure feature generation
    config.feature.enabled = True
    config.feature.similarity_threshold = 0.3
    config.feature.max_features = 20  # Increased for more features
    
    # Configure prop generation
    config.prop.enabled = True
    config.prop.density = 0.4  # Increased density
    config.prop.cluster_size = (3, 8)  # Larger clusters
    
    # Configure visual processing
    config.visual.enabled = True
    config.visual.style = "fantasy"
    config.visual.high_res = True  # Enable high resolution
    
    return config


def generate_scene(
    prompt: str,
    style: str = "fantasy",
    output_dir: str = "output",
    config_path: Optional[str] = None,
    debug: bool = False,
) -> Dict:
    """Generate a complete scene with the given prompt"""
    # Setup logging
    setup_logging("DEBUG" if debug else "INFO")
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Load or create configuration
    if config_path:
        config = SceneGeneratorConfig.from_yaml(config_path)
    else:
        config = create_default_config(output_dir)
    
    # Enable debug mode if requested
    if debug:
        config.terrain.debug_mode = True
        config.feature.debug_mode = True
        config.prop.debug_mode = True
        config.visual.debug_mode = True
    
    # Initialize scene generator
    generator = SceneGenerator(config)
    
    # Generate scene with multiple views for better detail
    scene_data = generator.generate(
        prompt=prompt,
        style=style,
        batch_views=["top", "45_degrees", "side"] if debug else ["top", "45_degrees"],
        high_res=True,  # Always use high resolution
    )
    
    if not scene_data:
        logging.error("Failed to generate scene")
        return None
    
    # Save visual output in high quality
    if "visual" in scene_data and "image" in scene_data["visual"]:
        image = scene_data["visual"]["image"]
        save_texture(
            image,
            output_path / "scene.png",
            format="PNG",
            quality=100,  # Maximum quality
        )
    
    # Export scene data in multiple formats
    export_formats = ["tiled", "web", "unity"]  # Export in multiple formats
    for format_type in export_formats:
        export_data = generator.export_to_json(scene_data, format=format_type)
    
    # Save export data
        with open(output_path / f"scene_{format_type}.json", "w") as f:
        import json
        json.dump(export_data, f, indent=2)
    
    return scene_data


def main():
    """Example usage of the scene generator"""
    # Example prompts
    prompts = [
        "A mystical temple in a dense forest with ancient ruins nearby",
        # "A military outpost on a hilltop with watchtowers and barracks",
        # "An abandoned mine entrance with scattered mining equipment"
    ]
    
    # Generate scenes for each prompt
    for i, prompt in enumerate(prompts):
        print(f"\nGenerating scene {i+1}: {prompt}")
        scene_data = generate_scene(
            prompt=prompt, style="fantasy", output_dir=f"output/scene_{i+1}", debug=True
        )
        
        if scene_data:
            print(f"Scene {i+1} generated successfully")
            if "visual" in scene_data and "prompt" in scene_data["visual"]:
                print(f"Generated prompt: {scene_data['visual']['prompt']}")


if __name__ == "__main__":
    main() 
