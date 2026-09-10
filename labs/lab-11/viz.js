/* Lab 11 — Spark & Ray · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'jvm': {
      title: 'JVM (Java Virtual Machine)',
      body: "<p>The Java Virtual Machine runs Java and Scala code, including much of Spark. PySpark coordinates with that runtime and uses Python worker processes for Python functions. Install a JDK supported by your PySpark version and check it with java -version before running the Spark example.</p>",
    },
    'local-mode': {
      title: 'Local mode',
      body: "<p>Run the framework’s scheduling and worker roles on one machine. Spark’s local mode and a local Ray runtime let you practice task execution without a cluster. They still have scheduling and serialization costs. A multi-machine deployment also needs shared data access, compatible environments, and network configuration.</p>",
    },
    'combiner': {
      title: 'Combiner',
      body: "<p>A local aggregation performed before the shuffle. For word count, many (the, 1) pairs can become one (the, total) pair per mapper. This preserves the final sum while reducing data movement. A combiner must be valid when applied any number of times; intermediate types and aggregation rules must support that use.</p>",
    },
    'gil': {
      title: 'GIL (Global Interpreter Lock)',
      body: "<p>In a standard GIL-enabled CPython build, one thread at a time executes Python bytecode within an interpreter. Threads can still overlap I/O, and native libraries may release the GIL. Separate worker processes can run Python computations on multiple cores. Ray uses worker processes for the lab’s independent tasks.</p>",
    },
    'driver': {
      title: 'Driver',
      body: "<p>The process that runs the coordinating script, submits work, and receives results. In Spark, collecting a large RDD brings its data to the driver and can exceed the driver’s memory. In Ray, the script submits tasks and resolves their object references with ray.get.</p>",
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
      label: 'Phase 1 · map — each document produces (word, 1) pairs. Color marks the destination partition.',
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
