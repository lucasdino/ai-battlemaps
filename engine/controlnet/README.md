# Room Generation Pipeline

This project implements a pipeline for generating 3D room scenes from natural language descriptions using Stable Diffusion and ControlNet.

## Features

- Natural language to 3D scene generation
- Room layout generation using Stable Diffusion
- Image segmentation for asset mapping
- 3D scene construction with walls, floors, and assets
- Support for different room types (dungeon, tavern, throne room)

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Run the example script:
```bash
python example.py
```

2. Use the pipeline in your code:
```python
from controlnet.pipeline import RoomGenerationPipeline

# Initialize pipeline
pipeline = RoomGenerationPipeline()

# Generate room from prompt
result = pipeline.generate_from_prompt(
    "Generate a dark dungeon room with torches and a treasure chest"
)

# Access results
room_type = result['room_type']
scene_path = result['output_path']
```

## Project Structure

- `pipeline.py`: Main pipeline implementation
- `room_generator.py`: Room layout generation using Stable Diffusion
- `segmenter.py`: Image segmentation and asset mapping
- `scene_builder.py`: 3D scene construction
- `interfaces.py`: Interface definitions
- `example.py`: Example usage

## Dependencies

- PyTorch
- Diffusers
- Transformers
- Pillow
- NumPy
- OpenCV
- Trimesh
- Accelerate
- XFormers

## License

MIT License 