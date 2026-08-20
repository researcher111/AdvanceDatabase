"""Lab 9 — generate the embedding dataset. Run once:  python3 gen_embeddings.py

Writes data/embeddings.txt: 4,000 unit vectors, 32 dimensions, drawn from
25 gaussian clusters (like real sentence embeddings, which clump by topic).
Seeded — everyone's vectors are identical, so measured recalls match.

Format: one vector per line, comma-separated floats.
"""

import math
import os
import random

N, DIM, CLUSTERS, SEED = 4000, 32, 25, 6042
SIGMA = 0.85          # cluster spread: big enough that topics overlap (real embeddings do)


def main():
    rng = random.Random(SEED)
    centers = [[rng.gauss(0, 1) for _ in range(DIM)] for _ in range(CLUSTERS)]
    os.makedirs("data", exist_ok=True)
    with open("data/embeddings.txt", "w") as f:
        for i in range(N):
            c = centers[i % CLUSTERS]
            v = [c[d] + rng.gauss(0, SIGMA) for d in range(DIM)]
            norm = math.sqrt(sum(x * x for x in v)) or 1.0
            f.write(",".join(f"{x / norm:.6f}" for x in v) + "\n")
    print(f"wrote data/embeddings.txt — {N} vectors, {DIM} dims, {CLUSTERS} latent topics")


def queries(vectors, n=40, seed=SEED + 1):
    """Realistic queries: perturbed dataset vectors (near a stored vector,
    never identical to one) — seeded, shared by tests and measurement."""
    rng = random.Random(seed)
    out = []
    for j in range(n):
        v = vectors[(j * 97) % len(vectors)]
        q = [x + rng.gauss(0, 0.25) for x in v]
        norm = math.sqrt(sum(x * x for x in q)) or 1.0
        out.append([x / norm for x in q])
    return out


def load(path="data/embeddings.txt"):
    return [[float(x) for x in line.split(",")] for line in open(path)]


if __name__ == "__main__":
    main()
