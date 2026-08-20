/* Lab 3 — Records, Slots & the Table Scan · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'heap-file': {
      title: 'Heap file',
      body: '<p>The default storage shape for a table: a file of blocks holding records in no ' +
        'particular order — rows land wherever a free slot exists. Fast to insert into, fair to ' +
        'scan, completely unordered. Nearly every engine’s base tables are heap files; ordered ' +
        'access is what indexes add in week 6.</p>',
    },
    'tombstone': {
      title: 'Tombstone',
      body: '<p>A deleted record that still physically occupies its slot — only the in-use flag ' +
        'changed. The bytes remain until a future insert reuses the slot. Deletion becomes O(1), ' +
        '“deleted” data stays forensically recoverable, and space comes back lazily rather than ' +
        'by compaction.</p>',
    },
    'rid': {
      title: 'RID (record id)',
      body: '<p>A row’s physical address: (block number, slot number). Stable because slotted ' +
        'storage never moves records — updates overwrite in place and deletes flip a flag. ' +
        'Stability is the whole point: an index (week 6) is a map from field values to RIDs, ' +
        'and a map to moving targets would be worthless.</p>',
    },
    'internal-fragmentation': {
      title: 'Internal fragmentation',
      body: '<p>Wasted space <em>inside</em> an allocation: a 40-char bio in a 200-char ' +
        'reservation leaves 160 bytes of air no one else can use. The deliberate rent paid for ' +
        'fixed-size slots and O(1) addressing — and the thing your measurement quantifies ' +
        'schema by schema.</p>',
    },
    'latch': {
      title: 'Latch',
      body: '<p>A short-lived low-level lock protecting an in-memory structure (a page, a frame) ' +
        'for the microseconds a thread needs to read or modify it — distinct from the ' +
        'transaction-level locks of week 7, which can be held for seconds. Single-threaded ' +
        'microdb needs neither; multi-threaded engines need both, at different timescales.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- TableScan stepper ---------------- */
(function () {
  const root = document.getElementById('viz-scan');
  if (!root) return;
  const SLOTS = 5, MAX_BLOCKS = 4;
  const $ = id => document.getElementById(id);
  const msg = $('sc-msg'), blocksEl = $('sc-blocks'), statsEl = $('sc-stats');

  // slots: {used, ghost, id} — ghost marks a tombstone with old bytes
  let blocks, cur, pinned, rowsSeen, pinsCount, nextId, done;

  function reset() {
    blocks = Array.from({ length: 3 }, (_, b) =>
      Array.from({ length: SLOTS }, (_, s) => {
        const i = b * SLOTS + s;
        return i < 12 ? { used: true, ghost: false, id: i } : { used: false, ghost: false, id: null };
      }));
    cur = { b: 0, s: -1 };
    pinned = 0; rowsSeen = 0; pinsCount = 1; nextId = 12; done = false;
    msg.textContent = 'Press next() to find the first row. Watch the pin indicator as you cross block 0 → 1.';
    render();
  }

  function render() {
    blocksEl.innerHTML = blocks.map((slots, b) => {
      const isPinned = b === pinned;
      let html = `<div class="sc-block${isPinned ? ' pinned' : ''}">` +
        `<div class="sc-block-label"><span>block ${b}</span>` +
        `${isPinned ? '<span class="sc-pin-tag">● pinned</span>' : ''}</div>`;
      slots.forEach((sl, s) => {
        const cls = ['sc-slot'];
        if (sl.used) cls.push('used');
        else if (sl.ghost) cls.push('ghost');
        const here = !done && cur.b === b && cur.s === s;
        if (here) cls.push('cursor');
        html += `<div class="${cls.join(' ')}">` +
          `<span class="sc-cursor-mark">${here ? '▶' : ''}</span>` +
          `<span>slot ${s}: ${sl.used ? 'id ' + sl.id : (sl.ghost ? 'id ' + sl.id + ' †' : 'EMPTY')}</span></div>`;
      });
      return html + '</div>';
    }).join('');
    statsEl.textContent = `rows returned: ${rowsSeen}    pin/unpin pairs: ${pinsCount}    file: ${blocks.length} blocks`;
  }

  function moveTo(b) {
    pinned = b; cur = { b, s: -1 }; pinsCount += 1;
  }

  function next() {
    if (done) { msg.innerHTML = 'The scan already returned <strong>False</strong> — before_first() to rewind.'; return; }
    let b = cur.b, s = cur.s;
    let crossings = 0;
    while (true) {
      const found = blocks[b].findIndex((sl, i) => i > s && sl.used);
      if (found >= 0) {
        if (b !== cur.b) crossings = crossings; // moved already
        cur = { b, s: found };
        pinned = b;
        rowsSeen += 1;
        msg.innerHTML = `next() → row <strong>id ${blocks[b][found].id}</strong> at RID (${b}, ${found})` +
          (crossings ? ` — crossed ${crossings} block boundar${crossings > 1 ? 'ies' : 'y'}: unpin, pin, ask again.` : '.');
        render();
        return;
      }
      if (b === blocks.length - 1) {
        done = true;
        msg.innerHTML = `next() → <strong>False</strong>. Block ${b} exhausted and it's the last — the scan is over. ` +
          `${rowsSeen} rows total.`;
        render();
        return;
      }
      b += 1; s = -1; crossings += 1; pinsCount += 1;
    }
  }

  function beforeFirst() {
    done = false; rowsSeen = 0;
    moveTo(0);
    msg.innerHTML = 'before_first() → back to block 0, slot -1. The cursor is before the first row.';
    render();
  }

  function delCurrent() {
    if (done || cur.s < 0) { msg.innerHTML = 'delete() needs the cursor on a row — call next() first.'; return; }
    const sl = blocks[cur.b][cur.s];
    if (!sl.used) { msg.innerHTML = 'Current slot is already a tombstone.'; return; }
    sl.used = false; sl.ghost = true;
    msg.innerHTML = `delete() → RID (${cur.b}, ${cur.s}) is now a tombstone († = old bytes still there). ` +
      `Future next() calls skip it; a future insert() may recycle it.`;
    render();
  }

  function insert() {
    // TableScan.insert(): search from current position forward, then grow.
    let b = done ? blocks.length - 1 : cur.b;
    let s = done ? SLOTS - 1 : cur.s;
    while (true) {
      const free = blocks[b].findIndex((sl, i) => i > s && !sl.used);
      if (free >= 0) {
        const wasGhost = blocks[b][free].ghost;
        blocks[b][free] = { used: true, ghost: false, id: nextId };
        cur = { b, s: free }; pinned = b; done = false;
        msg.innerHTML = `insert() → id ${nextId} lands at RID (${b}, ${free})` +
          (wasGhost ? ' — <strong>a recycled tombstone</strong>; the file did not grow.' : '.');
        nextId += 1;
        render();
        return;
      }
      if (b === blocks.length - 1) {
        if (blocks.length >= MAX_BLOCKS) { msg.innerHTML = 'Widget cap reached (4 blocks) — Reset to start over.'; return; }
        blocks.push(Array.from({ length: SLOTS }, () => ({ used: false, ghost: false, id: null })));
        b = blocks.length - 1; s = -1; pinsCount += 1;
        msg.innerHTML = `Every slot full → fm.append(): a fresh <strong>zeroed</strong> block ${b} (five EMPTY slots by construction)…`;
        // fall through: next loop iteration inserts into slot 0
      } else {
        b += 1; s = -1; pinsCount += 1;
      }
    }
  }

  $('sc-next').addEventListener('click', next);
  $('sc-first').addEventListener('click', beforeFirst);
  $('sc-del').addEventListener('click', delCurrent);
  $('sc-insert').addEventListener('click', insert);
  $('sc-reset').addEventListener('click', reset);

  reset();
})();
