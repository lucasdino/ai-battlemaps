from typing import Dict, List, Tuple, Optional
import numpy as np
import json
from pathlib import Path
import logging
import trimesh
from trimesh.creation import cylinder, box, icosphere, cone
from trimesh.transformations import translation_matrix, rotation_matrix

logger = logging.getLogger(__name__)

class ModelGenerator:
    def __init__(self, output_dir: str = "assets/models"):
        """Initialize model generator
        
        Args:
            output_dir: Directory to save generated models
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.output_dir / "features").mkdir(exist_ok=True)
        (self.output_dir / "props").mkdir(exist_ok=True)
    
    def generate_tree_model(self) -> Path:
        """Generate a simple tree model"""
        # Create trunk
        trunk = cylinder(radius=0.2, height=2.0)
        trunk.apply_transform(translation_matrix([0, 1, 0]))
        
        # Create leaves
        leaves = cone(radius=1.0, height=2.0)
        leaves.apply_transform(translation_matrix([0, 2.5, 0]))
        
        # Combine meshes
        tree = trimesh.util.concatenate([trunk, leaves])
        
        # Save model
        output_path = self.output_dir / "features" / "tree.glb"
        tree.export(output_path)
        return output_path
    
    def generate_rock_model(self) -> Path:
        """Generate a simple rock model"""
        # Create base rock shape
        rock = icosphere(subdivisions=2, radius=1.0)
        
        # Add some deformation
        vertices = rock.vertices
        for i in range(len(vertices)):
            # Add random displacement
            displacement = np.random.normal(0, 0.2, 3)
            vertices[i] += displacement
        
        # Update mesh
        rock.vertices = vertices
        rock.fix_normals()
        
        # Save model
        output_path = self.output_dir / "features" / "rock.glb"
        rock.export(output_path)
        return output_path
    
    def generate_building_model(self) -> Path:
        """Generate a simple building model"""
        # Create base building
        building = box(extents=[2, 2, 2])
        
        # Create roof
        roof = cone(radius=1.5, height=1.0)
        roof.apply_transform(translation_matrix([0, 2, 0]))
        
        # Combine meshes
        house = trimesh.util.concatenate([building, roof])
        
        # Save model
        output_path = self.output_dir / "features" / "building.glb"
        house.export(output_path)
        return output_path
    
    def generate_bush_model(self) -> Path:
        """Generate a simple bush model"""
        # Create multiple spheres for bush
        spheres = []
        for _ in range(5):
            # Random position within bounds
            pos = np.random.uniform(-0.5, 0.5, 3)
            pos[1] = abs(pos[1])  # Keep above ground
            
            # Random size
            radius = np.random.uniform(0.3, 0.5)
            
            # Create sphere
            sphere_mesh = icosphere(subdivisions=2, radius=radius)
            sphere_mesh.apply_transform(translation_matrix(pos))
            spheres.append(sphere_mesh)
        
        # Combine meshes
        bush = trimesh.util.concatenate(spheres)
        
        # Save model
        output_path = self.output_dir / "props" / "bush.glb"
        bush.export(output_path)
        return output_path
    
    def generate_flower_model(self) -> Path:
        """Generate a simple flower model"""
        # Create stem
        stem = cylinder(radius=0.05, height=0.5)
        
        # Create petals
        petals = []
        for i in range(5):
            # Create petal
            petal = icosphere(subdivisions=2, radius=0.1)
            
            # Position petal
            angle = i * (2 * np.pi / 5)
            pos = np.array([
                0.1 * np.cos(angle),
                0.5 + 0.1 * np.sin(angle),
                0.1 * np.sin(angle)
            ])
            petal.apply_transform(translation_matrix(pos))
            petals.append(petal)
        
        # Create center
        center = icosphere(subdivisions=2, radius=0.1)
        center.apply_transform(translation_matrix([0, 0.5, 0]))
        
        # Combine meshes
        flower = trimesh.util.concatenate([stem, center] + petals)
        
        # Save model
        output_path = self.output_dir / "props" / "flower.glb"
        flower.export(output_path)
        return output_path
    
    def generate_stone_model(self) -> Path:
        """Generate a simple stone model"""
        # Create base stone
        stone = icosphere(subdivisions=2, radius=0.3)
        
        # Add some deformation
        vertices = stone.vertices
        for i in range(len(vertices)):
            # Add random displacement
            displacement = np.random.normal(0, 0.1, 3)
            vertices[i] += displacement
        
        # Update mesh
        stone.vertices = vertices
        stone.fix_normals()
        
        # Save model
        output_path = self.output_dir / "props" / "stone.glb"
        stone.export(output_path)
        return output_path
    
    def generate_temple_model(self) -> Path:
        """Generate a temple model"""
        # Create base platform
        platform = box(extents=[4, 0.5, 4])
        
        # Create main building
        building = box(extents=[3, 2, 3])
        building.apply_transform(translation_matrix([0, 1.25, 0]))
        
        # Create roof
        roof = cone(radius=2.5, height=2.0)
        roof.apply_transform(translation_matrix([0, 3, 0]))
        
        # Create pillars
        pillars = []
        for i in range(4):
            angle = i * (np.pi / 2)
            x = 2 * np.cos(angle)
            z = 2 * np.sin(angle)
            
            pillar = cylinder(radius=0.2, height=3.0)
            pillar.apply_transform(translation_matrix([x, 1.5, z]))
            pillars.append(pillar)
        
        # Combine meshes
        temple = trimesh.util.concatenate([platform, building, roof] + pillars)
        
        # Save model
        output_path = self.output_dir / "features" / "temple.glb"
        temple.export(output_path)
        return output_path
    
    def generate_ruins_model(self) -> Path:
        """Generate ruins model"""
        # Create base platform
        platform = box(extents=[3, 0.5, 3])
        
        # Create broken walls
        walls = []
        for i in range(4):
            angle = i * (np.pi / 2)
            x = 1.5 * np.cos(angle)
            z = 1.5 * np.sin(angle)
            
            # Random height for broken wall
            height = np.random.uniform(0.5, 2.0)
            wall = box(extents=[0.3, height, 1.5])
            wall.apply_transform(translation_matrix([x, height/2, z]))
            walls.append(wall)
        
        # Combine meshes
        ruins = trimesh.util.concatenate([platform] + walls)
        
        # Save model
        output_path = self.output_dir / "features" / "ruins.glb"
        ruins.export(output_path)
        return output_path
    
    def generate_well_model(self) -> Path:
        """Generate a well model"""
        # Create base
        base = cylinder(radius=1.0, height=0.5)
        
        # Create well walls
        walls = cylinder(radius=0.8, height=1.0)
        walls.apply_transform(translation_matrix([0, 0.75, 0]))
        
        # Create roof structure
        roof = cone(radius=1.2, height=1.0)
        roof.apply_transform(translation_matrix([0, 2, 0]))
        
        # Combine meshes
        well = trimesh.util.concatenate([base, walls, roof])
        
        # Save model
        output_path = self.output_dir / "features" / "well.glb"
        well.export(output_path)
        return output_path
    
    def generate_camp_model(self) -> Path:
        """Generate a camp model"""
        # Create base platform
        platform = box(extents=[3, 0.2, 3])
        
        # Create tent
        tent_base = box(extents=[2, 0.1, 2])
        tent_base.apply_transform(translation_matrix([0, 0.15, 0]))
        
        # Create tent roof
        tent_roof = cone(radius=1.5, height=1.5)
        tent_roof.apply_transform(translation_matrix([0, 1.0, 0]))
        
        # Create campfire
        fire_base = cylinder(radius=0.3, height=0.1)
        fire_base.apply_transform(translation_matrix([1.0, 0.2, 0]))
        
        # Create fire logs
        logs = []
        for i in range(3):
            angle = i * (2 * np.pi / 3)
            x = 1.0 + 0.2 * np.cos(angle)
            z = 0.2 * np.sin(angle)
            
            log = cylinder(radius=0.05, height=0.4)
            log.apply_transform(translation_matrix([x, 0.3, z]))
            log.apply_transform(rotation_matrix(np.pi/4, [0, 0, 1]))
            logs.append(log)
        
        # Combine meshes
        camp = trimesh.util.concatenate([platform, tent_base, tent_roof, fire_base] + logs)
        
        # Save model
        output_path = self.output_dir / "features" / "camp.glb"
        camp.export(output_path)
        return output_path
    
    def generate_dungeon_model(self) -> Path:
        """Generate a dungeon model"""
        # Create base platform
        platform = box(extents=[4, 0.5, 4])
        
        # Create walls
        walls = []
        wall_height = 2.0
        wall_thickness = 0.3
        
        # North wall
        north_wall = box(extents=[4, wall_height, wall_thickness])
        north_wall.apply_transform(translation_matrix([0, wall_height/2, 2]))
        walls.append(north_wall)
        
        # South wall
        south_wall = box(extents=[4, wall_height, wall_thickness])
        south_wall.apply_transform(translation_matrix([0, wall_height/2, -2]))
        walls.append(south_wall)
        
        # East wall
        east_wall = box(extents=[wall_thickness, wall_height, 4])
        east_wall.apply_transform(translation_matrix([2, wall_height/2, 0]))
        walls.append(east_wall)
        
        # West wall
        west_wall = box(extents=[wall_thickness, wall_height, 4])
        west_wall.apply_transform(translation_matrix([-2, wall_height/2, 0]))
        walls.append(west_wall)
        
        # Add pillars in corners
        pillars = []
        pillar_positions = [
            (1.5, 1.5), (1.5, -1.5), (-1.5, 1.5), (-1.5, -1.5)
        ]
        for x, z in pillar_positions:
            pillar = cylinder(radius=0.2, height=wall_height)
            pillar.apply_transform(translation_matrix([x, wall_height/2, z]))
            pillars.append(pillar)
        
        # Add some decorative elements
        decorations = []
        
        # Add wall sconces
        sconce_positions = [
            (1.8, 1.8), (1.8, -1.8), (-1.8, 1.8), (-1.8, -1.8)
        ]
        for x, z in sconce_positions:
            sconce = box(extents=[0.2, 0.2, 0.2])
            sconce.apply_transform(translation_matrix([x, wall_height/2, z]))
            decorations.append(sconce)
        
        # Combine all meshes
        dungeon = trimesh.util.concatenate([platform] + walls + pillars + decorations)
        
        # Save model
        output_path = self.output_dir / "features" / "dungeon.glb"
        dungeon.export(output_path)
        return output_path
    
    def generate_bridge_model(self) -> Path:
        """Generate a bridge model"""
        # Create base platform
        platform = box(extents=[4, 0.3, 2])
        
        # Create bridge deck
        deck = box(extents=[3.8, 0.1, 1.8])
        deck.apply_transform(translation_matrix([0, 0.2, 0]))
        
        # Create bridge railings
        railings = []
        railing_height = 0.5
        railing_thickness = 0.1
        
        # North railing
        north_railing = box(extents=[3.8, railing_height, railing_thickness])
        north_railing.apply_transform(translation_matrix([0, railing_height/2, 0.9]))
        railings.append(north_railing)
        
        # South railing
        south_railing = box(extents=[3.8, railing_height, railing_thickness])
        south_railing.apply_transform(translation_matrix([0, railing_height/2, -0.9]))
        railings.append(south_railing)
        
        # Create support pillars
        pillars = []
        pillar_positions = [
            (-1.5, -0.8), (-1.5, 0.8), (1.5, -0.8), (1.5, 0.8)
        ]
        for x, z in pillar_positions:
            pillar = cylinder(radius=0.2, height=1.0)
            pillar.apply_transform(translation_matrix([x, -0.5, z]))
            pillars.append(pillar)
        
        # Combine meshes
        bridge = trimesh.util.concatenate([platform, deck] + railings + pillars)
        
        # Save model
        output_path = self.output_dir / "features" / "bridge.glb"
        bridge.export(output_path)
        return output_path
    
    def generate_tower_model(self) -> Path:
        """Generate a tower model"""
        # Create base platform
        platform = box(extents=[2, 0.5, 2])
        
        # Create main tower structure
        tower = cylinder(radius=0.8, height=4.0)
        tower.apply_transform(translation_matrix([0, 2.25, 0]))
        
        # Create tower roof
        roof = cone(radius=1.0, height=1.5)
        roof.apply_transform(translation_matrix([0, 5.0, 0]))
        
        # Create windows
        windows = []
        window_positions = [
            (0, 1.5, 0.8), (0, 3.0, 0.8),  # North windows
            (0, 1.5, -0.8), (0, 3.0, -0.8),  # South windows
            (0.8, 1.5, 0), (0.8, 3.0, 0),  # East windows
            (-0.8, 1.5, 0), (-0.8, 3.0, 0)  # West windows
        ]
        for x, y, z in window_positions:
            window = box(extents=[0.2, 0.4, 0.1])
            window.apply_transform(translation_matrix([x, y, z]))
            windows.append(window)
        
        # Create battlements
        battlements = []
        battlement_positions = [
            (0.6, 4.0, 0.6), (0.6, 4.0, -0.6),
            (-0.6, 4.0, 0.6), (-0.6, 4.0, -0.6)
        ]
        for x, y, z in battlement_positions:
            battlement = box(extents=[0.2, 0.3, 0.2])
            battlement.apply_transform(translation_matrix([x, y, z]))
            battlements.append(battlement)
        
        # Combine meshes
        tower_model = trimesh.util.concatenate([platform, tower, roof] + windows + battlements)
        
        # Save model
        output_path = self.output_dir / "features" / "tower.glb"
        tower_model.export(output_path)
        return output_path
    
    def generate_all_models(self) -> Dict[str, Dict[str, str]]:
        """Generate all models and return their paths"""
        models = {
            "features": {
                "tree": str(self.generate_tree_model()),
                "rock": str(self.generate_rock_model()),
                "building": str(self.generate_building_model()),
                "temple": str(self.generate_temple_model()),
                "ruins": str(self.generate_ruins_model()),
                "well": str(self.generate_well_model()),
                "camp": str(self.generate_camp_model()),
                "dungeon": str(self.generate_dungeon_model()),
                "bridge": str(self.generate_bridge_model()),
                "tower": str(self.generate_tower_model())
            },
            "props": {
                "bush": str(self.generate_bush_model()),
                "flower": str(self.generate_flower_model()),
                "stone": str(self.generate_stone_model())
            }
        }
        
        # Save model manifest
        manifest_path = self.output_dir / "models.json"
        with open(manifest_path, 'w') as f:
            json.dump(models, f, indent=2)
        
        return models 