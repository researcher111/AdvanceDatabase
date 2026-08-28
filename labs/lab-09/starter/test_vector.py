"""Lab 9 test harness — run:  python3 test_vector.py

Three groups, mirroring the lab page:

    EXACT — brute force finds the true neighbors (checked against a
            slow-but-obviously-right reference)
    IVF   — build assigns every vector once; probing works
    QUALITY — recall@10 clears the bar at probe 4, and comparisons
              actually drop vs brute force (the whole point)

Pure stdlib. The Gradescope autograder runs this same harness.
"""

import os
import sys
import traceback

from microvector import (BruteForceIndex, IVFIndex, dot, normalize,
                         recall_at_k)
import gen_embeddings

RESULTS = []


def check(group, name, fn):
    try:
        fn()
        RESULTS.append(True)
        print(f"  [PASS] {group}: {name}")
    except Exception as e:
        RESULTS.append(False)
        if isinstance(e, NotImplementedError):
            print(f"  [FAIL] {group}: {name} — not implemented yet")
        else:
            print(f"  [FAIL] {group}: {name} — {type(e).__name__}: {e}")
            if "-v" in sys.argv:
                traceback.print_exc()


def expect(cond, why):
    if not cond:
        raise AssertionError(why)


if not os.path.exists("data/embeddings.txt"):
    print("data/ missing — generating it first (gen_embeddings.py)...")
    gen_embeddings.main()
VECTORS = gen_embeddings.load()
QUERIES = gen_embeddings.queries(VECTORS, n=10)   # 10 real questions, embedded like the docs


def slow_truth(query, k):
    scored = sorted(((dot(query, v), i) for i, v in enumerate(VECTORS)),
                    key=lambda t: (-t[0], t[1]))
    return scored[:k]


# ---------------- EXACT group ----------------

def test_brute_force_matches_truth():
    idx = BruteForceIndex(VECTORS)
    for q in QUERIES[:3]:
        got = idx.search(q, 10)
        want = slow_truth(q, 10)
        expect([i for _, i in got] == [i for _, i in want],
               f"top-10 ids differ from the obviously-right reference: "
               f"{[i for _, i in got][:5]} vs {[i for _, i in want][:5]}")


def test_brute_force_counts():
    idx = BruteForceIndex(VECTORS)
    idx.search(QUERIES[0], 5)
    expect(idx.comparisons == len(VECTORS),
           f"one exact search must compare against all {len(VECTORS)} vectors, "
           f"counted {idx.comparisons}")


def test_self_is_nearest():
    idx = BruteForceIndex(VECTORS)
    sims = idx.search(VECTORS[123], 1)
    expect(sims[0][1] == 123, "a vector's nearest neighbor is itself")
    expect(abs(sims[0][0] - 1.0) < 1e-6, "…with similarity 1.0 (unit vectors)")


# ---------------- IVF group ----------------

def test_build_assigns_everything_once():
    idx = IVFIndex(VECTORS, n_clusters=20)
    assigned = sorted(i for lst in idx.lists for i in lst)
    expect(assigned == list(range(len(VECTORS))),
           f"every vector id must appear in exactly one list "
           f"(got {len(assigned)} assignments)")


def test_probe_more_finds_more():
    idx = IVFIndex(VECTORS, n_clusters=20)
    q = QUERIES[1]
    exact = slow_truth(q, 10)
    r1 = recall_at_k(idx.search(q, 10, probe=1), exact, 10)
    r8 = recall_at_k(idx.search(q, 10, probe=8), exact, 10)
    expect(r8 >= r1, f"probing more lists must not lower recall ({r1} -> {r8})")
    expect(r8 >= 0.8, f"probe=8 of 20 lists should find most of the truth, recall {r8}")


# ---------------- QUALITY group ----------------

def test_recall_bar():
    idx = IVFIndex(VECTORS, n_clusters=20)
    total = 0.0
    for q in QUERIES:
        total += recall_at_k(idx.search(q, 10, probe=4), slow_truth(q, 10), 10)
    avg = total / len(QUERIES)
    expect(avg >= 0.75,
           f"average recall@10 at probe=4 should clear 0.75 on this data, got {avg:.2f}")


def test_comparisons_drop():
    bf = BruteForceIndex(VECTORS)
    bf.search(QUERIES[0], 10)
    ivf = IVFIndex(VECTORS, n_clusters=20)
    ivf.comparisons = 0
    ivf.search(QUERIES[0], 10, probe=4)
    expect(ivf.comparisons < bf.comparisons / 2,
           f"IVF at probe=4 must do less than half the work "
           f"({ivf.comparisons} vs {bf.comparisons}) — are you searching "
           f"only the probed lists?")


if __name__ == "__main__":
    print("EXACT group")
    check("EXACT", "brute force matches the reference",       test_brute_force_matches_truth)
    check("EXACT", "one search compares against everything",  test_brute_force_counts)
    check("EXACT", "a vector's nearest neighbor is itself",   test_self_is_nearest)
    print("IVF group")
    check("IVF", "build assigns every vector exactly once",   test_build_assigns_everything_once)
    check("IVF", "probing more lists never hurts recall",     test_probe_more_finds_more)
    print("QUALITY group")
    check("QUALITY", "recall@10 >= 0.75 at probe 4",          test_recall_bar)
    check("QUALITY", "comparisons drop by more than half",    test_comparisons_drop)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)
