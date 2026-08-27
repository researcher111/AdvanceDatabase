/* Lecture 3: Record Layout & the Catalog · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../../labs/_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'heap-file': {
      title: 'Heap file',
      body: '<p>The default storage shape for a table: a file of blocks holding records in no ' +
        'particular order; rows land wherever a free slot exists. Fast to insert into, fair to ' +
        'scan, and completely unordered (sorting is the query layer’s problem). Nearly every ' +
        'engine’s base tables are heap files; ordered access is what indexes add later.</p>',
    },
    'internal-fragmentation': {
      title: 'Internal fragmentation',
      body: '<p>Wasted space <em>inside</em> an allocation: ada’s 3-char name in an 8-char ' +
        'reservation leaves 5 bytes of air that nothing else can use. The price of fixed-size ' +
        'slots, paid deliberately, in exchange for one-multiply addressing and updates that ' +
        'never move data. Its sibling, external fragmentation, is waste <em>between</em> allocations.</p>',
    },
    'tombstone': {
      title: 'Tombstone',
      body: '<p>A deleted record that still physically occupies its slot; only its in-use flag ' +
        'changed. The bytes remain until some future insert reuses the slot. Tombstones make ' +
        'deletion O(1), make “deleted” data forensically recoverable, and are why databases need ' +
        'vacuum/compaction processes to reclaim space for real.</p>',
    },
    'toast': {
      title: 'TOAST',
      body: '<p>Postgres’s scheme for oversized values (“The Oversized-Attribute Storage ' +
        'Technique”): a big text or JSON value is compressed, chopped into chunks, and stored in ' +
        'a side table; the main row keeps only a small pointer. Rows stay small and slot-friendly ' +
        'while values can reach a gigabyte: fixed where possible, indirection where necessary.</p>',
    },
    'bootstrap': {
      title: 'Bootstrapping',
      body: '<p>Breaking a self-referential startup cycle by hardcoding just enough to get going; ' +
        'here, the catalog tables’ own layouts are computed in code rather than read from the ' +
        'catalog (which would require reading the catalog). Compilers, operating systems, and ' +
        'databases all have a bootstrap moment; the trick is keeping it tiny.</p>',
    },
    'rid': {
      title: 'RID (record id)',
      body: '<p>A row’s physical address: (block number, slot number). Stable because slotted ' +
        'storage never moves records, which is exactly what makes RIDs safe to store in other ' +
        'structures. An index is a map from field values to RIDs; you’ll build one in week 6.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Record page inspector ---------------- */
(function () {
  const root = document.getElementById('viz-recpage');
  if (!root) return;
  const SLOT_SIZE = 24, N_SLOTS = 5;
  const STUDENTS = [
    { id: 1, name: 'ada', gpa: 39 }, { id: 2, name: 'ben', gpa: 31 },
    { id: 3, name: 'cyd', gpa: 37 }, { id: 4, name: 'dee', gpa: 28 },
    { id: 5, name: 'eli', gpa: 36 }, { id: 6, name: 'fay', gpa: 34 },
  ];
  const $ = id => document.getElementById(id);
  const msg = $('rp-msg'), slotsEl = $('rp-slots');

  // slot state: { used: bool, row: {id,name,gpa} | null }  (ghost = !used && row)
  let slots, nextStudent, sel;

  function reset() {
    slots = Array.from({ length: N_SLOTS }, () => ({ used: false, row: null }));
    nextStudent = 0; sel = 0;
    msg.textContent = 'A fresh block is all zeros: five EMPTY slots. Insert the first student.';
    render();
  }

  function seg(cls, label, value, title) {
    return `<span class="rp-seg ${cls}" title="${title}"><span class="seg-label">${label}</span>${value}</span>`;
  }

  function render(flashIdx) {
    slotsEl.innerHTML = slots.map((s, k) => {
      const base = k * SLOT_SIZE;
      const cls = ['rp-slot'];
      if (s.used) cls.push('used');
      else if (s.row) cls.push('ghost');
      if (k === sel) cls.push('selected');
      if (flashIdx === k) cls.push('flash');
      const r = s.row;
      return `<div class="${cls.join(' ')}" data-k="${k}">` +
        `<span class="rp-idx">slot ${k}<br>@${base}</span>` +
        seg('seg-flag', `flag @${base}`, s.used ? '1 USED' : '0 EMPTY', `bytes ${base}–${base + 3}`) +
        seg('seg-id', `id @${base + 4}`, r ? r.id : '·', `bytes ${base + 4}–${base + 7} = ${k}×24+4`) +
        seg('seg-name', `name @${base + 8}`, r ? r.name : '·', `bytes ${base + 8}–${base + 19} = ${k}×24+8 (4-byte len + 8 cap)`) +
        seg('seg-gpa', `gpa @${base + 20}`, r ? r.gpa : '·', `bytes ${base + 20}–${base + 23} = ${k}×24+20`) +
        `</div>`;
    }).join('');
    slotsEl.querySelectorAll('.rp-slot').forEach(el =>
      el.addEventListener('click', () => { sel = +el.dataset.k; render(); }));
  }

  function insertNext() {
    const k = slots.findIndex(s => !s.used);
    if (k < 0) { msg.innerHTML = 'insert_after(-1) → <strong>-1</strong>: every slot USED. In the lab, TableScan would append a fresh block now.'; return; }
    const reused = slots[k].row !== null;
    const stu = STUDENTS[nextStudent % STUDENTS.length];
    nextStudent += 1;
    slots[k] = { used: true, row: { ...stu } };
    msg.innerHTML = `insert_after(-1) → slot <strong>${k}</strong>${reused ? ' (reusing a tombstone; the ghost is overwritten)' : ''}: ` +
      `flag@${k * 24} := 1, then fields written at ${k}×24+4, +8, +20.`;
    render(k);
  }

  function del() {
    const s = slots[sel];
    if (!s.used) { msg.innerHTML = `delete(slot ${sel}) → it's already EMPTY.`; return; }
    s.used = false;
    msg.innerHTML = `delete(slot ${sel}) → one bit flip: flag@${sel * 24} := 0. ` +
      `<strong>${s.row.name}'s bytes are still there</strong>: a tombstone, italic below, waiting for reuse.`;
    render(sel);
  }

  function rename(name) {
    const s = slots[sel];
    if (!s.used) { msg.innerHTML = `rename(slot ${sel}) → slot is EMPTY; nothing to rename.`; return; }
    if (name.length > 8) {
      msg.innerHTML = `set_string(${sel}, "name", "${name}") → <strong>refused</strong>: ${name.length} chars ` +
        `in an 8-char reservation. Fixed capacity is the deal; varchar(8) meant it.`;
      render(sel);
      return;
    }
    const old = s.row.name;
    s.row.name = name;
    msg.innerHTML = `set_string(${sel}, "name", "${name}") → overwrites in place at byte ${sel * 24 + 8}. ` +
      `"${old}" → "${name}" (${name.length}/8 chars) and <strong>no other byte in the block moved</strong>.`;
    render(sel);
  }

  $('rp-insert').addEventListener('click', insertNext);
  $('rp-delete').addEventListener('click', del);
  $('rp-ren8').addEventListener('click', () => rename('benjamin'));
  $('rp-ren11').addEventListener('click', () => rename('bartholomew'));
  $('rp-reset').addEventListener('click', reset);

  reset();
})();

/* ---------------- The rent calculator ---------------- */
(function () {
  const cap = document.getElementById('sc-cap');
  if (!cap) return;
  const fill = document.getElementById('sc-fill');
  const out = document.getElementById('sc-readout');
  const BLOCK = 4096;

  function render() {
    fill.max = cap.value;
    if (+fill.value > +cap.value) fill.value = cap.value;
    const capacity = +cap.value, typical = +fill.value;
    document.getElementById('sc-cap-val').textContent = capacity;
    document.getElementById('sc-fill-val').textContent = typical;
    // flag(4) + id(4) + [len(4) + capacity] + gpa(4)
    const slot = 4 + 4 + 4 + capacity + 4;
    const rows = Math.floor(BLOCK / slot);
    const airPerSlot = capacity - typical;
    const usedPerSlot = slot - airPerSlot;
    const airTotal = airPerSlot * rows;
    const leftover = BLOCK - slot * rows;
    const pct = (100 * airTotal / BLOCK);
    out.innerHTML =
      `<div class="sc-line">slot_size = 4 + 4 + (4 + ${capacity}) + 4 = ` +
      `<strong>${slot}</strong> bytes &nbsp;→&nbsp; <strong>${rows}</strong> rows per block</div>` +
      `<div class="sc-block">` +
      `<span class="sc-seg data" style="width:${(100 * usedPerSlot * rows / BLOCK).toFixed(1)}%" title="real data + flags: ${usedPerSlot * rows} bytes"></span>` +
      `<span class="sc-seg air" style="width:${(100 * airTotal / BLOCK).toFixed(1)}%" title="internal fragmentation: ${airTotal} bytes"></span>` +
      `<span class="sc-seg left" style="width:${(100 * leftover / BLOCK).toFixed(1)}%" title="leftover past the last slot: ${leftover} bytes"></span>` +
      `</div>` +
      `<div class="sc-legend">` +
      `<span><span class="sc-chip data"></span>data + flags</span>` +
      `<span><span class="sc-chip air"></span>air (unfilled varchar): ${airTotal.toLocaleString()} bytes, <strong>${pct.toFixed(0)}%</strong> of the block</span>` +
      `<span><span class="sc-chip left"></span>leftover: ${leftover}</span>` +
      `</div>`;
  }
  cap.addEventListener('input', render);
  fill.addEventListener('input', render);
  render();
})();
