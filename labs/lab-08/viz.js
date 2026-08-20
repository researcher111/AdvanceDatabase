/* Lab 8 — DuckDB + Partitioned Parquet · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'window-fn': {
      title: 'Window function',
      body: '<p>An aggregate that each row can see without collapsing the rows — ' +
        '<code>SUM(x) OVER (ORDER BY month)</code> gives every row the running total up to ' +
        'itself. GROUP BY folds rows into groups; a window keeps the rows and annotates them. ' +
        'The analyst workhorses (running totals, ranks, moving averages) are all windows.</p>',
    },
    'projection-pushdown': {
      title: 'Projection pushdown',
      body: '<p>Reading only the columns a query names — the column-store sibling of ' +
        'predicate pushdown. In a row store the other columns come along physically; in ' +
        'Parquet/DuckDB they are simply never fetched. Naming your columns instead of ' +
        'SELECT * stops being style advice and becomes a measured cost difference.</p>',
    },
    'hive-partitioning': {
      title: 'Hive partitioning',
      body: '<p>The key=value folder convention (month=12/part-0.parquet) inherited from ' +
        'Apache Hive: the partition column lives in directory names, not in the files. ' +
        'Readers reconstruct the column from paths and skip whole directories on matching ' +
        'WHERE clauses — pruning before a single byte of data is opened.</p>',
    },
    'row-group': {
      title: 'Row group',
      body: '<p>Parquet’s internal chunk: a horizontal slice (~100k rows) whose columns are ' +
        'stored contiguously with min/max statistics per column. Small enough to skip on ' +
        'stats, large enough to compress and scan efficiently — the Parquet-internal ' +
        'equivalent of a block, sized for analytics.</p>',
    },
    'decimal-type': {
      title: 'DECIMAL type',
      body: '<p>Exact fixed-point numbers (DECIMAL(10,2) = up to 10 digits, 2 after the ' +
        'point) — no floating-point rounding drift, which is why money columns use them. ' +
        'Doubles are fine for distances and rates; sums of many small money values are ' +
        'where float error compounds into auditors’ questions.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Mini analytics REPL ---------------- */
(function () {
  const root = document.getElementById('viz-duck');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const screen = $('dk-screen'), input = $('dk-input');

  // 600-row sample, seeded LCG mirroring gen_data.py's shape.
  const rand = LabBase.makeLcg(6042);
  const RIDES = [];
  for (let i = 0; i < 600; i++) {
    const month = 1 + Math.floor(rand() * 12);
    const distance = Math.round(Math.exp(0.9 + 0.7 * (rand() * 2 - 1)) * 100) / 100;
    const fare = Math.round((2.5 + distance * 2.4 + rand() * 2) * 100) / 100;
    const payment = rand() < 0.72 ? 'card' : 'cash';
    const tip = payment === 'card' ? Math.round(fare * (0.1 + rand() * 0.15) * 100) / 100 : 0;
    RIDES.push({ ride_id: i, month, day: 1 + Math.floor(rand() * 28),
                 passengers: 1 + Math.floor(rand() * 4) % 4, distance, fare, tip, payment });
  }

  function print(cls, text) {
    screen.insertAdjacentHTML('beforeend',
      `<div class="${cls}">${String(text).replace(/</g, '&lt;')}</div>`);
    screen.scrollTop = screen.scrollHeight;
  }

  // A tiny SQL-ish evaluator for the demo query shapes.
  function run(sql) {
    print('in', 'duckdb> ' + sql);
    try {
      const q = sql.trim().replace(/;$/, '');
      const out = evaluate(q);
      print('out', out);
    } catch (e) {
      print('err', 'error: ' + e.message + ' (the browser mini-engine only speaks the preset shapes; the real lab speaks full SQL)');
    }
  }

  function fmtTable(rows, cols) {
    if (!rows.length) return '(no rows)';
    const w = {};
    cols.forEach(c => w[c] = Math.max(c.length, ...rows.map(r => String(r[c]).length)));
    const line = r => cols.map(c => String(r[c]).padEnd(w[c])).join('  ');
    return [line(Object.fromEntries(cols.map(c => [c, c]))),
            cols.map(c => '-'.repeat(w[c])).join('  '),
            ...rows.map(line)].join('\n');
  }

  function evaluate(q) {
    const norm = q.toLowerCase().replace(/\s+/g, ' ');
    if (norm.includes('group by month') && norm.includes('sum(fare + tip)')) {
      const by = {};
      RIDES.forEach(r => { by[r.month] = (by[r.month] || 0) + r.fare + r.tip; });
      return fmtTable(Object.keys(by).sort((a, b) => a - b).map(m =>
        ({ month: m, revenue: by[m].toFixed(2) })), ['month', 'revenue']);
    }
    if (norm.includes('order by fare desc')) {
      const top = [...RIDES].sort((a, b) => b.fare - a.fare || a.ride_id - b.ride_id).slice(0, 5);
      return fmtTable(top.map(r => ({ ride_id: r.ride_id, fare: r.fare.toFixed(2) })),
                      ['ride_id', 'fare']);
    }
    if (norm.includes('case when') || norm.includes('card_share')) {
      const by = {};
      RIDES.forEach(r => {
        (by[r.month] = by[r.month] || []).push(r.payment === 'card' ? 1 : 0);
      });
      return fmtTable(Object.keys(by).sort((a, b) => a - b).map(m =>
        ({ month: m, card_share: (by[m].reduce((a, b) => a + b, 0) / by[m].length).toFixed(3) })),
        ['month', 'card_share']);
    }
    if (norm.includes('group by payment')) {
      const by = {};
      RIDES.forEach(r => { (by[r.payment] = by[r.payment] || []).push(r); });
      return fmtTable(Object.keys(by).sort().map(p =>
        ({ payment: p, n: by[p].length,
           avg_distance: (by[p].reduce((a, r) => a + r.distance, 0) / by[p].length).toFixed(2) })),
        ['payment', 'n', 'avg_distance']);
    }
    if (norm.startsWith('select count(*)')) {
      return fmtTable([{ n_rides: RIDES.length,
                         revenue: RIDES.reduce((a, r) => a + r.fare + r.tip, 0).toFixed(2) }],
                      ['n_rides', 'revenue']);
    }
    throw new Error('unrecognized shape');
  }

  function reset() {
    screen.innerHTML = '';
    print('note', `rides sample loaded: ${RIDES.length} rows (the real lab has 60,000). Try the presets.`);
  }

  $('dk-q1').addEventListener('click', () =>
    run("SELECT month, round(sum(fare + tip), 2) AS revenue FROM rides GROUP BY month ORDER BY month"));
  $('dk-q2').addEventListener('click', () =>
    run("SELECT ride_id, fare FROM rides ORDER BY fare DESC, ride_id LIMIT 5"));
  $('dk-q3').addEventListener('click', () =>
    run("SELECT month, round(avg(CASE WHEN payment = 'card' THEN 1.0 ELSE 0.0 END), 3) AS card_share FROM rides GROUP BY month ORDER BY month"));
  $('dk-clear').addEventListener('click', reset);
  $('dk-run').addEventListener('click', () => { if (input.value.trim()) { run(input.value.trim()); input.value = ''; } });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) { run(input.value.trim()); input.value = ''; }
  });
  reset();
})();
