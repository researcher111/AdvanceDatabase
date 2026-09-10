/* Lab 7 — Transactions & Recovery · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'the-fsync': {
      title: "Durable write ordering",
      body: "<p>Lab 7 uses FORCE/STEAL. LogManager syncs old values before changed pages can be flushed. Commit flushes data pages before syncing COMMIT. Rollback and recovery flush restored values before syncing ROLLBACK. These operations perform multiple syncs; production designs can batch work using log sequence numbers and redo information.</p>",
    },
    'idempotent-recall': {
      title: "Idempotence",
      body: "<p>Repeating an idempotent operation has the same effect as applying it once. Restoring a logged old value is idempotent. After recovery flushes its repairs and syncs ROLLBACK records, another pass skips those completed repairs. The harness checks both unchanged balances and an empty list of newly undone transactions on the second run.</p>",
    },
    'stolen-page': {
      title: "Page flushed before commit",
      body: "<p>A dirty page containing uncommitted data that the buffer pool writes to disk under the STEAL policy. This frees a frame before the transaction finishes. The undo log must already contain durable old values so recovery can reverse the changes if the transaction does not commit.</p>",
    },
    'strict-2pl': {
      title: "Two-phase locking in the lab",
      body: "<p>The lock table provides shared locks for reads and exclusive locks for writes. The lab retains both kinds until commit or rollback, which is also called rigorous two-phase locking. Conflicting requests raise an error immediately. The caller must roll back the transaction rather than continue without the lock.</p>",
    },
    'undo-log': {
      title: "Undo logging",
      body: "<p>Recording old values so incomplete changes can be reversed. microdb flushes all changed data pages at commit, so it does not need redo for committed work. A NO-FORCE design can defer those page writes, but must log enough information to reconstruct them after a crash.</p>",
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
      note: 'the crash-demo log: one committed transaction and one interrupted change' },
    { recs: [
        'START tx1', 'SET A old=100 tx1',
        'START tx2', 'SET B old=50 tx2', 'COMMIT tx2', 'SET A old=80 tx1'],
      note: 'interleaved: tx2 commits between two changes by tx1' },
    { recs: [
        'START tx1', 'SET A old=100 tx1', 'ROLLBACK tx1',
        'START tx2', 'SET A old=100 tx2', 'COMMIT tx2', 'START tx3', 'SET B old=50 tx3'],
      note: 'tx1 has completed rollback; recovery can skip its changes' },
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
      `predict the action for the newest record, then click to reveal it: mark complete, undo, or skip.`;
    render();
  }

  function render() {
    logEl.innerHTML = scen.recs.map((r, i) => {
      const cls = ['jd-rec'];
      let verdict = '';
      if (i > cursor) {
        const v = verdictOf(i);
        cls.push('judged-' + v);
        verdict = v === 'undo' ? 'UNDO ← restore old' : v === 'fate' ? 'completion recorded' : 'skip';
      }
      return `<div class="${cls.join(' ')}" data-i="${i}">` +
        `<span class="jd-idx">${i}</span><span style="flex:1">${r}</span>` +
        `<span class="jd-verdict">${verdict}</span></div>`;
    }).join('');
    logEl.querySelectorAll('.jd-rec').forEach(el => {
      const i = +el.dataset.i;
      if (i === cursor) el.addEventListener('click', () => judge(i, el));
    });
    stats.textContent = `records inspected: ${total}`;
  }

  function judge(i, el) {
    const v = verdictOf(i);
    total += 1;
    // First click reveals the verdict; the drill is self-scored pacing.
    score += 1;
    cursor -= 1;
    const label = v === 'undo' ? 'an undo action: no later completion record exists for this transaction, so restore the old value'
                : v === 'fate' ? 'a completion record: mark this transaction finished and skip its earlier SET records'
                : 'skippable: it is a START record or a SET from a transaction whose completion was already found';
    msg.innerHTML = `Record ${i} (<code>${scen.recs[i]}</code>) is ${label}.` +
      (cursor < 0 ? ' <strong>The backward scan is complete. Recovery must now flush restored values and record completed undo. Load another scenario to practice.</strong>' : '');
    if (cursor < 0) autoBtn.hidden = true;
    render();
  }

  autoBtn.addEventListener('click', () => { while (cursor >= 0) judge(cursor); });
  dealBtn.addEventListener('click', deal);
})();
