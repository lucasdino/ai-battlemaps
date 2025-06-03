#!/usr/bin/env python3

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import time
import os
import numpy as np

# Direct imports since we're in the same folder
from layout_system import LayoutSystem

app = Flask(__name__)
CORS(app)

# Store layout files
LAYOUT_DIR = os.path.join(os.path.dirname(__file__), 'output', 'api_layouts')
os.makedirs(LAYOUT_DIR, exist_ok=True)

def extract_doors_from_grid(grid):
    """Extract door positions from the grid where value is 4"""
    doors = []
    door_id = 0
    height, width = grid.shape
    
    for y in range(height):
        for x in range(width):
            if grid[y, x] == 4:  # Door value
                doors.append({
                    'id': door_id,
                    'position': [x, y],
                    'type': 'standard',
                    'is_locked': False
                })
                door_id += 1
    
    return doors

def extract_room_outlines_from_grid(grid, rooms_data):
    """Extract room wall boundaries from the grid"""
    height, width = grid.shape
    room_outlines = {}
    
    for room in rooms_data:
        room_id = room['id']
        center_x, center_y = room['center']
        room_type = room['room_type']
        
        # Determine the grid value for this room type
        room_value = get_room_grid_value(room_type)
        
        # Find all floor cells belonging to this specific room type
        floor_cells = find_room_cells(grid, center_x, center_y, room_value)
        
        # Find the boundary edges where floor meets non-floor
        boundary_edges = find_room_boundary_edges(grid, floor_cells)
        
        # Trace the outline from boundary edges
        outline = trace_boundary_polygon(boundary_edges)
        
        room_outlines[room_id] = {
            'floor_cells': list(floor_cells),
            'boundary_edges': len(boundary_edges),
            'outline': outline,
            'simplified_outline': simplify_outline(outline)
        }
    
    return room_outlines

def find_room_boundary_edges(grid, floor_cells):
    """Find edges where room floor meets non-floor cells"""
    height, width = grid.shape
    floor_set = set(floor_cells)
    boundary_edges = []
    
    for floor_x, floor_y in floor_cells:
        # Check each of the 4 edges of this floor cell
        
        # Top edge (between this cell and the cell above)
        neighbor_y = floor_y - 1
        if neighbor_y < 0 or (floor_x, neighbor_y) not in floor_set:
            # This top edge is a boundary
            boundary_edges.append(((floor_x, floor_y), (floor_x + 1, floor_y), 'top'))
        
        # Bottom edge (between this cell and the cell below)  
        neighbor_y = floor_y + 1
        if neighbor_y >= height or (floor_x, neighbor_y) not in floor_set:
            # This bottom edge is a boundary
            boundary_edges.append(((floor_x, floor_y + 1), (floor_x + 1, floor_y + 1), 'bottom'))
        
        # Left edge (between this cell and the cell to the left)
        neighbor_x = floor_x - 1
        if neighbor_x < 0 or (neighbor_x, floor_y) not in floor_set:
            # This left edge is a boundary
            boundary_edges.append(((floor_x, floor_y), (floor_x, floor_y + 1), 'left'))
        
        # Right edge (between this cell and the cell to the right)
        neighbor_x = floor_x + 1
        if neighbor_x >= width or (neighbor_x, floor_y) not in floor_set:
            # This right edge is a boundary
            boundary_edges.append(((floor_x + 1, floor_y), (floor_x + 1, floor_y + 1), 'right'))
    
    return boundary_edges

def trace_boundary_polygon(boundary_edges):
    """Trace boundary edges into a polygon"""
    if not boundary_edges:
        return []
    
    # Build adjacency map of edge endpoints
    point_to_points = {}
    
    for edge in boundary_edges:
        start, end, direction = edge
        
        if start not in point_to_points:
            point_to_points[start] = []
        if end not in point_to_points:
            point_to_points[end] = []
            
        point_to_points[start].append(end)
        point_to_points[end].append(start)
    
    # Remove duplicate connections
    for point in point_to_points:
        point_to_points[point] = list(set(point_to_points[point]))
    
    # Trace the polygon starting from the topmost-leftmost point
    start_point = min(point_to_points.keys())
    
    polygon = [list(start_point)]
    current_point = start_point
    visited_edges = set()
    
    while True:
        # Find next unvisited connection
        next_point = None
        
        for neighbor in point_to_points[current_point]:
            edge_key = tuple(sorted([current_point, neighbor]))
            if edge_key not in visited_edges:
                next_point = neighbor
                visited_edges.add(edge_key)
                break
        
        if next_point is None or next_point == start_point:
            break
            
        polygon.append(list(next_point))
        current_point = next_point
        
        # Safety check to prevent infinite loops
        if len(polygon) > len(point_to_points) * 2:
            break
    
    # Ensure polygon is closed
    if polygon and len(polygon) > 2 and polygon[0] != polygon[-1]:
        polygon.append(polygon[0])
    
    return polygon

def find_room_cells(grid, center_x, center_y, target_value):
    """Find all cells belonging to a room using flood fill for specific room type"""
    height, width = grid.shape
    start_x, start_y = int(center_x), int(center_y)
    
    # Find a valid starting point near center with the target value
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            check_x, check_y = start_x + dx, start_y + dy
            if (0 <= check_x < width and 0 <= check_y < height and 
                grid[check_y, check_x] == target_value):
                start_x, start_y = check_x, check_y
                break
    
    # Flood fill to find all connected cells with the target value
    visited = set()
    stack = [(start_x, start_y)]
    cells = set()
    
    while stack:
        x, y = stack.pop()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        
        if (0 <= x < width and 0 <= y < height and 
            grid[y, x] == target_value):
            cells.add((x, y))
            
            # Add neighbors
            for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if (nx, ny) not in visited:
                    stack.append((nx, ny))
    
    return cells

def simplify_outline(outline):
    """Simplify outline by removing redundant points"""
    if len(outline) <= 3:
        return outline
    
    simplified = [outline[0]]
    for i in range(1, len(outline) - 1):
        prev_point = simplified[-1]
        curr_point = outline[i]
        next_point = outline[i + 1]
        
        # Check if points are collinear
        dx1, dy1 = curr_point[0] - prev_point[0], curr_point[1] - prev_point[1]
        dx2, dy2 = next_point[0] - curr_point[0], next_point[1] - curr_point[1]
        
        # Cross product to check collinearity
        if dx1 * dy2 != dy1 * dx2:
            simplified.append(curr_point)
    
    simplified.append(outline[-1])
    return simplified

def get_grid_key():
    """Return the key explaining grid values"""
    return {
        '0': {'name': 'Empty', 'description': 'Void/unused space', 'color': '#1a1a1a'},
        '1': {'name': 'Floor', 'description': 'Room floor tiles', 'color': '#8B4513'},
        '2': {'name': 'Wall', 'description': 'Wall structures', 'color': '#404040'},
        '3': {'name': 'Corridor', 'description': 'Connecting passages', 'color': '#D2B48C'},
        '4': {'name': 'Door', 'description': 'Room entrances/exits', 'color': '#FF6B35'},
        '5': {'name': 'Treasure', 'description': 'Special treasure locations', 'color': '#FFD700'},
        '6': {'name': 'Entrance', 'description': 'Dungeon entrance point', 'color': '#32CD32'},
        '7': {'name': 'Boss', 'description': 'Boss room marker', 'color': '#DC143C'}
    }

def is_rectangular_room(floor_cells):
    """Check if a room is rectangular based on its floor cells"""
    if not floor_cells:
        return False
    
    # Get bounding box
    min_x = min(x for x, y in floor_cells)
    max_x = max(x for x, y in floor_cells)
    min_y = min(y for x, y in floor_cells)
    max_y = max(y for x, y in floor_cells)
    
    # Check if all cells in the bounding box are present
    expected_cells = (max_x - min_x + 1) * (max_y - min_y + 1)
    actual_cells = len(floor_cells)
    
    return expected_cells == actual_cells

def get_room_grid_value(room_type):
    """Get the grid value for a specific room type"""
    room_type_values = {
        'chamber': 1,
        'corridor': 3,
        'treasure': 5,
        'entrance': 6,
        'boss': 7
    }
    return room_type_values.get(room_type, 1)  # Default to regular floor

@app.route('/api/layout/generate', methods=['POST'])
def generate_layout():
    try:
        data = request.get_json() or {}
        
        # Extract parameters with defaults
        rooms = int(data.get('rooms', 8))
        graph_type = data.get('graph_type', 'linear')
        room_scale = int(data.get('room_scale', 3))
        margin = int(data.get('margin', 3))
        max_attempts = int(data.get('max_attempts', 100))
        width = int(data.get('width', 50))
        height = int(data.get('height', 50))
        
        # Generate layout using the direct Python code
        system = LayoutSystem(width=width, height=height)
        result = system.generate_layout(
            rooms=rooms,
            graph_type=graph_type,
            room_scale=room_scale,
            margin=margin,
            max_attempts=max_attempts
        )
        
        if not result.success:
            return jsonify({
                'success': False,
                'error': 'Layout generation failed',
                'details': result.metadata.get('error', 'Unknown error')
            }), 500
        
        # Convert room data
        rooms_data = []
        for room in result.rooms:
            rooms_data.append({
                'id': room.id,
                'center': list(room.center),
                'bounds': room.bounds,
                'area': room.area,
                'room_type': room.room_type,
                'shape': room.shape,
                'metadata': room.metadata
            })
        
        # Extract doors and outlines
        doors = extract_doors_from_grid(result.grid)
        room_outlines = extract_room_outlines_from_grid(result.grid, rooms_data)
        
        # Add outline data to rooms
        for room in rooms_data:
            room_id = room['id']
            if room_id in room_outlines:
                outline_data = room_outlines[room_id]
                room['shape_data'] = {
                    'outline': outline_data['outline'],
                    'simplified_outline': outline_data['simplified_outline'],
                    'perimeter_length': len(outline_data['outline']),
                    'boundary_edges': outline_data['boundary_edges'],
                    'floor_cell_count': len(outline_data['floor_cells']),
                    'is_rectangular': is_rectangular_room(outline_data['floor_cells']) if outline_data['floor_cells'] else False
                }
        
        # Validation info
        validation_info = {
            'has_entrance': any(room['room_type'] == 'entrance' for room in rooms_data),
            'entrance_count': sum(1 for room in rooms_data if room['room_type'] == 'entrance'),
            'boss_count': sum(1 for room in rooms_data if room['room_type'] == 'boss'),
            'total_rooms': len(rooms_data),
            'connectivity_validated': result.metadata.get('connectivity_validated', False),
            'room_type_distribution': result.metadata.get('room_type_counts', {})
        }
        
        # Prepare response
        response_data = {
            'success': True,
            'grid': result.grid.tolist(),
            'grid_key': get_grid_key(),
            'doors': doors,
            'rooms': rooms_data,
            'validation': validation_info,
            'metadata': result.metadata,
            'algorithm': result.algorithm,
            'generation_time': result.generation_time,
            'parameters': {
                'rooms': rooms,
                'graph_type': graph_type,
                'room_scale': room_scale,
                'margin': margin,
                'max_attempts': max_attempts,
                'width': width,
                'height': height
            }
        }
        
        # Save layout
        filename = f"layout_{int(time.time() * 1000)}_{os.urandom(3).hex()}.json"
        filepath = os.path.join(LAYOUT_DIR, filename)
        
        with open(filepath, 'w') as f:
            json.dump(response_data, f, indent=2)
        
        response_data['filename'] = filename
        response_data['filepath'] = filepath
        
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/layout/test', methods=['GET'])
def test_layout():
    try:
        system = LayoutSystem(width=30, height=30)
        return jsonify({
            'success': True,
            'message': 'Layout system imported successfully from layoutgen folder',
            'available_algorithms': system.get_available_algorithms()
        })
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/layout/saved', methods=['GET'])
def list_saved_layouts():
    try:
        files = []
        if os.path.exists(LAYOUT_DIR):
            for filename in os.listdir(LAYOUT_DIR):
                if filename.startswith('layout_') and filename.endswith('.json'):
                    filepath = os.path.join(LAYOUT_DIR, filename)
                    stat = os.stat(filepath)
                    files.append({
                        'filename': filename,
                        'created': stat.st_mtime,
                        'size': stat.st_size
                    })
        
        files.sort(key=lambda x: x['created'], reverse=True)
        return jsonify({'success': True, 'layouts': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/layout/load/<filename>', methods=['GET'])
def load_layout(filename):
    try:
        filepath = os.path.join(LAYOUT_DIR, filename)
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Layout file not found'}), 404
        
        with open(filepath, 'r') as f:
            layout_data = json.load(f)
        
        return jsonify(layout_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'AI Battlemap Layout Generator API',
        'version': '1.0.0'
    })

if __name__ == '__main__':
    print("Starting AI Battlemap Layout Generator API on port 3000...")
    print(f"Layout files will be saved to: {LAYOUT_DIR}")
    app.run(debug=True, host='0.0.0.0', port=3000) 