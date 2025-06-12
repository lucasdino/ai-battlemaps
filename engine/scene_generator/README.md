# AI Battlemap Scene Generator

This system generates 2.5D battlemap scenes using a layered approach:
1. Terrain generation using Perlin noise
2. Feature placement using rule-based logic
3. Prop scattering using Gaussian noise
4. Visual polish using Stable Diffusion

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure you have enough disk space for the Stable Diffusion model (about 4GB).

## Usage

Basic usage example:
```python
from layers import SceneGenerator

# Initialize the generator
generator = SceneGenerator(
    width=64,  # Base texture size
    height=64,
    grid_size=(32, 32)  # Grid for feature placement
)

# Generate a scene
scene = generator.generate(
    prompt="A mystical forest clearing with an ancient temple",
    style="fantasy RPG battlemap"
)

# Save the scene
generator.save_scene(scene, "output_directory")
```

## Output

The generator creates the following files:
- `texture.png`: The final battlemap texture
- `elevation.npy`: Height map data
- `moisture.npy`: Moisture map data
- `feature_grid.npy`: Grid showing feature placement
- `features.json`: List of placed features
- `props.json`: List of placed props

## Customization

You can customize the generation by:
1. Adjusting the terrain parameters in `TerrainLayer`
2. Modifying feature placement rules in `FeatureLayer`
3. Changing prop types and density in `PropLayer`
4. Adjusting the Stable Diffusion parameters in `VisualPolishLayer`

## Requirements

- Python 3.8+
- CUDA-capable GPU (recommended for faster generation)
- 8GB+ RAM
- 4GB+ disk space for models 