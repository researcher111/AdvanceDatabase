"""Lab 8, Part 4: three slow queries and their fixes. Run:  python3 slow_queries.py

Each pair computes the same answer twice: once the way a notebook usually
does it, once the way the engine wants it. The numbers are your machine's;
the ratios are the lesson. Requires data/ from gen_data.py.

    A. PUSHDOWN     'the latest month' via a subquery vs as a value the planner can see
    B. FETCH-FILTER pull every row into Python and filter there vs filter in SQL
    C. LOOP         one query per month, twelve round trips vs one GROUP BY
"""

import glob
import time

import duckdb

PART = "data/rides_by_month/*/*.parquet"


def timed(fn, n=3):
    best = float("inf")
    for _ in range(n):
        t0 = time.perf_counter()
        fn()
        best = min(best, time.perf_counter() - t0)
    return best * 1000


def files_scanned(con, sql):
    plan = con.execute("EXPLAIN " + sql).fetchall()[0][1]
    for line in plan.splitlines():
        if "Scanning Files" in line or "File Filters" in line:
            return line.strip(" │")
    return "(no file filter in the plan: every file is opened)"


def main():
    con = duckdb.connect()
    n_files = len(glob.glob(PART))

    # A. "the latest month", written as one query vs as two
    src = f"read_parquet('{PART}', hive_partitioning = true)"
    slow = (f"SELECT round(sum(fare + tip), 2) FROM {src} "
            f"WHERE month = (SELECT max(month) FROM {src})")
    latest = con.execute(f"SELECT max(month) FROM {src}").fetchone()[0]     # one tiny query first...
    fast = f"SELECT round(sum(fare + tip), 2) FROM {src} WHERE month = {latest}"   # ...then a literal
    tA1, tA2 = timed(lambda: con.execute(slow).fetchall()), timed(lambda: con.execute(fast).fetchall())
    print(f"A. PUSHDOWN   WHERE month = (SELECT max(month) ...):  {tA1:7.1f} ms   {files_scanned(con, slow)}")
    print(f"              WHERE month = {latest} (looked up first):    {tA2:7.1f} ms   {files_scanned(con, fast)}")
    print(f"              {tA1 / tA2:.1f}x here, and the gap grows with the data: a value hidden inside a")
    print(f"              subquery is unknown when the planner decides which files to open, so it opens all of them\n")

    # B. fetch everything, then filter in Python
    def fetch_then_filter():
        rows = con.execute("SELECT * FROM 'data/rides.parquet'").fetchall()
        return round(sum(r[5] + r[6] for r in rows if r[1] == 12), 2)
    tB1 = timed(fetch_then_filter)
    tB2 = timed(lambda: con.execute("SELECT round(sum(fare + tip), 2) FROM 'data/rides.parquet' WHERE month = 12").fetchall())
    print(f"B. FETCH-FILTER  SELECT * then filter in Python:  {tB1:7.1f} ms   (60,000 rows x 12 columns cross into Python)")
    print(f"                 WHERE month = 12 in SQL:         {tB2:7.1f} ms   (about 5,000 rows x 2 columns are touched)")
    print(f"                 {tB1 / tB2:.0f}x: move the filter to the data, not the data to the filter\n")

    # C. one query per group
    def loop():
        return [con.execute(f"SELECT round(sum(fare + tip), 2) FROM 'data/rides.parquet' WHERE month = {m}").fetchone()[0]
                for m in range(1, 13)]
    tC1 = timed(loop)
    tC2 = timed(lambda: con.execute("SELECT month, round(sum(fare + tip), 2) FROM 'data/rides.parquet' GROUP BY month ORDER BY month").fetchall())
    print(f"C. LOOP       twelve queries, one per month:      {tC1:7.1f} ms   (twelve scans of the file)")
    print(f"              one GROUP BY month:                 {tC2:7.1f} ms   (one scan)")
    print(f"              {tC1 / tC2:.1f}x: a for-loop over groups is a join the engine never got to plan\n")

    print("Think about these for class:")
    print("  1. In A both queries are correct and both filter on month. Why can the")
    print("     planner prune for the literal but not for the subquery? (When is each known?)")
    print("  2. In B, roughly how many bytes crossed from DuckDB into Python each way?")
    print("  3. C's loop is how most notebooks are written. Rewrite one loop from your")
    print("     own work as a single GROUP BY, in your head, and say what it saved.")


if __name__ == "__main__":
    main()
