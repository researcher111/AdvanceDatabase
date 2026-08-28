"""Lab 11: Lab 9's real vectors, for Part C. Provided.

load() -> 4,000 unit vectors (64-d MiniLM embeddings of DOCS, same order).
"""

import math
import os
import struct

DIM = 64
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "arxiv_4000.f16")


def load() -> list[list[float]]:
    raw = open(DATA, "rb").read()
    n = len(raw) // (2 * DIM)
    flat = struct.unpack(f"<{n * DIM}e", raw)
    out = []
    for i in range(n):
        v = flat[i * DIM:(i + 1) * DIM]
        norm = math.sqrt(sum(x * x for x in v)) or 1.0
        out.append([x / norm for x in v])
    return out
