"""Part B — the same word count, in Spark. Requires pyspark + Java:

    pip install pyspark        (and a JDK; `java -version` must work)
    python3 spark_wordcount.py

Spark is Part A's pattern sold as a product: your map is flatMap, your
shuffle is what reduceByKey triggers, your reduce is its merge function.
The one genuinely new idea is LAZINESS - transformations build a plan (a
DAG) and nothing runs until an action (collect, count) forces it. The
same idea as microdb's Scan tree: build the plan, then pull.
"""

from __future__ import annotations

import re

from corpus import DOCS


def word_counts(sc, lines):
    """lines is an RDD of text strings. Return an RDD of (word, count).

    ---------------- YOUR JOB ----------------
    Three transformations, mirroring Part A phase for phase:

        .flatMap(...)      one text -> many words          (your map_words)
        .map(...)          word -> (word, 1)
        .reduceByKey(...)  add counts per word             (your reduce_counts
                                                            - and the shuffle
                                                            happens HERE)

    Tokenize identically to Part A: re.findall(r"[a-z]+", text.lower()).
    Return the final RDD - no collect() in here; stay lazy."""
    # TODO
    raise NotImplementedError


def main():
    from pyspark import SparkContext
    sc = SparkContext("local[*]", "microdb-wordcount")
    sc.setLogLevel("ERROR")

    lines = sc.parallelize([title + " " + text for _, title, text in DOCS],
                           numSlices=4)
    counts = word_counts(sc, lines)

    # Nothing has computed yet. This prints the PLAN - find the shuffle:
    # the blank line in the middle separates the two stages, and data
    # crosses the network exactly there.
    print("=== the DAG (read bottom-up; the stage break is the shuffle) ===")
    print(counts.toDebugString().decode())

    print("\n=== top 15 (collect() finally runs the plan) ===")
    for word, n in sorted(counts.collect(), key=lambda t: (-t[1], t[0]))[:15]:
        print(f"{n:4}  {word}")
    sc.stop()


if __name__ == "__main__":
    main()
