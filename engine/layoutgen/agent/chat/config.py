import os
from typing import Dict, List, Optional
from pathlib import Path
from dotenv import load_dotenv

dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=dotenv_path)


# ==================================================
# Simple Data Class to hold my model config
# ==================================================
class ModelConfig:
    """Configuration for a specific model."""
    
    def __init__(self, name: str, id: str, provider: str, gen_args: Dict = None):
        self.name = name
        self.id = id
        self.provider = provider.lower()
        self.gen_args = gen_args


# ==================================================
# Main config with all my information
# ==================================================
class Config:
    """Configuration class for managing API keys, models, and settings."""
    
    def __init__(self):
        self.api_keys = {
            'google': os.getenv('GOOGLE_API_KEY', ''),
            'anthropic': os.getenv('ANTHROPIC_API_KEY', ''),
            'openai': os.getenv('OPENAI_API_KEY', '')
        }
        
        # Define our available models
        self.models = [
            ModelConfig('o3', 'o3', 'openai', {"reasoning_effort": "low"}),
            ModelConfig('o4 Mini', 'o4-mini', 'openai', {"reasoning_effort": "medium"}),
            ModelConfig('GPT 4o', 'gpt-4o', 'openai'),
            ModelConfig('GPT 4.1', 'gpt-4.1', 'openai'),
            ModelConfig('GPT-4o Mini', 'gpt-4o-mini', 'openai'),
            ModelConfig('GPT-4.1 Mini', 'gpt-4.1-mini', 'openai'),
            ModelConfig('Claude 3.7 Sonnet', 'claude-3-7-sonnet-20250219', 'anthropic'),
            ModelConfig('Claude 4 Sonnet', 'claude-sonnet-4-20250514', 'anthropic'),
            ModelConfig('Claude 4 Opus', 'claude-opus-4-20250514', 'anthropic'),
            ModelConfig('Gemini 2.5 Flash', 'gemini-2.5-flash-preview-05-20', 'google'),
            ModelConfig('Gemini 2.5 Pro', 'gemini-2.5-pro-preview-05-06', 'google'),
        ]
        
        # Default models
        self.default_models = {
            'google': 'Gemini 2.5 Flash',
            'anthropic': 'Claude 4 Sonnet',
            'openai': 'GPT 4.1',
        }
        
        self.base_urls = {
            'google': 'https://generativelanguage.googleapis.com/v1beta/models/{id}:generateContent?key={api_key}',
            'anthropic': 'https://api.anthropic.com/v1/messages',
            'openai': 'https://api.openai.com/v1/chat/completions'
        }
    
    def get_api_key(self, provider: str) -> str:
        """Get API key for the specified provider."""
        key = self.api_keys.get(provider.lower())
        if not key:
            raise ValueError(f"API key not found for provider: {provider}. "
                           f"Please set the {provider.upper()}_API_KEY in your .env file")
        return key
    
    def get_default_model(self, provider: str) -> str:
        """Get default model for the specified provider."""
        return self.default_models.get(provider.lower(), '')
    
    def get_base_url(self, provider: str) -> str:
        """Get base URL for the specified provider."""
        return self.base_urls.get(provider.lower(), '')
    
    def get_model_by_id(self, model_id: str) -> Optional[ModelConfig]:
        """Get model configuration by model ID."""
        for model in self.models:
            if model.id == model_id:
                return model
        raise ValueError(f"model_id: {model_id} does not match any configured model.")
    
    def get_model_by_name(self, name: str) -> Optional[ModelConfig]:
        """Get model configuration by model ID."""
        for model in self.models:
            if model.name == name:
                return model
        raise ValueError(f"name: {name} does not match any configured model.")
    
    def get_models_by_provider(self, provider: str) -> List[ModelConfig]:
        """Get all models for a specific provider."""
        return [model for model in self.models if model.provider == provider.lower()]


# Global config instance
config = Config()
