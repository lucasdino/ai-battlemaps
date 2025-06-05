from dataclasses import dataclass
from typing import List, Tuple
import random

@dataclass
class Polyomino:
    cells: List[Tuple[int, int]]
    
    def __post_init__(self):
        if self.cells:
            min_x = min(x for x, y in self.cells)
            min_y = min(y for x, y in self.cells)
            self.cells = [(x - min_x, y - min_y) for x, y in self.cells]
    
    @property
    def width(self) -> int:
        return max(x for x, y in self.cells) + 1 if self.cells else 0
    
    @property
    def height(self) -> int:
        return max(y for x, y in self.cells) + 1 if self.cells else 0
    
    @property
    def area(self) -> int:
        return len(self.cells)
    
    def get_cells_at(self, x: int, y: int) -> List[Tuple[int, int]]:
        return [(x + dx, y + dy) for dx, dy in self.cells]
    
    def rotate(self) -> 'Polyomino':
        return Polyomino([(-y, x) for x, y in self.cells])
    
    def scale(self, factor: int) -> List[Tuple[int, int]]:
        scaled = []
        for dx, dy in self.cells:
            for sx in range(factor):
                for sy in range(factor):
                    scaled.append((dx * factor + sx, dy * factor + sy))
        return scaled

@dataclass
class BuildingBlock:
    id: str
    polyomino: Polyomino
    room_type: str
    weight: float = 1.0
    
    def get_variants(self) -> List[Polyomino]:
        variants = [self.polyomino]
        current = self.polyomino
        for _ in range(3):
            current = current.rotate()
            variants.append(current)
        return variants

class ShapeLibrary:
    @staticmethod
    def dungeon_blocks() -> List[BuildingBlock]:
        return [
            BuildingBlock("entrance", Polyomino([(0, 0)]), "entrance", 1.0),
            BuildingBlock("chamber", Polyomino([(0, 0), (1, 0)]), "chamber", 3.0),
            BuildingBlock("corridor", Polyomino([(0, 0), (1, 0), (2, 0)]), "corridor", 2.5),
            BuildingBlock("l_room", Polyomino([(0, 0), (0, 1), (1, 0)]), "chamber", 2.0),
            BuildingBlock("square", Polyomino([(0, 0), (0, 1), (1, 0), (1, 1)]), "chamber", 2.5),
            BuildingBlock("t_room", Polyomino([(0, 1), (1, 0), (1, 1), (1, 2)]), "chamber", 2.0),
            BuildingBlock("boss", Polyomino([(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)]), "boss", 1.0),
            BuildingBlock("treasure", Polyomino([(0, 1), (1, 0), (1, 1), (2, 0)]), "treasure", 1.5),
        ]
    
    @staticmethod
    def select_block(blocks: List[BuildingBlock]) -> BuildingBlock:
        weights = [block.weight for block in blocks]
        return random.choices(blocks, weights=weights)[0]
    
    @staticmethod
    def select_variant(block: BuildingBlock) -> Polyomino:
        return random.choice(block.get_variants()) 