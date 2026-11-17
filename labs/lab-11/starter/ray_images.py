import time

import ray


def process_image(image):
    time.sleep(1)
    return 255 - image


@ray.remote
def process_image_task(image):
    raise NotImplementedError


def process_parallel(images):
    raise NotImplementedError


@ray.remote
class PixelCounter:
    def __init__(self):
        self.total = 0

    def add(self, count):
        raise NotImplementedError

    def get_total(self):
        raise NotImplementedError


@ray.remote
def process_and_count(image, counter):
    raise NotImplementedError


def process_row(row):
    raise NotImplementedError
