import os
import time
import numpy as np
from pathlib import Path
from collections import deque
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

from .constants import DUNGEON_COLORS, GRID_KEY, AGENT_KEY



class DungeonData:
    """Wrapper around our dungeon data w/ useful functionality to easily pass/organize in the backend."""
    def __init__(self, dungeondata):
        self.dungeondata = dungeondata
        self.initial_gridsize = (len(dungeondata['grid']), len(dungeondata['grid'][0]))
        self._extract_rooms()

    # ==========================================================
    # Main endpoints
    # ==========================================================
    def get_num_rooms(self):
        return len(self.extracted_rooms)
    
    def get_room_arr(self, room_id):
        if str(room_id) not in self.extracted_rooms:
            raise ValueError(f"Room ID {str(room_id)} not a valid key in self.extracted_rooms! Valid keys are: {self.extracted_rooms.keys()}")

        grid, room = self.extracted_rooms[str(room_id)]
        grid_str = grid.astype(str)
        return np.vectorize(lambda x: str(AGENT_KEY[x]))(grid_str), room
        
    def print_dungeon(self, show_ids: bool = True,
                    figsize: tuple = (10, 8),
                    action: str = "save") -> str | None:
        """
        Visualise the dungeon (cropped to non-zero bounding box) with grid lines.

        Args:
            show_ids : overlay room IDs if True.
            figsize  : matplotlib figure size.
            action   : "print" → display with plt.show();
                    "save"  (default) → save to ./figures and return filepath.

        Returns:
            str | None : path to saved image when action=="save", else None.
        """
        grid = np.asarray(self.dungeondata['grid'])
        ys, xs = np.nonzero(grid)
        if ys.size == 0:
            print("Empty dungeon grid.")
            return None

        min_y, max_y = ys.min(), ys.max() + 1
        min_x, max_x = xs.min(), xs.max() + 1
        cropped = grid[min_y:max_y, min_x:max_x]

        colors = [DUNGEON_COLORS[str(i)]['color'] for i in range(len(DUNGEON_COLORS))]
        cmap = mcolors.ListedColormap(colors)

        fig, ax = plt.subplots(figsize=figsize)
        ax.imshow(cropped, cmap=cmap, interpolation='nearest')

        # ---- grid lines --------------------------------------------------
        h, w = cropped.shape
        ax.set_xticks(np.arange(-0.5, w, 1), minor=True)
        ax.set_yticks(np.arange(-0.5, h, 1), minor=True)
        ax.grid(which='minor', color='gray', linewidth=0.5, alpha=0.4)
        ax.tick_params(which='both', bottom=False, left=False,
                    labelbottom=False, labelleft=False)

        # ---- room IDs ----------------------------------------------------
        if show_ids:
            for room in self.dungeondata['rooms']:
                cx, cy = room['center']
                cx -= min_x
                cy -= min_y
                if 0 <= cx < w and 0 <= cy < h:
                    ax.text(cx, cy, str(room['id']),
                            color='white', fontsize=10, fontweight='bold',
                            ha='center', va='center',
                            bbox=dict(boxstyle='round,pad=0.2',
                                    facecolor='black', alpha=0.6))

        plt.tight_layout()

        if action == "print":
            plt.show()
            return None

        # ---------- save ----------
        figures_dir = Path(__file__).parent / "figures"
        figures_dir.mkdir(exist_ok=True)
        fpath = figures_dir / f"dungeon_{int(time.time())}.png"
        fig.savefig(fpath, dpi=150, bbox_inches='tight')
        plt.close(fig)
        return str(fpath)

    def print_room(self, room_index: int, figsize: tuple = (6, 6), room_desc: str = None):
        if not (0 <= room_index < len(self.extracted_rooms)):
            print(f"Invalid room index. Available: 0-{len(self.extracted_rooms)-1}")
            return

        room_grid, room_data = self.extracted_rooms[room_index]

        # map numeric values → RGB in [0, 1]
        rgb_grid = np.zeros((*room_grid.shape, 3), dtype=float)
        for val_str, spec in DUNGEON_COLORS.items():
            mask = room_grid == int(val_str)
            hex_colour = spec['color'].lstrip('#')
            rgb = tuple(int(hex_colour[i:i+2], 16) / 255.0 for i in (0, 2, 4))
            rgb_grid[mask] = rgb

        plt.figure(figsize=figsize)
        plt.imshow(rgb_grid, interpolation='nearest')
        title = f"Room {room_data['id']}"
        
        if room_desc:
            plt.suptitle(title, fontsize=14, y=0.95)
            plt.title(room_desc, fontsize=10, pad=10)
        else:
            plt.title(title, fontsize=14)
        
        plt.axis('off')
        plt.show()

    def assemble_dungeon(self, designed_dungeon_rooms):
        """Final function to take our designed dungeon rooms and assemble the full dungeon -- returning a 2D array of our final dungeon."""
        rows, cols = self.initial_gridsize
        grid = [["0" for _ in range(cols)] for _ in range(rows)]

        for room_id, room_layout in designed_dungeon_rooms.items():
            bounds = self.extracted_rooms[room_id][1]["bounds"]
            max_x, max_y = bounds["max_x"], bounds["max_y"]
            h, w = len(room_layout), len(room_layout[0])
            start_y, start_x = max_y - (h - 1), max_x - (w - 1)

            for dy, row in enumerate(room_layout):
                for dx, val in enumerate(row):
                    if val == 0 or val == "0":
                        continue
                    y, x = start_y + dy, start_x + dx
                    if 0 <= y < rows and 0 <= x < cols:
                        grid[y][x] = str(val)

        non_zero = [(y, x) for y in range(rows) for x in range(cols) if grid[y][x] != "0" and grid[y][x] != 0]
        if not non_zero:
            return []

        ys, xs = zip(*non_zero)
        min_y, max_y = min(ys), max(ys)
        min_x, max_x = min(xs), max(xs)
        return [row[min_x:max_x + 1] for row in grid[min_y:max_y + 1]]


    # ==========================================================
    # Helpers
    # ==========================================================
    def _extract_rooms(self):
        """
        Extract individual room grids from the main dungeon grid.
        Returns list of tuples (room_grid, room_data) for each room
        """
        grid = np.array(self.dungeondata['grid'])
        rooms = self.dungeondata['rooms']
        extracted_rooms = dict()
        
        for room in rooms:
            bounds = room['bounds']
            min_x, max_x = bounds['min_x'], bounds['max_x']
            min_y, max_y = bounds['min_y'], bounds['max_y']
            
            # Extract the room subgrid (note: y is rows, x is columns) --> need to +1 / -1 to get walls as well
            room_grid = grid[min_y-1:max_y+1, min_x-1:max_x+1]
            
            island_grid = self._extract_room_island(room_grid)
            extracted_rooms[str(room['id'])] = (island_grid, room)
        
        self.extracted_rooms = extracted_rooms

    def _extract_room_island(self, room_grid: np.ndarray) -> np.ndarray:
        """
        Keep
        • every interior tile  (value  ≠ 0, 2, 4) that is **not** reachable
            from the perimeter, and
        • every wall (2) / door (4) that is 8-connected to those interiors.
        All other cells are zeroed.
        """
        H, W = room_grid.shape
        wall_or_door = (room_grid == 2) | (room_grid == 4)

        # ── 1. flood-fill from perimeter through NON-wall/door tiles ──
        outside = np.zeros((H, W), dtype=bool)
        q = deque()

        def try_enqueue(y, x):
            if 0 <= y < H and 0 <= x < W and not wall_or_door[y, x] and not outside[y, x]:
                outside[y, x] = True
                q.append((y, x))

        for x in range(W):
            try_enqueue(0, x); try_enqueue(H - 1, x)
        for y in range(H):
            try_enqueue(y, 0); try_enqueue(y, W - 1)

        dirs4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
        while q:
            y, x = q.popleft()
            for dy, dx in dirs4:
                try_enqueue(y + dy, x + dx)

        # ── 2. interior tiles = values not {0,2,4} AND not outside ──
        interior = (room_grid != 0) & (~wall_or_door) & (~outside)

        # ── 3. boundary = any wall/door 8-connected to an interior tile ──
        boundary = np.zeros_like(interior)
        dirs8 = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0)]

        for y, x in zip(*np.where(interior)):
            for dy, dx in dirs8:
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and wall_or_door[ny, nx]:
                    boundary[ny, nx] = True

        # ── 4. build final island grid ──
        mask = interior | boundary
        island = np.zeros_like(room_grid)
        island[mask] = room_grid[mask]
        return island



class DefaultAssets:
    def __init__(self, default_assets_metadata):
        """
        Simple data wrapper that takes in our default assets metadata (json) and applies various filtering / restructuring to be more easily handled entirely in the Python backend.
        """
        self.default_assets_metadata = default_assets_metadata

    def get_full_id_map(self):
        id_map = dict()
        for item in self.default_assets_metadata:
            id_map[item['id']] = (item["name"], item["description"])
        return id_map

    def format_id_map(self, id_map):
        formatted_elements = []
        for id, (name, desc) in id_map.items():
            formatted_elements.append(f"{id}: {desc}")

        final_prompt = "List is in format 'asset_id': 'description'\n" + "\n- ".join(formatted_elements)
        return final_prompt