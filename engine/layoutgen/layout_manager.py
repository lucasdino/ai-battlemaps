import numpy as np
from typing import Dict, List, Optional, Union, Tuple
from enum import Enum
import json
from pathlib import Path

from graph_generator import GraphLayoutGenerator, GraphLayoutParams, LinearParams, HubParams, BranchingParams, LoopParams
from physics_generator import PhysicsLayoutGenerator, PhysicsLayoutParams
from enhanced_physics_generator import EnhancedPhysicsLayoutGenerator, EnhancedPhysicsLayoutParams
from adjacent_room_generator import AdjacentRoomLayoutGenerator, AdjacentRoomLayoutParams
from room_shapes import RoomShape

class LayoutMethod(Enum):
    GRAPH_LINEAR = "graph_linear"
    GRAPH_HUB = "graph_hub"
    GRAPH_BRANCHING = "graph_branching"
    GRAPH_LOOP = "graph_loop"
    PHYSICS_TINYKEP = "physics_tinykep"
    ENHANCED_PHYSICS = "enhanced_physics"
    ADJACENT_ROOMS = "adjacent_rooms"

class LayoutManager:
    """Manages graph-based and physics-based layout generation with full parameter customization."""
    
    def __init__(self, width: int = 50, height: int = 50):
        self.width = width
        self.height = height
        self.graph_generator = GraphLayoutGenerator(width, height)
        self.physics_generator = PhysicsLayoutGenerator(width, height)
        self.enhanced_physics_generator = EnhancedPhysicsLayoutGenerator(width, height)
        self.adjacent_room_generator = AdjacentRoomLayoutGenerator(width, height)
    
    def generate_layout(self, method: LayoutMethod, params: Optional[Union[GraphLayoutParams, PhysicsLayoutParams, EnhancedPhysicsLayoutParams, AdjacentRoomLayoutParams]] = None, **kwargs) -> Dict:
        """Generate a layout using the specified method and parameters."""
        
        if method.value.startswith('graph_'):
            # Graph-based methods
            method_type = method.value.split('_')[1]  # linear, hub, branching, loop
            
            # If no params provided, create from kwargs or use defaults
            if params is None:
                params = self._create_graph_params(method_type, kwargs)
            elif kwargs:
                # Merge kwargs into existing params
                params = self._merge_params(params, kwargs)
            
            grid = self.graph_generator.generate_layout(method_type, params)
            additional_data = self.graph_generator.export_to_json()
            
        elif method.value.startswith('physics_'):
            # Physics-based methods
            if method == LayoutMethod.PHYSICS_TINYKEP:
                # If no params provided, create from kwargs or use defaults
                if params is None:
                    params = self._create_physics_params(kwargs)
                elif kwargs:
                    # Merge kwargs into existing params
                    params = self._merge_params(params, kwargs)
                
                grid = self.physics_generator.generate_tinykep_layout(params)
                additional_data = self.physics_generator.export_to_json()
            else:
                raise ValueError(f"Unknown physics method: {method}")
        
        elif method == LayoutMethod.ENHANCED_PHYSICS:
            # Enhanced physics with non-rectangular rooms
            if params is None:
                params = self._create_enhanced_physics_params(kwargs)
            elif kwargs:
                params = self._merge_params(params, kwargs)
            
            grid = self.enhanced_physics_generator.generate_layout(params)
            additional_data = self.enhanced_physics_generator.export_to_json()
        
        elif method == LayoutMethod.ADJACENT_ROOMS:
            # Adjacent rooms with doors
            if params is None:
                params = self._create_adjacent_room_params(kwargs)
            elif kwargs:
                params = self._merge_params(params, kwargs)
            
            grid = self.adjacent_room_generator.generate_layout(params)
            additional_data = self.adjacent_room_generator.export_to_json()
        
        else:
            raise ValueError(f"Unknown method category: {method}")
        
        return self._format_output(grid, method, additional_data)
    
    def _create_graph_params(self, method_type: str, kwargs: Dict) -> GraphLayoutParams:
        """Create graph parameters from method type and kwargs."""
        if method_type == "linear":
            params = LinearParams()
        elif method_type == "hub":
            params = HubParams()
        elif method_type == "branching":
            params = BranchingParams()
        elif method_type == "loop":
            params = LoopParams()
        else:
            params = GraphLayoutParams()
        
        # Override with kwargs
        for key, value in kwargs.items():
            if hasattr(params, key):
                setattr(params, key, value)
        
        return params
    
    def _create_physics_params(self, kwargs: Dict) -> PhysicsLayoutParams:
        """Create physics parameters from kwargs."""
        params = PhysicsLayoutParams()
        
        # Override with kwargs
        for key, value in kwargs.items():
            if hasattr(params, key):
                setattr(params, key, value)
        
        return params
    
    def _create_enhanced_physics_params(self, kwargs: Dict) -> EnhancedPhysicsLayoutParams:
        """Create enhanced physics parameters from kwargs."""
        params = EnhancedPhysicsLayoutParams()
        
        # Override with kwargs
        for key, value in kwargs.items():
            if hasattr(params, key):
                setattr(params, key, value)
        
        return params
    
    def _create_adjacent_room_params(self, kwargs: Dict) -> AdjacentRoomLayoutParams:
        """Create adjacent room parameters from kwargs."""
        params = AdjacentRoomLayoutParams()
        
        # Override with kwargs
        for key, value in kwargs.items():
            if hasattr(params, key):
                setattr(params, key, value)
        
        return params
    
    def _merge_params(self, params: Union[GraphLayoutParams, PhysicsLayoutParams, EnhancedPhysicsLayoutParams, AdjacentRoomLayoutParams], kwargs: Dict) -> Union[GraphLayoutParams, PhysicsLayoutParams, EnhancedPhysicsLayoutParams, AdjacentRoomLayoutParams]:
        """Merge kwargs into existing parameters."""
        # Create a copy to avoid modifying the original
        import copy
        new_params = copy.deepcopy(params)
        
        for key, value in kwargs.items():
            if hasattr(new_params, key):
                setattr(new_params, key, value)
        
        return new_params
    
    def get_default_params(self, method: LayoutMethod) -> Union[GraphLayoutParams, PhysicsLayoutParams, EnhancedPhysicsLayoutParams, AdjacentRoomLayoutParams]:
        """Get default parameters for a method."""
        if method.value.startswith('graph_'):
            method_type = method.value.split('_')[1]
            return self._create_graph_params(method_type, {})
        elif method == LayoutMethod.PHYSICS_TINYKEP:
            return PhysicsLayoutParams()
        elif method == LayoutMethod.ENHANCED_PHYSICS:
            return EnhancedPhysicsLayoutParams()
        elif method == LayoutMethod.ADJACENT_ROOMS:
            return AdjacentRoomLayoutParams()
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def get_parameter_info(self, method: LayoutMethod) -> Dict:
        """Get detailed information about all parameters for a method."""
        params = self.get_default_params(method)
        
        param_info = {}
        for field_name in params.__annotations__:
            field_value = getattr(params, field_name)
            field_type = params.__annotations__[field_name]
            
            # Extract type information
            type_str = str(field_type).replace('<class \'', '').replace('\'>', '')
            if 'typing.' in type_str:
                type_str = type_str.replace('typing.', '')
            
            param_info[field_name] = {
                'default_value': field_value,
                'type': type_str,
                'description': self._get_parameter_description(field_name, method)
            }
        
        return {
            'method': method.value,
            'parameters': param_info,
            'parameter_count': len(param_info)
        }
    
    def _get_parameter_description(self, param_name: str, method: LayoutMethod) -> str:
        """Get description for a parameter."""
        descriptions = {
            # Room generation
            'min_rooms': 'Minimum number of rooms to generate',
            'max_rooms': 'Maximum number of rooms to generate',
            'num_rooms': 'Total number of rooms to generate',
            'room_size_min': 'Minimum room size in tiles',
            'room_size_max': 'Maximum room size in tiles',
            'room_size_mean': 'Mean room size for normal distribution',
            'room_size_std': 'Standard deviation for room size distribution',
            'room_padding': 'Padding between rooms',
            
            # Room placement
            'placement_attempts': 'Maximum attempts to place each room',
            'collision_buffer': 'Buffer zone around rooms for collision detection',
            'edge_margin': 'Margin from grid edges',
            'spawn_radius': 'Radius of circle for initial room placement',
            'grid_edge_margin': 'Margin from grid edges for physics rooms',
            
            # Room shapes (enhanced physics only)
            'shape_preferences': 'Dictionary of shape type preferences',
            'circular_room_ratio': 'Ratio of circular rooms (0.0-1.0)',
            'l_shape_ratio': 'Ratio of L-shaped rooms (0.0-1.0)',
            'irregular_ratio': 'Ratio of irregular polygon rooms (0.0-1.0)',
            
            # Room types
            'entrance_count': 'Number of entrance rooms',
            'boss_count': 'Number of boss rooms',
            'treasure_probability': 'Probability of room being treasure type',
            'trap_probability': 'Probability of room being trap type',
            'puzzle_probability': 'Probability of room being puzzle type',
            'chamber_probability': 'Probability of room being chamber type',
            
            # Graph connectivity
            'min_connections_per_room': 'Minimum connections per room',
            'max_connections_per_room': 'Maximum connections per room',
            'extra_connections_chance': 'Probability of extra connections',
            
            # Method-specific
            'linear_progression_strictness': 'How strictly linear the progression is (0.0-1.0)',
            'hub_centrality_weight': 'How central the hub should be',
            'hub_max_branches': 'Maximum number of branches from hub',
            'branching_factor': 'Amount of branching vs linear progression',
            'max_branch_depth': 'Maximum depth of branches',
            'loop_closure_probability': 'Probability of closing loops',
            'shortcut_probability': 'Probability of creating shortcuts',
            
            # Physics simulation
            'main_room_threshold': 'Size threshold multiplier for main rooms',
            'min_main_rooms': 'Minimum number of main rooms to select',
            'main_room_selection_ratio': 'Ratio of rooms to select as main if threshold fails',
            'separation_force': 'Force strength for room separation',
            'max_physics_iterations': 'Maximum physics simulation iterations',
            'convergence_threshold': 'Movement threshold for physics convergence',
            
            # Grid and tiling
            'tile_size': 'Size of tiles for grid snapping',
            
            # Graph generation
            'delaunay_triangulation': 'Whether to use Delaunay triangulation',
            'min_triangulation_rooms': 'Minimum rooms needed for triangulation',
            'edge_reconnect_percent': 'Percentage of MST edges to reconnect',
            'min_connections': 'Minimum connections to maintain',
            'max_additional_connections': 'Maximum additional connections to add',
            
            # Corridor generation
            'corridor_width': 'Width of corridors in tiles',
            'corridor_style': 'Style of corridors (L_shaped, straight, curved)',
            'corridor_intersection_buffer': 'Buffer around corridor intersections',
            
            # Final processing
            'place_walls': 'Whether to place walls around rooms',
            'place_doors': 'Whether to place doors in walls',
            'room_interior_fill': 'Whether to fill room interiors'
        }
        
        return descriptions.get(param_name, 'No description available')
    
    def _format_output(self, grid: np.ndarray, method: LayoutMethod, additional_data: Dict) -> Dict:
        """Format the output into standardized layout data structure."""
        return {
            'grid': grid.tolist(),
            'rooms': additional_data.get('rooms', []),
            'metadata': {
                'width': self.width,
                'height': self.height,
                'algorithm': method.value,
                'graph_data': additional_data.get('graph_data', {}),
                'parameters': additional_data.get('parameters', {}),
                **{k: v for k, v in additional_data.items() if k not in ['rooms', 'graph_data', 'parameters']}
            }
        }
    
    def compare_methods(self, methods: List[LayoutMethod] = None, **kwargs) -> Dict:
        """Compare multiple layout methods."""
        if methods is None:
            methods = list(LayoutMethod)
        
        results = {}
        for method in methods:
            try:
                layout = self.generate_layout(method, **kwargs)
                results[method.value] = layout
            except Exception as e:
                results[method.value] = {'error': str(e)}
        
        return results
    
    def get_method_info(self) -> Dict:
        """Get information about available layout methods."""
        return {
            'available_methods': [method.value for method in LayoutMethod],
            'method_descriptions': {
                LayoutMethod.GRAPH_LINEAR.value: {
                    'name': 'Linear Mission',
                    'description': 'Sequential room progression from entrance to boss',
                    'use_case': 'Story-driven campaigns, tutorials',
                    'typical_rooms': '6-9',
                    'connectivity': 'Low (linear chain)',
                    'category': 'Graph-based',
                    'parameters': len(self.get_parameter_info(LayoutMethod.GRAPH_LINEAR)['parameters'])
                },
                LayoutMethod.GRAPH_HUB.value: {
                    'name': 'Hub-and-Spoke',
                    'description': 'Central hub with multiple branching areas',
                    'use_case': 'Choice-based exploration, central gathering',
                    'typical_rooms': '5-8',
                    'connectivity': 'Moderate (star pattern)',
                    'category': 'Graph-based',
                    'parameters': len(self.get_parameter_info(LayoutMethod.GRAPH_HUB)['parameters'])
                },
                LayoutMethod.GRAPH_BRANCHING.value: {
                    'name': 'Branching Tree',
                    'description': 'Tree structure with multiple decision paths',
                    'use_case': 'Exploration-focused dungeons, multiple objectives',
                    'typical_rooms': '8-15',
                    'connectivity': 'Moderate (tree structure)',
                    'category': 'Graph-based',
                    'parameters': len(self.get_parameter_info(LayoutMethod.GRAPH_BRANCHING)['parameters'])
                },
                LayoutMethod.GRAPH_LOOP.value: {
                    'name': 'Circular Loop',
                    'description': 'Circular layout with interconnected shortcuts',
                    'use_case': 'Tactical gameplay, multiple approach routes',
                    'typical_rooms': '7-11',
                    'connectivity': 'High (circular with shortcuts)',
                    'category': 'Graph-based',
                    'parameters': len(self.get_parameter_info(LayoutMethod.GRAPH_LOOP)['parameters'])
                },
                LayoutMethod.PHYSICS_TINYKEP.value: {
                    'name': 'TinyKeep Organic',
                    'description': 'Physics-based room separation with organic corridors',
                    'use_case': 'Natural caves, exploration dungeons, organic layouts',
                    'typical_rooms': '8-15 main rooms',
                    'connectivity': 'Variable (MST + reconnections)',
                    'category': 'Physics-based',
                    'parameters': len(self.get_parameter_info(LayoutMethod.PHYSICS_TINYKEP)['parameters'])
                },
                LayoutMethod.ENHANCED_PHYSICS.value: {
                    'name': 'Enhanced Physics',
                    'description': 'Physics-based room separation with non-rectangular rooms',
                    'use_case': 'Complex terrains, diverse room shapes',
                    'typical_rooms': '8-15 main rooms',
                    'connectivity': 'Variable (MST + reconnections)',
                    'category': 'Physics-based',
                    'parameters': len(self.get_parameter_info(LayoutMethod.ENHANCED_PHYSICS)['parameters'])
                },
                LayoutMethod.ADJACENT_ROOMS.value: {
                    'name': 'Adjacent Rooms',
                    'description': 'Layout with adjacent rooms and doors',
                    'use_case': 'Complex terrains, diverse room shapes',
                    'typical_rooms': '8-15 main rooms',
                    'connectivity': 'Variable (Adjacent rooms)',
                    'category': 'Graph-based',
                    'parameters': len(self.get_parameter_info(LayoutMethod.ADJACENT_ROOMS)['parameters'])
                }
            },
            'default_parameters': {
                'width': self.width,
                'height': self.height
            },
            'method_categories': {
                'graph_based': ['graph_linear', 'graph_hub', 'graph_branching', 'graph_loop'],
                'physics_based': ['physics_tinykep', 'enhanced_physics'],
            }
        }
    
    def analyze_layout(self, layout_data: Dict) -> Dict:
        """Analyze a generated layout and provide statistics."""
        rooms = layout_data.get('rooms', [])
        metadata = layout_data.get('metadata', {})
        graph_data = metadata.get('graph_data', {})
        algorithm = metadata.get('algorithm', '')
        
        analysis = {
            'room_count': len(rooms),
            'total_area': sum(room.get('area', 0) for room in rooms),
            'average_room_size': 0,
            'room_types': {},
            'connectivity': {
                'total_connections': len(graph_data.get('edges', [])),
                'avg_connections_per_room': 0
            },
            'algorithm_type': 'physics' if algorithm.startswith('physics_') else 'graph',
            'parameters_used': metadata.get('parameters', {})
        }
        
        # Calculate averages
        if rooms:
            analysis['average_room_size'] = analysis['total_area'] / len(rooms)
        
        if rooms and graph_data.get('edges'):
            # Each edge represents 2 connections (bidirectional)
            total_connections = len(graph_data['edges']) * 2
            analysis['connectivity']['avg_connections_per_room'] = total_connections / len(rooms)
        
        # Room type distribution
        for room in rooms:
            room_type = room.get('type', 'unknown')
            analysis['room_types'][room_type] = analysis['room_types'].get(room_type, 0) + 1
        
        # Add physics-specific analysis
        if algorithm.startswith('physics_'):
            main_rooms = [r for r in rooms if r.get('type') == 'main']
            hallway_rooms = [r for r in rooms if r.get('type') == 'hallway']
            analysis['physics_stats'] = {
                'main_rooms': len(main_rooms),
                'hallway_rooms': len(hallway_rooms),
                'main_to_hallway_ratio': len(main_rooms) / max(1, len(hallway_rooms))
            }
        
        return analysis
    
    def save_layout(self, layout_data: Dict, filename: str, output_dir: str = "output/layouts") -> str:
        """Save layout data to JSON file."""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        filepath = output_path / f"{filename}.json"
        
        with open(filepath, 'w') as f:
            json.dump(layout_data, f, indent=2)
        
        return str(filepath)
    
    def load_layout(self, filepath: str) -> Dict:
        """Load layout data from JSON file."""
        with open(filepath, 'r') as f:
            return json.load(f) 