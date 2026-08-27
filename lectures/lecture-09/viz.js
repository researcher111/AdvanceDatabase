/* Lecture 9 — The Query Optimizer · glossary + annotated code only. */
(function () {
  const GLOSSARY = {
    'left-deep': {
      title: 'Left-deep join order',
      body: '<p>A join plan shaped like a ladder: the first join takes two base tables, and every later join takes the result so far on its left and one fresh base table on its right. Nothing ever joins two intermediate results together. System R considered only left-deep plans, because the shape works naturally with pipelined execution (the running result streams into the next join without being written out) and because it cuts the number of candidate plans from all tree shapes down to the orderings of the tables. Most planners still favor it; the three orders in the widget are the three left-deep orders of three tables.</p>',
    },
    'dynamic-programming': {
      title: 'Dynamic programming (for join order)',
      body: '<p>A search strategy that avoids repeating work: solve every small subproblem once, remember the answer, and build bigger answers from the remembered small ones. For join ordering, the optimizer first finds the cheapest way to read each single table, then the cheapest way to join each pair, then each triple, and so on, reusing the cheapest plan for each subset rather than re-deriving it. Any join order that is not the cheapest for its subset of tables is discarded early, because no plan that contains it can beat the plan that uses the cheaper piece. The number of subsets still grows exponentially with the number of tables, which is why planners switch to heuristics beyond roughly a dozen tables, but it is vastly fewer than the number of full orderings.</p>',
    },
    'system-r': {
      title: 'System R',
      body: '<p>IBM&#39;s research prototype of a relational database, built in the 1970s, and the first system to run SQL. Its 1979 paper by Selinger and colleagues, <em>Access Path Selection in a Relational Database Management System</em>, described the first cost-based query optimizer: keep statistics about each table, price every candidate plan with a formula, and pick the cheapest. It also introduced the dynamic-programming search over join orders. Every optimizer since, including Postgres&#39;s, follows the same skeleton, which is why this lecture keeps naming it.</p>',
    },
    'explain-analyze': {
      title: 'EXPLAIN ANALYZE',
      body: '<p>Two SQL commands stacked together. <code>EXPLAIN</code> asks the engine to print the plan the optimizer chose for a query, as a tree of operators with the optimizer&#39;s cost and row-count estimates, instead of running it. Adding <code>ANALYZE</code> makes the engine actually run the query as well and print, next to each estimate, the measured row count and elapsed time for that operator. Reading the tree from the innermost operator outward shows the order things ran; comparing estimated rows to actual rows shows where the optimizer&#39;s statistics were wrong. It is the standard first tool for a slow query.</p>',
    },
    'selectivity': {
      title: 'Selectivity',
      body: '<p>The fraction of a table&#39;s rows that a predicate keeps, between 0 and 1: a predicate that keeps 3 of 300 rows has selectivity 0.01. The optimizer never knows it exactly before running the query, so it estimates it from stored statistics: an equality on a column with V distinct values gets 1/V, a range predicate gets the share of the min-to-max span it covers, and ANDed predicates multiply. The estimated row count of every step in a plan is N times these fractions, and every cost formula starts from that row count. That is why a wrong selectivity estimate, usually from stale statistics or correlated predicates, produces a wrong plan.</p>',
    },
    'statistics': {
      title: 'Statistics (of a table)',
      body: '<p>Facts the engine keeps about its own data: row counts, block counts, and ' +
        'per-column distinct-value counts, min/max, and histograms. Stored in catalog tables ' +
        '(pg_statistic), refreshed by ANALYZE, consumed by the planner to predict how many ' +
        'rows a predicate keeps. Stale statistics are the leading cause of mysteriously bad ' +
        'plans.</p>',
    },
    'cost-model': {
      title: 'Cost model',
      body: '<p>Formulas that price a plan without running it — in block reads (and CPU ' +
        'fudge factors), computed from statistics. The optimizer prices every candidate shape ' +
        'and keeps the cheapest. The model is honest about being a model: when its assumptions ' +
        '(uniformity, independence) break, its choices do too.</p>',
    },
    'histogram': {
      title: 'Histogram (equi-depth)',
      body: '<p>The engine’s sketch of a column’s distribution: boundaries chosen so each ' +
        'bucket holds about the same number of rows. Range-predicate selectivity becomes ' +
        '“count the buckets the range spans” — far better than assuming uniformity across ' +
        'min–max, at the cost of a few hundred bytes per column.</p>',
    },
    'analyze': {
      title: 'ANALYZE',
      body: '<p>The command that refreshes statistics: sample the table, recompute distinct ' +
        'counts and histograms, store them in the catalog. Postgres autovacuum usually runs it ' +
        'for you; after a bulk load, running it yourself is the difference between a plan ' +
        'from reality and a plan from folklore.</p>',
    },
    'access-path': {
      title: 'Access path',
      body: '<p>System R’s term for “a way to get rows out of a table”: the sequential scan, ' +
        'or any applicable index. Access-path selection — pick the cheapest path per table, ' +
        'then the cheapest join order over them — remains the skeleton of every optimizer ' +
        'built since 1979.</p>',
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
      `${idxWins ? 'Index scan' : 'Sequential scan'} wins by ${ratio.toFixed(ratio < 10 ? 1 : 0)}×` +
      `${Math.abs(idx - seq) < seq * 0.15 ? ' — near the crossover, where stale statistics flip plans overnight' : ''}.</div>`;
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
    SM: { steps: [['students ⋈ majors', 300, false], ['(that) ⋈ enrollments', 3000, false]] },
    SE: { steps: [['students ⋈ enrollments', 3000, false], ['(that) ⋈ majors', 3000, false]] },
    ME: { steps: [['majors ⋈ enrollments — NO predicate connects them: cross product', 9000, true],
                  ['(that) ⋈ students — both predicates finally apply', 3000, false]] },
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
