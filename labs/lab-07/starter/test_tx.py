"""Lab 7 test harness — run:  python3 test_tx.py

Four groups, mirroring the lab page:

    WAL      — old values reach the log before new values reach the page
    COMMIT   — durable, in the right order; rollback really erases
    RECOVER  — a crashed database comes back consistent (subprocess kill!)
    LOCKS    — strict 2PL: conflicts refuse loudly, commit releases

Pure stdlib; no pytest. The Gradescope autograder runs a superset.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import traceback

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


if __name__ == "__main__":
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
