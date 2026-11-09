"""Count a tiny lunch fixture with Spark on this computer."""
import argparse
import re
from operator import add

from pyspark import SparkContext


def split_order(order):
    """Return one word per meal request, including repeats."""
    return re.findall(r"[a-z]+", order.lower())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--plan", action="store_true", help="Print the RDD dependencies."
    )
    args = parser.parse_args()

    sc = SparkContext(master="local[2]", appName="Lunch counts")
    try:
        orders = ["Pizza, pizza!", "Salad pizza."]
        source = sc.parallelize(orders, numSlices=2)

        # These transformations describe work. They do not start the count.
        meals = source.flatMap(split_order)
        pairs = meals.map(lambda meal: (meal, 1))
        counts = pairs.reduceByKey(add, numPartitions=2)

        if args.plan:
            print(counts.toDebugString().decode("utf-8"))

        # collect starts the job and brings this small result to the driver.
        totals = dict(sorted(counts.collect()))
        print("Totals:", totals)
    finally:
        sc.stop()


if __name__ == "__main__":
    main()
