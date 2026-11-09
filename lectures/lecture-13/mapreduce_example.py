"""MapReduce teaching simulation in one process, without distributed execution."""
import re


def map_order(order):
    """Emit one pair for each requested meal, including repeats."""
    pairs = []
    for meal in re.findall(r"[a-z]+", order.lower()):
        pairs.append((meal, 1))
    return pairs


def shuffle_pairs(pairs):
    """Collect all values for each meal in one list."""
    groups = {}
    for meal, value in pairs:
        if meal not in groups:
            groups[meal] = []
        groups[meal].append(value)
    return groups


def reduce_meal(meal, values):
    """Add the values for one meal and return its total."""
    return (meal, sum(values))


def main():
    orders = ["Pizza, pizza!", "Salad pizza."]
    mapped = []
    for order in orders:
        mapped.extend(map_order(order))
    print("Map output:", mapped)

    grouped = shuffle_pairs(mapped)
    print("Shuffle output:", grouped)

    totals = []
    for meal, values in grouped.items():
        totals.append(reduce_meal(meal, values))
    print("Reduce output:", totals)


if __name__ == "__main__":
    main()
