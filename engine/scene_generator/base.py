from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import numpy as np
import logging
import torch
from pathlib import Path
import json
from .config import LayerConfig

class BaseLayer(ABC):
    def __init__(self, config: LayerConfig):
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)
        self._cache = {}
        self._debug_state = {}
        
    def _validate_input(self, **kwargs) -> bool:
        """Validate input parameters"""
        try:
            for key, value in kwargs.items():
                if value is None:
                    raise ValueError(f"{key} cannot be None")
            return True
        except Exception as e:
            self.logger.error(f"Input validation failed: {str(e)}")
            return False
    
    def _cache_get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.config.enabled:
            return None
        return self._cache.get(key)
    
    def _cache_set(self, key: str, value: Any):
        """Set value in cache"""
        if not self.config.enabled:
            return
        
        # Implement LRU cache
        if len(self._cache) >= self.config.cache_size:
            # Remove oldest item
            self._cache.pop(next(iter(self._cache)))
        
        self._cache[key] = value
    
    def _store_debug_state(self, key: str, value: Any):
        """Store debug state"""
        if self.config.debug_mode:
            self._debug_state[key] = value
    
    def _clear_debug_state(self):
        """Clear debug state"""
        self._debug_state.clear()
    
    def get_debug_state(self) -> Dict:
        """Get debug state"""
        return self._debug_state.copy()
    
    def _save_debug_state(self, path: Path):
        """Save debug state to file"""
        if not self.config.debug_mode:
            return
        
        path.mkdir(parents=True, exist_ok=True)
        for key, value in self._debug_state.items():
            if isinstance(value, np.ndarray):
                np.save(path / f"{key}.npy", value)
            elif isinstance(value, torch.Tensor):
                torch.save(value, path / f"{key}.pt")
            else:
                with open(path / f"{key}.json", 'w') as f:
                    json.dump(value, f)
    
    def _load_debug_state(self, path: Path):
        """Load debug state from file"""
        if not self.config.debug_mode:
            return
        
        for file in path.glob("*"):
            key = file.stem
            if file.suffix == '.npy':
                self._debug_state[key] = np.load(file)
            elif file.suffix == '.pt':
                self._debug_state[key] = torch.load(file)
            elif file.suffix == '.json':
                with open(file, 'r') as f:
                    self._debug_state[key] = json.load(f)
    
    @abstractmethod
    def generate(self, *args, **kwargs) -> Dict:
        """Generate layer data"""
        pass
    
    def cleanup(self):
        """Cleanup resources"""
        self._cache.clear()
        self._debug_state.clear()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup() 