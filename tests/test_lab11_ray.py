import ast
from contextlib import contextmanager
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "labs/lab-11/starter"
HAS_NUMPY = importlib.util.find_spec("numpy") is not None
TARGETS = ("process_image_task", "process_parallel", "PixelCounter.add",
           "PixelCounter.get_total", "process_and_count", "process_row")
BAD = {
    "process_image_task": "return 255 - image",
    "process_parallel": "return [ray.get(process_image_task.remote(image)) for image in images]",
    "PixelCounter.add": "self.total = count",
    "PixelCounter.get_total": "return 0",
    "process_and_count": "result = process_image(image)\ncounter.add.remote(image.shape[0] * image.shape[1])\nreturn result",
    "process_row": "row['image'] = process_image(row['image'])\nreturn row",
}


@contextmanager
def starter():
    with tempfile.TemporaryDirectory(prefix="lab11-ray-") as name:
        directory = Path(name)
        for file in ("ray_images.py", "test_ray_images.py"):
            shutil.copy2(SOURCE / file, directory / file)
        yield directory


def replace(directory, target, body, decorated=None):
    path = directory / "ray_images.py"
    tree = ast.parse(path.read_text())
    owner = tree
    if "." in target:
        cls, target = target.split(".")
        owner = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == cls)
    function = next(node for node in owner.body if isinstance(node, ast.FunctionDef) and node.name == target)
    function.body = ast.parse(body).body
    if decorated is not None:
        function.decorator_list = [ast.parse("ray.remote", mode="eval").body] if decorated else []
    path.write_text(ast.unparse(ast.fix_missing_locations(tree)) + "\n")


class RayLabTests(unittest.TestCase):
    def run_harness(self, directory, *args, code=None, timeout=60):
        command = [sys.executable, "test_ray_images.py", *args] if code is None else [sys.executable, "-c", code]
        return subprocess.run(command, cwd=directory, capture_output=True, text=True,
                              env=dict(os.environ, PYTHONDONTWRITEBYTECODE="1"), timeout=timeout)

    def assert_pass(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_starter_preserves_six_unfinished_targets_and_small_provided_operation(self):
        tree = ast.parse((SOURCE / "ray_images.py").read_text())
        unfinished = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and len(node.body) == 1 and isinstance(node.body[0], ast.Raise):
                unfinished.append(node.name)
        self.assertCountEqual(unfinished, [name.split(".")[-1] for name in TARGETS])
        for name in ("ray_images.py", "demo_ray.py"):
            text = (SOURCE / name).read_text()
            self.assertNotIn("#", text)
            for node in ast.walk(ast.parse(text)):
                if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef)):
                    self.assertIsNone(ast.get_docstring(node))

    def test_metadata_commands_need_no_dependencies(self):
        with starter() as directory:
            for name in ("ray", "numpy"):
                (directory / (name + ".py")).write_text("raise AssertionError('dependency imported')\n")
            for option in ("--list", "--help"):
                result = self.run_harness(directory, option)
                self.assert_pass(result)
            result = self.run_harness(directory, "--list")
            self.assertEqual(result.stdout.splitlines(), list(TARGETS))
            result = self.run_harness(directory, "--unit", "unknown")
            self.assertEqual(result.returncode, 2)

    def test_missing_required_dependency_fails_all_checks(self):
        with starter() as directory:
            (directory / "numpy.py").write_text("raise ImportError('missing numpy for regression')\n")
            result = self.run_harness(directory)
            self.assertEqual(result.returncode, 1)
            self.assertIn("0/7 checks passed", result.stdout)
            self.assertEqual(result.stdout.count("[FAIL]"), 7)
            self.assertNotIn("[SKIP]", result.stdout)
            self.assertIn("requirements-ray.txt", result.stdout)

    @unittest.skipUnless(HAS_NUMPY, "NumPy required for image contracts")
    def test_missing_ray_never_becomes_an_optional_skip(self):
        with starter() as directory:
            (directory / "ray.py").write_text("raise ImportError('missing ray for regression')\n")
            result = self.run_harness(directory)
            self.assertEqual(result.returncode, 1)
            self.assertIn("0/7 checks passed", result.stdout)
            self.assertEqual(result.stdout.count("[FAIL]"), 7)
            self.assertNotIn("[SKIP]", result.stdout)

    @unittest.skipUnless(HAS_NUMPY, "NumPy required for image contracts")
    def test_incorrect_targets_fail_without_fixture_fallback(self):
        for target, body in BAD.items():
            with self.subTest(target=target), starter() as directory:
                replace(directory, target, body)
                result = self.run_harness(directory, "--unit", target)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn("0/1 checks passed", result.stdout)

    @unittest.skipUnless(HAS_NUMPY, "NumPy required for image contracts")
    def test_pixel_channel_count_and_metadata_loss_are_rejected(self):
        cases = {
            "process_and_count": "result = process_image(image)\nray.get(counter.add.remote(image.size))\nreturn result",
            "process_row": "return {'image': process_image(row['image'])}",
        }
        for target, body in cases.items():
            with self.subTest(target=target), starter() as directory:
                replace(directory, target, body)
                result = self.run_harness(directory, "--unit", target)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn("0/1 checks passed", result.stdout)

    @unittest.skipUnless(HAS_NUMPY, "NumPy required for image contracts")
    def test_remote_wrappers_and_plain_dataset_callable_are_checked(self):
        for target, decorated in (("process_image_task", False), ("process_and_count", False), ("process_row", True)):
            with self.subTest(target=target), starter() as directory:
                replace(directory, target, "raise NotImplementedError", decorated)
                result = self.run_harness(directory, "--unit", target)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn("0/1 checks passed", result.stdout)

    @unittest.skipUnless(HAS_NUMPY, "NumPy required for image contracts")
    def test_fixture_restores_modules_after_success_and_failure(self):
        with starter() as directory:
            result = self.run_harness(directory, code="""
import sys
from types import ModuleType
from unittest.mock import patch
import test_ray_images as harness
original = ModuleType('ray')
with patch.dict(sys.modules, {'ray': original}):
    for fail in (False, True):
        try:
            with harness.fixture_module():
                assert sys.modules['ray'] is not original
                if fail:
                    raise RuntimeError('fixture failure')
        except RuntimeError:
            pass
        assert sys.modules['ray'] is original
""")
            self.assert_pass(result)

if __name__ == "__main__":
    unittest.main()
