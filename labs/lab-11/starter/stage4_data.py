import numpy as np
import ray
import ray.data

from ray_images import process_row


if __name__ == "__main__":
    ray.init(include_dashboard=False, log_to_driver=False)
    try:
        images = [np.full((10, 10, 3), value, dtype=np.uint8) for value in range(8)]
        rows = [{"id": i, "image": image} for i, image in enumerate(images)]
        dataset = ray.data.from_items(rows)
        results = dataset.map(process_row).take_all()
        print("rows:", len(results))
        print("IDs:", sorted(row["id"] for row in results))
    finally:
        ray.shutdown()
