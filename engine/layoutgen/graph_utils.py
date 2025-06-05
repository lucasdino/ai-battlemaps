import networkx as nx
import random
import math

class GraphBuilder:
    @staticmethod
    def create_graph(graph_type: str, num_rooms: int) -> nx.Graph:
        if graph_type == "linear":
            return nx.path_graph(num_rooms)
        elif graph_type == "tree":
            return GraphBuilder._create_tree(num_rooms)
        elif graph_type == "mesh":
            return GraphBuilder._create_mesh(num_rooms)
        else:
            raise ValueError(f"Unknown graph type: {graph_type}")
    
    @staticmethod
    def _create_tree(num_rooms: int) -> nx.Graph:
        graph = nx.Graph()
        graph.add_nodes_from(range(num_rooms))
        for i in range(1, num_rooms):
            parent = random.randint(0, i - 1)
            graph.add_edge(i, parent)
        return graph
    
    @staticmethod
    def _create_mesh(num_rooms: int) -> nx.Graph:
        rows = int(math.sqrt(num_rooms))
        cols = (num_rooms + rows - 1) // rows
        temp_graph = nx.grid_2d_graph(rows, cols)
        graph = nx.Graph()
        mapping = {node: i for i, node in enumerate(temp_graph.nodes())}
        return nx.relabel_nodes(temp_graph, mapping) 