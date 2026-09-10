/* Lecture 9 — The Query Optimizer · glossary + annotated code only. */
(function () {
  const GLOSSARY = {
    'left-deep': {
      title: 'Left-deep join order',
      body: "<p>A join plan in which the first join combines two base tables and each later join combines the previous result with one additional base table. System R restricted its search to such plans, which reduced the search space and supported pipelining. The widget shows three examples, not every possible ordering of the three tables.</p>",
    },
    'dynamic-programming': {
      title: 'Dynamic programming (for join order)',
      body: "<p>Solve smaller planning problems, retain useful solutions, and reuse them when constructing larger plans. An optimizer can plan single tables, then pairs, then larger subsets. It may retain several plans for a subset when they provide different useful properties, such as sort order. The search still grows rapidly, so large joins often need heuristics.</p>",
    },
    'system-r': {
      title: 'System R',
      body: "<p>IBM’s relational database research prototype from the 1970s. Selinger and colleagues described its cost-based optimizer in the 1979 paper <em>Access Path Selection in a Relational Database Management System</em>. Its use of statistics, cost estimates, and dynamic programming influenced many later optimizers.</p>",
    },
    'explain-analyze': {
      title: 'EXPLAIN ANALYZE',
      body: "<p><code>EXPLAIN</code> displays the selected plan and its estimated costs and row counts. Adding <code>ANALYZE</code> executes the statement and includes measured row counts and timings. Follow each operator’s inputs through the tree and compare estimated with actual rows to locate estimation errors. Because the statement runs, EXPLAIN ANALYZE can also perform writes for a data-changing statement.</p>",
    },
    'selectivity': {
      title: 'Selectivity',
      body: "<p>The fraction of input rows that a predicate keeps, between 0 and 1. Keeping 3 of 300 rows gives selectivity 0.01. A planner estimates this using statistics such as value frequencies and histograms. Simple formulas assume uniformity or independence; skewed or correlated data can make those estimates inaccurate.</p>",
    },
    'statistics': {
      title: 'Statistics (of a table)',
      body: "<p>Stored summaries of table data, such as row and page counts, distinct-value counts, frequent values, and histogram boundaries. The planner uses them to estimate row counts and costs. PostgreSQL stores statistics in its catalogs and refreshes them through ANALYZE. Stale or insufficient statistics can lead to poor estimates.</p>",
    },
    'cost-model': {
      title: 'Cost model',
      body: "<p>Formulas that estimate a plan’s work before execution. This lecture’s model counts block accesses; production models also estimate CPU work and account for different access patterns. The optimizer compares alternatives using those estimates. Inaccurate assumptions can cause it to select a slower plan.</p>",
    },
    'histogram': {
      title: 'Histogram (equi-depth)',
      body: "<p>A summary of a column’s value distribution. In an equi-depth histogram, bucket boundaries are chosen so each bucket represents roughly the same number of values. The planner estimates a range predicate by counting covered buckets and partial buckets. This captures distribution shape better than using only the minimum and maximum.</p>",
    },
    'analyze': {
      title: 'ANALYZE',
      body: "<p>A command that refreshes table statistics used by the planner. PostgreSQL typically samples rows and updates summaries such as value frequencies and histograms. Autovacuum can run ANALYZE automatically. After substantial data changes, check that statistics reflect the new distribution.</p>",
    },
    'access-path': {
      title: 'Access path',
      body: "<p>A way to obtain rows from a table, such as a sequential scan or an index scan. The optimizer compares available paths together with filters, join order, and required output properties. The cheapest path can change with selectivity, caching, and whether an index covers the query.</p>",
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Watch the plan flip ---------------- */
(function () {
  const slider = document.getElementById('flip-sel');
  if (!slider) return;
  const N = 100000, B = 1000, HEIGHT = 3;
  const out = document.getElementById('flip-readout');
  const val = document.getElementById('flip-sel-val');

  function fmtSel(s) {
    return s >= 0.01 ? (s * 100).toFixed(1) + '%' : (s * 100).toFixed(2) + '%';
  }
  function bar(label, cost, maxCost, winner) {
    // log-scaled width so both extremes stay visible
    const w = Math.max(4, 100 * Math.log10(cost + 1) / Math.log10(maxCost + 1));
    return `<div class="flip-row${winner ? ' win' : ''}">` +
      `<span class="flip-label">${label}${winner ? ' · PICKED' : ''}</span>` +
      `<span class="flip-track"><span class="flip-bar" style="width:${w.toFixed(1)}%"></span></span>` +
      `<span class="flip-cost">${Math.round(cost).toLocaleString()} blocks</span></div>`;
  }
  function render() {
    // log scale: slider 0 -> 0.01%, 50 -> 1%, 100 -> 100%
    const sel = Math.pow(10, (slider.value / 100) * 4 - 4);
    val.textContent = fmtSel(sel);
    const seq = B;
    const idx = HEIGHT + sel * N;
    const idxWins = idx < seq;
    const ratio = idxWins ? seq / idx : idx / seq;
    out.innerHTML =
      bar('index scan: height + matches', idx, N + HEIGHT, idxWins) +
      bar('seq scan: read every block', seq, N + HEIGHT, !idxWins) +
      `<div class="flip-verdict">${Math.round(sel * N).toLocaleString()} of 100,000 rows match. ` +
      `${idxWins ? 'Index scan' : 'Sequential scan'} has ${ratio.toFixed(ratio < 10 ? 1 : 0)}× lower estimated block cost` +
      `${Math.abs(idx - seq) < seq * 0.15 ? ' — near the crossover, where small estimate changes can alter the choice' : ''}.</div>`;
  }
  slider.addEventListener('input', render);
  render();
})();

/* ---------------- Pick a join order ---------------- */
(function () {
  const readout = document.getElementById('order-readout');
  if (!readout) return;
  // Intermediate row counts from the selectivity formulas on the toy tables.
  const ORDERS = {
    SM: { steps: [['students ⋈ majors', 300, false], ['previous result ⋈ enrollments', 3000, false]] },
    SE: { steps: [['students ⋈ enrollments', 3000, false], ['previous result ⋈ majors', 3000, false]] },
    ME: { steps: [['majors ⋈ enrollments — no connecting predicate: cross product', 9000, true],
                  ['previous result ⋈ students — apply both predicates', 3000, false]] },
  };
  const MAX = 9000;
  function render(key) {
    const o = ORDERS[key];
    const total = o.steps.reduce((s, [, n]) => s + n, 0);
    readout.innerHTML = o.steps.map(([label, n, cross], i) =>
      `<div class="order-row${cross ? ' cross' : ''}">` +
      `<span class="order-label">step ${i + 1}: ${label}</span>` +
      `<span class="order-track"><span class="order-bar" style="width:${(100 * n / MAX).toFixed(1)}%"></span></span>` +
      `<span class="order-rows">${n.toLocaleString()} rows</span></div>`
    ).join('') +
    `<div class="order-total">rows produced along the way: <strong>${total.toLocaleString()}</strong>` +
    ` &nbsp;·&nbsp; final answer: 3,000 rows, identical for every order</div>`;
    document.querySelectorAll('.order-buttons .btn').forEach(b =>
      b.classList.toggle('primary', b.dataset.order === key));
  }
  document.querySelectorAll('.order-buttons .btn').forEach(b =>
    b.addEventListener('click', () => render(b.dataset.order)));
  render('SM');
})();
