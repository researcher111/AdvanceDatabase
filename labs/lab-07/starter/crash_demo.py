"""Lab 7, Part 3 — the kill -9 demo. Run:  python3 crash_demo.py

The whole semester's promise, kept in one run:

    1. a fresh database: two accounts, A=$100, B=$50
    2. transaction 1 transfers $40 and COMMITS
    3. transaction 2 starts a transfer, writes half of it... and the
       process is killed dead — no cleanup, no goodbye (a subprocess
       calling os._exit, the honest stand-in for a power cut)
    4. we reopen the wreckage, show you the corruption on disk,
       run YOUR recover() — and count the money

Note the before/after balances for class. The demo is
deterministic; the drama is real.
"""

import os
import subprocess
import sys
import tempfile
import textwrap

from file_manager import BlockId, Page, FileManager
from buffer_manager import BufferManager
from transaction import LogManager, recover

BLOCK_SIZE = 128

CRASH = textwrap.dedent("""
    import os, sys
    sys.path.insert(0, {src!r})
    from file_manager import BlockId, Page, FileManager
    from buffer_manager import BufferManager
    from transaction import LogManager, LockTable, Transaction
    fm = FileManager({db!r}, {bs})
    bm = BufferManager(fm, 8)
    lm = LogManager({db!r})
    locks = LockTable()
    blk = fm.append("acct.tbl")
    p = Page({bs}); p.set_int(0, 100); p.set_int(4, 50)
    fm.write(blk, p)
    print("opening balances:   A=$100  B=$50", flush=True)

    t1 = Transaction(fm, bm, lm, locks)
    t1.pin(blk)
    t1.set_int(blk, 0, 60)
    t1.set_int(blk, 4, 90)
    t1.commit()
    print("tx1 COMMITTED:      A=$60   B=$90   (a $40 transfer)", flush=True)

    t2 = Transaction(fm, bm, lm, locks)
    t2.pin(blk)
    t2.set_int(blk, 0, 10)          # A pays $50...
    bm.flush_all()                  # ...and the dirty page is STOLEN to disk
    print("tx2 mid-transfer:   A=$10 written, B not yet credited --", flush=True)
    print("KILLED. (os._exit, no rollback, no flush, no mercy)", flush=True)
    os._exit(1)
""")


def money(fm, blk):
    p = Page(BLOCK_SIZE)
    fm.read(blk, p)
    return p.get_int(0), p.get_int(4)


def main():
    db = tempfile.mkdtemp(prefix="microdb-crash-")
    try:
        print("=" * 60)
        proc = subprocess.run(
            [sys.executable, "-c", CRASH.format(src=os.getcwd(), db=db, bs=BLOCK_SIZE)],
            capture_output=True, text=True, timeout=60)
        print(proc.stdout, end="")
        print("=" * 60)

        fm = FileManager(db, BLOCK_SIZE)
        blk = BlockId("acct.tbl", 0)
        a, b = money(fm, blk)
        print(f"\nreopening the wreckage: A=${a}  B=${b}"
              f"   <- ${a + b} total: ${150 - (a + b)} has VANISHED mid-transfer")

        bm = BufferManager(fm, 8)
        lm = LogManager(db)
        undone = recover(fm, bm, lm)
        bm.flush_all()
        a, b = money(fm, blk)
        print(f"after recover():        A=${a}  B=${b}"
              f"   <- tx{undone} undone; the committed transfer stands")
        ok = (a, b) == (60, 90)
        print("\n" + ("CONSISTENT. Your database survives kill -9." if ok
                      else "STILL BROKEN — recovery has a bug."))
        lm.close(); fm.close()
    finally:
        import shutil
        shutil.rmtree(db, ignore_errors=True)
    print("\nRecord the three balance lines, then think about these for class:")
    print("  1. The $40 committed transfer survived. Which exact fsync made")
    print("     that promise binding, and when did it happen?")
    print("  2. The stolen page put A=$10 on disk before the crash. Why was")
    print("     that SAFE — what information made it reversible?")


if __name__ == "__main__":
    main()
