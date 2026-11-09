"""Count a tiny lunch fixture with Ray on this computer."""
import re

import ray


@ray.remote
def count_order(order):
    """Count every meal request in one order."""
    counts = {}
    for meal in re.findall(r"[a-z]+", order.lower()):
        counts[meal] = counts.get(meal, 0) + 1
    return counts


def main():
    ray.init(num_cpus=2, include_dashboard=False)
    try:
        orders = ["Pizza, pizza!", "Salad pizza."]

        # Submit both tasks before waiting for either result.
        refs = []
        for order in orders:
            refs.append(count_order.remote(order))

        # The driver waits for both dictionaries, then combines their counts.
        partials = ray.get(refs)
        totals = {}
        for partial in partials:
            for meal, count in partial.items():
                totals[meal] = totals.get(meal, 0) + count

        print("Task results:", partials)
        print("Totals:", dict(sorted(totals.items())))
    finally:
        ray.shutdown()


if __name__ == "__main__":
    main()
