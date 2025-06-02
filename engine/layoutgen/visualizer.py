import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Rectangle, Circle
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import json

class LayoutVisualizer:
    def __init__(self):
        self.color_schemes = {
            'default': {
                0: '#000000',  # VOID - Black
                1: '#FFFFFF',  # FLOOR - White
                2: '#8B4513',  # WALL - Brown
                3: '#4169E1',  # DOOR - Blue
                4: '#FF0000',  # ROOM_MARKER - Red
                5: '#32CD32',  # CORRIDOR - Green
                6: '#FFD700',  # TREASURE - Gold
                7: '#800080',  # BOSS - Purple
                8: '#FFA500',  # ENTRANCE - Orange
                9: '#FF69B4',  # TRAP - Pink
                10: '#00CED1', # PUZZLE - Turquoise
                11: '#DC143C', # ROOM_CENTER - Crimson
            },
            'dungeon': {
                0: '#2F2F2F',  # VOID - Dark gray
                1: '#F5DEB3',  # FLOOR - Wheat
                2: '#696969',  # WALL - Dim gray
                3: '#8B4513',  # DOOR - Saddle brown
                4: '#FF4500',  # ROOM_MARKER - Orange red
                5: '#D2B48C',  # CORRIDOR - Tan
                6: '#FFD700',  # TREASURE - Gold
                7: '#8B0000',  # BOSS - Dark red
                8: '#228B22',  # ENTRANCE - Forest green
                9: '#DC143C',  # TRAP - Crimson
                10: '#4169E1', # PUZZLE - Royal blue
                11: '#FF6347', # ROOM_CENTER - Tomato
            },
            'cave': {
                0: '#000000',  # VOID - Black
                1: '#DEB887',  # FLOOR - Burlywood
                2: '#654321',  # WALL - Dark brown
                3: '#8B4513',  # DOOR - Saddle brown
                4: '#FF0000',  # ROOM_MARKER - Red
                5: '#CD853F',  # CORRIDOR - Peru
                6: '#FFD700',  # TREASURE - Gold
                7: '#8B0000',  # BOSS - Dark red
                8: '#32CD32',  # ENTRANCE - Lime green
                9: '#FF1493',  # TRAP - Deep pink
                10: '#00BFFF', # PUZZLE - Deep sky blue
                11: '#FF6347', # ROOM_CENTER - Tomato
            }
        }
        
        self.tile_names = {
            0: 'Void',
            1: 'Floor',
            2: 'Wall',
            3: 'Door',
            4: 'Room Marker',
            5: 'Corridor',
            6: 'Treasure',
            7: 'Boss',
            8: 'Entrance',
            9: 'Trap',
            10: 'Puzzle',
            11: 'Room Center',
        }
    
    def visualize_layout(self, layout_data: Dict, color_scheme: str = 'default', 
                        save_path: Optional[str] = None, show_legend: bool = True,
                        figsize: Tuple[int, int] = (12, 10)) -> plt.Figure:
        """Visualize a layout with colored tiles."""
        
        grid = np.array(layout_data['grid'])
        metadata = layout_data.get('metadata', {})
        rooms = layout_data.get('rooms', [])
        
        # Create figure
        fig, ax = plt.subplots(figsize=figsize)
        
        # Get colors for this scheme
        colors = self.color_schemes.get(color_scheme, self.color_schemes['default'])
        
        # Create color map
        unique_values = np.unique(grid)
        color_list = [colors.get(val, '#808080') for val in range(int(np.max(grid)) + 1)]
        cmap = mcolors.ListedColormap(color_list)
        
        # Display the grid
        im = ax.imshow(grid, cmap=cmap, vmin=0, vmax=len(color_list)-1, origin='upper')
        
        # Add room information if available
        if rooms:
            for room in rooms:
                if 'center' in room:
                    center_x, center_y = room['center']
                    # Add room ID text
                    ax.text(center_x, center_y, str(room.get('id', '?')), 
                           ha='center', va='center', fontsize=8, fontweight='bold',
                           bbox=dict(boxstyle='circle,pad=0.3', facecolor='white', alpha=0.8))
                
                if 'bounds' in room:
                    bounds = room['bounds']
                    width = bounds['max_x'] - bounds['min_x']
                    height = bounds['max_y'] - bounds['min_y']
                    rect = Rectangle((bounds['min_x']-0.5, bounds['min_y']-0.5), 
                                   width, height, linewidth=2, 
                                   edgecolor='red', facecolor='none', alpha=0.7)
                    ax.add_patch(rect)
        
        # Set title
        algorithm = metadata.get('algorithm', 'Unknown')
        title = f"Layout: {algorithm.replace('_', ' ').title()}"
        if 'width' in metadata and 'height' in metadata:
            title += f" ({metadata['width']}x{metadata['height']})"
        
        ax.set_title(title, fontsize=14, fontweight='bold')
        
        # Remove axis ticks for cleaner look
        ax.set_xticks([])
        ax.set_yticks([])
        
        # Add legend if requested
        if show_legend:
            legend_elements = []
            for val in unique_values:
                if val in colors:
                    legend_elements.append(
                        plt.Rectangle((0, 0), 1, 1, facecolor=colors[val], 
                                    label=self.tile_names.get(val, f'Type {val}'))
                    )
            
            if legend_elements:
                ax.legend(handles=legend_elements, bbox_to_anchor=(1.05, 1), 
                         loc='upper left', borderaxespad=0)
        
        plt.tight_layout()
        
        # Save if path provided
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Visualization saved to: {save_path}")
        
        return fig
    
    def create_comparison_grid(self, layout_results: Dict, color_scheme: str = 'default',
                              save_path: Optional[str] = None, 
                              figsize: Tuple[int, int] = (20, 15)) -> plt.Figure:
        """Create a comparison grid showing multiple layout methods."""
        
        valid_results = {k: v for k, v in layout_results.items() if 'error' not in v}
        num_layouts = len(valid_results)
        
        if num_layouts == 0:
            raise ValueError("No valid layouts to compare")
        
        # Calculate grid dimensions
        cols = min(3, num_layouts)
        rows = (num_layouts + cols - 1) // cols
        
        fig, axes = plt.subplots(rows, cols, figsize=figsize)
        if rows == 1 and cols == 1:
            axes = [axes]
        elif rows == 1 or cols == 1:
            axes = axes.flatten()
        else:
            axes = axes.flatten()
        
        colors = self.color_schemes.get(color_scheme, self.color_schemes['default'])
        
        for idx, (method_name, layout_data) in enumerate(valid_results.items()):
            if idx >= len(axes):
                break
                
            ax = axes[idx]
            grid = np.array(layout_data['grid'])
            
            # Create color map
            color_list = [colors.get(val, '#808080') for val in range(int(np.max(grid)) + 1)]
            cmap = mcolors.ListedColormap(color_list)
            
            # Display grid
            im = ax.imshow(grid, cmap=cmap, vmin=0, vmax=len(color_list)-1, origin='upper')
            
            # Add title
            ax.set_title(method_name.replace('_', ' ').title(), fontsize=12, fontweight='bold')
            ax.set_xticks([])
            ax.set_yticks([])
            
            # Add room count info
            rooms = layout_data.get('rooms', [])
            metadata = layout_data.get('metadata', {})
            info_text = f"{len(rooms)} rooms"
            if 'width' in metadata and 'height' in metadata:
                info_text += f"\n{metadata['width']}x{metadata['height']}"
            
            ax.text(0.02, 0.98, info_text, transform=ax.transAxes, 
                   verticalalignment='top', bbox=dict(boxstyle='round', 
                   facecolor='white', alpha=0.8), fontsize=9)
        
        # Hide unused subplots
        for idx in range(num_layouts, len(axes)):
            axes[idx].axis('off')
        
        plt.suptitle('Layout Generation Comparison', fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Comparison visualization saved to: {save_path}")
        
        return fig
    
    def create_detailed_view(self, layout_data: Dict, color_scheme: str = 'default',
                           save_path: Optional[str] = None, 
                           figsize: Tuple[int, int] = (15, 12)) -> plt.Figure:
        """Create a detailed view with grid coordinates and room analysis."""
        
        grid = np.array(layout_data['grid'])
        metadata = layout_data.get('metadata', {})
        rooms = layout_data.get('rooms', [])
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=figsize, gridspec_kw={'width_ratios': [3, 1]})
        
        colors = self.color_schemes.get(color_scheme, self.color_schemes['default'])
        
        # Main grid visualization
        color_list = [colors.get(val, '#808080') for val in range(int(np.max(grid)) + 1)]
        cmap = mcolors.ListedColormap(color_list)
        
        im = ax1.imshow(grid, cmap=cmap, vmin=0, vmax=len(color_list)-1, origin='upper')
        
        # Add grid lines for easier reading
        if grid.shape[0] <= 50 and grid.shape[1] <= 50:
            ax1.set_xticks(np.arange(-0.5, grid.shape[1], 5), minor=True)
            ax1.set_yticks(np.arange(-0.5, grid.shape[0], 5), minor=True)
            ax1.grid(which='minor', color='gray', linestyle='-', linewidth=0.5, alpha=0.3)
        
        # Add room information
        if rooms:
            for room in rooms:
                if 'center' in room:
                    center_x, center_y = room['center']
                    ax1.text(center_x, center_y, str(room.get('id', '?')), 
                            ha='center', va='center', fontsize=10, fontweight='bold',
                            bbox=dict(boxstyle='circle,pad=0.3', facecolor='white', alpha=0.9))
        
        algorithm = metadata.get('algorithm', 'Unknown')
        ax1.set_title(f"Layout: {algorithm.replace('_', ' ').title()}", 
                     fontsize=14, fontweight='bold')
        
        # Statistics panel
        ax2.axis('off')
        
        # Calculate statistics
        unique_vals, counts = np.unique(grid, return_counts=True)
        total_tiles = grid.size
        
        stats_text = f"Layout Statistics\n{'-'*20}\n"
        stats_text += f"Size: {grid.shape[1]}x{grid.shape[0]}\n"
        stats_text += f"Total tiles: {total_tiles}\n"
        stats_text += f"Rooms found: {len(rooms)}\n\n"
        
        stats_text += "Tile Distribution:\n"
        for val, count in zip(unique_vals, counts):
            percentage = (count / total_tiles) * 100
            tile_name = self.tile_names.get(val, f'Type {val}')
            stats_text += f"{tile_name}: {count} ({percentage:.1f}%)\n"
        
        if rooms:
            stats_text += f"\nRoom Details:\n"
            for room in rooms[:10]:  # Show first 10 rooms
                room_type = room.get('type', 'Unknown')
                room_id = room.get('id', '?')
                area = room.get('area', 'N/A')
                stats_text += f"Room {room_id}: {room_type}"
                if area != 'N/A':
                    stats_text += f" (area: {area})"
                stats_text += "\n"
            
            if len(rooms) > 10:
                stats_text += f"... and {len(rooms) - 10} more rooms\n"
        
        ax2.text(0.05, 0.95, stats_text, transform=ax2.transAxes, 
                verticalalignment='top', fontsize=10, fontfamily='monospace',
                bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.8))
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Detailed visualization saved to: {save_path}")
        
        return fig
    
    def save_all_visualizations(self, layout_data: Dict, base_filename: str, 
                               output_dir: str = "output/visualizations") -> List[str]:
        """Save multiple visualization types for a layout."""
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        saved_files = []
        
        # Basic visualization
        basic_path = output_path / f"{base_filename}_basic.png"
        fig1 = self.visualize_layout(layout_data, save_path=str(basic_path))
        plt.close(fig1)
        saved_files.append(str(basic_path))
        
        # Detailed view
        detailed_path = output_path / f"{base_filename}_detailed.png"
        fig2 = self.create_detailed_view(layout_data, save_path=str(detailed_path))
        plt.close(fig2)
        saved_files.append(str(detailed_path))
        
        return saved_files 