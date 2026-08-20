/* Lab 4 — Scan Operators · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'predicate': {
      title: 'Predicate',
      body: '<p>A yes/no test applied to a row — <code>gpa &gt; 35</code>, ' +
        '<code>name = "ada"</code>, or a conjunction of such terms. The WHERE clause is a ' +
        'predicate; a SelectScan is a predicate given a job. When a term compares two ' +
        '<em>fields</em> instead of a field and a literal, the same machinery expresses a ' +
        'join condition.</p>',
    },
    'delegation': {
      title: 'Delegation',
      body: '<p>Answering a method call by forwarding it to the object you wrap — SelectScan’s ' +
        '<code>get_val</code> is one line: <code>return self.scan.get_val(fld)</code>. The ' +
        'iterator model is delegation with taste: each operator intercepts only the methods its ' +
        'concept changes and forwards the rest untouched.</p>',
    },
    'cartesian-product': {
      title: 'Cartesian product',
      body: '<p>Every row of one table paired with every row of another — |A| × |B| pairs, no ' +
        'condition. The raw material of joins: filter the product down to pairs where the join ' +
        'condition holds and you have joined the tables. Affordable only when its inputs are ' +
        'small, which is why so much of database engineering is about shrinking them first.</p>',
    },
    'predicate-pushdown': {
      title: 'Predicate pushdown',
      body: '<p>Moving a filter as far down the plan as it can legally go — filtering each table ' +
        '<em>before</em> a product instead of filtering pairs after. Your measurement shows it ' +
        'buying 15× on toy data; on real warehouses it’s routinely thousands-fold, and it works ' +
        'on Parquet files too (week 10).</p>',
    },
    'materialization': {
      title: 'Materialization',
      body: '<p>Computing and storing a stage’s entire result before the next stage reads it — ' +
        'the thing the iterator model avoids. Your Going Further CachingScan materializes on ' +
        'purpose, trading memory for the right side’s repeated re-execution: the first step ' +
        'toward week 9’s hash join.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Plan builder ---------------- */
(function () {
  const root = document.getElementById('viz-stack');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('st-msg'), tree = $('st-tree'), stats = $('st-stats');

  const STUDENTS = [
    { sid: 1, name: 'ada', gpa: 39, mid: 1 }, { sid: 2, name: 'ben', gpa: 31, mid: 2 },
    { sid: 3, name: 'cyd', gpa: 37, mid: 1 }, { sid: 4, name: 'dee', gpa: 28, mid: 3 },
    { sid: 5, name: 'eli', gpa: 36, mid: 2 }, { sid: 6, name: 'fay', gpa: 34, mid: 1 },
  ];
  const MAJORS = [{ mid2: 1, dept: 'cs' }, { mid2: 2, dept: 'stat' }, { mid2: 3, dept: 'econ' }];

  function node(name, sub, traffic) {
    return `<div class="pl-node lit">${name}<span>${sub}</span>` +
           `<span class="traffic">${traffic}</span></div>`;
  }
  const arrow = '<div class="pl-arrow">↑</div>';

  function q1() {
    const scanned = STUDENTS.length;
    const kept = STUDENTS.filter(r => r.gpa > 35);
    tree.innerHTML =
      node('Project', 'name', `${kept.length} rows out: ${kept.map(r => r.name).join(', ')}`) + arrow +
      node('Select', 'gpa > 3.5', `${scanned} in → ${kept.length} out`) + arrow +
      node('Scan', 'students', `${scanned} rows`);
    msg.innerHTML = 'The Lecture 1 demo, as an operator stack — six rows examined, three delivered.';
    stats.textContent = 'rows examined: 6    rows delivered: 3';
  }

  function q2() {
    const pairs = [];
    for (const s of STUDENTS) for (const m of MAJORS) pairs.push({ ...s, ...m });
    const kept = pairs.filter(p => p.mid === p.mid2 && p.gpa > 35);
    tree.innerHTML =
      node('Project', 'name, dept', kept.map(p => `(${p.name}, ${p.dept})`).join(' ')) + arrow +
      node('Select', 'mid = mid2 AND gpa > 3.5', `${pairs.length} pairs in → ${kept.length} out`) + arrow +
      node('Product', 'students × majors', `${pairs.length} pairs built`) +
      `<div class="pl-pair">` +
      `<div class="pl-node">Scan<span>students</span><span class="traffic">6 rows, read once</span></div>` +
      `<div class="pl-node">Scan<span>majors</span><span class="traffic">3 rows × 6 rewinds = 18</span></div>` +
      `</div>`;
    msg.innerHTML = 'The course’s first join: product + predicate. Note the majors scan’s traffic — rewound per student.';
    stats.textContent = 'pairs built: 18    rows delivered: 3';
  }

  function q3() {
    tree.innerHTML =
      node('Product', 'students × majors', '18 pairs, unfiltered') +
      `<div class="pl-pair">` +
      `<div class="pl-node">Scan<span>students</span><span class="traffic">6 rows</span></div>` +
      `<div class="pl-node">Scan<span>majors</span><span class="traffic">3 rows × 6 rewinds</span></div>` +
      `</div>`;
    msg.innerHTML = 'The bare <strong>cartesian product</strong> — every student paired with every major, meaningful or not.';
    stats.textContent = 'pairs built: 18    rows delivered: 18';
  }

  function reset() {
    tree.innerHTML = '';
    stats.textContent = '';
    msg.textContent = 'Choose a plan. The tree renders, then runs row by row.';
  }

  $('st-q1').addEventListener('click', q1);
  $('st-q2').addEventListener('click', q2);
  $('st-q3').addEventListener('click', q3);
  $('st-reset').addEventListener('click', reset);
  reset();
})();
