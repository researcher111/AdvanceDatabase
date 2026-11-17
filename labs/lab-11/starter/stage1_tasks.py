import time

import numpy as np
import ray

from ray_images import process_parallel


if __name__ == "__main__":
    ray.init(include_dashboard=False, log_to_driver=False)
    try:
        images = [np.full((10, 10, 3), value, dtype=np.uint8) for value in range(8)]
        start = time.perf_counter()
        results = process_parallel(images)
        print(f"parallel: {time.perf_counter() - start:.2f} seconds")
        print("images:", len(results))
        print("first pixel:", results[0][0, 0])
    finally:
        ray.shutdown()
