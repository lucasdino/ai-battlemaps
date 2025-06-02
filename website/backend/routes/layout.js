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

    system = LayoutSystem(width=${width}, height=${height})
    result = system.generate_layout(
        rooms=${rooms},
        graph_type='${graph_type}',
        room_scale=${room_scale},
        margin=${margin},
        max_attempts=${max_attempts}
    )
    
    output = {
        'success': result.success,
        'grid': result.grid.tolist(),
        'rooms': [
            {
                'id': room.id,
                'center': room.center,
                'bounds': room.bounds,
                'area': room.area,
                'room_type': room.room_type,
                'shape': room.shape,
                'metadata': room.metadata
            }
            for room in result.rooms
        ],
        'metadata': result.metadata,
        'algorithm': result.algorithm,
        'generation_time': result.generation_time,
        'parameters': {
            'rooms': ${rooms},
            'graph_type': '${graph_type}',
            'room_scale': ${room_scale},
            'margin': ${margin},
            'max_attempts': ${max_attempts},
            'width': ${width},
            'height': ${height}
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