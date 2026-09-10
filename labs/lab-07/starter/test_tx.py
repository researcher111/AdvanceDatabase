"""Lab 7 test harness — run:  python3 test_tx.py

Four groups, mirroring the lab page:

    WAL      — old values reach the log before new values reach the page
    COMMIT   — durable, in the right order; rollback really erases
    RECOVER  — a crashed database comes back consistent (subprocess kill!)
    LOCKS    — strict 2PL: conflicts refuse loudly, commit releases

Pure stdlib; no pytest. The Gradescope autograder runs this same harness.

Build one function at a time:
    python3 test_tx.py --list
    python3 test_tx.py --unit Transaction.set_string
    python3 test_tx.py --unit recover
    python3 test_tx.py --unit

Isolated checks prepare pages and log records directly, so other TODOs can stay
unfinished. The selected function always runs your code. Run without --unit
for the original integration/grading checks.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import traceback
from contextlib import contextmanager
from unittest.mock import patch

from file_manager import BlockId, Page, FileManager
from buffer_manager import BufferManager
from transaction import LogManager, LockTable, Transaction, LockAbortError, recover

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


def fresh():
    d = tempfile.mkdtemp(prefix="microdb-l7-")
    fm = FileManager(d, BLOCK_SIZE)
    bm = BufferManager(fm, 8)
    lm = LogManager(d)
    locks = LockTable()
    blk = fm.append("acct.tbl")
    p = Page(BLOCK_SIZE)
    p.set_int(0, 100)          # account A: $100
    p.set_int(4, 50)           # account B: $50
    fm.write(blk, p)
    return d, fm, bm, lm, locks, blk


def cleanup(d, fm, lm):
    lm.close()
    fm.close()
    shutil.rmtree(d, ignore_errors=True)


def disk_int(fm, blk, off):
    p = Page(BLOCK_SIZE)
    fm.read(blk, p)
    return p.get_int(off)


# ---------------- WAL group ----------------

def test_old_value_logged_first():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(blk)
        tx.set_int(blk, 0, 75)
        recs = lm.records_backwards()
        sets = [r for r in recs if r["kind"] == "SET_INT" and r["tx"] == tx.txnum]
        expect(len(sets) == 1, "one set_int must append exactly one SET_INT record")
        expect(sets[0]["old"] == 100,
               f"the log must hold the OLD value (100), got {sets[0]['old']} — "
               "read the page BEFORE writing it")
        expect(sets[0]["off"] == 0 and sets[0]["file"] == "acct.tbl",
               "the record must say where: file, blk, off")
        tx.rollback()
    finally:
        cleanup(d, fm, lm)


def test_write_lands_in_buffer():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(blk)
        tx.set_int(blk, 0, 75)
        expect(tx.get_int(blk, 0) == 75, "the new value must be visible through the tx")
        tx.commit()
    finally:
        cleanup(d, fm, lm)


# ---------------- COMMIT group ----------------

def test_commit_is_durable():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(blk)
        tx.set_int(blk, 0, 60)      # A pays 40
        tx.set_int(blk, 4, 90)      # B receives 40
        tx.commit()
        expect(disk_int(fm, blk, 0) == 60 and disk_int(fm, blk, 4) == 90,
               "after commit, BOTH new values must be on disk (FORCE policy)")
        kinds = [r["kind"] for r in lm.records_backwards()]
        expect(kinds[0] == "COMMIT", "the newest log record must be the COMMIT")
    finally:
        cleanup(d, fm, lm)


def test_rollback_restores():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(blk)
        tx.set_int(blk, 0, 999)
        tx.set_int(blk, 4, 888)
        tx.rollback()
        bm.flush_all()
        expect(disk_int(fm, blk, 0) == 100 and disk_int(fm, blk, 4) == 50,
               f"rollback must restore 100/50, disk has "
               f"{disk_int(fm, blk, 0)}/{disk_int(fm, blk, 4)}")
    finally:
        cleanup(d, fm, lm)


def test_rollback_undoes_in_reverse():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(blk)
        tx.set_int(blk, 0, 1)       # 100 -> 1
        tx.set_int(blk, 0, 2)       # 1 -> 2   (same slot twice!)
        tx.rollback()
        bm.flush_all()
        expect(disk_int(fm, blk, 0) == 100,
               f"undoing newest-first restores 100; oldest-first leaves 1 — "
               f"disk has {disk_int(fm, blk, 0)}")
    finally:
        cleanup(d, fm, lm)


# ---------------- RECOVER group ----------------

CRASH_SCRIPT = textwrap.dedent("""
    import os, sys
    sys.path.insert(0, {srcdir!r})
    from file_manager import BlockId, FileManager
    from buffer_manager import BufferManager
    from transaction import LogManager, LockTable, Transaction
    fm = FileManager({dbdir!r}, {bs})
    bm = BufferManager(fm, 8)
    lm = LogManager({dbdir!r})
    locks = LockTable()
    blk = BlockId("acct.tbl", 0)
    committed = Transaction(fm, bm, lm, locks)
    committed.pin(blk)
    committed.set_int(blk, 0, 60)
    committed.set_int(blk, 4, 90)
    committed.commit()                      # this one must survive
    doomed = Transaction(fm, bm, lm, locks)
    doomed.pin(blk)
    doomed.set_int(blk, 0, 0)               # mid-transfer...
    bm.flush_all()                          # STEAL: dirty page hits disk!
    os._exit(1)                             # ...kill -9
""")


def test_recovery_after_crash():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        script = CRASH_SCRIPT.format(srcdir=os.getcwd(), dbdir=d, bs=BLOCK_SIZE)
        proc = subprocess.run([sys.executable, "-c", script],
                              capture_output=True, text=True, timeout=60)
        expect(proc.returncode == 1, f"crash script should die with 1: {proc.stderr[-400:]}")
        fm2 = FileManager(d, BLOCK_SIZE)
        expect(disk_int(fm2, blk, 0) == 0,
               "pre-recovery, the stolen dirty page (0) should be on disk — the mess is real")
        bm2 = BufferManager(fm2, 8)
        lm2 = LogManager(d)
        undone = recover(fm2, bm2, lm2)
        bm2.flush_all()
        expect(disk_int(fm2, blk, 0) == 60 and disk_int(fm2, blk, 4) == 90,
               f"recovery must keep the committed transfer (60/90) and erase the doomed one — "
               f"disk has {disk_int(fm2, blk, 0)}/{disk_int(fm2, blk, 4)}")
        expect(len(undone) == 1, f"exactly one tx should be undone, got {undone}")
        lm2.close(); fm2.close()
    finally:
        cleanup(d, fm, lm)


def test_recovery_is_idempotent():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        script = CRASH_SCRIPT.format(srcdir=os.getcwd(), dbdir=d, bs=BLOCK_SIZE)
        subprocess.run([sys.executable, "-c", script], capture_output=True, timeout=60)
        fm2 = FileManager(d, BLOCK_SIZE)
        bm2 = BufferManager(fm2, 8)
        lm2 = LogManager(d)
        recover(fm2, bm2, lm2)
        undone_again = recover(fm2, bm2, lm2)     # crash during recovery? run it twice
        bm2.flush_all()
        expect(disk_int(fm2, blk, 0) == 60,
               "running recovery twice must be harmless (idempotence)")
        expect(undone_again == [],
               f"the second pass has nothing to undo, got {undone_again}")
        lm2.close(); fm2.close()
    finally:
        cleanup(d, fm, lm)


# ---------------- LOCKS group ----------------

def test_write_write_conflict():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        tx1 = Transaction(fm, bm, lm, locks)
        tx2 = Transaction(fm, bm, lm, locks)
        tx1.pin(blk); tx2.pin(blk)
        tx1.set_int(blk, 0, 75)
        try:
            tx2.set_int(blk, 0, 80)         # the lost update, attempted
        except LockAbortError:
            tx1.commit(); tx2.rollback(); return
        raise AssertionError("two writers on one block must conflict — "
                             "is set_int taking an xlock?")
    finally:
        cleanup(d, fm, lm)


def test_readers_share_writers_dont():
    d, fm, bm, lm, locks, blk = fresh()
    try:
        tx1 = Transaction(fm, bm, lm, locks)
        tx2 = Transaction(fm, bm, lm, locks)
        tx1.pin(blk); tx2.pin(blk)
        expect(tx1.get_int(blk, 0) == 100 and tx2.get_int(blk, 0) == 100,
               "two readers must coexist (shared locks)")
        try:
            tx2.set_int(blk, 0, 5)          # upgrade under a reader
        except LockAbortError:
            pass
        else:
            raise AssertionError("a writer must not sneak past another tx's read lock")
        tx1.commit()
        tx2.set_int(blk, 0, 5)              # tx1's locks are gone now
        tx2.commit()
        expect(disk_int(fm, blk, 0) == 5, "after tx1 released, tx2's write proceeds")
    finally:
        cleanup(d, fm, lm)


# ---------------- Isolated function checks ----------------

@contextmanager
def _unit_database():
    """Use the supplied storage layer; no student transaction methods in setup."""
    d, fm, bm, lm, locks, first = fresh()
    try:
        second = fm.append("acct.tbl")
        page = Page(BLOCK_SIZE)
        page.set_int(12, 222)
        page.set_string(16, "café")
        fm.write(second, page)
        yield fm, bm, lm, locks, first, second
    finally:
        cleanup(d, fm, lm)


def _unit_record(kind, txnum, block, off, old):
    return {"kind": kind, "tx": txnum, "file": block.filename,
            "blk": block.blknum, "off": off, "old": old}


def _unit_disk_page(fm, block):
    page = Page(BLOCK_SIZE)
    fm.read(block, page)
    return page


def _unit_assert_released(tx, bm, locks):
    expect(not tx._pins, "finished transaction must clear its pinned buffers")
    expect(all(not buf.is_pinned() for buf in bm.pool), "finished transaction must unpin every buffer")
    expect(all(tx.txnum not in holders for _, holders in locks._locks.values()),
           "finished transaction must release every lock")


def _unit_setter(method, kind, off, old, new):
    with _unit_database() as (fm, bm, lm, locks, first, block):
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(block)
        buf = tx._buf(block)
        getter = buf.contents().get_int if kind == "SET_INT" else buf.contents().get_string
        append = lm.append
        observed = []

        def observe(record, sync=True):
            expect(record == _unit_record(kind, tx.txnum, block, off, old),
                   "setter must log exactly the old value, type, transaction, block, and offset")
            expect(sync, "the SET record must reach disk before the page changes")
            expect(getter(off) == old and not buf.dirty,
                   "append the old-value log record before changing or dirtying the page")
            expect(locks._locks.get(block) == ("X", {tx.txnum}),
                   "take the exclusive lock before logging or changing a value")
            append(record, sync=sync)
            observed.append(record)

        with patch.object(lm, "append", observe):
            getattr(tx, method)(block, off, new)
        expect(len(observed) == 1, "one setter call must append exactly one SET record")
        expect(getter(off) == new, "setter must store the new value in the buffer")
        expect(buf.dirty, "setter must mark its buffer modified")
        bm.flush_all()
        disk = _unit_disk_page(fm, block)
        disk_getter = disk.get_int if kind == "SET_INT" else disk.get_string
        expect(disk_getter(off) == new, "a later buffer flush must write the changed value")
        tx._unpin_all()
        locks.release_all(tx.txnum)

    # A failed WAL append must leave the page unchanged. This also catches a
    # setter that writes first and logs second, even when the final value is right.
    with _unit_database() as (fm, bm, lm, locks, first, block):
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(block)
        buf = tx._buf(block)
        original = bytes(buf.contents().contents())
        with patch.object(lm, "append", side_effect=OSError("simulated log failure")):
            try:
                getattr(tx, method)(block, off, new)
            except OSError:
                pass
            else:
                raise AssertionError("a failed WAL append must propagate its error")
        expect(bytes(buf.contents().contents()) == original and not buf.dirty,
               "a failed log append must not change or dirty the page")
        tx._unpin_all()
        locks.release_all(tx.txnum)

    with _unit_database() as (fm, bm, lm, locks, first, block):
        tx = Transaction(fm, bm, lm, locks)
        tx.pin(block)
        locks.slock(block, tx.txnum + 100)
        original = bytes(tx._buf(block).contents().contents())
        records = lm.records_backwards()
        try:
            getattr(tx, method)(block, off, new)
        except LockAbortError:
            pass
        else:
            raise AssertionError("a setter must refuse another transaction's shared lock")
        expect(lm.records_backwards() == records, "a refused write must not append a SET record")
        expect(bytes(tx._buf(block).contents().contents()) == original,
               "a refused write must not change the page")
        tx._unpin_all()


def unit_set_int():
    _unit_setter("set_int", "SET_INT", 12, 222, -75)


def unit_set_string():
    _unit_setter("set_string", "SET_STR", 16, "café", "東京")


def unit_commit():
    with _unit_database() as (fm, bm, lm, locks, first, second):
        tx = Transaction(fm, bm, lm, locks)
        for block, off, value in [(first, 0, 60), (second, 12, 999)]:
            tx.pin(block)
            locks.xlock(block, tx.txnum)
            lm.append(_unit_record("SET_INT", tx.txnum, block, off,
                                   tx._buf(block).contents().get_int(off)))
            tx._buf(block).contents().set_int(off, value)
            tx._buf(block).set_modified()
        append = lm.append
        observed = []

        def observe(record, sync=True):
            expect(record == {"kind": "COMMIT", "tx": tx.txnum}, "commit must log its own COMMIT")
            expect(sync, "COMMIT must be durable before releasing transaction resources")
            expect(disk_int(fm, first, 0) == 60 and disk_int(fm, second, 12) == 999,
                   "flush every changed page before appending COMMIT")
            expect(all(locks._locks.get(b) == ("X", {tx.txnum}) for b in (first, second)),
                   "hold locks until COMMIT is durable")
            expect(all(tx._buf(b).is_pinned() for b in (first, second)),
                   "keep transaction pins until COMMIT is durable")
            append(record, sync=sync)
            observed.append(record)

        with patch.object(lm, "append", observe):
            tx.commit()
        expect(len(observed) == 1, "commit must append exactly one COMMIT record")
        _unit_assert_released(tx, bm, locks)


def _unit_seed_undo(fm, lm, first, second, txnum):
    """A stolen page, repeated writes, a string, and an unrelated committed tx."""
    lm.append(_unit_record("SET_INT", txnum, first, 0, 100))
    lm.append(_unit_record("SET_INT", txnum, first, 0, 1))
    lm.append(_unit_record("SET_STR", txnum, second, 16, "café"))
    other = txnum + 100
    lm.append({"kind": "START", "tx": other})
    lm.append(_unit_record("SET_INT", other, first, 4, 50))
    lm.append({"kind": "COMMIT", "tx": other})
    for block in (first, second):
        page = _unit_disk_page(fm, block)
        if block == first:
            page.set_int(0, 2)
            page.set_int(4, 75)
        else:
            page.set_string(16, "changed")
        fm.write(block, page)


def _unit_assert_undone(fm, first, second):
    expect(disk_int(fm, first, 0) == 100,
           "undo repeated writes newest-first to restore the original value 100")
    expect(disk_int(fm, first, 4) == 75, "undo must preserve another transaction's committed value")
    expect(_unit_disk_page(fm, second).get_string(16) == "café",
           "undo must restore SET_STR records, including blocks not already pinned")


def unit_rollback():
    with _unit_database() as (fm, bm, lm, locks, first, second):
        tx = Transaction(fm, bm, lm, locks)
        _unit_seed_undo(fm, lm, first, second, tx.txnum)
        tx.pin(first)
        locks.xlock(first, tx.txnum)
        locks.xlock(second, tx.txnum)
        append = lm.append
        observed = []

        def observe(record, sync=True):
            expect(record == {"kind": "ROLLBACK", "tx": tx.txnum},
                   "rollback must append its own ROLLBACK, without logging undo as new writes")
            expect(sync, "ROLLBACK must be durable")
            _unit_assert_undone(fm, first, second)
            expect(all(locks._locks.get(b) == ("X", {tx.txnum}) for b in (first, second)),
                   "hold locks until restored pages and ROLLBACK are durable")
            append(record, sync=sync)
            observed.append(record)

        with patch.object(lm, "append", observe):
            tx.rollback()
        expect(len(observed) == 1, "rollback must append exactly one ROLLBACK record")
        _unit_assert_undone(fm, first, second)
        _unit_assert_released(tx, bm, locks)


def unit_recover():
    with _unit_database() as (fm, bm, lm, locks, first, second):
        unfinished, empty, finished = 11, 12, 13
        lm.append({"kind": "START", "tx": unfinished})
        _unit_seed_undo(fm, lm, first, second, unfinished)
        lm.append({"kind": "START", "tx": empty})
        lm.append({"kind": "START", "tx": finished})
        lm.append(_unit_record("SET_INT", finished, second, 12, -1))
        lm.append({"kind": "ROLLBACK", "tx": finished})
        append = lm.append
        observed = []

        def observe(record, sync=True):
            expect(record.get("kind") == "ROLLBACK" and record.get("tx") in (unfinished, empty),
                   "recovery must mark only unfinished transactions as rolled back")
            expect(sync, "recovery ROLLBACK records must be durable")
            _unit_assert_undone(fm, first, second)
            expect(disk_int(fm, second, 12) == 222,
                   "recovery must skip transactions already marked ROLLBACK")
            append(record, sync=sync)
            observed.append(record)

        with patch.object(lm, "append", observe):
            undone = recover(fm, bm, lm)
        expect(sorted(undone) == [unfinished, empty],
               "return each unfinished transaction once, including one with no writes")
        expect(sorted(r["tx"] for r in observed) == [unfinished, empty],
               "append exactly one ROLLBACK per unfinished transaction")
        expect(all(not buf.is_pinned() for buf in bm.pool), "recovery must release its buffer pins")
        before = lm.records_backwards()
        expect(recover(fm, bm, lm) == [], "a second recovery must have nothing left to undo")
        expect(lm.records_backwards() == before, "a second recovery must not append extra records")
        _unit_assert_undone(fm, first, second)
    with _unit_database() as (fm, bm, lm, locks, first, second):
        expect(recover(fm, bm, lm) == [], "an empty log needs no recovery")
        expect(lm.records_backwards() == [], "empty-log recovery must not invent transactions")


UNIT_TESTS = {
    "Transaction.set_int": unit_set_int,
    "Transaction.set_string": unit_set_string,
    "Transaction.commit": unit_commit,
    "Transaction.rollback": unit_rollback,
    "recover": unit_recover,
}


def run_units_from_cli():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--list", action="store_true", help="list isolated function targets")
    modes.add_argument("--unit", nargs="?", const="all", choices=["all", *UNIT_TESTS],
                       help="run all isolated checks, or one exact target")
    parser.add_argument("-v", action="store_true", help="show tracebacks for failures")
    args = parser.parse_args()
    if args.list:
        print("\n".join(UNIT_TESTS))
        sys.exit(0)
    if args.unit:
        targets = UNIT_TESTS if args.unit == "all" else {args.unit: UNIT_TESTS[args.unit]}
        for name, fn in targets.items():
            check("UNIT", name, fn)
        n = sum(RESULTS)
        print(f"\n{n}/{len(RESULTS)} isolated function checks passed")
        sys.exit(0 if n == len(RESULTS) else 1)


if __name__ == "__main__":
    run_units_from_cli()
    print("WAL group")
    check("WAL", "the OLD value is logged, before the write",   test_old_value_logged_first)
    check("WAL", "the new value lands in the buffer",           test_write_lands_in_buffer)
    print("COMMIT group")
    check("COMMIT", "commit makes both writes durable, in order", test_commit_is_durable)
    check("COMMIT", "rollback restores every old value",        test_rollback_restores)
    check("COMMIT", "undo runs newest-first (same slot twice)", test_rollback_undoes_in_reverse)
    print("RECOVER group")
    check("RECOVER", "kill -9 mid-transaction; recovery repairs", test_recovery_after_crash)
    check("RECOVER", "recovery twice is harmless (idempotent)",  test_recovery_is_idempotent)
    print("LOCKS group")
    check("LOCKS", "write-write conflict refuses loudly",        test_write_write_conflict)
    check("LOCKS", "readers share; writers wait their turn",     test_readers_share_writers_dont)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)
