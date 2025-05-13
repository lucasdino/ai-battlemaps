# AI Battlemaps Unity Package

This package allows you to automatically render AI-generated battlemaps in Unity. It includes a scene renderer, default materials, and prefabs for features and props.

## Setup Instructions

1. Create a new Unity project (recommended: Unity 2021.3 or newer)
2. Import the AI Battlemaps package
3. Create the following folder structure in your Assets folder:
   ```
   Assets/
   ├── Scenes/
   │   └── scene_unity.json (your generated scene file)
   ├── Materials/
   │   ├── Terrain/
   │   │   ├── Default.mat
   │   │   ├── Water.mat
   │   │   ├── Sand.mat
   │   │   ├── Grass.mat
   │   │   └── Mountain.mat
   │   └── Props/
   └── Prefabs/
       ├── Features/
       └── Props/
   ```

4. Create a new scene in Unity
5. Add the SceneRenderer component to an empty GameObject
6. Assign the materials and default prefabs in the inspector
7. Place your generated scene_unity.json file in the Assets/Scenes folder
8. Press Play to automatically load and render the scene

## Controls

- WASD: Move camera
- Right Mouse Button + Drag: Rotate camera
- Mouse Wheel: Zoom in/out

## Customization

### Materials
Create terrain materials with the following properties:
- Water: Blue tinted, reflective material
- Sand: Light beige, rough material
- Grass: Green, slightly rough material
- Mountain: Grey, rough material

### Prefabs
Create prefabs for features and props:
1. Create a new GameObject
2. Add appropriate mesh and materials
3. Add colliders if needed
4. Save as prefab in the appropriate folder
5. Name the prefab to match the type in your scene data

## Troubleshooting

1. If the scene doesn't load:
   - Check that the scene_unity.json file is in the correct location
   - Verify that all materials and prefabs are assigned in the SceneRenderer
   - Check the console for any error messages

2. If objects are missing:
   - Verify that the prefab names in your scene data match the prefab names in your project
   - Check that the default prefabs are assigned in the SceneRenderer

3. If the terrain looks incorrect:
   - Verify that all terrain materials are assigned
   - Check that the height map data is being loaded correctly
   - Adjust the height scale in the SceneRenderer if needed

## Support

For issues or questions, please contact the AI Battlemaps team. 