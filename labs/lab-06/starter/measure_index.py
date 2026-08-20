"""Lab 6, Part 3 — the number the whole week is for. Run:  python3 measure_index.py

100,000 rows. One question: find the rows where uid = 77777.

    the scan:   touches every row, every block, every time
    the index:  descends height-many nodes, then jumps via RIDs

Rows/nodes touched are deterministic — record them. The wall-clock times
are your machine's; record them too and treat them as representative.
"""

import shutil
import tempfile
import time

from file_manager import FileManager
from buffer_manager import BufferManager
from record_manager import Schema, Layout, TableScan
from query_engine import Predicate, SelectScan, CountingScan
from btree import build_index, IndexSelectScan

BLOCK_SIZE = 4096
N_ROWS = 100_000
TARGET = 77_777


def main():
    d = tempfile.mkdtemp(prefix="microdb-l6m-")
    try:
        fm = FileManager(d, BLOCK_SIZE)
        bm = BufferManager(fm, 64)
        lay = Layout(Schema().add_int_field("uid").add_int_field("score"))
        print(f"loading {N_ROWS:,} rows...")
        ts = TableScan(bm, fm, "users", lay)
        for i in range(N_ROWS):
            ts.insert()
            ts.set_int("uid", i)
            ts.set_int("score", i * 7 % 1000)
        ts.close()
        blocks = fm.length("users.tbl")

        # --- the scan way ---
        counter = CountingScan(TableScan(bm, fm, "users", lay))
        sel = SelectScan(counter, Predicate(("uid", "=", TARGET)))
        t0 = time.perf_counter()
        sel.before_first()
        found = 0
        while sel.next():
            found += 1
        scan_secs = time.perf_counter() - t0
        sel.close()
        print(f"\nscan:   found {found} row · touched {counter.rows:,} rows "
              f"across {blocks:,} blocks · {scan_secs * 1000:,.0f} ms")

        # --- the index way ---
        print("building the index (one scan, paid once)...")
        t0 = time.perf_counter()
        tree = build_index(bm, fm, "users", lay, "uid")
        build_secs = time.perf_counter() - t0
        tree.nodes_touched = 0
        idx = IndexSelectScan(TableScan(bm, fm, "users", lay), tree, TARGET)
        t0 = time.perf_counter()
        idx.before_first()
        found = 0
        while idx.next():
            found += 1
        index_secs = time.perf_counter() - t0
        idx.close()
        print(f"index:  found {found} row · touched {tree.nodes_touched} tree nodes "
              f"(height {tree.height}) + 1 heap block · {index_secs * 1000:.2f} ms")
        print(f"        (index build took {build_secs:.1f}s, the once-per-table price)")
        print(f"\nlookup speedup: {scan_secs / max(index_secs, 1e-9):,.0f}x")
        fm.close()
    finally:
        shutil.rmtree(d, ignore_errors=True)
    print("\nRecord all numbers, then answer in measurements.txt:")
    print("  1. The scan touched 100,000 rows to return 1. What fraction of its")
    print("     work was wasted, and what decides that fraction? (Name: selectivity.)")
    print("  2. The index descended", "height-many", "nodes. How many would it")
    print("     descend for 100 MILLION rows? (Compute, don't guess: ORDER=4 here,")
    print("     ~200 in a real page-sized node.)")
    print("  3. Who should pay the index-build price, and when — every query,")
    print("     or something else?")


if __name__ == "__main__":
    main()
