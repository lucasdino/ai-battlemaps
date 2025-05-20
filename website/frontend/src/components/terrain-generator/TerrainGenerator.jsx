import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import axios from 'axios';
import ChatBox from '../common/ChatBox';
import { Scene } from './components/Scene';
import './styles/TerrainGenerator.css';

export function TerrainGenerator() {
    const [description, setDescription] = useState('');
    const [guiParams, setGuiParams] = useState({
        noiseIterations: 3,
        positionFrequency: 0.175,
        warpFrequency: 6,
        warpStrength: 1,
        strength: 10,
        heightScale: 1.0,
        colorSand: '#ffe894',
        colorGrass: '#85d534',
        colorSnow: '#ffffff',
        colorRock: '#bfbd8d'
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState([]);
    const [placementMode, setPlacementMode] = useState(null);
    const [placedModels, setPlacedModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [selectedModelScale, setSelectedModelScale] = useState(1);

    // GUI panel for fine-tuning
    useEffect(() => {
        const gui = new GUI();
        const terrainFolder = gui.addFolder('🏔️ Terrain');

        // Add controls for each parameter
        const controls = {
            noiseIterations: terrainFolder.add(guiParams, 'noiseIterations', 0, 10, 1).name('Noise Iterations'),
            positionFrequency: terrainFolder.add(guiParams, 'positionFrequency', 0, 1, 0.001).name('Position Frequency'),
            strength: terrainFolder.add(guiParams, 'strength', 0, 20, 0.001).name('Strength'),
            warpFrequency: terrainFolder.add(guiParams, 'warpFrequency', 0, 20, 0.001).name('Warp Frequency'),
            warpStrength: terrainFolder.add(guiParams, 'warpStrength', 0, 2, 0.001).name('Warp Strength'),
            heightScale: terrainFolder.add(guiParams, 'heightScale', 0.1, 2, 0.1).name('Height Scale'),
            colorSand: terrainFolder.addColor({ color: guiParams.colorSand }, 'color').name('Sand Color'),
            colorGrass: terrainFolder.addColor({ color: guiParams.colorGrass }, 'color').name('Grass Color'),
            colorSnow: terrainFolder.addColor({ color: guiParams.colorSnow }, 'color').name('Snow Color'),
            colorRock: terrainFolder.addColor({ color: guiParams.colorRock }, 'color').name('Rock Color')
        };

        // Add onChange handlers
        controls.noiseIterations.onChange(value => setGuiParams(prev => ({ ...prev, noiseIterations: value })));
        controls.positionFrequency.onChange(value => setGuiParams(prev => ({ ...prev, positionFrequency: value })));
        controls.strength.onChange(value => setGuiParams(prev => ({ ...prev, strength: value })));
        controls.warpFrequency.onChange(value => setGuiParams(prev => ({ ...prev, warpFrequency: value })));
        controls.warpStrength.onChange(value => setGuiParams(prev => ({ ...prev, warpStrength: value })));
        controls.heightScale.onChange(value => setGuiParams(prev => ({ ...prev, heightScale: value })));
        controls.colorSand.onChange(value => setGuiParams(prev => ({ ...prev, colorSand: value })));
        controls.colorGrass.onChange(value => setGuiParams(prev => ({ ...prev, colorGrass: value })));
        controls.colorSnow.onChange(value => setGuiParams(prev => ({ ...prev, colorSnow: value })));
        controls.colorRock.onChange(value => setGuiParams(prev => ({ ...prev, colorRock: value })));

        return () => gui.destroy();
    }, []);

    // Description input handler
    const handleSubmit = async (message) => {
        setError(null);
        setLoading(true);
        try {
            const response = await axios.post('/api/terrain/params', { description: message });
            // Ensure all required parameters are present in the response
            const newParams = {
                noiseIterations: response.data.noiseIterations ?? guiParams.noiseIterations,
                positionFrequency: response.data.positionFrequency ?? guiParams.positionFrequency,
                warpFrequency: response.data.warpFrequency ?? guiParams.warpFrequency,
                warpStrength: response.data.warpStrength ?? guiParams.warpStrength,
                strength: response.data.strength ?? guiParams.strength,
                heightScale: response.data.heightScale ?? guiParams.heightScale,
                colorSand: response.data.colorSand ?? guiParams.colorSand,
                colorGrass: response.data.colorGrass ?? guiParams.colorGrass,
                colorSnow: response.data.colorSnow ?? guiParams.colorSnow,
                colorRock: response.data.colorRock ?? guiParams.colorRock
            };
            setGuiParams(newParams);
        } catch (err) {
            setError('Failed to generate terrain parameters.');
            console.error('Error generating terrain:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="terrain-generator">
            <div className="terrain-viewer">
                {guiParams && (
                    <Canvas shadows>
                        <Scene 
                            guiParams={guiParams}
                            placedModels={placedModels}
                            setPlacedModels={setPlacedModels}
                            placementMode={placementMode}
                            setPlacementMode={setPlacementMode}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            selectedModelScale={selectedModelScale}
                            setSelectedModelScale={setSelectedModelScale}
                        />
                    </Canvas>
                )}
            </div>
            {error && <div className="error-message">{error}</div>}
            <ChatBox 
                onSubmit={handleSubmit}
                isLoading={loading}
                placeholder="Describe your terrain (e.g., 'A lush green valley with gentle hills and a river')"
            />
        </div>
    );
} 