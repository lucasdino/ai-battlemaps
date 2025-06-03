const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const {
      rooms = 8,
      graph_type = 'linear',
      room_scale = 3,
      margin = 3,
      max_attempts = 100,
      width = 50,
      height = 50
    } = req.body;

    // Validate parameters to prevent null/undefined injection
    const validatedParams = {
      rooms: Number(rooms) || 8,
      graph_type: String(graph_type) || 'linear',
      room_scale: Number(room_scale) || 3,
      margin: Number(margin) || 3,
      max_attempts: Number(max_attempts) || 100,
      width: Number(width) || 50,
      height: Number(height) || 50
    };

    const layoutGenPath = path.join(__dirname, '../../../engine/layoutgen');
    
    const pythonScript = `
import sys
import os
sys.path.insert(0, '${layoutGenPath}')
os.chdir('${layoutGenPath}')

try:
    from layout_system import LayoutSystem
    import json
    import numpy as np

    def extract_doors_from_grid(grid):
        """Extract door positions from the grid where value is 4"""
        doors = []
        door_id = 0
        height, width = grid.shape
        
        for y in range(height):
            for x in range(width):
                if grid[y, x] == 4:  # Door value
                    # Find adjacent rooms
                    adjacent_rooms = []
                    
                    # Check 4 directions for floor tiles (value 1)
                    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
                    for dy, dx in directions:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < height and 0 <= nx < width:
                            if grid[ny, nx] == 1:  # Floor tile
                                # This could be enhanced to identify specific room IDs
                                adjacent_rooms.append([nx, ny])
                    
                    doors.append({
                        'id': door_id,
                        'position': [x, y],
                        'type': 'standard',
                        'is_locked': False,
                        'adjacent_positions': adjacent_rooms[:2]  # Limit to 2 for simplicity
                    })
                    door_id += 1
        
        return doors

    def extract_room_outlines_from_grid(grid, rooms_data):
        """Extract room outlines (perimeter coordinates) from the grid"""
        height, width = grid.shape
        room_outlines = {}
        
        for room in rooms_data:
            room_id = room['id']
            center_x, center_y = room['center']
            
            # Find all connected floor cells starting from near the center
            visited = set()
            to_visit = [(int(center_x), int(center_y))]
            cells = set()
            
            # Find a valid starting point near the center
            start_found = False
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    check_x, check_y = int(center_x) + dx, int(center_y) + dy
                    if 0 <= check_x < width and 0 <= check_y < height and grid[check_y, check_x] == 1:
                        to_visit = [(check_x, check_y)]
                        start_found = True
                        break
                if start_found:
                    break
            
            # Flood fill to find all cells in this room
            while to_visit:
                x, y = to_visit.pop(0)
                if (x, y) in visited:
                    continue
                    
                visited.add((x, y))
                
                if 0 <= x < width and 0 <= y < height and grid[y, x] == 1:
                    cells.add((x, y))
                    
                    # Add neighbors
                    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                        nx, ny = x + dx, y + dy
                        if (nx, ny) not in visited:
                            to_visit.append((nx, ny))
            
            # Extract the outline/perimeter
            outline = extract_outline_from_cells(cells, grid)
            room_outlines[room_id] = {
                'cells': list(cells),
                'outline': outline,
                'simplified_outline': simplify_outline(outline)
            }
        
        return room_outlines

    def extract_outline_from_cells(room_cells, grid):
        """Extract the outline coordinates of a room"""
        if not room_cells:
            return []
        
        height, width = grid.shape
        outline_points = []
        
        # Find perimeter cells (cells that have at least one non-room neighbor)
        perimeter_cells = set()
        
        for x, y in room_cells:
            is_perimeter = False
            # Check all 8 directions (including diagonals for better outline)
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    # If neighbor is outside bounds or not part of room, this is perimeter
                    if (nx < 0 or nx >= width or ny < 0 or ny >= height or 
                        (nx, ny) not in room_cells):
                        is_perimeter = True
                        break
                if is_perimeter:
                    break
            
            if is_perimeter:
                perimeter_cells.add((x, y))
        
        if not perimeter_cells:
            return list(room_cells)  # Fallback if no perimeter found
        
        # Convert perimeter cells to actual outline coordinates
        # We'll trace the perimeter by finding corner points
        outline = trace_perimeter(perimeter_cells)
        
        return outline

    def trace_perimeter(perimeter_cells):
        """Trace the perimeter to get an ordered outline using integer coordinates"""
        if not perimeter_cells:
            return []
        
        cells = list(perimeter_cells)
        if len(cells) == 1:
            x, y = cells[0]
            # Return the four corners of a single cell using integer coordinates
            return [[x, y], [x+1, y], [x+1, y+1], [x, y+1]]
        
        # Convert set to list for easier processing
        perimeter_list = sorted(list(perimeter_cells))
        
        # Find the outline by tracing the perimeter cells in order
        # Start with the leftmost, then topmost cell
        start_cell = min(perimeter_list, key=lambda cell: (cell[0], cell[1]))
        
        outline = []
        visited = set()
        
        # Use a simple approach: trace around the perimeter cells
        # Start from the top-left corner of the starting cell
        current_x, current_y = start_cell
        
        # Find the actual outline points by walking around the shape
        outline_points = find_outline_points(perimeter_cells)
        
        return outline_points

    def find_outline_points(perimeter_cells):
        """Find outline points by identifying corner cells"""
        if not perimeter_cells:
            return []
            
        cells = set(perimeter_cells)
        outline_points = []
        
        # Sort cells for consistent processing
        sorted_cells = sorted(list(cells))
        
        # For each perimeter cell, check if it's a corner or edge cell
        for x, y in sorted_cells:
            # Check the 8 directions around this cell
            neighbors = []
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if (nx, ny) in cells:
                        neighbors.append((dx, dy))
            
            # Determine if this is a corner based on neighbors
            if is_corner_cell(neighbors):
                outline_points.append([x, y])
        
        # If no corners found, use all perimeter cells
        if not outline_points:
            outline_points = [[x, y] for x, y in sorted_cells]
        
        # Order the points to form a continuous outline
        if len(outline_points) > 2:
            outline_points = order_outline_points(outline_points)
        
        return outline_points

    def is_corner_cell(neighbors):
        """Determine if a cell is a corner based on its neighbors"""
        if len(neighbors) <= 2:
            return True
        
        # Check for L-shaped patterns that indicate corners
        neighbor_set = set(neighbors)
        
        # Corner patterns (examples)
        corner_patterns = [
            {(0, -1), (1, 0)},    # Top-right corner
            {(0, -1), (-1, 0)},   # Top-left corner  
            {(0, 1), (1, 0)},     # Bottom-right corner
            {(0, 1), (-1, 0)},    # Bottom-left corner
        ]
        
        for pattern in corner_patterns:
            if pattern.issubset(neighbor_set):
                return True
        
        return False

    def order_outline_points(points):
        """Order outline points to form a continuous boundary"""
        if len(points) <= 2:
            return points
        
        # Start with the leftmost, then topmost point
        start_point = min(points, key=lambda p: (p[0], p[1]))
        
        ordered = [start_point]
        remaining = [p for p in points if p != start_point]
        
        while remaining:
            current = ordered[-1]
            # Find the closest remaining point
            closest = min(remaining, key=lambda p: 
                         ((p[0] - current[0]) ** 2 + (p[1] - current[1]) ** 2) ** 0.5)
            ordered.append(closest)
            remaining.remove(closest)
        
        return ordered

    def simplify_outline(outline, tolerance=0.1):
        """Simplify outline using Douglas-Peucker algorithm"""
        if len(outline) <= 2:
            return outline
        
        def distance_point_to_line(point, line_start, line_end):
            """Calculate perpendicular distance from point to line"""
            x0, y0 = point
            x1, y1 = line_start
            x2, y2 = line_end
            
            if x1 == x2 and y1 == y2:
                return ((x0 - x1) ** 2 + (y0 - y1) ** 2) ** 0.5
            
            return abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / ((y2 - y1) ** 2 + (x2 - x1) ** 2) ** 0.5
        
        def douglas_peucker(points, tolerance):
            if len(points) <= 2:
                return points
            
            # Find the point with maximum distance
            max_distance = 0
            max_index = 0
            
            for i in range(1, len(points) - 1):
                distance = distance_point_to_line(points[i], points[0], points[-1])
                if distance > max_distance:
                    max_distance = distance
                    max_index = i
            
            if max_distance > tolerance:
                # Recursive case
                left = douglas_peucker(points[:max_index + 1], tolerance)
                right = douglas_peucker(points[max_index:], tolerance)
                return left[:-1] + right
            else:
                # Base case
                return [points[0], points[-1]]
        
        return douglas_peucker(outline, tolerance)

    def enhance_room_with_outline_data(room_dict, outline_data):
        """Add outline information to room data"""
        if not outline_data:
            return room_dict
            
        cells = outline_data['cells']
        outline = outline_data['outline']
        simplified_outline = outline_data['simplified_outline']
        
        if cells:
            # Add shape geometry data
            shape_info = {
                'outline': outline,
                'simplified_outline': simplified_outline,
                'perimeter_length': len(outline),
                'is_rectangular': is_rectangular_shape(cells)
            }
            
            # Update room data with outline info only
            room_dict['shape_data'] = shape_info
            
        return room_dict

    def is_rectangular_shape(cells):
        """Check if the shape is rectangular"""
        if not cells:
            return False
            
        x_coords = [cell[0] for cell in cells]
        y_coords = [cell[1] for cell in cells]
        
        min_x, max_x = min(x_coords), max(x_coords)
        min_y, max_y = min(y_coords), max(y_coords)
        
        expected_cells = (max_x - min_x + 1) * (max_y - min_y + 1)
        return len(cells) == expected_cells

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

    system = LayoutSystem(width=${validatedParams.width}, height=${validatedParams.height})
    result = system.generate_layout(
        rooms=${validatedParams.rooms},
        graph_type='${validatedParams.graph_type}',
        room_scale=${validatedParams.room_scale},
        margin=${validatedParams.margin},
        max_attempts=${validatedParams.max_attempts}
    )
    
    # Extract doors from the grid
    doors = extract_doors_from_grid(result.grid)
    
    # Safely convert room data
    rooms_data = []
    for room in result.rooms:
        room_dict = {
            'id': getattr(room, 'id', 0),
            'center': getattr(room, 'center', [0, 0]),
            'bounds': getattr(room, 'bounds', {}),
            'area': getattr(room, 'area', 0),
            'room_type': getattr(room, 'room_type', 'unknown'),
            'shape': getattr(room, 'shape', 'unknown'),
            'metadata': getattr(room, 'metadata', {})
        }
        rooms_data.append(room_dict)
    
    # Extract room outlines from the grid
    room_outlines = extract_room_outlines_from_grid(result.grid, rooms_data)
    
    # Enhance room data with outline information
    for room in rooms_data:
        room_id = room['id']
        outline_data = room_outlines[room_id]
        room_dict = enhance_room_with_outline_data(room, outline_data)
    
    output = {
        'success': result.success,
        'grid': result.grid.tolist(),
        'grid_key': get_grid_key(),
        'doors': doors,
        'rooms': rooms_data,
        'metadata': getattr(result, 'metadata', {}),
        'algorithm': getattr(result, 'algorithm', 'unknown'),
        'generation_time': getattr(result, 'generation_time', 0.0),
        'parameters': {
            'rooms': ${validatedParams.rooms},
            'graph_type': '${validatedParams.graph_type}',
            'room_scale': ${validatedParams.room_scale},
            'margin': ${validatedParams.margin},
            'max_attempts': ${validatedParams.max_attempts},
            'width': ${validatedParams.width},
            'height': ${validatedParams.height}
        }
    }
    
    print('JSON_START')
    print(json.dumps(output))
    print('JSON_END')
    
except ImportError as e:
    print('JSON_START')
    print(json.dumps({'success': False, 'error': f'Import error: {str(e)}'}))
    print('JSON_END')
except Exception as e:
    print('JSON_START')
    print(json.dumps({'success': False, 'error': f'Generation error: {str(e)}'}))
    print('JSON_END')
`;

    const python = spawn('python3', ['-c', pythonScript]);
    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      console.log('Python script output:', output);
      console.log('Python script errors:', errorOutput);
      console.log('Python exit code:', code);

      try {
        const jsonStartIndex = output.indexOf('JSON_START');
        const jsonEndIndex = output.indexOf('JSON_END');
        
        if (jsonStartIndex === -1 || jsonEndIndex === -1) {
          console.error('JSON markers not found in output');
          return res.status(500).json({ 
            success: false, 
            error: 'Invalid response from layout generator',
            details: {
              output: output,
              error: errorOutput,
              code: code
            }
          });
        }

        const jsonStr = output.substring(jsonStartIndex + 'JSON_START'.length, jsonEndIndex).trim();
        
        if (!jsonStr) {
          console.error('Empty JSON string');
          return res.status(500).json({ 
            success: false, 
            error: 'Empty response from layout generator',
            details: { output, errorOutput, code }
          });
        }

        const result = JSON.parse(jsonStr);
        
        if (result.success) {
          const filename = `layout_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.json`;
          const filepath = path.join(__dirname, '../data', filename);
          
          if (!fs.existsSync(path.dirname(filepath))) {
            fs.mkdirSync(path.dirname(filepath), { recursive: true });
          }
          
          fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
          
          result.filename = filename;
          result.filepath = filepath;
        }
        
        res.json(result);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw output:', output);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to parse layout generation result',
          details: {
            parseError: parseError.message,
            output: output,
            errorOutput: errorOutput
          }
        });
      }
    });

    python.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to start layout generation process',
        details: error.message
      });
    });

  } catch (error) {
    console.error('Layout generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
});

router.get('/test', async (req, res) => {
  try {
    const layoutGenPath = path.join(__dirname, '../../../engine/layoutgen');
    
    const testScript = `
import sys
import os
sys.path.insert(0, '${layoutGenPath}')
os.chdir('${layoutGenPath}')

try:
    from layout_system import LayoutSystem
    import json
    
    print('JSON_START')
    print(json.dumps({'success': True, 'message': 'Layout system imported successfully'}))
    print('JSON_END')
except Exception as e:
    print('JSON_START')
    print(json.dumps({'success': False, 'error': str(e)}))
    print('JSON_END')
`;

    const python = spawn('python3', ['-c', testScript]);
    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      const jsonStartIndex = output.indexOf('JSON_START');
      const jsonEndIndex = output.indexOf('JSON_END');
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        const jsonStr = output.substring(jsonStartIndex + 'JSON_START'.length, jsonEndIndex).trim();
        try {
          const result = JSON.parse(jsonStr);
          res.json({
            ...result,
            debug: {
              output,
              errorOutput,
              code,
              layoutGenPath
            }
          });
        } catch (e) {
          res.json({
            success: false,
            error: 'JSON parse failed',
            debug: { output, errorOutput, code, parseError: e.message }
          });
        }
      } else {
        res.json({
          success: false,
          error: 'No JSON markers found',
          debug: { output, errorOutput, code }
        });
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/saved', (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const files = fs.readdirSync(dataDir)
      .filter(file => file.startsWith('layout_') && file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(dataDir, file);
        const stats = fs.statSync(filepath);
        return {
          filename: file,
          created: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.created - a.created);
    
    res.json({ success: true, layouts: files });
  } catch (error) {
    console.error('Error listing saved layouts:', error);
    res.status(500).json({ success: false, error: 'Failed to list saved layouts' });
  }
});

router.get('/load/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../data', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: 'Layout file not found' });
    }
    
    const layoutData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    res.json(layoutData);
  } catch (error) {
    console.error('Error loading layout:', error);
    res.status(500).json({ success: false, error: 'Failed to load layout' });
  }
});

module.exports = router; 