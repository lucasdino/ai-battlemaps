import numpy as np
import networkx as nx
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
import random
import math
from scipy.spatial import Delaunay
from scipy.spatial.distance import euclidean

@dataclass
class PhysicsRoom:
    id: int
    x: float
    y: float
    width: int
    height: int
    is_main: bool = False
    is_hallway: bool = False
    
    @property
    def center(self) -> Tuple[float, float]:
        return (self.x + self.width / 2, self.y + self.height / 2)
    
    @property
    def bounds(self) -> Dict[str, float]:
        return {
            'min_x': self.x,
            'max_x': self.x + self.width,
            'min_y': self.y,
            'max_y': self.y + self.height
        }
    
    def overlaps(self, other: 'PhysicsRoom') -> bool:
        """Check if this room overlaps with another room."""
        return not (
            self.x + self.width <= other.x or
            other.x + other.width <= self.x or
            self.y + self.height <= other.y or
            other.y + other.height <= self.y
        )

@dataclass
class PhysicsLayoutParams:
    """Parameters for physics-based layout generation (TinyKeep algorithm)."""
    
    # Room generation
    num_rooms: int = 50
    spawn_radius: float = 20
    room_size_mean: int = 8
    room_size_std: int = 3
    room_size_min: int = 3
    room_size_max: int = 20
    
    # Room selection
    main_room_threshold: float = 1.25
    min_main_rooms: int = 3
    main_room_selection_ratio: float = 0.3  # If threshold fails, select top 30%
    
    # Physics simulation
    separation_force: float = 1.0
    max_physics_iterations: int = 1000
    convergence_threshold: float = 0.1
    
    # Grid snapping
    tile_size: int = 1
    grid_edge_margin: int = 1
    
    # Graph generation
    delaunay_triangulation: bool = True
    min_triangulation_rooms: int = 3
    
    # MST and reconnection
    edge_reconnect_percent: float = 0.1
    min_connections: int = 1
    max_additional_connections: int = 3
    
    # Corridor generation
    corridor_width: int = 3
    corridor_style: str = "L_shaped"  # "L_shaped", "straight", "curved"
    corridor_intersection_buffer: float = 1.0
    
    # Final grid processing
    place_walls: bool = True
    place_doors: bool = True
    room_interior_fill: bool = True

class PhysicsLayoutGenerator:
    """Physics-based layout generator implementing TinyKeep algorithm with full customization."""
    
    def __init__(self, width: int = 50, height: int = 50):
        self.width = width
        self.height = height
        self.rooms = []
        self.main_rooms = []
        self.graph = nx.Graph()
        self.corridors = []
        self.grid = np.zeros((height, width), dtype=int)
        self.params = None
        
    def generate_tinykep_layout(self, params: Optional[PhysicsLayoutParams] = None) -> np.ndarray:
        """Generate layout using TinyKeep algorithm with custom parameters."""
        
        if params is None:
            params = PhysicsLayoutParams()
        
        self.params = params
        self._reset()
        
        # Step 1: Generate rooms in circle
        self._generate_rooms_in_circle(params)
        
        # Step 2: Separate overlapping rooms using physics simulation
        self._separate_rooms(params)
        
        # Step 3: Select main rooms based on size threshold
        self._select_main_rooms(params)
        
        # Step 4: Create Delaunay triangulation and graph
        self._create_delaunay_graph(params)
        
        # Step 5: Generate minimum spanning tree
        mst_graph = self._create_minimum_spanning_tree()
        
        # Step 6: Add back some edges for loops
        self._add_reconnection_edges(mst_graph, params)
        
        # Step 7: Create corridors between connected rooms
        self._create_corridors(params)
        
        # Step 8: Fill gaps and create final grid
        self._create_final_grid(params)
        
        return self.grid
    
    def _reset(self):
        """Reset generator state."""
        self.rooms = []
        self.main_rooms = []
        self.graph.clear()
        self.corridors = []
        self.grid = np.zeros((self.height, self.width), dtype=int)
    
    def _get_random_point_in_circle(self, params: PhysicsLayoutParams) -> Tuple[int, int]:
        """Generate random point inside a circle, snapped to tile grid."""
        t = 2 * math.pi * random.random()
        u = random.random() + random.random()
        r = 2 - u if u > 1 else u
        
        x = params.spawn_radius * r * math.cos(t)
        y = params.spawn_radius * r * math.sin(t)
        
        # Snap to tile grid
        x = self._round_to_tile(x, params.tile_size)
        y = self._round_to_tile(y, params.tile_size)
        
        # Center in grid
        x += self.width // 2
        y += self.height // 2
        
        return int(x), int(y)
    
    def _round_to_tile(self, n: float, tile_size: int) -> int:
        """Round number to tile size grid."""
        return int(math.floor((n + tile_size - 1) / tile_size) * tile_size)
    
    def _generate_rooms_in_circle(self, params: PhysicsLayoutParams):
        """Generate rooms randomly placed in a circle."""
        for i in range(params.num_rooms):
            # Random position in circle
            x, y = self._get_random_point_in_circle(params)
            
            # Random room size using normal distribution
            width = max(params.room_size_min, int(np.random.normal(params.room_size_mean, params.room_size_std)))
            height = max(params.room_size_min, int(np.random.normal(params.room_size_mean, params.room_size_std)))
            
            # Clamp to max size
            width = min(width, params.room_size_max)
            height = min(height, params.room_size_max)
            
            # Snap to tile grid
            width = self._round_to_tile(width, params.tile_size)
            height = self._round_to_tile(height, params.tile_size)
            
            # Ensure room fits in grid
            x = max(params.grid_edge_margin, min(self.width - width - params.grid_edge_margin, x))
            y = max(params.grid_edge_margin, min(self.height - height - params.grid_edge_margin, y))
            
            room = PhysicsRoom(
                id=i,
                x=float(x),
                y=float(y),
                width=width,
                height=height
            )
            
            self.rooms.append(room)
    
    def _separate_rooms(self, params: PhysicsLayoutParams):
        """Separate overlapping rooms using simple physics simulation."""
        for iteration in range(params.max_physics_iterations):
            any_overlap = False
            forces = [(0.0, 0.0) for _ in self.rooms]
            max_movement = 0.0
            
            # Calculate separation forces
            for i, room1 in enumerate(self.rooms):
                for j, room2 in enumerate(self.rooms):
                    if i != j and room1.overlaps(room2):
                        any_overlap = True
                        
                        # Calculate force direction
                        dx = room1.center[0] - room2.center[0]
                        dy = room1.center[1] - room2.center[1]
                        
                        # Avoid division by zero
                        distance = max(0.1, math.sqrt(dx*dx + dy*dy))
                        
                        # Normalize and apply force
                        force_x = (dx / distance) * params.separation_force
                        force_y = (dy / distance) * params.separation_force
                        
                        forces[i] = (forces[i][0] + force_x, forces[i][1] + force_y)
            
            # Apply forces
            for i, (fx, fy) in enumerate(forces):
                old_x, old_y = self.rooms[i].x, self.rooms[i].y
                
                self.rooms[i].x += fx
                self.rooms[i].y += fy
                
                # Snap to grid and keep in bounds
                self.rooms[i].x = self._round_to_tile(self.rooms[i].x, params.tile_size)
                self.rooms[i].y = self._round_to_tile(self.rooms[i].y, params.tile_size)
                
                self.rooms[i].x = max(params.grid_edge_margin, 
                                    min(self.width - self.rooms[i].width - params.grid_edge_margin, 
                                        self.rooms[i].x))
                self.rooms[i].y = max(params.grid_edge_margin, 
                                    min(self.height - self.rooms[i].height - params.grid_edge_margin, 
                                        self.rooms[i].y))
                
                # Track maximum movement for convergence
                movement = abs(self.rooms[i].x - old_x) + abs(self.rooms[i].y - old_y)
                max_movement = max(max_movement, movement)
            
            # Check for convergence
            if not any_overlap or max_movement < params.convergence_threshold:
                break
    
    def _select_main_rooms(self, params: PhysicsLayoutParams):
        """Select main rooms based on size threshold."""
        threshold = params.room_size_mean * params.main_room_threshold
        
        self.main_rooms = []
        for room in self.rooms:
            if room.width >= threshold and room.height >= threshold:
                room.is_main = True
                self.main_rooms.append(room)
        
        # If no rooms meet the threshold, select the largest ones
        if len(self.main_rooms) < params.min_main_rooms and len(self.rooms) > 0:
            # Sort rooms by area and select top percentage or minimum count
            sorted_rooms = sorted(self.rooms, key=lambda r: r.width * r.height, reverse=True)
            num_to_select = max(params.min_main_rooms, 
                              int(len(sorted_rooms) * params.main_room_selection_ratio))
            
            # Clear previous selections
            for room in self.rooms:
                room.is_main = False
            self.main_rooms = []
            
            for i in range(min(num_to_select, len(sorted_rooms))):
                sorted_rooms[i].is_main = True
                self.main_rooms.append(sorted_rooms[i])
    
    def _create_delaunay_graph(self, params: PhysicsLayoutParams):
        """Create graph from Delaunay triangulation of main room centers."""
        if not params.delaunay_triangulation or len(self.main_rooms) < params.min_triangulation_rooms:
            # Fallback to linear connection for too few rooms
            for i in range(len(self.main_rooms) - 1):
                distance = euclidean(self.main_rooms[i].center, self.main_rooms[i + 1].center)
                self.graph.add_edge(self.main_rooms[i].id, self.main_rooms[i + 1].id, weight=distance)
            return
        
        # Get main room centers
        points = np.array([room.center for room in self.main_rooms])
        
        # Create Delaunay triangulation
        tri = Delaunay(points)
        
        # Build graph from triangulation
        self.graph.clear()
        
        # Add all main room nodes
        for room in self.main_rooms:
            self.graph.add_node(room.id)
        
        # Add edges from triangulation
        for simplex in tri.simplices:
            for i in range(3):
                for j in range(i + 1, 3):
                    room1_id = self.main_rooms[simplex[i]].id
                    room2_id = self.main_rooms[simplex[j]].id
                    
                    # Calculate distance
                    room1 = self.main_rooms[simplex[i]]
                    room2 = self.main_rooms[simplex[j]]
                    distance = euclidean(room1.center, room2.center)
                    
                    self.graph.add_edge(room1_id, room2_id, weight=distance)
    
    def _create_minimum_spanning_tree(self) -> nx.Graph:
        """Create minimum spanning tree from the graph."""
        if self.graph.number_of_edges() == 0:
            return self.graph.copy()
        
        mst = nx.minimum_spanning_tree(self.graph, weight='weight')
        return mst
    
    def _add_reconnection_edges(self, mst_graph: nx.Graph, params: PhysicsLayoutParams):
        """Add back some edges from original graph to create loops."""
        original_edges = set(self.graph.edges())
        mst_edges = set(mst_graph.edges())
        
        # Find edges that were removed by MST
        removed_edges = original_edges - mst_edges
        
        # Add back a percentage of removed edges
        num_to_add = int(len(removed_edges) * params.edge_reconnect_percent)
        num_to_add = min(num_to_add, params.max_additional_connections)
        
        if removed_edges and num_to_add > 0:
            edges_to_add = random.sample(list(removed_edges), min(num_to_add, len(removed_edges)))
            
            # Start with MST and add selected edges
            self.graph = mst_graph.copy()
            for edge in edges_to_add:
                # Preserve original weight
                original_data = self.graph.get_edge_data(*edge, default={})
                weight = original_data.get('weight', euclidean(
                    next(r.center for r in self.main_rooms if r.id == edge[0]),
                    next(r.center for r in self.main_rooms if r.id == edge[1])
                ))
                self.graph.add_edge(edge[0], edge[1], weight=weight)
        else:
            self.graph = mst_graph.copy()
    
    def _create_corridors(self, params: PhysicsLayoutParams):
        """Create corridors between connected rooms."""
        self.corridors = []
        
        # Get room lookup by ID
        room_lookup = {room.id: room for room in self.rooms}
        
        for edge in self.graph.edges():
            room1 = room_lookup.get(edge[0])
            room2 = room_lookup.get(edge[1])
            
            if room1 and room2:
                corridors = self._create_corridor_between_rooms(room1, room2, params)
                self.corridors.extend(corridors)
    
    def _create_corridor_between_rooms(self, room1: PhysicsRoom, room2: PhysicsRoom, 
                                     params: PhysicsLayoutParams) -> List[Dict]:
        """Create corridors between two rooms based on style."""
        corridors = []
        
        # Get room centers
        x1, y1 = room1.center
        x2, y2 = room2.center
        
        if params.corridor_style == "straight":
            corridors.append({
                'start': (x1, y1),
                'end': (x2, y2),
                'direction': 'direct'
            })
        elif params.corridor_style == "L_shaped":
            # Check if we can create a straight horizontal or vertical line
            if abs(y1 - y2) <= max(room1.height, room2.height) / 2:
                # Create horizontal corridor
                corridors.append({
                    'start': (x1, y1),
                    'end': (x2, y1),
                    'direction': 'horizontal'
                })
            elif abs(x1 - x2) <= max(room1.width, room2.width) / 2:
                # Create vertical corridor
                corridors.append({
                    'start': (x1, y1),
                    'end': (x1, y2),
                    'direction': 'vertical'
                })
            else:
                # Create L-shaped corridor
                corridors.append({
                    'start': (x1, y1),
                    'end': (x2, y1),
                    'direction': 'horizontal'
                })
                corridors.append({
                    'start': (x2, y1),
                    'end': (x2, y2),
                    'direction': 'vertical'
                })
        
        return corridors
    
    def _create_final_grid(self, params: PhysicsLayoutParams):
        """Create the final grid with rooms and corridors."""
        # Fill with void
        self.grid.fill(0)
        
        # Place main rooms
        for room in self.rooms:
            if room.is_main:
                self._place_room_on_grid(room, is_main=True, params=params)
        
        # Create corridor rooms and fill gaps
        self._create_corridor_rooms(params)
        
        # Place corridor rooms
        for room in self.rooms:
            if room.is_hallway:
                self._place_room_on_grid(room, is_main=False, params=params)
        
        # Draw corridor lines
        self._draw_corridors(params)
    
    def _place_room_on_grid(self, room: PhysicsRoom, is_main: bool, params: PhysicsLayoutParams):
        """Place a room on the grid."""
        x_start = max(0, int(room.x))
        y_start = max(0, int(room.y))
        x_end = min(self.width, int(room.x + room.width))
        y_end = min(self.height, int(room.y + room.height))
        
        # Fill room area
        for y in range(y_start, y_end):
            for x in range(x_start, x_end):
                if 0 <= x < self.width and 0 <= y < self.height:
                    if params.place_walls and (y == y_start or y == y_end - 1 or 
                                             x == x_start or x == x_end - 1):
                        if self.grid[y, x] == 0:  # Don't overwrite corridors
                            self.grid[y, x] = 2  # Wall
                    elif params.room_interior_fill:
                        self.grid[y, x] = 1  # Floor
        
        # Place room center marker
        center_x = int(room.x + room.width // 2)
        center_y = int(room.y + room.height // 2)
        
        if 0 <= center_x < self.width and 0 <= center_y < self.height:
            if is_main:
                # Random room type for main rooms
                room_types = [6, 7, 8, 9, 10, 11]  # Various room types
                self.grid[center_y, center_x] = random.choice(room_types)
            else:
                self.grid[center_y, center_x] = 3  # Corridor room
    
    def _create_corridor_rooms(self, params: PhysicsLayoutParams):
        """Find rooms that intersect with corridors and mark them as hallway rooms."""
        for corridor in self.corridors:
            # Find rooms that intersect with this corridor
            intersecting_rooms = self._find_intersecting_rooms(corridor, params)
            
            for room in intersecting_rooms:
                if not room.is_main and not room.is_hallway:
                    room.is_hallway = True
    
    def _find_intersecting_rooms(self, corridor: Dict, params: PhysicsLayoutParams) -> List[PhysicsRoom]:
        """Find rooms that intersect with a corridor line."""
        intersecting = []
        
        start_x, start_y = corridor['start']
        end_x, end_y = corridor['end']
        
        # Create bounding box for corridor with buffer
        buffer = params.corridor_intersection_buffer
        min_x = min(start_x, end_x) - buffer
        max_x = max(start_x, end_x) + buffer
        min_y = min(start_y, end_y) - buffer
        max_y = max(start_y, end_y) + buffer
        
        for room in self.rooms:
            if (room.x < max_x and room.x + room.width > min_x and
                room.y < max_y and room.y + room.height > min_y):
                intersecting.append(room)
        
        return intersecting
    
    def _draw_corridors(self, params: PhysicsLayoutParams):
        """Draw corridor lines on the grid."""
        for corridor in self.corridors:
            start_x, start_y = corridor['start']
            end_x, end_y = corridor['end']
            
            if corridor['direction'] == 'horizontal':
                self._draw_horizontal_corridor(start_x, end_x, start_y, params)
            elif corridor['direction'] == 'vertical':
                self._draw_vertical_corridor(start_y, end_y, start_x, params)
            elif corridor['direction'] == 'direct':
                self._draw_direct_corridor(start_x, start_y, end_x, end_y, params)
    
    def _draw_horizontal_corridor(self, start_x: float, end_x: float, y: float, params: PhysicsLayoutParams):
        """Draw a horizontal corridor line."""
        x_start = int(min(start_x, end_x))
        x_end = int(max(start_x, end_x))
        y_center = int(y)
        
        half_width = params.corridor_width // 2
        
        for x in range(x_start, x_end + 1):
            for dy in range(-half_width, half_width + 1):
                grid_y = y_center + dy
                if 0 <= x < self.width and 0 <= grid_y < self.height:
                    if self.grid[grid_y, x] == 0:  # Only if empty
                        self.grid[grid_y, x] = 3  # Corridor
    
    def _draw_vertical_corridor(self, start_y: float, end_y: float, x: float, params: PhysicsLayoutParams):
        """Draw a vertical corridor line."""
        y_start = int(min(start_y, end_y))
        y_end = int(max(start_y, end_y))
        x_center = int(x)
        
        half_width = params.corridor_width // 2
        
        for y in range(y_start, y_end + 1):
            for dx in range(-half_width, half_width + 1):
                grid_x = x_center + dx
                if 0 <= grid_x < self.width and 0 <= y < self.height:
                    if self.grid[y, grid_x] == 0:  # Only if empty
                        self.grid[y, grid_x] = 3  # Corridor
    
    def _draw_direct_corridor(self, start_x: float, start_y: float, end_x: float, end_y: float, 
                            params: PhysicsLayoutParams):
        """Draw a direct line corridor between two points."""
        # Bresenham-like line drawing with width
        dx = abs(end_x - start_x)
        dy = abs(end_y - start_y)
        
        steps = max(int(dx), int(dy))
        if steps == 0:
            return
        
        x_inc = (end_x - start_x) / steps
        y_inc = (end_y - start_y) / steps
        
        half_width = params.corridor_width // 2
        
        for i in range(steps + 1):
            x = int(start_x + i * x_inc)
            y = int(start_y + i * y_inc)
            
            for dx in range(-half_width, half_width + 1):
                for dy in range(-half_width, half_width + 1):
                    grid_x = x + dx
                    grid_y = y + dy
                    
                    if 0 <= grid_x < self.width and 0 <= grid_y < self.height:
                        if self.grid[grid_y, grid_x] == 0:  # Only if empty
                            self.grid[grid_y, grid_x] = 3  # Corridor
    
    def export_to_json(self) -> Dict:
        """Export layout data to JSON format."""
        rooms_data = []
        
        for room in self.rooms:
            if room.is_main or room.is_hallway:
                room_type = 'main' if room.is_main else 'hallway'
                rooms_data.append({
                    'id': room.id,
                    'center': [int(room.x + room.width // 2), int(room.y + room.height // 2)],
                    'bounds': {
                        'min_x': int(room.x),
                        'max_x': int(room.x + room.width),
                        'min_y': int(room.y),
                        'max_y': int(room.y + room.height)
                    },
                    'area': room.width * room.height,
                    'type': room_type
                })
        
        return {
            'rooms': rooms_data,
            'algorithm': 'physics_tinykep',
            'graph_data': {
                'nodes': list(self.graph.nodes()),
                'edges': list(self.graph.edges()),
                'room_count': len([r for r in self.rooms if r.is_main or r.is_hallway]),
                'edge_count': len(self.graph.edges())
            },
            'parameters': self.params.__dict__ if self.params else {}
        } 