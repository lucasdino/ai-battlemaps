import sys
from pathlib import Path
import logging

# Add the engine directory to Python path
engine_dir = Path(__file__).parent.parent
sys.path.append(str(engine_dir))

from controlnet.pipeline import RoomGenerationPipeline

# Set up logging
logging.basicConfig(level=logging.INFO)

def main():
    # Initialize pipeline
    pipeline = RoomGenerationPipeline()
    
    # Example prompts
    prompts = [
        "Generate a dark dungeon room with torches and a treasure chest",
        "Create a cozy tavern with wooden tables and a fireplace",
        "Design a grand throne room with pillars and ornate decorations"
    ]
    
    # Generate rooms
    for prompt in prompts:
        try:
            result = pipeline.generate_from_prompt(prompt)
            print(f"\nGenerated room from prompt: {prompt}")
            print(f"Room type: {result['room_type']}")
            print(f"Output path: {result['output_path']}")
            print(f"Properties: {result['properties']}")
        except Exception as e:
            print(f"Error generating room: {str(e)}")

if __name__ == "__main__":
    main() 