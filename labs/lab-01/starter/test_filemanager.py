"""Lab 1 test harness. Run:  python3 test_filemanager.py

Build one function at a time:
    python3 test_filemanager.py --list
    python3 test_filemanager.py --unit Class.method
    python3 test_filemanager.py --unit
Unit checks supply the other functions as test fixtures. The target always
runs your code. The default command still runs the full integration suite.


Two groups, mirroring the lab page:

    PAGE  : Page get/set round-trips (no disk involved)
    FILE  : FileManager read/write/append/length + durability across reopen

Every test prints PASS or FAIL with a reason. The Gradescope autograder
runs this same harness, so green here is the grade.
Pure stdlib; no pytest needed.
"""

import os
import shutil
import sys
import tempfile
import traceback

from file_manager import BlockId, Page, FileManager

BLOCK_SIZE = 128          # small on purpose: failures are easier to hexdump
RESULTS = []


def check(group, name, fn):
    try:
        fn()
        RESULTS.append(True)
        print(f"  [PASS] {group}: {name}")
    except Exception as e:
        RESULTS.append(False)
        kind = type(e).__name__
        msg = str(e) or "(no message)"
        if isinstance(e, NotImplementedError):
            print(f"  [FAIL] {group}: {name} - not implemented yet")
        else:
            print(f"  [FAIL] {group}: {name} - {kind}: {msg}")
            if "-v" in sys.argv:
                traceback.print_exc()


def expect(cond, why):
    if not cond:
        raise AssertionError(why)


# ---------------- PAGE group ----------------

def test_int_roundtrip():
    p = Page(BLOCK_SIZE)
    for off, val in [(0, 1), (4, 39), (60, -7), (100, 2**31 - 1)]:
        p.set_int(off, val)
    for off, val in [(0, 1), (4, 39), (60, -7), (100, 2**31 - 1)]:
        got = p.get_int(off)
        expect(got == val, f"get_int({off}) returned {got}, expected {val}")


def test_bytes_roundtrip():
    p = Page(BLOCK_SIZE)
    payload = bytes([0, 255, 42, 7])
    p.set_bytes(10, payload)
    got = p.get_bytes(10)
    expect(got == payload, f"get_bytes returned {got!r}, expected {payload!r}")


def test_string_roundtrip():
    p = Page(BLOCK_SIZE)
    for off, s in [(0, "ada"), (20, "héllo wörld"), (60, "")]:
        p.set_string(off, s)
        got = p.get_string(off)
        expect(got == s, f"get_string({off}) returned {got!r}, expected {s!r}")


def test_adjacent_values():
    # The pinned toy row from lecture: id=1, name='ada', gpa×10=39.
    # Layout: int at 0 (4 bytes) · string at 4 (4+3 bytes) · int at 11.
    p = Page(BLOCK_SIZE)
    p.set_int(0, 1)
    p.set_string(4, "ada")
    p.set_int(11, 39)
    expect(p.get_int(0) == 1, "id clobbered. Did set_string write outside its range?")
    expect(p.get_string(4) == "ada", "name clobbered. Check the offsets in set_int.")
    expect(p.get_int(11) == 39, "gpa clobbered. Is the string length prefix wrong?")


# ---------------- FILE group ----------------

def in_tmpdir(fn):
    d = tempfile.mkdtemp(prefix="microdb-test-")
    try:
        fn(d)
    finally:
        shutil.rmtree(d, ignore_errors=True)


def test_append_grows_length():
    def go(d):
        fm = FileManager(d, BLOCK_SIZE)
        expect(fm.length("t.tbl") == 0, "new file should have length 0")
        b0 = fm.append("t.tbl")
        expect(b0.blknum == 0, f"first append returned block {b0.blknum}, expected 0")
        expect(fm.length("t.tbl") == 1, "length should be 1 after one append")
        b1 = fm.append("t.tbl")
        expect(b1.blknum == 1, f"second append returned block {b1.blknum}, expected 1")
        expect(fm.length("t.tbl") == 2, "length should be 2 after two appends")
        fm.close()
    in_tmpdir(go)


def test_write_read_roundtrip():
    def go(d):
        fm = FileManager(d, BLOCK_SIZE)
        blk = fm.append("t.tbl")
        p = Page(BLOCK_SIZE)
        p.set_int(0, 1); p.set_string(4, "ada"); p.set_int(11, 39)
        fm.write(blk, p)
        q = Page(BLOCK_SIZE)
        fm.read(blk, q)
        expect(q.get_int(0) == 1 and q.get_string(4) == "ada" and q.get_int(11) == 39,
               "block read back differs from what was written")
        fm.close()
    in_tmpdir(go)


def test_block_independence():
    def go(d):
        fm = FileManager(d, BLOCK_SIZE)
        b0, b1 = fm.append("t.tbl"), fm.append("t.tbl")
        p0, p1 = Page(BLOCK_SIZE), Page(BLOCK_SIZE)
        p0.set_string(0, "block zero")
        p1.set_string(0, "block one")
        fm.write(b0, p0); fm.write(b1, p1)
        q = Page(BLOCK_SIZE)
        fm.read(b0, q)
        expect(q.get_string(0) == "block zero", "writing block 1 clobbered block 0. Check your seek offsets.")
        fm.read(b1, q)
        expect(q.get_string(0) == "block one", "block 1 read back wrong")
        fm.close()
    in_tmpdir(go)


def test_read_past_end_raises():
    def go(d):
        fm = FileManager(d, BLOCK_SIZE)
        fm.append("t.tbl")
        try:
            fm.read(BlockId("t.tbl", 5), Page(BLOCK_SIZE))
        except ValueError:
            fm.close(); return
        fm.close()
        raise AssertionError("reading block 5 of a 1-block file should raise ValueError")
    in_tmpdir(go)


def test_durability_across_reopen():
    def go(d):
        fm = FileManager(d, BLOCK_SIZE)
        blk = fm.append("t.tbl")
        p = Page(BLOCK_SIZE)
        p.set_string(0, "survives")
        fm.write(blk, p)
        fm.close()                       # simulate the process ending
        fm2 = FileManager(d, BLOCK_SIZE)  # …and a fresh process starting
        q = Page(BLOCK_SIZE)
        fm2.read(BlockId("t.tbl", 0), q)
        expect(q.get_string(0) == "survives",
               "data did not survive close + reopen. Is write() actually writing?")
        fm2.close()
    in_tmpdir(go)


# ---------------- function-level checks ----------------
# These small reference dependencies exist only inside --unit checks. Raw
# bytes and OS file reads supply expected values, so a getter and setter
# cannot hide matching bugs in one another.
import struct
from contextlib import ExitStack
from unittest.mock import patch


def _fixture_get_int(page, off):
    return struct.unpack_from("<i", page.contents(), off)[0]


def _fixture_set_int(page, off, val):
    struct.pack_into("<i", page.contents(), off, val)


def _fixture_get_bytes(page, off):
    size = _fixture_get_int(page, off)
    return bytes(page.contents()[off + 4:off + 4 + size])


def _fixture_set_bytes(page, off, data):
    _fixture_set_int(page, off, len(data))
    page.contents()[off + 4:off + 4 + len(data)] = data


def _fixture_length(fm, filename):
    f = fm._file(filename)
    f.seek(0, 2)  # length may move the cursor; read/append must seek afterwards
    return f.tell() // fm.block_size


def _fixture_read(fm, block, page):
    if block.blknum >= _fixture_length(fm, block.filename):
        raise ValueError("block past end")
    f = fm._file(block.filename)
    f.seek(block.blknum * fm.block_size)
    page.contents()[:] = f.read(fm.block_size)


def _fixture_write(fm, block, page, sync=True):
    f = fm._file(block.filename)
    f.seek(block.blknum * fm.block_size)
    f.write(page.contents())
    f.flush()
    if sync:
        os.fsync(f.fileno())


def _fixture_append(fm, filename):
    block = BlockId(filename, _fixture_length(fm, filename))
    _fixture_write(fm, block, Page(fm.block_size), sync=False)
    return block


_UNIT_DEPENDENCIES = {
    Page: {
        "get_int": _fixture_get_int,
        "set_int": _fixture_set_int,
        "get_bytes": _fixture_get_bytes,
        "set_bytes": _fixture_set_bytes,
        "get_string": lambda page, off: _fixture_get_bytes(page, off).decode("utf-8"),
        "set_string": lambda page, off, value: _fixture_set_bytes(page, off, value.encode("utf-8")),
    },
    FileManager: {"read": _fixture_read, "write": _fixture_write,
                  "append": _fixture_append, "length": _fixture_length},
}


def _isolated(target, test):
    with ExitStack() as stack:
        for cls, methods in _UNIT_DEPENDENCIES.items():
            for name, implementation in methods.items():
                if f"{cls.__name__}.{name}" != target:
                    stack.enter_context(patch.object(cls, name, implementation))
        test()


def _unit_page(method):
    is_int = method.endswith("int")
    is_string = method.endswith("string")
    values = [0, -2147483648, 2147483647, -19] if is_int else (
        ["", "ada", "héllo 🌳"] if is_string else [b"", b"\x00\xffabc", b"xyz"])
    for value in values:
        p = Page(BLOCK_SIZE)
        p.contents()[:] = b"\xa5" * BLOCK_SIZE
        off = 7
        data = value.encode("utf-8") if is_string else value
        encoded = struct.pack("<i", value) if is_int else struct.pack("<i", len(data)) + data
        expected = bytearray(p.contents())
        expected[off:off + len(encoded)] = encoded
        if method.startswith("get"):
            p.contents()[:] = expected
            got = getattr(p, method)(off)
            expect(got == value, f"{method} at offset {off}: got {got!r}, expected {value!r}")
            expect(p.contents() == expected, "reading must not change page bytes")
        else:
            getattr(p, method)(off, value)
            expect(p.contents() == expected,
                   f"{method} must write the specified bytes and preserve neighboring bytes")


def _unit_file(method):
    with tempfile.TemporaryDirectory(prefix="microdb-unit-") as d:
        filename = "t.tbl"
        path = os.path.join(d, filename)
        original = b"a" * BLOCK_SIZE + b"b" * BLOCK_SIZE + b"c" * BLOCK_SIZE
        with open(path, "wb") as f:
            f.write(original)
        fm = FileManager(d, BLOCK_SIZE)
        try:
            if method == "length":
                expect(fm.length(filename) == 3, "existing file has three blocks")
                expect(fm.length("empty.tbl") == 0, "a new file has zero blocks")
                with open(path, "ab") as f:
                    f.write(b"d" * BLOCK_SIZE)
                expect(fm.length(filename) == 4, "length must observe file growth")
            elif method == "read":
                p = Page(BLOCK_SIZE)
                for k in [2, 0, 1, 2]:
                    fm.read(BlockId(filename, k), p)
                    expect(bytes(p.contents()) == original[k * BLOCK_SIZE:(k + 1) * BLOCK_SIZE],
                           f"read must seek to block {k}, including the last valid block")
                try:
                    fm.read(BlockId(filename, 3), p)
                except ValueError:
                    pass
                else:
                    raise AssertionError("reading the first block past the end must raise ValueError")
            elif method == "append":
                for k in (3, 4):
                    block = fm.append(filename)
                    expect(block == BlockId(filename, k), "append must return the new block's ID")
                    with open(path, "rb") as f:
                        expect(f.read() == original + bytes((k - 2) * BLOCK_SIZE),
                               "append must preserve existing blocks and add one zeroed block")
                expect(fm.append("new.tbl") == BlockId("new.tbl", 0), "new file starts at block zero")
                with open(os.path.join(d, "new.tbl"), "rb") as f:
                    expect(f.read() == bytes(BLOCK_SIZE), "new file contains one zeroed block")
            else:
                p = Page(BLOCK_SIZE)
                p.contents()[:] = bytes(range(BLOCK_SIZE))
                expected = original[:BLOCK_SIZE] + bytes(p.contents()) + original[2 * BLOCK_SIZE:]
                synced = []
                def observe_sync(fd):
                    with open(path, "rb") as f:
                        expect(f.read() == expected, "flush written bytes before fsync")
                    expect(fd == fm._file(filename).fileno(), "sync the written file")
                    synced.append(fd)
                with patch("file_manager.os.fsync", side_effect=observe_sync):
                    fm.write(BlockId(filename, 1), p)
                expect(bool(synced), "write defaults to sync=True and must call fsync")
                with open(path, "rb") as f:
                    expect(f.read() == expected, "write the target block and preserve its neighbors")
                p.contents()[:] = b"z" * BLOCK_SIZE
                with patch("file_manager.os.fsync") as sync:
                    fm.write(BlockId(filename, 1), p, sync=False)
                    expect(not sync.called, "sync=False must not call fsync")
                with open(path, "rb") as f:
                    expect(f.read() == original[:BLOCK_SIZE] + bytes(p.contents()) + original[2 * BLOCK_SIZE:],
                           "sync=False still writes and flushes the requested bytes")
        finally:
            fm.close()


UNIT_TESTS = {}
for _cls, _methods in _UNIT_DEPENDENCIES.items():
    for _method in _methods:
        _target = f"{_cls.__name__}.{_method}"
        _test = _unit_page if _cls is Page else _unit_file
        UNIT_TESTS[_target] = lambda target=_target, method=_method, test=_test: _isolated(
            target, lambda: test(method))


def run_integration():
    RESULTS.clear()
    print("PAGE group")
    check("PAGE", "int round-trip (incl. negative, INT_MAX)", test_int_roundtrip)
    check("PAGE", "bytes round-trip (length-prefixed)",       test_bytes_roundtrip)
    check("PAGE", "string round-trip (UTF-8, incl. empty)",   test_string_roundtrip)
    check("PAGE", "adjacent values don't clobber (ada row)",  test_adjacent_values)
    print("FILE group")
    check("FILE", "append grows length 0 → 1 → 2",            test_append_grows_length)
    check("FILE", "write/read round-trip",                    test_write_read_roundtrip)
    check("FILE", "blocks are independent",                   test_block_independence)
    check("FILE", "read past end raises ValueError",          test_read_past_end_raises)
    check("FILE", "data survives close + reopen",             test_durability_across_reopen)
    n_pass = sum(RESULTS)
    print(f"\n{n_pass}/{len(RESULTS)} tests passed")
    sys.exit(0 if n_pass == len(RESULTS) else 1)


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--list", action="store_true", help="list function-level test targets")
    mode.add_argument("--unit", nargs="?", const="all", choices=["all", *UNIT_TESTS],
                      metavar="TARGET", help="test one function, or all functions if omitted")
    parser.add_argument("-v", action="store_true", help="show tracebacks for failures")
    args = parser.parse_args()
    if args.list:
        print("\n".join(UNIT_TESTS))
        return
    if args.unit is not None:
        RESULTS.clear()
        print("UNIT checks use test fixtures for unfinished dependencies.")
        print("Run without --unit to check the complete implementation together.")
        names = UNIT_TESTS if args.unit == "all" else [args.unit]
        for name in names:
            check("UNIT", name, UNIT_TESTS[name])
        n = sum(RESULTS)
        print(f"\n{n}/{len(RESULTS)} function checks passed")
        sys.exit(0 if n == len(RESULTS) else 1)
    run_integration()


if __name__ == "__main__":
    main()
