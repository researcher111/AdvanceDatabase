"""Lab 4 test harness — run:  python3 test_scans.py

Three groups, mirroring the lab page:

    SELECT  — filtering, multi-term predicates, chained selects
    PROJECT — field restriction and its fence
    PRODUCT — the nested loop, join queries, rewind, pin hygiene

Pure stdlib; no pytest. The Gradescope autograder runs a superset.
"""

import shutil
import sys
import tempfile
import traceback

from file_manager import FileManager
from buffer_manager import BufferManager
from record_manager import Schema, Layout, TableScan
from query_engine import Predicate, F, SelectScan, ProjectScan, ProductScan

BLOCK_SIZE = 128
RESULTS = []

# The pinned toy rows, now with a major id for joining.
STUDENTS = [  # (sid, name, gpa, mid)
    (1, "ada", 39, 1), (2, "ben", 31, 2), (3, "cyd", 37, 1),
    (4, "dee", 28, 3), (5, "eli", 36, 2), (6, "fay", 34, 1),
]
MAJORS = [(1, "cs"), (2, "stat"), (3, "econ")]  # (mid, dept)


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


def fresh():
    """A temp database with the students and majors tables loaded."""
    d = tempfile.mkdtemp(prefix="microdb-l4-")
    fm = FileManager(d, BLOCK_SIZE)
    bm = BufferManager(fm, 8)
    s_lay = Layout(Schema().add_int_field("sid").add_string_field("name", 8)
                           .add_int_field("gpa").add_int_field("mid"))
    ts = TableScan(bm, fm, "students", s_lay)
    for sid, name, gpa, mid in STUDENTS:
        ts.insert()
        ts.set_int("sid", sid); ts.set_string("name", name)
        ts.set_int("gpa", gpa); ts.set_int("mid", mid)
    ts.close()
    m_lay = Layout(Schema().add_int_field("mid2").add_string_field("dept", 8))
    ts = TableScan(bm, fm, "majors", m_lay)
    for mid, dept in MAJORS:
        ts.insert()
        ts.set_int("mid2", mid); ts.set_string("dept", dept)
    ts.close()
    return d, fm, bm, s_lay, m_lay


def cleanup(d, fm):
    fm.close()
    shutil.rmtree(d, ignore_errors=True)


def collect(scan, fld):
    scan.before_first()
    out = []
    while scan.next():
        out.append(scan.get_val(fld))
    return out


# ---------------- SELECT group ----------------

def test_select_filters():
    d, fm, bm, s_lay, _ = fresh()
    try:
        sel = SelectScan(TableScan(bm, fm, "students", s_lay),
                         Predicate(("gpa", ">", 35)))
        expect(collect(sel, "name") == ["ada", "cyd", "eli"],
               f"gpa > 35 should keep ada, cyd, eli — got {collect(sel, 'name')}")
        sel.close()
    finally:
        cleanup(d, fm)


def test_select_equality():
    d, fm, bm, s_lay, _ = fresh()
    try:
        sel = SelectScan(TableScan(bm, fm, "students", s_lay),
                         Predicate(("name", "=", "ada")))
        expect(collect(sel, "gpa") == [39], "name = 'ada' should find exactly her gpa 39")
        sel.close()
    finally:
        cleanup(d, fm)


def test_select_multi_term():
    d, fm, bm, s_lay, _ = fresh()
    try:
        sel = SelectScan(TableScan(bm, fm, "students", s_lay),
                         Predicate(("gpa", ">", 30), ("gpa", "<", 37)))
        expect(sorted(collect(sel, "name")) == ["ben", "eli", "fay"],
               "30 < gpa < 37 should keep ben, eli, fay")
        sel.close()
    finally:
        cleanup(d, fm)


def test_select_stacks():
    d, fm, bm, s_lay, _ = fresh()
    try:
        inner = SelectScan(TableScan(bm, fm, "students", s_lay),
                           Predicate(("gpa", ">", 30)))
        outer = SelectScan(inner, Predicate(("mid", "=", 1)))
        expect(sorted(collect(outer, "name")) == ["ada", "cyd", "fay"],
               "select over select must compose like AND")
        outer.close()
    finally:
        cleanup(d, fm)


# ---------------- PROJECT group ----------------

def test_project_restricts():
    d, fm, bm, s_lay, _ = fresh()
    try:
        prj = ProjectScan(TableScan(bm, fm, "students", s_lay), ["name"])
        expect(collect(prj, "name")[:2] == ["ada", "ben"], "projection should still see name")
        prj.before_first(); prj.next()
        try:
            prj.get_val("gpa")
        except ValueError:
            prj.close(); return
        raise AssertionError("get_val('gpa') through a name-only projection must raise ValueError")
    finally:
        cleanup(d, fm)


def test_project_over_select():
    d, fm, bm, s_lay, _ = fresh()
    try:
        plan = ProjectScan(
            SelectScan(TableScan(bm, fm, "students", s_lay),
                       Predicate(("gpa", ">", 35))),
            ["name"])
        expect(collect(plan, "name") == ["ada", "cyd", "eli"],
               "the lecture-1 demo query, now real: Project(Select(Scan))")
        expect(not plan.has_field("gpa"), "has_field must respect the projection")
        plan.close()
    finally:
        cleanup(d, fm)


# ---------------- PRODUCT group ----------------

def test_product_cardinality():
    d, fm, bm, s_lay, m_lay = fresh()
    try:
        prod = ProductScan(TableScan(bm, fm, "students", s_lay),
                           TableScan(bm, fm, "majors", m_lay))
        expect(len(collect(prod, "sid")) == 18,
               "6 students x 3 majors must yield 18 pairs — check before_first/next order")
        prod.close()
    finally:
        cleanup(d, fm)


def test_product_order():
    d, fm, bm, s_lay, m_lay = fresh()
    try:
        prod = ProductScan(TableScan(bm, fm, "students", s_lay),
                           TableScan(bm, fm, "majors", m_lay))
        prod.before_first()
        pairs = []
        for _ in range(4):
            prod.next()
            pairs.append((prod.get_val("sid"), prod.get_val("mid2")))
        expect(pairs == [(1, 1), (1, 2), (1, 3), (2, 1)],
               f"nested loop order: all of right per left row — got {pairs}")
        prod.close()
    finally:
        cleanup(d, fm)


def test_join_query():
    d, fm, bm, s_lay, m_lay = fresh()
    try:
        # SELECT name, dept FROM students, majors
        #  WHERE mid = mid2 AND gpa > 35        — the course's first join
        plan = ProjectScan(
            SelectScan(
                ProductScan(TableScan(bm, fm, "students", s_lay),
                            TableScan(bm, fm, "majors", m_lay)),
                Predicate(("mid", "=", F("mid2")), ("gpa", ">", 35))),
            ["name", "dept"])
        plan.before_first()
        rows = []
        while plan.next():
            rows.append((plan.get_val("name"), plan.get_val("dept")))
        plan.close()
        expect(rows == [("ada", "cs"), ("cyd", "cs"), ("eli", "stat")],
               f"the join should match each honors student to their dept — got {rows}")
    finally:
        cleanup(d, fm)


def test_rewind_repeats():
    d, fm, bm, s_lay, m_lay = fresh()
    try:
        prod = ProductScan(TableScan(bm, fm, "students", s_lay),
                           TableScan(bm, fm, "majors", m_lay))
        first = collect(prod, "sid")
        second = collect(prod, "sid")               # collect() rewinds
        expect(first == second and len(second) == 18,
               "before_first must fully reset the product (right side too)")
        prod.close()
    finally:
        cleanup(d, fm)


def test_close_releases_pins():
    d, fm, bm, s_lay, m_lay = fresh()
    try:
        plan = ProjectScan(
            SelectScan(
                ProductScan(TableScan(bm, fm, "students", s_lay),
                            TableScan(bm, fm, "majors", m_lay)),
                Predicate(("mid", "=", F("mid2")))),
            ["name"])
        collect(plan, "name")
        plan.close()
        pinned = [b for b in bm.pool if b.is_pinned()]
        expect(not pinned, f"close() must release the whole tree — leaked: {pinned}")
    finally:
        cleanup(d, fm)


if __name__ == "__main__":
    print("SELECT group")
    check("SELECT", "predicate filters rows (gpa > 35)",       test_select_filters)
    check("SELECT", "equality on a string field",              test_select_equality)
    check("SELECT", "multi-term predicate is an AND",          test_select_multi_term)
    check("SELECT", "selects stack like AND",                  test_select_stacks)
    print("PROJECT group")
    check("PROJECT", "restricts fields, fences the rest",      test_project_restricts)
    check("PROJECT", "the lecture-1 query: Project(Select(Scan))", test_project_over_select)
    print("PRODUCT group")
    check("PRODUCT", "cardinality is |left| x |right|",        test_product_cardinality)
    check("PRODUCT", "nested-loop order (right spins fastest)", test_product_order)
    check("PRODUCT", "a real join: product + join predicate",  test_join_query)
    check("PRODUCT", "before_first rewinds the whole tree",    test_rewind_repeats)
    check("PRODUCT", "close releases every pin",               test_close_releases_pins)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)
