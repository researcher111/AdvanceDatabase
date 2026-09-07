"""Ungraded regression checks for supplied code; student TODOs stay unimplemented.

Run from the repository root: python3 -m unittest discover -s tests -v
"""
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SuppliedCodeTests(unittest.TestCase):
    def run_code(self, lab, code):
        result = subprocess.run(
            [sys.executable, '-c', code],
            cwd=ROOT / 'labs' / f'lab-{lab:02d}' / 'starter',
            capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_products_handle_empty_inputs_rewinds_and_exhaustion(self):
        for lab in (5, 6, 7):
            with self.subTest(lab=lab):
                self.run_code(lab, '''
from query_engine import ProductScan
class Rows:
    def __init__(self, field, rows): self.field, self.rows, self.i = field, rows, -1
    def before_first(self): self.i = -1
    def next(self):
        self.i += 1
        return self.i < len(self.rows)
    def get_val(self, field):
        assert 0 <= self.i < len(self.rows), "read from an unpositioned scan"
        return self.rows[self.i]
    def has_field(self, field): return field == self.field
    def close(self): pass
for left, right in [([], []), ([], [1]), ([1], []), ([1, 2], [3, 4])]:
    p = ProductScan(Rows('a', left), Rows('b', right))
    for _ in range(2):
        p.before_first()
        got = []
        while p.next(): got.append((p.get_val('a'), p.get_val('b')))
        assert got == [(a,b) for a in left for b in right], got
        assert not p.next() and not p.next(), "exhausted product restarted"
''')

    def test_oversized_utf8_value_does_not_corrupt_neighbor(self):
        for lab in (4, 5, 6, 7):
            with self.subTest(lab=lab):
                self.run_code(lab, '''
import tempfile
from file_manager import FileManager
from buffer_manager import BufferManager
from record_manager import Schema, Layout, TableScan
with tempfile.TemporaryDirectory() as d:
    fm = FileManager(d, 128)
    bm = BufferManager(fm, 2)
    layout = Layout(Schema().add_string_field('name', 4).add_int_field('score'))
    ts = TableScan(bm, fm, 'people', layout)
    ts.insert(); ts.set_string('name', 'éé'); ts.set_int('score', 39)
    try: ts.set_string('name', 'ééé')
    except ValueError: pass
    else: raise AssertionError('oversized UTF-8 write accepted')
    assert ts.get_string('name') == 'éé' and ts.get_int('score') == 39
    ts.close(); bm.flush_all(); fm.close()
''')

    def test_transaction_ids_survive_process_restart(self):
        self.run_code(7, '''
import tempfile
from transaction import Transaction, LogManager, LockTable
with tempfile.TemporaryDirectory() as d:
    lm = LogManager(d)
    lm.append({'kind': 'START', 'tx': 42})
    lm.append({'kind': 'COMMIT', 'tx': 42})
    lm.close()
    lm = LogManager(d)
    Transaction._next_txnum = 1  # the initial state of a restarted interpreter
    a = Transaction(None, None, lm, LockTable())
    b = Transaction(None, None, lm, LockTable())
    assert (a.txnum, b.txnum) == (43, 44)
    lm.close()
''')

    def test_log_append_syncs_before_return_and_propagates_io_errors(self):
        self.run_code(7, '''
import tempfile
from unittest.mock import patch
from transaction import LogManager
with tempfile.TemporaryDirectory() as d:
    lm = LogManager(d)
    def observe(fd):
        assert lm.records_backwards()[0]['kind'] == 'SET_INT'
    with patch('transaction.os.fsync', side_effect=observe) as sync:
        lm.append({'kind': 'SET_INT', 'tx': 1, 'old': 10})
        assert sync.call_count == 1
    with patch('transaction.os.fsync', side_effect=OSError('disk error')):
        try: lm.append({'kind': 'COMMIT', 'tx': 1})
        except OSError: pass
        else: raise AssertionError('sync error swallowed')
    lm.close()
''')


if __name__ == '__main__':
    unittest.main()
