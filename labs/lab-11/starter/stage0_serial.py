import time

import numpy as np

from ray_images import process_image


if __name__ == "__main__":
    images = [np.full((10, 10, 3), value, dtype=np.uint8) for value in range(8)]
    start = time.perf_counter()
    results = [process_image(image) for image in images]
    print(f"serial: {time.perf_counter() - start:.2f} seconds")
    print("images:", len(results))
    print("first pixel:", results[0][0, 0])
