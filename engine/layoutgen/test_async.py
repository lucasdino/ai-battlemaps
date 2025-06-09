import json
from pathlib import Path

import agent

# Import our data
with open(Path('./agent/data/test1.json'), 'r') as f:
    dungeon_data = json.load(f)
with open(Path('./agent/data/default_assets_metadata.json'), 'r') as f:
    default_assets = json.load(f)

dungeon_agent = agent.DungeonAgent(
    dungeon_data=dungeon_data,
    default_assets=default_assets,
    max_generation_attempts=2,
    max_concurrent_requests=2,
    delay_between_requests=0.0,
    default_model_endpoint="GPT-4.1 Mini"
)

dungeon_design_prompt = "You are in a wealthy vampire's lair."

room_placement_dicts = dungeon_agent.design_dungeon(
    dungeon_design_prompt=dungeon_design_prompt,
    use_async=True
)

# Save my data down
output_file = Path('./generated_dungeon_data.json')
with open(output_file, 'w') as f:
    json.dump(room_placement_dicts, f, indent=2)

print(f"Dungeon data saved to: {output_file.absolute()}")
print(f"Generated {len(room_placement_dicts)} rooms")