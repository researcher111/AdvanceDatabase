"""Lab 8 test harness — run:  python3 test_duckdb.py

Parses your assignment.sql (one query under each "-- Qn:" marker), runs
each against DuckDB, and diffs the result against the reference answer
computed live from the same data. Ordered questions (2, 4, 5, 6) compare
exactly; unordered ones compare as sets.

Run gen_data.py once first. Requires: pip install duckdb
"""

import re
import sys

import duckdb

# Reference queries — the harness's own answers, computed at test time so
# they can never drift from the data. (Yes, you could read these. The
# point of the lab is understanding them, and the Gradescope superset
# uses variants.)
REFERENCE = {
    1: ("SELECT count(*) AS n_rides, round(sum(fare + tip), 2) AS revenue FROM rides", False),
    2: ("SELECT month, round(sum(fare + tip), 2) AS revenue FROM rides "
        "GROUP BY month ORDER BY month", True),
    3: ("SELECT payment, count(*) AS n, round(avg(distance), 2) AS avg_distance "
        "FROM rides GROUP BY payment ORDER BY payment", True),
    4: ("SELECT ride_id, fare FROM rides ORDER BY fare DESC, ride_id LIMIT 5", True),
    5: ("SELECT month, round(avg(CASE WHEN payment = 'card' THEN 1.0 ELSE 0.0 END), 3) "
        "AS card_share FROM rides GROUP BY month ORDER BY month", True),
    6: ("SELECT month, round(sum(fare + tip), 2) AS revenue, "
        "round(sum(sum(fare + tip)) OVER (ORDER BY month), 2) AS running_revenue "
        "FROM rides GROUP BY month ORDER BY month", True),
    7: ("SELECT count(*) AS n_rides, round(sum(fare + tip), 2) AS revenue "
        "FROM read_parquet('data/rides_by_month/*/*.parquet', hive_partitioning = true) "
        "WHERE month IN (10, 11, 12)", False),
}

RESULTS = []


def check(name, fn):
    try:
        fn()
        RESULTS.append(True)
        print(f"  [PASS] SQL: {name}")
    except Exception as e:
        RESULTS.append(False)
        print(f"  [FAIL] SQL: {name} — {type(e).__name__}: {e}")


def parse_assignment(path="assignment.sql"):
    """{q_number: sql} for every non-empty stub."""
    text = open(path).read()
    chunks = re.split(r"^-- Q(\d+):", text, flags=re.M)
    out = {}
    for i in range(1, len(chunks), 2):
        n = int(chunks[i])
        body = chunks[i + 1]
        sql = "\n".join(line for line in body.splitlines()
                        if not line.strip().startswith("--")).strip().rstrip(";")
        if sql:
            out[n] = sql
    return out


def run(con, sql):
    return con.execute(sql).fetchall()


def main():
    import os
    if not os.path.exists("data/rides.csv"):
        print("data/ missing — generating it first (gen_data.py)...")
        import gen_data
        gen_data.main()
    con = duckdb.connect()
    con.execute("CREATE TABLE rides AS SELECT * FROM 'data/rides.csv'")

    student = parse_assignment()
    for n in sorted(REFERENCE):
        ref_sql, ordered = REFERENCE[n]

        def one(n=n, ref_sql=ref_sql, ordered=ordered):
            if n not in student:
                raise AssertionError("no query written under this marker yet")
            got = run(con, student[n])
            want = run(con, ref_sql)
            if ordered:
                ok = got == want
            else:
                ok = sorted(map(tuple, got)) == sorted(map(tuple, want))
            if not ok:
                raise AssertionError(
                    f"result differs: yours starts {got[:2]}, expected starts {want[:2]} "
                    f"({len(got)} vs {len(want)} rows)")

        check(f"Q{n} " + {1: "totals", 2: "revenue by month", 3: "distance by payment",
                          4: "top-5 fares", 5: "card share", 6: "running revenue",
                          7: "partitioned Q4 totals"}[n], one)

    n_pass = sum(RESULTS)
    print(f"\n{n_pass}/{len(RESULTS)} tests passed")
    sys.exit(0 if n_pass == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
