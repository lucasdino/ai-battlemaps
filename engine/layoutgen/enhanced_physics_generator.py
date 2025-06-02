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
class EnhancedPhysicsRoom:
    id: int
    geometry: RoomGeometry
    is_main: bool = False
    is_hallway: bool = False
    
    @property
    def center(self) -> Tuple[float, float]:
        return self.geometry.center
    
    @property
    def bounds(self) -> Dict[str, float]:
        return self.geometry.bounds
    
    @property
    def area(self) -> float:
        return self.geometry.area
    
    def overlaps(self, other: 'EnhancedPhysicsRoom') -> bool:
        return self.geometry.overlaps(other.geometry)

@dataclass
class EnhancedPhysicsLayoutParams:
    # Room generation
    num_rooms: int = 50
    spawn_radius: float = 20
    room_size_mean: int = 8
    room_size_std: int = 3
    room_size_min: int = 3
    room_size_max: int = 20
    
    # Shape preferences
    shape_preferences: Dict[RoomShape, float] = None
    circular_room_ratio: float = 0.3
    l_shape_ratio: float = 0.2
    irregular_ratio: float = 0.1
    polyomino_ratio: float = 0.1
    
    # Room selection
    main_room_threshold: float = 1.25
    min_main_rooms: int = 3
    main_room_selection_ratio: float = 0.3
    
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
    corridor_style: str = "L_shaped"
    corridor_intersection_buffer: float = 1.0
    
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

class EnhancedPhysicsLayoutGenerator:
    def __init__(self, width: int = 50, height: int = 50):
        self.width = width
        self.height = height
        self.rooms = []
        self.main_rooms = []
        self.graph = nx.Graph()
        self.corridors = []
        self.grid = np.zeros((height, width), dtype=int)
        self.params = None
        
    def generate_layout(self, params: Optional[EnhancedPhysicsLayoutParams] = None) -> np.ndarray:
        if params is None:
            params = EnhancedPhysicsLayoutParams()
        
        self.params = params
        self._reset()
        
        # Step 1: Generate rooms with various shapes
        self._generate_shaped_rooms(params)
        
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
        self.rooms = []
        self.main_rooms = []
        self.graph.clear()
        self.corridors = []
        self.grid = np.zeros((self.height, self.width), dtype=int)
    
    def _generate_shaped_rooms(self, params: EnhancedPhysicsLayoutParams):
        for i in range(params.num_rooms):
            # Random position in circle
            x, y = self._get_random_point_in_circle(params)
            
            # Calculate target area
            area_mean = params.room_size_mean * params.room_size_mean
            area_std = area_mean * 0.3
            target_area = max(params.room_size_min * params.room_size_min,
                            min(params.room_size_max * params.room_size_max,
                                np.random.normal(area_mean, area_std)))
            
            # Generate room with random shape
            geometry = RoomShapeGenerator.generate_random_shape(
                x, y, target_area, params.shape_preferences
            )
            
            # Ensure room fits in grid
            geometry = self._constrain_to_grid(geometry, params)
            
            room = EnhancedPhysicsRoom(id=i, geometry=geometry)
            self.rooms.append(room)
    
    def _get_random_point_in_circle(self, params: EnhancedPhysicsLayoutParams) -> Tuple[int, int]:
        t = 2 * math.pi * random.random()
        u = random.random() + random.random()
        r = 2 - u if u > 1 else u
        
        x = params.spawn_radius * r * math.cos(t)
        y = params.spawn_radius * r * math.sin(t)
        
        # Center in grid
        x += self.width // 2
        y += self.height // 2
        
        return int(x), int(y)
    
    def _constrain_to_grid(self, geometry: RoomGeometry, params: EnhancedPhysicsLayoutParams) -> RoomGeometry:
        bounds = geometry.bounds
        
        # Calculate needed adjustment
        adjust_x = 0
        adjust_y = 0
        
        if bounds['min_x'] < params.grid_edge_margin:
            adjust_x = params.grid_edge_margin - bounds['min_x']
        elif bounds['max_x'] > self.width - params.grid_edge_margin:
            adjust_x = (self.width - params.grid_edge_margin) - bounds['max_x']
        
        if bounds['min_y'] < params.grid_edge_margin:
            adjust_y = params.grid_edge_margin - bounds['min_y']
        elif bounds['max_y'] > self.height - params.grid_edge_margin:
            adjust_y = (self.height - params.grid_edge_margin) - bounds['max_y']
        
        if adjust_x != 0 or adjust_y != 0:
            # Translate the geometry
            from shapely.affinity import translate
            new_polygon = translate(geometry.polygon, xoff=adjust_x, yoff=adjust_y)
            
            new_center = (geometry.center[0] + adjust_x, geometry.center[1] + adjust_y)
            new_bounds = {
                'min_x': bounds['min_x'] + adjust_x,
                'max_x': bounds['max_x'] + adjust_x,
                'min_y': bounds['min_y'] + adjust_y,
                'max_y': bounds['max_y'] + adjust_y
            }
            
            geometry.polygon = new_polygon
            geometry.center = new_center
            geometry.bounds = new_bounds
        
        return geometry
    
    def _separate_rooms(self, params: EnhancedPhysicsLayoutParams):
        for iteration in range(params.max_physics_iterations):
            any_overlap = False
            forces = [(0.0, 0.0) for _ in self.rooms]
            max_movement = 0.0
            
            # Calculate separation forces
            for i, room1 in enumerate(self.rooms):
                for j, room2 in enumerate(self.rooms):
                    if i != j and room1.overlaps(room2):
                        any_overlap = True
                        
                        # Calculate separation force
                        dx = room1.center[0] - room2.center[0]
                        dy = room1.center[1] - room2.center[1]
                        
                        if dx == 0 and dy == 0:
                            dx = random.uniform(-1, 1)
                            dy = random.uniform(-1, 1)
                        
                        distance = math.sqrt(dx * dx + dy * dy)
                        if distance > 0:
                            force_magnitude = params.separation_force / distance
                            forces[i] = (forces[i][0] + force_magnitude * dx, 
                                       forces[i][1] + force_magnitude * dy)
            
            # Apply forces
            for i, (fx, fy) in enumerate(forces):
                old_center = self.rooms[i].center
                
                # Calculate new position
                new_x = old_center[0] + fx
                new_y = old_center[1] + fy
                
                # Translate the geometry
                from shapely.affinity import translate
                dx = new_x - old_center[0]
                dy = new_y - old_center[1]
                
                new_polygon = translate(self.rooms[i].geometry.polygon, xoff=dx, yoff=dy)
                
                # Update geometry
                self.rooms[i].geometry.polygon = new_polygon
                self.rooms[i].geometry.center = (new_x, new_y)
                self.rooms[i].geometry.bounds = {
                    'min_x': self.rooms[i].geometry.bounds['min_x'] + dx,
                    'max_x': self.rooms[i].geometry.bounds['max_x'] + dx,
                    'min_y': self.rooms[i].geometry.bounds['min_y'] + dy,
                    'max_y': self.rooms[i].geometry.bounds['max_y'] + dy
                }
                
                # Constrain to grid
                self.rooms[i].geometry = self._constrain_to_grid(self.rooms[i].geometry, params)
                
                # Track movement
                movement = abs(dx) + abs(dy)
                max_movement = max(max_movement, movement)
            
            # Check for convergence
            if not any_overlap or max_movement < params.convergence_threshold:
                break
    
    def _select_main_rooms(self, params: EnhancedPhysicsLayoutParams):
        threshold_area = (params.room_size_mean * params.main_room_threshold) ** 2
        
        self.main_rooms = []
        for room in self.rooms:
            if room.area >= threshold_area:
                room.is_main = True
                self.main_rooms.append(room)
        
        # If no rooms meet the threshold, select the largest ones
        if len(self.main_rooms) < params.min_main_rooms and len(self.rooms) > 0:
            sorted_rooms = sorted(self.rooms, key=lambda r: r.area, reverse=True)
            num_to_select = max(params.min_main_rooms, 
                              int(len(sorted_rooms) * params.main_room_selection_ratio))
            
            # Clear previous selections
            for room in self.rooms:
                room.is_main = False
            self.main_rooms = []
            
            for i in range(min(num_to_select, len(sorted_rooms))):
                sorted_rooms[i].is_main = True
                self.main_rooms.append(sorted_rooms[i])
    
    def _create_delaunay_graph(self, params: EnhancedPhysicsLayoutParams):
        if len(self.main_rooms) < params.min_triangulation_rooms:
            return
        
        # Get centers of main rooms
        points = [room.center for room in self.main_rooms]
        
        if len(points) >= 3:
            tri = Delaunay(points)
            
            # Create graph from triangulation
            for simplex in tri.simplices:
                for i in range(3):
                    for j in range(i + 1, 3):
                        room_id_1 = self.main_rooms[simplex[i]].id
                        room_id_2 = self.main_rooms[simplex[j]].id
                        self.graph.add_edge(room_id_1, room_id_2)
    
    def _create_minimum_spanning_tree(self) -> nx.Graph:
        if len(self.graph.edges()) == 0:
            return self.graph.copy()
        
        return nx.minimum_spanning_tree(self.graph)
    
    def _add_reconnection_edges(self, mst_graph: nx.Graph, params: EnhancedPhysicsLayoutParams):
        original_edges = set(self.graph.edges())
        mst_edges = set(mst_graph.edges())
        available_edges = list(original_edges - mst_edges)
        
        num_to_add = int(len(available_edges) * params.edge_reconnect_percent)
        edges_to_add = random.sample(available_edges, min(num_to_add, len(available_edges)))
        
        for edge in edges_to_add:
            mst_graph.add_edge(*edge)
        
        self.graph = mst_graph
    
    def _create_corridors(self, params: EnhancedPhysicsLayoutParams):
        self.corridors = []
        room_lookup = {room.id: room for room in self.main_rooms}
        
        for edge in self.graph.edges():
            room1 = room_lookup.get(edge[0])
            room2 = room_lookup.get(edge[1])
            
            if room1 and room2:
                corridors = self._create_corridor_between_rooms(room1, room2, params)
                self.corridors.extend(corridors)
    
    def _create_corridor_between_rooms(self, room1: EnhancedPhysicsRoom, room2: EnhancedPhysicsRoom, 
                                     params: EnhancedPhysicsLayoutParams) -> List[Dict]:
        corridors = []
        
        x1, y1 = room1.center
        x2, y2 = room2.center
        
        if params.corridor_style == "L_shaped":
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
        elif params.corridor_style == "straight":
            corridors.append({
                'start': (x1, y1),
                'end': (x2, y2),
                'direction': 'direct'
            })
        
        return corridors
    
    def _create_final_grid(self, params: EnhancedPhysicsLayoutParams):
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
    
    def _place_room_on_grid(self, room: EnhancedPhysicsRoom, is_main: bool, params: EnhancedPhysicsLayoutParams):
        # Get all grid points inside the room
        room_points = room.geometry.get_grid_points()
        perimeter_points = room.geometry.get_perimeter_points()
        
        # Fill room interior
        for x, y in room_points:
            if 0 <= x < self.width and 0 <= y < self.height:
                if params.room_interior_fill:
                    self.grid[y, x] = 1  # Floor
        
        # Place walls on perimeter
        if params.place_walls:
            for x, y in perimeter_points:
                if 0 <= x < self.width and 0 <= y < self.height:
                    if self.grid[y, x] == 0:  # Don't overwrite existing
                        self.grid[y, x] = 2  # Wall
        
        # Place room center marker
        center_x = int(room.center[0])
        center_y = int(room.center[1])
        
        if 0 <= center_x < self.width and 0 <= center_y < self.height:
            if is_main:
                room_types = [6, 7, 8, 9, 10, 11]
                self.grid[center_y, center_x] = random.choice(room_types)
            else:
                self.grid[center_y, center_x] = 3
    
    def _create_corridor_rooms(self, params: EnhancedPhysicsLayoutParams):
        for corridor in self.corridors:
            intersecting_rooms = self._find_intersecting_rooms(corridor, params)
            for room in intersecting_rooms:
                if not room.is_main and not room.is_hallway:
                    room.is_hallway = True
    
    def _find_intersecting_rooms(self, corridor: Dict, params: EnhancedPhysicsLayoutParams) -> List[EnhancedPhysicsRoom]:
        intersecting = []
        
        start_x, start_y = corridor['start']
        end_x, end_y = corridor['end']
        
        buffer = params.corridor_intersection_buffer
        min_x = min(start_x, end_x) - buffer
        max_x = max(start_x, end_x) + buffer
        min_y = min(start_y, end_y) - buffer
        max_y = max(start_y, end_y) + buffer
        
        for room in self.rooms:
            bounds = room.bounds
            if (bounds['min_x'] < max_x and bounds['max_x'] > min_x and
                bounds['min_y'] < max_y and bounds['max_y'] > min_y):
                intersecting.append(room)
        
        return intersecting
    
    def _draw_corridors(self, params: EnhancedPhysicsLayoutParams):
        for corridor in self.corridors:
            if corridor['direction'] == 'horizontal':
                self._draw_horizontal_corridor(corridor['start'][0], corridor['end'][0], 
                                             corridor['start'][1], params)
            elif corridor['direction'] == 'vertical':
                self._draw_vertical_corridor(corridor['start'][1], corridor['end'][1], 
                                           corridor['start'][0], params)
            elif corridor['direction'] == 'direct':
                self._draw_direct_corridor(corridor['start'][0], corridor['start'][1],
                                         corridor['end'][0], corridor['end'][1], params)
    
    def _draw_horizontal_corridor(self, start_x: float, end_x: float, y: float, params: EnhancedPhysicsLayoutParams):
        start_x, end_x = min(start_x, end_x), max(start_x, end_x)
        width = params.corridor_width
        
        for x in range(int(start_x), int(end_x) + 1):
            for dy in range(-width//2, width//2 + 1):
                cy = int(y) + dy
                if 0 <= x < self.width and 0 <= cy < self.height:
                    if self.grid[cy, x] == 0:
                        self.grid[cy, x] = 3
    
    def _draw_vertical_corridor(self, start_y: float, end_y: float, x: float, params: EnhancedPhysicsLayoutParams):
        start_y, end_y = min(start_y, end_y), max(start_y, end_y)
        width = params.corridor_width
        
        for y in range(int(start_y), int(end_y) + 1):
            for dx in range(-width//2, width//2 + 1):
                cx = int(x) + dx
                if 0 <= cx < self.width and 0 <= y < self.height:
                    if self.grid[y, cx] == 0:
                        self.grid[y, cx] = 3
    
    def _draw_direct_corridor(self, start_x: float, start_y: float, end_x: float, end_y: float, params: EnhancedPhysicsLayoutParams):
        # Simple line drawing using Bresenham's algorithm
        x1, y1 = int(start_x), int(start_y)
        x2, y2 = int(end_x), int(end_y)
        
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        x, y = x1, y1
        x_inc = 1 if x1 < x2 else -1
        y_inc = 1 if y1 < y2 else -1
        error = dx - dy
        
        width = params.corridor_width
        
        for _ in range(dx + dy):
            for dx_offset in range(-width//2, width//2 + 1):
                for dy_offset in range(-width//2, width//2 + 1):
                    cx, cy = x + dx_offset, y + dy_offset
                    if 0 <= cx < self.width and 0 <= cy < self.height:
                        if self.grid[cy, cx] == 0:
                            self.grid[cy, cx] = 3
            
            if error > 0:
                x += x_inc
                error -= dy
            else:
                y += y_inc
                error += dx
    
    def export_to_json(self) -> Dict:
        rooms_data = []
        
        for room in self.rooms:
            if room.is_main or room.is_hallway:
                room_type = 'main' if room.is_main else 'hallway'
                rooms_data.append({
                    'id': room.id,
                    'center': list(room.center),
                    'bounds': room.bounds,
                    'area': room.area,
                    'type': room_type,
                    'shape': room.geometry.shape.value
                })
        
        return {
            'rooms': rooms_data,
            'algorithm': 'enhanced_physics',
            'graph_data': {
                'nodes': list(self.graph.nodes()),
                'edges': list(self.graph.edges()),
                'room_count': len([r for r in self.rooms if r.is_main or r.is_hallway]),
                'edge_count': len(self.graph.edges())
            },
            'parameters': self.params.__dict__ if self.params else {}
        } 