# Global color mapping for dungeon elements
DUNGEON_COLORS = {
    '0': {'color': '#FFFFFF'}, 
    '1': {'color': '#999999'}, 
    '2': {'color': '#000000'}, 
    '3': {'color': '#999999'}, 
    '4': {'color': '#FF6B35'}, 
    '5': {'color': '#999999'}, 
    '6': {'color': '#80d43b'}, 
    '7': {'color': '#999999'}
}

GRID_KEY = {
    '0': "Empty Space",
    '1': "Floor",
    '2': "Wall",
    '3': "Corridor",
    '4': "Door",
    '5': "Treasure Room",
    '6': "Entrance Room",
    '7': "Boss Room"
}

# This is what we'll pass the agent to simplify / have control since not entirely tied to the generation key
AGENT_KEY = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 1,
    '4': 'D',
    '5': 1,
    '6': 1,
    '7': 1
}