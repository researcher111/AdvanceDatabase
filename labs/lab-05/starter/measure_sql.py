"""Lab 5, Part 3 — look your planner in the eye. Run:  python3 measure_sql.py

Prints the plan tree your planner builds for three queries, then counts the
rows the join plan examines — exposing the honest truth: your planner is
CORRECT but NAIVE. It never pushes filters below the product (Lab 4's 15×
trick), because it doesn't know how. That gap has a name: week 9.

All numbers are deterministic: note them for class.
"""

import shutil
import tempfile

from file_manager import FileManager
from buffer_manager import BufferManager
from catalog import Catalog
from query_engine import CountingScan
from sql_frontend import Database, Parser, render_plan

BLOCK_SIZE = 4096
N_STUDENTS = 300

QUERIES = [
    "SELECT name FROM students WHERE gpa > 35",
    "SELECT * FROM majors",
    "SELECT name, dept FROM students, majors WHERE mid = mid2 AND gpa > 35 AND dept = 'cs'",
]


def main():
    d = tempfile.mkdtemp(prefix="microdb-l5m-")
    try:
        fm = FileManager(d, BLOCK_SIZE)
        bm = BufferManager(fm, 8)
        db = Database(fm, bm, Catalog(bm, fm))
        db.execute("CREATE TABLE students (sid INT, name VARCHAR(8), gpa INT, mid INT)")
        db.execute("CREATE TABLE majors (mid2 INT, dept VARCHAR(8))")
        for i in range(N_STUDENTS):
            db.execute(f"INSERT INTO students VALUES "
                       f"({i}, 's{i}', {20 + i % 20}, {1 + i % 3})")
        for mid, dept in [(1, "cs"), (2, "stat"), (3, "econ")]:
            db.execute(f"INSERT INTO majors VALUES ({mid}, '{dept}')")

        for sql in QUERIES:
            print(f"\nmicrodb> {sql}")
            plan = db.plan_query(Parser(sql).parse())
            print(render_plan(plan, indent=1))
            plan.close()

        # Count what the naive join plan actually does.
        data = Parser(QUERIES[2]).parse()
        plan = db.plan_query(data)
        # Splice a counter just above the product (below the select).
        sel = plan.scan                      # ProjectScan -> SelectScan
        counter = CountingScan(sel.scan)     # -> ProductScan
        sel.scan = counter
        plan.before_first()
        out = 0
        while plan.next():
            out += 1
        plan.close()
        print(f"\nthe join plan, measured: {counter.rows:,} pairs examined "
              f"-> {out} rows returned")
        print(f"Lab 4's hand-pushed-down plan did the same query in 60 pairs.")
        fm.close()
    finally:
        shutil.rmtree(d, ignore_errors=True)
    print("\nRecord the three plan trees and the pair count, then answer:")
    print("  1. Your planner puts every filter above the product. Why is that")
    print("     always CORRECT, even when it's slow?")
    print("  2. What one fact about the data would the planner need to know")
    print("     before it could safely and profitably push gpa > 35 down?")


if __name__ == "__main__":
    main()
