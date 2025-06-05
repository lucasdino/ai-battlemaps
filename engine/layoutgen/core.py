from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import numpy as np

class RoomType(Enum):
    FLOOR = "floor"
    WALL = "wall"
    CORRIDOR = "corridor"
    ENTRANCE = "entrance"
    EXIT = "exit"
    BOSS = "boss"
    TREASURE = "treasure"
    CHAMBER = "chamber"

@dataclass
class Room:
    id: int
    center: tuple[float, float]
    bounds: Dict[str, float]
    area: float
    room_type: str
    shape: str
    metadata: Dict[str, Any]

@dataclass
class LayoutResult:
    grid: np.ndarray
    rooms: List[Room]
    metadata: Dict[str, Any]
    algorithm: str
    generation_time: float
    success: bool

class LayoutGenerator(ABC):
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
    
    @abstractmethod
    def generate(self, **params) -> LayoutResult:
        pass
    
    @property
    @abstractmethod
    def algorithm_name(self) -> str:
        pass 