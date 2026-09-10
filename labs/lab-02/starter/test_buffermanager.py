"""Lab 2 test harness — run:  python3 test_buffermanager.py

Build one function at a time:
    python3 test_buffermanager.py --list
    python3 test_buffermanager.py --unit Class.method
    python3 test_buffermanager.py --unit
Unit checks supply the other functions as test fixtures. The target always
runs your code. The default command still runs the full integration suite.


Three groups, mirroring the lab page:

    PIN    — pin/unpin protocol: contents, counting, hit/miss bookkeeping
    LRU    — eviction: victim choice, pinned frames protected, aborts
    DIRTY  — write-back: modified pages survive eviction and flush_all

Every test prints PASS or FAIL with a reason. The Gradescope autograder
runs this same harness. Pure stdlib; no pytest needed.
"""

import shutil
import sys
import tempfile
import traceback

from file_manager import BlockId, Page, FileManager
from buffer_manager import BufferManager, BufferAbortError

BLOCK_SIZE = 128
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


def fresh(num_buffers, n_blocks=8):
    """A temp FileManager with `n_blocks` appended blocks (block k stores
    int k at offset 0), plus a BufferManager over it."""
    d = tempfile.mkdtemp(prefix="microdb-l2-")
    fm = FileManager(d, BLOCK_SIZE)
    for k in range(n_blocks):
        blk = fm.append("t.tbl")
        p = Page(BLOCK_SIZE)
        p.set_int(0, k)
        fm.write(blk, p)
    return d, fm, BufferManager(fm, num_buffers)


def cleanup(d, fm):
    fm.close()
    shutil.rmtree(d, ignore_errors=True)


def access(bm, k):
    """Convenience: pin block k, then unpin it (one 'access')."""
    b = bm.pin(BlockId("t.tbl", k))
    bm.unpin(b)
    return b


# ---------------- PIN group ----------------

def test_pin_reads_block():
    d, fm, bm = fresh(3)
    try:
        buf = bm.pin(BlockId("t.tbl", 5))
        expect(buf.contents().get_int(0) == 5,
               "pinned buffer does not hold block 5's data — is pin() calling assign_to_block?")
        bm.unpin(buf)
    finally:
        cleanup(d, fm)


def test_second_pin_is_hit():
    d, fm, bm = fresh(3)
    try:
        b1 = bm.pin(BlockId("t.tbl", 2)); bm.unpin(b1)
        b2 = bm.pin(BlockId("t.tbl", 2)); bm.unpin(b2)
        expect(bm.misses == 1 and bm.hits == 1,
               f"expected 1 miss + 1 hit, got misses={bm.misses} hits={bm.hits}")
        expect(b1 is b2, "second pin of the same block should reuse the same frame")
    finally:
        cleanup(d, fm)


def test_pin_counting():
    d, fm, bm = fresh(3)
    try:
        blk = BlockId("t.tbl", 1)
        a = bm.pin(blk)
        b = bm.pin(blk)
        expect(a is b and a.pins == 2, f"two pins of one block: pins should be 2, got {a.pins}")
        bm.unpin(a)
        expect(a.is_pinned(), "after one unpin of two pins, frame must still be pinned")
        bm.unpin(a)
        expect(not a.is_pinned(), "after matching unpins, frame must be unpinned")
    finally:
        cleanup(d, fm)


def test_unpin_below_zero_raises():
    d, fm, bm = fresh(3)
    try:
        buf = bm.pin(BlockId("t.tbl", 0))
        bm.unpin(buf)
        try:
            bm.unpin(buf)
        except ValueError:
            return
        raise AssertionError("unpinning an unpinned frame should raise ValueError")
    finally:
        cleanup(d, fm)


# ---------------- LRU group ----------------

def test_eviction_when_full():
    d, fm, bm = fresh(3)
    try:
        for k in (0, 1, 2, 3):          # 4 distinct blocks, 3 frames
            access(bm, k)
        expect(bm.misses == 4 and bm.hits == 0,
               f"4 distinct blocks through 3 frames: expected 4 misses, got {bm.misses} ({bm.hits} hits)")
        held = {b.block.blknum for b in bm.pool if b.block}
        expect(0 not in held, f"LRU victim should have been block 0; pool holds {sorted(held)}")
    finally:
        cleanup(d, fm)


def test_lru_order_is_recency():
    d, fm, bm = fresh(3)
    try:
        access(bm, 0); access(bm, 1); access(bm, 2)   # pool: 0,1,2 (0 oldest)
        access(bm, 0)                                  # touch 0 -> now 1 is LRU
        access(bm, 3)                                  # must evict 1, not 0
        held = {b.block.blknum for b in bm.pool if b.block}
        expect(held == {0, 2, 3},
               f"after touching 0, victim must be 1; pool holds {sorted(held)} — "
               "is last_used stamped on EVERY pin (hits too)?")
    finally:
        cleanup(d, fm)


def test_pinned_frames_survive():
    d, fm, bm = fresh(2)
    try:
        keep = bm.pin(BlockId("t.tbl", 0))   # stays pinned throughout
        access(bm, 1)
        access(bm, 2)                         # must evict 1 (0 is pinned)
        expect(keep.block.blknum == 0 and keep.contents().get_int(0) == 0,
               "pinned frame was evicted or corrupted")
        held = {b.block.blknum for b in bm.pool if b.block}
        expect(held == {0, 2}, f"expected pool {{0, 2}}, got {sorted(held)}")
        bm.unpin(keep)
    finally:
        cleanup(d, fm)


def test_all_pinned_aborts():
    d, fm, bm = fresh(2)
    try:
        bm.pin(BlockId("t.tbl", 0))
        bm.pin(BlockId("t.tbl", 1))
        try:
            bm.pin(BlockId("t.tbl", 2))
        except BufferAbortError:
            return
        raise AssertionError("pinning with every frame pinned should raise BufferAbortError")
    finally:
        cleanup(d, fm)


# ---------------- DIRTY group ----------------

def test_dirty_page_survives_eviction():
    d, fm, bm = fresh(2)
    try:
        blk = BlockId("t.tbl", 0)
        buf = bm.pin(blk)
        buf.contents().set_int(0, 999)
        buf.set_modified()
        bm.unpin(buf)
        access(bm, 1); access(bm, 2)          # push block 0 out of the pool
        p = Page(BLOCK_SIZE)
        fm.read(blk, p)                        # straight from disk
        expect(p.get_int(0) == 999,
               "modified page was evicted without write-back — "
               "does assign_to_block get called on the victim (it flushes)?")
    finally:
        cleanup(d, fm)


def test_flush_all_durability():
    d, fm, bm = fresh(3)
    try:
        blk = BlockId("t.tbl", 4)
        buf = bm.pin(blk)
        buf.contents().set_int(0, 777)
        buf.set_modified()
        bm.unpin(buf)
        bm.flush_all()
        p = Page(BLOCK_SIZE)
        fm.read(blk, p)
        expect(p.get_int(0) == 777, "flush_all did not write the dirty frame to disk")
    finally:
        cleanup(d, fm)


# ---------------- function-level checks ----------------
from contextlib import ExitStack
from unittest.mock import patch


def _fixture_find(bm, block):
    return next((buf for buf in bm.pool if buf.block == block), None)


def _fixture_victim(bm):
    return min((buf for buf in bm.pool if not buf.is_pinned()),
               key=lambda buf: buf.last_used, default=None)


def _fixture_pin(bm, block):
    buf = _fixture_find(bm, block)
    if buf is None:
        buf = _fixture_victim(bm)
        if buf is None:
            raise BufferAbortError()
        buf.assign_to_block(block)
        bm.misses += 1
    else:
        bm.hits += 1
    buf.pins += 1
    bm._tick += 1
    buf.last_used = bm._tick
    return buf


def _fixture_unpin(bm, buf):
    if buf.pins == 0:
        raise ValueError("already unpinned")
    buf.pins -= 1


_UNIT_DEPENDENCIES = {"_find_existing": _fixture_find, "_choose_victim": _fixture_victim,
                      "pin": _fixture_pin, "unpin": _fixture_unpin}


def _unit_buffer(method):
    with ExitStack() as stack:
        for name, implementation in _UNIT_DEPENDENCIES.items():
            if name != method:
                stack.enter_context(patch.object(BufferManager, name, implementation))
        d, fm, bm = fresh(3)
        try:
            a, b, c = bm.pool
            if method == "_find_existing":
                a.block, b.block = BlockId("t.tbl", 2), BlockId("other.tbl", 2)
                b.pins = 2
                expect(bm._find_existing(BlockId("t.tbl", 2)) is a, "match equal block IDs")
                expect(bm._find_existing(BlockId("other.tbl", 2)) is b,
                       "include the filename and find pinned buffers too")
                expect(bm._find_existing(BlockId("t.tbl", 7)) is None, "missing block returns None")
                expect((a.pins, b.pins, c.pins) == (0, 2, 0), "lookup must not change pin counts")
            elif method == "_choose_victim":
                a.last_used, b.last_used, c.last_used = 5, 1, 3
                b.pins = 1
                expect(bm._choose_victim() is c, "choose oldest UNPINNED buffer")
                c.pins = 1
                expect(bm._choose_victim() is a, "skip pinned buffers even if older")
                a.pins = 1
                expect(bm._choose_victim() is None, "all pinned means no victim")
                expect([x.last_used for x in bm.pool] == [5, 1, 3], "choosing must not change recency")
            elif method == "unpin":
                a.pins = 2
                a.last_used, a.dirty = 8, True
                bm.unpin(a)
                expect(a.pins == 1 and a.is_pinned(), "release exactly one nested pin")
                bm.unpin(a)
                expect(a.pins == 0, "last release makes buffer unpinned")
                try:
                    bm.unpin(a)
                except ValueError:
                    pass
                else:
                    raise AssertionError("unpin at zero must raise ValueError")
                expect(a.pins == 0, "failed unpin must not make pins negative")
                expect(a.last_used == 8 and a.dirty, "unpin preserves recency and dirty state")
            else:
                buf = bm.pin(BlockId("t.tbl", 2))
                expect(buf.contents().get_int(0) == 2 and buf.block == BlockId("t.tbl", 2),
                       "a miss must load the requested block")
                expect((bm.hits, bm.misses, buf.pins) == (0, 1, 1), "count miss and first pin")
                tick = buf.last_used
                expect(tick == bm._tick and tick > 0, "stamp fresh recency on a miss")
                again = bm.pin(BlockId("t.tbl", 2))
                expect(again is buf and (bm.hits, bm.misses, buf.pins) == (1, 1, 2),
                       "hit reuses resident frame and increments pins")
                expect(buf.last_used == bm._tick and buf.last_used > tick, "hits refresh recency too")
                # Set up a dirty victim without calling student unpin.
                buf.pins = 0
                buf.contents().set_int(0, 901)
                buf.set_modified()
                for other in bm.pool:
                    if other is not buf:
                        other.pins = 1
                replaced = bm.pin(BlockId("t.tbl", 4))
                expect(replaced is buf and replaced.contents().get_int(0) == 4,
                       "reuse the only available victim and load the new block")
                disk = Page(BLOCK_SIZE)
                fm.read(BlockId("t.tbl", 2), disk)
                expect(disk.get_int(0) == 901, "flush dirty victim before reuse")
                expect((bm.hits, bm.misses) == (1, 2), "count the eviction miss")
                try:
                    bm.pin(BlockId("t.tbl", 7))
                except BufferAbortError:
                    pass
                else:
                    raise AssertionError("all pinned must raise BufferAbortError")
        finally:
            cleanup(d, fm)


UNIT_TESTS = {f"BufferManager.{name}": (lambda name=name: _unit_buffer(name))
              for name in _UNIT_DEPENDENCIES}


def run_integration():
    RESULTS.clear()
    print("PIN group")
    check("PIN", "pin loads the block's data",            test_pin_reads_block)
    check("PIN", "second pin of same block is a hit",     test_second_pin_is_hit)
    check("PIN", "pin counts nest and unpin releases",    test_pin_counting)
    check("PIN", "unpin below zero raises ValueError",    test_unpin_below_zero_raises)
    print("LRU group")
    check("LRU", "full pool evicts least recently used",  test_eviction_when_full)
    check("LRU", "recency order, not insertion order",    test_lru_order_is_recency)
    check("LRU", "pinned frames are never evicted",       test_pinned_frames_survive)
    check("LRU", "all-pinned pool raises BufferAbortError", test_all_pinned_aborts)
    print("DIRTY group")
    check("DIRTY", "dirty page written back on eviction", test_dirty_page_survives_eviction)
    check("DIRTY", "flush_all makes writes durable",      test_flush_all_durability)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--list", action="store_true", help="list function-level test targets")
    mode.add_argument("--unit", nargs="?", const="all", choices=["all", *UNIT_TESTS],
                      metavar="TARGET", help="test one function, or all functions if omitted")
    parser.add_argument("-v", action="store_true", help="show tracebacks for failures")
    args = parser.parse_args()
    if args.list:
        print("\n".join(UNIT_TESTS))
        return
    if args.unit is not None:
        RESULTS.clear()
        print("UNIT checks use test fixtures for unfinished dependencies.")
        print("Run without --unit to check the complete implementation together.")
        names = UNIT_TESTS if args.unit == "all" else [args.unit]
        for name in names:
            check("UNIT", name, UNIT_TESTS[name])
        n = sum(RESULTS)
        print(f"\n{n}/{len(RESULTS)} function checks passed")
        sys.exit(0 if n == len(RESULTS) else 1)
    run_integration()


if __name__ == "__main__":
    main()
