/* Lecture 13 — distributed compute · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'skew': {
      title: 'Skew (the celebrity problem)',
      body: '<p>When one key owns a wildly disproportionate share of the records — one URL ' +
        'with 40% of traffic, one user with a million events. Hash partitioning balances ' +
        'keys, not rows, so the hot key’s partition finishes long after the rest. Fixes: ' +
        'salt the key (append a random suffix, aggregate in two rounds) or special-case it. ' +
        'First symptom in practice: 99 tasks done, 1 still running.</p>',
    },
    'straggler': {
      title: 'Straggler',
      body: '<p>The one slow task the whole job waits on — caused by skew, a sick machine, or ' +
        'bad luck. Distributed runtimes fight stragglers with speculative execution: launch a ' +
        'duplicate of the laggard elsewhere and take whichever finishes first. The 2004 ' +
        'MapReduce paper devotes a section to this; it mattered from day one.</p>',
    },
    'stage': {
      title: 'Stage',
      body: '<p>A run of shuffle-free (narrow) transformations that Spark fuses into one ' +
        'pass over each partition. Stages are separated by shuffles: a job with one ' +
        'reduceByKey has two stages, map-side and reduce-side. The Spark UI’s stage view is ' +
        'a job’s cost broken down at exactly these boundaries.</p>',
    },
    'lineage': {
      title: 'Lineage',
      body: '<p>The recorded recipe for each partition of each RDD — "partition 3 = flatMap ' +
        'of partition 3 of the file." When a machine dies, Spark recomputes its lost ' +
        'partitions from the recipe instead of restoring a replica. Fault tolerance from a ' +
        'plan rather than from copies — cheap when healthy, pay-on-failure when not. It’s ' +
        'the R in RDD (Resilient).</p>',
    },
    'actor': {
      title: 'Actor',
      body: '<p>Ray’s stateful worker: @ray.remote on a class gives you an object that ' +
        'lives on some machine, holds state between calls (a loaded model, a counter), and ' +
        'processes method calls one at a time. Tasks are for stateless fan-out; actors are ' +
        'for "load the 2 GB model once, then serve 10,000 embed calls against it."</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Trace the shuffle ---------------- */
(function () {
  const stage = document.getElementById('mr-stage');
  if (!stage) return;

  const DOCS = [
    'the log the tree',
    'log buffer',
    'the buffer log',
    'tree scan',
  ];
  const N_PARTS = 2;

  function hashOf(word) {
    let sum = 0;
    for (const ch of word) sum += ch.charCodeAt(0);
    return sum;
  }
  function partOf(word) { return hashOf(word) % N_PARTS; }
  function explain(word) {
    const codes = [...word].map(c => c.charCodeAt(0)).join('+');
    const sum = hashOf(word);
    return `hash("${word}") = ${codes} = ${sum} → ${sum} % ${N_PARTS} = partition ${sum % N_PARTS}`;
  }
  function chip(word, label) {
    return `<span class="mr-chip p${partOf(word)}" title="${explain(word)}">(${word}, ${label})</span>`;
  }

  const PHASES = [
    {
      label: 'Phase 0 · the input — 4 documents, one per "machine"',
      render() {
        return `<div class="mr-cols">` + DOCS.map((d, i) =>
          `<div class="mr-box"><div class="mr-box-title">doc ${i + 1}</div>` +
          `<div class="mr-doc">"${d}"</div></div>`).join('') + `</div>`;
      },
    },
    {
      label: 'Phase 1 · map — each machine emits (word, 1) pairs, alone. Color = destination partition, computable locally',
      render() {
        return `<div class="mr-cols">` + DOCS.map((d, i) =>
          `<div class="mr-box"><div class="mr-box-title">map(doc ${i + 1})</div>` +
          `<div class="mr-pairs">` +
          d.split(' ').map(w => chip(w, 1)).join('') +
          `</div></div>`).join('') + `</div>`;
      },
    },
    {
      label: 'Phase 2 · shuffle — every pair travels to the partition its key hashes to (the only network step)',
      render() {
        const parts = [[], []];
        for (const d of DOCS) for (const w of d.split(' ')) parts[partOf(w)].push(w);
        return `<div class="mr-cols two">` + parts.map((words, p) =>
          `<div class="mr-box part"><div class="mr-box-title">partition ${p}</div>` +
          `<div class="mr-pairs">` + words.map(w => chip(w, 1)).join('') +
          `</div></div>`).join('') + `</div>`;
      },
    },
    {
      label: 'Phase 3 · group — inside each partition, values collect per key: {word: [1, 1, …]}',
      render() {
        const parts = [{}, {}];
        for (const d of DOCS) for (const w of d.split(' ')) {
          const g = parts[partOf(w)];
          (g[w] = g[w] || []).push(1);
        }
        return `<div class="mr-cols two">` + parts.map((g, p) =>
          `<div class="mr-box part"><div class="mr-box-title">partition ${p}</div>` +
          `<div class="mr-pairs">` + Object.keys(g).sort().map(w =>
            `<span class="mr-chip p${p}" title="${explain(w)}">(${w}, [${g[w].join(',')}])</span>`
          ).join('') + `</div></div>`).join('') + `</div>`;
      },
    },
    {
      label: 'Phase 4 · reduce — each key’s values collapse to a total; no partition needed another’s data',
      render() {
        const parts = [{}, {}];
        for (const d of DOCS) for (const w of d.split(' ')) {
          const g = parts[partOf(w)];
          g[w] = (g[w] || 0) + 1;
        }
        return `<div class="mr-cols two">` + parts.map((g, p) =>
          `<div class="mr-box part done"><div class="mr-box-title">partition ${p} · results</div>` +
          `<div class="mr-pairs">` + Object.keys(g).sort().map(w =>
            `<span class="mr-chip p${p} total" title="${explain(w)}">(${w}, ${g[w]})</span>`
          ).join('') + `</div></div>`).join('') + `</div>`;
      },
    },
  ];

  let phase = 0;
  const label = document.getElementById('mr-phase-label');
  function render() {
    stage.innerHTML = PHASES[phase].render();
    label.textContent = PHASES[phase].label;
    document.getElementById('mr-step').disabled = phase === PHASES.length - 1;
    document.getElementById('mr-back').disabled = phase === 0;
  }
  document.getElementById('mr-step').addEventListener('click', () => {
    if (phase < PHASES.length - 1) { phase++; render(); }
  });
  document.getElementById('mr-back').addEventListener('click', () => {
    if (phase > 0) { phase--; render(); }
  });
  document.getElementById('mr-reset').addEventListener('click', () => { phase = 0; render(); });
  render();
})();

/* ---------------- Skew slider ---------------- */
(function () {
  const slider = document.getElementById('skew-slider');
  if (!slider) return;
  const stage = document.getElementById('skew-stage');
  const val = document.getElementById('skew-val');
  const TOTAL = 8000, WORKERS = 8;

  function render() {
    const share = slider.value / 100;
    val.textContent = slider.value + '%';
    const hot = Math.round(TOTAL * share);
    const rest = Math.round((TOTAL - hot) / WORKERS);   // uniform remainder everywhere
    const loads = Array.from({ length: WORKERS }, (_, i) => rest + (i === 0 ? hot : 0));
    const slowest = Math.max(...loads);
    const ideal = TOTAL / WORKERS;
    stage.innerHTML = loads.map((rows, i) =>
      `<div class="skew-row${rows === slowest && share > 0 ? ' hot' : ''}">` +
      `<span class="skew-label">worker ${i}</span>` +
      `<span class="skew-track">` +
      `<span class="skew-bar" style="width:${(100 * rows / (TOTAL * 0.9)).toFixed(1)}%"></span>` +
      `<span class="skew-idle" style="width:${(100 * (slowest - rows) / (TOTAL * 0.9)).toFixed(1)}%"></span>` +
      `</span>` +
      `<span class="skew-rows">${rows.toLocaleString()} rows${rows === slowest && share > 0 ? ' · straggler' : ''}</span></div>`
    ).join('') +
    `<div class="skew-verdict">job time = slowest worker = <strong>${slowest.toLocaleString()}</strong> rows' worth ` +
    `(perfect balance would be ${ideal.toLocaleString()}) — the cluster runs at ` +
    `<strong>${(ideal / slowest * 100).toFixed(0)}%</strong> efficiency</div>`;
  }
  slider.addEventListener('input', render);
  render();
})();

/* ---------------- Hash vs range playground ---------------- */
(function () {
  const hashPanel = document.getElementById('pt-hash');
  if (!hashPanel) return;
  const rangePanel = document.getElementById('pt-range-panel');
  const hv = document.getElementById('pt-hash-verdict');
  const rv = document.getElementById('pt-range-verdict');

  const KEYS = ['ada','ben','cyd','dee','eli','fay','gus','ivy','jon','kim','lee','mia'];
  const RANGES = [['a','c'], ['d','f'], ['g','j'], ['k','z']];
  function hashOf(k) { let s = 0; for (const c of k) s += c.charCodeAt(0); return s % 4; }
  function rangeOf(k) { return RANGES.findIndex(([lo, hi]) => k[0] >= lo && k[0] <= hi); }

  let loaded = false, mode = 'none';   // none | point | range
  const POINT = 'kim';
  const inRange = k => k >= 'dee' && k <= 'fay';

  function render() {
    for (const [panel, assign, verdict, ruleName] of [
      [hashPanel, hashOf, hv, 'hash'], [rangePanel, rangeOf, rv, 'range'],
    ]) {
      const active = new Set();
      if (mode === 'point') active.add(assign(POINT));
      if (mode === 'range') {
        if (ruleName === 'hash') { for (let p = 0; p < 4; p++) active.add(p); }  // matches may be anywhere
        else KEYS.filter(inRange).forEach(k => active.add(assign(k)));
      }
      panel.innerHTML = Array.from({ length: 4 }, (_, p) => {
        const keys = loaded ? KEYS.filter(k => assign(k) === p) : [];
        const label = ruleName === 'hash' ? `partition ${p}` : `partition ${p} · ${RANGES[p][0]}–${RANGES[p][1]}`;
        return `<div class="pt-part${active.has(p) ? ' touched' : ''}">` +
          `<div class="pt-part-label">${label}</div>` +
          `<div class="pt-keys">` + keys.map(k =>
            `<span class="pt-key${mode === 'point' && k === POINT ? ' hit' : ''}${mode === 'range' && inRange(k) ? ' hit' : ''}"` +
            ` title="${ruleName === 'hash' ? 'hash(' + k + ') % 4 = ' + assign(k) : k + ' starts with ' + k[0]}">${k}</span>`).join('') +
          `</div></div>`;
      }).join('');
      verdict.textContent = !loaded ? '' :
        mode === 'point' ? 'partitions touched: 1 — routing is arithmetic either way' :
        mode === 'range' ? (ruleName === 'hash'
          ? 'partitions touched: 4 of 4 — matches could be anywhere, so ask everyone'
          : `partitions touched: ${active.size} of 4 — sorted neighbors live together`) :
        'keys spread by ' + (ruleName === 'hash' ? 'hash — uniform, orderless' : 'first letter — ordered, uneven');
    }
  }
  document.getElementById('pt-load').addEventListener('click', () => { loaded = true; mode = 'none'; render(); });
  document.getElementById('pt-point').addEventListener('click', () => { loaded = true; mode = 'point'; render(); });
  document.getElementById('pt-range').addEventListener('click', () => { loaded = true; mode = 'range'; render(); });
  render();
})();
