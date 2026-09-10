/* Lab 3 — Records, Slots & the Table Scan · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'heap-file': {
      title: 'Heap file',
      body: "<p>A file that stores table records without sorting them by a key. A row can occupy any available slot. A scan visits the blocks in sequence; an index can locate rows by a field value.</p>",
    },
    'tombstone': {
      title: 'Tombstone',
      body: "<p>In this lab, deleting a record changes its slot flag from USED to EMPTY, making the slot available for reuse. The old field bytes remain until overwritten. Other database systems use the term tombstone for different kinds of deletion markers.</p>",
    },
    'rid': {
      title: 'RID (record id)',
      body: "<p>A row’s physical address in microdb: its block number and slot number. The address stays the same while the row exists. After deletion, another row may reuse the slot, so an index must remove entries for deleted rows.</p>",
    },
    'internal-fragmentation': {
      title: 'Internal fragmentation',
      body: "<p>Unused space within an allocated region. A 40-byte value in a field with a 200-byte capacity leaves 160 reserved bytes unused. Fixed-size slots simplify addressing but can waste space when values are much shorter than the field capacity.</p>",
    },
    'latch': {
      title: 'Latch',
      body: "<p>A short-lived lock that protects an in-memory structure while a thread accesses or modifies it. It differs from a transaction lock, which protects logical database operations across a transaction. This lab runs on one thread and does not implement latches.</p>",
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
    msg.textContent = 'Press next() to find the first row. Watch the pin move from block 0 to block 1.';
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
    if (done) { msg.innerHTML = 'The scan has ended. Call before_first() to restart it.'; return; }
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
          (crossings ? ` — crossed ${crossings} block boundar${crossings > 1 ? 'ies' : 'y'}, unpinning each block before pinning and searching the next.` : '.');
        render();
        return;
      }
      if (b === blocks.length - 1) {
        done = true;
        msg.innerHTML = `next() → <strong>False</strong>. No occupied slots remain in the last block (${b}). ` +
          `The scan returned ${rowsSeen} rows.`;
        render();
        return;
      }
      b += 1; s = -1; crossings += 1; pinsCount += 1;
    }
  }

  function beforeFirst() {
    done = false; rowsSeen = 0;
    moveTo(0);
    msg.innerHTML = 'before_first() → block 0, slot -1. The cursor is before the first row.';
    render();
  }

  function delCurrent() {
    if (done || cur.s < 0) { msg.innerHTML = 'Call next() to move to a row before deleting it.'; return; }
    const sl = blocks[cur.b][cur.s];
    if (!sl.used) { msg.innerHTML = 'The current slot is already marked EMPTY.'; return; }
    sl.used = false; sl.ghost = true;
    msg.innerHTML = `delete() → slot at RID (${cur.b}, ${cur.s}) is now EMPTY († marks the old field bytes). ` +
      `next() skips it; insert() may reuse it.`;
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
        msg.innerHTML = `insert() → id ${nextId} is stored at RID (${b}, ${free})` +
          (wasGhost ? ' — <strong>reused a deleted slot</strong>; the file did not grow.' : '.');
        nextId += 1;
        render();
        return;
      }
      if (b === blocks.length - 1) {
        if (blocks.length >= MAX_BLOCKS) { msg.innerHTML = 'This example is limited to 4 blocks. Press Reset to start over.'; return; }
        blocks.push(Array.from({ length: SLOTS }, () => ({ used: false, ghost: false, id: null })));
        b = blocks.length - 1; s = -1; pinsCount += 1;
        msg.innerHTML = `No empty slots remain after the cursor. fm.append() adds <strong>zeroed</strong> block ${b} with five EMPTY slots in this example.`;
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
