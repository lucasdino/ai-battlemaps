import numpy as np
import random
from collections import defaultdict, Counter

class WaveFunctionCollapse:
    def __init__(self, pattern_size=3, output_size=(32, 32)):
        self.pattern_size = pattern_size
        self.output_size = output_size

    def _extract_patterns(self, sample):
        """Extract all unique patterns of size pattern_size x pattern_size from the sample."""
        patterns = []
        h, w = sample.shape
        for i in range(h - self.pattern_size + 1):
            for j in range(w - self.pattern_size + 1):
                pattern = sample[i:i+self.pattern_size, j:j+self.pattern_size]
                patterns.append(tuple(pattern.flatten()))
        return patterns

    def _build_adjacency_rules(self, patterns):
        """Build adjacency rules for patterns (only 4 directions: up, down, left, right)."""
        rules = defaultdict(set)
        for p1 in patterns:
            for p2 in patterns:
                # Right adjacency
                if all(p1[self.pattern_size-1 + k*self.pattern_size] == p2[k*self.pattern_size] for k in range(self.pattern_size)):
                    rules[(p1, 'right')].add(p2)
                # Down adjacency
                if all(p1[-self.pattern_size + k] == p2[k] for k in range(self.pattern_size)):
                    rules[(p1, 'down')].add(p2)
        return rules

    def run(self, sample):
        """Generate a new tilemap using WFC based on the sample."""
        patterns = self._extract_patterns(sample)
        pattern_counts = Counter(patterns)
        unique_patterns = list(pattern_counts.keys())
        pattern_indices = {p: i for i, p in enumerate(unique_patterns)}
        adjacency = self._build_adjacency_rules(unique_patterns)

        H, W = self.output_size
        output = np.full((H, W), -1, dtype=int)
        possible = [[set(range(len(unique_patterns))) for _ in range(W)] for _ in range(H)]

        def observe():
            min_choices = float('inf')
            min_pos = None
            for i in range(H):
                for j in range(W):
                    if output[i, j] == -1 and 1 < len(possible[i][j]) < min_choices:
                        min_choices = len(possible[i][j])
                        min_pos = (i, j)
            return min_pos

        def propagate(i, j):
            stack = [(i, j)]
            while stack:
                ci, cj = stack.pop()
                for direction, (di, dj) in [('right', (0, 1)), ('down', (1, 0)), ('left', (0, -1)), ('up', (-1, 0))]:
                    ni, nj = ci + di, cj + dj
                    if 0 <= ni < H and 0 <= nj < W and output[ni, nj] == -1:
                        before = possible[ni][nj].copy()
                        new_possible = set()
                        for p2 in possible[ni][nj]:
                            for p1 in possible[ci][cj]:
                                if (unique_patterns[p1], direction) in adjacency and unique_patterns[p2] in adjacency[(unique_patterns[p1], direction)]:
                                    new_possible.add(p2)
                        if new_possible and new_possible != before:
                            possible[ni][nj] = new_possible
                            stack.append((ni, nj))

        # Main WFC loop
        while True:
            pos = observe()
            if pos is None:
                break  # All cells collapsed
            i, j = pos
            choices = list(possible[i][j])
            weights = [pattern_counts[unique_patterns[c]] for c in choices]
            chosen = random.choices(choices, weights=weights)[0]
            output[i, j] = chosen
            possible[i][j] = {chosen}
            propagate(i, j)

        # Convert pattern indices to tile values (use the center of each pattern)
        tilemap = np.zeros((H, W), dtype=sample.dtype)
        center = self.pattern_size // 2
        for i in range(H):
            for j in range(W):
                if output[i, j] != -1:
                    pattern = unique_patterns[output[i, j]]
                    pattern_arr = np.array(pattern).reshape((self.pattern_size, self.pattern_size))
                    tilemap[i, j] = pattern_arr[center, center]
                else:
                    tilemap[i, j] = 0  # fallback
        return tilemap 