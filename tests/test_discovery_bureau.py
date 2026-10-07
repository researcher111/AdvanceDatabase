"""Offline evidence checks for the hosted-database discovery lessons."""
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / 'lectures/discovery'


class DiscoveryBureauTests(unittest.TestCase):
    def setUp(self):
        self.cases = {name: json.loads((HERE / 'snapshots' / (name + '.json')).read_text())
                      for name in ['city', 'weather', 'planets', 'evidence']}

    def records(self, name):
        case = self.cases[name]
        return [dict(zip(case['columns'], row)) for row in case['rows']]

    def test_saved_evidence_has_exact_query_provenance_and_matching_exports(self):
        bundle = (HERE / 'data.js').read_text()
        self.assertEqual(json.loads(bundle.removeprefix('window.DISCOVERY_CASES = ').rstrip(';\n')), self.cases)
        for name, case in self.cases.items():
            query = (HERE / 'queries' / case['query_file']).read_text()
            self.assertEqual(case['query'], query)
            self.assertEqual(case['query_sha256'], hashlib.sha256(query.encode()).hexdigest())
            self.assertRegex(case['response_sha256'], r'^[a-f0-9]{64}$')
            self.assertIsNotNone(datetime.fromisoformat(case['retrieved_at']).tzinfo)
            self.assertTrue(case['endpoint'].startswith('https://'))
            with (HERE / 'snapshots' / (name + '.csv')).open(newline='') as stream:
                exported = list(csv.reader(stream))
            self.assertEqual(exported[0], case['columns'])
            self.assertEqual(exported[1:], [[str(v) if v is not None else '' for v in row] for row in case['rows']])

    def test_city_denominators_and_weather_row_grain(self):
        rows = self.records('city')
        self.assertEqual(len(rows), 48)
        self.assertEqual({(r['day_type'], int(r['hour'])) for r in rows},
                         {(kind, hour) for kind in ['Weekday', 'Weekend'] for hour in range(24)})
        for row in rows:
            self.assertEqual(int(row['observed_dates']), 23 if row['day_type'] == 'Weekday' else 8)
            self.assertAlmostEqual(float(row['trips_per_observed_day']), int(row['trips']) / int(row['observed_dates']), delta=.051)
        weather = self.records('weather')
        self.assertEqual(len({row['date'] for row in weather}), 31)
        self.assertTrue(all(row['encoded_avg_c'] == 0 for row in weather))
        self.assertTrue(all(row['max_c'] >= row['min_c'] > 0 for row in weather))

    def test_catalog_coverage_and_graph_optional_references(self):
        for row in self.records('planets'):
            self.assertGreater(row['planets'], 0)
            self.assertTrue(0 <= row['with_period'] <= row['planets'])
            self.assertTrue(0 <= row['with_radius'] <= row['planets'])
        records = self.records('evidence')
        self.assertTrue(all(row['mission'].endswith('/Q1323537') for row in records))
        self.assertTrue(all(row['statement'] and row['operator'] for row in records))
        self.assertTrue(any(row['reference'] is None for row in records))
        self.assertTrue(any(row['reference'] and row['referenceURL'] is None for row in records))
        self.assertTrue(any(row['importURL'] and 'wikipedia.org' in row['importURL'] for row in records))

    def test_all_five_cases_are_linked_from_schedule(self):
        schedule = (ROOT / 'schedule.html').read_text()
        page = (HERE / 'index.html').read_text()
        for case in [*self.cases, 'finale']:
            self.assertIn('lectures/discovery/index.html#' + case, schedule)
            self.assertIn('id="' + case + '"', page)
        self.assertIn('55–75 · Project question swap', page)
        self.assertIn('30–75 · Rehearse the project', page)
        self.assertIn('Case 1 · Thursday November 19 · Minutes 0–25', page)
        self.assertIn('Case 2 · Thursday November 19 · Minutes 25–55', page)


if __name__ == '__main__':
    unittest.main()
