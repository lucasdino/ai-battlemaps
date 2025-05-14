# Required 3D Models

## Features
- `tree.glb` - Basic tree model
- `rock.glb` - Basic rock model
- `building.glb` - Basic building model

## Props
- `bush.glb` - Basic bush model
- `flower.glb` - Basic flower model
- `stone.glb` - Basic stone model

Each model should:
- Be in GLB format (binary glTF)
- Include textures
- Be optimized for web use
- Have proper UV maps
- Include normal maps

Example:
```
models/
  ├── features/
  │   ├── tree.glb
  │   ├── rock.glb
  │   └── building.glb
  └── props/
      ├── bush.glb
      ├── flower.glb
      └── stone.glb
```

## Default Models
Until proper models are added, the scene will use basic Three.js geometries:
- Trees: Cylinder + Cone
- Rocks: Dodecahedron
- Buildings: Box
- Bushes: Sphere
- Flowers: Cone
- Stones: Dodecahedron 