"""Lab 8, Part 3 — measure the columnar bets. Run:  python3 measure_parquet.py

Three measurements over identical rows, then microdb's cameo:

    1. FORMAT:     full-table aggregate — CSV vs Parquet
    2. PROJECTION: 2 columns of 8 — Parquet reads only what you ask
    3. PRUNING:    month = 12 — partitioned Parquet opens 1 file of 12

Counts are deterministic; times are your machine's (representative).
Requires data/ from gen_data.py.
"""

import glob
import time

import duckdb


def timed(con, sql, n=5):
    """Median-ish: run n times, report the best (steadiest for tiny queries)."""
    best = float("inf")
    for _ in range(n):
        t0 = time.perf_counter()
        con.execute(sql).fetchall()
        best = min(best, time.perf_counter() - t0)
    return best * 1000


def main():
    con = duckdb.connect()

    q_csv = "SELECT round(sum(fare + tip), 2) FROM 'data/rides.csv'"
    q_par = "SELECT round(sum(fare + tip), 2) FROM 'data/rides.parquet'"
    t_csv, t_par = timed(con, q_csv), timed(con, q_par)
    print(f"1. FORMAT     sum over 60k rows:   CSV {t_csv:7.1f} ms   "
          f"Parquet {t_par:6.1f} ms   ({t_csv / t_par:4.1f}x)")

    q_all = "SELECT round(avg(fare), 2), round(avg(distance), 2) FROM 'data/rides.parquet'"
    t_two = timed(con, q_all)
    print(f"2. PROJECTION 2 columns of 8 (Parquet): {t_two:6.1f} ms · "
          f"columnar layout reads only the columns named")

    part_glob = "data/rides_by_month/*/*.parquet"
    n_files = len(glob.glob(part_glob))
    q_one = (f"SELECT count(*), round(sum(fare + tip), 2) "
             f"FROM read_parquet('{part_glob}', hive_partitioning = true) "
             f"WHERE month = 12")
    t_pruned = timed(con, q_one)
    plan = con.execute("EXPLAIN " + q_one).fetchall()[0][1]
    pruned = "month=12" in plan or "File Filters" in plan or "1/12" in plan
    print(f"3. PRUNING    month = 12 over {n_files} partition files: {t_pruned:6.1f} ms")
    print(f"              EXPLAIN confirms the filter reached the file level: "
          f"{'yes' if pruned else 'check the plan below'}")
    print("\n   the plan's scan node:")
    for line in plan.splitlines():
        if any(k in line for k in ("PARQUET", "Filters", "month", "File")):
            print("   " + line.rstrip())

    print("\nRecord all numbers, then think about these for class:")
    print("  1. Parquet beat CSV on the same rows. Name the TWO separate")
    print("     reasons (think: parsing, and which bytes move at all).")
    print("  2. Your microdb stores rows; Parquet stores columns. For which")
    print("     of this course's workloads was row storage the right call?")
    print("  3. Partition pruning is predicate pushdown pushed how far?")


if __name__ == "__main__":
    main()
