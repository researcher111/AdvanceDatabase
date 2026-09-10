/* Lecture 3: Record Layout & the Catalog · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../../labs/_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'iterator-model': {
      title: 'Iterator model',
      body: "<p>Operators use a common scan interface to request rows from their inputs. In microdb, a caller can rewind, advance, read fields, test field availability, and close a scan. A filter can therefore consume rows from a table scan or another compatible operator. The operator tree must still preserve the query’s meaning. Lecture 4 adds filters, projections, and products to this week’s TableScan.</p>",
    },
    'slot-directory': {
      title: 'Slot directory',
      body: "<p>An array of entries locating records within a page. Each entry records where the row’s bytes begin, so compacting bytes within the page can update that entry rather than changing its slot number. PostgreSQL uses a page item directory, but an UPDATE can create a new tuple version with a different physical address. microdb instead gives each slot a fixed size and calculates its position directly.</p>",
    },
    'heap-file': {
      title: 'Heap file',
      body: "<p>A table storage organization that does not require records to be sorted by a key. Rows can occupy available space, and a scan visits the file’s blocks. microdb uses one heap file per table. Other databases may use different organizations, including clustered indexes.</p>",
    },
    'internal-fragmentation': {
      title: 'Internal fragmentation',
      body: "<p>Unused space inside an allocated region. Ada’s three-byte UTF-8 name in an eight-byte reservation leaves five bytes that another row cannot use. This is the space cost of microdb’s fixed-size layout. External fragmentation instead concerns free space between allocations.</p>",
    },
    'tombstone': {
      title: 'Tombstone',
      body: "<p>A marker indicating that a record is deleted. In microdb, deletion sets the slot’s flag to EMPTY and leaves its old field bytes in place. Scans skip it and later inserts can reuse it. The file does not shrink, and old bytes may remain until overwritten.</p>",
    },
    'toast': {
      title: 'TOAST',
      body: "<p>PostgreSQL’s Oversized-Attribute Storage Technique. It can compress large values and store them in a separate table in chunks, leaving a small reference in the main tuple. Some compressed values remain inline. PostgreSQL uses variable-length tuples; this is an alternative to reserving a large maximum capacity in every microdb slot.</p>",
    },
    'bootstrap': {
      title: 'Bootstrapping',
      body: "<p>Providing enough initial information to start a system that normally reads that information from its own storage. microdb defines the catalog tables’ schemas in code so it can open the catalog and then look up schemas for other tables.</p>",
    },
    'rid': {
      title: 'RID (record id)',
      body: "<p>A physical record location: <code>(block number, slot number)</code>. In microdb a live row keeps this address during an in-place update. After deletion, the same slot can hold a different row. Indexes must therefore be maintained when indexed records change or disappear.</p>",
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

/* ---------------- Packed-page demo (the Lab 1 layout) ---------------- */
(function () {
  const root = document.getElementById('viz-packed');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const strip = $('pk-strip'), msg = $('pk-msg'), info = $('pk-info');
  const INFO_DEFAULT = info.textContent;
  const ROWS = [
    { id: 1, name: 'ada', gpa: 39 },
    { id: 2, name: 'ben', gpa: 31 },
    { id: 3, name: 'cyd', gpa: 37 },
    { id: 4, name: 'dee', gpa: 28 },
  ];
  const SAVED = 30;
  let renamed = false;

  const hex = n => n.toString(16).toUpperCase().padStart(2, '0');
  const leBytes = v => [0, 1, 2, 3].map(i => (v >> (8 * i)) & 0xFF);
  const leSpelled = v => leBytes(v).map(hex).join(' ');

  // One byte = {hexv, chr, row, key, tip}. key identifies the byte's meaning
  // (row, field, position, value) so a re-pack can tell which bytes changed.
  function pack(withRename) {
    const out = [];
    ROWS.forEach((r, ri) => {
      const name = (withRename && r.id === 2) ? 'benjamin' : r.name;
      const int4 = (val, field, firstTip) => {
        leBytes(val).forEach((b, i) => {
          out.push({
            hexv: hex(b), chr: null, row: ri,
            key: ri + ':' + field + ':' + i + ':' + b,
            tip: 'byte ' + out.length + ': ' + field + ' of ' + r.name + ', byte ' + (i + 1) +
              ' of 4' + (i === 0 ? '. ' + firstTip : ' (higher bytes of ' + val + '; all zero here)'),
          });
        });
      };
      int4(r.id, 'id', 'int ' + r.id + ', least significant byte first: ' + leSpelled(r.id));
      int4(name.length, 'name length', name.length + ' name bytes follow');
      Array.from(name).forEach((ch, i) => {
        out.push({
          hexv: hex(ch.charCodeAt(0)), chr: ch, row: ri,
          key: ri + ':chr:' + i + ':' + ch,
          tip: "byte " + out.length + ": '" + ch + "' of \"" + name + '", ASCII 0x' + hex(ch.charCodeAt(0)),
        });
      });
      int4(r.gpa, 'gpa', '0x' + hex(r.gpa) + ' = ' + (r.gpa >> 4) + '×16 + ' + (r.gpa & 15) + ' = ' + r.gpa);
    });
    return out;
  }

  function render(readTo) {
    const base = pack(false);
    const bytes = pack(renamed);
    const groups = ROWS.map(() => []);
    bytes.forEach((b, i) => groups[b.row].push(
      '<span class="pk-byte' + (b.chr ? ' pk-char' : '') +
      (renamed && (i >= base.length || b.key !== base[i].key) ? ' warm' : '') +
      (i === SAVED ? ' pk-saved' : '') +
      (readTo !== undefined && i >= SAVED && i <= readTo ? ' pk-read' : '') +
      '" data-tip="' + b.tip.replace(/"/g, '&quot;') + '">' + (b.chr || b.hexv) + '</span>'));
    let start = 0;
    strip.innerHTML = groups.map((cells, ri) => {
      const name = (renamed && ri === 1) ? 'ben → benjamin' : ROWS[ri].name;
      const label = 'row ' + ri + ' · ' + name + ' · bytes ' + start + '–' + (start + cells.length - 1);
      start += cells.length;
      return '<div class="pk-row"><div class="pk-bytes">' + cells.join('') +
        '</div><div class="pk-rowlabel">' + label + '</div></div>';
    }).join('');
  }

  function doRename() {
    if (renamed) { msg.innerHTML = 'The row has already been renamed. Reset to restore the original name.'; return; }
    renamed = true;
    render();
    msg.innerHTML = 'ben is now <strong>benjamin</strong>: the length byte changed in place, 5 new ' +
      'name bytes appeared, and the 34 bytes after them (his gpa, cyd, and dee) shifted 5 places ' +
      'right. The saved address is unchanged. Read it to see whether it still locates cyd.';
  }

  function readSaved() {
    const bytes = pack(renamed);
    const le = i => bytes.slice(i, i + 4).reduce((v, b, k) => v + (parseInt(b.hexv, 16) << (8 * k)), 0);
    const spell = i => bytes.slice(i, i + 4).map(b => b.hexv).join(' ');
    const id = le(SAVED), len = le(SAVED + 4);
    if (!renamed) {
      render(SAVED + 14);
      msg.innerHTML = 'Read a row at byte 30: id = ' + spell(SAVED) + ' → <strong>' + id +
        '</strong>, length ' + len + ', name "cyd", gpa 0x25 → 37. Correct, exactly as saved.';
    } else {
      render(SAVED + 7);
      msg.innerHTML = 'Read a row at byte 30: id = ' + spell(SAVED) + ' → <strong>' + id +
        '</strong> (that "id" is the last n of benjamin plus ben’s gpa), then a name length of ' +
        len + ' that runs far past the end of the page. The address never moved; the data under it ' +
        'did. cyd now starts at byte 35 and nothing in the page says so.';
    }
  }

  function reset() {
    renamed = false;
    render();
    msg.textContent = 'Four rows, 60 bytes, no gaps. Read the saved address first to prove it works, then rename ben.';
    info.textContent = INFO_DEFAULT;
  }

  strip.addEventListener('mouseover', e => {
    const t = e.target.closest('.pk-byte');
    if (t) info.textContent = t.dataset.tip;
  });
  strip.addEventListener('mouseleave', () => { info.textContent = INFO_DEFAULT; });
  strip.addEventListener('click', e => {
    const t = e.target.closest('.pk-byte');
    if (t) info.textContent = t.dataset.tip;
  });

  $('pk-rename').addEventListener('click', doRename);
  $('pk-read').addEventListener('click', readSaved);
  $('pk-reset').addEventListener('click', reset);
  render();
})();

/* ---------------- TOAST: huge values move out ---------------- */
(function () {
  const root = document.getElementById('viz-toast');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const pipe = $('to-pipeline'), heap = $('to-heap'), side = $('to-side'), msg = $('to-msg');
  const FIXED = 24;        /* flag 4 + id 4 + name 12 + gpa 4 */
  const THRESHOLD = 2000;  /* "normally 2 kB" */
  const RATIO = 3;         /* representative compression for English prose */
  const CHUNK = 1996;      /* "about 2000 bytes", four chunk rows per page */
  const PER_PAGE = 4;
  const PTR = 18;
  const CHUNK_ID = 16391;
  const SCENARIOS = [
    { btn: 'to-s0', size: 150 },
    { btn: 'to-s1', size: 3000 },
    { btn: 'to-s2', size: 12000 },
    { btn: 'to-s3', size: 2000000 },
  ];
  const fmt = n => n.toLocaleString('en-US');
  let cur;

  function decide(size) {
    const raw = FIXED + size;
    if (raw <= THRESHOLD) return { mode: 'inline', size, raw, slot: raw };
    const comp = Math.ceil(size / RATIO);
    if (FIXED + comp <= THRESHOLD) return { mode: 'compressed', size, raw, comp, slot: FIXED + comp };
    const chunks = Math.ceil(comp / CHUNK);
    return { mode: 'out', size, raw, comp, chunks, pages: Math.ceil(chunks / PER_PAGE), slot: FIXED + PTR };
  }

  function step(name, detail, state) {
    return '<span class="to-step ' + state + '"><span class="to-step-name">' + name +
      '</span><span class="to-step-detail">' + detail + '</span></span>';
  }

  function render() {
    const d = cur;
    pipe.innerHTML =
      step('store inline', 'row would be ' + fmt(d.raw) + ' B vs the ~2,000 B threshold',
        d.mode === 'inline' ? 'pass' : 'fail') +
      '<span class="to-arrow">→</span>' +
      step('compress (~3×)', d.mode === 'inline' ? 'not needed' : fmt(d.size) + ' B → ' + fmt(d.comp) + ' B',
        d.mode === 'inline' ? 'skip' : (d.mode === 'compressed' ? 'pass' : 'fail')) +
      '<span class="to-arrow">→</span>' +
      step('move out of line', d.mode === 'out' ? d.chunks + ' chunks of ' + fmt(CHUNK) + ' B' : 'not needed',
        d.mode === 'out' ? 'pass' : 'skip');

    const essaySeg =
      d.mode === 'inline' ? '<span class="to-seg to-seg-essay">essay · ' + fmt(d.size) + ' B</span>' :
      d.mode === 'compressed' ? '<span class="to-seg to-seg-essay">essay (compressed) · ' + fmt(d.comp) + ' B</span>' :
      '<span class="to-seg to-seg-ptr">→ pointer · ' + PTR + ' B</span>';
    const verdict =
      d.mode === 'inline' ? 'fits beside its neighbors' :
      d.mode === 'compressed' ? 'back under the threshold' :
      'the main row stores a reference instead of the external essay bytes';
    heap.innerHTML = '<div class="to-panel-title">heap page · ada’s slot</div>' +
      '<div class="to-slot"><span class="to-seg">flag 4</span><span class="to-seg">id 4</span>' +
      '<span class="to-seg">name 12</span><span class="to-seg">gpa 4</span>' + essaySeg + '</div>' +
      '<div class="to-slotmeta">slot total: <strong>' + fmt(d.slot) + ' B</strong> · ' + verdict + '</div>';

    if (d.mode !== 'out') {
      side.innerHTML = '<div class="to-panel-title">pg_toast_16388 · the side table</div>' +
        '<div class="to-empty">(empty · nothing moved out)</div>';
    } else {
      const row = (seq, bytes) => '<div class="to-chunk">chunk_id ' + CHUNK_ID +
        ' · chunk_seq ' + seq + ' · ' + fmt(bytes) + ' B</div>';
      const last = d.comp - CHUNK * (d.chunks - 1);
      let rows = '';
      if (d.chunks <= 4) {
        for (let i = 0; i < d.chunks; i++) rows += row(i, i === d.chunks - 1 ? last : CHUNK);
      } else {
        rows += row(0, CHUNK) + row(1, CHUNK) + row(2, CHUNK) +
          '<div class="to-chunk to-ellipsis">⋯</div>' + row(d.chunks - 1, last);
      }
      side.innerHTML = '<div class="to-panel-title">pg_toast_16388 · the side table</div>' + rows +
        '<div class="to-slotmeta">' + d.chunks + ' chunks · ' + d.pages +
        ' page' + (d.pages > 1 ? 's' : '') + ' · unique index on (chunk_id, chunk_seq)</div>';
    }
  }

  function select(i) {
    cur = decide(SCENARIOS[i].size);
    heap.classList.remove('read'); side.classList.remove('read');
    render();
    const d = cur;
    if (d.mode === 'inline') {
      msg.innerHTML = 'Row is ' + fmt(d.raw) + ' B: under the ~2,000 B threshold, so the essay stores inline like any other field.';
    } else if (d.mode === 'compressed') {
      msg.innerHTML = 'Row would be ' + fmt(d.raw) + ' B: over the threshold. Compression (~3×) brings the essay to ' +
        fmt(d.comp) + ' B and the row to ' + fmt(d.slot) + ' B, back under; it stays inline, compressed.';
    } else {
      msg.innerHTML = 'Row would be ' + fmt(d.raw) + ' B; even compressed to ' + fmt(d.comp) +
        ' B it is too wide. The essay moves out: <strong>' + d.chunks +
        ' chunks</strong> in the side table, and the slot keeps ' + FIXED +
        ' B of fields plus an ' + PTR + '-byte pointer.';
    }
  }

  function queryName() {
    heap.classList.add('read'); side.classList.remove('read');
    msg.innerHTML = 'SELECT name reads <strong>1 block</strong>: the heap block holding the slot. ' +
      'essay is not in the select list, so its bytes are never fetched' +
      (cur.mode === 'out' ? '; the pointer is not even followed.' : '.');
  }

  function queryEssay() {
    heap.classList.add('read');
    if (cur.mode === 'out') {
      side.classList.add('read');
      msg.innerHTML = 'SELECT essay reads 1 heap block + ' + cur.pages + ' side-table page' +
        (cur.pages > 1 ? 's' : '') + ' = <strong>' + (1 + cur.pages) +
        ' blocks</strong> (plus the index reads that locate the chunks). The chunks are fetched, reassembled, ' +
        'and decompressed only now, because only now did a query ask for them.';
    } else {
      side.classList.remove('read');
      msg.innerHTML = 'SELECT essay reads <strong>1 block</strong>: the essay is right there in the slot' +
        (cur.mode === 'compressed' ? ', decompressed in memory on the way out.' : '.');
    }
  }

  SCENARIOS.forEach((s, i) => $(s.btn).addEventListener('click', () => select(i)));
  $('to-qname').addEventListener('click', queryName);
  $('to-qessay').addEventListener('click', queryEssay);
  select(0);
})();
