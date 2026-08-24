"""Lab 10 test harness — run:  python3 test_rag.py

Three groups, mirroring the lab page:

    RETRIEVE — the Retriever indexes every chunk and returns sane top-k
    QUALITY  — hit@3 and MRR over the 12-question eval set clear the bar
    PROMPT   — build_prompt emits the exact format the grader (and an
               LLM) can parse, and answer() wires it all together

Pure stdlib, fully offline. The Gradescope autograder runs this same harness.
"""

import sys
import traceback

from corpus import EVAL
from micro_rag import Retriever, answer, build_prompt, chunk_corpus

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


CHUNKS = chunk_corpus()


def eval_scores(retriever):
    """(hit@3, MRR) over the eval set: hit@3 counts questions whose top-3
    includes a relevant doc; MRR averages 1/rank of the first relevant."""
    hits, rr_total = 0, 0.0
    for question, relevant in EVAL:
        docs = [c["doc"] for c in retriever.retrieve(question, k=3)]
        ranks = [r for r, d in enumerate(docs, start=1) if d in relevant]
        if ranks:
            hits += 1
            rr_total += 1.0 / ranks[0]
    return hits / len(EVAL), rr_total / len(EVAL)


# ---------------- RETRIEVE group ----------------

def test_own_text_comes_back_first():
    r = Retriever(CHUNKS)
    for chunk in (CHUNKS[0], CHUNKS[7], CHUNKS[-1]):
        top = r.retrieve(chunk["text"], k=1)[0]
        expect(top["text"] == chunk["text"],
               f"querying with a chunk's own text must return that chunk "
               f"first (asked for {chunk['doc']!r}, got {top['doc']!r})")
        expect(abs(top["score"] - 1.0) < 1e-6,
               f"…with score 1.0 (unit vectors), got {top['score']:.4f}")


def test_result_shape():
    r = Retriever(CHUNKS)
    got = r.retrieve("how does the write-ahead log work?", k=3)
    expect(len(got) == 3, f"k=3 must return 3 results, got {len(got)}")
    for hit in got:
        expect(set(hit) >= {"doc", "title", "text", "score"},
               f"each result needs doc/title/text/score keys, got {sorted(hit)}")
    scores = [h["score"] for h in got]
    expect(scores == sorted(scores, reverse=True),
           f"results must be best-first, got scores {scores}")


def test_originals_not_mutated():
    r = Retriever(CHUNKS)
    r.retrieve("anything at all", k=3)
    expect(all("score" not in c for c in r.chunks),
           "retrieve() must attach scores to COPIES, not to the "
           "stored chunk dicts (dict(chunk) makes a copy)")


# ---------------- QUALITY group ----------------

def test_hit_at_3():
    hit3, _ = eval_scores(Retriever(CHUNKS))
    expect(hit3 >= 0.9,
           f"hit@3 on the eval set should reach 0.90, got {hit3:.2f} — "
           f"is the index aligned with self.chunks order?")


def test_mrr():
    _, mrr = eval_scores(Retriever(CHUNKS))
    expect(mrr >= 0.7,
           f"MRR should reach 0.70 (relevant docs mostly near rank 1), "
           f"got {mrr:.2f}")


# ---------------- PROMPT group ----------------

def test_prompt_format():
    r = Retriever(CHUNKS)
    question = "what makes a commit durable?"
    retrieved = r.retrieve(question, k=3)
    prompt = build_prompt(question, retrieved)
    parts = prompt.split("\n\n")
    expect(len(parts) == 3,
           f"prompt must be 3 blank-line-separated sections "
           f"(header / sources / question), got {len(parts)}")
    expect(parts[0] == "Answer using ONLY the sources below. Cite as [doc_id].",
           f"header line is off: {parts[0]!r}")
    source_lines = parts[1].split("\n")
    expect(len(source_lines) == 3, f"one line per chunk, got {len(source_lines)}")
    for line, chunk in zip(source_lines, retrieved):
        want = f"[{chunk['doc']}] {chunk['title']}: {chunk['text']}"
        expect(line == want,
               f"source line format is off:\n  got  {line[:70]!r}\n"
               f"  want {want[:70]!r}")
    expect(parts[2] == f"Question: {question}",
           f"last section must be 'Question: …', got {parts[2]!r}")


def test_answer_echo_mode():
    r = Retriever(CHUNKS)
    text = answer("Why is recovery safe to run twice after a crash?", r)
    expect("echo mode" in text,
           "without LLM_* env vars, answer() should note it ran in echo mode")
    expect("[recovery]" in text,
           "the recovery doc should be retrieved and cited for this question")


if __name__ == "__main__":
    print("RETRIEVE group")
    check("RETRIEVE", "a chunk's own text comes back first",  test_own_text_comes_back_first)
    check("RETRIEVE", "top-k results have the right shape",   test_result_shape)
    check("RETRIEVE", "stored chunks are never mutated",      test_originals_not_mutated)
    print("QUALITY group")
    check("QUALITY", "hit@3 >= 0.90 on the eval set",         test_hit_at_3)
    check("QUALITY", "MRR >= 0.70 on the eval set",           test_mrr)
    print("PROMPT group")
    check("PROMPT", "build_prompt emits the exact format",    test_prompt_format)
    check("PROMPT", "answer() cites sources in echo mode",    test_answer_echo_mode)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)
