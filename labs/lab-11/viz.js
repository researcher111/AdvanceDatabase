/* Lab 11 — Spark & Ray · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'jvm': {
      title: 'JVM (Java Virtual Machine)',
      body: '<p>The runtime Java programs execute on \u2014 and Spark is a Java/Scala program; ' +
        'pyspark is a Python remote control that sends your lambdas to JVM workers. That\u2019s ' +
        'why installing pyspark isn\u2019t enough: java -version must work, or the session ' +
        'hangs at startup. Any JDK 17+ (Temurin, Zulu) satisfies it.</p>',
    },
    'local-mode': {
      title: 'Local mode',
      body: '<p>Running a cluster engine with every role \u2014 scheduler, workers, storage \u2014 ' +
        'played by one machine: SparkContext("local[*]") or a bare ray.init(). The full code ' +
        'path executes (real shuffles, real serialization), just over localhost. It\u2019s how ' +
        'you develop and how this lab runs; deployment to a real cluster changes one ' +
        'connection string, not your functions.</p>',
    },
    'combiner': {
      title: 'Combiner',
      body: '<p>A mini-reduce run on each mapper BEFORE the shuffle: collapse this machine\u2019s ' +
        '("the", 1) pairs to ("the", 37) locally, then ship one pair instead of 37. Legal ' +
        'whenever the reduce function is associative and commutative (sums, maxes, counts). ' +
        'Spark\u2019s reduceByKey does it automatically \u2014 one reason it beats groupByKey.</p>',
    },
    'gil': {
      title: 'GIL (Global Interpreter Lock)',
      body: '<p>CPython\u2019s rule that only one thread executes Python bytecode at a time. ' +
        'Threads still help for waiting (network, disk) but not for computing \u2014 ten ' +
        'CPU-bound threads share one core\u2019s worth of progress. Parallel Python therefore ' +
        'means processes; Ray is, at heart, a very good manager of worker processes across ' +
        'machines.</p>',
    },
    'driver': {
      title: 'Driver',
      body: '<p>The process running YOUR script \u2014 the one that builds the plan, launches ' +
        'work, and gathers results. Spark: the driver holds the DAG and collect() pulls ' +
        'results to it (collecting a huge RDD OOMs the driver \u2014 classic rookie crash). ' +
        'Ray: your script is the driver; workers hold the futures\u2019 values until ray.get.</p>',
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
