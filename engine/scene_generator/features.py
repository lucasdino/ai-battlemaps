from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
import logging
from pathlib import Path
import json

logger = logging.getLogger(__name__)

@dataclass
class FeatureTemplate:
    """Template for a feature type with semantic properties"""
    name: str
    description: str
    elevation_range: Tuple[float, float]
    moisture_range: Tuple[float, float]
    size: Tuple[int, int]
    style_tags: List[str]
    weight: float = 1.0
    noise_ratio: float = 0.5
    min_distance: float = 5.0
    max_density: float = 0.1

class FeatureMatcher:
    """Handles semantic matching of features using embeddings"""
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """Initialize feature matcher with specified model"""
        self.model = SentenceTransformer(model_name)
        self.templates: Dict[str, FeatureTemplate] = {}
        self.embeddings: Dict[str, torch.Tensor] = {}
        self._load_default_templates()
    
    def _load_default_templates(self):
        """Load default feature templates"""
        default_templates = {
            'temple': FeatureTemplate(
                name='temple',
                description='Ancient stone temple with columns and ornate decorations',
                elevation_range=(0.3, 0.8),
                moisture_range=(0.2, 0.6),
                size=(3, 3),
                style_tags=['ancient', 'stone', 'religious'],
                weight=1.0,
                noise_ratio=0.3
            ),
            'bridge': FeatureTemplate(
                name='bridge',
                description='Stone bridge spanning a gap or water feature',
                elevation_range=(0.2, 0.7),
                moisture_range=(0.4, 0.9),
                size=(2, 4),
                style_tags=['stone', 'architectural'],
                weight=0.8,
                noise_ratio=0.2
            ),
            'ruins': FeatureTemplate(
                name='ruins',
                description='Crumbling stone ruins with partial walls and debris',
                elevation_range=(0.2, 0.9),
                moisture_range=(0.1, 0.7),
                size=(2, 2),
                style_tags=['ancient', 'stone', 'ruined'],
                weight=1.2,
                noise_ratio=0.4
            ),
            'camp': FeatureTemplate(
                name='camp',
                description='Temporary camp with tents and campfire',
                elevation_range=(0.1, 0.6),
                moisture_range=(0.1, 0.5),
                size=(2, 2),
                style_tags=['temporary', 'wooden'],
                weight=0.9,
                noise_ratio=0.5
            ),
            'tower': FeatureTemplate(
                name='tower',
                description='Tall stone tower with narrow windows',
                elevation_range=(0.4, 0.9),
                moisture_range=(0.1, 0.5),
                size=(1, 1),
                style_tags=['stone', 'tall'],
                weight=0.7,
                noise_ratio=0.3
            ),
            'dungeon': FeatureTemplate(
                name='dungeon',
                description='Underground dungeon entrance with stone steps',
                elevation_range=(0.1, 0.5),
                moisture_range=(0.3, 0.8),
                size=(2, 2),
                style_tags=['underground', 'stone'],
                weight=1.1,
                noise_ratio=0.4
            )
        }
        
        for template in default_templates.values():
            self.add_template(template)
    
    def add_template(self, template: FeatureTemplate):
        """Add a new feature template"""
        self.templates[template.name] = template
        self.embeddings[template.name] = self._compute_embedding(template)
    
    def _compute_embedding(self, template: FeatureTemplate) -> torch.Tensor:
        """Compute embedding for a template"""
        text = f"{template.description} {' '.join(template.style_tags)}"
        return self.model.encode(text, convert_to_tensor=True)
    
    def find_matches(
        self,
        prompt: str,
        threshold: float = 0.5,
        max_matches: int = 5
    ) -> List[Tuple[str, float]]:
        """Find matching features for a prompt"""
        prompt_embedding = self.model.encode(prompt, convert_to_tensor=True)
        
        # Calculate similarities
        similarities = []
        for name, embedding in self.embeddings.items():
            similarity = torch.nn.functional.cosine_similarity(
                prompt_embedding.unsqueeze(0),
                embedding.unsqueeze(0)
            ).item()
            similarities.append((name, similarity))
        
        # Sort by similarity and filter by threshold
        matches = [
            (name, score) for name, score in sorted(
                similarities,
                key=lambda x: x[1],
                reverse=True
            )
            if score >= threshold
        ][:max_matches]
        
        return matches
    
    def get_template(self, name: str) -> Optional[FeatureTemplate]:
        """Get template by name"""
        return self.templates.get(name)
    
    def save_templates(self, path: Path):
        """Save templates to file"""
        data = {
            name: {
                'name': template.name,
                'description': template.description,
                'elevation_range': template.elevation_range,
                'moisture_range': template.moisture_range,
                'size': template.size,
                'style_tags': template.style_tags,
                'weight': template.weight,
                'noise_ratio': template.noise_ratio,
                'min_distance': template.min_distance,
                'max_density': template.max_density
            }
            for name, template in self.templates.items()
        }
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load_templates(self, path: Path):
        """Load templates from file"""
        with open(path, 'r') as f:
            data = json.load(f)
        
        for name, template_data in data.items():
            template = FeatureTemplate(
                name=template_data['name'],
                description=template_data['description'],
                elevation_range=tuple(template_data['elevation_range']),
                moisture_range=tuple(template_data['moisture_range']),
                size=tuple(template_data['size']),
                style_tags=template_data['style_tags'],
                weight=template_data['weight'],
                noise_ratio=template_data['noise_ratio'],
                min_distance=template_data['min_distance'],
                max_density=template_data['max_density']
            )
            self.add_template(template) 