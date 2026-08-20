"""Lab 8 — generate the rides dataset. Run once:  python3 gen_data.py

Creates, deterministically (seeded — everyone gets identical data):

    data/rides.csv                 60,000 ride records for 2026
    data/rides.parquet             the same rows, columnar
    data/rides_by_month/month=N/   the same rows, hive-partitioned by month

Schema: ride_id INT · month INT · day INT · passengers INT ·
        distance DOUBLE (miles) · fare DOUBLE · tip DOUBLE ·
        payment TEXT ('card' | 'cash')

Requires: pip install duckdb            (that's the whole stack)
"""

import os
import random

import duckdb

N = 60_000
SEED = 6042


def main():
    rng = random.Random(SEED)
    os.makedirs("data", exist_ok=True)
    with open("data/rides.csv", "w") as f:
        f.write("ride_id,month,day,passengers,distance,fare,tip,payment\n")
        for i in range(N):
            month = rng.choices(range(1, 13),
                                weights=[7, 6, 7, 8, 9, 10, 10, 9, 9, 10, 8, 12])[0]
            day = rng.randint(1, 28)
            passengers = rng.choices([1, 2, 3, 4], weights=[62, 22, 9, 7])[0]
            distance = round(rng.lognormvariate(0.9, 0.7), 2)
            fare = round(2.5 + distance * 2.4 + rng.uniform(0, 2), 2)
            payment = "card" if rng.random() < 0.72 else "cash"
            tip = round(fare * rng.uniform(0.1, 0.25), 2) if payment == "card" else 0.0
            f.write(f"{i},{month},{day},{passengers},{distance},{fare},{tip},{payment}\n")

    con = duckdb.connect()
    con.execute("CREATE TABLE rides AS SELECT * FROM 'data/rides.csv'")
    con.execute("COPY rides TO 'data/rides.parquet' (FORMAT parquet)")
    con.execute("""
        COPY rides TO 'data/rides_by_month'
        (FORMAT parquet, PARTITION_BY (month), OVERWRITE_OR_IGNORE)
    """)
    n = con.execute("SELECT count(*) FROM rides").fetchone()[0]
    print(f"wrote data/rides.csv, data/rides.parquet, "
          f"data/rides_by_month/ (12 partitions) — {n:,} rows")


if __name__ == "__main__":
    main()
