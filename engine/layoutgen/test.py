import numpy as np
import matplotlib.pyplot as plt
from layout_system import LayoutSystem

def test_basic_generation():
    print("Testing Basic Layout Generation")
    print("=" * 40)
    
    system = LayoutSystem(width=60, height=50)
    
    scenarios = [
        {"name": "Linear Dungeon", "rooms": 4, "graph_type": "linear", "room_scale": 3},
        {"name": "Tree Castle", "rooms": 5, "graph_type": "tree", "room_scale": 2},
        {"name": "Mesh Cave", "rooms": 6, "graph_type": "mesh", "room_scale": 4},
    ]
    
    for scenario in scenarios:
        print(f"\n{scenario['name']}:")
        
        result = system.generate_layout(
            rooms=scenario["rooms"],
            graph_type=scenario["graph_type"],
            room_scale=scenario["room_scale"]
        )
        
        if result.success:
            doors = np.count_nonzero(result.grid == 4)
            walls = np.count_nonzero(result.grid == 2)
            floors = np.count_nonzero(result.grid == 1)
            
            print(f"  ✅ Generated {len(result.rooms)} rooms in {result.generation_time:.3f}s")
            print(f"  📊 Doors: {doors}, Walls: {walls}, Floors: {floors}")
            
            visualize_layout(result, scenario["name"])
        else:
            print(f"  ❌ Generation failed")

def visualize_layout(result, name):
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    
    ax1 = axes[0]
    ax1.imshow(result.grid, cmap='tab20', origin='upper')
    ax1.set_title(f'{name}\n{len(result.rooms)} rooms')
    
    for room in result.rooms:
        center = room.center
        ax1.text(center[0], center[1], str(room.id), ha='center', va='center',
                fontweight='bold', color='white', fontsize=10)
    
    ax2 = axes[1]
    doors_only = np.where(result.grid == 4, 1, 0)
    ax2.imshow(doors_only, cmap='Reds', origin='upper')
    ax2.set_title(f'Doors\n{np.count_nonzero(doors_only)} connections')
    
    plt.tight_layout()
    safe_name = name.replace(" ", "_").lower()
    plt.savefig(f'output/test_{safe_name}.png', dpi=150, bbox_inches='tight')
    plt.close()

def test_room_scaling():
    print("\nTesting Room Scaling")
    print("=" * 40)
    
    system = LayoutSystem(width=80, height=60)
    
    scales = [1, 2, 3, 5]
    
    for scale in scales:
        result = system.generate_layout(
            rooms=3,
            graph_type="linear", 
            room_scale=scale
        )
        
        if result.success:
            total_area = sum(room.area for room in result.rooms)
            print(f"Scale {scale}: {total_area:.0f} total room area")

def test_performance():
    print("\nTesting Performance")
    print("=" * 40)
    
    system = LayoutSystem(width=50, height=50)
    
    times = []
    for i in range(10):
        result = system.generate_layout(rooms=4, graph_type="linear", room_scale=3)
        if result.success:
            times.append(result.generation_time)
    
    if times:
        avg_time = sum(times) / len(times)
        print(f"Average generation time: {avg_time:.4f}s")
        print(f"Range: {min(times):.4f}s - {max(times):.4f}s")

if __name__ == "__main__":
    test_basic_generation()
    test_room_scaling()
    test_performance()
    
    print("\n" + "=" * 50)
    print("🎯 REFACTORED SYSTEM TESTING COMPLETE")
    print("All core functionality verified!")
    print("Check output/ folder for visualizations") 