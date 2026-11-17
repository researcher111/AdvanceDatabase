import numpy as np
import ray

from ray_images import process_image


total = 0


@ray.remote
def process_and_count_global(image):
    global total
    processed = process_image(image)
    total += image.shape[0] * image.shape[1]
    return processed


if __name__ == "__main__":
    ray.init(include_dashboard=False, log_to_driver=False)
    try:
        images = [np.full((10, 10, 3), value, dtype=np.uint8) for value in range(8)]
        refs = [process_and_count_global.remote(image) for image in images]
        results = ray.get(refs)
        print("images:", len(results))
        print("expected pixels:", sum(image.shape[0] * image.shape[1] for image in images))
        print("driver pixels:", total)
    finally:
        ray.shutdown()
