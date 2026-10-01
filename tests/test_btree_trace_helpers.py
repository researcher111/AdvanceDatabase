"""Check visual helper traces against the provided Python, without filling TODOs."""
import ast
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'labs/lab-06/starter/btree.py'


class BTreeTraceHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        node = shutil.which('node')
        if not node:
            raise unittest.SkipTest('Node is required to read the browser trace data')
        cls.examples = json.loads(subprocess.check_output(
            [node, '-e', "process.stdout.write(JSON.stringify(require('./labs/_shared/teaching-traces.js').examples))"], cwd=ROOT))
        spec = importlib.util.spec_from_file_location('trace_starter_btree', SOURCE)
        cls.starter = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.starter)

    def test_displayed_helper_code_matches_starter(self):
        source = SOURCE.read_text()
        tree = ast.parse(source)
        for class_name, method, trace_id in [('Node', 'child_index_for', 'btree-child-index'), ('BPlusTree', '_descend', 'btree-descend')]:
            node = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == class_name)
            function = next(n for n in node.body if isinstance(n, ast.FunctionDef) and n.name == method)
            # Skip the docstring; preserve every actual operation and indentation.
            body = function.body[1:]
            code = textwrap.dedent('\n'.join(source.splitlines()[body[0].lineno-1:body[-1].end_lineno]))
            self.assertEqual(code.splitlines(), self.examples[trace_id]['code'])

    def test_child_index_loop_and_short_circuit(self):
        node = self.starter.Node(False)
        node.keys = [31, 36]
        candidates = []
        def trace(frame, event, arg):
            if frame.f_code is node.child_index_for.__func__.__code__ and event == 'line':
                if SOURCE.read_text().splitlines()[frame.f_lineno-1].strip().startswith('while '):
                    candidates.append(frame.f_locals['i'])
            return trace
        previous = sys.gettrace()
        try:
            sys.settrace(trace)
            result = node.child_index_for(36)
        finally:
            sys.settrace(previous)
        self.assertEqual(candidates, [0, 1, 2])
        self.assertEqual(result, int(self.examples['btree-child-index']['frames'][-1]['rows'][0][1]))
        self.assertEqual(node.child_index_for(35), 1)
        self.assertEqual(node.child_index_for(30), 0)
        self.assertEqual(node.keys, [31, 36])

    def test_descent_path_and_node_counter(self):
        tree = self.starter.BPlusTree()
        root, left, right = (self.starter.Node(False), self.starter.Node(True), self.starter.Node(True))
        root.keys, root.children = [36], [left, right]
        left.keys, right.keys, left.next = [28, 31, 34], [36, 37, 39], right
        tree.root, tree.height = root, 2
        actual = tree._descend(36)
        names = {id(root): 'root', id(left): 'left', id(right): 'right'}
        expected = self.examples['btree-descend']['frames'][-1]['tree']['path']
        self.assertEqual([names[id(n)] for n in actual], expected)
        self.assertEqual(tree.nodes_touched, 2)
        self.assertEqual(root.keys, [36])
        self.assertIs(left.next, right)
        self.assertEqual(tree._descend(35), [root, left])
        self.assertEqual(tree.nodes_touched, 4, 'the counter accumulates across calls')
        single = self.starter.BPlusTree()
        self.assertEqual(single._descend(36), [single.root])
        self.assertEqual(single.nodes_touched, 1)


if __name__ == '__main__':
    unittest.main()
