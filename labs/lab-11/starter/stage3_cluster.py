import numpy as np
import ray

from ray_images import process_parallel


if __name__ == "__main__":
    ray.init(address="auto")
    try:
        images = [np.full((10, 10, 3), value, dtype=np.uint8) for value in range(8)]
        results = process_parallel(images)
        print("cluster CPUs:", ray.cluster_resources().get("CPU", 0))
        print("images:", len(results))
        print("first pixel:", results[0][0, 0])
    finally:
        ray.shutdown()
