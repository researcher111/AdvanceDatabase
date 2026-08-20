"""microdb · part 7 — transactions: the write-ahead log, rollback, recovery.

Lab 7 of Advanced Databases for Data Science (DS 6XXX, Fall 2026).
Runs on Labs 1-6 (reference implementations ship in this folder).

THE ONE RULE (write-ahead logging):

    before changing a page, write the OLD value to the log —
    and the log reaches disk before the change ever could.

Everything else follows. commit() flushes your pages, then logs COMMIT.
rollback() walks the log backwards restoring old values. recover() (run at
startup) rolls back every transaction that never committed — which is how
a database survives kill -9.

Policy honesty: microdb uses FORCE (commit flushes data pages) + STEAL
(dirty pages may hit disk anytime), which needs only UNDO recovery. Real
engines use NO-FORCE + STEAL and add redo — that's ARIES, and it's this
lab plus bookkeeping.

The log itself is a plain append-only file of JSON lines, fsync'd on the
records that matter. That is not a simplification — an append-only file
with disciplined fsyncs IS what a WAL is; Postgres's pg_wal is the same
idea with binary records.

Run the tests any time:   python3 test_tx.py
Watch it survive murder:  python3 crash_demo.py
"""

from __future__ import annotations

import json
import os

from file_manager import BlockId, FileManager
from buffer_manager import BufferManager


class LockAbortError(Exception):
    """Raised when a lock request conflicts. (Single-threaded microdb
    can't wait for another thread to finish — so it refuses loudly.)"""


class LockTable:
    """Strict two-phase locking at block granularity. Provided complete.

    Many transactions may hold an S (shared/read) lock on a block;
    an X (exclusive/write) lock tolerates no other holder of any kind.
    Locks are released only at commit/rollback — that's the "strict"."""

    def __init__(self):
        self._locks: dict[BlockId, tuple[str, set[int]]] = {}  # block -> (mode, {txnums})

    def slock(self, block: BlockId, txnum: int) -> None:
        mode, holders = self._locks.get(block, ("S", set()))
        if mode == "X" and holders != {txnum}:
            raise LockAbortError(f"tx{txnum}: block {block} is X-locked by tx{holders}")
        if mode == "S" or holders == {txnum}:
            holders = holders | {txnum}
            self._locks[block] = (mode if mode == "X" else "S", holders)

    def xlock(self, block: BlockId, txnum: int) -> None:
        mode, holders = self._locks.get(block, ("S", set()))
        if holders - {txnum}:
            raise LockAbortError(f"tx{txnum}: block {block} is {mode}-locked by tx{holders - {txnum}}")
        self._locks[block] = ("X", {txnum})

    def release_all(self, txnum: int) -> None:
        for block in list(self._locks):
            mode, holders = self._locks[block]
            holders.discard(txnum)
            if not holders:
                del self._locks[block]
            else:
                self._locks[block] = (mode, holders)


class LogManager:
    """The write-ahead log: append-only JSON lines. Provided complete.

    Record shapes (all carry "tx"):
        {"kind": "START",    "tx": 3}
        {"kind": "SET_INT",  "tx": 3, "file": "students.tbl", "blk": 0,
                             "off": 24, "old": 31}          (old STRING for SET_STR)
        {"kind": "COMMIT",   "tx": 3}
        {"kind": "ROLLBACK", "tx": 3}
    """

    def __init__(self, db_dir: str, logfile: str = "microdb.log"):
        self.path = os.path.join(db_dir, logfile)
        self._f = open(self.path, "a+")

    def append(self, record: dict, sync: bool = False) -> None:
        """Add one record. sync=True forces it to disk NOW — commit
        records must reach disk before commit() may return."""
        self._f.write(json.dumps(record) + "\n")
        self._f.flush()
        if sync:
            os.fsync(self._f.fileno())

    def records_backwards(self) -> list[dict]:
        """Every log record, newest first — the direction undo walks."""
        self._f.flush()
        with open(self.path) as f:
            return [json.loads(line) for line in f if line.strip()][::-1]

    def close(self) -> None:
        self._f.close()


class Transaction:
    """One unit of all-or-nothing work. The API mirrors Lab 2's buffer
    discipline, with logging and locking woven in.

        tx = Transaction(fm, bm, lm, locks)
        tx.pin(block)
        old = tx.get_int(block, 24)         # takes an S lock
        tx.set_int(block, 24, 40)           # X lock + logs old value FIRST
        tx.commit()                          # or tx.rollback()
    """

    _next_txnum = 1

    def __init__(self, fm: FileManager, bm: BufferManager,
                 lm: LogManager, locks: LockTable):
        self.fm = fm
        self.bm = bm
        self.lm = lm
        self.locks = locks
        self.txnum = Transaction._next_txnum
        Transaction._next_txnum += 1
        self._pins: dict[BlockId, object] = {}
        self.lm.append({"kind": "START", "tx": self.txnum})

    # ---- pin plumbing (provided) ----

    def pin(self, block: BlockId) -> None:
        if block not in self._pins:
            self._pins[block] = self.bm.pin(block)

    def _buf(self, block: BlockId):
        if block not in self._pins:
            raise RuntimeError(f"tx{self.txnum}: pin {block} before touching it")
        return self._pins[block]

    def _unpin_all(self) -> None:
        for buf in self._pins.values():
            self.bm.unpin(buf)
        self._pins.clear()

    def get_int(self, block: BlockId, off: int) -> int:
        self.locks.slock(block, self.txnum)
        return self._buf(block).contents().get_int(off)

    def get_string(self, block: BlockId, off: int) -> str:
        self.locks.slock(block, self.txnum)
        return self._buf(block).contents().get_string(off)

    # ---------------- YOUR JOB starts here. ----------------

    def set_int(self, block: BlockId, off: int, val: int) -> None:
        """The WAL rule, enacted: X-lock the block, log the OLD value,
        then (and only then) write the new one through the buffer.

        Steps: xlock · read the old int straight from the buffer's page ·
        append a SET_INT record with it · write the new value ·
        set_modified. Order is everything — the tests check it."""
        # TODO
        raise NotImplementedError

    def set_string(self, block: BlockId, off: int, val: str) -> None:
        """Same dance as set_int, with a SET_STR record."""
        # TODO
        raise NotImplementedError

    def commit(self) -> None:
        """Make it permanent, in the only safe order:

        1. flush every buffer this tx dirtied (bm.flush_all is fine —
           FORCE policy: data reaches disk before the commit record)
        2. append {"kind": "COMMIT", "tx": ...} with sync=True — the
           moment that fsync returns, the transaction is durable
        3. release locks, unpin everything (_unpin_all)"""
        # TODO
        raise NotImplementedError

    def rollback(self) -> None:
        """Erase this transaction as if it never ran:

        1. walk lm.records_backwards(); for each SET_* record belonging
           to THIS tx, pin its block and write the old value back
           (set_modified too) — stop at this tx's START record
        2. append a ROLLBACK record
        3. flush, release locks, unpin"""
        # TODO
        raise NotImplementedError

    # ---------------- YOUR JOB ends here. ----------------


def recover(fm: FileManager, bm: BufferManager, lm: LogManager) -> list[int]:
    """Startup recovery (undo-only): every transaction with a START but no
    COMMIT/ROLLBACK is a casualty of a crash — undo its writes, newest
    first, then log its ROLLBACK. Returns the txnums undone.

    ---------------- YOUR JOB ----------------
    Sketch: one backward pass. Track txs already finished (COMMIT or
    ROLLBACK seen — remember, we're reading newest-first, so the fate is
    known before the writes appear). For SET_* records of unfinished txs:
    pin the block, restore the old value, set_modified, unpin. Afterwards:
    flush all, append a ROLLBACK record per undone tx."""
    # TODO
    raise NotImplementedError
