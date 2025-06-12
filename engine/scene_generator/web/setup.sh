#!/bin/bash

# Create necessary directories
mkdir -p textures models

# Install dependencies
npm install

# Copy scene data from output directory
if [ -f "../../output/scene_1/scene_web.json" ]; then
    cp "../../output/scene_1/scene_web.json" .
    echo "Copied scene_web.json from output directory"
else
    echo "Warning: scene_web.json not found in output directory"
    echo "Please run the scene generator first:"
    echo "python -m engine.scene_generator.example"
fi

# Start the development server
npm start 
