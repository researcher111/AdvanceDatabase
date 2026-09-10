/* Lecture 13 — distributed compute · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'working-set': {
      title: 'Working set',
      body: "<p>The data an operation needs to retain while it runs. Examples include running totals for an aggregation or the build-side hash table for a join. If this state exceeds RAM, the engine may partition or spill it to disk. Distribution can reduce each worker’s share, but uneven key frequencies can still leave one worker with too much state.</p>",
    },
    'rdd': {
      title: 'RDD (Resilient Distributed Dataset)',
      body: "<p>A resilient distributed dataset is a logical collection divided into partitions. Transformations such as map and filter define new RDDs from existing ones. Spark records their dependencies and evaluates the required work when an action requests results. The recorded lineage can be used to recompute lost partitions.</p>",
    },
    'shuffle': {
      title: 'Shuffle',
      body: "<p>A redistribution of records between partitions, often to place equal keys together for a join or aggregation. In MapReduce, mapper output is grouped by reducer destination and transferred to the reducers. Serialization, network traffic, and storage access can make this expensive. Other operations can also transfer data; shuffle is the redistribution step emphasized in this lecture.</p>",
    },
    'skew': {
      title: 'Skew',
      body: "<p>An uneven distribution of data or work. For example, one key may occur in 40% of the records, putting much of an aggregation on one partition. A uniform hash of distinct keys does not prevent that imbalance. Possible remedies include splitting suitable aggregations with salted keys or handling a frequent key separately.</p>",
    },
    'straggler': {
      title: 'Straggler',
      body: "<p>A task that finishes much later than comparable tasks and delays the job. Skew, a slow worker, and resource contention are possible causes. Some runtimes use speculative execution: start another copy elsewhere and accept the first completed result. That can help with a slow worker but does not remove an inherently oversized partition.</p>",
    },
    'stage': {
      title: 'Stage',
      body: "<p>A group of tasks that can execute a portion of Spark’s plan without crossing a shuffle dependency. Pipelined narrow transformations can share a stage. Shuffle dependencies separate stages. Use the plan and Spark UI to inspect their boundaries and costs.</p>",
    },
    'lineage': {
      title: 'Lineage',
      body: "<p>The dependencies and transformations that describe how an RDD was produced. Spark can follow this record to recompute lost partitions when the required inputs are available. This avoids making a separate durable copy of every intermediate result, but recovery requires additional computation.</p>",
    },
    'actor': {
      title: 'Actor',
      body: "<p>A Ray actor is an instance of a remote class that retains state between method calls. It can, for example, load a model once and reuse it for many requests. A normal synchronous actor processes calls serially; Ray also supports actor concurrency options. Choose tasks for independent calls and actors when persistent worker state is useful.</p>",
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
      label: 'Phase 1 · map — each document produces (word, 1) pairs. Color marks the partition selected by the key.',
      render() {
        return `<div class="mr-cols">` + DOCS.map((d, i) =>
          `<div class="mr-box"><div class="mr-box-title">map(doc ${i + 1})</div>` +
          `<div class="mr-pairs">` +
          d.split(' ').map(w => chip(w, 1)).join('') +
          `</div></div>`).join('') + `</div>`;
      },
    },
    {
      label: 'Phase 2 · shuffle — route each pair to the partition selected by its key’s hash.',
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
      label: 'Phase 4 · reduce — sum each key’s grouped values within its assigned partition.',
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
        mode === 'point' ? 'partitions contacted: 1 — either rule identifies the key’s destination' :
        mode === 'range' ? (ruleName === 'hash'
          ? 'partitions contacted: 4 of 4 — any partition may contain matching keys'
          : `partitions touched: ${active.size} of 4 — adjacent keys share range partitions`) :
        'keys spread by ' + (ruleName === 'hash' ? 'hash — equal keys stay together; key order is not preserved' : 'first letter — ordered, uneven');
    }
  }
  document.getElementById('pt-load').addEventListener('click', () => { loaded = true; mode = 'none'; render(); });
  document.getElementById('pt-point').addEventListener('click', () => { loaded = true; mode = 'point'; render(); });
  document.getElementById('pt-range').addEventListener('click', () => { loaded = true; mode = 'range'; render(); });
  render();
})();
