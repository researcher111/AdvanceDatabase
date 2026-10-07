#!/usr/bin/env python3
"""Build the course taxi database and serve a local SQL discovery workbench.

From the repository root:
  python3 -m pip install -r lectures/lecture-10/discovery/requirements.txt
  python3 lectures/lecture-10/discovery/discovery.py --serve

No data download or API key: uses Lab 8's bundled, cleaned 2024 TLC sample.
"""
import argparse
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from urllib.parse import urlsplit

import duckdb

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DATA = ROOT / 'labs/lab-08/starter'
DEFAULT_DB = HERE.parent / 'discovery-data/taxi.duckdb'
CASES = json.loads((HERE / 'cases.json').read_text())


def fingerprint():
    return {name: hashlib.sha256((DATA / name).read_bytes()).hexdigest()
            for name in ['rides_2024_sample.csv.gz', 'taxi_zone_lookup.csv']}


def build_database(database):
    """Create once; do not overwrite a student's existing database."""
    database = Path(database)
    if database.exists():
        with duckdb.connect(str(database), read_only=True) as con:
            rows = dict(con.execute('SELECT filename, sha256 FROM source_files').fetchall())
            if rows != fingerprint():
                raise ValueError('This database uses a different sample. Choose a new --database path.')
        return
    database.parent.mkdir(parents=True, exist_ok=True)
    with duckdb.connect(str(database)) as con:
        con.execute('BEGIN')
        try:
            con.execute('''CREATE TABLE rides (
              ride_id INTEGER PRIMARY KEY, month INTEGER, day INTEGER,
              passengers INTEGER, distance DOUBLE, fare DOUBLE, tip DOUBLE,
              payment VARCHAR, pickup_zone INTEGER, dropoff_zone INTEGER,
              hour INTEGER, duration_min DOUBLE)''')
            con.execute('INSERT INTO rides SELECT * FROM read_csv(?, header=true)', [str(DATA / 'rides_2024_sample.csv.gz')])
            con.execute('''CREATE TABLE zones (
              LocationID INTEGER PRIMARY KEY, Borough VARCHAR, Zone VARCHAR, service_zone VARCHAR)''')
            con.execute('INSERT INTO zones SELECT * FROM read_csv(?, header=true)', [str(DATA / 'taxi_zone_lookup.csv')])
            con.execute('''CREATE VIEW trips AS
              SELECT r.*, p.Zone AS pickup_name, p.Borough AS pickup_borough,
                     d.Zone AS dropoff_name, d.Borough AS dropoff_borough
              FROM rides r
              LEFT JOIN zones p ON r.pickup_zone = p.LocationID
              LEFT JOIN zones d ON r.dropoff_zone = d.LocationID''')
            assert con.execute('SELECT count(*) FROM rides').fetchone()[0] == 60000
            assert con.execute('SELECT count(*) FROM zones').fetchone()[0] == 265
            assert con.execute('SELECT count(*) FROM trips').fetchone()[0] == 60000
            assert con.execute('SELECT count(*) FROM trips WHERE pickup_name IS NULL OR dropoff_name IS NULL').fetchone()[0] == 0
            assert con.execute('SELECT min(n), max(n) FROM (SELECT count(*) n FROM rides GROUP BY month)').fetchone() == (5000, 5000)
            con.execute('CREATE TABLE source_files (filename VARCHAR PRIMARY KEY, sha256 VARCHAR)')
            con.executemany('INSERT INTO source_files VALUES (?, ?)', list(fingerprint().items()))
            con.execute('COMMIT')
        except Exception:
            con.execute('ROLLBACK')
            raise


def query(database, sql):
    """One read-only query; cap returned rows and isolate SQL from local files."""
    with duckdb.connect(str(database), read_only=True,
                        config={'enable_external_access': False, 'threads': 2, 'memory_limit': '256MB'}) as con:
        statements = con.extract_statements(sql)
        if len(statements) != 1 or statements[0].type != duckdb.StatementType.SELECT:
            raise ValueError('Run one SELECT or WITH…SELECT query at a time. The explorer does not change the database.')
        timeout = threading.Timer(8, con.interrupt)
        timeout.start()
        try:
            result = con.execute(sql)
            columns = [c[0] for c in result.description]
            rows = result.fetchmany(201)
            return {'columns': columns, 'rows': [list(row) for row in rows[:200]], 'truncated': len(rows) > 200}
        finally:
            timeout.cancel()


def snapshot(database):
    return {'source': 'Cleaned course sample: 60,000 NYC yellow-taxi trips, 2024; 5,000 per month.',
            'duckdb_version': duckdb.__version__, 'sha256': fingerprint(),
            'cases': [{**c, 'result': query(database, c['sql'])} for c in CASES]}


class Explorer(SimpleHTTPRequestHandler):
    def __init__(self, *args, database, **kwargs):
        self.database = database
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/lectures/lecture-10/discovery.html')
            self.end_headers()
        elif path == '/lectures/lecture-10/discovery.html':
            body = (HERE.parent / 'discovery.html').read_text().replace(
                '<!-- live-config -->', '<script>window.DISCOVERY_LIVE = true;</script>').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path.startswith('/.git') or '/../' in path:
            self.send_error(404)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != '/api/query':
            self.send_error(404)
            return
        # Only same-origin browser requests may invoke this localhost endpoint.
        origin = self.headers.get('Origin')
        if origin and origin != 'http://' + self.headers.get('Host', ''):
            self.send_error(403)
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 20000:
                raise ValueError('Query request must be between 1 and 20,000 bytes.')
            request = json.loads(self.rfile.read(size))
            if not isinstance(request, dict):
                raise ValueError('Provide a JSON object containing SQL text.')
            sql = request.get('sql')
            if not isinstance(sql, str):
                raise ValueError('Provide SQL text.')
            payload, status = query(self.database, sql), 200
        except (ValueError, duckdb.Error) as exc:
            payload, status = {'error': str(exc)}, 400
        body = json.dumps(payload, default=str, allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=DEFAULT_DB)
    parser.add_argument('--serve', action='store_true', help='open the local SQL workbench at http://127.0.0.1:8770')
    parser.add_argument('--port', type=int, default=8770)
    parser.add_argument('--snapshot', action='store_true', help='recompute the saved website results from the SQL')
    args = parser.parse_args()
    build_database(args.database)
    print(f'Database ready: {args.database}\n60,000 rides · 265 zones · trips view: 60,000 rows', flush=True)
    if args.snapshot:
        content = 'window.TAXI_DISCOVERY = ' + json.dumps(snapshot(args.database), ensure_ascii=False, indent=2) + ';\n'
        (HERE / 'results.js').write_text(content)
        print('Updated discovery/results.js from executed SQL.')
    if args.serve:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Explorer, database=args.database))
        print(f'Open http://127.0.0.1:{args.port}/lectures/lecture-10/discovery.html\nCtrl-C stops the server; the database stays on disk.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == '__main__':
    main()
