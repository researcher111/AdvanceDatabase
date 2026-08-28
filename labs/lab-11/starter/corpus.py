"""Lab 11: the corpus. Provided complete.

4,000 real arXiv abstracts (cs.DB, cs.IR, cs.LG, stat.ML, cs.DC; 800 each),
the same papers Lab 9 embedded. DOCS is a list of (arxiv_id, title, abstract)
tuples in a fixed order, loaded from data/arxiv_4000.jsonl.gz.

About 700,000 words: enough that a word count is real work for one process
and a natural thing to spread across many.
"""

import gzip
import json
import os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "arxiv_4000.jsonl.gz")


def _load() -> list[tuple[str, str, str]]:
    with gzip.open(DATA, "rt") as f:
        return [(d["id"], d["title"], d["abstract"]) for d in map(json.loads, f)]


DOCS: list[tuple[str, str, str]] = _load()
