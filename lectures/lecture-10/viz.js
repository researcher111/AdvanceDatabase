/* Lecture 10 — The Analytics Stack · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'volcano': {
      title: 'Volcano (iterator model)',
      body: '<p>The row-at-a-time iterator model that microdb’s query engine uses, named after the 1990s Volcano research system that popularised it. Every operator (scan, filter, join, aggregate) exposes the same calls, before_first, next, and get, and pulls one row at a time from the operator below it. It is simple to build and compose, but every row pays the full cost of a function call and a branch at every operator. Vectorized engines keep the same interface and change only the unit of work: next() returns a batch of about 2048 values instead of one row.</p>',
    },
    'fact-table': {
      title: 'Fact table',
      body: '<p>The big table at the center of an analytics schema: one row per event (a ride, a sale, a click), holding a numeric measure or two and a set of keys or codes recording when, where, and who. Fact tables are wide and long: tens of columns, millions of rows, appended in bulk and rarely updated. That shape is exactly what compression likes, because each column is a long run of one type with many repeated values. The rides table in Thursday’s lab is a small fact table.</p>',
    },
    'vectorized': {
      title: 'Vectorized execution',
      body: '<p>Processing a batch (~2048 values) per operator call instead of one row — the ' +
        'iterator model with bigger sips. Interpreter overhead amortizes across the batch and ' +
        'the inner loops become tight array code that modern CPUs (and their SIMD units) run ' +
        'near memory speed. DuckDB, Snowflake, and every serious OLAP engine execute this way.</p>',
    },
    'warehouse': {
      title: 'Data warehouse',
      body: '<p>A columnar analytics database fed by the operational systems — the place ' +
        '“all the company’s data” goes to be queried. Cloud versions (Snowflake, BigQuery, ' +
        'Redshift) separate storage from compute: data rests cheaply in object storage while ' +
        'query clusters materialize on demand and bill by use.</p>',
    },
    'lakehouse': {
      title: 'Lakehouse',
      body: '<p>Parquet files in cheap object storage plus a transactional metadata layer ' +
        '(Delta Lake, Apache Iceberg) that records which files constitute the table, enabling ' +
        'ACID commits, schema evolution, and time travel over what is otherwise just a folder. ' +
        'Structurally: a catalog + WAL conferring table-hood on a lake.</p>',
    },
    'partitioning-files': {
      title: 'Partitioning (files)',
      body: '<p>Laying data out in value-keyed folders — <code>month=12/part-0.parquet</code> — ' +
        'so that a WHERE clause on the partition key becomes “don’t open those directories.” ' +
        'The cheapest possible predicate pushdown, and the same word (partition) returns at ' +
        'cluster scale in week 13.</p>',
    },
    'object-storage': {
      title: 'Object storage',
      body: '<p>The cloud’s bulk file system (S3, GCS, Azure Blob): named blobs, fetched by ' +
        'HTTP, infinitely scalable, seconds-cheap per terabyte — and no seek/update semantics: ' +
        'you read, write whole objects, or list. Perfect for immutable Parquet; hopeless for ' +
        'OLTP pages. Where every lake and warehouse actually keeps the bytes.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Row vs column layout widget ---------------- */
(function () {
  const root = document.getElementById('viz-layout');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('ly-msg'), grid = $('ly-grid'), stats = $('ly-stats');

  const RIDES = [
    { id: 1, mo: 3, fare: 12.4, pay: 'card' }, { id: 2, mo: 3, fare: 8.1, pay: 'cash' },
    { id: 3, mo: 4, fare: 22.0, pay: 'card' }, { id: 4, mo: 4, fare: 9.7, pay: 'card' },
    { id: 5, mo: 5, fare: 15.2, pay: 'cash' }, { id: 6, mo: 5, fare: 31.9, pay: 'card' },
  ];
  const COLS = ['id', 'mo', 'fare', 'pay'];

  function cell(val, cls) { return `<span class="ly-cell ${cls || ''}">${val}</span>`; }

  function render(mode, focus) {
    // mode: null | 'agg-row' | 'agg-col' | 'point-row' | 'point-col'
    let rowHtml = '', colHtml = '';
    rowHtml = RIDES.map(r => `<div class="ly-row-line">` + COLS.map(c => {
      let cls = '';
      if (mode === 'agg-row') cls = c === 'fare' ? 'used' : 'wasted';
      if (mode === 'point-row') cls = r.id === 4 ? 'used' : '';
      return cell(r[c], cls);
    }).join('') + `</div>`).join('');
    colHtml = COLS.map(c => `<div class="ly-row-line">` + RIDES.map(r => {
      let cls = '';
      if (mode === 'agg-col') cls = c === 'fare' ? 'used' : '';
      if (mode === 'point-col') cls = r.id === 4 ? 'used' : (c !== 'id' ? 'wasted' : 'wasted');
      if (mode === 'point-col' && r.id === 4) cls = 'used';
      return cell(r[c], cls);
    }).join('') + `</div>`).join('');
    grid.innerHTML =
      `<div class="ly-block"><div class="ly-block-label">row layout · one line = one ride, stored together</div>${rowHtml}</div>` +
      `<div class="ly-block"><div class="ly-block-label">column layout · one line = one column, stored together</div>${colHtml}</div>`;
  }

  $('ly-row').addEventListener('click', () => {
    render('agg-row');
    msg.innerHTML = 'Row layout, <code>avg(fare)</code>: every block holding rides must be read — ' +
      '<strong>6 of 24 cells used, 18 wasted</strong>. The waste scales with column count.';
    stats.textContent = 'cells read: 24    used: 6    wasted: 18 (75%)';
  });
  $('ly-col').addEventListener('click', () => {
    render('agg-col');
    msg.innerHTML = 'Column layout, same query: read the fare line, ignore the rest — ' +
      '<strong>6 of 6 cells read are used</strong>. And a line of same-typed values compresses beautifully.';
    stats.textContent = 'cells read: 6    used: 6    wasted: 0';
  });
  $('ly-point').addEventListener('click', () => {
    render('point-col');
    msg.innerHTML = 'Column layout, <code>fetch ride #4</code>: one value from EACH of four ' +
      'far-apart lines — <strong>four separate reads to rebuild one row</strong>. Row layout served this in one. ' +
      'Layout follows workload; neither wins both.';
    stats.textContent = 'reads to rebuild the row: 4 (one per column) vs 1 in row layout';
  });
  $('ly-reset').addEventListener('click', () => {
    render(null);
    msg.textContent = 'Same data, two arrangements. Run the aggregate against each.';
    stats.textContent = '';
  });
  render(null);
})();

/* ---------------- Compression playground ---------------- */
(function () {
  const stage = document.getElementById('enc-stage');
  if (!stage) return;

  const COLS = {
    month: {
      values: [1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3],
      rawBytes: 24 * 4,
      encode() {
        const runs = [];
        for (const v of this.values) {
          if (runs.length && runs[runs.length - 1][0] === v) runs[runs.length - 1][1]++;
          else runs.push([v, 1]);
        }
        return {
          name: 'run-length encoding',
          chips: runs.map(([v, n]) => `(${v} × ${n})`),
          bytes: runs.length * 8,          // (value, count) as two ints
          note: `${this.values.length} values collapse to ${runs.length} (value, count) pairs`,
        };
      },
    },
    pay: {
      values: ['card','card','cash','card','card','cash','card','card','card','cash','card','card',
               'card','cash','card','card','card','card','cash','card','card','cash','card','card'],
      rawBytes: 24 * 8,                    // 4-byte length + ~4 chars each
      encode() {
        const dict = ['card', 'cash'];
        const codes = this.values.map(v => dict.indexOf(v));
        return {
          name: 'dictionary encoding',
          chips: [`dict: {card: 0, cash: 1}`, `codes: ${codes.join('')}`],
          bytes: 16 + Math.ceil(codes.length / 8),   // dictionary + 1 bit per value
          note: `2 distinct strings become a 16-byte dictionary + 1 bit per row`,
        };
      },
    },
    id: {
      values: Array.from({length: 24}, (_, i) => 4000 + i),
      rawBytes: 24 * 4,
      encode() {
        return {
          name: 'delta encoding',
          chips: ['start: 4000', 'deltas: +1 ×23'],
          bytes: 4 + 8,                    // start + one RLE'd delta pair
          note: `a sequence is one start value plus its differences — here a single run of +1`,
        };
      },
    },
  };

  function render(key) {
    const col = COLS[key];
    const enc = col.encode();
    const ratio = (col.rawBytes / enc.bytes).toFixed(1);
    stage.innerHTML =
      `<div class="enc-row"><span class="enc-k">raw values</span><div class="enc-chips">` +
      col.values.map(v => `<span class="enc-chip raw">${v}</span>`).join('') + `</div></div>` +
      `<div class="enc-row"><span class="enc-k">${enc.name}</span><div class="enc-chips">` +
      enc.chips.map(c => `<span class="enc-chip enc">${c}</span>`).join('') + `</div></div>` +
      `<div class="enc-row"><span class="enc-k">bytes</span><div class="enc-bars">` +
      `<div class="enc-bar-row"><span class="enc-bar raw" style="width:100%"></span><span class="enc-n">${col.rawBytes} raw</span></div>` +
      `<div class="enc-bar-row"><span class="enc-bar enc" style="width:${(100 * enc.bytes / col.rawBytes).toFixed(1)}%"></span><span class="enc-n">${enc.bytes} encoded — <strong>${ratio}×</strong> smaller</span></div>` +
      `</div></div>` +
      `<div class="enc-note">${enc.note}.</div>`;
    const ids = { month: 'enc-month', pay: 'enc-pay', id: 'enc-id' };
    for (const k in ids) document.getElementById(ids[k]).classList.toggle('primary', k === key);
  }
  document.getElementById('enc-month').addEventListener('click', () => render('month'));
  document.getElementById('enc-pay').addEventListener('click', () => render('pay'));
  document.getElementById('enc-id').addEventListener('click', () => render('id'));
  render('month');
})();
