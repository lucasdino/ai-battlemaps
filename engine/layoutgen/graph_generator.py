import numpy as np
import networkx as nx
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import random
import math

class RoomType(Enum):
    ENTRANCE = "entrance"
    TREASURE = "treasure"
    BOSS = "boss"
    TRAP = "trap"
    PUZZLE = "puzzle"
    CORRIDOR = "corridor"
    CHAMBER = "chamber"

@dataclass
class GraphRoom:
    id: int
    x: int
    y: int
    width: int
    height: int
    room_type: RoomType
    importance: int = 1
    connections: List[int] = field(default_factory=list)

@dataclass
class GraphLayoutParams:
    """Parameters for graph-based layout generation."""
    
    # Room generation
    min_rooms: int = 5
    max_rooms: int = 12
    room_size_min: int = 3
    room_size_max: int = 8
    room_padding: int = 2
    
    # Room placement
    placement_attempts: int = 100
    collision_buffer: int = 1
    edge_margin: int = 2
    
    # Room type probabilities
    entrance_count: int = 1
    boss_count: int = 1
    treasure_probability: float = 0.3
    trap_probability: float = 0.25
    puzzle_probability: float = 0.2
    chamber_probability: float = 0.15
    
    # Graph connectivity
    min_connections_per_room: int = 1
    max_connections_per_room: int = 4
    extra_connections_chance: float = 0.1
    
    # Method-specific parameters (overridden by subclasses)
    def get_method_specific_params(self) -> Dict:
        return {}

@dataclass  
class LinearParams(GraphLayoutParams):
    """Parameters specific to linear graph generation."""
    min_rooms: int = 6
    max_rooms: int = 9
    linear_progression_strictness: float = 0.9
    treasure_probability: float = 0.4
    trap_probability: float = 0.3
    
    def get_method_specific_params(self) -> Dict:
        return {"linear_progression_strictness": self.linear_progression_strictness}

@dataclass
class HubParams(GraphLayoutParams):
    """Parameters specific to hub graph generation."""
    min_rooms: int = 5
    max_rooms: int = 8
    hub_centrality_weight: float = 0.8
    hub_max_branches: int = 6
    treasure_probability: float = 0.5
    
    def get_method_specific_params(self) -> Dict:
        return {
            "hub_centrality_weight": self.hub_centrality_weight,
            "hub_max_branches": self.hub_max_branches
        }

@dataclass
class BranchingParams(GraphLayoutParams):
    """Parameters specific to branching graph generation."""
    min_rooms: int = 8
    max_rooms: int = 15
    branching_factor: float = 0.6
    max_branch_depth: int = 4
    treasure_probability: float = 0.3
    chamber_probability: float = 0.25
    
    def get_method_specific_params(self) -> Dict:
        return {
            "branching_factor": self.branching_factor,
            "max_branch_depth": self.max_branch_depth
        }

@dataclass
class LoopParams(GraphLayoutParams):
    """Parameters specific to loop graph generation."""
    min_rooms: int = 7
    max_rooms: int = 11
    loop_closure_probability: float = 0.8
    shortcut_probability: float = 0.3
    extra_connections_chance: float = 0.2
    
    def get_method_specific_params(self) -> Dict:
        return {
            "loop_closure_probability": self.loop_closure_probability,
            "shortcut_probability": self.shortcut_probability
        }

class GraphLayoutGenerator:
    """Graph-based layout generator with full parameter customization."""
    
    def __init__(self, width: int = 50, height: int = 50):
        self.width = width
        self.height = height
        self.rooms = []
        self.graph = nx.Graph()
        self.grid = np.zeros((height, width), dtype=int)
        self.params = None
    
    def generate_layout(self, method_type: str, params: Optional[GraphLayoutParams] = None) -> np.ndarray:
        """Generate layout using specified method and parameters."""
        
        # Use default parameters if none provided
        if params is None:
            params = self._get_default_params(method_type)
        
        self.params = params
        
        # Generate graph structure
        num_rooms = random.randint(params.min_rooms, params.max_rooms)
        
        if method_type == "linear":
            self.graph = self._create_linear_graph(num_rooms, params)
        elif method_type == "hub":
            self.graph = self._create_hub_graph(num_rooms, params)
        elif method_type == "branching":
            self.graph = self._create_branching_graph(num_rooms, params)
        elif method_type == "loop":
            self.graph = self._create_loop_graph(num_rooms, params)
        else:
            raise ValueError(f"Unknown method type: {method_type}")
        
        # Place rooms on grid
        self.rooms = self._place_rooms(self.graph, params)
        
        # Create final grid
        self.grid = self._create_final_grid(params)
        
        return self.grid
    
    def _get_default_params(self, method_type: str) -> GraphLayoutParams:
        """Get default parameters for each method type."""
        if method_type == "linear":
            return LinearParams()
        elif method_type == "hub":
            return HubParams()
        elif method_type == "branching":
            return BranchingParams()
        elif method_type == "loop":
            return LoopParams()
        else:
            return GraphLayoutParams()
    
    def _create_linear_graph(self, num_rooms: int, params: LinearParams) -> nx.Graph:
        """Create a linear progression graph."""
        graph = nx.Graph()
        
        for i in range(num_rooms):
            graph.add_node(i)
        
        # Create main linear progression
        for i in range(num_rooms - 1):
            if random.random() < params.linear_progression_strictness:
                graph.add_edge(i, i + 1)
            else:
                # Occasional skip or branch
                next_node = min(i + 2, num_rooms - 1)
                graph.add_edge(i, next_node)
        
        # Add some shortcuts with low probability
        for i in range(num_rooms - 2):
            for j in range(i + 2, num_rooms):
                if random.random() < (1 - params.linear_progression_strictness) * 0.3:
                    graph.add_edge(i, j)
        
        return graph
    
    def _create_hub_graph(self, num_rooms: int, params: HubParams) -> nx.Graph:
        """Create a hub-and-spoke graph."""
        graph = nx.Graph()
        hub_node = 0
        
        for i in range(num_rooms):
            graph.add_node(i)
        
        # Connect hub to spokes
        max_spokes = min(num_rooms - 1, params.hub_max_branches)
        for i in range(1, max_spokes + 1):
            graph.add_edge(hub_node, i)
        
        # Create small branches from spokes
        remaining_nodes = list(range(max_spokes + 1, num_rooms))
        spoke_nodes = list(range(1, max_spokes + 1))
        
        for node in remaining_nodes:
            if spoke_nodes:
                spoke = random.choice(spoke_nodes)
                graph.add_edge(spoke, node)
        
        # Add some inter-spoke connections
        for i in range(len(spoke_nodes)):
            for j in range(i + 1, len(spoke_nodes)):
                if random.random() < params.extra_connections_chance:
                    graph.add_edge(spoke_nodes[i], spoke_nodes[j])
        
        return graph
    
    def _create_branching_graph(self, num_rooms: int, params: BranchingParams) -> nx.Graph:
        """Create a branching tree-like graph."""
        graph = nx.Graph()
        
        for i in range(num_rooms):
            graph.add_node(i)
        
        # Start with root
        available_nodes = list(range(1, num_rooms))
        connected_nodes = [0]
        
        while available_nodes:
            # Choose a connected node to branch from
            parent = random.choice(connected_nodes)
            
            # Determine branching factor for this node
            current_connections = len(list(graph.neighbors(parent)))
            max_new_connections = max(1, int(params.branching_factor * 3))
            
            # Add branches
            num_branches = min(
                max_new_connections - current_connections,
                len(available_nodes),
                random.randint(1, 3)
            )
            
            for _ in range(max(1, num_branches)):
                if available_nodes:
                    child = available_nodes.pop(0)
                    graph.add_edge(parent, child)
                    connected_nodes.append(child)
        
        # Add some cross-connections for complexity
        nodes = list(graph.nodes())
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                if not graph.has_edge(nodes[i], nodes[j]):
                    if random.random() < params.extra_connections_chance:
                        graph.add_edge(nodes[i], nodes[j])
        
        return graph
    
    def _create_loop_graph(self, num_rooms: int, params: LoopParams) -> nx.Graph:
        """Create a circular loop-based graph."""
        graph = nx.Graph()
        
        for i in range(num_rooms):
            graph.add_node(i)
        
        # Create main circular loop
        for i in range(num_rooms):
            next_node = (i + 1) % num_rooms
            if random.random() < params.loop_closure_probability:
                graph.add_edge(i, next_node)
        
        # Add shortcuts across the loop
        for i in range(num_rooms):
            for j in range(i + 2, num_rooms):
                if j != (i - 1) % num_rooms:  # Avoid immediate neighbors
                    if random.random() < params.shortcut_probability:
                        graph.add_edge(i, j)
        
        # Ensure connectivity
        if not nx.is_connected(graph):
            components = list(nx.connected_components(graph))
            for i in range(len(components) - 1):
                node1 = random.choice(list(components[i]))
                node2 = random.choice(list(components[i + 1]))
                graph.add_edge(node1, node2)
        
        return graph
    
    def _place_rooms(self, graph: nx.Graph, params: GraphLayoutParams) -> List[GraphRoom]:
        """Place rooms for each node in the graph."""
        grid = np.zeros((self.height, self.width), dtype=int)
        rooms = []
        
        for node_id in graph.nodes():
            room = self._place_single_room(node_id, graph, grid, params)
            if room:
                rooms.append(room)
                self._mark_room_on_grid(grid, room)
        
        return rooms
    
    def _place_single_room(self, node_id: int, graph: nx.Graph, grid: np.ndarray, 
                          params: GraphLayoutParams) -> Optional[GraphRoom]:
        """Place a single room on the grid."""
        room_width = random.randint(params.room_size_min, params.room_size_max)
        room_height = random.randint(params.room_size_min, params.room_size_max)
        
        for attempt in range(params.placement_attempts):
            x = random.randint(
                params.edge_margin,
                self.width - room_width - params.edge_margin
            )
            y = random.randint(
                params.edge_margin,
                self.height - room_height - params.edge_margin
            )
            
            if self._is_valid_placement(grid, x, y, room_width, room_height, params):
                room_type = self._determine_room_type(node_id, graph, params)
                return GraphRoom(
                    id=node_id,
                    x=x,
                    y=y,
                    width=room_width,
                    height=room_height,
                    room_type=room_type
                )
        
        return None
    
    def _is_valid_placement(self, grid: np.ndarray, x: int, y: int, width: int, height: int, 
                           params: GraphLayoutParams) -> bool:
        """Check if room placement is valid (no overlaps)."""
        # Check bounds
        if (x < params.edge_margin or y < params.edge_margin or
            x + width >= self.width - params.edge_margin or
            y + height >= self.height - params.edge_margin):
            return False
        
        # Check for overlaps with buffer
        buffer = params.collision_buffer + params.room_padding
        check_x1 = max(0, x - buffer)
        check_y1 = max(0, y - buffer)
        check_x2 = min(self.width, x + width + buffer)
        check_y2 = min(self.height, y + height + buffer)
        
        return np.all(grid[check_y1:check_y2, check_x1:check_x2] == 0)
    
    def _mark_room_on_grid(self, grid: np.ndarray, room: GraphRoom):
        """Mark room area on the grid."""
        grid[room.y:room.y + room.height, room.x:room.x + room.width] = room.id + 1
    
    def _determine_room_type(self, node_id: int, graph: nx.Graph, params: GraphLayoutParams) -> RoomType:
        """Determine room type based on graph structure and probabilities."""
        degree = graph.degree(node_id)
        
        # Special room assignments
        if node_id == 0:
            return RoomType.ENTRANCE
        
        # Boss rooms are typically at ends or have high importance
        if degree == 1 and random.random() < 0.7:
            return RoomType.BOSS
        
        # High-degree nodes are often important chambers
        if degree >= 3 and random.random() < params.chamber_probability:
            return RoomType.CHAMBER
        
        # Random assignment based on probabilities
        rand = random.random()
        if rand < params.treasure_probability:
            return RoomType.TREASURE
        elif rand < params.treasure_probability + params.trap_probability:
            return RoomType.TRAP
        elif rand < (params.treasure_probability + params.trap_probability + 
                    params.puzzle_probability):
            return RoomType.PUZZLE
        else:
            return RoomType.CHAMBER
    
    def _create_final_grid(self, params: GraphLayoutParams) -> np.ndarray:
        """Create the final layout grid with rooms and corridors."""
        final_grid = np.zeros((self.height, self.width), dtype=int)
        
        # Place rooms
        for room in self.rooms:
            self._place_room_on_final_grid(final_grid, room)
        
        # Create corridors between connected rooms
        self._create_corridors(final_grid)
        
        return final_grid
    
    def _place_room_on_final_grid(self, grid: np.ndarray, room: GraphRoom):
        """Place a room on the final grid."""
        # Room walls and floors
        for y in range(room.y, room.y + room.height):
            for x in range(room.x, room.x + room.width):
                if (y == room.y or y == room.y + room.height - 1 or
                    x == room.x or x == room.x + room.width - 1):
                    grid[y, x] = 2  # Wall
                else:
                    grid[y, x] = 1  # Floor
        
        # Room center marker with type
        center_x = room.x + room.width // 2
        center_y = room.y + room.height // 2
        
        type_mapping = {
            RoomType.ENTRANCE: 8,
            RoomType.BOSS: 7,
            RoomType.TREASURE: 6,
            RoomType.TRAP: 9,
            RoomType.PUZZLE: 10,
            RoomType.CHAMBER: 11,
            RoomType.CORRIDOR: 3
        }
        
        grid[center_y, center_x] = type_mapping.get(room.room_type, 11)
    
    def _create_corridors(self, grid: np.ndarray):
        """Create corridors between connected rooms."""
        room_lookup = {room.id: room for room in self.rooms}
        
        for edge in self.graph.edges():
            room1 = room_lookup.get(edge[0])
            room2 = room_lookup.get(edge[1])
            
            if room1 and room2:
                self._create_corridor_between_rooms(grid, room1, room2)
    
    def _create_corridor_between_rooms(self, grid: np.ndarray, room1: GraphRoom, room2: GraphRoom):
        """Create L-shaped corridor between two rooms."""
        # Room centers
        x1 = room1.x + room1.width // 2
        y1 = room1.y + room1.height // 2
        x2 = room2.x + room2.width // 2
        y2 = room2.y + room2.height // 2
        
        # Create L-shaped path
        # Horizontal first
        start_x, end_x = (x1, x2) if x1 < x2 else (x2, x1)
        for x in range(start_x, end_x + 1):
            if grid[y1, x] == 0:
                grid[y1, x] = 3  # Corridor
        
        # Then vertical
        start_y, end_y = (y1, y2) if y1 < y2 else (y2, y1)
        for y in range(start_y, end_y + 1):
            if grid[y, x2] == 0:
                grid[y, x2] = 3  # Corridor
    
    def export_to_json(self) -> Dict:
        """Export layout data to JSON format."""
        rooms_data = []
        
        for room in self.rooms:
            rooms_data.append({
                'id': room.id,
                'center': [room.x + room.width // 2, room.y + room.height // 2],
                'bounds': {
                    'min_x': room.x,
                    'max_x': room.x + room.width,
                    'min_y': room.y,
                    'max_y': room.y + room.height
                },
                'area': room.width * room.height,
                'type': room.room_type.value
            })
        
        return {
            'rooms': rooms_data,
            'algorithm': 'graph',
            'graph_data': {
                'nodes': list(self.graph.nodes()),
                'edges': list(self.graph.edges()),
                'room_count': len(self.rooms),
                'edge_count': len(self.graph.edges())
            },
            'parameters': self.params.__dict__ if self.params else {}
        }

    # Legacy method for backward compatibility
    def generate_mission_layout(self, mission_type: str = "linear") -> np.ndarray:
        """Legacy method - use generate_layout instead."""
        return self.generate_layout(mission_type) 