/* Lecture 2: Memory & the Buffer Pool · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../../labs/_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'os-page-cache': {
      title: 'OS page cache',
      body: "<p>The operating system caches file data in RAM. A read may reuse cached bytes, and a buffered write can return before its data reaches durable storage. A database buffer pool adds its own active-use counts and replacement decisions. The database must also enforce the write ordering needed by its recovery protocol.</p>",
    },
    'mmap': {
      title: 'mmap',
      body: "<p>A system call that maps a file into a process’s address space. The program accesses the file through memory addresses while the OS loads and writes pages as needed. This changes who controls page movement and can cause an access to wait for a page fault. Database designs using mmap must account for these behaviors and their recovery requirements.</p>",
    },
    'hash-table': {
      title: 'Hash table',
      body: "<p>A key-value structure, such as Python’s <code>dict</code>, with expected constant-time lookup under normal hashing assumptions. Collisions can require additional work, so a lookup is not guaranteed to be one array access. Production buffer pools commonly map block identifiers to frames this way. Lab 2 scans a small frame list for simplicity.</p>",
    },
    'pin-count': {
      title: 'Pin count',
      body: "<p>The number of active pins on a frame. A successful <code>pin(block)</code> adds one; <code>unpin(buffer)</code> removes one. A positive count makes the frame ineligible for eviction. Multiple callers can pin the same block, so the count reaches zero only after all their pins are released. Leaked pins can leave the pool with no frame available for a miss.</p>",
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
    'commit': {
      title: 'Commit',
      body: "<p>Successful completion of a transaction. With durable commit, the engine ensures enough information is safely stored to preserve the transaction after a crash. Lab 7 uses FORCE: changed data pages are durable before the commit record. A NO-FORCE design can make the log durable at commit and write the data pages later, using redo during recovery.</p>",
    },
    'working-set': {
      title: 'Working set',
      body: "<p>The pages a workload uses repeatedly during a period of time. It can be much smaller than the whole database. If these pages remain in the buffer pool between requests, they produce cache hits. Access order and replacement policy also affect whether they remain cached.</p>",
    },
    'thrashing': {
      title: 'Thrashing',
      body: "<p>Repeatedly evicting pages that will soon be needed again, causing substantial I/O and few cache hits. The lecture’s sequential scan larger than the pool illustrates this pattern.</p>",
    },
    'checkpoint': {
      title: 'Checkpoint',
      body: "<p>A recovery operation that records a point from which restart work can be limited. It typically coordinates page flushing with logging, but the details depend on the recovery design. Lab 7 offers a simple checkpoint as an optional extension and requires transactions to be finished first.</p>",
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
    runSequence(HOT, 'Hot set done: <strong>{rate} hits</strong>. Requests to the small hot set often reuse blocks still in memory.'));
  $('bs-reset').addEventListener('click', reset);

  reset();
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
