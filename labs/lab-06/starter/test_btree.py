"""Lab 6 test harness — run:  python3 test_btree.py

Three groups, mirroring the lab page:

    TREE   — insert, split, and the shape invariants that keep O(log n)
    SEARCH — point lookups, duplicates, ranges across the leaf chain
    INDEX  — the tree over a real table: same answers as a scan, way less touching

Pure stdlib; no pytest. The Gradescope autograder runs this same harness.
"""

import shutil
import sys
import tempfile
import traceback

from file_manager import FileManager
from buffer_manager import BufferManager
from record_manager import Schema, Layout, TableScan
from query_engine import Predicate, SelectScan
from btree import BPlusTree, Node, ORDER, build_index, IndexSelectScan

BLOCK_SIZE = 512
RESULTS = []


def check(group, name, fn):
    try:
        fn()
        RESULTS.append(True)
        print(f"  [PASS] {group}: {name}")
    except Exception as e:
        RESULTS.append(False)
        if isinstance(e, NotImplementedError):
            print(f"  [FAIL] {group}: {name} — not implemented yet")
        else:
            print(f"  [FAIL] {group}: {name} — {type(e).__name__}: {e}")
            if "-v" in sys.argv:
                traceback.print_exc()


def expect(cond, why):
    if not cond:
        raise AssertionError(why)


def leaves_of(tree):
    node = tree.root
    while not node.leaf:
        node = node.children[0]
    out = []
    while node is not None:
        out.append(node)
        node = node.next
    return out


def all_leaf_keys(tree):
    return [k for leaf in leaves_of(tree) for k in leaf.keys]


def check_invariants(tree):
    """Every node within ORDER; leaf chain sorted; heights consistent."""
    def depth_of(node):
        d = 1
        while not node.leaf:
            node = node.children[0]
            d += 1
        return d
    keys = all_leaf_keys(tree)
    expect(keys == sorted(keys), f"leaf chain out of order: {keys[:20]}...")
    stack = [tree.root]
    while stack:
        n = stack.pop()
        expect(len(n.keys) <= ORDER, f"node holds {len(n.keys)} keys > ORDER={ORDER}")
        if not n.leaf:
            expect(len(n.children) == len(n.keys) + 1,
                   f"internal node: {len(n.keys)} keys need {len(n.keys)+1} children, "
                   f"has {len(n.children)}")
            stack.extend(n.children)
    expect(depth_of(tree.root) == tree.height,
           f"tree.height says {tree.height}, actual depth {depth_of(tree.root)}")


# ---------------- TREE group ----------------

def test_leaf_stays_sorted():
    t = BPlusTree()
    for k in [5, 2, 9, 1]:
        t.insert(k, ("r", k))
    expect(t.root.leaf and t.root.keys == [1, 2, 5, 9],
           f"4 keys fit in one leaf, sorted — got {t.root.keys}")
    expect(t.height == 1, "no split yet, height must still be 1")


def test_first_split_grows_root():
    t = BPlusTree()
    for k in [1, 2, 3, 4, 5]:               # ORDER=4: the 5th key splits
        t.insert(k, ("r", k))
    expect(not t.root.leaf, "after the first split the root must be internal")
    expect(t.height == 2, f"height must be 2, got {t.height}")
    expect(t.root.keys == [3], f"the middle key (3) is copied up — root has {t.root.keys}")
    expect(all_leaf_keys(t) == [1, 2, 3, 4, 5],
           "a LEAF split must keep every key in the leaves (copy up, not move up)")
    check_invariants(t)


def test_many_inserts_stay_legal():
    t = BPlusTree()
    for k in [37, 4, 91, 15, 60, 8, 42, 73, 1, 55, 29, 88, 12, 66, 23,
              50, 95, 3, 78, 34, 61, 17, 84, 45, 9]:
        t.insert(k, ("r", k))
    check_invariants(t)
    expect(t.height == 3, f"25 scattered keys at ORDER=4 should reach height 3, got {t.height}")


def test_logarithmic_height():
    t = BPlusTree()
    for k in range(500):
        t.insert(k, ("r", k))
    check_invariants(t)
    expect(t.height <= 6,
           f"500 sequential keys must stay shallow (<=6 at ORDER=4), got {t.height}")


# ---------------- SEARCH group ----------------

def test_search_hits_and_misses():
    t = BPlusTree()
    for k in range(0, 100, 2):              # even keys only
        t.insert(k, ("blk", k))
    expect(t.search(42) == [("blk", 42)], "present key must return its rid")
    expect(t.search(43) == [], "absent key must return [], not raise")


def test_duplicate_keys_share_a_slot():
    t = BPlusTree()
    t.insert(35, (0, 1))
    t.insert(35, (2, 4))
    t.insert(35, (1, 0))
    expect(sorted(t.search(35)) == [(0, 1), (1, 0), (2, 4)],
           "three rows with gpa 35 must all come back from one key")
    expect(all_leaf_keys(t) == [35], "duplicates share ONE key entry, not three")


def test_range_walks_the_chain():
    t = BPlusTree()
    for k in range(50):
        t.insert(k, ("r", k))
    got = [rid for rid in t.range(10, 20)]
    expect(got == [("r", k) for k in range(10, 21)],
           f"range(10,20) must return keys 10..20 inclusive, in order — got {got[:8]}...")
    expect(t.range(200, 300) == [], "an empty range returns []")


# ---------------- INDEX group (over a real table) ----------------

def fresh_school():
    d = tempfile.mkdtemp(prefix="microdb-l6-")
    fm = FileManager(d, BLOCK_SIZE)
    bm = BufferManager(fm, 8)
    lay = Layout(Schema().add_int_field("sid").add_string_field("name", 8)
                         .add_int_field("gpa"))
    ts = TableScan(bm, fm, "students", lay)
    for sid, name, gpa in [(1, "ada", 39), (2, "ben", 31), (3, "cyd", 37),
                           (4, "dee", 28), (5, "eli", 36), (6, "fay", 36)]:
        ts.insert()
        ts.set_int("sid", sid); ts.set_string("name", name); ts.set_int("gpa", gpa)
    ts.close()
    return d, fm, bm, lay


def test_index_matches_scan():
    d, fm, bm, lay = fresh_school()
    try:
        tree = build_index(bm, fm, "students", lay, "gpa")
        idx = IndexSelectScan(TableScan(bm, fm, "students", lay), tree, 36)
        idx.before_first()
        via_index = []
        while idx.next():
            via_index.append(idx.get_val("name"))
        idx.close()
        sel = SelectScan(TableScan(bm, fm, "students", lay),
                         Predicate(("gpa", "=", 36)))
        sel.before_first()
        via_scan = []
        while sel.next():
            via_scan.append(sel.get_val("name"))
        sel.close()
        expect(sorted(via_index) == sorted(via_scan) == ["eli", "fay"],
               f"index and scan must agree: index={via_index} scan={via_scan}")
    finally:
        fm.close(); shutil.rmtree(d, ignore_errors=True)


def test_index_touches_less():
    d, fm, bm, lay = fresh_school()
    try:
        tree = build_index(bm, fm, "students", lay, "gpa")
        tree.nodes_touched = 0
        tree.search(36)
        expect(tree.nodes_touched == tree.height,
               f"one search must touch exactly height ({tree.height}) nodes, "
               f"got {tree.nodes_touched}")
    finally:
        fm.close(); shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    print("TREE group")
    check("TREE", "a leaf keeps its keys sorted",              test_leaf_stays_sorted)
    check("TREE", "the fifth key splits; the root grows",      test_first_split_grows_root)
    check("TREE", "25 scattered inserts keep every invariant", test_many_inserts_stay_legal)
    check("TREE", "500 keys, height stays logarithmic",        test_logarithmic_height)
    print("SEARCH group")
    check("SEARCH", "hits return rids, misses return []",      test_search_hits_and_misses)
    check("SEARCH", "duplicate keys share one slot",           test_duplicate_keys_share_a_slot)
    check("SEARCH", "range walks the leaf chain, inclusive",   test_range_walks_the_chain)
    print("INDEX group")
    check("INDEX", "IndexSelectScan agrees with SelectScan",   test_index_matches_scan)
    check("INDEX", "one lookup touches exactly height nodes",  test_index_touches_less)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)
