"""Run with the discovery requirements installed; no student TODOs are completed."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
try:
    import duckdb
except ImportError:
    duckdb = None


@unittest.skipUnless(duckdb, 'Install the discovery requirements to exercise DuckDB')
class DiscoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = ROOT / 'lectures/lecture-10/discovery/discovery.py'
        spec = importlib.util.spec_from_file_location('discovery', path)
        cls.demo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.demo)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.database = Path(cls.tmp.name) / 'test.duckdb'
        cls.demo.build_database(cls.database)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_load_and_two_joins_preserve_observation_count(self):
        with duckdb.connect(str(self.database), read_only=True) as con:
            self.assertEqual(con.execute('SELECT count(*), count(DISTINCT ride_id) FROM trips').fetchone(), (60000, 60000))
            self.assertEqual(con.execute('SELECT count(*), count(DISTINCT LocationID) FROM zones').fetchone(), (265, 265))
            self.assertEqual(con.execute('SELECT count(*) FROM trips WHERE pickup_name IS NULL OR dropoff_name IS NULL').fetchone()[0], 0)
        before = self.database.read_bytes()
        self.demo.build_database(self.database)
        self.assertEqual(before, self.database.read_bytes(), 'rerunning setup does not recreate the database')

    def test_every_saved_result_is_produced_by_its_sql(self):
        saved = (self.demo.HERE / 'results.js').read_text()
        snapshot = json.loads(saved.removeprefix('window.TAXI_DISCOVERY = ').removesuffix(';\n'))
        self.assertEqual(snapshot['sha256'], self.demo.fingerprint())
        self.assertEqual(len(snapshot['cases']), 7)
        for current, expected in zip(self.demo.CASES, snapshot['cases']):
            with self.subTest(case=current['id']):
                for field in ['id', 'title', 'predict', 'sql', 'chart', 'interpret', 'follow']:
                    self.assertEqual(current[field], expected[field])
                self.assertEqual(self.demo.query(self.database, current['sql']), expected['result'])

    def test_discoveries_and_their_denominators(self):
        values = {c['id']: self.demo.query(self.database, c['sql']) for c in self.demo.CASES}
        self.assertEqual([r[1] for r in values['sample']['rows']], [5000] * 12)
        tips = {r[0]: r[1:] for r in values['tips']['rows']}
        self.assertEqual(tips['cash'][1:], [0.0, 100.0])
        airports = {r[0]: r for r in values['airports']['rows']}
        self.assertGreater(airports['JFK Airport'][2], airports['LaGuardia Airport'][2])
        self.assertLess(airports['JFK Airport'][-1], airports['LaGuardia Airport'][-1])
        rhythms = values['rhythms']['rows']
        for zone in {r[0] for r in rhythms}:
            self.assertAlmostEqual(sum(r[3] for r in rhythms if r[0] == zone), 100, delta=.15)
        correct, duplicated = values['join']['rows']
        self.assertEqual(correct[1:3], [60000, 60000])
        with duckdb.connect(str(self.database), read_only=True) as con:
            times_square = con.execute('SELECT count(*) FROM rides WHERE pickup_zone=230').fetchone()[0]
        self.assertEqual(duplicated[1], 60000 + times_square)
        self.assertEqual(duplicated[2], 60000)
        self.assertGreater(duplicated[3], correct[3])

    def test_editor_is_read_only_and_caps_display_rows(self):
        for sql in ['DELETE FROM rides', 'CREATE TABLE surprise(i INTEGER)', 'SELECT 1; SELECT 2']:
            with self.subTest(sql=sql), self.assertRaises(ValueError):
                self.demo.query(self.database, sql)
        with self.assertRaises(duckdb.Error):
            self.demo.query(self.database, "SELECT * FROM read_csv('/etc/passwd')")
        result = self.demo.query(self.database, 'SELECT ride_id FROM rides ORDER BY ride_id')
        self.assertEqual(len(result['rows']), 200)
        self.assertTrue(result['truncated'])
        self.assertFalse(self.demo.query(self.database, 'SELECT * FROM rides WHERE false')['truncated'])
        self.assertEqual(self.demo.query(self.database, 'SELECT count(*) AS n FROM rides')['rows'], [[60000]])


if __name__ == '__main__':
    unittest.main()
