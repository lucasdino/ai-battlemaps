const express = require('express');
const router = express.Router();
const terrainGenerator = require('../utils/terrain/TerrainGenerator');
const { getTerrainParams } = require('../utils/terrain/terrainAgent');

// Generate terrain based on natural language description
router.post('/generate', async (req, res) => {
    try {
        const { description, customization } = req.body;
        
        if (!description) {
            console.error('Missing description in request body');
            return res.status(400).json({ 
                error: 'Description is required',
                message: 'Please provide a description of the terrain you want to generate'
            });
        }

        console.log('Generating terrain with description:', description);
        console.log('Customization options:', JSON.stringify(customization || 'none', null, 2));

        // Get terrain parameters from the agent
        console.log('Calling TerrainGenerator.generateFromDescription...');
        const terrainData = await terrainGenerator.generateFromDescription(description);
        
        if (!terrainData) {
            console.error('TerrainGenerator returned null or undefined data');
            throw new Error('Failed to generate terrain data');
        }

        console.log('Terrain generation successful');
        console.log('Generated terrain dimensions:', {
            width: terrainData.width,
            height: terrainData.height,
            vertices: terrainData.positions.length / 3
        });

        res.json(terrainData);
    } catch (error) {
        console.error('Error generating terrain:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        
        // Log the full error object for debugging
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        
        res.status(500).json({ 
            error: 'Failed to generate terrain',
            message: error.message || 'An unexpected error occurred during terrain generation',
            details: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                stack: error.stack,
                cause: error.cause
            } : undefined
        });
    }
});

// Get available terrain generation strategies
router.get('/strategies', (req, res) => {
    try {
        console.log('Getting available terrain strategies...');
        const strategies = Array.from(terrainGenerator.strategies.keys());
        console.log('Available strategies:', strategies);
        res.json({ strategies });
    } catch (error) {
        console.error('Error getting strategies:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to get strategies',
            message: error.message || 'An unexpected error occurred while getting strategies'
        });
    }
});

// Register a new terrain generation strategy
router.post('/strategies', async (req, res) => {
    try {
        const { name, strategy } = req.body;
        
        if (!name || !strategy) {
            console.error('Invalid strategy registration:', { name, strategy });
            return res.status(400).json({ 
                error: 'Invalid strategy data',
                message: 'Strategy name and implementation are required'
            });
        }

        console.log('Registering new terrain strategy:', name);
        terrainGenerator.registerStrategy(name, strategy);
        console.log('Strategy registered successfully');
        res.json({ message: `Strategy '${name}' registered successfully` });
    } catch (error) {
        console.error('Error registering strategy:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to register strategy',
            message: error.message || 'An unexpected error occurred while registering the strategy'
        });
    }
});

// Get terrain parameters based on description
router.post('/params', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            console.error('Missing description in request body');
            return res.status(400).json({ 
                error: 'Description is required',
                message: 'Please provide a description of the terrain you want to generate'
            });
        }

        console.log('Getting terrain parameters for description:', description);
        const params = getTerrainParams(description);
        
        console.log('Generated terrain parameters:', JSON.stringify(params, null, 2));
        console.log('Parameter details:', {
            noiseIterations: params.noiseIterations,
            positionFrequency: params.positionFrequency,
            warpFrequency: params.warpFrequency,
            warpStrength: params.warpStrength,
            strength: params.strength,
            colors: {
                sand: params.colorSand,
                grass: params.colorGrass,
                snow: params.colorSnow,
                rock: params.colorRock
            }
        });

        res.json(params);
    } catch (error) {
        console.error('Error getting terrain parameters:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to get terrain parameters',
            message: error.message || 'An unexpected error occurred while getting terrain parameters'
        });
    }
});

module.exports = router; 