"""Maintainer checks for isolated Lab 6/7 tests; never change student files.

Run: python3 -m unittest discover -s tests -p test_incremental_labs_middle.py -v
Small implementations below exist only to verify the harness can test a single
completed TODO while every other TODO remains the original starter stub.
"""

from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]

TREE_REFERENCES = r'''
import bisect

def search(self, key):
    leaf = self._descend(key)[-1]
    return list(leaf.rids[leaf.keys.index(key)]) if key in leaf.keys else []

def insert(self, key, rid):
    path = self._descend(key)
    leaf = path[-1]
    at = bisect.bisect_left(leaf.keys, key)
    if at < len(leaf.keys) and leaf.keys[at] == key:
        leaf.rids[at].append(rid)
    else:
        leaf.keys.insert(at, key)
        leaf.rids.insert(at, [rid])
    while path and path[-1].is_full():
        node = path.pop()
        self._split(node, path[-1] if path else None)

def split(self, node, parent):
    midpoint = len(node.keys) // 2
    key = node.keys[midpoint]
    right = student.Node(node.leaf)
    if node.leaf:
        right.keys = node.keys[midpoint:]
        right.rids = node.rids[midpoint:]
        del node.keys[midpoint:]
        del node.rids[midpoint:]
        right.next = node.next
        node.next = right
    else:
        right.keys = node.keys[midpoint + 1:]
        right.children = node.children[midpoint + 1:]
        del node.keys[midpoint:]
        del node.children[midpoint + 1:]
    if parent is None:
        parent = student.Node(False)
        parent.children.append(node)
        self.root = parent
        self.height += 1
    at = parent.children.index(node)
    parent.keys.insert(at, key)
    parent.children.insert(at + 1, right)

def key_range(self, lo, hi):
    leaf = self._descend(lo)[-1]
    result = []
    while leaf is not None:
        for key, rids in zip(leaf.keys, leaf.rids):
            if key > hi:
                return result
            if key >= lo:
                result.extend(rids)
        leaf = leaf.next
    return result

references = {
    "BPlusTree.search": search,
    "BPlusTree.insert": insert,
    "BPlusTree._split": split,
    "BPlusTree.range": key_range,
}
'''

TX_REFERENCES = r'''
def set_int(self, block, off, val):
    self.locks.xlock(block, self.txnum)
    buf = self._buf(block)
    self.lm.append({"kind": "SET_INT", "tx": self.txnum,
                   "file": block.filename, "blk": block.blknum, "off": off,
                   "old": buf.contents().get_int(off)})
    buf.contents().set_int(off, val)
    buf.set_modified()

def set_string(self, block, off, val):
    self.locks.xlock(block, self.txnum)
    buf = self._buf(block)
    self.lm.append({"kind": "SET_STR", "tx": self.txnum,
                   "file": block.filename, "blk": block.blknum, "off": off,
                   "old": buf.contents().get_string(off)})
    buf.contents().set_string(off, val)
    buf.set_modified()

def commit(self):
    self.bm.flush_all()
    self.lm.append({"kind": "COMMIT", "tx": self.txnum}, sync=True)
    self.locks.release_all(self.txnum)
    self._unpin_all()

def restore(bm, record):
    block = student.BlockId(record["file"], record["blk"])
    buf = bm.pin(block)
    try:
        if record["kind"] == "SET_INT":
            buf.contents().set_int(record["off"], record["old"])
        else:
            buf.contents().set_string(record["off"], record["old"])
        buf.set_modified()
    finally:
        bm.unpin(buf)

def rollback(self):
    for record in self.lm.records_backwards():
        if record["tx"] != self.txnum:
            continue
        if record["kind"] == "START":
            break
        if record["kind"] in ("SET_INT", "SET_STR"):
            restore(self.bm, record)
    self.bm.flush_all()
    self.lm.append({"kind": "ROLLBACK", "tx": self.txnum}, sync=True)
    self.locks.release_all(self.txnum)
    self._unpin_all()

def recover(fm, bm, lm):
    finished, unfinished = set(), set()
    for record in lm.records_backwards():
        txnum, kind = record["tx"], record["kind"]
        if kind in ("COMMIT", "ROLLBACK"):
            finished.add(txnum)
        elif txnum not in finished:
            unfinished.add(txnum)
            if kind in ("SET_INT", "SET_STR"):
                restore(bm, record)
    bm.flush_all()
    for txnum in sorted(unfinished):
        lm.append({"kind": "ROLLBACK", "tx": txnum}, sync=True)
    return sorted(unfinished)

references = {
    "Transaction.set_int": set_int,
    "Transaction.set_string": set_string,
    "Transaction.commit": commit,
    "Transaction.rollback": rollback,
    "recover": recover,
}
'''

ISOLATION_CHECK = r'''
from unittest.mock import patch

def locate(name):
    if "." in name:
        cls, method = name.split(".")
        return getattr(student, cls), method
    return student, name

originals = {name: getattr(*locate(name)) for name in references}
assert set(harness.UNIT_TESTS) == set(references)
for name, implementation in references.items():
    owner, attribute = locate(name)
    with patch.object(owner, attribute, implementation):
        # recover was imported into the harness by name; update that binding too.
        alias = patch.object(harness, "recover", implementation) if name == "recover" else patch.dict({}, {})
        with alias:
            harness.UNIT_TESTS[name]()
    for other, original in originals.items():
        assert getattr(*locate(other)) is original, f"fixture leaked: {name} changed {other}"
    print("isolated", name)

for name in references:
    # An unimplemented target must fail even though its dependencies are supplied.
    try:
        harness.UNIT_TESTS[name]()
    except NotImplementedError:
        pass
    else:
        raise AssertionError(f"{name}: stub was replaced or accepted")
    owner, attribute = locate(name)
    def broken(*args, **kwargs):
        return []
    with patch.object(owner, attribute, broken):
        alias = patch.object(harness, "recover", broken) if name == "recover" else patch.dict({}, {})
        with alias:
            try:
                harness.UNIT_TESTS[name]()
            except AssertionError:
                pass
            else:
                raise AssertionError(f"{name}: no-op target passed")
    for other, original in originals.items():
        assert getattr(*locate(other)) is original, f"failure leaked a fixture: {name} changed {other}"

# Run the normal command after the scoped unit fixtures have all been used.
import contextlib, io, runpy, sys
out = io.StringIO()
sys.argv = [harness.__file__]
with contextlib.redirect_stdout(out):
    try:
        runpy.run_path(harness.__file__, run_name="__main__")
    except SystemExit as exc:
        assert exc.code == 1, "default integration should fail with starter stubs"
    else:
        raise AssertionError("the default harness did not report its exit status")
assert "0/9 tests passed" in out.getvalue(), out.getvalue()
assert "isolated function checks" not in out.getvalue()
'''


class IncrementalMiddleTests(unittest.TestCase):
    def run_code(self, lab, code):
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=ROOT / "labs" / f"lab-{lab:02d}" / "starter",
            capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def test_each_tree_method_works_alone_and_fixtures_do_not_leak(self):
        self.run_code(6, "import btree as student\nimport test_btree as harness\n" +
                      TREE_REFERENCES + ISOLATION_CHECK)

    def test_each_transaction_function_works_alone_and_fixtures_do_not_leak(self):
        self.run_code(7, "import transaction as student\nimport test_tx as harness\n" +
                      TX_REFERENCES + ISOLATION_CHECK)

    def test_tree_lookup_targets_can_reuse_an_unfinished_sibling_method(self):
        self.run_code(6, r'''
import btree as student
import test_btree as harness
from unittest.mock import patch

def search_via_range(self, key):
    return self.range(key, key)

def range_via_search(self, lo, hi):
    # A point lookup is a useful base case; wider ranges still walk the chain.
    if lo == hi:
        return self.search(lo)
    leaf = self._descend(lo)[-1]
    result = []
    while leaf is not None:
        for key, rids in zip(leaf.keys, leaf.rids):
            if key > hi:
                return result
            if key >= lo:
                result.extend(rids)
        leaf = leaf.next
    return result

originals = {name: getattr(student.BPlusTree, name) for name in ("search", "range", "insert", "_split")}
for method, implementation in [("search", search_via_range), ("range", range_via_search)]:
    with patch.object(student.BPlusTree, method, implementation):
        harness.UNIT_TESTS[f"BPlusTree.{method}"]()
    assert all(getattr(student.BPlusTree, name) is value for name, value in originals.items())
''')

    def test_tree_insert_can_reuse_unfinished_search(self):
        self.run_code(6, "import btree as student\nimport test_btree as harness\n" + TREE_REFERENCES + r'''
from unittest.mock import patch
def insert_via_search(self, key, rid):
    if self.search(key):
        leaf = self._descend(key)[-1]
        leaf.rids[leaf.keys.index(key)].append(rid)
    else:
        insert(self, key, rid)
originals = {name: getattr(student.BPlusTree, name) for name in ("search", "range", "insert", "_split")}
with patch.object(student.BPlusTree, "insert", insert_via_search):
    harness.unit_insert()
assert all(getattr(student.BPlusTree, name) is value for name, value in originals.items())
''')

    def test_cli_lists_targets_and_rejects_unknown_or_unfinished_targets(self):
        for lab, filename, names in [
            (6, "test_btree.py", ["BPlusTree.search", "BPlusTree.insert", "BPlusTree._split", "BPlusTree.range"]),
            (7, "test_tx.py", ["Transaction.set_int", "Transaction.set_string", "Transaction.commit",
                               "Transaction.rollback", "recover"]),
        ]:
            directory = ROOT / "labs" / f"lab-{lab:02d}" / "starter"
            def run(*args):
                return subprocess.run([sys.executable, filename, *args], cwd=directory,
                                      capture_output=True, text=True, timeout=30)
            with self.subTest(lab=lab):
                listing = run("--list")
                self.assertEqual(listing.returncode, 0, listing.stderr)
                self.assertEqual(listing.stdout.splitlines(), names)
                self.assertEqual(run("--unit", "unknown.target").returncode, 2)
                all_units = run("--unit")
                self.assertEqual(all_units.returncode, 1, all_units.stdout)
                self.assertIn(f"0/{len(names)} isolated function checks passed", all_units.stdout)
                for name in names:
                    selected = run("--unit", name)
                    self.assertEqual(selected.returncode, 1, selected.stdout)
                    self.assertEqual(selected.stdout.count("[FAIL]"), 1, selected.stdout)
                    self.assertIn(f"UNIT: {name}", selected.stdout)
                    self.assertIn("0/1 isolated function checks passed", selected.stdout)

    def test_tree_checks_reject_plausible_wrong_results(self):
        self.run_code(6, "import btree as student\nimport test_btree as harness\n" + TREE_REFERENCES + r'''
from unittest.mock import patch
def aliasing_search(self, key):
    leaf = self._descend(key)[-1]
    return leaf.rids[leaf.keys.index(key)] if key in leaf.keys else []
def exclusive_range(self, lo, hi):
    return key_range(self, lo, hi - 1)
def lost_duplicate(self, key, rid):
    if key not in self._descend(key)[-1].keys:
        insert(self, key, rid)
def wrong_split(self, node, parent):
    internal = not node.leaf
    separator = node.keys[len(node.keys) // 2]
    split(self, node, parent)
    if internal:
        top = parent if parent is not None else self.root
        right = top.children[top.children.index(node) + 1]
        right.keys.insert(0, separator)
for name, method, bad in [
    ("BPlusTree.search", "search", aliasing_search),
    ("BPlusTree.range", "range", exclusive_range),
    ("BPlusTree.insert", "insert", lost_duplicate),
    ("BPlusTree._split", "_split", wrong_split),
]:
    with patch.object(student.BPlusTree, method, bad):
        try: harness.UNIT_TESTS[name]()
        except AssertionError: pass
        else: raise AssertionError(f"accepted mutant {name}")
''')

    def test_transaction_checks_reject_wrong_order_and_incomplete_undo(self):
        self.run_code(7, "import transaction as student\nimport test_tx as harness\n" + TX_REFERENCES + r'''
from unittest.mock import patch
def unsynced(method):
    def bad(self, *args):
        append = self.lm.append
        def unsafe(record, sync=True): return append(record, sync=False)
        with patch.object(self.lm, "append", unsafe): method(self, *args)
    return bad
def early_commit(self):
    self.lm.append({"kind": "COMMIT", "tx": self.txnum})
    self.bm.flush_all()
    self.locks.release_all(self.txnum)
    self._unpin_all()
def forward_rollback(self):
    backwards = self.lm.records_backwards
    def forwards():
        records = backwards()
        # Keep START last so the error is specifically undoing writes forwards.
        return list(reversed([r for r in records if r["kind"] != "START"])) + [r for r in records if r["kind"] == "START"]
    with patch.object(self.lm, "records_backwards", forwards): rollback(self)
def int_only_recover(fm, bm, lm):
    backwards = lm.records_backwards
    with patch.object(lm, "records_backwards", lambda: [r for r in backwards() if r["kind"] != "SET_STR"]):
        return recover(fm, bm, lm)
for name, method, bad in [
    ("Transaction.set_int", "set_int", unsynced(set_int)),
    ("Transaction.set_string", "set_string", unsynced(set_string)),
    ("Transaction.commit", "commit", early_commit),
    ("Transaction.rollback", "rollback", forward_rollback),
    ("recover", "recover", int_only_recover),
]:
    owner = harness if name == "recover" else student.Transaction
    with patch.object(owner, method, bad):
        try: harness.UNIT_TESTS[name]()
        except AssertionError: pass
        else: raise AssertionError(f"accepted mutant {name}")
''')


if __name__ == "__main__":
    unittest.main()
