import time
import random
import numpy as np
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass

from core import LayoutGenerator, LayoutResult, Room
from shapes import Polyomino, BuildingBlock, ShapeLibrary
from graph_utils import GraphBuilder

@dataclass
class LayoutParams:
    rooms: int = 8
    graph_type: str = "linear"
    room_scale: int = 3
    margin: int = 3
    max_attempts: int = 100

class PolyominoLayoutGenerator(LayoutGenerator):
    def __init__(self, width: int = 50, height: int = 50):
        super().__init__(width, height)
        self.blocks = ShapeLibrary.dungeon_blocks()
    
    @property
    def algorithm_name(self) -> str:
        return "polyomino"
    
    def generate(self, **params) -> LayoutResult:
        start_time = time.time()
        layout_params = LayoutParams(**params)
        
        try:
            graph = GraphBuilder.create_graph(layout_params.graph_type, layout_params.rooms)
            placed_rooms = self._place_rooms(layout_params, graph)
            
            # Validate connectivity before creating grid
            connectivity_valid = self._validate_connectivity(graph, placed_rooms)
            
            grid = self._create_grid(placed_rooms, layout_params, graph)
            rooms = self._convert_rooms(placed_rooms, layout_params.room_scale)
            
            return LayoutResult(
                grid=grid,
                rooms=rooms,
                metadata={
                    'graph_edges': list(graph.edges()),
                    'graph_data': {
                        'nodes': list(graph.nodes()),
                        'edges': list(graph.edges()),
                        'room_count': len(placed_rooms),
                        'edge_count': len(list(graph.edges()))
                    },
                    'connectivity_validated': connectivity_valid,
                    'room_type_counts': self._count_room_types(placed_rooms),
                    'params': params
                },
                algorithm=self.algorithm_name,
                generation_time=time.time() - start_time,
                success=len(placed_rooms) > 0 and connectivity_valid
            )
        except Exception as e:
            return LayoutResult(
                grid=np.zeros((self.height, self.width), dtype=int),
                rooms=[],
                metadata={'error': str(e)},
                algorithm=self.algorithm_name,
                generation_time=time.time() - start_time,
                success=False
            )
    
    def _place_rooms(self, params: LayoutParams, graph) -> List[Dict]:
        placed = []
        
        # Create a deterministic room type assignment plan
        room_types = self._assign_room_types(params.rooms, params.graph_type)
        
        # Place first room (always entrance)
        first_block = self._get_block_for_type(room_types[0])
        first_shape = ShapeLibrary.select_variant(first_block)
        
        x = self.width // 2 - (first_shape.width * params.room_scale) // 2
        y = self.height // 2 - (first_shape.height * params.room_scale) // 2
        
        placed.append({
            'id': 0,
            'block': first_block,
            'shape': first_shape,
            'x': x,
            'y': y
        })
        
        for room_id in range(1, params.rooms):
            block = self._get_block_for_type(room_types[room_id])
            shape = ShapeLibrary.select_variant(block)
            
            for _ in range(params.max_attempts):
                if self._try_place_room(room_id, block, shape, placed, params, graph):
                    break
        
        return placed
    
    def _assign_room_types(self, num_rooms: int, graph_type: str) -> List[str]:
        """Assign room types ensuring exactly one entrance and proper distribution"""
        if num_rooms <= 0:
            return []
        
        room_types = ['entrance']  # First room is always entrance
        
        if num_rooms == 1:
            return room_types
        
        # Last room is boss for linear/tree graphs
        if graph_type in ['linear', 'tree']:
            boss_room = num_rooms - 1
        else:
            # For mesh/complex graphs, put boss at a strategic position
            boss_room = min(3, num_rooms - 1)
        
        # Assign boss room
        boss_assigned = False
        
        # Fill in remaining rooms
        available_types = ['chamber', 'treasure', 'corridor']
        weights = [3.0, 1.5, 2.5]  # Based on original weights
        
        for room_id in range(1, num_rooms):
            if room_id == boss_room and not boss_assigned:
                room_types.append('boss')
                boss_assigned = True
            else:
                # Randomly select from non-unique types
                selected_type = random.choices(available_types, weights=weights)[0]
                room_types.append(selected_type)
        
        return room_types
    
    def _get_block_for_type(self, room_type: str) -> BuildingBlock:
        """Get a building block of the specified type"""
        # Filter blocks by room type
        type_blocks = [block for block in self.blocks if block.room_type == room_type]
        
        if not type_blocks:
            # Fallback to chamber if type not found
            type_blocks = [block for block in self.blocks if block.room_type == 'chamber']
            if not type_blocks:
                # Final fallback to any block
                type_blocks = self.blocks
        
        return ShapeLibrary.select_block(type_blocks)
    
    def _try_place_room(self, room_id: int, block: BuildingBlock, shape: Polyomino,
                       placed: List[Dict], params: LayoutParams, graph) -> bool:
        neighbors = list(graph.neighbors(room_id))
        
        if neighbors:
            parent = next((r for r in placed if r['id'] in neighbors), None)
            if parent:
                x, y = self._find_adjacent_position(parent, shape, params)
            else:
                x, y = self._find_random_position(shape, params)
        else:
            x, y = self._find_random_position(shape, params)
        
        if self._is_valid_position(x, y, shape, placed, params):
            placed.append({
                'id': room_id,
                'block': block,
                'shape': shape,
                'x': x,
                'y': y
            })
            return True
        return False
    
    def _find_adjacent_position(self, parent: Dict, shape: Polyomino, params: LayoutParams) -> Tuple[int, int]:
        parent_shape = parent['shape']
        parent_x, parent_y = parent['x'], parent['y']
        
        parent_w = parent_shape.width * params.room_scale
        parent_h = parent_shape.height * params.room_scale
        new_w = shape.width * params.room_scale
        new_h = shape.height * params.room_scale
        
        gap = 1
        positions = [
            (parent_x + parent_w + gap, parent_y),
            (parent_x - new_w - gap, parent_y),
            (parent_x, parent_y + parent_h + gap),
            (parent_x, parent_y - new_h - gap),
        ]
        
        valid_positions = []
        for x, y in positions:
            if (params.margin <= x <= self.width - new_w - params.margin and
                params.margin <= y <= self.height - new_h - params.margin):
                valid_positions.append((x, y))
        
        return random.choice(valid_positions) if valid_positions else self._find_random_position(shape, params)
    
    def _find_random_position(self, shape: Polyomino, params: LayoutParams) -> Tuple[int, int]:
        w = shape.width * params.room_scale
        h = shape.height * params.room_scale
        
        max_x = self.width - w - params.margin
        max_y = self.height - h - params.margin
        
        if max_x < params.margin or max_y < params.margin:
            return (params.margin, params.margin)
        
        return (random.randint(params.margin, max_x), random.randint(params.margin, max_y))
    
    def _is_valid_position(self, x: int, y: int, shape: Polyomino, placed: List[Dict], params: LayoutParams) -> bool:
        w = shape.width * params.room_scale
        h = shape.height * params.room_scale
        
        if (x < params.margin or y < params.margin or
            x + w > self.width - params.margin or y + h > self.height - params.margin):
            return False
        
        new_bounds = {'min_x': x, 'max_x': x + w, 'min_y': y, 'max_y': y + h}
        
        for room in placed:
            room_w = room['shape'].width * params.room_scale
            room_h = room['shape'].height * params.room_scale
            room_bounds = {
                'min_x': room['x'] - 1,
                'max_x': room['x'] + room_w + 1,
                'min_y': room['y'] - 1,
                'max_y': room['y'] + room_h + 1
            }
            
            if not (new_bounds['max_x'] <= room_bounds['min_x'] or
                    new_bounds['min_x'] >= room_bounds['max_x'] or
                    new_bounds['max_y'] <= room_bounds['min_y'] or
                    new_bounds['min_y'] >= room_bounds['max_y']):
                return False
        
        return True
    
    def _create_grid(self, placed_rooms: List[Dict], params: LayoutParams, graph) -> np.ndarray:
        grid = np.zeros((self.height, self.width), dtype=int)
        room_cells = {}
        all_floor_cells = set()
        
        for room in placed_rooms:
            cells = room['shape'].scale(params.room_scale)
            offset_cells = [(room['x'] + x, room['y'] + y) for x, y in cells]
            room_cells[room['id']] = set(offset_cells)
            all_floor_cells.update(offset_cells)
        
        for room in placed_rooms:
            room_type = room['block'].room_type
            cell_value = self._get_cell_value(room_type)
            
            for x, y in room_cells[room['id']]:
                if 0 <= x < self.width and 0 <= y < self.height:
                    grid[y, x] = cell_value
        
        wall_cells = set()
        for x, y in all_floor_cells:
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx == 0 and dy == 0:
                        continue
                    wx, wy = x + dx, y + dy
                    if (0 <= wx < self.width and 0 <= wy < self.height and
                        (wx, wy) not in all_floor_cells):
                        wall_cells.add((wx, wy))
        
        for x, y in wall_cells:
            grid[y, x] = 2
        
        for edge in graph.edges():
            self._place_door(grid, edge, room_cells)
        
        return grid
    
    def _get_cell_value(self, room_type: str) -> int:
        type_map = {
            "entrance": 6,
            "boss": 7,
            "corridor": 3,
            "treasure": 5
        }
        return type_map.get(room_type, 1)
    
    def _place_door(self, grid: np.ndarray, edge: Tuple[int, int], room_cells: Dict[int, Set[Tuple[int, int]]]):
        room1_cells = room_cells.get(edge[0], set())
        room2_cells = room_cells.get(edge[1], set())
        
        if not room1_cells or not room2_cells:
            return
        
        for x1, y1 in room1_cells:
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                wall_x, wall_y = x1 + dx, y1 + dy
                room2_x, room2_y = wall_x + dx, wall_y + dy
                
                if ((room2_x, room2_y) in room2_cells and
                    0 <= wall_x < self.width and 0 <= wall_y < self.height and
                    grid[wall_y, wall_x] == 2):
                    grid[wall_y, wall_x] = 4
                    return
    
    def _convert_rooms(self, placed_rooms: List[Dict], room_scale: int) -> List[Room]:
        rooms = []
        
        for room_data in placed_rooms:
            shape = room_data['shape']
            x, y = room_data['x'], room_data['y']
            w = shape.width * room_scale
            h = shape.height * room_scale
            
            rooms.append(Room(
                id=room_data['id'],
                center=(x + w // 2, y + h // 2),
                bounds={'min_x': x, 'max_x': x + w, 'min_y': y, 'max_y': y + h},
                area=shape.area * room_scale * room_scale,
                room_type=room_data['block'].room_type,
                shape='polyomino',
                metadata={
                    'block_id': room_data['block'].id,
                    'scale': room_scale
                }
            ))
        
        return rooms
    
    def _validate_connectivity(self, graph, placed_rooms) -> bool:
        """Validate that all placed rooms are reachable from the entrance"""
        if not placed_rooms:
            return False
        
        # Build adjacency list from actual placed rooms and graph edges
        placed_ids = {room['id'] for room in placed_rooms}
        adjacency = {room_id: [] for room_id in placed_ids}
        
        for edge in graph.edges():
            room1, room2 = edge
            if room1 in placed_ids and room2 in placed_ids:
                adjacency[room1].append(room2)
                adjacency[room2].append(room1)
        
        # BFS from entrance (room 0) to check reachability
        visited = set()
        queue = [0]  # Start from entrance
        visited.add(0)
        
        while queue:
            current = queue.pop(0)
            for neighbor in adjacency.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        
        # All placed rooms should be reachable
        return len(visited) == len(placed_ids)
    
    def _count_room_types(self, placed_rooms) -> Dict[str, int]:
        """Count occurrences of each room type"""
        counts = {}
        for room in placed_rooms:
            room_type = room['block'].room_type
            counts[room_type] = counts.get(room_type, 0) + 1
        return counts 