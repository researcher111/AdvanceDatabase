/* Lecture 2: Memory & the Buffer Pool · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../../labs/_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'os-page-cache': {
      title: 'OS page cache',
      body: '<p>The operating system keeps its own cache of recently used file data in ' +
        'otherwise-free RAM: writes land there first and reads of recent blocks are served from ' +
        'it without touching the disk. It helps every program automatically, but it offers no ' +
        'pinning and no control over when or in what order bytes reach disk, which is why ' +
        'databases build their own cache on top.</p>',
    },
    'mmap': {
      title: 'mmap',
      body: '<p>A system call that maps a file directly into a program’s memory, so reading ' +
        'the file looks like reading an array; the OS pages data in and out behind the scenes. ' +
        'Tempting as a free buffer pool, but the database loses control of eviction and write ' +
        'ordering, and any read can silently stall on a page fault. Several engines tried it; ' +
        'most retreated.</p>',
    },
    'hash-table': {
      title: 'Hash table',
      body: '<p>A dictionary that finds a value by its key in constant time, no matter how many entries ' +
        'it holds. A hash function turns the key (here a <code>BlockId</code>) into a slot number; the ' +
        'value (the frame holding that block) is stored at that slot, so a lookup is one computation and ' +
        'one array access instead of a search. Python’s <code>dict</code> is one. That is why Lab 1 made ' +
        '<code>BlockId</code> hashable: the pool asks “is block <em>b</em> here?” thousands of times a ' +
        'second and cannot afford to scan the frames to answer.</p>',
    },
    'pin-count': {
      title: 'Pin count',
      body: '<p>A per-frame counter of how many callers are using the page right now. ' +
        '<code>pin(block)</code> adds one and hands back the frame; <code>unpin(buffer)</code> subtracts ' +
        'one when the caller is done. While the count is above zero the pool treats the frame as ' +
        'off limits: it will never evict it, however old it is, because a caller still holds a ' +
        'reference to that memory. At zero the frame is a candidate again. The count nests, so two ' +
        'readers of one block make it 2 and the frame survives until both release. Forgetting an ' +
        'unpin is the classic leak: the frame stays pinned forever, and a pool of pinned frames ' +
        'raises <code>BufferAbortError</code> on the next miss.</p>',
    },
    'dirty': {
      title: 'Dirty flag',
      body: '<p>A per-frame bit that says the page in memory has been written since it was loaded, so it ' +
        'no longer matches the block on disk. It is set when a caller modifies the page (in microdb, ' +
        'by calling <code>set_modified()</code> after writing into it) and cleared when the frame is ' +
        'written back. A clean frame can be evicted by just forgetting it; a dirty frame must be ' +
        'flushed to disk first or the write is lost. Reads never dirty a page, and unpin does not ' +
        'write anything: a hot page can stay dirty in memory for a long time, on purpose.</p>',
    },
    'working-set': {
      title: 'Working set',
      body: '<p>The set of pages a workload actually re-touches over a window of time, not the ' +
        'size of the whole database. If the working set fits in the buffer pool, hit rates soar; ' +
        'if it doesn’t, no amount of tuning saves you. Most real databases are far larger than ' +
        'RAM and still fast, precisely because their working set isn’t.</p>',
    },
    'thrashing': {
      title: 'Thrashing',
      body: '<p>The failure mode where a system spends its time moving data in and out of a ' +
        'too-small cache instead of doing work: each new page evicts one that’s needed again ' +
        'moments later. The sequential-flooding cliff is a controlled demonstration of it: ' +
        'hit rate pinned at zero while the disk works flat out.</p>',
    },
    'checkpoint': {
      title: 'Checkpoint',
      body: '<p>A periodic moment when the database flushes accumulated dirty pages to disk and ' +
        'records “everything before this point is safely down.” Checkpoints bound how much ' +
        'work crash recovery must replay; without them, a long-running database would need to ' +
        're-run its entire log after a crash. You’ll meet them properly in week 7.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Widget: buffer pool simulator ---------------- */
(function () {
  const root = document.getElementById('viz-bufsim');
  if (!root) return;
  const N_FRAMES = 3, N_BLOCKS = 8;
  const $ = id => document.getElementById(id);
  const msgEl = $('bs-msg'), framesEl = $('bs-frames'), diskEl = $('bs-disk'), statsEl = $('bs-stats');

  let frames, tick, hits, misses, timer = null;

  function reset() {
    frames = Array.from({ length: N_FRAMES }, () => ({ block: null, last: 0 }));
    tick = 0; hits = 0; misses = 0;
    stopRun();
    msgEl.textContent = 'Click a disk block below, or run a preset workload.';
    render();
  }

  function render(flash) {
    framesEl.innerHTML = frames.map((f, i) => {
      const cls = ['bs-frame'];
      if (flash && flash.frame === i) cls.push(flash.kind);
      return `<div class="${cls.join(' ')}">` +
        `<div class="bsf-label">frame ${i}</div>` +
        `<div class="bsf-block">${f.block === null ? '·' : 'B' + f.block}</div>` +
        `<div class="bsf-tick">${f.block === null ? 'empty' : 'last_used ' + f.last}</div></div>`;
    }).join('');
    const held = new Set(frames.map(f => f.block));
    diskEl.innerHTML = Array.from({ length: N_BLOCKS }, (_, k) =>
      `<button type="button" class="bs-block${held.has(k) ? ' inpool' : ''}" data-k="${k}">B${k}</button>`
    ).join('');
    diskEl.querySelectorAll('.bs-block').forEach(b =>
      b.addEventListener('click', () => { stopRun(); access(+b.dataset.k); }));
    const total = hits + misses;
    statsEl.textContent =
      `accesses: ${total}    hits: ${hits}    misses: ${misses}\n` +
      `hit rate: ${total ? (100 * hits / total).toFixed(0) + '%' : '–'}`;
  }

  function access(k) {
    tick += 1;
    let i = frames.findIndex(f => f.block === k);
    if (i >= 0) {
      hits += 1;
      frames[i].last = tick;
      msgEl.innerHTML = `Access B${k} → <strong>HIT</strong> in frame ${i}. No disk. last_used re-stamped to ${tick}.`;
      render({ frame: i, kind: 'hit' });
      return;
    }
    // miss: empty frame first, else LRU victim
    i = frames.findIndex(f => f.block === null);
    let evicted = null;
    if (i < 0) {
      i = frames.reduce((best, f, j) => f.last < frames[best].last ? j : best, 0);
      evicted = frames[i].block;
    }
    misses += 1;
    frames[i] = { block: k, last: tick };
    msgEl.innerHTML = `Access B${k} → <strong>MISS</strong>. ` +
      (evicted === null
        ? `Loaded into empty frame ${i}.`
        : `Evicted B${evicted} (smallest last_used) from frame ${i}, read B${k} from disk.`);
    render({ frame: i, kind: 'miss' });
  }

  function runSequence(seq, doneMsg) {
    stopRun();
    reset();
    let idx = 0;
    timer = setInterval(() => {
      if (idx >= seq.length) {
        stopRun();
        const total = hits + misses;
        msgEl.innerHTML = doneMsg.replace('{rate}', `${(100 * hits / total).toFixed(0)}%`);
        return;
      }
      access(seq[idx++]);
    }, 700);
  }

  function stopRun() { if (timer) { clearInterval(timer); timer = null; } }

  const SCAN = [0,1,2,3,4,5,6,7,0,1,2,3,4,5,6,7];
  const HOT  = [0,1,0,2,1,0,1,5,0,1,0,3,1,0,1,0];

  $('bs-scan').addEventListener('click', () =>
    runSequence(SCAN, 'Scan done: <strong>{rate} hits</strong>. Every block was evicted exactly one step before its second use. LRU + scan is the perfect anti-pattern.'));
  $('bs-hot').addEventListener('click', () =>
    runSequence(HOT, 'Hot set done: <strong>{rate} hits</strong>. Blocks 0 and 1 never left the pool: the working set fit, so repeats were free.'));
  $('bs-reset').addEventListener('click', reset);

  reset();
})();

/* ---------------- Widget: the measured cliff ---------------- */
(function () {
  const holder = document.getElementById('cf-rows');
  if (!holder) return;
  // Real output of Lab 2's measure_hits.py (reference solution, seeded workloads).
  const DATA = [
    { pool: 5,  scan: 0.0,  hot: 77.6 },
    { pool: 10, scan: 0.0,  hot: 91.2 },
    { pool: 25, scan: 0.0,  hot: 93.8 },
    { pool: 45, scan: 0.0,  hot: 97.2 },
    { pool: 49, scan: 0.0,  hot: 97.5 },
    { pool: 50, scan: 50.0, hot: 97.5 },
    { pool: 55, scan: 50.0, hot: 97.5 },
  ];
  let html = `<div class="cf-head"><span class="cf-pool">pool size</span>` +
             `<span>sequential scan ×2</span><span>hot set (90% on 5 blocks)</span></div>`;
  DATA.forEach(d => {
    const edge = d.pool === 50 ? ' cliff-edge' : '';
    html += `<div class="cf-row${edge}"><span class="cf-pool">${d.pool}</span>` +
      `<span class="cf-track"><span class="cf-bar scan" style="width:${Math.max(d.scan, 1)}%"></span>` +
      `<span class="cf-val">${d.scan.toFixed(1)}%</span></span>` +
      `<span class="cf-track"><span class="cf-bar hot" style="width:${d.hot}%"></span>` +
      `<span class="cf-val">${d.hot.toFixed(1)}%</span></span></div>`;
  });
  holder.innerHTML = html;
})();

/* ---------------- Widget: effective access time ---------------- */
(function () {
  const slider = document.getElementById('eat-h');
  if (!slider) return;
  const T_MEM = 100e-9, T_DISK = 25e-6;   // seconds
  const valEl = document.getElementById('eat-h-val');
  const out = document.getElementById('eat-readout');

  function fmt(t) {
    return t < 1e-6 ? `${Math.round(t * 1e9)} ns` : `${(t * 1e6).toFixed(1)} µs`;
  }
  function render() {
    const h = slider.value / 1000;               // 0.500 – 1.000
    const t = h * T_MEM + (1 - h) * T_DISK;
    const slow = t / T_MEM;
    // log-scale bar: T_MEM..T_DISK -> 4%..100%
    const w = 4 + 96 * (Math.log10(t) - Math.log10(T_MEM)) / (Math.log10(T_DISK) - Math.log10(T_MEM));
    const missShare = (1 - h) * T_DISK / t;
    valEl.textContent = `${(h * 100).toFixed(1)}%`;
    out.innerHTML =
      `<div class="eat-row"><span>avg access time</span>` +
      `<span class="eat-track"><span class="eat-bar" style="width:${Math.max(4, w).toFixed(1)}%"></span></span>` +
      `<span class="eat-val">${fmt(t)} · ${slow.toFixed(1)}× RAM</span></div>` +
      `<div class="eat-note">at this hit rate, misses are ${(missShare * 100).toFixed(0)}% of all time spent` +
      (h >= 0.996 ? ', and average access time is within 2× of RAM' : '') + `</div>`;
  }
  slider.addEventListener('input', render);
  render();
})();
