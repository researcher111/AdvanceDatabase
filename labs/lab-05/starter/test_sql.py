"""Lab 5 test harness — run:  python3 test_sql.py

Three groups, mirroring the lab page:

    PARSE — SQL text becomes the right QueryData (and bad SQL dies well)
    PLAN  — QueryData becomes the right scan tree
    SQL   — end to end: CREATE, INSERT, SELECT through Database.execute

Pure stdlib; no pytest. The Gradescope autograder runs a superset.
"""

import shutil
import sys
import tempfile
import traceback

from file_manager import FileManager
from buffer_manager import BufferManager
from catalog import Catalog
from query_engine import F
from sql_frontend import Parser, ParseError, Database, QueryData

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


def fresh_db():
    d = tempfile.mkdtemp(prefix="microdb-l5-")
    fm = FileManager(d, BLOCK_SIZE)
    bm = BufferManager(fm, 8)
    return d, fm, Database(fm, bm, Catalog(bm, fm))


def cleanup(d, fm):
    fm.close()
    shutil.rmtree(d, ignore_errors=True)


PINNED = [(1, "ada", 39, 1), (2, "ben", 31, 2), (3, "cyd", 37, 1),
          (4, "dee", 28, 3), (5, "eli", 36, 2), (6, "fay", 34, 1)]


def load_school(db):
    db.execute("CREATE TABLE students (sid INT, name VARCHAR(8), gpa INT, mid INT)")
    db.execute("CREATE TABLE majors (mid2 INT, dept VARCHAR(8))")
    for sid, name, gpa, mid in PINNED:
        db.execute(f"INSERT INTO students VALUES ({sid}, '{name}', {gpa}, {mid})")
    for mid, dept in [(1, "cs"), (2, "stat"), (3, "econ")]:
        db.execute(f"INSERT INTO majors VALUES ({mid}, '{dept}')")


# ---------------- PARSE group ----------------

def test_parse_simple_query():
    q = Parser("SELECT name, gpa FROM students").parse()
    expect(isinstance(q, QueryData), "SELECT must return a QueryData")
    expect(q.fields == ["name", "gpa"], f"fields wrong: {q.fields}")
    expect(q.tables == ["students"], f"tables wrong: {q.tables}")
    expect(q.predicate is None, "no WHERE means predicate None")


def test_parse_star_and_where():
    q = Parser("SELECT * FROM students WHERE gpa > 35 AND mid = 1").parse()
    expect(q.fields == ["*"], f"star select should record ['*'], got {q.fields}")
    expect(len(q.predicate.terms) == 2, "two AND-ed terms expected")
    expect(q.predicate.terms[0] == ("gpa", ">", 35), f"first term wrong: {q.predicate.terms[0]}")


def test_parse_join_term():
    q = Parser("SELECT name FROM students, majors WHERE mid = mid2").parse()
    expect(q.tables == ["students", "majors"], f"tables wrong: {q.tables}")
    field, op, rhs = q.predicate.terms[0]
    expect(field == "mid" and op == "=", "join term lhs/op wrong")
    expect(isinstance(rhs, F) and rhs.name == "mid2",
           "an ID on the right-hand side must become F('mid2'), not a string literal")


def test_parse_string_literal():
    q = Parser("SELECT sid FROM students WHERE name = 'ada'").parse()
    expect(q.predicate.terms[0] == ("name", "=", "ada"),
           "'ada' must parse as the literal string ada")


def test_parse_errors_help():
    for bad in ["SELECT name students", "SELECT FROM students",
                "SELECT name FROM students WHERE gpa >"]:
        try:
            Parser(bad).parse()
        except ParseError:
            continue
        raise AssertionError(f"bad SQL must raise ParseError: {bad!r}")


# ---------------- PLAN group ----------------

def test_plan_shapes():
    d, fm, db = fresh_db()
    try:
        load_school(db)
        plan = db.plan_query(Parser("SELECT name FROM students WHERE gpa > 35").parse())
        names = [type(s).__name__ for s in walk(plan)]
        expect(names == ["ProjectScan", "SelectScan", "TableScan"],
               f"expected Project<-Select<-Table, got {names}")
        plan.close()
        plan = db.plan_query(Parser("SELECT * FROM students").parse())
        expect(type(plan).__name__ == "TableScan",
               "SELECT * with no WHERE should be a bare TableScan — no useless wrappers")
        plan.close()
    finally:
        cleanup(d, fm)


def test_plan_join_shape():
    d, fm, db = fresh_db()
    try:
        load_school(db)
        plan = db.plan_query(
            Parser("SELECT name FROM students, majors WHERE mid = mid2").parse())
        names = [type(s).__name__ for s in walk(plan)]
        expect(names == ["ProjectScan", "SelectScan", "ProductScan",
                         "TableScan", "TableScan"],
               f"join plan shape wrong: {names}")
        plan.close()
    finally:
        cleanup(d, fm)


def walk(scan):
    yield scan
    if hasattr(scan, "left"):
        yield from walk(scan.left)
        yield from walk(scan.right)
    elif hasattr(scan, "scan"):
        yield from walk(scan.scan)


# ---------------- SQL group (end to end) ----------------

def test_sql_filter():
    d, fm, db = fresh_db()
    try:
        load_school(db)
        rows = db.execute("SELECT name FROM students WHERE gpa > 35")
        expect([r["name"] for r in rows] == ["ada", "cyd", "eli"],
               f"honors query wrong: {rows}")
    finally:
        cleanup(d, fm)


def test_sql_star():
    d, fm, db = fresh_db()
    try:
        load_school(db)
        rows = db.execute("SELECT * FROM majors")
        expect(rows == [{"mid2": 1, "dept": "cs"}, {"mid2": 2, "dept": "stat"},
                        {"mid2": 3, "dept": "econ"}],
               f"SELECT * should return every field of every row: {rows}")
    finally:
        cleanup(d, fm)


def test_sql_join():
    d, fm, db = fresh_db()
    try:
        load_school(db)
        rows = db.execute("SELECT name, dept FROM students, majors "
                          "WHERE mid = mid2 AND gpa > 35")
        expect(rows == [{"name": "ada", "dept": "cs"},
                        {"name": "cyd", "dept": "cs"},
                        {"name": "eli", "dept": "stat"}],
               f"the SQL join must match Lab 4's hand-built one: {rows}")
    finally:
        cleanup(d, fm)


def test_sql_string_where():
    d, fm, db = fresh_db()
    try:
        load_school(db)
        rows = db.execute("SELECT gpa FROM students WHERE name = 'fay'")
        expect(rows == [{"gpa": 34}], f"string WHERE wrong: {rows}")
    finally:
        cleanup(d, fm)


def test_sql_no_pins_leak():
    d, fm, db = fresh_db()
    try:
        load_school(db)
        db.execute("SELECT name, dept FROM students, majors WHERE mid = mid2")
        pinned = [b for b in db.bm.pool if b.is_pinned()]
        expect(not pinned, f"execute() must close its plan — leaked: {pinned}")
    finally:
        cleanup(d, fm)


if __name__ == "__main__":
    print("PARSE group")
    check("PARSE", "SELECT fields FROM table",                 test_parse_simple_query)
    check("PARSE", "star select + AND-ed WHERE",               test_parse_star_and_where)
    check("PARSE", "an ID rhs becomes F (join term)",          test_parse_join_term)
    check("PARSE", "'strings' parse as literals",              test_parse_string_literal)
    check("PARSE", "bad SQL raises ParseError, not chaos",     test_parse_errors_help)
    print("PLAN group")
    check("PLAN", "plan shapes: no useless wrappers",          test_plan_shapes)
    check("PLAN", "join plan: products fold left to right",    test_plan_join_shape)
    print("SQL group")
    check("SQL", "the honors query, via text",                 test_sql_filter)
    check("SQL", "SELECT * returns all fields",                test_sql_star)
    check("SQL", "the Lab 4 join, via text",                   test_sql_join)
    check("SQL", "WHERE on a string field",                    test_sql_string_where)
    check("SQL", "execute() leaks no pins",                    test_sql_no_pins_leak)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    sys.exit(0 if n == len(RESULTS) else 1)
