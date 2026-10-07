#!/usr/bin/env python3
"""Refresh small teaching snapshots from public, read-only hosted databases.

No install, account, or database creation. Run only when preparing a class:
  python3 lectures/discovery/refresh.py
  python3 lectures/discovery/refresh.py weather
The website itself makes no requests to these services.
"""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import urllib.parse
import urllib.request

HERE = Path(__file__).resolve().parent
CASES = {
    'city': ('city.sql', 'clickhouse', 'https://sql-clickhouse.clickhouse.com/'),
    'weather': ('weather.sql', 'clickhouse', 'https://sql-clickhouse.clickhouse.com/'),
    'planets': ('planets.sql', 'tap', 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'),
    'evidence': ('evidence.sparql', 'sparql', 'https://query.wikidata.org/sparql'),
}


def fetch_case(case):
    filename, engine, endpoint = CASES[case]
    sql = (HERE / 'queries' / filename).read_text()
    # The named demo user is public, read-only, and has an empty password.
    params = ({'user': 'demo', 'query': sql + '\nFORMAT JSON'} if engine == 'clickhouse'
              else {'query': sql, 'format': 'json'})
    url = endpoint + '?' + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={
        'User-Agent': 'AdvancedDatabaseCourse/1.0 (https://researcher111.github.io/AdvanceDatabase/)',
        'Accept': 'application/sparql-results+json' if engine == 'sparql' else 'application/json',
    })
    with urllib.request.urlopen(request, timeout=35) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Unexpectedly large response; narrow the query before refreshing.')
        data = json.loads(raw)
    if engine == 'clickhouse':
        columns = [column['name'] for column in data['meta']]
        rows = [[row.get(column) for column in columns] for row in data['data']]
    elif engine == 'sparql':
        columns = data['head']['vars']
        rows = [[row.get(column, {}).get('value') for column in columns]
                for row in data['results']['bindings']]
    else:
        if not isinstance(data, list) or not data:
            raise ValueError('Expected a non-empty TAP result array.')
        columns = list(data[0])
        rows = [[row.get(column) for column in columns] for row in data]
    if not rows or len(rows) > 500:
        raise ValueError('Expected 1–500 rows; keep classroom snapshots small.')
    return {'case': case, 'engine': engine, 'endpoint': endpoint,
            'retrieved_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'query_file': filename, 'query': sql,
            'query_sha256': hashlib.sha256(sql.encode()).hexdigest(),
            'response_sha256': hashlib.sha256(raw).hexdigest(),
            'columns': columns, 'rows': rows}


def save_case(case, snapshot):
    target = HERE / 'snapshots' / (case + '.json')
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(target)
    output = io.StringIO(newline='')
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(snapshot['columns'])
    writer.writerows(snapshot['rows'])
    target.with_suffix('.csv').write_text(output.getvalue())


def bundle():
    snapshots = {case: json.loads((HERE / 'snapshots' / (case + '.json')).read_text())
                 for case in CASES if (HERE / 'snapshots' / (case + '.json')).exists()}
    (HERE / 'data.js').write_text('window.DISCOVERY_CASES = ' + json.dumps(snapshots, ensure_ascii=False) + ';\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('case', nargs='?', choices=CASES)
    args = parser.parse_args()
    for case in [args.case] if args.case else CASES:
        result = fetch_case(case)  # A failed request leaves the existing snapshot intact.
        save_case(case, result)
        bundle()
        print(f'{case}: {len(result["rows"])} rows from {result["endpoint"]}', flush=True)


if __name__ == '__main__':
    main()
