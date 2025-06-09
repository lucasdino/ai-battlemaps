from typing import Dict
import asyncio

from .agent_functions import AgentFunctions
from .dungeon_dataclasses import DungeonData, DefaultAssets


class DungeonAgent(AgentFunctions):
    """
    Stateful wrapper around our agent functions that will do our various agentic functions for designing our dungeon.
    """

    def __init__(self, dungeon_data, default_assets, max_generation_attempts: int = 2, max_concurrent_requests: int = 3, delay_between_requests: float = 0.0, default_model_endpoint: str = "GPT-4.1 Mini"):
        """
        Instantiate our DungeonAgent wrapper class that we'll use to maintain state throughout our dungeon generation.

        Inputs:
            dungeon_data: JSON generated from the create Dungeon code
            default_assets: JSON of our DefaultAssets metadata
            max_concurrent_requests: Maximum number of concurrent API requests (default: 3)
            delay_between_requests: Delay in seconds between requests for additional rate limiting (default: 0.0)
        """
        super().__init__()
        self.dungeon_data = DungeonData(dungeon_data)
        self.default_assets = DefaultAssets(default_assets)
        self.max_generations = max_generation_attempts
        self.max_concurrent_requests = max_concurrent_requests
        self.delay_between_requests = delay_between_requests
        self.default_model_endpoint = default_model_endpoint

    def set_max_generations(self, max_generations):
        self.max_generations = max_generations

    def set_max_concurrent_requests(self, max_concurrent_requests: int):
        """Set the maximum number of concurrent API requests."""
        self.max_concurrent_requests = max_concurrent_requests

    def set_delay_between_requests(self, delay_between_requests: float):
        """Set the delay between requests for additional rate limiting."""
        self.delay_between_requests = delay_between_requests

    def set_rate_limiting(self, max_concurrent_requests: int = None, delay_between_requests: float = None):
        """Convenience method to set both rate limiting parameters at once."""
        if max_concurrent_requests is not None:
            self.max_concurrent_requests = max_concurrent_requests
        if delay_between_requests is not None:
            self.delay_between_requests = delay_between_requests

    def design_dungeon(self, dungeon_design_prompt: str, use_async: bool = True):
        """
        Main method to design a complete dungeon.
        
        Args:
            dungeon_design_prompt: Description of what the dungeon should be like
            use_async: If True, uses parallel processing for room design (faster). 
                      If False, uses sequential processing (original behavior).
        """
        try:
            # First generate dungeon layout
            dungeon_layout_dict = self._dungeon_layout(
                layout_prompt=dungeon_design_prompt,
                model_endpoint=self.default_model_endpoint
            )

            # Then choose our assets
            asset_list_dict = self._choose_assets(
                dungeon_layout_dict=dungeon_layout_dict,
                model_endpoint=self.default_model_endpoint
            )

            # Then place all our assets
            if use_async:
                room_placement_dict = asyncio.run(self._design_dungeon_async(
                    asset_list_dict=asset_list_dict,
                    dungeon_layout_dict=dungeon_layout_dict,
                    room_to_generate=None,
                    model_endpoint=self.default_model_endpoint
                ))
            else:
                room_placement_dict = self._design_dungeon(
                    asset_list_dict=asset_list_dict,
                    dungeon_layout_dict=dungeon_layout_dict,
                    room_to_generate=None,
                    model_endpoint=self.default_model_endpoint
                )

            return room_placement_dict

        except Exception as e:
            raise ValueError(f"Failed to complete full dungeon generation! Error encountered: {e}")

    async def design_dungeon_async(self, dungeon_design_prompt: str):
        """
        Fully async version of design_dungeon for use in async contexts.
        This method can be awaited directly without using asyncio.run().
        """
        try:
            # First generate dungeon layout
            dungeon_layout_dict = self._dungeon_layout(
                layout_prompt=dungeon_design_prompt,
                model_endpoint=self.default_model_endpoint
            )

            # Then choose our assets
            asset_list_dict = self._choose_assets(
                dungeon_layout_dict=dungeon_layout_dict,
                model_endpoint=self.default_model_endpoint
            )

            # Then place all our assets using async
            room_placement_dict = await self._design_dungeon_async(
                asset_list_dict=asset_list_dict,
                dungeon_layout_dict=dungeon_layout_dict,
                room_to_generate=None,
                model_endpoint=self.default_model_endpoint
            )

            return room_placement_dict

        except Exception as e:
            raise ValueError(f"Failed to complete full dungeon generation! Error encountered: {e}")

    # ============================================
    # Individual LLM agent calls
    # ============================================
    def _dungeon_layout(self, layout_prompt: str = "Use your creativity -- think of a unique dungeon concept that could work for this map!", model_endpoint: str = None):
        if model_endpoint is None:
            model_endpoint = self.default_model_endpoint
        dungeon_layout_dict = self.llm_dungeon_layout(
            dungeon_data_class=self.dungeon_data,
            layout_prompt=layout_prompt,
            model_endpoint=model_endpoint
        )
        return dungeon_layout_dict

    def _choose_assets(self, dungeon_layout_dict: Dict, model_endpoint: str = None):
        if model_endpoint is None:
            model_endpoint = self.default_model_endpoint
        asset_list_dict = self.llm_choose_assets(
            default_assets_class=self.default_assets,
            dungeon_layout_dict=dungeon_layout_dict,
            model_endpoint=model_endpoint
        )
        return asset_list_dict

    def _design_dungeon(self, asset_list_dict, dungeon_layout_dict, room_to_generate: int = None, model_endpoint: str = None):
        """Synchronous version - kept for backward compatibility"""
        if model_endpoint is None:
            model_endpoint = self.default_model_endpoint
        designed_rooms = dict()
        rooms_to_generate = dict()
        if room_to_generate is None:
            for k in self.dungeon_data.extracted_rooms.keys():
                grid, room = self.dungeon_data.get_room_arr(k)
                rooms_to_generate[k] = (grid, room)
        else:
            try:
                grid, room = self.dungeon_data.get_room_arr(str(room_to_generate))
                rooms_to_generate[str(room_to_generate)] = (grid, room)
            except KeyError:
                raise ValueError(
                    f"Provided room_to_generate={str(room_to_generate)} is not a valid key in extracted rooms -- valid keys: {list(self.dungeon_data.extracted_rooms.keys())}."
                )

        # Sequential processing (original implementation)
        for k, (room_grid, room) in rooms_to_generate.items():
            mapped_room = self.llm_design_room(
                room_map=room_grid, 
                asset_list=asset_list_dict[str(k)], 
                room_prompt=dungeon_layout_dict[str(k)],
                model_endpoint=model_endpoint
            )
            designed_rooms[str(k)] = mapped_room

        return designed_rooms

    async def _design_dungeon_async(self, asset_list_dict, dungeon_layout_dict, room_to_generate: int = None, model_endpoint: str = None):
        """Async version with parallel processing and rate limiting"""
        if model_endpoint is None:
            model_endpoint = self.default_model_endpoint
        rooms_to_generate = dict()
        if room_to_generate is None:
            for k in self.dungeon_data.extracted_rooms.keys():
                grid, room = self.dungeon_data.get_room_arr(k)
                rooms_to_generate[k] = (grid, room)
        else:
            try:
                grid, room = self.dungeon_data.get_room_arr(str(room_to_generate))
                rooms_to_generate[str(room_to_generate)] = (grid, room)
            except KeyError:
                raise ValueError(
                    f"Provided room_to_generate={str(room_to_generate)} is not a valid key in extracted rooms -- valid keys: {list(self.dungeon_data.extracted_rooms.keys())}."
                )

        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(self.max_concurrent_requests)
        
        async def design_room_with_semaphore(room_key, room_grid, room_data):
            """Wrapper function to design a room with semaphore rate limiting."""
            async with semaphore:
                return await self.llm_design_room_async(
                    room_map=room_grid, 
                    asset_list=asset_list_dict[str(room_key)], 
                    room_prompt=dungeon_layout_dict[str(room_key)],
                    model_endpoint=model_endpoint,
                    delay_between_requests=self.delay_between_requests
                )

        # Create tasks for parallel execution with rate limiting
        tasks = []
        room_keys = []
        for k, (room_grid, room) in rooms_to_generate.items():
            task = design_room_with_semaphore(k, room_grid, room)
            tasks.append(task)
            room_keys.append(str(k))

        rate_limit_info = f"max {self.max_concurrent_requests} concurrent"
        if self.delay_between_requests > 0:
            rate_limit_info += f", {self.delay_between_requests}s delay between requests"
        print(f"Processing {len(tasks)} rooms with {rate_limit_info}...")

        # Execute all tasks in parallel with rate limiting
        results = await asyncio.gather(*tasks)

        # Combine results into dictionary
        designed_rooms = dict()
        for key, result in zip(room_keys, results):
            designed_rooms[key] = result

        return designed_rooms