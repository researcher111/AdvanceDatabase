/* Lab 1 — Disk & File Manager · widgets.
   Presentation toggle, TOC tracking, glossary + annotated-code engines
   are owned by ../_shared/lab-base.js. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'block': {
      title: 'Block',
      body: '<p>The fixed-size unit a disk (and this lab) moves data in — microdb uses ' +
        '4096 bytes. A file is treated as an array of blocks: block 0 is bytes 0–4095, block 1 ' +
        'is 4096–8191, and so on. Databases never read or write less than a whole block, because ' +
        'the trip to storage costs the same either way.</p>',
    },
    'page-mem': {
      title: 'Page',
      body: '<p>A block’s worth of <em>memory</em> — same size, same bytes, different home. ' +
        'The pair of words keeps the bookkeeping straight: blocks live on disk, pages live in RAM, ' +
        'and the file manager’s whole job is copying one into the other. Your <code>Page</code> class ' +
        'adds typed reads and writes (ints, strings) on top of the raw bytes.</p>',
    },
    'fsync': {
      title: 'fsync',
      body: '<p>The system call that turns “I wrote the file” into “the bytes are physically on ' +
        'durable storage.” A normal <code>write()</code> just hands bytes to the OS’s in-memory cache ' +
        'and returns in microseconds; <code>fsync</code> blocks until the device confirms — 10–1000× ' +
        'slower. Databases ration fsyncs the way you’d ration anything that expensive.</p>',
    },
    'os-cache': {
      title: 'OS page cache',
      body: '<p>The operating system keeps its own cache of recently used file data in otherwise-free ' +
        'RAM. Writes land there first (fast, but lost in a power cut until flushed); re-reads of recent ' +
        'blocks are served from it without touching the disk. It silently helps — and silently lies to — ' +
        'anyone who benchmarks file I/O, which is why <code>measure_io.py</code> tests both modes.</p>',
    },
    'durability': {
      title: 'Durability',
      body: '<p>The D in ACID: once the system says “saved,” the data survives anything short of ' +
        'hardware destruction — crash, power cut, kernel panic. In this lab durability is just ' +
        '“survives close and reopen”; by Lab 7 it becomes the real promise a <code>COMMIT</code> makes, ' +
        'priced at one fsync per transaction.</p>',
    },
    'hexdump': {
      title: 'hexdump',
      body: '<p>A tool (and a habit) for looking at a file as raw bytes, shown in hexadecimal — ' +
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
  // role[i]: null | 'int' | 'len'  — drives the tint of each byte cell
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
    msgEl.innerHTML = `<code>set_int(${off}, ${val})</code> wrote <code>${bytes}</code> — ` +
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
      (enc.length !== s.length ? ` — note: ${s.length} characters became ${enc.length} bytes.` : '.');
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
        `<code>${len}</code>, which runs off the page — is there really a string at ${off}?`;
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
    `ratio: 15.1× on this machine — yours may be far larger</span><span></span></div>`;
})();
