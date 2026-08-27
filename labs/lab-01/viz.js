/* Lab 1: Disk & File Manager · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'block': {
      title: 'Block',
      body: '<p>The fixed-size unit a disk (and this lab) moves data in. microdb uses ' +
        '4096 bytes. A file is treated as an array of blocks: block 0 is bytes 0–4095, block 1 ' +
        'is 4096–8191, and so on. Databases never read or write less than a whole block, because ' +
        'the trip to storage costs the same either way.</p>',
    },
    'page-mem': {
      title: 'Page',
      body: '<p>A block’s worth of <em>memory</em>: same size, same bytes, different home. ' +
        'The pair of words keeps the bookkeeping straight: blocks live on disk, pages live in RAM, ' +
        'and the file manager’s whole job is copying one into the other. Your <code>Page</code> class ' +
        'adds typed reads and writes (ints, strings) on top of the raw bytes.</p>',
    },
    'fsync': {
      title: 'fsync',
      body: '<p>The system call that turns “I wrote the file” into “the bytes are physically on ' +
        'durable storage.” A normal <code>write()</code> just hands bytes to the OS’s in-memory cache ' +
        'and returns in microseconds; <code>fsync</code> blocks until the device confirms, 10–1000× ' +
        'slower. Databases ration fsyncs the way you’d ration anything that expensive.</p>',
    },
    'os-cache': {
      title: 'OS page cache',
      body: '<p>The operating system keeps its own cache of recently used file data in otherwise-free ' +
        'RAM. Writes land there first (fast, but lost in a power cut until flushed); re-reads of recent ' +
        'blocks are served from it without touching the disk. It silently helps, and silently lies to, ' +
        'anyone who benchmarks file I/O, which is why <code>measure_io.py</code> tests both modes.</p>',
    },
    'durability': {
      title: 'Durability',
      body: '<p>Quick reminder of ACID: <strong>A</strong>tomicity (a transaction happens entirely ' +
        'or not at all), <strong>C</strong>onsistency (every transaction moves the database from one ' +
        'valid state to another), <strong>I</strong>solation (concurrent transactions behave as if they ' +
        'ran one at a time), and <strong>D</strong>urability.</p>' +
        '<p>The D: once the system says “saved,” the data survives anything short of ' +
        'hardware destruction: crash, power cut, kernel panic. In this lab durability is just ' +
        '“survives close and reopen”; by Lab 7 it becomes the real promise a <code>COMMIT</code> makes, ' +
        'priced at one fsync per transaction.</p>',
    },
    'hexdump': {
      title: 'hexdump',
      body: '<p>A tool (and a habit) for looking at a file as raw bytes, shown in hexadecimal. ' +
        '<code>hexdump -C students.tbl</code> prints offset, hex bytes, and printable characters per ' +
        'row, exactly like this lab’s page widget. When your test fails mysteriously, hexdump the ' +
        'file: the bytes never lie.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Page hex inspector ---------------- */
(function () {
  const root = document.getElementById('viz-page');
  if (!root) return;
  const SIZE = 64;
  const data = new Uint8Array(SIZE);
  // role[i]: null | 'int' | 'len'. Drives the tint of each byte cell
  let role = new Array(SIZE).fill(null);

  const hexEl = document.getElementById('pg-hex');
  const msgEl = document.getElementById('pg-msg');
  const $ = id => document.getElementById(id);

  function render(freshRange, readRange) {
    let html = '';
    for (let r = 0; r < SIZE / 16; r++) {
      html += `<div class="pg-hexrow"><span class="pg-off">${(r * 16).toString().padStart(2, '0')}</span>`;
      for (let c = 0; c < 16; c++) {
        const i = r * 16 + c;
        const cls = ['pg-byte'];
        if (role[i] === 'int') cls.push('b-int');
        if (role[i] === 'len') cls.push('b-len');
        if (freshRange && i >= freshRange[0] && i < freshRange[1]) cls.push('fresh');
        if (readRange && i >= readRange[0] && i < readRange[1]) cls.push('readhl');
        html += `<span class="${cls.join(' ')}" title="offset ${i}">` +
                data[i].toString(16).padStart(2, '0') + '</span>';
      }
      html += '</div>';
    }
    hexEl.innerHTML = html;
  }

  function setInt(off, val) {
    if (off < 0 || off + 4 > SIZE) { msgEl.textContent = `set_int(${off}, …): needs bytes ${off}–${off + 3}, page is 0–${SIZE - 1}.`; return; }
    const dv = new DataView(data.buffer);
    dv.setInt32(off, val, true); // little-endian
    for (let i = off; i < off + 4; i++) role[i] = 'int';
    const bytes = [...data.slice(off, off + 4)].map(b => b.toString(16).padStart(2, '0')).join(' ');
    msgEl.innerHTML = `<code>set_int(${off}, ${val})</code> wrote <code>${bytes}</code>: ` +
      `4 bytes, least-significant first (little-endian).`;
    render([off, off + 4]);
  }

  function setString(off, s) {
    const enc = new TextEncoder().encode(s);
    if (off < 0 || off + 4 + enc.length > SIZE) { msgEl.textContent = `set_string(${off}, "${s}"): needs ${4 + enc.length} bytes, not enough room.`; return; }
    const dv = new DataView(data.buffer);
    dv.setInt32(off, enc.length, true);
    data.set(enc, off + 4);
    for (let i = off; i < off + 4; i++) role[i] = 'len';
    for (let i = off + 4; i < off + 4 + enc.length; i++) role[i] = 'int';
    msgEl.innerHTML = `<code>set_string(${off}, "${s}")</code> wrote the length ` +
      `<code>${enc.length}</code> as a 4-byte int (green), then ${enc.length} UTF-8 byte${enc.length === 1 ? '' : 's'} (warm)` +
      (enc.length !== s.length ? `. Note that ${s.length} characters became ${enc.length} bytes.` : '.');
    render([off, off + 4 + enc.length]);
  }

  function getInt(off) {
    if (off < 0 || off + 4 > SIZE) { msgEl.textContent = 'get_int: out of range.'; return; }
    const dv = new DataView(data.buffer);
    const v = dv.getInt32(off, true);
    msgEl.innerHTML = `<code>get_int(${off})</code> read 4 bytes little-endian → <code>${v}</code>.`;
    render(null, [off, off + 4]);
  }

  function getString(off) {
    if (off < 0 || off + 4 > SIZE) { msgEl.textContent = 'get_string: out of range.'; return; }
    const dv = new DataView(data.buffer);
    const len = dv.getInt32(off, true);
    if (len < 0 || off + 4 + len > SIZE) {
      msgEl.innerHTML = `<code>get_string(${off})</code>: the 4 bytes there decode to length ` +
        `<code>${len}</code>, which runs off the page. Is there really a string at ${off}?`;
      render(null, [off, off + 4]);
      return;
    }
    const s = new TextDecoder().decode(data.slice(off + 4, off + 4 + len));
    msgEl.innerHTML = `<code>get_string(${off})</code> read length <code>${len}</code>, then ` +
      `${len} byte${len === 1 ? '' : 's'} of UTF-8 → <code>"${s}"</code>.`;
    render(null, [off, off + 4 + len]);
  }

  $('pg-ada1').addEventListener('click', () => setInt(0, 1));
  $('pg-ada2').addEventListener('click', () => setString(4, 'ada'));
  $('pg-ada3').addEventListener('click', () => setInt(11, 39));
  $('pg-reset').addEventListener('click', () => {
    data.fill(0); role.fill(null);
    msgEl.textContent = 'Page zeroed. Press the three presets in order to store the ada row.';
    render();
  });
  $('pg-set-int').addEventListener('click', () =>
    setInt(parseInt($('pg-int-off').value, 10), parseInt($('pg-int-val').value, 10) || 0));
  $('pg-set-str').addEventListener('click', () =>
    setString(parseInt($('pg-str-off').value, 10), $('pg-str-val').value));
  $('pg-get-int').addEventListener('click', () => getInt(parseInt($('pg-get-off').value, 10)));
  $('pg-get-str').addEventListener('click', () => getString(parseInt($('pg-get-off').value, 10)));

  render();
})();

/* ---------------- fsync measurement chart ---------------- */
(function () {
  const holder = document.getElementById('fs-rows');
  if (!holder) return;
  // Measured on the instructor's machine (see lab page prose): representative, not a target.
  const ROWS = [
    { name: 'buffered (sync=False)', v: 465849, cls: 'buffered' },
    { name: 'durable (sync=True)',   v: 30788,  cls: 'durable'  },
  ];
  const max = Math.max(...ROWS.map(r => r.v));
  holder.innerHTML = ROWS.map(r =>
    `<div class="fs-row"><span>${r.name}</span>` +
    `<span class="fs-track"><span class="fs-bar ${r.cls}" style="width:${(100 * r.v / max).toFixed(1)}%"></span></span>` +
    `<span class="fs-val">${r.v.toLocaleString()} blk/s</span></div>`).join('') +
    `<div class="fs-row"><span></span><span style="font-family:var(--sans);font-size:12px;color:var(--ink-mute)">` +
    `ratio: 15.1× on this machine; yours may be far larger</span><span></span></div>`;
})();

/* ---------------- Widget: struct.pack_into ---------------- */
(function () {
  const grid = document.getElementById('pk-grid');
  if (!grid) return;
  const $ = id => document.getElementById(id);
  const fmtEl = $('pk-fmt'), offEl = $('pk-off'), valEl = $('pk-val'),
        callEl = $('pk-call'), noteEl = $('pk-note');
  const N = 16, WIDTH = 4;
  let buf = new Uint8Array(N);
  let writtenAt = new Array(N).fill(null);   // which offset's write owns each byte
  let hot = [], read = [];

  const hex = b => b.toString(16).toUpperCase().padStart(2, '0');
  const clampOff = () => Math.max(0, Math.min(N - WIDTH, parseInt(offEl.value, 10) || 0));
  const clampVal = () => {
    let v = parseInt(valEl.value, 10);
    if (!Number.isFinite(v)) v = 0;
    return Math.max(-2147483648, Math.min(2147483647, v));
  };

  function bytesFor(val, little) {
    const dv = new DataView(new ArrayBuffer(WIDTH));
    dv.setInt32(0, val, little);
    return [0, 1, 2, 3].map(i => dv.getUint8(i));
  }
  function render() {
    grid.innerHTML = Array.from(buf).map((b, i) => {
      const cls = read.includes(i) ? ' pk-read' : (hot.includes(i) ? ' pk-hot' : '');
      return '<span class="pk-cell' + cls + '"><span class="pk-idx">' + i + '</span>' +
             '<span class="pk-byte">' + hex(b) + '</span></span>';
    }).join('');
  }
  function pack() {
    const little = fmtEl.value === '<i', off = clampOff(), val = clampVal();
    offEl.value = off; valEl.value = val;
    // Which earlier writes are we about to damage?
    const clobbered = new Set();
    for (let i = off; i < off + WIDTH; i++)
      if (writtenAt[i] !== null && writtenAt[i] !== off) clobbered.add(writtenAt[i]);

    bytesFor(val, little).forEach((b, k) => { buf[off + k] = b; writtenAt[off + k] = off; });
    hot = [off, off + 1, off + 2, off + 3]; read = [];
    callEl.textContent = "struct.pack_into('" + fmtEl.value + "', buf, " + off + ", " + val + ")";
    let msg = 'Wrote ' + WIDTH + ' bytes at ' + off + '..' + (off + WIDTH - 1) +
              '. Every other byte is exactly as it was.';
    if (clobbered.size) {
      msg += ' <strong class="pk-warn">It also overwrote part of the value you packed at offset ' +
             [...clobbered].sort((a, b) => a - b).join(' and ') +
             ', which is now unreadable. Nothing raised an error.</strong>';
    }
    noteEl.innerHTML = msg;
    render();
  }
  function unpack() {
    const little = fmtEl.value === '<i', off = clampOff();
    offEl.value = off;
    const dv = new DataView(new ArrayBuffer(WIDTH));
    for (let k = 0; k < WIDTH; k++) dv.setUint8(k, buf[off + k]);
    const got = dv.getInt32(0, little);
    read = [off, off + 1, off + 2, off + 3]; hot = [];
    callEl.textContent = "struct.unpack_from('" + fmtEl.value + "', buf, " + off + ")[0]";
    noteEl.innerHTML = 'Read those 4 bytes back as <code>' + got + '</code>. ' +
      'The <code>[0]</code> is not decoration: <code>unpack_from</code> always returns a tuple, ' +
      'because a format string can describe several values.';
    render();
  }
  function reset() {
    buf = new Uint8Array(N); writtenAt = new Array(N).fill(null); hot = []; read = [];
    callEl.textContent = 'buf = bytearray(16)';
    noteEl.innerHTML = 'A fresh page: 16 zero bytes. Nothing means anything yet.';
    render();
  }
  $('pk-pack').addEventListener('click', pack);
  $('pk-unpack').addEventListener('click', unpack);
  $('pk-reset').addEventListener('click', reset);
  reset();
})();

/* ---------------- Widget: file on disk vs page in memory ---------------- */
(function () {
  const svg = document.getElementById('fp-svg');
  if (!svg) return;
  const $ = id => document.getElementById(id);
  const callEl = $('fp-call'), noteEl = $('fp-note'), pillEl = $('fp-step-pill');

  const BS = 4096;          // block_size, the real one
  const MAXBLK = 5;         // widget cap; a real table file has millions
  const FRESH = 'a fresh block: 4096 zero bytes';

  /* The pinned toy table: rows 1-3 in block 0, rows 4-6 in block 1. */
  const INITIAL = () => [
    { rows: '1 ada 39 · 2 ben 31 · 3 cyd 37', zero: false },
    { rows: '4 dee 28 · 5 eli 36 · 6 fay 34', zero: false },
  ];

  let disk, sel, page, trips, glow;
  /* page = { blk, rows, dirty }; blk is a caption for the diagram only. The real
     Page class has no such field; it is a bytearray and nothing else, which is the
     whole reason read() must be handed a BlockId every single time. */

  /* ---- geometry (viewBox 960 x 430) ---- */
  const BX = 32, BW = 272, BH = 52, BY0 = 88, BGAP = 10;
  const blockY = k => BY0 + k * (BH + BGAP);
  const blockCY = k => blockY(k) + BH / 2;
  const PAGE = { x: 656, y: 96, w: 272, h: 112 };
  const FM = { x: 356, y: 176, w: 248, h: 104 };

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const t = (x, y, s, cls, anchor) =>
    `<text x="${x}" y="${y}" class="${cls}"${anchor ? ` text-anchor="${anchor}"` : ''}>${esc(s)}</text>`;

  function panel(x, y, w, h, title, sub1, sub2) {
    return `<rect class="fp-panel" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>` +
      t(x + 16, y + 26, title, 'fp-panel-title') +
      t(x + 16, y + 44, sub1, 'fp-panel-key') +
      t(x + 16, y + 62, sub2, 'fp-panel-sub');
  }

  function render() {
    let s = '<defs>' +
      '<marker id="fp-head-idle" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">' +
      '<path d="M0,0 L7,3.2 L0,6.4 Z" class="fp-head-idle"/></marker>' +
      '<marker id="fp-head-live" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">' +
      '<path d="M0,0 L7,3.2 L0,6.4 Z" class="fp-head-live"/></marker>' +
      '</defs>';

    /* ---- disk ---- */
    s += panel(16, 16, 304, 398, 'DISK · db_dir/students.tbl',
               'survives a power cut · ~25 µs away',
               `one byte array · ${disk.length * BS} bytes · ${disk.length} blocks`);
    disk.forEach((b, k) => {
      const y = blockY(k);
      const cls = 'fp-block' + (k === sel ? ' sel' : '') +
                  (glow.block === k ? (glow.kind === 'read' ? ' g-read' : ' g-write') : '');
      s += `<g class="fp-blockg" data-blk="${k}">` +
        `<rect class="${cls}" x="${BX}" y="${y}" width="${BW}" height="${BH}" rx="4"/>` +
        t(BX + 12, y + 20, `block ${k}`, 'fp-blk-label') +
        t(BX + BW - 12, y + 20, `bytes ${k * BS}–${(k + 1) * BS - 1}`, 'fp-blk-range', 'end') +
        t(BX + 12, y + 40, b.zero ? FRESH : b.rows, b.zero ? 'fp-blk-zero' : 'fp-blk-rows') +
        '</g>';
    });

    /* the file ends here; append() is the only way past this line */
    if (disk.length < MAXBLK) {
      const ey = blockY(disk.length) + 6;
      s += `<line class="fp-eof" x1="${BX}" y1="${ey}" x2="${BX + BW}" y2="${ey}"/>` +
        t(BX, ey + 18, `end of file · fm.append() adds block ${disk.length}`, 'fp-eof-label');
    }

    /* ---- file manager ---- */
    s += `<rect class="fp-fm" x="${FM.x}" y="${FM.y}" width="${FM.w}" height="${FM.h}" rx="8"/>` +
      t(FM.x + FM.w / 2, FM.y + 26, 'FileManager · the ferry', 'fp-fm-title', 'middle') +
      t(FM.x + FM.w / 2, FM.y + 52, `seek(${sel} × ${BS}) → byte ${sel * BS}`, 'fp-fm-code', 'middle') +
      t(FM.x + FM.w / 2, FM.y + 72, `move ${BS} bytes, no more, no less`, 'fp-fm-code', 'middle') +
      t(FM.x + FM.w / 2, FM.y + 90, 'the only class that calls the OS', 'fp-fm-sub', 'middle');

    /* ---- memory ---- */
    s += panel(640, 16, 304, 398, 'MEMORY · your Python process',
               'gone when the process exits · ~100 ns away',
               'one page = one block-sized bytearray');
    const pcls = 'fp-page' + (glow.page ? (glow.kind === 'read' ? ' g-read' : ' g-write') : '');
    s += `<rect class="${pcls}" x="${PAGE.x}" y="${PAGE.y}" width="${PAGE.w}" height="${PAGE.h}" rx="6"/>` +
      t(PAGE.x + 12, PAGE.y + 24, 'page', 'fp-blk-label') +
      t(PAGE.x + PAGE.w - 12, PAGE.y + 24, `Page(${BS})`, 'fp-blk-range', 'end') +
      t(PAGE.x + 12, PAGE.y + 50, page.rows === null ? FRESH : page.rows,
        page.rows === null ? 'fp-blk-zero' : 'fp-blk-rows') +
      t(PAGE.x + 12, PAGE.y + 72,
        page.blk === null ? 'never read: these bytes came from nowhere'
                          : `showing a copy of block ${page.blk}`,
        'fp-page-sub') +
      t(PAGE.x + 12, PAGE.y + 94,
        page.dirty ? 'EDITED: the disk still has the old bytes'
                   : 'in step with the disk',
        page.dirty ? 'fp-page-dirty' : 'fp-page-clean');

    /* ---- BlockId card ---- */
    s += `<rect class="fp-card" x="${PAGE.x}" y="228" width="${PAGE.w}" height="84" rx="6"/>` +
      t(PAGE.x + 12, 252, 'BlockId · the name of a block', 'fp-card-title') +
      t(PAGE.x + 12, 278, `BlockId('students.tbl', ${sel})`, 'fp-card-code') +
      t(PAGE.x + 12, 298, 'a filename and a number. no bytes in here.', 'fp-page-sub');

    /* ---- trip counter ---- */
    s += `<rect class="fp-card" x="${PAGE.x}" y="330" width="${PAGE.w}" height="76" rx="6"/>` +
      t(PAGE.x + 12, 354, 'trips to storage', 'fp-card-title') +
      t(PAGE.x + 12, 378, `${trips.r} read · ${trips.w} write`, 'fp-card-code') +
      t(PAGE.x + 12, 396, `${((trips.r + trips.w) * BS).toLocaleString()} bytes moved`, 'fp-card-code');

    /* arrows last, so a head landing on a panel edge is not painted over */
    s += arrows();

    svg.innerHTML = s;
    svg.querySelectorAll('.fp-blockg').forEach(g =>
      g.addEventListener('click', () => { sel = +g.dataset.blk; glow = {}; freePlay(
        `blk = BlockId('students.tbl', ${sel})`,
        `Selected block ${sel}. That click built a <code>BlockId('students.tbl', ${sel})</code> ` +
        `and moved no bytes at all: naming a block is free, fetching it is not.`);
        render(); }));
  }

  /* An arrow lights up only for the half of the ferry that actually moved bytes:
     an in-memory set_string lights neither, an append lights the disk side only. */
  function arrows() {
    const bcy = blockCY(sel);
    const touchedDisk = !!glow.kind && glow.block !== null;
    const touchedPage = touchedDisk && glow.page;
    const toDisk = glow.kind === 'write';
    const disk = toDisk
      ? `M ${FM.x} 228 C 340 228, 340 ${bcy}, ${BX + BW + 6} ${bcy}`
      : `M ${BX + BW + 6} ${bcy} C 340 ${bcy}, 340 228, ${FM.x} 228`;
    const mem = toDisk
      ? `M ${PAGE.x} 146 C 632 146, 632 228, ${FM.x + FM.w} 228`
      : `M ${FM.x + FM.w} 228 C 632 228, 632 146, ${PAGE.x} 146`;
    const draw = (d, live) =>
      `<path class="fp-arrow${live ? ' live' : ''}" d="${d}" ` +
      `marker-end="url(#fp-head-${live ? 'live' : 'idle'})"/>`;
    return draw(disk, touchedDisk) + draw(mem, touchedPage);
  }

  /* ---- operations: each mutates state and returns {call, note} ---- */
  function doRead() {
    const lost = page.dirty;
    page = { blk: sel, rows: disk[sel].zero ? null : disk[sel].rows, dirty: false };
    trips.r++;
    glow = { kind: 'read', block: sel, page: true };
    let note = `Seek to byte ${sel * BS}, copy ${BS} bytes disk → memory. The disk did not ` +
      `change; the page now holds <em>a copy</em> of block ${sel}.`;
    if (lost) note += ' <strong class="fp-warn">The copy landed on top of your unwritten edit, ' +
      'which is now gone for good. No error, no warning: a Page is a bytearray, not a guardian.</strong>';
    return { call: `fm.read(BlockId('students.tbl', ${sel}), page)`, note };
  }

  function doWrite() {
    const wasFresh = page.rows === null;
    disk[sel] = { rows: wasFresh ? '' : page.rows, zero: wasFresh };
    page = { blk: sel, rows: page.rows, dirty: false };
    trips.w++;
    glow = { kind: 'write', block: sel, page: true };
    let note = `Seek to byte ${sel * BS}, copy ${BS} bytes memory → disk, then <code>fsync</code>. ` +
      `<strong>This is the only call in the whole layer that changes what is on disk.</strong> ` +
      `And it wrote the entire ${BS}-byte page, however little of it you edited.`;
    if (wasFresh) note = `Seek to byte ${sel * BS}, copy ${BS} bytes memory → disk. The page was ` +
      `never read, so <strong class="fp-warn">you just wrote 4096 zeros over block ${sel}, ` +
      `erasing it</strong>. The ferry moves whatever is on board.`;
    return { call: `fm.write(BlockId('students.tbl', ${sel}), page, sync=True)`, note };
  }

  function doAppend() {
    if (disk.length >= MAXBLK) {
      return { call: `blk = fm.append('students.tbl')`,
        note: `This widget stops at ${MAXBLK} blocks so the picture still fits. A real ` +
          `<code>students.tbl</code> reaches millions; the arithmetic does not care.` };
    }
    disk.push({ rows: '', zero: true });
    sel = disk.length - 1;
    trips.w++;
    glow = { kind: 'write', block: sel, page: false };
    return { call: `blk = fm.append('students.tbl')   # → BlockId('students.tbl', ${sel})`,
      note: `The file grew by ${BS} zero bytes, from ${disk.length - 1} to ${disk.length} blocks, ` +
        `and <code>append</code> handed back the <em>name</em> of the block it just made. ` +
        `Nothing crossed to the memory side; the new block exists on disk and nowhere else. ` +
        `Lab 3 depends on those bytes really being zeros.` };
  }

  function doEdit(forced) {
    const raw = (forced || $('fp-name').value || 'zoe').trim().slice(0, 5) || 'zoe';
    const name = raw.replace(/[^\w-]/g, '') || 'zoe';
    if (page.rows === null) {
      page.rows = `1 ${name} 39 · (rest still zeros)`;
    } else {
      page.rows = page.rows.replace(/^(\d+) \w+/, `$1 ${name}`);
    }
    page.dirty = true;
    glow = { kind: 'write', block: null, page: true };
    return { call: `page.set_string(4, "${name}")`,
      note: `The bytes at offset 4 <em>of the page</em> changed. Look left: the disk is exactly ` +
        `as it was. Every <code>set_int</code> and <code>set_string</code> you write on Thursday ` +
        `is memory-only; <code>Page</code> never opens a file. The page and its block have ` +
        `<strong>diverged</strong>, and only <code>fm.write</code> can end that.` };
  }

  function baseState() {
    disk = INITIAL(); sel = 0;
    page = { blk: null, rows: null, dirty: false };
    trips = { r: 0, w: 0 }; glow = {};
  }

  /* ---- the guided story: six calls, replayed deterministically ----
     Back/Next rebuild the state from scratch each time, so free-play detours
     never corrupt the story: pressing Next simply returns to the script. */
  const SETUP_NOTE = 'Two blocks on disk hold the six pinned rows from lecture; the page in ' +
    'memory is still all zeros. Press <strong>Next step</strong> to run the first call.';
  const STORY = [
    { run: () => { sel = 0; return doRead(); },
      note: `<code>fm.read</code> ferries block 0 across: seek to byte 0, move 4096 bytes, ` +
        `disk → memory. The disk did not change; the page now holds <em>a copy</em> of ada's block.` },
    { run: () => doEdit('zoe'),
      note: `<code>set_string</code> edits <em>the copy</em>. Look left: the disk still says ada. ` +
        `Memory and disk have diverged, and nothing is watching.` },
    { run: () => { sel = 1; return doRead(); },
      note: `The same page object is reused for block 1, and the zoe edit was never written, so ` +
        `it is <strong class="fp-warn">gone for good</strong>. No error, no warning: a Page is a ` +
        `bytearray, not a guardian.` },
    { run: () => { sel = 0; return doRead(); },
      note: `Read block 0 back: still ada. The disk never heard about the edit, because disk ` +
        `bytes change on exactly one call, and it has not run yet.` },
    { run: () => doEdit('zoe'),
      note: `Edit the copy again: zoe, take two. Same divergence as step 2, but this time we ` +
        `finish the job before letting go of the page.` },
    { run: () => { sel = 0; return doWrite(); },
      note: `<code>fm.write</code> ferries the page back: memory → disk, all 4096 bytes, then ` +
        `<code>fsync</code>. Block 0 finally says zoe. <strong>Six calls, one byte of lasting ` +
        `change, and exactly one call touched the disk.</strong>` },
  ];
  let pos = 0; // 0 = setup, k = after story step k

  function showStory() {
    baseState();
    let last = null;
    for (let i = 0; i < pos; i++) last = STORY[i].run();
    if (pos === 0) {
      pillEl.textContent = 'the setup';
      callEl.textContent = "fm = FileManager('db_dir', block_size=4096)   # page = Page(4096)";
      noteEl.innerHTML = SETUP_NOTE;
    } else {
      pillEl.textContent = `step ${pos} of ${STORY.length}`;
      callEl.textContent = last.call;
      noteEl.innerHTML = STORY[pos - 1].note +
        (pos === STORY.length ? ' <em>Restart, or drive the ferry yourself below.</em>' : '');
    }
    render();
  }

  /* free-play actions run on whatever state is showing and leave the story */
  function freePlay(call, note) {
    pillEl.textContent = 'free play · Next returns to the story';
    callEl.textContent = call;
    noteEl.innerHTML = note;
  }
  function freeOp(op) {
    const r = op();
    freePlay(r.call, r.note);
    render();
  }

  $('fp-next').addEventListener('click', () => { pos = Math.min(pos + 1, STORY.length); showStory(); });
  $('fp-back').addEventListener('click', () => { pos = Math.max(pos - 1, 0); showStory(); });
  $('fp-restart').addEventListener('click', () => { pos = 0; showStory(); });
  $('fp-read').addEventListener('click', () => freeOp(doRead));
  $('fp-write').addEventListener('click', () => freeOp(doWrite));
  $('fp-append').addEventListener('click', () => freeOp(doAppend));
  $('fp-edit').addEventListener('click', () => freeOp(() => doEdit()));

  baseState();
  showStory();
})();
