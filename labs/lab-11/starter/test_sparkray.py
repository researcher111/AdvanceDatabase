"""Lab 11 test harness — run:  python3 test_sparkray.py

Three groups, one per part:

    OFFLINE — Part A's micro-mapreduce, pure stdlib, always runs
    SPARK   — Part B, runs only if pyspark + Java are installed
    RAY     — Part C, runs only if ray is installed

Skipped groups print [SKIP] and don't count toward the total, so the
score is N/M over the tests your machine can run. The Gradescope
autograder runs the OFFLINE group, which is the whole grade; Parts B and C
are for class discussion (see the lab page).
"""

import re
import sys
import traceback
from collections import Counter

from corpus import DOCS
from mapreduce import (map_words, partition_for, records, reduce_counts,
                       run_mapreduce, shuffle)

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


def skip(group, why):
    print(f"  [SKIP] {group}: {why}")


def expect(cond, why):
    if not cond:
        raise AssertionError(why)


def true_counts():
    """The obviously-right reference: one Counter, no phases."""
    c = Counter()
    for _, text in records():
        c.update(re.findall(r"[a-z]+", text.lower()))
    return c


# ---------------- OFFLINE group (Part A) ----------------

def test_map_contract():
    pairs = map_words("wal", "The log, the log, THE LOG!")
    expect(pairs == [("the", 1), ("log", 1), ("the", 1), ("log", 1),
                     ("the", 1), ("log", 1)],
           f"map emits one (word, 1) per occurrence, in order — no counting "
           f"in map; got {pairs}")


def test_partition_deterministic_and_in_range():
    for word in ("wal", "buffer", "tree", "shuffle", "a"):
        p1, p2 = partition_for(word, 4), partition_for(word, 4)
        expect(p1 == p2, f"same key must always route the same way "
                         f"({word!r}: {p1} then {p2})")
        expect(0 <= p1 < 4, f"partition must be in [0, 4), got {p1}")


def test_shuffle_loses_nothing():
    pairs = [("a", 1), ("b", 1), ("a", 1), ("c", 1), ("b", 1), ("a", 1)]
    parts = shuffle(pairs, 3)
    expect(len(parts) == 3, f"asked for 3 partitions, got {len(parts)}")
    total = sum(len(vals) for p in parts for vals in p.values())
    expect(total == 6, f"every pair lands in exactly one partition "
                       f"(6 in, {total} out)")
    a_vals = [p["a"] for p in parts if "a" in p]
    expect(a_vals == [[1, 1, 1]],
           f"all of a key's values must be grouped in ONE partition, "
           f"got {a_vals}")


def test_shuffle_routes_by_hash():
    pairs = [(w, 1) for w in ("wal", "buffer", "tree", "wal", "probe")]
    parts = shuffle(pairs, 4)
    for i, part in enumerate(parts):
        for key in part:
            expect(partition_for(key, 4) == i,
                   f"key {key!r} sits in partition {i} but hashes to "
                   f"{partition_for(key, 4)} — shuffle must route BY "
                   f"partition_for, not round-robin")


def test_reduce():
    expect(reduce_counts("wal", [1, 1, 1]) == ("wal", 3),
           "reduce collapses ('wal', [1,1,1]) to ('wal', 3)")


def test_end_to_end():
    got = dict(run_mapreduce(records(), map_words, reduce_counts))
    want = true_counts()
    expect(len(got) == len(want),
           f"distinct words: got {len(got)}, expected {len(want)}")
    for word in ("the", "index", "database", "log"):
        expect(got.get(word) == want[word],
               f"count for {word!r}: got {got.get(word)}, "
               f"expected {want[word]}")


def test_partition_count_does_not_change_answer():
    base = sorted(run_mapreduce(records(), map_words, reduce_counts, 1))
    for n in (2, 7):
        other = sorted(run_mapreduce(records(), map_words, reduce_counts, n))
        expect(other == base,
               f"the answer must not depend on partition count "
               f"(n={n} differs from n=1) — grouping is broken")


# ---------------- SPARK group (Part B) ----------------

def spark_tests():
    try:
        from pyspark import SparkContext
    except ImportError:
        skip("SPARK", "pyspark not installed — Part B tested by running "
                      "spark_wordcount.py yourself")
        return
    from spark_wordcount import word_counts
    sc = SparkContext("local[2]", "lab11-tests")
    sc.setLogLevel("ERROR")
    try:
        def test_spark_matches_reference():
            lines = sc.parallelize(
                [t + " " + x for _, t, x in DOCS], numSlices=4)
            got = dict(word_counts(sc, lines).collect())
            want = true_counts()
            expect(got == dict(want),
                   f"Spark's counts must equal the reference "
                   f"({len(got)} words vs {len(want)})")
        check("SPARK", "word_counts matches the reference", test_spark_matches_reference)
    finally:
        sc.stop()


# ---------------- RAY group (Part C) ----------------

def ray_tests():
    try:
        import ray
    except ImportError:
        skip("RAY", "ray not installed — Part C tested by running "
                    "ray_speedup.py yourself")
        return
    import time
    import logging
    from ray_speedup import embed_all_parallel, embed_all_serial
    ray.init(num_cpus=4, include_dashboard=False,
             logging_level=logging.ERROR, log_to_driver=False)
    try:
        texts = [t + " " + x for _, t, x in DOCS[:12]]

        def test_ray_identical():
            expect(embed_all_parallel(texts) == embed_all_serial(texts),
                   "parallel results must equal serial exactly "
                   "(same order — ray.get preserves it)")
        check("RAY", "parallel results identical to serial", test_ray_identical)

        def test_ray_actually_parallel():
            t0 = time.perf_counter()
            embed_all_serial(texts)
            t_serial = time.perf_counter() - t0
            t0 = time.perf_counter()
            embed_all_parallel(texts)
            t_parallel = time.perf_counter() - t0
            expect(t_parallel < t_serial / 1.5,
                   f"parallel should beat serial by 1.5x+ on 4 CPUs "
                   f"({t_serial:.2f}s vs {t_parallel:.2f}s) — is ray.get "
                   f"inside your launch loop?")
        check("RAY", "launch-all-then-wait beats serial", test_ray_actually_parallel)
    finally:
        ray.shutdown()


if __name__ == "__main__":
    print("OFFLINE group (Part A)")
    check("OFFLINE", "map emits raw (word, 1) pairs",          test_map_contract)
    check("OFFLINE", "partitioning is deterministic, in range", test_partition_deterministic_and_in_range)
    check("OFFLINE", "shuffle loses nothing, groups keys",      test_shuffle_loses_nothing)
    check("OFFLINE", "shuffle routes by partition_for",         test_shuffle_routes_by_hash)
    check("OFFLINE", "reduce collapses values",                 test_reduce)
    check("OFFLINE", "end-to-end counts match the reference",   test_end_to_end)
    check("OFFLINE", "answer independent of partition count",   test_partition_count_does_not_change_answer)
    print("SPARK group (Part B)")
    spark_tests()
    print("RAY group (Part C)")
    ray_tests()
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)
