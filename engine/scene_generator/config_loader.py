import json
import os
import argparse

class ConfigLoader:
    def __init__(self, config_file='config.json'):
        self.config_file = config_file
        self.config = self.load_config_file()

    def load_config_file(self):
        try:
            with open(self.config_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: {self.config_file} not found. Using default configuration.")
            return {}

    def override_with_env(self):
        for key, value in os.environ.items():
            if key.startswith('PIPELINE_'):
                _, component, param = key.split('_', 2)
                if component in self.config and param in self.config[component]:
                    self.config[component][param] = value

    def override_with_args(self, args):
        for key, value in vars(args).items():
            if value is not None:
                component, param = key.split('_', 1)
                if component in self.config and param in self.config[component]:
                    self.config[component][param] = value

    def get_config(self):
        return self.config

    @staticmethod
    def parse_args():
        parser = argparse.ArgumentParser(description='Pipeline Configuration')
        parser.add_argument('--prompt_to_image_model_id', type=str, help='Model ID for Stable Diffusion')
        parser.add_argument('--prompt_to_image_device', type=str, help='Device for Stable Diffusion')
        parser.add_argument('--semantic_labeling_labels', type=str, nargs='+', help='Labels for semantic labeling')
        parser.add_argument('--structure_extraction_contour_level', type=float, help='Contour level for structure extraction')
        parser.add_argument('--mesh_synthesis_output_format', type=str, help='Output format for mesh synthesis')
        parser.add_argument('--wfc_tiling_pattern_size', type=int, help='Pattern size for WFC tiling')
        return parser.parse_args()

# Usage example
# config_loader = ConfigLoader()
# config_loader.override_with_env()
# args = ConfigLoader.parse_args()
# config_loader.override_with_args(args)
# config = config_loader.get_config() 