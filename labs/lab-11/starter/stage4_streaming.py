from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image
import pyarrow.parquet as pq
import ray
import ray.data

from ray_images import process_row


if __name__ == "__main__":
    with TemporaryDirectory() as directory:
        source = Path(directory) / "images"
        output = Path(directory) / "processed"
        source.mkdir()
        for value in range(8):
            image = np.full((10, 10, 3), value, dtype=np.uint8)
            Image.fromarray(image).save(source / f"{value}.png")
        ray.init(include_dashboard=False, log_to_driver=False)
        try:
            dataset = ray.data.read_images(str(source))
            dataset.map(process_row).write_parquet(str(output))
            rows = sum(pq.read_metadata(file).num_rows for file in output.glob("*.parquet"))
            print("written rows:", rows)
        finally:
            ray.shutdown()
