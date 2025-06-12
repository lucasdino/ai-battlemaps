# Required Textures

## Terrain Textures
- `water.jpg` - Water texture with normal map
- `sand.jpg` - Sand texture with normal map
- `grass.jpg` - Grass texture with normal map
- `mountain.jpg` - Mountain texture with normal map

## Feature Textures
- `tree.jpg` - Tree bark texture
- `rock.jpg` - Rock texture
- `building.jpg` - Building wall texture

## Prop Textures
- `bush.jpg` - Bush texture
- `flower.jpg` - Flower texture
- `stone.jpg` - Stone texture

Each texture should be:
- 1024x1024 pixels
- Include a normal map (_normal.jpg)
- Include a roughness map (_roughness.jpg)
- Include a metalness map (_metalness.jpg)

Example:
```
textures/
  ├── terrain/
  │   ├── water.jpg
  │   ├── water_normal.jpg
  │   ├── water_roughness.jpg
  │   ├── water_metalness.jpg
  │   └── ...
  ├── features/
  │   └── ...
  └── props/
      └── ...
```

## Default Textures
If you don't have your own textures, you can use these placeholder colors:
- Water: RGB(51, 102, 204)
- Sand: RGB(204, 179, 128)
- Grass: RGB(76, 153, 76)
- Mountain: RGB(128, 128, 128) 