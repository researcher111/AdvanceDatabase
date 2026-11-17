import numpy as np
import ray

from ray_images import PixelCounter, process_and_count


if __name__ == "__main__":
    ray.init(include_dashboard=False, log_to_driver=False)
    try:
        images = [np.full((10, 10, 3), value, dtype=np.uint8) for value in range(8)]
        counter = PixelCounter.remote()
        refs = [process_and_count.remote(image, counter) for image in images]
        results = ray.get(refs)
        print("images:", len(results))
        print("pixels:", ray.get(counter.get_total.remote()))
        print("RGB channel values:", sum(image.size for image in images))
    finally:
        ray.shutdown()
