/* Lab 7 — Transactions & Recovery · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'the-fsync': {
      title: 'The fsync that matters',
      body: '<p>Lab 1 priced fsync; Lab 7 spends exactly one per transaction: on the COMMIT ' +
        'record. Data pages flush first (FORCE), SET records ride along unsynced — but the ' +
        'instant the COMMIT record’s fsync returns, the transaction is durable against ' +
        'anything. Before that instant, it officially never happened. Databases are cheap ' +
        'with fsyncs because they must be, and exact about the one they buy.</p>',
    },
    'idempotent-recall': {
      title: 'Idempotence — recall',
      body: '<p>Safe to run twice. Recovery must be, because a crash can interrupt recovery ' +
        'itself: restoring old values is naturally idempotent, and the ROLLBACK receipts make ' +
        'the second pass skip cleanly. The harness runs recover() twice and expects the second ' +
        'return to be empty — bookkeeping idempotence, not just data idempotence.</p>',
    },
    'stolen-page': {
      title: 'Stolen page',
      body: '<p>A dirty page holding UNCOMMITTED data that the buffer pool flushed to disk ' +
        'anyway (its right, under the STEAL policy — eviction can’t wait for commits). Safe ' +
        'only because the WAL rule guarantees the old value reached the log first, making the ' +
        'stolen write reversible. The crash demo stages exactly this and lets recovery prove ' +
        'the point.</p>',
    },
    'strict-2pl': {
      title: 'Strict two-phase locking',
      body: '<p>Locks are acquired as needed (S to read, X to write) and ALL released only at ' +
        'commit/rollback. The two-phase shape guarantees serializability; the “strict” ending ' +
        'also kills dirty reads, since nobody can touch your writes until your fate is sealed. ' +
        'Your LockTable implements it in 40 readable lines.</p>',
    },
    'undo-log': {
      title: 'Undo logging',
      body: '<p>Logging OLD values so unfinished work can be reversed — sufficient alone under ' +
        'FORCE (data flushed at commit). Real engines also log new values (redo) so commits ' +
        'don’t have to wait for data flushes; ARIES is the canonical both-ways design. ' +
        'microdb does undo-only: simplest correct thing, and half of ARIES for free.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Log-judging drill ---------------- */
(function () {
  const root = document.getElementById('viz-judge');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('jd-msg'), logEl = $('jd-log'), stats = $('jd-stats'),
        dealBtn = $('jd-deal'), autoBtn = $('jd-auto');

  // Scenarios: log oldest-first; verdicts computed for newest-first reading.
  const SCENARIOS = [
    { recs: [
        'START tx1', 'SET A old=100 tx1', 'SET B old=50 tx1', 'COMMIT tx1',
        'START tx2', 'SET A old=60 tx2'],
      note: 'the crash-demo log: one committed, one caught mid-write' },
    { recs: [
        'START tx1', 'SET A old=100 tx1',
        'START tx2', 'SET B old=50 tx2', 'COMMIT tx2', 'SET A old=80 tx1'],
      note: 'interleaved: the committed tx2 sits BETWEEN tx1’s writes' },
    { recs: [
        'START tx1', 'SET A old=100 tx1', 'ROLLBACK tx1',
        'START tx2', 'SET A old=100 tx2', 'COMMIT tx2', 'START tx3', 'SET B old=50 tx3'],
      note: 'a rollback is a fate too — tx1 needs nothing from you' },
  ];
  let scen = null, dealt = 0, cursor = -1, score, total;

  function verdictOf(i) {
    // Compute truth: reading newest-first, is rec i a fate, an undo, or a skip?
    const recs = scen.recs;
    const fates = new Set();
    for (let j = recs.length - 1; j > i; j--) {
      const r = recs[j];
      const tx = r.split(' ').pop();
      if (r.startsWith('COMMIT') || r.startsWith('ROLLBACK')) fates.add(tx);
    }
    const r = recs[i];
    const tx = r.split(' ').pop();
    if (r.startsWith('COMMIT') || r.startsWith('ROLLBACK')) return 'fate';
    if (r.startsWith('SET')) return fates.has(tx) ? 'skip' : 'undo';
    return 'skip';   // START
  }

  function deal() {
    scen = SCENARIOS[dealt % SCENARIOS.length];
    dealt += 1;
    cursor = scen.recs.length - 1;
    score = 0; total = 0;
    autoBtn.hidden = true;
    msg.innerHTML = `Scenario: <em>${scen.note}</em>. Start at the <strong>bottom</strong> — ` +
      `click the newest record and judge it: fate, undo, or skip.`;
    render();
  }

  function render() {
    logEl.innerHTML = scen.recs.map((r, i) => {
      const cls = ['jd-rec'];
      let verdict = '';
      if (i > cursor) {
        const v = verdictOf(i);
        cls.push('judged-' + v);
        verdict = v === 'undo' ? 'UNDO ← restore old' : v === 'fate' ? 'FATE noted' : 'skip';
      }
      return `<div class="${cls.join(' ')}" data-i="${i}">` +
        `<span class="jd-idx">${i}</span><span style="flex:1">${r}</span>` +
        `<span class="jd-verdict">${verdict}</span></div>`;
    }).join('');
    logEl.querySelectorAll('.jd-rec').forEach(el => {
      const i = +el.dataset.i;
      if (i === cursor) el.addEventListener('click', () => judge(i, el));
    });
    stats.textContent = `records judged: ${total}    correct first-click: ${score}`;
  }

  function judge(i, el) {
    const v = verdictOf(i);
    total += 1;
    // First click reveals the verdict; the drill is self-scored pacing.
    score += 1;
    cursor -= 1;
    const label = v === 'undo' ? 'an UNDO instruction — its tx has no fate above (below in time), so restore old'
                : v === 'fate' ? 'a FATE — note this tx as finished; skip its writes when you reach them'
                : 'skippable — a START, or a SET whose tx you already know committed/rolled back';
    msg.innerHTML = `Record ${i} (<code>${scen.recs[i]}</code>) is ${label}.` +
      (cursor < 0 ? ' <strong>Log fully judged — that pass IS recover(). Deal another.</strong>' : '');
    if (cursor < 0) autoBtn.hidden = true;
    render();
  }

  autoBtn.addEventListener('click', () => { while (cursor >= 0) judge(cursor); });
  dealBtn.addEventListener('click', deal);
})();
