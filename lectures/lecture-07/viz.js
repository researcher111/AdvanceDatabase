/* Lecture 7 — Transactions & the WAL · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'steal': {
      title: 'STEAL',
      body: '<p>A buffer-pool policy for what happens when memory is full. Under STEAL, the pool may evict, and therefore flush to disk, a dirty page that belongs to a transaction that has not committed yet; the frame is &#39;stolen&#39; from that transaction. This is what lets the pool manage memory freely, but it means a crash can leave uncommitted changes sitting on disk. Recovery must then undo them, which is only possible if the old value was logged before the page was written: the write-ahead rule. NO-STEAL avoids the undo pass by pinning every dirty page until its transaction commits, which is simple but means a large transaction can exhaust the pool.</p>',
    },
    'force': {
      title: 'FORCE',
      body: '<p>A buffer-pool policy for what happens at COMMIT. Under FORCE, the pool writes every dirty page the committing transaction touched to disk before the COMMIT record is appended to the log. The payoff is that recovery never has to redo a committed transaction, because its data is already on disk whenever its COMMIT record is. The cost is that each commit waits for those page writes, which are random I/O, and that is why production engines choose NO-FORCE and accept a redo pass instead. microdb uses FORCE because it keeps recovery to a single undo pass.</p>',
    },
    'kill-9': {
      title: 'kill -9',
      body: '<p>A Unix command that tells the operating system to terminate a process immediately, with no warning and no chance to run cleanup code. Anything the process held only in memory, including data pages it had not yet written and log records still sitting in its buffers, is gone the instant the command lands. The operating system&#39;s own cache survives, so bytes already handed to the OS but not yet fsync&#39;d are in a grey zone: they may reach disk, or may not. That makes kill -9 a convenient stand-in for a power cut when testing a database: if the engine&#39;s recovery works after kill -9, it has kept its durability promise without help from an orderly shutdown.</p>',
    },
    'mvcc': {
      title: 'MVCC',
      body: '<p>Multi-version concurrency control. Instead of overwriting a row in place, the engine keeps several versions of it, each stamped with the transaction that wrote it, and every reader is shown the version that was current when its own transaction began. Writers therefore never block readers and readers never block writers, because they are looking at different copies. Old versions are cleaned up later, once no running transaction can still see them. It is how Postgres keeps the I in ACID; Tuesday&#39;s lecture covers it in full.</p>',
    },
    'fsync-recall': {
      title: 'fsync — recall',
      body: '<p>Lab 1’s expensive promise: the system call that blocks until bytes are ' +
        'physically on durable storage. You measured it costing 10–1000× a buffered write. ' +
        'Today’s design question is where a transaction system can afford to spend them — ' +
        'and the answer is: one, on the COMMIT record, on a sequential file.</p>',
    },
    'idempotent': {
      title: 'Idempotent',
      body: '<p>Safe to run twice: doing it again changes nothing more. Restoring an old value ' +
        'is idempotent (restore twice, same result); “subtract $40” is not. Recovery must be ' +
        'idempotent because a crash can interrupt recovery itself — the second pass must do no ' +
        'new damage. A design property you’ll meet again in week 13’s exactly-once story.</p>',
    },
    'redo': {
      title: 'Redo',
      body: '<p>Replaying a committed transaction’s writes from the log because its data pages ' +
        'never reached disk — the price of NO-FORCE (commits don’t flush data). Requires ' +
        'logging new values alongside old ones. microdb’s FORCE policy makes redo unnecessary; ' +
        'ARIES does redo-then-undo and is the industry standard.</p>',
    },
    'checkpoint-recall': {
      title: 'Checkpoint — recall',
      body: '<p>Week 2’s table promised this payoff: a periodic “everything before here is ' +
        'safely on disk” note in the log. Recovery starts from the latest checkpoint instead ' +
        'of the beginning of time, bounding restart to seconds instead of a replay of the ' +
        'database’s whole life.</p>',
    },
    'torn-write': {
      title: 'Torn write',
      body: '<p>A crash mid-way through writing a single page, leaving half old and half new ' +
        'bytes — disks only promise atomicity per sector, not per 8&nbsp;KB page. Real engines ' +
        'defend with page checksums and (in Postgres) full-page images in the WAL after each ' +
        'checkpoint. microdb, at 128-byte blocks on a journaling filesystem, gets to ignore it.</p>',
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
    { msg: 'tx1 begins. START is appended — buffered, no fsync needed yet.',
      fx: st => st.log.push({ t: 'START tx1', c: 'buffered' }) },
    { msg: 'tx1 sets A := 60. FIRST the old value (100) goes to the log; THEN the page changes — in the buffer pool only. Disk still says 100.',
      fx: st => { st.log.push({ t: 'SET A old=100', c: 'buffered' }); st.note = 'buffer: A=60'; } },
    { msg: 'tx1 sets B := 90, same dance. Old value 50 logged; disk untouched.',
      fx: st => { st.log.push({ t: 'SET B old=50', c: 'buffered' }); st.note = 'buffer: A=60 B=90'; } },
    { msg: 'tx1 COMMITS: data pages flush (FORCE)… disk now 60/90… then the COMMIT record is appended WITH FSYNC. When that returns, the promise is binding.',
      fx: st => { st.a = 60; st.b = 90; st.note = '';
                  st.log.forEach(e => e.c = 'synced');
                  st.log.push({ t: 'COMMIT tx1  «fsync»', c: 'synced' }); } },
    { msg: 'tx2 begins a $50 transfer: A := 10. Old value 60 logged; new value in the buffer.',
      fx: st => { st.log.push({ t: 'START tx2', c: 'buffered' });
                  st.log.push({ t: 'SET A old=60', c: 'buffered' });
                  st.note = 'buffer: A=10'; } },
    { msg: 'The pool STEALS the dirty page to disk (eviction pressure — its right, per week 2). Disk now says A=$10. B was never credited. And then—',
      fx: st => { st.a = 10; st.note = 'uncommitted data ON DISK';
                  st.log.forEach(e => { if (e.t.includes('old=60') || e.t.includes('tx2')) e.c = 'synced'; }); } },
    { msg: 'KILL -9. The process is gone. No rollback ran. Disk: A=$10, B=$90 — $50 of the $150 has ceased to exist.',
      fx: st => { st.dead = true; st.note = ''; } },
    { msg: 'Restart → recover() reads the log BACKWARDS: no COMMIT for tx2 → its SET record (old=60) is an undo instruction. A := 60 restored; a ROLLBACK receipt appended.',
      fx: st => { st.a = 60; st.undone = true; st.dead = false;
                  st.log.push({ t: 'ROLLBACK tx2  «fsync»', c: 'synced' }); } },
    { msg: 'Consistent: A=$60, B=$90 — the committed transfer stands, the doomed one never happened. That is the whole promise, kept.',
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
      `    fsyncs so far: ${st.log.filter(e => e.t.includes('fsync')).length}`;
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
      verdict: 'Recovery does NOTHING — the disk is always exactly right.',
      price: 'The price is brutal: every commit waits for data I/O, and the pool must hold every dirty page of every live transaction in memory until it commits. Nobody ships this.',
      who: 'a thought experiment',
    },
    fs: {
      title: 'FORCE + STEAL',
      onDisk: 'Committed changes are on disk (force) — but so, possibly, are changes of transactions that never finished (steal).',
      undo: true, redo: false,
      verdict: 'UNDO only: erase the intruders by restoring logged old values.',
      price: 'Commits still wait for data flushes, but the pool evicts freely. The simplest correct policy that a real buffer manager can live with.',
      who: 'microdb, Lab 7',
    },
    nn: {
      title: 'NO-FORCE + NO-STEAL',
      onDisk: 'Nothing uncommitted ever reaches disk (no-steal) — but committed work may exist only in the log (no-force).',
      undo: false, redo: true,
      verdict: 'REDO only: replay logged new values for committed transactions.',
      price: 'Fast commits, but the no-steal constraint still shackles the buffer pool to transaction lifetimes.',
      who: 'some in-memory engines approximate this',
    },
    ns: {
      title: 'NO-FORCE + STEAL',
      onDisk: 'Anything is possible: uncommitted changes may be on disk, committed ones may be missing.',
      undo: true, redo: true,
      verdict: 'BOTH passes — redo the missing, undo the intruders.',
      price: 'Total freedom for the pool and the fastest possible commit (one log fsync). The recovery complexity is ARIES — and every serious engine decided it was worth it.',
      who: 'Postgres, MySQL, Oracle, SQL Server (ARIES family)',
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
