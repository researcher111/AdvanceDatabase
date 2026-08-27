/* Lecture 4 — The Iterator Model · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'relational-algebra': {
      title: 'Relational algebra',
      body: '<p>The small set of operations on tables that SQL is defined in terms of: select (keep the rows that pass a test), project (keep some columns), product (pair every row with every row), plus union, difference, and rename. Each takes tables in and gives a table out, so operations compose into a tree, which is exactly what a query plan is. The operations obey algebraic laws, for example filtering each input before a product yields the same rows as filtering the pairs after it, and those laws are what let an optimizer rearrange a plan without changing its answer. When this lecture says the same answer is guaranteed, that guarantee is a theorem of relational algebra, not a property of the code.</p>',
    },
    'tombstone': {
      title: 'Tombstone',
      body: '<p>A deleted record that still physically occupies its slot in the page; only its in-use flag has changed. The bytes stay put until a later insert reuses the slot, so a scan that walked every slot blindly would hand back ghosts. That is why Lab 3&#39;s TableScan.next() checks the flag and skips over tombstones on its way to the next live row. Marking instead of moving makes deletion O(1), and it is also why databases need vacuum or compaction processes to reclaim the space for real.</p>',
    },
    'materialization': {
      title: 'Materialization',
      body: '<p>Computing and storing a stage’s <em>entire</em> result (in memory or on disk) ' +
        'before the next stage starts — the opposite of streaming rows through one at a time. ' +
        'Sometimes unavoidable (sorting must see everything), always a memory-and-latency cost, ' +
        'and the iterator model exists to avoid it wherever possible.</p>',
    },
    'duck-typing': {
      title: 'Duck typing',
      body: '<p>Python’s stance that an object’s type is whatever it can <em>do</em>: anything ' +
        'with before_first/next/get_val/has_field/close IS a scan, no declaration needed. ' +
        '“If it walks like a duck and quacks like a duck…” — which is exactly how a TableScan ' +
        'and a ProductScan get to be interchangeable.</p>',
    },
    'cartesian-product': {
      title: 'Cartesian product',
      body: '<p>Every row of one table paired with every row of another: |A| × |B| pairs, no ' +
        'matching condition. Rarely wanted by itself (it’s huge), but it’s the raw material of ' +
        'joins: a join is the cartesian product filtered down to the pairs where the join ' +
        'condition holds. SQL’s <code>CROSS JOIN</code> is this, undisguised.</p>',
    },
    'predicate-pushdown': {
      title: 'Predicate pushdown',
      body: '<p>Moving a filter as far down the plan as it can legally go — filtering each ' +
        'table <em>before</em> a join instead of filtering the joined pairs after. Fewer rows ' +
        'flow through every operator above the filter, often by orders of magnitude. The first ' +
        'rewrite in every optimizer’s playbook, and it works on Parquet files and data lakes ' +
        'too (week 10).</p>',
    },
    'cursor': {
      title: 'Cursor',
      body: '<p>A position within a sequence of rows — “I am on row 4.” Every scan in the ' +
        'iterator model maintains one implicitly (TableScan’s is block + slot). SQL exposes the ' +
        'same idea to applications as, literally, <code>CURSOR</code>s: fetch a few rows now, ' +
        'more later, without materializing the result.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Pull-a-row widget ---------------- */
(function () {
  const root = document.getElementById('viz-pull');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('pl-msg'), tree = $('pl-tree'), log = $('pl-log'), out = $('pl-out');

  const ROWS = [
    { name: 'ada', gpa: 3.9 }, { name: 'ben', gpa: 3.1 }, { name: 'cyd', gpa: 3.7 },
    { name: 'dee', gpa: 2.8 }, { name: 'eli', gpa: 3.6 }, { name: 'fay', gpa: 3.4 },
  ];

  tree.innerHTML =
    `<div class="pl-node" data-n="P">Project<span>name</span></div>` +
    `<div class="pl-arrow">↑ rows &nbsp;·&nbsp; asks ↓</div>` +
    `<div class="pl-node" data-n="S">Select<span>gpa &gt; 3.5</span></div>` +
    `<div class="pl-arrow">↑ rows &nbsp;·&nbsp; asks ↓</div>` +
    `<div class="pl-node" data-n="T">Scan<span>students</span></div>`;

  let cursor, delivered, running;

  function reset() {
    cursor = 0; delivered = 0; running = false;
    log.innerHTML = ''; out.innerHTML = '';
    msg.textContent = 'Press pull — the Project asks the Select, which asks the Scan…';
    flash(null);
  }

  function flash(n, cls) {
    tree.querySelectorAll('.pl-node').forEach(el => {
      el.classList.remove('asking', 'giving');
      if (n && el.dataset.n === n) el.classList.add(cls);
    });
  }

  function addLog(cls, text) {
    log.insertAdjacentHTML('beforeend', `<div class="${cls}">${text}</div>`);
    log.scrollTop = log.scrollHeight;
  }

  function pull() {
    if (running) return;
    if (cursor >= ROWS.length && delivered >= 3) {
      msg.innerHTML = 'The Scan is exhausted — next() returns <strong>False</strong> all the way up. The query is over.';
      addLog('rej', 'Project.next() → False (everything exhausted)');
      return;
    }
    running = true;
    // Build the event script for this one top-level pull.
    const events = [
      ['P', 'asking', 'ask',  'Project.next() — asks Select'],
      ['S', 'asking', 'ask',  '&nbsp;&nbsp;Select.next() — asks Scan'],
    ];
    let produced = null;
    while (cursor < ROWS.length) {
      const r = ROWS[cursor];
      cursor += 1;
      events.push(['T', 'giving', 'give', `&nbsp;&nbsp;&nbsp;&nbsp;Scan → row (${r.name}, ${r.gpa})`]);
      if (r.gpa > 3.5) {
        produced = r;
        events.push(['S', 'giving', 'give', `&nbsp;&nbsp;Select: ${r.gpa} &gt; 3.5 ✓ — pass it up`]);
        events.push(['P', 'giving', 'deliver', `Project → delivers name = "${r.name}"`]);
        break;
      }
      events.push(['S', 'asking', 'rej', `&nbsp;&nbsp;Select: ${r.gpa} &gt; 3.5 ✗ — skip, ask Scan again`]);
    }
    if (!produced) {
      events.push(['T', 'asking', 'rej', '&nbsp;&nbsp;&nbsp;&nbsp;Scan → False (no rows left)']);
      events.push(['P', 'asking', 'rej', 'Project.next() → False']);
    }
    let i = 0;
    const timer = setInterval(() => {
      if (i >= events.length) {
        clearInterval(timer);
        running = false;
        flash(null);
        if (produced) {
          delivered += 1;
          out.insertAdjacentHTML('beforeend', `<span class="qj-result-chip">${produced.name}</span>`);
          msg.innerHTML = `One pull, one row: <strong>${produced.name}</strong>. ` +
            `The Scan moved ${cursor} row${cursor > 1 ? 's' : ''} so far to deliver ${delivered}.`;
        }
        return;
      }
      const [node, cls, logCls, text] = events[i];
      flash(node, cls);
      addLog(logCls, text);
      i += 1;
    }, 550);
  }

  $('pl-pull').addEventListener('click', pull);
  $('pl-reset').addEventListener('click', reset);
  reset();
})();

/* ---------------- Drive the odometer ---------------- */
(function () {
  const leftEl = document.getElementById('odo-left');
  if (!leftEl) return;

  const LEFT = ['ada', 'ben', 'cyd', 'dee', 'eli', 'fay'];
  const RIGHT = ['cs', 'stat', 'econ'];
  let li, ri, pairs, leftDelivered, rightDelivered, done;

  const pathEl = document.getElementById('odo-path');
  const rightEl = document.getElementById('odo-right');
  const pairsEl = document.getElementById('odo-pairs');

  function beforeFirst() {
    // The subtle setup: left.before_first(); left.next(); right.before_first()
    li = 0; ri = -1;
    leftDelivered = 1; rightDelivered = 0;
    pairs = []; done = false;
    pathEl.textContent = 'setup: left rewound AND advanced to ada; right parked before cs';
    render();
  }

  function next() {
    if (done) { pathEl.textContent = 'exhausted — before_first() to run it again'; return; }
    if (ri + 1 < RIGHT.length) {
      ri++; rightDelivered++;
      pathEl.textContent = 'fast path: right.next() had a row — no rewind needed';
    } else if (li + 1 < LEFT.length) {
      li++; ri = 0;
      leftDelivered++; rightDelivered++;
      pathEl.textContent = 'ROLLOVER: right exhausted — rewind right, left.next(), right.next()';
    } else {
      done = true;
      pathEl.textContent = 'rollover attempted, but left.next() was false too — product complete, return False';
      render();
      return;
    }
    pairs.push(`(${LEFT[li]}, ${RIGHT[ri]})`);
    render();
  }

  function render() {
    leftEl.innerHTML = LEFT.map((v, i) =>
      `<div class="odo-cell${i === li && !done ? ' cur' : ''}${i < li ? ' past' : ''}">${v}</div>`).join('');
    rightEl.innerHTML = RIGHT.map((v, i) =>
      `<div class="odo-cell${i === ri && !done ? ' cur' : ''}${ri >= 0 && i < ri ? ' past' : ''}">${v}</div>`).join('');
    pairsEl.innerHTML = pairs.map((p, i) =>
      `<span class="odo-pair${i === pairs.length - 1 ? ' new' : ''}">${p}</span>`).join('');
    document.getElementById('odo-lcount').textContent = `· delivered ${leftDelivered}`;
    document.getElementById('odo-rcount').textContent = `· delivered ${rightDelivered} total`;
    document.getElementById('odo-pcount').textContent = `· ${pairs.length} of 18`;
  }

  document.getElementById('odo-next').addEventListener('click', next);
  document.getElementById('odo-reset').addEventListener('click', beforeFirst);
  beforeFirst();
})();
