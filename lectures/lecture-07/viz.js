/* Lecture 7 — Transactions & the WAL · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'steal': {
      title: 'STEAL',
      body: "<p>A buffer policy that permits flushing a dirty page before the transaction that changed it commits. This frees memory but can put uncommitted changes on disk. In microdb, recovery must undo those changes using old values made durable in the log first. NO-STEAL keeps uncommitted dirty pages from reaching the database file, which can require more memory.</p>",
    },
    'force': {
      title: 'FORCE',
      body: "<p>A commit policy that requires the transaction’s changed data pages to be durable before commit finishes. In microdb, those pages are flushed before the COMMIT record is appended and synced. Recovery therefore needs no redo for committed transactions. NO-FORCE defers data-page writes and requires durable information to reconstruct them after a crash.</p>",
    },
    'kill-9': {
      title: 'kill -9',
      body: "<p>A Unix command that terminates a process without allowing cleanup. Data kept only in that process’s memory is lost. The operating system’s cache survives, so this tests an abrupt process exit rather than a power failure. Power-loss and partial-write testing require additional fault injection.</p>",
    },
    'mvcc': {
      title: 'MVCC',
      body: "<p>Multi-version concurrency control keeps multiple row versions and uses a snapshot to choose which version a read can see. Ordinary snapshot reads can avoid conflicting row locks while writers create new versions. Snapshot timing depends on the isolation level, and writers can still conflict with other writers. Old versions can be reclaimed after no active snapshot needs them.</p>",
    },
    'fsync-recall': {
      title: 'fsync — recall',
      body: "<p>A system call that requests durable storage of a file’s buffered changes and waits for completion. Lab 1 compares its cost with a buffered write. Lab 7 syncs log records before changed pages can be flushed, flushes the transaction’s data pages, then syncs COMMIT. A NO-FORCE design can defer data writes and share log flushes across commits.</p>",
    },
    'idempotent': {
      title: 'Idempotent',
      body: "<p>An operation is idempotent when repeating it has the same effect as applying it once. Setting a balance to its logged old value is idempotent; subtracting $40 is not. Recovery must remain safe if interrupted and run again, including when a second crash occurs partway through repair.</p>",
    },
    'redo': {
      title: 'Redo',
      body: "<p>Reapplying logged changes that may be missing from data pages after a crash. NO-FORCE designs need redo information because commit can finish before data pages are written. microdb uses FORCE and does not need redo. ARIES replays logged history, then undoes transactions that were unfinished at the crash.</p>",
    },
    'checkpoint-recall': {
      title: 'Checkpoint — recall',
      body: "<p>A log record or related metadata that describes durable progress and helps recovery find the information it needs. A checkpoint does not always mean that every earlier transaction is complete. In a simple undo-only design, stopping the scan at a checkpoint is safe only if no unfinished transaction needs earlier log records.</p>",
    },
    'torn-write': {
      title: 'Torn write',
      body: "<p>A partial page write that leaves a mixture of old and new bytes after a failure. Page size, hardware guarantees, and filesystem behavior affect this risk. Production engines can use checksums to detect damage and logged page images to repair it. The lab’s process-crash tests do not test or repair arbitrary torn writes.</p>",
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Crash-a-bank stepper ---------------- */
(function () {
  const root = document.getElementById('viz-crash');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('cr-msg'), diskEl = $('cr-disk'), logEl = $('cr-log'), stats = $('cr-stats');

  // state: balances on disk, log entries [{text, cls}]
  let idx, timer;
  const S = () => ({ a: 100, b: 50, log: [], note: '', dead: false, undone: false });

  const STEPS = [
    { msg: 'Fresh database: A=$100, B=$50 on disk. The log is empty.',
      fx: st => {} },
    { msg: 'tx1 begins. START is appended and synced by the lab logger.',
      fx: st => st.log.push({ t: 'START tx1', c: 'synced' }) },
    { msg: 'tx1 sets A := 60. FIRST the old value (100) is logged and synced; THEN the page changes — in the buffer pool only. Disk still says 100.',
      fx: st => { st.log.push({ t: 'SET A old=100', c: 'synced' }); st.note = 'buffer: A=60'; } },
    { msg: 'tx1 sets B := 90. The old value, 50, is logged and synced before the buffered page changes; the data page has not yet been flushed.',
      fx: st => { st.log.push({ t: 'SET B old=50', c: 'synced' }); st.note = 'buffer: A=60 B=90'; } },
    { msg: 'tx1 commits: FORCE flushes the data pages, leaving disk balances of 60 and 90. The COMMIT record is then appended and synced before success is reported.',
      fx: st => { st.a = 60; st.b = 90; st.note = '';
                  st.log.forEach(e => e.c = 'synced');
                  st.log.push({ t: 'COMMIT tx1  «fsync»', c: 'synced' }); } },
    { msg: 'tx2 begins a $50 transfer: A := 10. Old value 60 logged and synced; new value in the buffer.',
      fx: st => { st.log.push({ t: 'START tx2', c: 'synced' });
                  st.log.push({ t: 'SET A old=60', c: 'synced' });
                  st.note = 'buffer: A=10'; } },
    { msg: 'The pool flushes the uncommitted dirty page to free a frame. STEAL allows this. Disk now says A=$10, but B has not yet been credited.',
      fx: st => { st.a = 10; st.note = 'uncommitted data ON DISK';
                  st.log.forEach(e => { if (e.t.includes('old=60') || e.t.includes('tx2')) e.c = 'synced'; }); } },
    { msg: 'KILL -9. The process is gone. No rollback ran. Disk: A=$10, B=$90 — the stored total is $50 short.',
      fx: st => { st.dead = true; st.note = ''; } },
    { msg: 'Restart → recover() reads the log BACKWARDS: no COMMIT for tx2 → its SET record (old=60) is an undo instruction. A := 60 restored and flushed; then a ROLLBACK record is synced.',
      fx: st => { st.a = 60; st.undone = true; st.dead = false;
                  st.log.push({ t: 'ROLLBACK tx2  «fsync»', c: 'synced' }); } },
    { msg: 'Recovered: A=$60, B=$90. The committed transfer is preserved and the incomplete transfer is undone. The total is $150 again.',
      fx: st => {} },
  ];

  let st;

  function render() {
    diskEl.innerHTML =
      `<div class="bal">A = $${st.a} &nbsp;&nbsp; B = $${st.b}</div>` +
      `<div>total: $${st.a + st.b}` +
      (st.a + st.b !== 150 ? ` <span class="gone">($${150 - st.a - st.b} missing)</span>` : ' ✓') +
      `</div>` +
      (st.note ? `<div>${st.note}</div>` : '') +
      (st.dead ? `<div class="gone">☠ process killed</div>` : '');
    logEl.innerHTML = st.log.map((e, i) => {
      const cls = ['cr-log-entry', e.c];
      if (st.undone && e.t.includes('SET A old=60')) cls.push('undone');
      return `<div class="${cls.join(' ')}">${e.t}</div>`;
    }).join('') || '<em>(empty)</em>';
    stats.textContent = `step ${idx + 1} / ${STEPS.length}` +
      `    durable log records: ${st.log.filter(e => e.c === 'synced').length} (data flushes also sync)`;
  }

  function runTo(n) {
    st = S();
    for (let i = 0; i <= n; i++) STEPS[i].fx(st);
    msg.innerHTML = STEPS[n].msg;
    render();
  }

  function step() {
    if (idx < STEPS.length - 1) { idx += 1; runTo(idx); }
    else stop();
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; $('cr-play').textContent = '▶ Play'; } }
  function reset() { stop(); idx = 0; runTo(0); }

  $('cr-step').addEventListener('click', () => { stop(); step(); });
  $('cr-reset').addEventListener('click', reset);
  $('cr-play').addEventListener('click', () => {
    if (timer) { stop(); return; }
    $('cr-play').textContent = '❚❚ Pause';
    timer = setInterval(() => {
      if (idx >= STEPS.length - 1) stop();
      else step();
    }, 2400);
  });
  reset();
})();

/* ---------------- Force/steal quadrant ---------------- */
(function () {
  const grid = document.getElementById('quad-grid');
  if (!grid) return;
  const detail = document.getElementById('quad-detail');

  const CELLS = {
    fn: {
      title: 'FORCE + NO-STEAL',
      onDisk: 'Committed changes are always on disk (force); uncommitted ones never are (no-steal).',
      undo: false, redo: false,
      verdict: 'This model requires neither undo nor redo for transaction changes.',
      price: 'Commits wait for data-page I/O, and uncommitted dirty pages remain in memory. These restrictions simplify recovery but can limit throughput and transaction size.',
      who: 'a thought experiment',
    },
    fs: {
      title: 'FORCE + STEAL',
      onDisk: 'Committed changes are on disk (force) — but so, possibly, are changes of transactions that never finished (steal).',
      undo: true, redo: false,
      verdict: 'UNDO only: restore old values for unfinished transactions.',
      price: 'Commits still wait for data flushes, but the pool evicts freely. This keeps the lab’s recovery to a backward undo pass.',
      who: 'microdb, Lab 7',
    },
    nn: {
      title: 'NO-FORCE + NO-STEAL',
      onDisk: 'Nothing uncommitted ever reaches disk (no-steal) — but committed work may exist only in the log (no-force).',
      undo: false, redo: true,
      verdict: 'REDO only: replay logged new values for committed transactions.',
      price: 'Commit can finish after the log is durable, but uncommitted dirty pages must remain in memory.',
      who: 'some in-memory engines approximate this',
    },
    ns: {
      title: 'NO-FORCE + STEAL',
      onDisk: 'Anything is possible: uncommitted changes may be on disk, committed ones may be missing.',
      undo: true, redo: true,
      verdict: 'Both are needed in this model: redo missing changes, then undo unfinished transactions.',
      price: 'Data pages can flush before or after commit, provided the write-ahead rule holds. ARIES uses redo and undo for this policy. Other engines can use version visibility to handle unfinished work instead of a physical undo pass.',
      who: 'common production policy; recovery designs differ',
    },
  };

  function render(key) {
    const c = CELLS[key];
    grid.querySelectorAll('.quad-cell').forEach(b => {
      const cc = CELLS[b.dataset.q];
      b.classList.toggle('active', b.dataset.q === key);
      b.innerHTML = `<span class="quad-need">${
        cc.undo || cc.redo ? [cc.undo ? 'UNDO' : null, cc.redo ? 'REDO' : null].filter(Boolean).join(' + ') : 'nothing'
      }</span><span class="quad-who">${cc.who}</span>`;
    });
    detail.innerHTML =
      `<div class="quad-d-title">${c.title}</div>` +
      `<p><strong>On disk at crash time:</strong> ${c.onDisk}</p>` +
      `<p><strong>${c.verdict}</strong></p>` +
      `<p>${c.price}</p>`;
  }
  grid.querySelectorAll('.quad-cell').forEach(b =>
    b.addEventListener('click', () => render(b.dataset.q)));
  render('fs');
})();
