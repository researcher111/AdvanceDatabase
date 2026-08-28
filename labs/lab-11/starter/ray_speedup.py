"""Part C: parallelize a real job with Ray. Requires:

    pip install ray
    python3 ray_speedup.py

The job: build the k-nearest-neighbor graph of the arXiv corpus. For each
abstract, find the 10 abstracts closest to it in Lab 9's embedding space by
brute force over all 4,000 vectors. One document costs about 4,000 x 64
multiply-adds in pure Python, roughly 25 ms; 200 documents cost 5 seconds
serially. Every document's search is independent of every other's, which is
the shape Ray is built for: decorate the function, call it with .remote(),
and the calls spread across your CPU cores. Same function, same results,
wall clock divided.

This is the "Going further" of Lab 9 (a k-NN graph is the bottom layer of
HNSW) done for real, and the same shape as embedding a corpus, scoring a
model over folds, or running one hyperparameter setting per core.
"""

from __future__ import annotations

import time

import embeddings

VECTORS = embeddings.load()          # 4,000 x 64, unit length
K = 10
N_DOCS = 200                         # how many documents to process in the demo


def neighbors(doc: int) -> list[int]:
    """The 10 nearest neighbors of document `doc`, by cosine, excluding itself.
    Provided: Part C is about the plumbing, not the math."""
    q = VECTORS[doc]
    scored = []
    for i, v in enumerate(VECTORS):
        if i != doc:
            scored.append((sum(a * b for a, b in zip(q, v)), i))
    scored.sort(reverse=True)
    return [i for _, i in scored[:K]]


def knn_all_serial(docs: list[int]) -> list[list[int]]:
    """The baseline: one after another. Provided."""
    return [neighbors(d) for d in docs]


# ---------------- YOUR JOB ----------------
# 1. Write knn_remote: the same neighbors(), but a Ray task. The whole
#    change is the decorator:
#
#        @ray.remote
#        def knn_remote(doc):
#            return neighbors(doc)
#
# 2. Write knn_all_parallel: launch ALL tasks first, then wait.
#
#        futures = [knn_remote.remote(d) for d in docs]   # returns instantly
#        return ray.get(futures)                          # waits for all
#
#    The classic mistake is ray.get() inside the loop: that waits for each
#    task before launching the next, which is serial with extra steps. The
#    tests time you, so it matters.
#
#    Note what Ray ships to each worker: the function, its argument, and
#    (once per worker, not once per task) the VECTORS list it closes over.

import ray  # noqa: E402  (import placed here so Part A/B never need it)


def knn_all_parallel(docs: list[int]) -> list[list[int]]:
    """All documents at once across your cores. Results must equal the
    serial version's exactly (same order, same neighbors)."""
    # TODO (define knn_remote above this function, then launch + gather)
    raise NotImplementedError


if __name__ == "__main__":
    from corpus import DOCS
    ray.init(num_cpus=None, include_dashboard=False,
             logging_level="error", log_to_driver=False)
    docs = list(range(N_DOCS))

    t0 = time.perf_counter()
    serial = knn_all_serial(docs)
    t_serial = time.perf_counter() - t0

    t0 = time.perf_counter()
    parallel = knn_all_parallel(docs)
    t_parallel = time.perf_counter() - t0

    same = serial == parallel
    print(f"{len(docs)} documents, 10 nearest neighbors each, brute force over {len(VECTORS):,} vectors")
    print(f"serial:    {t_serial:6.2f} s")
    print(f"parallel:  {t_parallel:6.2f} s     speedup: {t_serial / t_parallel:.1f}x")
    print(f"identical results: {same}")
    d = docs[0]
    print(f"\nneighbors of [{DOCS[d][1][:60]}]:")
    for n in serial[0][:3]:
        print(f"   {DOCS[n][1][:70]}")
    ray.shutdown()
