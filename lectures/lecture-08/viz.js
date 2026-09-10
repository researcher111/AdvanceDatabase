/* Lecture 8 — Concurrency · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'snapshot-isolation': {
      title: 'Snapshot isolation',
      body: "<p>A transaction reads from a consistent snapshot of committed data, while also seeing its own changes. Concurrent transactions that write the same row cannot both commit under snapshot isolation. Transactions that read overlapping data but write different rows can still exhibit write skew. PostgreSQL REPEATABLE READ provides snapshot isolation; SERIALIZABLE adds checks for nonserializable outcomes.</p>",
    },
    'strict-2pl': {
      title: 'Strict 2PL (strict two-phase locking)',
      body: "<p>Two-phase locking requires a transaction to acquire appropriate locks before access and forbids acquiring new locks after it starts releasing them. Shared locks permit concurrent readers; exclusive locks conflict with other holders. Strict 2PL holds exclusive locks until completion. The lab holds both shared and exclusive locks until completion, a stronger variant also called rigorous 2PL. Predicate or range protection is needed when a query’s matching set must be protected.</p>",
    },
    'mvcc-intro': {
      title: 'MVCC (multi-version concurrency control)',
      body: "<p>An update creates a new row version while retaining older versions that readers may need. Each read uses its snapshot and version metadata to determine visibility. Ordinary snapshot reads avoid conflicting row locks, but writes can still conflict. At PostgreSQL READ COMMITTED, each statement takes a fresh snapshot; REPEATABLE READ uses one transaction snapshot.</p>",
    },
    'serializable': {
      title: 'Serializability',
      body: "<p>Concurrent execution is serializable if it has the same effect as some execution of those transactions one at a time. The equivalent serial order need not be arrival order. Serializable isolation prevents results, such as write skew, that no serial order could produce.</p>",
    },
    'deadlock': {
      title: 'Deadlock',
      body: "<p>A cycle of lock waits. For example, tx1 holds A and waits for B while tx2 holds B and waits for A. Neither can proceed until the cycle is broken. Engines can detect the cycle and abort one transaction. Consistent lock-acquisition order helps prevent deadlocks; applications should be prepared to retry aborted transactions.</p>",
    },
    'vacuum': {
      title: 'VACUUM',
      body: "<p>PostgreSQL maintenance that reclaims storage from row versions no active snapshot still needs, among other tasks. Autovacuum schedules this work automatically. A long-lived snapshot can delay reclamation of versions it might read, increasing storage use. This differs from microdb’s immediate reuse of deleted slots.</p>",
    },
    'snapshot': {
      title: 'Snapshot',
      body: "<p>Information defining which committed changes a read can see, including transaction boundaries and active transaction IDs. Visibility checks combine that information with row-version metadata and transaction status. A statement snapshot can differ from the next statement’s snapshot; under REPEATABLE READ, statements share a transaction snapshot.</p>",
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
    msg.textContent = 'A = $100. Choose which transaction runs each next step.';
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
    `A REPEATABLE READ transaction keeps this snapshot for later statements, while still seeing its own changes.</div>`;
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
      consequence: 'T2 used a change that T1 later rolled back' },
    { key: 'nonrep', name: 'Non-repeatable read',
      story: 'T2 reads x=100 · T1 updates x=70 and commits · T2 re-reads x and sees 70',
      consequence: 'one transaction, two answers for the same row' },
    { key: 'phantom', name: 'Phantom',
      story: 'T2 runs WHERE gpa > 35, gets 3 rows · T1 inserts a qualifying row, commits · T2 re-runs, gets 4',
      consequence: 'the same predicate returned a different set of rows' },
  ];
  const LEVELS = [
    { name: 'READ UNCOMMITTED', blocks: [],
      who: 'the weakest standard isolation level',
      price: 'Allows dirty reads in the standard. Some engines provide stronger behavior; PostgreSQL treats this level as READ COMMITTED.' },
    { name: 'READ COMMITTED', blocks: ['dirty'],
      who: 'Postgres’s default',
      price: 'Each statement sees committed data. In PostgreSQL it uses a fresh snapshot, so two statements in one transaction may see different committed values.' },
    { name: 'REPEATABLE READ', blocks: ['dirty', 'nonrep'],
      who: 'MySQL’s default; in Postgres this level = a full snapshot',
      price: 'Implementations can retain read locks or a transaction snapshot. The standard permits phantoms at this level; PostgreSQL snapshot reads prevent them but can still allow write skew.' },
    { name: 'SERIALIZABLE', blocks: ['dirty', 'nonrep', 'phantom'],
      who: 'equivalent to a serial execution',
      price: 'Implementations use techniques such as predicate/range locking or conflict detection. Applications must be prepared to retry transactions aborted to preserve serializability.' },
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
        `<div class="iso-card-head">${a.name} · ${blocked ? 'PREVENTED ✓' : (gray ? 'permitted by standard' : 'can happen ✗')}</div>` +
        `<div class="iso-card-story">${a.story}</div>` +
        `<div class="iso-card-why">${blocked ? 'this level must prevent this anomaly' : a.consequence}</div>` +
        `</div>`;
    }).join('');
    price.textContent = lv.price;
    ladder.querySelectorAll('.iso-rung').forEach(b =>
      b.addEventListener('click', () => { current = +b.dataset.i; render(); }));
  }
  render();
})();
