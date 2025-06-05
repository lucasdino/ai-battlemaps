# Dungeon Asset Library

This directory contains all 3D assets and metadata for the AI-generated dungeon map pipeline.

## Directory Structure

```
assets/dungeon/
├── models/         # All .glb 3D models (ready for use)
├── asset_library.json  # Metadata for all assets
```

## Asset Metadata

- **`asset_library.json`** catalogs every usable 3D model with:
  - `id`, `name`, `category`, `tags`, `description`
  - `modelPath` (relative to `assets/`)
  - `dimensions` (for placement/scaling)

## API Endpoints

### 1. List All Assets
- **GET** `/api/assets/dungeon`
- Returns the full asset library as JSON.

### 2. Filter Assets
- **GET** `/api/assets/dungeon/filter?[query params]`
- Query params:
  - `category` (e.g. architecture, prop, ground)
  - `tag` (single or comma-separated, e.g. `door,wood`)
  - `name` (partial match)
  - `minWidth`, `maxWidth`, `minHeight`, `maxHeight` (numeric)
- **Examples:**
  - `/api/assets/dungeon/filter?category=architecture`
  - `/api/assets/dungeon/filter?tag=door,wood`
  - `/api/assets/dungeon/filter?minWidth=1&maxWidth=2`

## How to Add New Assets
1. Place new `.glb` files in `models/`.
2. Add a new entry to `asset_library.json` with the required metadata.
3. (Optional) Add new materials to `materials/` and document them if needed.

## How to Use in the Agent or Frontend
- Fetch `/api/assets/dungeon` or `/api/assets/dungeon/filter?...` to get asset metadata.
- Load models using the `modelPath` (e.g. `/assets/dungeon/models/barrel_1.glb`).
- Use metadata (category, tags, dimensions) for selection and placement logic.

## Example Asset Entry
```json
{
  "id": "barrel_1",
  "name": "Wooden Barrel",
  "type": "model",
  "category": "prop",
  "tags": ["wooden", "container", "obstacle", "decoration", "round"],
  "description": "A wooden barrel. Can be used as decoration or a minor obstacle.",
  "modelPath": "dungeon/models/barrel_1.glb",
  "dimensions": { "width": 1.31, "height": 1.43, "depth": 1.31 }
}
```
 