/* Lecture 8 — Concurrency · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'snapshot-isolation': {
      title: 'Snapshot isolation',
      body: '<p>An isolation level where each transaction works from a snapshot: the set of transactions that had committed at the moment it began. Every read returns the row versions those transactions produced and nothing committed later, so a transaction sees one consistent state for its whole run, and readers take no locks at all. Two transactions that try to write the same row still conflict, and the second one to commit is aborted. What it does not catch is two transactions that read overlapping rows and then write <em>different</em> rows, which is write skew. Postgres&#39;s REPEATABLE READ level is snapshot isolation; its SERIALIZABLE level adds the extra checks needed to catch write skew.</p>',
    },
    'strict-2pl': {
      title: 'Strict 2PL (strict two-phase locking)',
      body: '<p>Two-phase locking (2PL) is the rule that a transaction takes a lock before it touches data: a shared (S) lock to read a row, which many transactions may hold at once, and an exclusive (X) lock to write it, which only one may hold and which shuts out readers too. The two phases are growing and shrinking: a transaction may keep acquiring locks until the moment it releases its first one, and after that it may only release. That single rule is enough to guarantee the interleaving is equivalent to running the transactions one at a time in some order. The <em>strict</em> variant holds every lock until the transaction commits or rolls back, so nothing a transaction wrote can be read by anyone else until that write is final, which also rules out dirty reads. It is what Lab 7&#39;s lock table implements and what most engines run.</p>',
    },
    'mvcc-intro': {
      title: 'MVCC (multi-version concurrency control)',
      body: '<p>Instead of overwriting a row, UPDATE creates a new <em>version</em> and the old ' +
        'one lingers, stamped with which transactions created and superseded it. Each reader ' +
        'sees a consistent snapshot — the versions current when it began — so reads take no ' +
        'locks at all. Postgres, Oracle, and most modern engines run on it.</p>',
    },
    'serializable': {
      title: 'Serializability',
      body: '<p>The gold standard for concurrent correctness: the interleaved execution ' +
        'produces the same result as running the transactions one at a time in <em>some</em> ' +
        'order. Not necessarily the arrival order — just some order a lawyer could point to. ' +
        'Anything weaker admits at least one named anomaly.</p>',
    },
    'deadlock': {
      title: 'Deadlock',
      body: '<p>A cycle of waiting: tx1 holds lock A and wants B; tx2 holds B and wants A; ' +
        'neither can ever proceed. Engines detect the cycle and abort a victim (your app must ' +
        'retry). Standard prevention: every piece of code acquires locks in the same global ' +
        'order — no order cycles, no deadlocks.</p>',
    },
    'vacuum': {
      title: 'VACUUM',
      body: '<p>Postgres’s garbage collector: old row versions that no living snapshot could ' +
        'ever see are reclaimed for reuse — Lab 3’s tombstone recycling, industrialized and ' +
        'automated (autovacuum). A long-running transaction pins its snapshot, blocking vacuum ' +
        'from cleaning anything newer: the classic cause of table bloat in production.</p>',
    },
    'snapshot': {
      title: 'Snapshot',
      body: '<p>A transaction’s frozen view of which other transactions had committed at its ' +
        'start. Row-version visibility is decided against it: created-by-a-committed-tx and ' +
        'not-yet-superseded means visible. Cheap to take (a list of tx ids), and the heart of ' +
        'both MVCC reads and “repeatable read” isolation.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Interleaving console ---------------- */
(function () {
  const root = document.getElementById('viz-ilv');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('il-msg'), s1El = $('il-s1'), s2El = $('il-s2'),
        acctEl = $('il-acct'), stats = $('il-stats'), lockBox = $('il-locks');

  const STEPS = ['read A', 'compute +10', 'write A', 'commit'];
  let A, tx, xlockHolder, refusedNote;

  function reset() {
    A = 100;
    tx = [
      { pos: 0, local: null, refused: false },
      { pos: 0, local: null, refused: false },
    ];
    xlockHolder = null;
    refusedNote = '';
    msg.textContent = 'A = $100. Both cashiers ready. You are the interleaving.';
    render();
  }

  function render() {
    [s1El, s2El].forEach((el, t) => {
      el.innerHTML = STEPS.map((s, i) => {
        const cls = ['il-step'];
        if (i < tx[t].pos) cls.push('done');
        if (i === tx[t].pos && tx[t].pos < STEPS.length) cls.push('current');
        if (tx[t].refused && i === tx[t].pos) cls.push('refused');
        return `<div class="${cls.join(' ')}">${i + 1}. ${s}` +
          (s === 'read A' && i < tx[t].pos && tx[t].local !== null ? ` → got ${tx[t].local === 110 ? A : tx[t].readVal}` : '') +
          `</div>`;
      }).join('');
    });
    const both = tx[0].pos === 4 && tx[1].pos === 4;
    const lost = both && A !== 120;
    acctEl.innerHTML =
      `A = $${A}` +
      (lockBox.checked ? `<div class="lockline">X-lock: ${xlockHolder === null ? 'free' : 'held by tx' + (xlockHolder + 1)}</div>` : '') +
      (both ? (lost
        ? `<div class="lost">Both committed “+$10”, but A = $${A}. A deposit is GONE.</div>`
        : `<div>Both committed: $120. Serial-equivalent — correct.</div>`) : '');
    stats.textContent = `tx1: step ${tx[0].pos}/4    tx2: step ${tx[1].pos}/4    locks: ${lockBox.checked ? 'strict 2PL' : 'off'}`;
  }

  function step(t) {
    const me = tx[t], other = tx[1 - t];
    me.refused = false;
    if (me.pos >= 4) { msg.innerHTML = `tx${t + 1} already committed.`; return; }
    const action = STEPS[me.pos];
    if (lockBox.checked && (action === 'read A' || action === 'write A')) {
      // strict 2PL, upgrade-to-X on first touch (write intent known): X lock on read for this demo's simplicity? No:
      // model honestly: read takes S... but both-read-then-write is the classic upgrade deadlock.
      // For the demo we model the lab's behavior: reads take S, writes take X, conflicts refuse.
      if (action === 'write A' && xlockHolder === null && other.pos >= 1 && other.pos < 4) {
        me.refused = true;
        msg.innerHTML = `tx${t + 1} write A → <strong>LockAbortError</strong>: tx${2 - t} still holds a ` +
          `read lock. (In real engines: tx${t + 1} would WAIT — and if both upgrade, deadlock; ` +
          `one gets shot. Either way, the lost update is prevented.)`;
        render();
        return;
      }
      if (action === 'write A' && xlockHolder !== null && xlockHolder !== t) {
        me.refused = true;
        msg.innerHTML = `tx${t + 1} write A → <strong>LockAbortError</strong>: tx${xlockHolder + 1} holds the X lock.`;
        render();
        return;
      }
      if (action === 'read A' && xlockHolder !== null && xlockHolder !== t) {
        me.refused = true;
        msg.innerHTML = `tx${t + 1} read A → <strong>LockAbortError</strong>: tx${xlockHolder + 1} holds the X lock. No dirty reads.`;
        render();
        return;
      }
      if (action === 'write A') xlockHolder = t;
    }
    if (action === 'read A') {
      me.readVal = A;
      me.local = A;
      msg.innerHTML = `tx${t + 1} reads A → <strong>$${A}</strong> into its local variable.`;
    } else if (action === 'compute +10') {
      me.local = me.readVal + 10;
      msg.innerHTML = `tx${t + 1} computes ${me.readVal} + 10 = <strong>${me.local}</strong> — in memory, using its possibly-stale read.`;
    } else if (action === 'write A') {
      A = me.local;
      msg.innerHTML = `tx${t + 1} writes A := <strong>$${A}</strong>.` +
        (me.readVal !== undefined && me.readVal + 10 !== A ? '' : '');
    } else {
      msg.innerHTML = `tx${t + 1} commits.` + (lockBox.checked ? ' Its locks are released.' : '');
      if (lockBox.checked && xlockHolder === t) xlockHolder = null;
    }
    me.pos += 1;
    render();
  }

  $('il-t1').addEventListener('click', () => step(0));
  $('il-t2').addEventListener('click', () => step(1));
  $('il-reset').addEventListener('click', reset);
  lockBox.addEventListener('change', reset);
  reset();
})();

/* ---------------- Walk a version chain ---------------- */
(function () {
  const slider = document.getElementById('chain-slider');
  if (!slider) return;
  const stage = document.getElementById('chain-stage');
  const when = document.getElementById('chain-when');

  // The row's version chain: xmax = the tx that superseded this version.
  const VERSIONS = [
    { label: 'v1', balance: 120, xmin: 100, xmax: 103 },
    { label: 'v2', balance: 70,  xmin: 103, xmax: 107 },
    { label: 'v3', balance: 50,  xmin: 107, xmax: null },
  ];
  // Slider positions: which tx ids the reader's snapshot saw as committed.
  const SNAPSHOTS = [
    { label: 'after tx 100 committed', committed: [100] },
    { label: 'after tx 103 committed', committed: [100, 103] },
    { label: 'after tx 107 committed', committed: [100, 103, 107] },
  ];

  function render() {
    const snap = SNAPSHOTS[+slider.value];
    when.textContent = snap.label;
    const sees = c => snap.committed.includes(c);
    let seen = null;
    stage.innerHTML = '<div class="chain-row">' + VERSIONS.map(v => {
      const xminOk = sees(v.xmin);
      const xmaxOk = v.xmax === null || !sees(v.xmax);   // not yet superseded, for me
      const visible = xminOk && xmaxOk;
      if (visible) seen = v;
      return `<div class="chain-ver${visible ? ' visible' : ''}">` +
        `<div class="chain-ver-head">${v.label} · balance = ${v.balance}</div>` +
        `<div class="chain-stamp">xmin ${v.xmin} <span class="${xminOk ? 'ok' : 'no'}">${xminOk ? 'committed ✓' : 'not yet ✗'}</span></div>` +
        `<div class="chain-stamp">xmax ${v.xmax ?? '—'} <span class="${xmaxOk ? 'ok' : 'no'}">${v.xmax === null ? 'live ✓' : (xmaxOk ? 'not yet ✓' : 'committed ✗')}</span></div>` +
        `<div class="chain-verdict">${visible ? 'VISIBLE to me' : 'invisible'}</div>` +
        `</div>`;
    }).join('<div class="chain-link">→</div>') + '</div>' +
    `<div class="chain-msg">This reader computes <strong>balance = ${seen.balance}</strong> — ` +
    `and keeps computing it for its whole run, no matter who commits meanwhile.</div>`;
  }
  slider.addEventListener('input', render);
  render();
})();

/* ---------------- Isolation-level explorer ---------------- */
(function () {
  const ladder = document.getElementById('iso-ladder');
  if (!ladder) return;
  const cards = document.getElementById('iso-cards');
  const price = document.getElementById('iso-price');

  const ANOMALIES = [
    { key: 'dirty', name: 'Dirty read',
      story: 'T1 writes x=70, has not committed · T2 reads x and sees 70 · T1 rolls back',
      consequence: 'T2 acted on a value that never existed' },
    { key: 'nonrep', name: 'Non-repeatable read',
      story: 'T2 reads x=100 · T1 updates x=70 and commits · T2 re-reads x and sees 70',
      consequence: 'one transaction, two answers for the same row' },
    { key: 'phantom', name: 'Phantom',
      story: 'T2 runs WHERE gpa > 35, gets 3 rows · T1 inserts a qualifying row, commits · T2 re-runs, gets 4',
      consequence: 'the SET of matching rows changed under a repeated predicate' },
  ];
  const LEVELS = [
    { name: 'READ UNCOMMITTED', blocks: [],
      who: 'almost nobody, honestly',
      price: 'Price: none — and correctness to match. You can read other people’s rolled-back mistakes.' },
    { name: 'READ COMMITTED', blocks: ['dirty'],
      who: 'Postgres’s default',
      price: 'Price: cheap — each statement just reads only committed state. The workhorse default.' },
    { name: 'REPEATABLE READ', blocks: ['dirty', 'nonrep'],
      who: 'MySQL’s default; in Postgres this level = a full snapshot',
      price: 'Price: hold read locks (2PL) or pin a snapshot (MVCC) for the whole transaction. Phantoms are the gray zone: row locks can’t lock rows that don’t exist yet.' },
    { name: 'SERIALIZABLE', blocks: ['dirty', 'nonrep', 'phantom'],
      who: 'the correct-by-default crowd',
      price: 'Price: predicate/range locking, or optimistic detection with retries — your code must be ready to re-run a transaction that loses a conflict.' },
  ];

  let current = 1;   // start at READ COMMITTED, the default people actually run

  function render() {
    const lv = LEVELS[current];
    ladder.innerHTML = LEVELS.map((l, i) =>
      `<button type="button" class="iso-rung${i === current ? ' active' : ''}" data-i="${i}">` +
      `<span class="iso-rung-name">${l.name}</span><span class="iso-rung-who">${l.who}</span></button>`
    ).join('');
    cards.innerHTML = ANOMALIES.map(a => {
      const blocked = lv.blocks.includes(a.key);
      const gray = a.key === 'phantom' && lv.name === 'REPEATABLE READ';
      return `<div class="iso-card${blocked ? ' safe' : ''}">` +
        `<div class="iso-card-head">${a.name} · ${blocked ? 'PREVENTED ✓' : (gray ? 'gray zone' : 'can happen ✗')}</div>` +
        `<div class="iso-card-story">${a.story}</div>` +
        `<div class="iso-card-why">${blocked ? 'this level’s machinery refuses the schedule' : a.consequence}</div>` +
        `</div>`;
    }).join('');
    price.textContent = lv.price;
    ladder.querySelectorAll('.iso-rung').forEach(b =>
      b.addEventListener('click', () => { current = +b.dataset.i; render(); }));
  }
  render();
})();
