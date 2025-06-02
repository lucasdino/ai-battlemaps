import numpy as np
import math
from typing import List, Tuple, Dict, Optional, Union, Set
from dataclasses import dataclass
from enum import Enum
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
import random

class RoomShape(Enum):
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    ELLIPSE = "ellipse"
    L_SHAPE = "l_shape"
    T_SHAPE = "t_shape"
    POLYGON = "polygon"
    IRREGULAR = "irregular"
    POLYOMINO = "polyomino"  # NEW: Arbitrary polyomino shapes

@dataclass
class RoomGeometry:
    shape: RoomShape
    center: Tuple[float, float]
    bounds: Dict[str, float]
    polygon: Polygon
    area: float
    polyomino_cells: Optional[List[Tuple[int, int]]] = None  # NEW: For polyomino shapes
    
    @classmethod
    def from_rectangle(cls, x: float, y: float, width: int, height: int) -> 'RoomGeometry':
        center = (x + width / 2, y + height / 2)
        bounds = {'min_x': x, 'max_x': x + width, 'min_y': y, 'max_y': y + height}
        polygon = Polygon([(x, y), (x + width, y), (x + width, y + height), (x, y + height)])
        area = width * height
        return cls(RoomShape.RECTANGLE, center, bounds, polygon, area)
    
    @classmethod
    def from_circle(cls, center_x: float, center_y: float, radius: float) -> 'RoomGeometry':
        center = (center_x, center_y)
        bounds = {
            'min_x': center_x - radius,
            'max_x': center_x + radius,
            'min_y': center_y - radius,
            'max_y': center_y + radius
        }
        
        # Create circular polygon approximation
        angles = np.linspace(0, 2 * math.pi, 16, endpoint=False)
        points = [(center_x + radius * math.cos(a), center_y + radius * math.sin(a)) for a in angles]
        polygon = Polygon(points)
        area = math.pi * radius * radius
        return cls(RoomShape.CIRCLE, center, bounds, polygon, area)
    
    @classmethod
    def from_l_shape(cls, x: float, y: float, width: int, height: int, 
                     notch_width: int, notch_height: int, notch_corner: str = "bottom_right") -> 'RoomGeometry':
        if notch_corner == "bottom_right":
            points = [
                (x, y), (x + width, y), (x + width, y + height - notch_height),
                (x + width - notch_width, y + height - notch_height),
                (x + width - notch_width, y + height), (x, y + height)
            ]
        elif notch_corner == "top_right":
            points = [
                (x, y), (x + width - notch_width, y),
                (x + width - notch_width, y + notch_height),
                (x + width, y + notch_height), (x + width, y + height),
                (x, y + height)
            ]
        elif notch_corner == "top_left":
            points = [
                (x + notch_width, y), (x + width, y), (x + width, y + height),
                (x, y + height), (x, y + notch_height), (x + notch_width, y + notch_height)
            ]
        else:  # bottom_left
            points = [
                (x, y), (x + width, y), (x + width, y + height),
                (x + notch_width, y + height), (x + notch_width, y + height - notch_height),
                (x, y + height - notch_height)
            ]
        
        polygon = Polygon(points)
        center = (polygon.centroid.x, polygon.centroid.y)
        bounds = {
            'min_x': min(p[0] for p in points),
            'max_x': max(p[0] for p in points),
            'min_y': min(p[1] for p in points),
            'max_y': max(p[1] for p in points)
        }
        area = polygon.area
        return cls(RoomShape.L_SHAPE, center, bounds, polygon, area)
    
    @classmethod
    def from_irregular_polygon(cls, points: List[Tuple[float, float]]) -> 'RoomGeometry':
        polygon = Polygon(points)
        center = (polygon.centroid.x, polygon.centroid.y)
        bounds = {
            'min_x': min(p[0] for p in points),
            'max_x': max(p[0] for p in points),
            'min_y': min(p[1] for p in points),
            'max_y': max(p[1] for p in points)
        }
        area = polygon.area
        return cls(RoomShape.IRREGULAR, center, bounds, polygon, area)
    
    @classmethod
    def from_polyomino(cls, x: int, y: int, cells: List[Tuple[int, int]]) -> 'RoomGeometry':
        """Create a room from a polyomino defined by unit square cells.
        
        Args:
            x, y: Origin position
            cells: List of (dx, dy) offsets from origin representing filled unit squares
        """
        if not cells:
            raise ValueError("Polyomino must have at least one cell")
        
        # Create polygon from unit squares
        polygons = []
        actual_cells = []
        
        for dx, dy in cells:
            cell_x = x + dx
            cell_y = y + dy
            # Create unit square at this position
            square = Polygon([
                (cell_x, cell_y),
                (cell_x + 1, cell_y),
                (cell_x + 1, cell_y + 1),
                (cell_x, cell_y + 1)
            ])
            polygons.append(square)
            actual_cells.append((cell_x, cell_y))
        
        # Union all squares into one polygon
        polygon = unary_union(polygons)
        
        # Calculate bounds
        all_x = [cell[0] for cell in actual_cells] + [cell[0] + 1 for cell in actual_cells]
        all_y = [cell[1] for cell in actual_cells] + [cell[1] + 1 for cell in actual_cells]
        
        bounds = {
            'min_x': min(all_x),
            'max_x': max(all_x),
            'min_y': min(all_y),
            'max_y': max(all_y)
        }
        
        center = (polygon.centroid.x, polygon.centroid.y)
        area = len(cells)  # Each cell has area 1
        
        return cls(RoomShape.POLYOMINO, center, bounds, polygon, area, actual_cells)
    
    def overlaps(self, other: 'RoomGeometry') -> bool:
        return self.polygon.intersects(other.polygon)
    
    def get_grid_points(self) -> List[Tuple[int, int]]:
        if self.shape == RoomShape.POLYOMINO and self.polyomino_cells:
            # For polyominos, return the exact cell positions
            return self.polyomino_cells
        
        # For other shapes, use point-in-polygon testing
        min_x = int(math.floor(self.bounds['min_x']))
        max_x = int(math.ceil(self.bounds['max_x']))
        min_y = int(math.floor(self.bounds['min_y']))
        max_y = int(math.ceil(self.bounds['max_y']))
        
        points = []
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                if self.polygon.contains(Point(x + 0.5, y + 0.5)):  # Test cell center
                    points.append((x, y))
        return points
    
    def get_perimeter_points(self) -> List[Tuple[int, int]]:
        all_points = self.get_grid_points()
        perimeter_points = []
        
        for x, y in all_points:
            # Check if point is on the edge
            neighbors = [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]
            if any((nx, ny) not in all_points for nx, ny in neighbors):
                perimeter_points.append((x, y))
        
        return perimeter_points

class PolyominoGenerator:
    """Generator for creating polyomino shapes."""
    
    # Predefined common polyomino patterns
    TETROMINOES = {
        'I': [(0, 0), (0, 1), (0, 2), (0, 3)],  # Line
        'O': [(0, 0), (0, 1), (1, 0), (1, 1)],  # Square
        'T': [(0, 0), (1, 0), (2, 0), (1, 1)],  # T-shape
        'L': [(0, 0), (0, 1), (0, 2), (1, 2)],  # L-shape
        'J': [(1, 0), (1, 1), (1, 2), (0, 2)],  # J-shape (flipped L)
        'S': [(1, 0), (2, 0), (0, 1), (1, 1)],  # S-shape
        'Z': [(0, 0), (1, 0), (1, 1), (2, 1)]   # Z-shape
    }
    
    PENTOMINOES = {
        'F': [(1, 0), (2, 0), (0, 1), (1, 1), (1, 2)],  # F-shape
        'I': [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4)],  # Line
        'L': [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3)],  # L-shape
        'N': [(1, 0), (0, 1), (1, 1), (1, 2), (1, 3)],  # N-shape
        'P': [(0, 0), (0, 1), (1, 0), (1, 1), (0, 2)],  # P-shape
        'T': [(0, 0), (1, 0), (2, 0), (1, 1), (1, 2)],  # T-shape
        'U': [(0, 0), (0, 1), (1, 1), (2, 1), (2, 0)],  # U-shape
        'V': [(0, 0), (0, 1), (0, 2), (1, 2), (2, 2)],  # V-shape
        'W': [(0, 0), (0, 1), (1, 1), (1, 2), (2, 2)],  # W-shape
        'X': [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)],  # X-shape (plus)
        'Y': [(1, 0), (0, 1), (1, 1), (1, 2), (1, 3)],  # Y-shape
        'Z': [(0, 0), (1, 0), (1, 1), (1, 2), (2, 2)]   # Z-shape
    }
    
    @staticmethod
    def normalize_polyomino(cells: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Normalize polyomino to start at (0,0)."""
        if not cells:
            return []
        
        min_x = min(x for x, y in cells)
        min_y = min(y for x, y in cells)
        
        return [(x - min_x, y - min_y) for x, y in cells]
    
    @staticmethod
    def rotate_polyomino(cells: List[Tuple[int, int]], rotations: int = 1) -> List[Tuple[int, int]]:
        """Rotate polyomino 90 degrees clockwise."""
        result = cells[:]
        for _ in range(rotations % 4):
            # Rotate 90 degrees: (x, y) -> (y, -x)
            result = [(y, -x) for x, y in result]
            result = PolyominoGenerator.normalize_polyomino(result)
        return result
    
    @staticmethod
    def flip_polyomino(cells: List[Tuple[int, int]], horizontal: bool = True) -> List[Tuple[int, int]]:
        """Flip polyomino horizontally or vertically."""
        if horizontal:
            # Horizontal flip: (x, y) -> (-x, y)
            result = [(-x, y) for x, y in cells]
        else:
            # Vertical flip: (x, y) -> (x, -y)
            result = [(x, -y) for x, y in cells]
        
        return PolyominoGenerator.normalize_polyomino(result)
    
    @staticmethod
    def generate_random_polyomino(size: int, max_attempts: int = 100) -> List[Tuple[int, int]]:
        """Generate a random connected polyomino of given size."""
        if size <= 0:
            return []
        if size == 1:
            return [(0, 0)]
        
        for attempt in range(max_attempts):
            cells = [(0, 0)]  # Start with one cell
            
            for _ in range(size - 1):
                # Find all possible adjacent positions
                candidates = set()
                for x, y in cells:
                    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                        new_pos = (x + dx, y + dy)
                        if new_pos not in cells:
                            candidates.add(new_pos)
                
                if not candidates:
                    break  # Can't place more cells
                
                # Randomly choose one candidate
                new_cell = random.choice(list(candidates))
                cells.append(new_cell)
            
            if len(cells) == size:
                return PolyominoGenerator.normalize_polyomino(cells)
        
        # Fallback: create a line if random generation fails
        return [(i, 0) for i in range(size)]
    
    @staticmethod
    def get_tetromino(name: str, rotation: int = 0, flip: bool = False) -> List[Tuple[int, int]]:
        """Get a specific tetromino shape."""
        if name not in PolyominoGenerator.TETROMINOES:
            raise ValueError(f"Unknown tetromino: {name}")
        
        cells = PolyominoGenerator.TETROMINOES[name][:]
        
        if flip:
            cells = PolyominoGenerator.flip_polyomino(cells)
        
        if rotation:
            cells = PolyominoGenerator.rotate_polyomino(cells, rotation)
        
        return cells
    
    @staticmethod
    def get_pentomino(name: str, rotation: int = 0, flip: bool = False) -> List[Tuple[int, int]]:
        """Get a specific pentomino shape."""
        if name not in PolyominoGenerator.PENTOMINOES:
            raise ValueError(f"Unknown pentomino: {name}")
        
        cells = PolyominoGenerator.PENTOMINOES[name][:]
        
        if flip:
            cells = PolyominoGenerator.flip_polyomino(cells)
        
        if rotation:
            cells = PolyominoGenerator.rotate_polyomino(cells, rotation)
        
        return cells
    
    @staticmethod
    def get_random_tetromino() -> List[Tuple[int, int]]:
        """Get a random tetromino with random rotation/flip."""
        name = random.choice(list(PolyominoGenerator.TETROMINOES.keys()))
        rotation = random.randint(0, 3)
        flip = random.choice([True, False])
        return PolyominoGenerator.get_tetromino(name, rotation, flip)
    
    @staticmethod
    def get_random_pentomino() -> List[Tuple[int, int]]:
        """Get a random pentomino with random rotation/flip."""
        name = random.choice(list(PolyominoGenerator.PENTOMINOES.keys()))
        rotation = random.randint(0, 3)
        flip = random.choice([True, False])
        return PolyominoGenerator.get_pentomino(name, rotation, flip)

class RoomShapeGenerator:
    @staticmethod
    def generate_random_shape(x: float, y: float, target_area: float, 
                            shape_preferences: Optional[Dict[RoomShape, float]] = None) -> RoomGeometry:
        if shape_preferences is None:
            shape_preferences = {
                RoomShape.RECTANGLE: 0.4,
                RoomShape.CIRCLE: 0.2,
                RoomShape.L_SHAPE: 0.2,
                RoomShape.IRREGULAR: 0.1,
                RoomShape.POLYOMINO: 0.1
            }
        
        shape = np.random.choice(
            list(shape_preferences.keys()),
            p=list(shape_preferences.values())
        )
        
        if shape == RoomShape.RECTANGLE:
            # Find width/height that gives target area
            aspect_ratio = np.random.uniform(0.7, 1.5)
            width = int(math.sqrt(target_area * aspect_ratio))
            height = int(target_area / width)
            return RoomGeometry.from_rectangle(x, y, width, height)
        
        elif shape == RoomShape.CIRCLE:
            radius = math.sqrt(target_area / math.pi)
            return RoomGeometry.from_circle(x + radius, y + radius, radius)
        
        elif shape == RoomShape.L_SHAPE:
            # Create L-shape with roughly target area
            base_size = int(math.sqrt(target_area * 1.2))
            notch_size = base_size // 3
            notch_corner = np.random.choice(["bottom_right", "top_right", "top_left", "bottom_left"])
            return RoomGeometry.from_l_shape(x, y, base_size, base_size, notch_size, notch_size, notch_corner)
        
        elif shape == RoomShape.IRREGULAR:
            # Generate random polygon
            num_points = np.random.randint(5, 8)
            angles = np.sort(np.random.uniform(0, 2 * math.pi, num_points))
            radius_base = math.sqrt(target_area / math.pi)
            
            points = []
            for angle in angles:
                radius = radius_base * np.random.uniform(0.6, 1.4)
                px = x + radius * math.cos(angle)
                py = y + radius * math.sin(angle)
                points.append((px, py))
            
            return RoomGeometry.from_irregular_polygon(points)
        
        elif shape == RoomShape.POLYOMINO:
            # Generate polyomino with target area
            size = max(1, int(target_area))
            
            # Choose polyomino type based on size
            if size <= 4:
                if size == 4:
                    cells = PolyominoGenerator.get_random_tetromino()
                else:
                    cells = PolyominoGenerator.generate_random_polyomino(size)
            elif size == 5:
                cells = PolyominoGenerator.get_random_pentomino()
            else:
                # For larger sizes, generate random polyomino
                cells = PolyominoGenerator.generate_random_polyomino(size)
            
            return RoomGeometry.from_polyomino(int(x), int(y), cells)
        
        # Default fallback
        return RoomGeometry.from_rectangle(x, y, int(math.sqrt(target_area)), int(math.sqrt(target_area))) 