"""Maintainer regressions for independent Lab 8–11 checks; never grade students.

Only temporary student copies are completed. Each target must pass with the
other TODOs still unfinished, and incorrect target implementations must fail.
"""
import ast
from contextlib import contextmanager
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
HARNESSES = {8: "test_duckdb.py", 9: "test_vector.py", 10: "test_rag.py", 11: "test_sparkray.py"}
MODULES = {
    9: {"BruteForceIndex.search": "microvector.py", "IVFIndex._build": "microvector.py",
        "IVFIndex.search": "microvector.py"},
    10: {"Retriever.__init__": "micro_rag.py", "Retriever.retrieve": "micro_rag.py",
         "build_prompt": "micro_rag.py"},
    11: {"map_words": "mapreduce.py", "partition_for": "mapreduce.py", "shuffle": "mapreduce.py",
         "reduce_counts": "mapreduce.py", "word_counts": "spark_wordcount.py",
         "knn_remote": "ray_speedup.py", "knn_all_parallel": "ray_speedup.py"},
}

# Alternate implementations, independent of the harness's fixture helpers.
GOOD = {
    "Retriever.__init__": '''
        self.chunks = chunks
        self.index = BruteForceIndex(list(map(lambda chunk: embed(chunk["text"]), chunks)))
    ''',
    "Retriever.retrieve": '''
        return [dict(self.chunks[i], score=score)
                for score, i in self.index.search(embed(question), k)]
    ''',
    "build_prompt": '''
        lines = ["[{}] {}: {}".format(c["doc"], c["title"], c["text"]) for c in retrieved]
        return "\\n\\n".join(["Answer using ONLY the sources below. Cite as [doc_id].",
                               "\\n".join(lines), "Question: " + question])
    ''',
    "map_words": '''
        return list(zip(re.findall(r"[a-z]+", text.lower()),
                        [1] * len(re.findall(r"[a-z]+", text.lower()))))
    ''',
    "partition_for": "return hash(key) % n_partitions",
    "shuffle": '''
        partitions = [dict() for _ in range(n_partitions)]
        for key, value in pairs:
            bucket = partitions[partition_for(key, n_partitions)]
            if key not in bucket:
                bucket[key] = []
            bucket[key] += [value]
        return partitions
    ''',
    "reduce_counts": "return word, sum(values)",
    "word_counts": '''
        words = lines.flatMap(lambda line: re.findall(r"[a-z]+", line.lower()))
        return words.map(lambda word: (word, 1)).reduceByKey(lambda a, b: a + b)
    ''',
    "knn_remote": "return neighbors(doc)",
    "knn_all_parallel": '''
        refs = []
        for doc in docs:
            refs.append(knn_remote.remote(doc))
        return ray.get(refs)
    ''',
}
BAD = {
    "BruteForceIndex.search": "return []",
    "IVFIndex._build": "self.lists[0] = list(range(len(self.vectors)))",
    "IVFIndex.search": "return []",
    "Retriever.__init__": "self.chunks = chunks; self.index = BruteForceIndex([])",
    "Retriever.retrieve": "return []",
    "build_prompt": "return question",
    "map_words": "return [(text.lower(), 1)]",
    "partition_for": "return 0",
    "shuffle": "return [{} for _ in range(n_partitions)]",
    "reduce_counts": "return word, len(values)",
    "word_counts": "return lines.collect()",
    "knn_remote": "return [doc]",
    "knn_all_parallel": "return [ray.get(knn_remote.remote(doc)) for doc in docs]",
}


def find_function(tree, target):
    if "." in target:
        cls, name = target.split(".")
        owner = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == cls)
    else:
        owner, name = tree, target
    return next((node for node in owner.body if isinstance(node, ast.FunctionDef) and node.name == name), None)


def complete_function(directory, lab, target, bad=False, body=None):
    path = directory / MODULES[lab][target]
    tree = ast.parse(path.read_text())
    fn = find_function(tree, target)
    if fn is None:
        assert target == "knn_remote"
        fn = ast.parse("@ray.remote\ndef knn_remote(doc):\n    pass\n").body[0]
        tree.body.append(fn)
    if body is not None:
        fn.body = ast.parse(textwrap.dedent(body)).body
    elif lab == 9 and not bad:
        # Lab 10 ships the complete, public Lab 9 implementation.
        reference = ast.parse((ROOT / "labs/lab-10/starter/microvector.py").read_text())
        fn.body = find_function(reference, target).body
    else:
        fn.body = ast.parse(textwrap.dedent((BAD if bad else GOOD)[target])).body
    path.write_text(ast.unparse(ast.fix_missing_locations(tree)) + "\n")


@contextmanager
def starter(lab, data=False):
    with tempfile.TemporaryDirectory(prefix=f"lab{lab}-unit-regression-") as tmp:
        target = Path(tmp)
        source = ROOT / "labs" / f"lab-{lab:02d}" / "starter"
        for file in source.glob("*.py"):
            shutil.copy2(file, target)
        if data:
            if lab == 8:
                for name in ("rides_2024_sample.csv.gz", "taxi_zone_lookup.csv", "assignment.sql"):
                    shutil.copy2(source / name, target)
            elif (source / "data").exists():
                shutil.copytree(source / "data", target / "data")
        yield target


class IncrementalLateLabsTests(unittest.TestCase):
    def run_harness(self, directory, lab, *args, code=None):
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1", LLM_BASE_URL="")
        command = [sys.executable, HARNESSES[lab], *args] if code is None else [sys.executable, "-c", code]
        return subprocess.run(command, cwd=directory, env=env, capture_output=True,
                              text=True, timeout=90)

    def assert_pass(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_list_and_help_do_not_load_data_or_optional_engines(self):
        for lab in HARNESSES:
            with self.subTest(lab=lab), starter(lab) as directory:
                # Fail loudly if the metadata-only CLI imports optional engines.
                for name in ("duckdb", "ray", "pyspark"):
                    (directory / (name + ".py")).write_text("raise AssertionError('optional engine imported')\n")
                if lab == 11:
                    (directory / "corpus.py").write_text("raise AssertionError('corpus loaded')\n")
                for option in ("--list", "--help"):
                    result = self.run_harness(directory, lab, option)
                    self.assert_pass(result)
                    self.assertNotIn("[FAIL]", result.stdout)
                result = self.run_harness(directory, lab, "--unit", "typo")
                self.assertEqual(result.returncode, 2)
                self.assertIn("invalid choice", result.stderr)

    def test_each_target_accepts_only_that_completed_function(self):
        for lab, targets in MODULES.items():
            for target in targets:
                with self.subTest(lab=lab, target=target), starter(lab) as directory:
                    complete_function(directory, lab, target)
                    result = self.run_harness(directory, lab, "--unit", target)
                    self.assert_pass(result)
                    self.assertIn("1/1 unit checks passed (not the grading score)", result.stdout)
                    self.assertIn(f"[PASS] UNIT: {target}", result.stdout)
                    # Running the whole unit suite must still reveal unfinished siblings.
                    result = self.run_harness(directory, lab, "--unit")
                    self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                    self.assertIn("[FAIL]", result.stdout)
                    self.assertIn(f"1/{len(targets)} unit checks passed (not the grading score)", result.stdout)

    def test_wrong_target_never_falls_back_to_the_fixture(self):
        for lab, targets in MODULES.items():
            for target in targets:
                with self.subTest(lab=lab, target=target), starter(lab) as directory:
                    complete_function(directory, lab, target, bad=True)
                    result = self.run_harness(directory, lab, "--unit", target, "-v")
                    self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                    self.assertIn(f"[FAIL] UNIT: {target}", result.stdout)
                    self.assertIn("0/1 unit checks passed (not the grading score)", result.stdout)
                    self.assertIn("Traceback", result.stderr)

    def test_unit_fixtures_restore_modules_on_success_and_failure(self):
        with starter(11) as directory:
            result = self.run_harness(directory, 11, code='''
import sys
from types import ModuleType
from unittest.mock import patch
import test_sparkray as h
originals = {name: ModuleType(name) for name in ('corpus', 'embeddings', 'ray')}
with patch.dict(sys.modules, originals):
    for name, ray in [('mapreduce', None), ('ray_speedup', h.FixtureRay())]:
        for fail in (False, True):
            try:
                with h.fixture_module(name, ray):
                    assert sys.modules['corpus'] is not originals['corpus']
                    if fail:
                        raise RuntimeError('fixture failure')
            except RuntimeError:
                pass
            for key, value in originals.items():
                assert sys.modules[key] is value, key
    assert h.main(['--unit', 'shuffle']) == 1
    for key, value in originals.items():
        assert sys.modules[key] is value, key
''')
            self.assert_pass(result)

    def test_unit_fixtures_do_not_complete_student_methods(self):
        for lab in (9, 10):
            with self.subTest(lab=lab), starter(lab) as directory:
                target = "IVFIndex.search" if lab == 9 else "Retriever.retrieve"
                complete_function(directory, lab, target)
                module = "microvector" if lab == 9 else "micro_rag"
                cls = "IVFIndex" if lab == 9 else "Retriever"
                sibling = "_build" if lab == 9 else "__init__"
                harness = HARNESSES[lab][:-3]
                result = self.run_harness(directory, lab, code=f'''
import {harness} as h
from {module} import {cls}
original = {cls}.{sibling}
assert h.main(['--unit', {target!r}]) == 0
assert {cls}.{sibling} is original
try:
    {cls}([])
except (NotImplementedError, ValueError):
    pass
else:
    raise AssertionError('fixture replaced an unfinished sibling')
''')
                self.assert_pass(result)

    def test_ivf_targets_can_reuse_unfinished_exact_search(self):
        implementations = {
            'IVFIndex._build': '''
                centroids = BruteForceIndex(self.centroids)
                for i, vector in enumerate(self.vectors):
                    self.lists[centroids.search(vector, 1)[0][1]].append(i)
            ''',
            'IVFIndex.search': '''
                clusters = sorted(range(len(self.centroids)),
                                  key=lambda c: (-dot(query, self.centroids[c]), c))[:probe]
                ids = sorted(i for c in clusters for i in self.lists[c])
                exact = BruteForceIndex([self.vectors[i] for i in ids])
                hits = exact.search(query, k)
                self.comparisons += len(self.centroids) + exact.comparisons
                return [(score, ids[i]) for score, i in hits]
            ''',
        }
        for target, body in implementations.items():
            with self.subTest(target=target), starter(9) as directory:
                complete_function(directory, 9, target, body=body)
                result = self.run_harness(directory, 9, code=f'''
from unittest.mock import patch
import test_vector as h
original = h.BruteForceIndex.search
assert h.main(['--unit', {target!r}]) == 0
assert h.BruteForceIndex.search is original
with patch.object(h.IVFIndex, {target.split('.')[1]!r}, side_effect=RuntimeError('broken target')):
    assert h.main(['--unit', {target!r}]) == 1
assert h.BruteForceIndex.search is original
try:
    h.BruteForceIndex([]).search([1.0, 0.0], 1)
except NotImplementedError:
    pass
else:
    raise AssertionError('exact-search fixture escaped the selected IVF check')
''')
                self.assert_pass(result)

    def test_original_integration_tests_work_when_called_after_import(self):
        for lab, data_name in ((9, 'VECTORS'), (10, 'CHUNKS'), (11, 'DOCS')):
            with self.subTest(lab=lab), starter(lab, data=True) as directory:
                for target in MODULES[lab]:
                    complete_function(directory, lab, target)
                harness = HARNESSES[lab][:-3]
                result = self.run_harness(directory, lab, code=f'''
import {harness} as h
assert not h._INTEGRATION_LOADED, 'import must leave integration data unloaded'
tests = [fn for name, fn in vars(h).items() if name.startswith('test_') and callable(fn)]
assert len(tests) == 7
for test in tests:
    test()
assert h._INTEGRATION_LOADED
data = getattr(h, {data_name!r})
h.load_integration()
assert getattr(h, {data_name!r}) is data, 'the loader must not rebuild existing data'
''')
                self.assert_pass(result)

    def test_complete_implementations_keep_original_default_groups(self):
        for lab, groups in ((9, ('EXACT', 'IVF', 'QUALITY')),
                            (10, ('RETRIEVE', 'QUALITY', 'PROMPT')),
                            (11, ('OFFLINE', 'SPARK', 'RAY'))):
            with self.subTest(lab=lab), starter(lab, data=True) as directory:
                for target in MODULES[lab]:
                    complete_function(directory, lab, target)
                # Force the original optional-engine skip paths; no services start.
                if lab == 11:
                    for name in ('ray', 'pyspark'):
                        (directory / (name + '.py')).write_text("raise ImportError('optional dependency absent')\n")
                self.assert_pass(self.run_harness(directory, lab, '--unit'))
                result = self.run_harness(directory, lab)
                self.assert_pass(result)
                self.assertIn('7/7 tests passed', result.stdout)
                self.assertNotIn('UNIT checks', result.stdout)
                for group in groups:
                    self.assertIn(group + ' group', result.stdout)
                if lab == 11:
                    self.assertIn('[SKIP] SPARK', result.stdout)
                    self.assertIn('[SKIP] RAY', result.stdout)

    @unittest.skipUnless(importlib.util.find_spec('duckdb'), 'DuckDB needed for SQL execution')
    def test_lab8_selected_queries_ignore_other_blank_or_broken_queries(self):
        with starter(8, data=True) as directory:
            spec = importlib.util.spec_from_file_location('lab8_harness', directory / HARNESSES[8])
            harness = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(harness)
            for n, (sql, _) in harness.REFERENCE.items():
                with self.subTest(query=n):
                    sections = [f'-- Q{i}: query\n' + (sql if i == n else 'SELECT unfinished FROM missing_table')
                                + ';\n' for i in harness.REFERENCE]
                    (directory / 'assignment.sql').write_text('\n'.join(sections))
                    result = self.run_harness(directory, 8, '--unit', f'Q{n}')
                    self.assert_pass(result)
                    self.assertIn('1/1 tests passed', result.stdout)
                    (directory / 'assignment.sql').write_text(f'-- Q{n}: query\nSELECT 0;\n')
                    result = self.run_harness(directory, 8, '--unit', f'Q{n}')
                    self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            (directory / 'assignment.sql').write_text('\n'.join(
                f'-- Q{n}: query\n{sql};\n' for n, (sql, _) in harness.REFERENCE.items()))
            result = self.run_harness(directory, 8)
            self.assert_pass(result)
            self.assertIn('8/8 tests passed', result.stdout)


if __name__ == '__main__':
    unittest.main()
