"""Check Lab 3's test harness with unfinished and partially built submissions."""

import os
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
STARTER = ROOT / "labs/lab-03/starter"
REFERENCE = ROOT / "labs/lab-04/starter/record_manager.py"
TARGETS = (
    "Layout.__init__", "RecordPage._field_pos", "RecordPage.get_int",
    "RecordPage.set_int", "RecordPage.get_string", "RecordPage.set_string",
    "RecordPage.insert_after", "RecordPage.next_after", "RecordPage.delete",
    "TableScan.next", "TableScan.insert",
)


class IncrementalRecordTests(unittest.TestCase):
    def run_python(self, *args):
        return subprocess.run(
            [sys.executable, *args], cwd=STARTER, capture_output=True, text=True,
            timeout=30, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )

    def test_cli_lists_every_todo_and_rejects_unknown_targets(self):
        result = self.run_python("test_records.py", "--list")
        self.assertEqual(result.returncode, 0, result.stderr)
        listed = tuple(line for line in result.stdout.splitlines() if "." in line)
        self.assertEqual(listed, TARGETS)
        result = self.run_python("test_records.py", "--unit", "RecordPage.typo")
        self.assertEqual(result.returncode, 2)
        self.assertIn("invalid choice", result.stderr)

    def test_unfinished_starter_does_not_get_credit_from_fixtures(self):
        unit = self.run_python("test_records.py", "--unit")
        self.assertEqual(unit.returncode, 1, unit.stderr)
        self.assertIn("0/11 unit checks passed", unit.stdout)
        selected = self.run_python("test_records.py", "--unit", "RecordPage.get_int")
        self.assertEqual(selected.returncode, 1, selected.stderr)
        self.assertIn("0/1 unit checks passed", selected.stdout)
        integration = self.run_python("test_records.py")
        self.assertEqual(integration.returncode, 1, integration.stderr)
        self.assertIn("0/12 tests passed", integration.stdout)
        self.assertNotIn("[UNIT]", integration.stdout)

    def test_each_completed_method_passes_with_every_other_todo_unfinished(self):
        # Load just one implementation from the already-public Lab 4 reference.
        # All other Lab 3 exercise methods remain the original raising stubs.
        code = '''
import ast
from pathlib import Path
from unittest.mock import patch
import record_manager as student
import test_records as harness

reference = ast.parse(Path(REFERENCE).read_text())
implementations = {}
for cls in reference.body:
    if not isinstance(cls, ast.ClassDef): continue
    for method in cls.body:
        key = cls.name + "." + getattr(method, "name", "")
        if key not in harness.UNIT_TESTS: continue
        namespace = dict(vars(student))
        exec(compile(ast.Module(body=[method], type_ignores=[]), REFERENCE, "exec"), namespace)
        implementations[key] = namespace[method.name]

def current_methods():
    return {name: getattr(getattr(student, name.split(".")[0]), name.split(".")[1])
            for name in harness.UNIT_TESTS}

original = current_methods()
for name, unit in harness.UNIT_TESTS.items():
    owner_name, attr = name.split(".")
    owner = getattr(student, owner_name)
    with patch.object(owner, attr, implementations[name]):
        before = current_methods()
        unit()
        assert current_methods() == before, name + ": a fixture leaked a patch"
    assert current_methods() == original, name + ": selected method was not restored"
    # A method that returns without doing its work must also fail the check.
    with patch.object(owner, attr, lambda *args, **kwargs: None):
        try:
            unit()
        except Exception:
            pass
        else:
            raise AssertionError(name + ": accepted a no-op implementation")

# The original integration checks still run the real methods together.
from contextlib import ExitStack, redirect_stdout
from io import StringIO
with ExitStack() as patches:
    for name, fn in implementations.items():
        owner_name, attr = name.split(".")
        patches.enter_context(patch.object(getattr(student, owner_name), attr, fn))
    output = StringIO()
    with redirect_stdout(output):
        assert harness.main(["--unit"]) == 0
        assert harness.main([]) == 0
    assert "11/11 unit checks passed" in output.getvalue()
    assert "12/12 tests passed" in output.getvalue()
assert current_methods() == original
'''
        result = self.run_python("-c", "REFERENCE = " + repr(str(REFERENCE)) + "\n" + code)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
