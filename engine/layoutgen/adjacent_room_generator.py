import numpy as np
import networkx as nx
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
import random
import math
from scipy.spatial import Delaunay
from scipy.spatial.distance import euclidean

from room_shapes import RoomGeometry, RoomShape, RoomShapeGenerator

@dataclass
class AdjacentRoom:
    id: int
    geometry: RoomGeometry
    is_main: bool = False
    doors: List[Tuple[int, int]] = None  # List of door positions
    
    def __post_init__(self):
        if self.doors is None:
            self.doors = []
    
    @property
    def center(self) -> Tuple[float, float]:
        return self.geometry.center
    
    @property
    def bounds(self) -> Dict[str, float]:
        return self.geometry.bounds
    
    @property
    def area(self) -> float:
        return self.geometry.area
    
    def is_adjacent(self, other: 'AdjacentRoom', tolerance: float = 1.5) -> bool:
        """Check if rooms are adjacent (touching but not overlapping)."""
        # Two rooms are adjacent if their distance is very small (touching)
        bounds1 = self.bounds
        bounds2 = other.bounds
        
        # Check if rooms are touching horizontally
        if (abs(bounds1['max_x'] - bounds2['min_x']) <= tolerance or 
            abs(bounds2['max_x'] - bounds1['min_x']) <= tolerance):
            # Check if they overlap vertically (share some Y range)
            overlap_y = not (bounds1['max_y'] <= bounds2['min_y'] or bounds2['max_y'] <= bounds1['min_y'])
            if overlap_y:
                return True
        
        # Check if rooms are touching vertically
        if (abs(bounds1['max_y'] - bounds2['min_y']) <= tolerance or 
            abs(bounds2['max_y'] - bounds1['min_y']) <= tolerance):
            # Check if they overlap horizontally (share some X range)
            overlap_x = not (bounds1['max_x'] <= bounds2['min_x'] or bounds2['max_x'] <= bounds1['min_x'])
            if overlap_x:
                return True
        
        return False
    
    def overlaps(self, other: 'AdjacentRoom') -> bool:
        """Check if rooms overlap (not just touching)."""
        return self.geometry.overlaps(other.geometry)
    
    def get_shared_wall(self, other: 'AdjacentRoom') -> Optional[List[Tuple[int, int]]]:
        """Get the shared wall coordinates between two adjacent rooms."""
        if not self.is_adjacent(other):
            return None
        
        bounds1 = self.bounds
        bounds2 = other.bounds
        shared_wall = []
        
        # Check horizontal adjacency
        if abs(bounds1['max_x'] - bounds2['min_x']) <= 0.1:
            # Room1 is to the left of room2
            wall_x = int(bounds1['max_x'])
            start_y = max(int(bounds1['min_y']), int(bounds2['min_y']))
            end_y = min(int(bounds1['max_y']), int(bounds2['max_y']))
            shared_wall = [(wall_x, y) for y in range(start_y, end_y)]
        elif abs(bounds2['max_x'] - bounds1['min_x']) <= 0.1:
            # Room2 is to the left of room1
            wall_x = int(bounds2['max_x'])
            start_y = max(int(bounds1['min_y']), int(bounds2['min_y']))
            end_y = min(int(bounds1['max_y']), int(bounds2['max_y']))
            shared_wall = [(wall_x, y) for y in range(start_y, end_y)]
        
        # Check vertical adjacency
        if abs(bounds1['max_y'] - bounds2['min_y']) <= 0.1:
            # Room1 is above room2
            wall_y = int(bounds1['max_y'])
            start_x = max(int(bounds1['min_x']), int(bounds2['min_x']))
            end_x = min(int(bounds1['max_x']), int(bounds2['max_x']))
            shared_wall = [(x, wall_y) for x in range(start_x, end_x)]
        elif abs(bounds2['max_y'] - bounds1['min_y']) <= 0.1:
            # Room2 is above room1
            wall_y = int(bounds2['max_y'])
            start_x = max(int(bounds1['min_x']), int(bounds2['min_x']))
            end_x = min(int(bounds1['max_x']), int(bounds2['max_x']))
            shared_wall = [(x, wall_y) for x in range(start_x, end_x)]
        
        return shared_wall if shared_wall else None

@dataclass
class AdjacentRoomLayoutParams:
    # Room generation
    num_rooms: int = 20
    room_size_mean: int = 6
    room_size_std: int = 2
    room_size_min: int = 3
    room_size_max: int = 12
    
    # Shape preferences
    shape_preferences: Dict[RoomShape, float] = None
    circular_room_ratio: float = 0.2
    l_shape_ratio: float = 0.2
    irregular_ratio: float = 0.1
    polyomino_ratio: float = 0.1
    
    # Room placement
    placement_strategy: str = "grid_fill"  # "grid_fill", "organic_growth", "cluster"
    grid_spacing: int = 1  # Minimum spacing between non-adjacent rooms
    adjacency_probability: float = 0.7  # Probability that a new room will be adjacent to existing
    
    # Room selection
    main_room_threshold: float = 1.25
    min_main_rooms: int = 3
    
    # Door placement
    door_probability: float = 0.8  # Probability of placing door between adjacent rooms
    min_door_length: int = 1  # Minimum door width
    max_door_length: int = 3  # Maximum door width
    
    # Final grid processing
    place_walls: bool = True
    place_doors: bool = True
    room_interior_fill: bool = True
    
    def __post_init__(self):
        if self.shape_preferences is None:
            remaining_ratio = 1.0 - self.circular_room_ratio - self.l_shape_ratio - self.irregular_ratio - self.polyomino_ratio
            self.shape_preferences = {
                RoomShape.RECTANGLE: max(0.0, remaining_ratio),
                RoomShape.CIRCLE: self.circular_room_ratio,
                RoomShape.L_SHAPE: self.l_shape_ratio,
                RoomShape.IRREGULAR: self.irregular_ratio,
                RoomShape.POLYOMINO: self.polyomino_ratio
            }

class AdjacentRoomLayoutGenerator:
    """Layout generator that creates rooms touching each other with doors."""
    
    def __init__(self, width: int = 40, height: int = 40):
        self.width = width
        self.height = height
        self.rooms = []
        self.main_rooms = []
        self.adjacency_graph = nx.Graph()
        self.grid = np.zeros((height, width), dtype=int)
        self.params = None
        
    def generate_layout(self, params: Optional[AdjacentRoomLayoutParams] = None) -> np.ndarray:
        """Generate layout with adjacent rooms and doors."""
        if params is None:
            params = AdjacentRoomLayoutParams()
        
        self.params = params
        self._reset()
        
        # Step 1: Generate rooms using chosen placement strategy
        if params.placement_strategy == "grid_fill":
            self._generate_grid_fill_rooms(params)
        elif params.placement_strategy == "organic_growth":
            self._generate_organic_growth_rooms(params)
        elif params.placement_strategy == "cluster":
            self._generate_cluster_rooms(params)
        else:
            self._generate_grid_fill_rooms(params)  # Default
        
        # Step 2: Identify room adjacencies
        self._build_adjacency_graph()
        
        # Step 3: Select main rooms
        self._select_main_rooms(params)
        
        # Step 4: Place doors between adjacent rooms
        self._place_doors_between_adjacent_rooms(params)
        
        # Step 5: Create final grid with rooms and doors
        self._create_final_grid(params)
        
        return self.grid
    
    def _reset(self):
        """Reset generator state."""
        self.rooms = []
        self.main_rooms = []
        self.adjacency_graph.clear()
        self.grid = np.zeros((self.height, self.width), dtype=int)
    
    def _generate_grid_fill_rooms(self, params: AdjacentRoomLayoutParams):
        """Generate rooms using grid-filling strategy."""
        # Create a placement grid to track occupied spaces
        placement_grid = np.zeros((self.height, self.width), dtype=bool)
        
        # Start from center and work outward
        center_x, center_y = self.width // 2, self.height // 2
        
        for room_id in range(params.num_rooms):
            attempts = 0
            max_attempts = 100
            placed = False
            
            while attempts < max_attempts and not placed:
                # Calculate target area
                area_mean = params.room_size_mean * params.room_size_mean
                area_std = area_mean * 0.3
                target_area = max(params.room_size_min * params.room_size_min,
                                min(params.room_size_max * params.room_size_max,
                                    np.random.normal(area_mean, area_std)))
                
                # Find available position
                if room_id == 0:
                    # Place first room at center
                    x, y = center_x, center_y
                else:
                    # Try to place adjacent to existing rooms
                    x, y = self._find_adjacent_position(placement_grid, params)
                
                # Generate room geometry
                geometry = RoomShapeGenerator.generate_random_shape(
                    x, y, target_area, params.shape_preferences
                )
                
                # Constrain to grid boundaries
                geometry = self._constrain_to_grid(geometry)
                
                # Check if position is valid
                if self._is_valid_placement(geometry, placement_grid, params):
                    room = AdjacentRoom(id=room_id, geometry=geometry)
                    self.rooms.append(room)
                    self._mark_placement_grid(geometry, placement_grid)
                    placed = True
                
                attempts += 1
            
            if not placed:
                print(f"Warning: Could not place room {room_id} after {max_attempts} attempts")
    
    def _find_adjacent_position(self, placement_grid: np.ndarray, params: AdjacentRoomLayoutParams) -> Tuple[int, int]:
        """Find a position adjacent to existing rooms."""
        if len(self.rooms) == 0:
            return self.width // 2, self.height // 2
        
        # Try to place adjacent to existing rooms with higher probability
        if random.random() < params.adjacency_probability:
            # Collect positions immediately next to existing rooms
            adjacent_positions = []
            
            for room in self.rooms:
                bounds = room.bounds
                # Add positions directly adjacent to room boundaries
                directions = [
                    (int(bounds['max_x']) + 1, int(bounds['min_y'])),  # Right
                    (int(bounds['min_x']) - params.room_size_mean, int(bounds['min_y'])),  # Left
                    (int(bounds['min_x']), int(bounds['max_y']) + 1),  # Below
                    (int(bounds['min_x']), int(bounds['min_y']) - params.room_size_mean),  # Above
                ]
                
                for x, y in directions:
                    if (2 <= x < self.width - params.room_size_max and 
                        2 <= y < self.height - params.room_size_max and
                        not placement_grid[min(y, self.height-1), min(x, self.width-1)]):
                        adjacent_positions.append((x, y))
            
            if adjacent_positions:
                return random.choice(adjacent_positions)
        
        # Fallback to nearby positions
        edge_positions = []
        for room in self.rooms:
            bounds = room.bounds
            # Add positions around the room perimeter (within 3 tiles)
            for x in range(int(bounds['min_x']) - 3, int(bounds['max_x']) + 4):
                for y in range(int(bounds['min_y']) - 3, int(bounds['max_y']) + 4):
                    if (0 <= x < self.width and 0 <= y < self.height and 
                        not placement_grid[y, x]):
                        edge_positions.append((x, y))
        
        if edge_positions:
            return random.choice(edge_positions)
        else:
            # Final fallback to random position
            return random.randint(2, self.width - 3), random.randint(2, self.height - 3)
    
    def _is_valid_placement(self, geometry: RoomGeometry, placement_grid: np.ndarray, 
                          params: AdjacentRoomLayoutParams) -> bool:
        """Check if a room placement is valid."""
        bounds = geometry.bounds
        
        # Check grid boundaries
        if (bounds['min_x'] < 1 or bounds['max_x'] >= self.width - 1 or
            bounds['min_y'] < 1 or bounds['max_y'] >= self.height - 1):
            return False
        
        # Get room grid points
        room_points = geometry.get_grid_points()
        
        # Check for overlaps with existing rooms
        for x, y in room_points:
            if 0 <= x < self.width and 0 <= y < self.height:
                if placement_grid[y, x]:
                    return False
        
        return True
    
    def _mark_placement_grid(self, geometry: RoomGeometry, placement_grid: np.ndarray):
        """Mark room area as occupied on placement grid."""
        room_points = geometry.get_grid_points()
        for x, y in room_points:
            if 0 <= x < self.width and 0 <= y < self.height:
                placement_grid[y, x] = True
    
    def _generate_organic_growth_rooms(self, params: AdjacentRoomLayoutParams):
        """Generate rooms using organic growth strategy (start small, grow outward)."""
        # Start with a seed room
        center_x, center_y = self.width // 2, self.height // 2
        seed_area = params.room_size_mean * params.room_size_mean
        
        seed_geometry = RoomShapeGenerator.generate_random_shape(
            center_x, center_y, seed_area, params.shape_preferences
        )
        seed_room = AdjacentRoom(id=0, geometry=seed_geometry)
        self.rooms.append(seed_room)
        
        # Grow rooms around the seed
        for room_id in range(1, params.num_rooms):
            # Pick a random existing room to grow from
            parent_room = random.choice(self.rooms)
            
            # Generate new room adjacent to parent
            new_room = self._generate_adjacent_room(parent_room, room_id, params)
            if new_room:
                self.rooms.append(new_room)
    
    def _generate_adjacent_room(self, parent_room: AdjacentRoom, room_id: int, 
                              params: AdjacentRoomLayoutParams) -> Optional[AdjacentRoom]:
        """Generate a room adjacent to an existing room."""
        parent_bounds = parent_room.bounds
        
        # Try different adjacent positions
        positions = [
            (parent_bounds['max_x'], parent_bounds['min_y']),  # Right
            (parent_bounds['min_x'] - params.room_size_mean, parent_bounds['min_y']),  # Left
            (parent_bounds['min_x'], parent_bounds['max_y']),  # Below
            (parent_bounds['min_x'], parent_bounds['min_y'] - params.room_size_mean),  # Above
        ]
        
        random.shuffle(positions)
        
        for x, y in positions:
            # Calculate target area
            area_mean = params.room_size_mean * params.room_size_mean
            target_area = np.random.normal(area_mean, area_mean * 0.2)
            
            geometry = RoomShapeGenerator.generate_random_shape(
                x, y, target_area, params.shape_preferences
            )
            
            geometry = self._constrain_to_grid(geometry)
            
            # Check if this room would be valid
            if self._is_room_placement_valid(geometry):
                return AdjacentRoom(id=room_id, geometry=geometry)
        
        return None
    
    def _generate_cluster_rooms(self, params: AdjacentRoomLayoutParams):
        """Generate rooms in clusters."""
        num_clusters = max(2, params.num_rooms // 8)
        rooms_per_cluster = params.num_rooms // num_clusters
        
        room_id = 0
        
        for cluster_id in range(num_clusters):
            # Pick cluster center
            cluster_x = random.randint(params.room_size_max, self.width - params.room_size_max)
            cluster_y = random.randint(params.room_size_max, self.height - params.room_size_max)
            
            # Generate rooms in this cluster
            for _ in range(rooms_per_cluster):
                if room_id >= params.num_rooms:
                    break
                
                # Generate room near cluster center
                offset_x = random.randint(-params.room_size_mean, params.room_size_mean)
                offset_y = random.randint(-params.room_size_mean, params.room_size_mean)
                
                x = cluster_x + offset_x
                y = cluster_y + offset_y
                
                area_mean = params.room_size_mean * params.room_size_mean
                target_area = np.random.normal(area_mean, area_mean * 0.2)
                
                geometry = RoomShapeGenerator.generate_random_shape(
                    x, y, target_area, params.shape_preferences
                )
                
                geometry = self._constrain_to_grid(geometry)
                
                if self._is_room_placement_valid(geometry):
                    room = AdjacentRoom(id=room_id, geometry=geometry)
                    self.rooms.append(room)
                    room_id += 1
    
    def _constrain_to_grid(self, geometry: RoomGeometry) -> RoomGeometry:
        """Constrain room geometry to fit within grid boundaries."""
        bounds = geometry.bounds
        
        # Calculate shifts needed
        shift_x = 0
        shift_y = 0
        
        if bounds['min_x'] < 1:
            shift_x = 1 - bounds['min_x']
        elif bounds['max_x'] >= self.width - 1:
            shift_x = (self.width - 2) - bounds['max_x']
        
        if bounds['min_y'] < 1:
            shift_y = 1 - bounds['min_y']
        elif bounds['max_y'] >= self.height - 1:
            shift_y = (self.height - 2) - bounds['max_y']
        
        # Apply shifts if needed
        if shift_x != 0 or shift_y != 0:
            from shapely.affinity import translate
            new_polygon = translate(geometry.polygon, xoff=shift_x, yoff=shift_y)
            
            new_center = (geometry.center[0] + shift_x, geometry.center[1] + shift_y)
            new_bounds = {
                'min_x': bounds['min_x'] + shift_x,
                'max_x': bounds['max_x'] + shift_x,
                'min_y': bounds['min_y'] + shift_y,
                'max_y': bounds['max_y'] + shift_y
            }
            
            geometry.polygon = new_polygon
            geometry.center = new_center
            geometry.bounds = new_bounds
        
        return geometry
    
    def _is_room_placement_valid(self, geometry: RoomGeometry) -> bool:
        """Check if room placement is valid (no major overlaps)."""
        bounds = geometry.bounds
        
        # Check grid boundaries
        if (bounds['min_x'] < 1 or bounds['max_x'] >= self.width - 1 or
            bounds['min_y'] < 1 or bounds['max_y'] >= self.height - 1):
            return False
        
        # Check for major overlaps with existing rooms
        temp_room = AdjacentRoom(id=-1, geometry=geometry)
        
        for existing_room in self.rooms:
            if temp_room.overlaps(existing_room):
                return False
        
        return True
    
    def _build_adjacency_graph(self):
        """Build graph of room adjacencies."""
        self.adjacency_graph.clear()
        
        # Add all rooms as nodes
        for room in self.rooms:
            self.adjacency_graph.add_node(room.id)
        
        # Check all room pairs for adjacency
        for i, room1 in enumerate(self.rooms):
            for j, room2 in enumerate(self.rooms[i+1:], i+1):
                if room1.is_adjacent(room2):
                    self.adjacency_graph.add_edge(room1.id, room2.id)
    
    def _select_main_rooms(self, params: AdjacentRoomLayoutParams):
        """Select main rooms based on size and connectivity."""
        threshold_area = (params.room_size_mean * params.main_room_threshold) ** 2
        
        self.main_rooms = []
        
        # First, select rooms based on size
        for room in self.rooms:
            if room.area >= threshold_area:
                room.is_main = True
                self.main_rooms.append(room)
        
        # If not enough main rooms, select largest and most connected
        if len(self.main_rooms) < params.min_main_rooms:
            # Score rooms by area and connectivity
            room_scores = []
            for room in self.rooms:
                if not room.is_main:
                    connectivity = len(list(self.adjacency_graph.neighbors(room.id)))
                    score = room.area * (1 + connectivity * 0.5)
                    room_scores.append((score, room))
            
            # Sort by score (first element of tuple) and select top rooms
            room_scores.sort(key=lambda x: x[0], reverse=True)
            needed = params.min_main_rooms - len(self.main_rooms)
            
            for i in range(min(needed, len(room_scores))):
                room = room_scores[i][1]
                room.is_main = True
                self.main_rooms.append(room)
    
    def _place_doors_between_adjacent_rooms(self, params: AdjacentRoomLayoutParams):
        """Place doors between adjacent rooms."""
        for edge in self.adjacency_graph.edges():
            # Find rooms by ID, not by list index
            room1 = None
            room2 = None
            
            for room in self.rooms:
                if room.id == edge[0]:
                    room1 = room
                elif room.id == edge[1]:
                    room2 = room
            
            if room1 and room2 and random.random() < params.door_probability:
                shared_wall = room1.get_shared_wall(room2)
                if shared_wall and len(shared_wall) > 0:
                    # Place door in the middle of shared wall
                    door_length = min(params.max_door_length, 
                                    max(params.min_door_length, len(shared_wall) // 3))
                    
                    # Find center of shared wall
                    mid_point = len(shared_wall) // 2
                    start_idx = max(0, mid_point - door_length // 2)
                    end_idx = min(len(shared_wall), start_idx + door_length)
                    
                    # Add door positions to both rooms
                    door_positions = shared_wall[start_idx:end_idx]
                    room1.doors.extend(door_positions)
                    room2.doors.extend(door_positions)
    
    def _create_final_grid(self, params: AdjacentRoomLayoutParams):
        """Create the final grid with rooms, walls, and doors."""
        self.grid.fill(0)  # Start with void
        
        # Place all rooms
        for room in self.rooms:
            self._place_room_on_grid(room, params)
        
        # Place doors
        if params.place_doors:
            for room in self.rooms:
                for door_x, door_y in room.doors:
                    if 0 <= door_x < self.width and 0 <= door_y < self.height:
                        self.grid[door_y, door_x] = 4  # Door
    
    def _place_room_on_grid(self, room: AdjacentRoom, params: AdjacentRoomLayoutParams):
        """Place a room on the grid with walls and interior."""
        room_points = room.geometry.get_grid_points()
        perimeter_points = room.geometry.get_perimeter_points()
        
        # Fill room interior
        if params.room_interior_fill:
            for x, y in room_points:
                if 0 <= x < self.width and 0 <= y < self.height:
                    self.grid[y, x] = 1  # Floor
        
        # Place walls on perimeter
        if params.place_walls:
            for x, y in perimeter_points:
                if 0 <= x < self.width and 0 <= y < self.height:
                    if self.grid[y, x] == 0:  # Only place wall if empty
                        self.grid[y, x] = 2  # Wall
        
        # Mark room center
        center_x, center_y = int(room.center[0]), int(room.center[1])
        if 0 <= center_x < self.width and 0 <= center_y < self.height:
            if room.is_main:
                self.grid[center_y, center_x] = random.choice([6, 7, 8, 9, 10, 11])  # Main room
            else:
                self.grid[center_y, center_x] = 5  # Regular room
    
    def export_to_json(self) -> Dict:
        """Export layout data to JSON format."""
        rooms_data = []
        
        for room in self.rooms:
            rooms_data.append({
                'id': room.id,
                'center': [int(room.center[0]), int(room.center[1])],
                'bounds': {
                    'min_x': int(room.bounds['min_x']),
                    'max_x': int(room.bounds['max_x']),
                    'min_y': int(room.bounds['min_y']),
                    'max_y': int(room.bounds['max_y'])
                },
                'area': room.area,
                'shape': room.geometry.shape.value,
                'is_main': room.is_main,
                'doors': room.doors,
                'adjacencies': list(self.adjacency_graph.neighbors(room.id))
            })
        
        return {
            'rooms': rooms_data,
            'algorithm': 'adjacent_rooms',
            'adjacency_data': {
                'nodes': list(self.adjacency_graph.nodes()),
                'edges': list(self.adjacency_graph.edges()),
                'room_count': len(self.rooms),
                'door_count': sum(len(room.doors) for room in self.rooms) // 2,  # Each door counted twice
                'adjacency_count': len(self.adjacency_graph.edges())
            },
            'grid': self.grid.tolist(),
            'parameters': self.params.__dict__ if self.params else {}
        } 