/* Lab 2 — Buffer Manager · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'write-back': {
      title: 'Write-back',
      body: '<p>The caching strategy where modified data stays in memory (marked ' +
        '<em>dirty</em>) and is written to disk later — at eviction, at a flush, at a ' +
        'checkpoint — instead of on every change (<em>write-through</em>). It turns a thousand ' +
        'tiny updates to a hot page into one disk write, and in exchange the system must never ' +
        'lose track of which pages are dirty.</p>',
    },
    'invariant': {
      title: 'Invariant',
      body: '<p>A condition that must hold at every moment, not just at the end — systems code ' +
        'is designed around them. “A pinned frame is never evicted” is this lab’s central ' +
        'invariant: every method may assume it and every method must preserve it. When a test ' +
        'fails mysteriously, ask which invariant got broken and by whom.</p>',
    },
    'working-set': {
      title: 'Working set',
      body: '<p>The set of pages a workload actually re-touches over a window of time — not the ' +
        'size of the whole database. If the working set fits in the buffer pool, hit rates soar; ' +
        'if it doesn’t, no tuning saves you. The hot-set workload in your measurement has a ' +
        '5-block working set; the scan’s working set is the entire file.</p>',
    },
    'os-page-cache': {
      title: 'OS page cache',
      body: '<p>The operating system’s own cache of file data, sitting underneath your buffer ' +
        'manager. It makes your <em>misses</em> cheaper than real disk I/O (the OS often has the ' +
        'block in RAM), which is why this lab measures hit <em>rates</em> from your counters ' +
        'rather than timing wall-clock milliseconds.</p>',
    },
    'page-table': {
      title: 'Page table (of a buffer pool)',
      body: '<p>The lookup structure answering “which frame holds block <em>b</em>?” — in real ' +
        'engines a hash table from block id to frame, so every pin costs O(1) instead of a scan ' +
        'over thousands of frames. microdb scans its handful of frames instead; the Going ' +
        'Further swaps in a dict and nothing else changes.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Protocol playground ---------------- */
(function () {
  const root = document.getElementById('viz-pool');
  if (!root) return;
  const N_FRAMES = 3, N_BLOCKS = 6;
  const $ = id => document.getElementById(id);
  const msg = $('pp-msg'), framesEl = $('pp-frames'), diskEl = $('pp-disk'),
        statsEl = $('pp-stats'), selEl = $('pp-sel');

  let disk, frames, tick, hits, misses, sel;

  function reset() {
    disk = Array.from({ length: N_BLOCKS }, (_, k) => 10 * k);   // block k stores 10k
    frames = Array.from({ length: N_FRAMES }, () => null);
    // frame: { block, value, pins, dirty, last }
    tick = 0; hits = 0; misses = 0; sel = 0;
    msg.textContent = 'Select a block below, pin it, and start breaking things.';
    render();
  }

  function findFrame(k) { return frames.findIndex(f => f && f.block === k); }

  function render(flash) {
    framesEl.innerHTML = frames.map((f, i) => {
      const cls = ['bs-frame'];
      if (flash && flash.frame === i) cls.push(flash.kind);
      if (!f) {
        return `<div class="${cls.join(' ')}"><div class="bsf-label">frame ${i}</div>` +
               `<div class="bsf-block">·</div><div class="bsf-tick">empty</div></div>`;
      }
      return `<div class="${cls.join(' ')}"><div class="bsf-label">frame ${i}</div>` +
        `<div class="bsf-block">B${f.block} = ${f.value}</div>` +
        `<div class="bsf-pins">pins ${f.pins}${f.dirty ? ' · <span class="dirty-dot">dirty</span>' : ''}</div>` +
        `<div class="bsf-tick">last_used ${f.last}</div></div>`;
    }).join('');
    diskEl.innerHTML = disk.map((v, k) => {
      const fi = findFrame(k);
      const stale = fi >= 0 && frames[fi].dirty;
      const cls = ['bs-block'];
      if (k === sel) cls.push('selected');
      if (fi >= 0) cls.push('inpool');
      if (stale) cls.push('stale');
      return `<button type="button" class="${cls.join(' ')}" data-k="${k}">B${k}` +
        `<span class="bsb-val">disk: ${v}${stale ? ' (stale)' : ''}</span></button>`;
    }).join('');
    diskEl.querySelectorAll('.bs-block').forEach(b =>
      b.addEventListener('click', () => { sel = +b.dataset.k; selEl.textContent = 'B' + sel; render(); }));
    const total = hits + misses;
    statsEl.textContent = `hits: ${hits}    misses: ${misses}    hit rate: ` +
      (total ? (100 * hits / total).toFixed(0) + '%' : '—');
  }

  function pin() {
    tick += 1;
    let i = findFrame(sel);
    if (i >= 0) {
      hits += 1;
      frames[i].pins += 1;
      frames[i].last = tick;
      msg.innerHTML = `pin(B${sel}) → <strong>HIT</strong> in frame ${i}: pins now ${frames[i].pins}, last_used ${tick}.`;
      render({ frame: i, kind: 'hit' });
      return;
    }
    // choose victim: empty first, else LRU among unpinned
    i = frames.findIndex(f => f === null);
    let note = `loaded into empty frame`;
    if (i < 0) {
      const cands = frames.map((f, j) => [f, j]).filter(([f]) => f.pins === 0);
      if (!cands.length) {
        msg.innerHTML = `pin(B${sel}) → <strong>BufferAbortError</strong> — every frame is pinned. Unpin something first.`;
        framesEl.querySelectorAll('.bs-frame').forEach(el => el.classList.add('abortflash'));
        setTimeout(() => framesEl.querySelectorAll('.bs-frame').forEach(el => el.classList.remove('abortflash')), 400);
        statsEl.textContent += '';
        return;
      }
      const [victim, vj] = cands.reduce((a, b) => (b[0].last < a[0].last ? b : a));
      i = vj;
      note = victim.dirty
        ? `evicted B${victim.block} — it was <span class="dirty-dot">dirty</span>, so its value ${victim.value} was <strong>written back to disk first</strong>`
        : `evicted B${victim.block} (clean — nothing to write)`;
      if (victim.dirty) disk[victim.block] = victim.value;   // write-back
    }
    misses += 1;
    frames[i] = { block: sel, value: disk[sel], pins: 1, dirty: false, last: tick };
    msg.innerHTML = `pin(B${sel}) → <strong>MISS</strong>: ${note}; read B${sel} from disk.`;
    render({ frame: i, kind: 'miss' });
  }

  function unpin() {
    const i = findFrame(sel);
    if (i < 0) { msg.innerHTML = `unpin(B${sel}) → it isn't in the pool. (In your code this is a caller bug.)`; return; }
    if (frames[i].pins === 0) {
      msg.innerHTML = `unpin(B${sel}) → <strong>ValueError</strong>: pins is already 0. Double-release caught loudly.`;
      render({ frame: i, kind: 'miss' });
      return;
    }
    frames[i].pins -= 1;
    msg.innerHTML = `unpin(B${sel}) → pins now ${frames[i].pins}` +
      (frames[i].pins === 0 ? ' — frame is evictable again (its data stays until someone needs the frame).' : '.');
    render({ frame: i, kind: 'hit' });
  }

  function modify() {
    const i = findFrame(sel);
    if (i < 0 || frames[i].pins === 0) {
      msg.innerHTML = `modify(B${sel}) → refused: you may only write through a <strong>pinned</strong> buffer. Pin it first.`;
      return;
    }
    frames[i].value += 1;
    frames[i].dirty = true;
    msg.innerHTML = `B${sel} modified in memory: frame says ${frames[i].value}, disk still says ${disk[sel]} — ` +
      `the frame is <span class="dirty-dot">dirty</span> and the disk chip shows <em>stale</em>.`;
    render({ frame: i, kind: 'miss' });
  }

  function flushAll() {
    let n = 0;
    frames.forEach(f => { if (f && f.dirty) { disk[f.block] = f.value; f.dirty = false; n += 1; } });
    msg.innerHTML = n ? `flush_all() → wrote ${n} dirty frame${n > 1 ? 's' : ''} back to disk. Chips agree with frames again.`
                      : `flush_all() → nothing dirty, nothing written.`;
    render();
  }

  $('pp-pin').addEventListener('click', pin);
  $('pp-unpin').addEventListener('click', unpin);
  $('pp-mod').addEventListener('click', modify);
  $('pp-flush').addEventListener('click', flushAll);
  $('pp-reset').addEventListener('click', reset);

  reset();
})();
