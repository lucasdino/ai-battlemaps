from core import LayoutResult
from layout_generator import PolyominoLayoutGenerator

class LayoutSystem:
    def __init__(self, width: int = 50, height: int = 50):
        self.width = width
        self.height = height
        self.generator = PolyominoLayoutGenerator(width, height)
    
    def generate_layout(self, algorithm: str = "polyomino", **params) -> LayoutResult:
        if algorithm != "polyomino":
            raise ValueError(f"Unknown algorithm: {algorithm}")
        
        return self.generator.generate(**params)
    
    def get_available_algorithms(self) -> list[str]:
        return ["polyomino"] 