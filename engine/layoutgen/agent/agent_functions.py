from . import chat
from typing import Dict
from functools import partial
from pathlib import Path
import asyncio



class AgentFunctions:
    def __init__(self, max_generations=2):
        """
        Stateful wrapper around our various agent calls.
        """
        self.chat_api = chat.ChatAPI()
        self.chat_prompts = chat.ChatPrompt(["prompts.json"])
        self.max_generations = max_generations

    # =====================================================================
    # Main external functions we'll call
    # =====================================================================
    def llm_dungeon_layout(self, dungeon_data_class, layout_prompt: str, model_endpoint: str = "Claude Sonnet 4"):
        """
        Primary function for doing high-level dungeon layout.

        Inputs:
            - 'dungeon_dataclass': Instance of our DungeonData class
            - 'layout_prompt': User prompt of what they'd like the dungeon to be
            - 'model_endpoint': Model to query
        
        Returns a dict of room_int: description of what room should be.
        """
        # Start by getting our image of the dungeon layout
        dungeon_filepath = dungeon_data_class.print_dungeon(show_ids=True, action='save')

        # Then generate
        parser_func = partial(
            chat.parse_dungeon_layout, 
            num_dungeons=dungeon_data_class.get_num_rooms()
        )
        sys_prompt, user_prompt = self.chat_prompts.get_prompt(
            name="dungeon_layout",
            system_args=None,
            user_args={"prompt": layout_prompt}
        )
        dungeon_layout_dict = self.chat_api.chat_parsed(
            model=model_endpoint,
            system=sys_prompt,
            user=user_prompt,
            img_path=dungeon_filepath,
            parser_func=parser_func,
            max_generations=self.max_generations
        )
        # Path(dungeon_filepath).unlink()
        return dungeon_layout_dict
    

    def llm_choose_assets(self, default_assets_class, dungeon_layout_dict, model_endpoint: str = "Claude Sonnet 4"):
        """
        Primary function for choosing assets for each room from a large list of default assets given the dungeon layout generated previously.

        Inputs:
            - 'default_assets_class': Instance of the default assets class
            - 'dungeon_layout_dict': Dict mapping from 'room ID' to description of said room
            - 'model_endpoint': Model to query
        """
        full_id_map = default_assets_class.get_full_id_map()
        formatted_asset_list = default_assets_class.format_id_map(full_id_map)

        parser_func = partial(
            chat.parse_asset_lists,
            full_id_map=full_id_map, 
            dungeon_layout_dict=dungeon_layout_dict
        )
        sys_prompt, user_prompt = self.chat_prompts.get_prompt(
            name="choose_assets",
            system_args=None,
            user_args={"dungeon_layout": dungeon_layout_dict, "asset_list": formatted_asset_list}
        )
        asset_list_dict = self.chat_api.chat_parsed(
            model=model_endpoint,
            system=sys_prompt,
            user=user_prompt,
            img_path=None,
            parser_func=parser_func,
            max_generations=self.max_generations
        )
        return asset_list_dict


    def llm_design_room(self, room_map, asset_list, room_prompt, model_endpoint: str = "Claude Sonnet 4"):
        """ 
        Primary function for designing each room based on a 2D numpy array passed in. 
        
        Inputs:
            - 'room_map': 2D numpy array of your room
            - 'asset_list': List of assets available for the model to choose (name, description, asset_id)
            - 'room_prompt': Prompt of what the room layout should be
            - 'model_endpoint': Model to query
        
        Returns a 2D Python list of strings where '0' (empty space), '1' (empty floor), '2' (wall), or asset_id. 
        """   
        formatted_args = dict()
        formatted_args['room_map'] = '\n'.join('[' + ', '.join(str(x) for x in row) + '],' for row in room_map)
        asset_list_prompt, asset_list_key = self._map_assets(asset_list)
        formatted_args['asset_list'] = asset_list_prompt
        formatted_args['prompt'] = room_prompt

        # Make our call to the LLM
        parser_func = partial(
            chat.parse_design_room,
            asset_list_key=asset_list_key,
            room_map=room_map
        )
        sys_prompt, user_prompt = self.chat_prompts.get_prompt(
            name="asset_placement",
            system_args=None,
            user_args=formatted_args
        )
        mapped_room = self.chat_api.chat_parsed(
            model=model_endpoint,
            system=sys_prompt,
            user=user_prompt,
            img_path=None,
            parser_func=parser_func,
            max_generations=self.max_generations
        )
        return mapped_room

    # =====================================================================
    # Async versions of the main functions
    # =====================================================================
    async def llm_design_room_async(self, room_map, asset_list, room_prompt, model_endpoint: str = "Claude Sonnet 4", delay_between_requests: float = 0.0):
        """ 
        Async version of llm_design_room for parallel execution.
        
        Inputs:
            - 'room_map': 2D numpy array of your room
            - 'asset_list': List of assets available for the model to choose (name, description, asset_id)
            - 'room_prompt': Prompt of what the room layout should be
            - 'model_endpoint': Model to query
            - 'delay_between_requests': Optional delay in seconds before making the request (for additional rate limiting)
        
        Returns a 2D Python list of strings where '0' (empty space), '1' (empty floor), '2' (wall), or asset_id. 
        """   
        # Optional delay for additional rate limiting
        if delay_between_requests > 0:
            await asyncio.sleep(delay_between_requests)
            
        formatted_args = dict()
        formatted_args['room_map'] = '\n'.join('[' + ', '.join(str(x) for x in row) + '],' for row in room_map)
        asset_list_prompt, asset_list_key = self._map_assets(asset_list)
        formatted_args['asset_list'] = asset_list_prompt
        formatted_args['prompt'] = room_prompt

        # Make our call to the LLM
        parser_func = partial(
            chat.parse_design_room,
            asset_list_key=asset_list_key,
            room_map=room_map
        )
        sys_prompt, user_prompt = self.chat_prompts.get_prompt(
            name="asset_placement",
            system_args=None,
            user_args=formatted_args
        )
        mapped_room = await self.chat_api.chat_parsed_async(
            model=model_endpoint,
            system=sys_prompt,
            user=user_prompt,
            img_path=None,
            parser_func=parser_func,
            max_generations=self.max_generations
        )
        return mapped_room

    # =====================================================================
    # Helper Functions
    # =====================================================================
    def _map_assets(self, asset_list):
        """
        Helper function that returns a string (formatted asset list in prompt) and dict that maps from abbreviated name to the underlying asset.
        """
        asset_list_dict = dict()
        used_keys = set()
        asset_list_prompt_lines = []

        for name, desc, asset_id in sorted(asset_list, key=lambda x: x[0].lower()):
            base_char = name[0].lower()
            key = base_char
            i = 1
            while key in used_keys:
                key = f"{base_char}{i}"
                i += 1
            used_keys.add(key)
            asset_list_dict[key] = asset_id
            asset_list_prompt_lines.append(f"- {key}: {desc}")

        asset_list_prompt = "\n".join(asset_list_prompt_lines)

        # Ensure doors can get mapped -- hack; TODO: Make more robust to ensure agent provides door asset
        asset_list_dict['D'] = 'door_wood_arched_1'
        
        return asset_list_prompt, asset_list_dict