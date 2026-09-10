"""Lab 3 test harness — run:  python3 test_records.py

Four groups, mirroring the lab page:

    LAYOUT  — Schema → byte offsets → slot size
    RECORD  — get/set within slots, insert_after/next_after/delete flags
    SCAN    — TableScan across block boundaries, deletes and updates
    CATALOG — the provided catalog works iff your record layer does

Pure stdlib; no pytest. The Gradescope autograder runs this same harness.

Test one function while the other methods are unfinished:
    python3 test_records.py --list
    python3 test_records.py --unit RecordPage.get_int
    python3 test_records.py --unit

Unit checks supply fixed layouts, page data, and prerequisite methods.
They always call your implementation of the selected function. Running
without arguments uses the original twelve integration tests, with no
replacement methods; those tests determine your grade.
"""

import argparse
from contextlib import contextmanager
import shutil
import sys
import tempfile
import traceback
from unittest.mock import patch

from file_manager import BlockId, FileManager, Page
from buffer_manager import BufferManager
from record_manager import Schema, Layout, RecordPage, TableScan
from catalog import Catalog

BLOCK_SIZE = 128          # students slot = 24 bytes -> 5 slots per block
RESULTS = []


def students_schema():
    return (Schema().add_int_field("id")
                    .add_string_field("name", 8)
                    .add_int_field("gpa"))


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


def fresh(num_buffers=8):
    d = tempfile.mkdtemp(prefix="microdb-l3-")
    fm = FileManager(d, BLOCK_SIZE)
    return d, fm, BufferManager(fm, num_buffers)


def cleanup(d, fm):
    fm.close()
    shutil.rmtree(d, ignore_errors=True)


# ---------------- LAYOUT group ----------------

def test_layout_offsets():
    lay = Layout(students_schema())
    expect(lay.offset("id") == 4,   f"id should start at 4 (after the flag), got {lay.offset('id')}")
    expect(lay.offset("name") == 8, f"name should start at 8, got {lay.offset('name')}")
    expect(lay.offset("gpa") == 20, f"gpa should start at 20 (name takes 4+8), got {lay.offset('gpa')}")
    expect(lay.slot_size == 24,     f"slot_size should be 24, got {lay.slot_size}")


def test_slots_per_block():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        blk = fm.append("t.tbl")
        rp = RecordPage(bm, blk, lay)
        expect(rp.slot_count() == BLOCK_SIZE // 24,
               f"128-byte block / 24-byte slot = 5 slots, got {rp.slot_count()}")
        rp.close()
    finally:
        cleanup(d, fm)


# ---------------- RECORD group ----------------

def test_field_roundtrip():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        rp = RecordPage(bm, fm.append("t.tbl"), lay)
        rp.set_int(0, "id", 1); rp.set_string(0, "name", "ada"); rp.set_int(0, "gpa", 39)
        rp.set_int(1, "id", 2); rp.set_string(1, "name", "ben"); rp.set_int(1, "gpa", 31)
        expect(rp.get_int(0, "id") == 1 and rp.get_string(0, "name") == "ada"
               and rp.get_int(0, "gpa") == 39, "slot 0 (ada) came back wrong")
        expect(rp.get_int(1, "id") == 2 and rp.get_string(1, "name") == "ben"
               and rp.get_int(1, "gpa") == 31,
               "slot 1 (ben) came back wrong — is _field_pos adding slot*slot_size?")
        rp.close()
    finally:
        cleanup(d, fm)


def test_insert_after_flags():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        rp = RecordPage(bm, fm.append("t.tbl"), lay)
        s0 = rp.insert_after(-1)
        s1 = rp.insert_after(s0)
        expect((s0, s1) == (0, 1), f"fresh page inserts should land in slots 0,1 — got {s0},{s1}")
        expect(rp.is_used(0) and rp.is_used(1) and not rp.is_used(2),
               "insert_after must flip the USED flag of exactly the returned slot")
        for s in (2, 3, 4):
            rp.insert_after(s - 1)
        expect(rp.insert_after(4) == -1, "a full page must return -1, not raise or wrap")
        rp.close()
    finally:
        cleanup(d, fm)


def test_delete_and_reuse():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        rp = RecordPage(bm, fm.append("t.tbl"), lay)
        for s in range(3):
            rp.insert_after(s - 1)
        rp.delete(1)
        expect(not rp.is_used(1), "delete must clear the flag")
        expect(rp.next_after(0) == 2, "next_after must skip the deleted slot 1")
        expect(rp.insert_after(-1) == 1, "insert_after must reuse the freed slot 1")
        rp.close()
    finally:
        cleanup(d, fm)


# ---------------- SCAN group ----------------

def fill(ts, n):
    for i in range(n):
        ts.insert()
        ts.set_int("id", i)
        ts.set_string("name", f"s{i}")
        ts.set_int("gpa", 30 + i % 10)


def test_scan_all_rows():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        ts = TableScan(bm, fm, "students", lay)
        fill(ts, 12)                                  # 5 per block -> 3 blocks
        ts.before_first()
        ids = []
        while ts.next():
            ids.append(ts.get_int("id"))
        ts.close()
        expect(ids == list(range(12)),
               f"expected ids 0..11 in order, got {ids} — does next() cross blocks?")
    finally:
        cleanup(d, fm)


def test_file_grows_by_blocks():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        ts = TableScan(bm, fm, "students", lay)
        fill(ts, 12)
        ts.close()
        expect(fm.length("students.tbl") == 3,
               f"12 rows at 5/block should occupy 3 blocks, file has {fm.length('students.tbl')} — "
               "does insert() fill every slot before appending?")
    finally:
        cleanup(d, fm)


def test_delete_during_scan():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        ts = TableScan(bm, fm, "students", lay)
        fill(ts, 12)
        ts.before_first()
        while ts.next():                              # delete gpa < 35
            if ts.get_int("gpa") < 35:
                ts.delete()
        ts.before_first()
        survivors = []
        while ts.next():
            survivors.append(ts.get_int("gpa"))
        ts.close()
        expect(survivors and all(g >= 35 for g in survivors),
               f"after deleting gpa<35, survivors were {survivors}")
        expect(len(survivors) == 5, f"expected 5 survivors (gpas 35-39), got {len(survivors)}")
    finally:
        cleanup(d, fm)


def test_update_during_scan():
    d, fm, bm = fresh()
    try:
        lay = Layout(students_schema())
        ts = TableScan(bm, fm, "students", lay)
        fill(ts, 7)
        ts.before_first()
        while ts.next():
            if ts.get_int("id") == 6:                 # lives in block 1
                ts.set_int("gpa", 40)
        ts.before_first()
        got = None
        while ts.next():
            if ts.get_int("id") == 6:
                got = ts.get_int("gpa")
        ts.close()
        bm.flush_all()
        expect(got == 40, f"updated gpa should read back 40, got {got}")
    finally:
        cleanup(d, fm)


def test_one_pin_at_a_time():
    d, fm, bm = fresh(num_buffers=2)                  # tiny pool: leaks abort fast
    try:
        lay = Layout(students_schema())
        ts = TableScan(bm, fm, "students", lay)
        fill(ts, 12)                                  # 3 blocks through 2 frames
        ts.before_first()
        n = 0
        while ts.next():
            n += 1
        ts.close()
        expect(n == 12, f"scan through a 2-frame pool should still see 12 rows, got {n}")
        pinned = [b for b in bm.pool if b.is_pinned()]
        expect(not pinned, f"after close(), no frame may stay pinned — leaked: {pinned}")
    finally:
        cleanup(d, fm)


# ---------------- CATALOG group ----------------

def test_catalog_roundtrip():
    d, fm, bm = fresh()
    try:
        cat = Catalog(bm, fm)
        cat.create_table("students", students_schema())
        lay = cat.get_layout("students")
        expect(lay.slot_size == 24, f"catalog slot_size should be 24, got {lay.slot_size}")
        expect(lay.offset("id") == 4 and lay.offset("name") == 8 and lay.offset("gpa") == 20,
               "offsets rebuilt from the catalog don't match the originals")
        expect(lay.schema.fields() == ["id", "name", "gpa"],
               f"schema fields should rebuild in offset order, got {lay.schema.fields()}")
    finally:
        cleanup(d, fm)


def test_catalog_rows():
    d, fm, bm = fresh()
    try:
        cat = Catalog(bm, fm)
        cat.create_table("students", students_schema())
        ts = TableScan(bm, fm, "field_catalog", cat.fcat_layout)
        rows = []
        while ts.next():
            if ts.get_string("tblname") == "students":
                rows.append((ts.get_string("fldname"), ts.get_int("offset")))
        ts.close()
        expect(sorted(rows) == [("gpa", 20), ("id", 4), ("name", 8)],
               f"field_catalog rows for students wrong: {sorted(rows)}")
    finally:
        cleanup(d, fm)


# ---------------- Isolated function checks (not graded) ----------------
# These fixtures deliberately use the provided Page and buffer APIs, not
# student record methods, to prepare and inspect records. Scoped patches
# replace only prerequisites; the function being tested stays untouched.

def fixture_layout():
    return Layout.from_metadata(students_schema(),
                                {"id": 4, "name": 8, "gpa": 20}, 24)


def fixture_field_pos(self, slot, fldname):
    return slot * self.layout.slot_size + self.layout.offset(fldname)


def fixture_next_after(self, slot):
    for candidate in range(slot + 1, self.slot_count()):
        if self.is_used(candidate):
            return candidate
    return -1


def fixture_insert_after(self, slot):
    for candidate in range(slot + 1, self.slot_count()):
        if not self.is_used(candidate):
            self._set_flag(candidate, 1)
            return candidate
    return -1


@contextmanager
def unit_page():
    d, fm, bm = fresh(num_buffers=2)
    rp = None
    try:
        rp = RecordPage(bm, fm.append("t.tbl"), fixture_layout())
        yield rp, rp._buf.contents()
    finally:
        if rp is not None:
            rp.close()
        cleanup(d, fm)


def seed_page(page, flags):
    """Write known bytes without calling any student record method."""
    for slot, flag in enumerate(flags):
        base = slot * 24
        page.set_int(base, flag)
        page.set_int(base + 4, 100 + slot)
        page.set_string(base + 8, "ada" if slot % 2 == 0 else "éé")
        page.set_int(base + 20, 30 + slot)


def unit_layout():
    test_layout_offsets()
    cases = [
        (Schema(), {}, 4),
        (Schema().add_string_field("tag", 3).add_int_field("count")
         .add_string_field("empty", 0), {"tag": 4, "count": 11, "empty": 15}, 19),
        (Schema().add_int_field("only"), {"only": 4}, 8),
    ]
    for schema, offsets, size in cases:
        lay = Layout(schema)
        expect(lay.slot_size == size, f"expected slot size {size}, got {lay.slot_size}")
        for field, offset in offsets.items():
            expect(lay.offset(field) == offset, f"wrong offset for {field}")


def unit_field_pos():
    with unit_page() as (rp, page):
        for slot in (0, 1, 4):
            for field, offset in (("id", 4), ("name", 8), ("gpa", 20)):
                expect(rp._field_pos(slot, field) == slot * 24 + offset,
                       f"wrong byte position for slot {slot}, field {field}")
        schema = Schema().add_string_field("tag", 3).add_int_field("count")
        rp.layout = Layout.from_metadata(schema, {"tag": 4, "count": 11}, 15)
        expect(rp._field_pos(3, "count") == 56, "use the supplied layout, not fixed offsets")


def unit_get_int():
    with unit_page() as (rp, page), patch.object(RecordPage, "_field_pos", fixture_field_pos):
        seed_page(page, [1, 1, 0, 0, 1])
        page.set_int(4, -123)
        before = bytes(page.contents())
        for slot, field, value in ((0, "id", -123), (1, "gpa", 31), (4, "id", 104)):
            expect(rp.get_int(slot, field) == value, f"wrong {field} in slot {slot}")
        expect(bytes(page.contents()) == before, "get_int must not change the page")
        expect(not rp._buf.dirty, "reading must not mark the buffer dirty")


def unit_set_int():
    with unit_page() as (rp, page), patch.object(RecordPage, "_field_pos", fixture_field_pos):
        seed_page(page, [1] * 5)
        for slot, field, offset, value in ((1, "id", 4, -2147483648),
                                          (4, "gpa", 20, 2147483647)):
            before = bytes(page.contents())
            rp._buf.dirty = False
            rp.set_int(slot, field, value)
            start = slot * 24 + offset
            expect(page.get_int(start) == value, "set_int wrote the wrong value or address")
            expect(page.contents()[:start] == before[:start]
                   and page.contents()[start + 4:] == before[start + 4:],
                   "set_int changed neighboring bytes")
            expect(rp._buf.dirty, "set_int must mark the buffer dirty")
        rp.bm.flush_all()
        stored = Page(BLOCK_SIZE)
        rp.bm.fm.read(rp.block, stored)
        expect(stored.contents() == page.contents(), "the write did not survive a flush")


def unit_get_string():
    with unit_page() as (rp, page), patch.object(RecordPage, "_field_pos", fixture_field_pos):
        seed_page(page, [1] * 5)
        page.set_string(4 * 24 + 8, "")
        before = bytes(page.contents())
        for slot, value in ((0, "ada"), (1, "éé"), (4, "")):
            expect(rp.get_string(slot, "name") == value,
                   f"wrong string in slot {slot}; read its UTF-8 bytes and length prefix")
        expect(bytes(page.contents()) == before, "get_string must not change the page")
        expect(not rp._buf.dirty, "reading must not mark the buffer dirty")


def unit_set_string():
    with unit_page() as (rp, page), patch.object(RecordPage, "_field_pos", fixture_field_pos):
        seed_page(page, [1] * 5)
        for slot, value in ((1, "éééé"), (1, "a"), (4, "")):
            before = bytes(page.contents())
            start = slot * 24 + 8
            rp._buf.dirty = False
            rp.set_string(slot, "name", value)
            expect(page.get_string(start) == value, "string bytes or length prefix are wrong")
            expect(page.contents()[:start] == before[:start]
                   and page.contents()[start + 12:] == before[start + 12:],
                   "set_string changed bytes outside the field's reserved capacity")
            expect(rp._buf.dirty, "set_string must mark the buffer dirty")
        for value in ("123456789", "ééééé"):
            before = bytes(page.contents())
            try:
                rp.set_string(1, "name", value)
            except ValueError:
                pass
            else:
                raise AssertionError("reject strings longer than 8 UTF-8 bytes with ValueError")
            expect(bytes(page.contents()) == before, "an oversized string changed the page")


def unit_insert_after():
    with unit_page() as (rp, page):
        seed_page(page, [1, 0, 1, 0, 0])
        for after, expected in ((0, 1), (1, 3), (3, 4)):
            before = bytes(page.contents())
            rp._buf.dirty = False
            expect(rp.insert_after(after) == expected, "insert_after must find the first empty slot after its argument")
            start = expected * 24
            expect(page.get_int(start) == 1, "the returned slot must be marked USED")
            expect(page.contents()[:start] == before[:start]
                   and page.contents()[start + 4:] == before[start + 4:],
                   "insertion must change only the chosen slot's flag")
            expect(rp._buf.dirty, "changing a status flag must mark the buffer dirty")
        expect(rp.insert_after(-1) == -1, "a full page must return -1")
        page.set_int(0, 0)
        expect(rp.insert_after(4) == -1, "do not wrap around to earlier empty slots")
        expect(rp.insert_after(-1) == 0, "searching from -1 must include slot 0")


def unit_next_after():
    with unit_page() as (rp, page):
        seed_page(page, [1, 0, 1, 0, 0])
        before = bytes(page.contents())
        for after, expected in ((-1, 0), (0, 2), (1, 2), (2, -1), (4, -1)):
            expect(rp.next_after(after) == expected, "next_after must find the first USED slot strictly after its argument")
        expect(bytes(page.contents()) == before and not rp._buf.dirty,
               "next_after must only read the page")


def unit_delete():
    with unit_page() as (rp, page):
        seed_page(page, [1] * 5)
        before = bytes(page.contents())
        rp.delete(2)
        expect(page.get_int(48) == 0, "delete must mark the selected slot EMPTY")
        expect(page.contents()[:48] == before[:48] and page.contents()[52:] == before[52:],
               "delete must preserve the field bytes and other slots")
        expect(rp._buf.dirty, "delete must mark the buffer dirty")


@contextmanager
def unit_table(flags_by_block):
    d, fm, bm = fresh(num_buffers=2)
    ts = None
    try:
        for flags in flags_by_block:
            block = fm.append("students.tbl")
            page = Page(BLOCK_SIZE)
            seed_page(page, flags)
            fm.write(block, page)
        ts = TableScan(bm, fm, "students", fixture_layout())
        yield ts, bm, fm
    finally:
        if ts is not None:
            ts.close()
        cleanup(d, fm)


def expect_one_pin(bm):
    expect(sum(buffer.pins for buffer in bm.pool) == 1,
           "a scan must hold exactly one pin, including after changing blocks")


def unit_scan_next():
    cases = [
        ([[1, 0, 0, 1, 0], [0] * 5, [0, 1, 0, 0, 1], [0] * 5],
         [(0, 0), (0, 3), (2, 1), (2, 4)]),
        ([[0] * 5], []),
        ([[0, 0, 0, 0, 1]], [(0, 4)]),
    ]
    with patch.object(RecordPage, "next_after", fixture_next_after):
        for flags, expected in cases:
            with unit_table(flags) as (ts, bm, fm):
                for _ in range(2):
                    ts.before_first()
                    for rid in expected:
                        expect(ts.next() is True, f"scan ended before RID {rid}")
                        expect(ts.rid() == rid, f"expected RID {rid}, got {ts.rid()}")
                        expect_one_pin(bm)
                    expect(ts.next() is False, "scan should end after the last occupied slot")
                    expect_one_pin(bm)
                ts.close()
                expect(not any(b.is_pinned() for b in bm.pool), "close() must release the final pin")


def unit_scan_insert():
    with patch.object(RecordPage, "insert_after", fixture_insert_after):
        with unit_table([[1] * 5, [1, 0, 1, 0, 1], [1] * 5]) as (ts, bm, fm):
            for rid, blocks in (((1, 1), 3), ((1, 3), 3), ((3, 0), 4), ((3, 1), 4)):
                ts.insert()
                expect(ts.rid() == rid, f"expected insertion at {rid}, got {ts.rid()}")
                expect(ts.rp.is_used(rid[1]), "insert must position on a USED slot")
                expect(fm.length("students.tbl") == blocks, "grow the file only when no empty slot remains ahead")
                expect_one_pin(bm)
            ts.close()
            expect(not any(b.is_pinned() for b in bm.pool), "insertion leaked a pin")
        with unit_table([[0, 1, 1, 1, 1]]) as (ts, bm, fm):
            ts.current_slot = 2
            ts.insert()
            expect(ts.rid() == (1, 0), "insert must search forward, not reuse a slot before the cursor")
            ts.before_first()
            ts.insert()
            expect(ts.rid() == (0, 0), "before_first must allow reuse of the earlier empty slot")
            expect_one_pin(bm)


UNIT_TESTS = {
    "Layout.__init__": unit_layout,
    "RecordPage._field_pos": unit_field_pos,
    "RecordPage.get_int": unit_get_int,
    "RecordPage.set_int": unit_set_int,
    "RecordPage.get_string": unit_get_string,
    "RecordPage.set_string": unit_set_string,
    "RecordPage.insert_after": unit_insert_after,
    "RecordPage.next_after": unit_next_after,
    "RecordPage.delete": unit_delete,
    "TableScan.next": unit_scan_next,
    "TableScan.insert": unit_scan_insert,
}


def run_integration():
    RESULTS.clear()
    print("LAYOUT group")
    check("LAYOUT", "students offsets are 4 / 8 / 20, slot 24", test_layout_offsets)
    check("LAYOUT", "slots per block arithmetic",               test_slots_per_block)
    print("RECORD group")
    check("RECORD", "fields round-trip in two slots",           test_field_roundtrip)
    check("RECORD", "insert_after flips flags in order",        test_insert_after_flags)
    check("RECORD", "delete frees, next skips, insert reuses",  test_delete_and_reuse)
    print("SCAN group")
    check("SCAN", "12 rows come back in order across blocks",   test_scan_all_rows)
    check("SCAN", "file grows to exactly 3 blocks",             test_file_grows_by_blocks)
    check("SCAN", "delete during scan",                         test_delete_during_scan)
    check("SCAN", "update during scan is durable",              test_update_during_scan)
    check("SCAN", "one pin at a time (2-frame pool, no leaks)", test_one_pin_at_a_time)
    print("CATALOG group")
    check("CATALOG", "create_table / get_layout round-trip",    test_catalog_roundtrip)
    check("CATALOG", "field_catalog rows are exactly right",    test_catalog_rows)
    n = sum(RESULTS)
    print(f"\n{n}/{len(RESULTS)} tests passed")
    return 0 if n == len(RESULTS) else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--list", action="store_true", help="list function-level test targets")
    mode.add_argument("--unit", nargs="?", const="all", choices=["all", *UNIT_TESTS],
                      metavar="FUNCTION", help="run one function's checks, or all unit checks")
    parser.add_argument("-v", action="store_true", help="show tracebacks for failures")
    args = parser.parse_args(argv)
    if args.list:
        print("Function-level targets (ungraded):")
        print("\n".join(UNIT_TESTS))
        return 0
    if args.unit:
        RESULTS.clear()
        print("Unit checks: fixtures supply unfinished dependencies; integration tests are not run.")
        selected = UNIT_TESTS if args.unit == "all" else {args.unit: UNIT_TESTS[args.unit]}
        for name, fn in selected.items():
            check("UNIT", name, fn)
        n = sum(RESULTS)
        print(f"\n{n}/{len(RESULTS)} unit checks passed (not the grading score)")
        return 0 if n == len(RESULTS) else 1
    return run_integration()


if __name__ == "__main__":
    sys.exit(main())
