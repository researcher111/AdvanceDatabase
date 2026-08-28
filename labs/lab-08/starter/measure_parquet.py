"""Lab 8, Part 3: measure the columnar bets. Run:  python3 measure_parquet.py

Four measurements over identical rows:

    1. FORMAT:     full-table aggregate, CSV vs Parquet
    2. PROJECTION: 2 columns of 12; Parquet reads only what you ask for
    3. PRUNING:    month = 12; partitioned Parquet opens 1 file of 12
    4. PANDAS:     the same GROUP BY three ways: pandas, DuckDB over Parquet,
                   and DuckDB querying the pandas dataframe in place
                   (needs: pip install pandas pyarrow; skipped otherwise)

Counts are deterministic; times are your machine's (representative).
Requires data/ from gen_data.py.
"""

import glob
import time

import duckdb


def timed(fn, n=5):
    """Best of n runs (steadiest for tiny queries). fn is a zero-arg callable."""
    best = float("inf")
    for _ in range(n):
        t0 = time.perf_counter()
        fn()
        best = min(best, time.perf_counter() - t0)
    return best * 1000


def main():
    con = duckdb.connect()
    q = lambda sql: (lambda: con.execute(sql).fetchall())

    q_csv = "SELECT round(sum(fare + tip), 2) FROM 'data/rides.csv'"
    q_par = "SELECT round(sum(fare + tip), 2) FROM 'data/rides.parquet'"
    t_csv, t_par = timed(q(q_csv)), timed(q(q_par))
    print(f"1. FORMAT     sum over 60k rows:   CSV {t_csv:7.1f} ms   "
          f"Parquet {t_par:6.1f} ms   ({t_csv / t_par:4.1f}x)")

    q_two = "SELECT round(avg(fare), 2), round(avg(distance), 2) FROM 'data/rides.parquet'"
    t_two = timed(q(q_two))
    print(f"2. PROJECTION 2 columns of 12 (Parquet): {t_two:6.1f} ms · "
          f"columnar layout reads only the columns named")

    part_glob = "data/rides_by_month/*/*.parquet"
    n_files = len(glob.glob(part_glob))
    q_one = (f"SELECT count(*), round(sum(fare + tip), 2) "
             f"FROM read_parquet('{part_glob}', hive_partitioning = true) "
             f"WHERE month = 12")
    t_pruned = timed(q(q_one))
    plan = con.execute("EXPLAIN " + q_one).fetchall()[0][1]
    pruned = "month=12" in plan or "File Filters" in plan or "1/12" in plan
    print(f"3. PRUNING    month = 12 over {n_files} partition files: {t_pruned:6.1f} ms")
    print(f"              EXPLAIN confirms the filter reached the file level: "
          f"{'yes' if pruned else 'check the plan below'}")
    print("\n   the plan's scan node:")
    for line in plan.splitlines():
        if any(k in line for k in ("PARQUET", "Filters", "month", "File")):
            print("   " + line.rstrip())

    try:
        import pandas as pd
    except ImportError:
        print("\n4. PANDAS     skipped (pip install pandas pyarrow to run it)")
    else:
        t0 = time.perf_counter()
        df = pd.read_parquet("data/rides.parquet")
        t_load = (time.perf_counter() - t0) * 1000
        t_pd = timed(lambda: (df["fare"] + df["tip"]).groupby(df["month"]).sum())
        t_duck = timed(q("SELECT month, sum(fare + tip) FROM 'data/rides.parquet' GROUP BY month"))
        con.register("df", df)          # expose the dataframe to SQL; no copy is made
        t_duck_df = timed(q("SELECT month, sum(fare + tip) FROM df GROUP BY month"))
        print(f"\n4. PANDAS     revenue by month, three ways (pandas load took {t_load:.0f} ms first):")
        print(f"              pandas groupby on the loaded frame:   {t_pd:6.1f} ms")
        print(f"              DuckDB over the Parquet file:         {t_duck:6.1f} ms")
        print(f"              DuckDB over the pandas frame, in place:{t_duck_df:6.1f} ms  "
              f"(no copy: DuckDB scans df's memory)")

    print("\nRecord all numbers, then think about these for class:")
    print("  1. Parquet beat CSV on the same rows. Name the TWO separate")
    print("     reasons (think: parsing, and which bytes move at all).")
    print("  2. Your microdb stores rows; Parquet stores columns. For which")
    print("     of this course's workloads was row storage the right call?")
    print("  3. Partition pruning is predicate pushdown pushed how far?")
    print("  4. In a notebook with the frame already loaded, which of the three")
    print("     GROUP BYs would you reach for, and what would change your mind?")


if __name__ == "__main__":
    main()
