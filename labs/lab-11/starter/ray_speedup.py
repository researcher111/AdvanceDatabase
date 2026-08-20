"""Part C — parallelize an embedding job with Ray. Requires:

    pip install ray
    python3 ray_speedup.py

The job: embed all 24 course documents with a deliberately slow embedder
(30 ms of simulated model latency per document - a stand-in for a real
sentence-transformer forward pass). Serial cost: 24 x 30 ms. Ray's offer:
decorate a function, call it with .remote(), and the calls spread across
your CPU cores. Same function, same results, wall clock divided.
"""

from __future__ import annotations

import hashlib
import math
import re
import time

from corpus import DOCS

SIMULATED_MODEL_MS = 30
DIM = 64


def embed(text: str) -> list[float]:
    """Lab 10's hashed bag-of-words, plus simulated model latency.
    Provided - Part C is about the plumbing, not the math."""
    time.sleep(SIMULATED_MODEL_MS / 1000)
    counts: dict[str, int] = {}
    for word in re.findall(r"[a-z]+", text.lower()):
        counts[word] = counts.get(word, 0) + 1
    v = [0.0] * DIM
    for word, count in counts.items():
        dim = int(hashlib.md5(word.encode()).hexdigest(), 16) % DIM
        v[dim] += 1.0 / (1.0 + math.log(count))
    norm = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / norm for x in v]


def embed_all_serial(texts: list[str]) -> list[list[float]]:
    """The baseline: one after another. Provided."""
    return [embed(t) for t in texts]


# ---------------- YOUR JOB ----------------
# 1. Write embed_remote: the same embed(), but a Ray task. The whole
#    change is the decorator:
#
#        @ray.remote
#        def embed_remote(text):
#            return embed(text)
#
# 2. Write embed_all_parallel: launch ALL tasks first, then wait.
#
#        futures = [embed_remote.remote(t) for t in texts]   # returns instantly
#        return ray.get(futures)                             # waits for all
#
#    The classic mistake is ray.get() inside the loop - that waits for
#    each task before launching the next, which is serial with extra
#    steps. The tests time you, so it matters.

import ray  # noqa: E402  (import placed here so Part A/B never need it)


def embed_all_parallel(texts: list[str]) -> list[list[float]]:
    """All documents at once across your cores. Results must equal the
    serial version's exactly (same order, same numbers)."""
    # TODO (define embed_remote above this function, then launch + gather)
    raise NotImplementedError


if __name__ == "__main__":
    ray.init(num_cpus=None, include_dashboard=False,
             logging_level="error", log_to_driver=False)
    texts = [title + " " + text for _, title, text in DOCS]

    t0 = time.perf_counter()
    serial = embed_all_serial(texts)
    t_serial = time.perf_counter() - t0

    t0 = time.perf_counter()
    parallel = embed_all_parallel(texts)
    t_parallel = time.perf_counter() - t0

    same = serial == parallel
    print(f"{len(texts)} documents, {SIMULATED_MODEL_MS} ms simulated model latency each")
    print(f"serial:    {t_serial:6.2f} s")
    print(f"parallel:  {t_parallel:6.2f} s     speedup: {t_serial / t_parallel:.1f}x")
    print(f"identical results: {same}")
    ray.shutdown()
