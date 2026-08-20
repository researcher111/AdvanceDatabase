/* Lecture 1 — Anatomy of a Database · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../../labs/_shared/lab-base.js. */

/* ---------------- Pinned toy data (used across the whole course) -------- */
/* students(id, name, gpa×10): rows 1–3 in block 0, rows 4–6 in block 1.   */
const STUDENTS = [
  { id: 1, name: 'ada', gpa: 39, block: 0 },
  { id: 2, name: 'ben', gpa: 31, block: 0 },
  { id: 3, name: 'cyd', gpa: 37, block: 0 },
  { id: 4, name: 'dee', gpa: 28, block: 1 },
  { id: 5, name: 'eli', gpa: 36, block: 1 },
  { id: 6, name: 'fay', gpa: 34, block: 1 },
];
const GPA_CUT = 35; // WHERE gpa > 3.5  (stored ×10)

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'page': {
      title: 'Block · Page',
      body: '<p>Disks and databases move data in fixed-size chunks, not single bytes, ' +
        'and the chunk gets a different name depending on where it is sitting:</p>' +
        '<svg viewBox="0 0 500 132" role="img" aria-label="A file is an array of fixed-size blocks on disk; one block read into memory is called a page." style="width:100%;height:auto;max-width:520px;display:block;margin:10px 0 6px">' +
        '<title>Block on disk, page in memory</title>' +
        '<text x="6" y="13" font-size="9.5" letter-spacing="0.08em" fill="#6b6459">ON DISK</text>' +
        '<text x="320" y="13" font-size="9.5" letter-spacing="0.08em" fill="#6b6459">IN MEMORY</text>' +
        '<rect x="6" y="22" width="54" height="44" rx="3" fill="#f0eee5" stroke="#c9c3b4"/>' +
        '<rect x="64" y="22" width="54" height="44" rx="3" fill="#fde0d2" stroke="#b14a2e" stroke-width="1.5"/>' +
        '<rect x="122" y="22" width="54" height="44" rx="3" fill="#f0eee5" stroke="#c9c3b4"/>' +
        '<rect x="180" y="22" width="54" height="44" rx="3" fill="#f0eee5" stroke="#c9c3b4"/>' +
        '<text x="33" y="49" font-size="9" text-anchor="middle" fill="#6b6459">block 0</text>' +
        '<text x="91" y="49" font-size="9" text-anchor="middle" fill="#1f1d1a" font-weight="700">block 1</text>' +
        '<text x="149" y="49" font-size="9" text-anchor="middle" fill="#6b6459">block 2</text>' +
        '<text x="207" y="49" font-size="9" text-anchor="middle" fill="#6b6459">block 3</text>' +
        '<line x1="242" y1="44" x2="308" y2="44" stroke="#b14a2e" stroke-width="1.5"/>' +
        '<path d="M308 44 L300 40 L300 48 Z" fill="#b14a2e"/>' +
        '<text x="275" y="36" font-size="9" text-anchor="middle" fill="#b14a2e">read(block 1)</text>' +
        '<text x="275" y="58" font-size="9" text-anchor="middle" fill="#6b6459">one trip</text>' +
        '<rect x="320" y="22" width="120" height="44" rx="3" fill="#fde0d2" stroke="#b14a2e" stroke-width="1.5"/>' +
        '<text x="380" y="46" font-size="10" text-anchor="middle" fill="#1f1d1a" font-weight="700">Page (4096 B)</text>' +
        '<text x="6" y="82" font-size="9.5" fill="#6b6459">students.tbl · an array of fixed-size blocks</text>' +
        '<text x="320" y="82" font-size="9.5" fill="#6b6459">one frame · the same 4096 bytes</text>' +
        '<line x1="6" y1="96" x2="494" y2="96" stroke="#e2ddd0"/>' +
        '<text x="6" y="114" font-size="10" fill="#1f1d1a">Same bytes, two names: <tspan font-weight="700">block</tspan> is its name on disk, <tspan font-weight="700">page</tspan> its name in RAM.</text>' +
        '</svg>' +
        '<p>A <strong>block</strong> is one such chunk <em>on disk</em> (microdb and Postgres ' +
        'default to 4\u20138\u00a0KB); a <strong>page</strong> is that same chunk once it has been ' +
        'read <em>into memory</em>. Because one trip to storage costs the same whether it moves ' +
        '4 bytes or 4096, engines always fetch the whole block and hope the neighbouring bytes ' +
        'get used too.</p>',
    },
    'buffer-pool': {
      title: 'Buffer pool',
      body: '<p>The database’s private cache: a fixed set of memory slots (<em>frames</em>), ' +
        'each holding one disk block. Every read goes through it — if the block is already in a ' +
        'frame (a <em>hit</em>) the disk is never touched; if not (a <em>miss</em>) some frame is ' +
        'evicted to make room. You build one in Lab 2 and measure its hit rate.</p>',
    },
    'lru': {
      title: 'LRU eviction',
      body: '<p>When every frame in the buffer pool is occupied and a new block has to come in, ' +
        'something must be thrown out. <strong>Least-recently-used</strong> evicts the frame whose ' +
        'block has gone untouched the longest, betting that whatever you reached for most recently ' +
        'you will reach for again. It is the textbook default and a good bet on most workloads, ' +
        'but one large scan defeats it completely: by the time the scan comes back to a block, LRU ' +
        'has just evicted it. You implement the policy in Lab 2 and measure exactly that cliff.</p>',
    },
    'wal': {
      title: 'Write-ahead log (WAL)',
      body: '<p>An append-only file the engine writes <em>before</em> changing any data page: ' +
        '“I am about to change X from a to b.” After a crash, the engine replays or undoes ' +
        'log entries to restore a clean state. It is the whole reason <code>COMMIT</code> can promise ' +
        'your data survives a power cut — you build one in Lab 7 and kill it mid-write.</p>',
    },
    'catalog': {
      title: 'System catalog',
      body: '<p>The database’s tables about its tables: which tables exist, their column names ' +
        'and types, where their files live. Stored as ordinary tables in the same engine, which is ' +
        'pleasingly circular — in Postgres, <code>\\dt</code> is just a query against the catalog. ' +
        'You build microdb’s in Lab 3.</p>',
    },
    'plan': {
      title: 'Query planner · plan',
      body: '<p>SQL says <em>what</em> rows you want, never <em>how</em> to find them. The ' +
        '<strong>planner</strong> chooses the how: which order to join, whether to use an index or ' +
        'scan everything. Its output — the <strong>plan</strong> — is a tree of operators the ' +
        'execution engine then runs. Same query, different plan: milliseconds vs minutes.</p>',
    },
    'explain': {
      title: 'EXPLAIN',
      body: '<p>A SQL command that asks the engine to <em>show its plan instead of running the ' +
        'query</em>: put <code>EXPLAIN</code> in front of any statement and you get back the ' +
        'operator tree the planner chose, one node per line, each with the row count and cost it ' +
        'estimated. <code>EXPLAIN ANALYZE</code> runs the query as well and prints what actually ' +
        'happened beside those estimates, so you can see where the planner guessed wrong. It is ' +
        'the standard tool for answering “why is this query slow?”, and week 9 is devoted to ' +
        'reading one line by line.</p>',
    },
    'index': {
      title: 'Index',
      body: '<p>A side structure that maps values to row locations so the engine can jump straight ' +
        'to matching rows instead of scanning every block — like a book index versus reading the ' +
        'book. The standard database index is the B+ tree, which you build from scratch in Lab 6. ' +
        'Indexes speed reads but slow every write, since they must be maintained.</p>',
    },
    'oltp': {
      title: 'OLTP vs OLAP',
      body: '<p><strong>OLTP</strong> (online transaction processing) is the workload an ' +
        'application makes: thousands of small operations a second, each touching a handful of ' +
        'rows, like placing an order or updating a profile. <strong>OLAP</strong> (online ' +
        'analytical processing) is the workload a dashboard or a notebook makes: a few big ' +
        'queries that scan millions of rows but read only two or three columns, like revenue ' +
        'by month.</p>' +
        '<p>Almost every design decision in this course has an OLTP answer and an OLAP answer, ' +
        'starting with the block size in this very table: small blocks suit many little reads, ' +
        'enormous ones suit scans. Act I builds an OLTP engine; week 10 opens Act II by asking ' +
        'what changes when the workload flips.</p>',
    },
    'operator': {
      title: 'Operator (iterator)',
      body: '<p>One stage of query execution — scan, filter (select), project, join — built to a ' +
        'common interface: <em>give me your next row</em>. Operators stack into pipelines: project ' +
        'pulls from select, select pulls from scan, scan pulls from the buffer pool. Week 4 is ' +
        'entirely about this pattern.</p>',
    },
    'acid': {
      title: 'ACID',
      body: '<p>The four-part promise a transactional database makes about every commit: ' +
        '<strong>A</strong>tomic (all of the transaction happens or none of it), ' +
        '<strong>C</strong>onsistent (the database\u2019s rules still hold afterward), ' +
        '<strong>I</strong>solated (concurrent users don\u2019t see each other\u2019s half-done work), ' +
        '<strong>D</strong>urable (once committed, it survives a crash). Weeks 7\u20138 are about the ' +
        'machinery that keeps this promise \u2014 you\u2019ll build the A and the D yourself.</p>',
    },
    'fsync': {
      title: 'fsync',
      body: '<p>The system call that turns “I wrote the file” into “the bytes are ' +
        'physically on durable storage.” Ordinary writes only reach the OS’s in-memory cache; ' +
        'an <code>fsync</code> forces them to the device — and costs 10–1000× as much. How databases ' +
        'spend as few fsyncs as possible is the story of the write-ahead log.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Widget: pinned students table ---------------- */
(function () {
  const tbl = document.getElementById('students-table');
  if (!tbl) return;
  let html = '<thead><tr><th>id</th><th>name</th><th>gpa (×10)</th><th></th></tr></thead><tbody>';
  STUDENTS.forEach(s => {
    html += `<tr class="blk${s.block}"><td class="num">${s.id}</td><td>${s.name}</td>` +
            `<td class="num">${s.gpa}</td>` +
            `<td class="blk-tag">block ${s.block}</td></tr>`;
  });
  tbl.innerHTML = html + '</tbody>';
})();

/* ---------------- Widget: query journey ---------------- */
(function () {
  const root = document.getElementById('viz-query-journey');
  if (!root) return;

  const $ = id => document.getElementById(id);
  const msg = $('qj-msg'), sqlEl = $('qj-sql'), tokEl = $('qj-tokens'),
        planEl = $('qj-plan'), statsEl = $('qj-stats'), resEl = $('qj-results'),
        againBtn = $('qj-again');

  // Fill disk blocks with the pinned rows.
  [0, 1].forEach(b => {
    const holder = root.querySelector(`.qj-rows[data-block="${b}"]`);
    holder.innerHTML = STUDENTS.filter(s => s.block === b)
      .map(s => `<div class="qj-row" data-id="${s.id}"><span>${s.id}</span>` +
                `<span class="r-name">${s.name}</span><span>${(s.gpa / 10).toFixed(1)}</span></div>`)
      .join('');
  });

  const TOKENS = [
    ['SELECT', 1], ['name', 0], ['FROM', 1], ['students', 0],
    ['WHERE', 1], ['gpa', 0], ['>', 0], ['3.5', 0],
  ];
  tokEl.innerHTML = TOKENS
    .map(([t, kw]) => `<span class="qj-token${kw ? ' kw' : ''}">${t}</span>`).join('');

  let diskReads = 0, rowsIn = 0, rowsOut = 0, warm = false;

  function planNode(op, on) {
    root.querySelectorAll('.qj-plan-node').forEach(n =>
      n.classList.toggle('active', on && n.dataset.op === op));
  }
  function frame(i, cls, text) {
    const f = $(`qj-frame-${i}`);
    f.classList.remove('hit', 'miss');
    if (cls) f.classList.add(cls);
    if (text !== undefined) f.querySelector('.qj-frame-body').textContent = text;
  }
  function blockGlow(i, on) { $(`qj-block-${i}`).classList.toggle('reading', on); }
  function rowState(id, cls) {
    const r = root.querySelector(`.qj-row[data-id="${id}"]`);
    r.classList.remove('checking', 'pass', 'fail');
    if (cls) r.classList.add(cls);
  }
  function stats() {
    statsEl.textContent = `disk reads: ${diskReads}\nrows examined: ${rowsIn}\nrows returned: ${rowsOut}`;
  }
  function addResult(name) {
    resEl.insertAdjacentHTML('beforeend', `<span class="qj-result-chip">${name}</span>`);
  }

  function checkRows(block) {
    STUDENTS.filter(s => s.block === block).forEach(s => {
      rowsIn += 1;
      const pass = s.gpa > GPA_CUT;
      rowState(s.id, pass ? 'pass' : 'fail');
      if (pass) { rowsOut += 1; addResult(s.name); }
    });
    stats();
  }

  // Each phase: [message, effect]. Cold run then (via Run again) warm run.
  const COLD = [
    ['The query arrives as text — just characters. Nothing has been checked yet.',
      () => { sqlEl.classList.add('on'); }],
    ['The parser breaks the text into tokens and checks the grammar. (You build this in Lab 5.)',
      () => { tokEl.querySelectorAll('.qj-token').forEach(t => t.classList.add('show')); }],
    ['The planner turns tokens into a plan: a tree of operators. Rows will flow bottom-up.',
      () => { planEl.classList.add('show'); }],
    ['Scan starts. It asks the buffer pool for block 0 — not in any frame: a MISS. The disk must be read.',
      () => { planNode('scan', true); frame(0, 'miss', 'loading…'); blockGlow(0, true); diskReads += 1; stats(); }],
    ['Block 0 is now in frame 0. Select tests each row against gpa > 3.5; Project keeps only name.',
      () => { blockGlow(0, false); frame(0, null, 'students.tbl · block 0'); planNode('select', true); checkRows(0); }],
    ['Scan needs block 1 — also a MISS. Second (and last) trip to disk.',
      () => { planNode('scan', true); frame(1, 'miss', 'loading…'); blockGlow(1, true); diskReads += 1; stats(); }],
    ['Block 1 lands in frame 1; its rows are tested the same way.',
      () => { blockGlow(1, false); frame(1, null, 'students.tbl · block 1'); planNode('select', true); checkRows(1); }],
    ['Done: 3 of 6 rows survive the filter. Total cost: 2 disk reads. Now press “Run again” — the buffer pool is warm.',
      () => { planNode('project', true); setTimeout(() => planNode('', false), 600); againBtn.hidden = false; }],
  ];
  const WARM = [
    ['Same query, second run. Parser and planner do their work again (that part never changes).',
      () => { sqlEl.classList.add('on'); planEl.classList.add('show'); }],
    ['Scan asks for block 0 — it is STILL IN FRAME 0. A hit: no disk. This read costs ~1000× less.',
      () => { frame(0, 'hit'); checkRows(0); }],
    ['Block 1 — also a hit. The disk never spins up at all.',
      () => { frame(1, 'hit'); checkRows(1); }],
    ['Same three rows, 0 disk reads. That difference is the buffer pool — Lab 2. Everything fast about databases looks like this.',
      () => { planNode('project', true); setTimeout(() => planNode('', false), 600); }],
  ];

  let phases = COLD, idx = -1, timer = null;

  function resetVisuals(keepFrames) {
    sqlEl.classList.remove('on');
    tokEl.querySelectorAll('.qj-token').forEach(t => t.classList.remove('show'));
    planEl.classList.remove('show');
    planNode('', false);
    STUDENTS.forEach(s => rowState(s.id, null));
    [0, 1].forEach(i => { blockGlow(i, false); });
    if (!keepFrames) { frame(0, null, 'empty'); frame(1, null, 'empty'); }
    else { frame(0, null); frame(1, null); }
    diskReads = 0; rowsIn = 0; rowsOut = 0;
    resEl.innerHTML = '';
    stats();
  }

  function runPhasesUpTo(n) {
    // Re-apply phases 0..n from a clean board (keeps Step/Back simple & correct).
    resetVisuals(phases === WARM);
    for (let i = 0; i <= n && i < phases.length; i++) phases[i][1]();
    msg.textContent = n >= 0 && n < phases.length ? phases[n][0]
      : 'The query arrives as text. Step through to see what the engine does with it.';
  }

  function step(d) {
    idx = Math.max(-1, Math.min(phases.length - 1, idx + d));
    runPhasesUpTo(idx);
  }
  function stopPlay() { if (timer) { clearInterval(timer); timer = null; $('qj-play').textContent = '▶ Play'; } }

  $('qj-step').addEventListener('click', () => { stopPlay(); step(1); });
  $('qj-back').addEventListener('click', () => { stopPlay(); step(-1); });
  $('qj-reset').addEventListener('click', () => {
    stopPlay(); phases = COLD; idx = -1; warm = false; againBtn.hidden = true; runPhasesUpTo(-1);
  });
  $('qj-play').addEventListener('click', () => {
    if (timer) { stopPlay(); return; }
    $('qj-play').textContent = '❚❚ Pause';
    timer = setInterval(() => {
      if (idx >= phases.length - 1) { stopPlay(); return; }
      step(1);
    }, 1600);
  });
  againBtn.addEventListener('click', () => {
    stopPlay(); phases = WARM; warm = true; idx = -1; againBtn.hidden = true; step(1);
  });

  stats();
})();

/* ---------------- Widget: universal layer stack ---------------- */
(function () {
  const stack = document.getElementById('ls-stack');
  if (!stack) return;
  const info = document.getElementById('ls-info');
  const LAYERS = [
    { name: 'SQL front end', lab: 'Lab 5 · Sep 24', desc: 'parser · planner',
      detail: '<strong>Job:</strong> turn SQL text into a checked, executable plan tree. ' +
        '<strong>You build:</strong> a lexer, a recursive-descent parser, and a planner for a small SQL subset ' +
        '(<code>parser.py</code>, <code>planner.py</code>). After this lab, microdb answers real SQL typed at a prompt.' },
    { name: 'Execution engine', lab: 'Lab 4 · Sep 17', desc: 'scan · select · project · join',
      detail: '<strong>Job:</strong> run the plan — a pipeline of operators, each answering “next row?”. ' +
        '<strong>You build:</strong> <code>scans.py</code>: SelectScan, ProjectScan, and a nested-loop join. ' +
        '<strong>You measure:</strong> rows examined vs rows returned on the pinned toy queries.' },
    { name: 'Records & catalog', lab: 'Lab 3 · Sep 10', desc: 'rows in pages · schemas · tables about tables',
      detail: '<strong>Job:</strong> impose meaning on raw pages — record layout, schemas, and the system catalog. ' +
        '<strong>You build:</strong> <code>record_page.py</code>, <code>table_scan.py</code>, <code>catalog.py</code>. ' +
        'The ada row finally lives at a real offset in a real block.' },
    { name: 'Buffer pool', lab: 'Lab 2 · Sep 3', desc: 'frames · pin/unpin · eviction',
      detail: '<strong>Job:</strong> keep hot blocks in memory so most reads never touch the disk. ' +
        '<strong>You build:</strong> <code>buffer_manager.py</code> with pin/unpin and LRU eviction. ' +
        '<strong>You measure:</strong> hit rate on a scan workload — the number that explains database speed.' },
    { name: 'File manager', lab: 'Lab 1 · Thu!', desc: 'files as arrays of fixed-size blocks',
      detail: '<strong>Job:</strong> the only code that touches the OS — read/write block k of file f, whole blocks at a time. ' +
        '<strong>You build:</strong> <code>file_manager.py</code>: BlockId, Page, FileManager. ' +
        '<strong>You measure:</strong> what fsync really costs your SSD.' },
    { name: 'Write-ahead log & recovery', lab: 'Lab 7 · Oct 15', side: true, desc: 'the crash-safety rail — touches every layer',
      detail: '<strong>Job:</strong> log every change before it happens so a crash at any moment leaves a recoverable database. ' +
        '<strong>You build:</strong> <code>log_manager.py</code> + recovery, then <code>kill -9</code> microdb mid-write and watch it come back. ' +
        'Sits beside the stack because every layer above the file manager reports to it.' },
  ];
  stack.innerHTML = LAYERS.map((l, i) =>
    `<div class="ls-layer${l.side ? ' ls-side' : ''}" data-i="${i}">` +
    `<span class="ls-lab">${l.lab}</span><span class="ls-name">${l.name}</span>` +
    `<span class="ls-desc">${l.desc}</span></div>`).join('');
  stack.querySelectorAll('.ls-layer').forEach(el => {
    el.addEventListener('mouseenter', () => { info.innerHTML = LAYERS[+el.dataset.i].detail; });
  });
})();

/* ---------------- Widget: latency ladder ---------------- */
(function () {
  const holder = document.getElementById('lat-rows');
  if (!holder) return;
  const btn = document.getElementById('lat-human');
  // seconds
  const RUNGS = [
    { name: 'L1 cache hit',                t: 1e-9,   note: '1 ns' },
    { name: 'Main memory (DRAM) read',     t: 100e-9, note: '100 ns' },
    { name: 'NVMe SSD random read',        t: 25e-6,  note: '25 µs' },
    { name: 'Datacenter network round-trip', t: 500e-6, note: '500 µs' },
    { name: 'Spinning-disk seek',          t: 10e-3,  note: '10 ms' },
  ];
  const minL = Math.log10(1e-9), maxL = Math.log10(10e-3);
  const DECADES = maxL - minL;                 // 7 decades, 1 ns .. 10 ms
  const pos = k => 6 + 94 * k / DECADES;       // % across the track, k decades above 1 ns
  // Labelled every other decade so the labels never collide.
  const AXIS = [[0, '1 ns'], [2, '100 ns'], [4, '10 µs'], [6, '1 ms'], [7, '10 ms']];
  const TICKS = [1, 2, 3, 4, 5, 6];            // gridlines; 0 and 7 are the track edges
  function human(t) {
    const s = t / 1e-9; // 1 ns -> 1 s
    if (s < 90) return `${Math.round(s)} s`;
    if (s < 5400) return `${Math.round(s / 60)} min`;
    if (s < 90000) return `${(s / 3600).toFixed(1)} h`;
    if (s < 3.5e6) return `${(s / 86400).toFixed(1)} days`;
    return `${(s / 2.6e6).toFixed(1)} months`;
  }
  const ratio = t => Math.round(t / 1e-9).toLocaleString('en-US') + '×';
  let humanMode = false;
  function render() {
    const axis =
      '<div class="lat-row lat-axis-row"><span class="lat-label"></span>' +
      '<span class="lat-axis">' +
      AXIS.map(([k, label], i) => {
        const cls = i === 0 ? ' first' : (i === AXIS.length - 1 ? ' last' : '');
        return `<i class="lat-atick${cls}" style="left:${pos(k).toFixed(2)}%">${label}</i>`;
      }).join('') +
      '</span><span class="lat-val lat-axis-val">vs L1</span></div>';
    const ticks = TICKS.map(k => `<i class="lat-tick" style="left:${pos(k).toFixed(2)}%"></i>`).join('');
    holder.innerHTML = axis + RUNGS.map(r => {
      const w = 6 + 94 * (Math.log10(r.t) - minL) / DECADES;
      return `<div class="lat-row"><span class="lat-label">${r.name}</span>` +
        `<span class="lat-track">${ticks}<span class="lat-bar" style="width:${w.toFixed(2)}%"></span></span>` +
        `<span class="lat-val">${humanMode ? human(r.t) : r.note}` +
        `<span class="lat-ratio">${ratio(r.t)}</span></span></div>`;
    }).join('');
  }
  btn.addEventListener('click', () => {
    humanMode = !humanMode;
    btn.textContent = `Human scale: ${humanMode ? 'on (1 ns → 1 s)' : 'off'}`;
    render();
  });
  render();
})();

/* ---------------- Widget: endianness ---------------- */
(function () {
  const rows = document.getElementById('en-rows');
  if (!rows) return;
  const input = document.getElementById('en-val');
  const note = document.getElementById('en-note');
  const buf = new ArrayBuffer(4), dv = new DataView(buf);
  const MIN = -2147483648, MAX = 2147483647;
  const hex = b => b.toString(16).toUpperCase().padStart(2, '0');

  function bytesOf(v, little) {
    dv.setInt32(0, v, little);
    return [0, 1, 2, 3].map(i => dv.getUint8(i));
  }
  function render() {
    let v = parseInt(input.value, 10);
    if (!Number.isFinite(v)) v = 0;
    v = Math.max(MIN, Math.min(MAX, v));
    // The least significant byte is at offset 0 little-endian, offset 3 big-endian.
    const defs = [
      { name: 'little-endian', sub: "struct '&lt;i' · x86, ARM, microdb", bytes: bytesOf(v, true), lsb: 0 },
      { name: 'big-endian', sub: "struct '&gt;i' · network order, SQLite headers", bytes: bytesOf(v, false), lsb: 3 },
    ];
    rows.innerHTML = defs.map(d =>
      '<div class="en-row"><div class="en-name">' + d.name +
      '<span class="en-sub">' + d.sub + '</span></div><div class="en-cells">' +
      d.bytes.map((b, i) =>
        '<span class="en-cell' + (i === d.lsb ? ' en-lsb' : '') + '">' +
        '<span class="en-off">byte ' + i + '</span>' +
        '<span class="en-hex">' + hex(b) + '</span></span>').join('') +
      '</div></div>').join('');
    dv.setInt32(0, v, true);              // write the little-endian bytes
    const misread = dv.getInt32(0, false); // read them back as big-endian
    note.innerHTML = 'Write <code>' + v + '</code> little-endian, read those same four bytes ' +
      'as big-endian, and you get <code>' + misread + '</code>' +
      (v === misread ? ' (this value is a palindrome in bytes, so the bug hides completely).'
                     : '. Nothing errors; the number is just wrong.');
  }
  input.addEventListener('input', render);
  document.querySelectorAll('[data-en]').forEach(b =>
    b.addEventListener('click', () => { input.value = b.getAttribute('data-en'); render(); }));
  render();
})();

/* ---------------- Widget: microdb build plan ---------------- */
(function () {
  const stack = document.getElementById('mp-stack');
  if (!stack) return;
  const info = document.getElementById('mp-info');
  const PLAN = [
    { lab: 'Lab 7 · Oct 15', name: 'Transactions & recovery',
      desc: 'WAL · rollback · crash recovery · locks',
      detail: '<strong>Build:</strong> the log manager, rollback, and restart recovery, plus a simple lock table. ' +
        '<strong>Measure:</strong> kill microdb mid-transaction; count what survives. (Answer: exactly the committed work.)' },
    { lab: 'Lab 6 · Oct 1', name: 'B+ tree index',
      desc: 'insert · search · range scan · planner hookup',
      detail: '<strong>Build:</strong> a real B+ tree over the file layer, wired into the planner. ' +
        '<strong>Measure:</strong> point-lookup time on 100k rows, scan vs index — expect orders of magnitude.' },
    { lab: 'Lab 5 · Sep 24', name: 'SQL front end',
      desc: 'lexer · parser · planner',
      detail: '<strong>Build:</strong> tokenizer, recursive-descent parser, and a naive planner for ' +
        '<code>SELECT … FROM … WHERE …</code> and <code>INSERT</code>. microdb gets a prompt.' },
    { lab: 'Lab 4 · Sep 17', name: 'Query operators',
      desc: 'select · project · nested-loop join',
      detail: '<strong>Build:</strong> the iterator pipeline — every operator implements next()/get_val(). ' +
        '<strong>Measure:</strong> rows touched by <code>WHERE gpa > 3.5</code> with and without an early filter.' },
    { lab: 'Lab 3 · Sep 10', name: 'Records & catalog',
      desc: 'slotted records · schemas · table files',
      detail: '<strong>Build:</strong> record pages (the ada row at its real offset), table scans, and the catalog. ' +
        '<strong>Measure:</strong> rows per block at different schema widths.' },
    { lab: 'Lab 2 · Sep 3', name: 'Buffer pool',
      desc: 'frames · pin/unpin · LRU',
      detail: '<strong>Build:</strong> the buffer manager: fixed frames, pin/unpin protocol, LRU eviction. ' +
        '<strong>Measure:</strong> hit rate as the pool shrinks — the cliff is the lesson.' },
    { lab: 'Lab 1 · Thu Aug 27', name: 'Disk & file manager',
      desc: 'BlockId · Page · FileManager',
      detail: '<strong>Build:</strong> the byte layer — typed reads/writes inside a page, whole-block I/O to disk. ' +
        '<strong>Measure:</strong> buffered vs fsync’d writes per second. Thursday. Bring a charged laptop.' },
  ];
  stack.innerHTML = PLAN.map((l, i) =>
    `<div class="mp-layer" data-i="${i}"><span class="mp-lab">${l.lab}</span>` +
    `<span class="mp-name">${l.name}</span><span class="mp-desc">${l.desc}</span></div>`).join('');
  stack.querySelectorAll('.mp-layer').forEach(el => {
    el.addEventListener('mouseenter', () => { info.innerHTML = PLAN[+el.dataset.i].detail; });
  });
})();
