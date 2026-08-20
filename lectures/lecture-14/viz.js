/* Lecture 14 — Bigtable, LSM & NoSQL · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'commodity': {
      title: 'Commodity hardware',
      body: '<p>Ordinary cheap servers instead of premium fault-tolerant machines. Google’s ' +
        'founding cost bet: thousands of cheap boxes beat dozens of expensive ones per ' +
        'dollar — IF the software treats machine death as routine. That "if" is why ' +
        'replication, tablet reassignment, and recompute-from-lineage exist: reliability ' +
        'moved from the hardware budget into the software design.</p>',
    },
    'wide-column': {
      title: 'Wide-column / sparse columns',
      body: '<p>A row may have millions of possible columns but store only the handful it ' +
        'actually uses — absent cells cost zero bytes because a row is stored as a sorted ' +
        'list of (column, value) pairs, not a fixed-width slot. The opposite of Lab 3’s ' +
        'fixed layout: there, absent data still paid rent; here, the column NAME itself is ' +
        'data (one column per inbound link, per sensor, per friend).</p>',
    },
    'hotspot': {
      title: 'Hotspot',
      body: '<p>One partition receiving a disproportionate share of traffic. Range ' +
        'partitioning is especially prone: timestamp-prefixed keys send every new write to ' +
        'the final range — one server does all the work while the rest idle. Fixes are key ' +
        'design (hash prefix, reversed domains) — the row key is Bigtable’s only knob, so ' +
        'key design IS capacity planning.</p>',
    },
    'bloom': {
      title: 'Bloom filter',
      body: '<p>A few bits per key that answer membership with one-sided error: "definitely ' +
        'not present" (always trustworthy) or "maybe present" (rarely wrong). Insert = set k ' +
        'hash-chosen bits; query = check them. ~10 bits/key gives ~1% false positives. LSM ' +
        'reads use one per SSTable to skip files without disk I/O — the same hashing-trick ' +
        'spirit as Lab 10’s embedder, spent on skipping instead of similarity.</p>',
    },
    'read-amp': {
      title: 'Read amplification',
      body: '<p>How many places one logical read must check — memtable plus K SSTables means ' +
        'amplification K+1. Its siblings: write amplification (compaction rewrites the same ' +
        'data W times over its life) and space amplification (shadowed versions await ' +
        'merging). LSM tuning is a three-way budget among them; RocksDB’s hundred knobs ' +
        'are all aliases for this triangle.</p>',
    },
    'eventual': {
      title: 'Eventual consistency',
      body: '<p>The AP bargain: replicas may briefly disagree, but with writes stopped they ' +
        'converge to one value. Fine for like-counts and carts (reconcile: union the items); ' +
        'alarming for balances. Cassandra makes the trade per query — read/write quorum ' +
        'levels — so "how consistent" is a dial you set per operation, not a property of ' +
        'the database.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- LSM write-path widget ---------------- */
(function () {
  const stage = document.getElementById('lsm-stage');
  if (!stage) return;

  const MEMTABLE_CAP = 6;
  let rng, memtable, sstables, writeCount, highlight;

  function reset() {
    rng = (window.LabBase && LabBase.makeLcg) ? LabBase.makeLcg(6042)
        : (() => { let s = 6042; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; })();
    memtable = {};          // key -> version tag
    sstables = [];          // oldest first; each {entries: {key: tag}, compacted: bool}
    writeCount = 0;
    highlight = null;       // {key, checks: [ids], foundAt: id|null}
    msg('');
    getMsg('');
    render();
  }
  function msg(t) { document.getElementById('lsm-msg').textContent = t; }
  function getMsg(t) { document.getElementById('lsm-get-msg').innerHTML = t; }

  function writeOne() {
    // Keys drawn from a small space so re-writes (shadowing) happen visibly.
    const key = 'k' + (1 + Math.floor(rng() * 24));
    writeCount++;
    const rewrite = key in memtable ||
      sstables.some(t => key in t.entries);
    memtable[key] = 'v' + writeCount;
    if (Object.keys(memtable).length >= MEMTABLE_CAP) {
      sstables.push({ entries: memtable, compacted: false });
      memtable = {};
      msg(`wrote ${key}=v${writeCount}${rewrite ? ' (re-write)' : ''} — memtable hit ${MEMTABLE_CAP}, flushed SSTable #${sstables.length}`);
    } else {
      msg(`wrote ${key}=v${writeCount}${rewrite ? ' (re-write — old version now shadowed)' : ''}`);
    }
    highlight = null;
    render();
  }

  function compact() {
    if (sstables.length < 2) { msg('nothing to compact (need 2+ SSTables)'); return; }
    const merged = {};
    let dropped = 0;
    for (const t of sstables) {          // oldest → newest, newer wins
      for (const [k, v] of Object.entries(t.entries)) {
        if (k in merged) dropped++;
        merged[k] = v;
      }
    }
    const before = sstables.length;
    sstables = [{ entries: merged, compacted: true }];
    msg(`compacted ${before} SSTables → 1, dropped ${dropped} shadowed version${dropped === 1 ? '' : 's'}`);
    highlight = null;
    render();
  }

  function lookup() {
    const key = document.getElementById('lsm-key').value.trim() || 'k12';
    const checks = ['mem'];
    let foundAt = null, value = null;
    if (key in memtable) { foundAt = 'mem'; value = memtable[key]; }
    if (!foundAt) {
      for (let i = sstables.length - 1; i >= 0; i--) {   // newest first
        checks.push('sst' + i);
        if (key in sstables[i].entries) {
          foundAt = 'sst' + i; value = sstables[i].entries[key];
          break;
        }
      }
    }
    highlight = { key, checks, foundAt };
    getMsg(foundAt
      ? `checked <strong>${checks.length}</strong> structure${checks.length === 1 ? '' : 's'} → found <code>${key} = ${value}</code>`
      : `checked <strong>${checks.length}</strong> structure${checks.length === 1 ? '' : 's'} → <code>${key}</code> not present (a Bloom filter would have skipped the SSTables without reading them)`);
    render();
  }

  function box(id, title, entries, cls) {
    const h = highlight;
    const checked = h && h.checks.includes(id);
    const found = h && h.foundAt === id;
    const keys = Object.keys(entries).sort();
    return `<div class="lsm-box ${cls}${checked ? ' checked' : ''}${found ? ' found' : ''}">` +
      `<div class="lsm-box-title">${title}${checked ? (found ? ' · HIT' : ' · checked') : ''}</div>` +
      `<div class="lsm-entries">` +
      (keys.length ? keys.map(k =>
        `<span class="lsm-kv${h && h.key === k ? ' match' : ''}">${k}=${entries[k]}</span>`).join('')
        : '<span class="lsm-empty">empty</span>') +
      `</div></div>`;
  }

  function render() {
    let html = box('mem', `memtable (RAM, sorted) · ${Object.keys(memtable).length}/${MEMTABLE_CAP}`, memtable, 'mem');
    html += `<div class="lsm-disk-label">— disk (immutable, sorted files) —</div>`;
    if (!sstables.length) html += `<div class="lsm-empty-disk">no SSTables yet — keep writing</div>`;
    for (let i = sstables.length - 1; i >= 0; i--) {
      const t = sstables[i];
      html += box('sst' + i,
        `SSTable #${i + 1}${t.compacted ? ' (compacted)' : ''} · ${Object.keys(t.entries).length} keys`,
        t.entries, 'sst');
    }
    stage.innerHTML = html;
  }

  document.getElementById('lsm-w1').addEventListener('click', writeOne);
  document.getElementById('lsm-w6').addEventListener('click', () => { for (let i = 0; i < 6; i++) writeOne(); });
  document.getElementById('lsm-compact').addEventListener('click', compact);
  document.getElementById('lsm-reset').addEventListener('click', reset);
  document.getElementById('lsm-get').addEventListener('click', lookup);
  document.getElementById('lsm-key').addEventListener('keydown', e => { if (e.key === 'Enter') lookup(); });
  reset();
})();

/* ---------------- Bloom filter demo ---------------- */
(function () {
  const bitsEl = document.getElementById('bloom-bits');
  if (!bitsEl) return;
  const M = 32;
  let bits, setters, inserted;

  const input = document.getElementById('bloom-key');
  const msg = document.getElementById('bloom-msg');

  function hashes(key) {
    // Three cheap, visibly different hash functions over char codes.
    let h1 = 0, h2 = 0, h3 = 0;
    [...key].forEach((ch, i) => {
      const c = ch.charCodeAt(0);
      h1 = (h1 * 31 + c) % M;
      h2 = (h2 * 17 + c * 7) % M;
      h3 = (h3 * 13 + c * (i + 3)) % M;
    });
    return [h1, h2, h3];
  }
  function reset() {
    bits = new Array(M).fill(false);
    setters = Array.from({ length: M }, () => []);
    inserted = new Set();
    msg.textContent = 'The filter starts empty: every query answers "definitely absent" for free.';
    render([]);
  }
  function render(active) {
    bitsEl.innerHTML = bits.map((b, i) =>
      `<span class="bloom-bit${b ? ' set' : ''}${active.includes(i) ? ' active' : ''}"` +
      ` title="bit ${i}${setters[i].length ? ' — set by ' + setters[i].join(', ') : ' — never set'}">${b ? 1 : 0}</span>`
    ).join('');
  }
  function insert() {
    const key = input.value.trim() || 'k12';
    const hs = hashes(key);
    hs.forEach(h => {
      bits[h] = true;
      if (!setters[h].includes(key)) setters[h].push(key);
    });
    inserted.add(key);
    msg.innerHTML = `insert("${key}") set bits <strong>${[...new Set(hs)].join(', ')}</strong> — ` +
      `${inserted.size} key${inserted.size === 1 ? '' : 's'} in the filter`;
    render(hs);
  }
  function query() {
    const key = input.value.trim() || 'k12';
    const hs = hashes(key);
    const allSet = hs.every(h => bits[h]);
    const truly = inserted.has(key);
    if (!allSet) {
      const zero = hs.find(h => !bits[h]);
      msg.innerHTML = `query("${key}") checks bits ${[...new Set(hs)].join(', ')} — bit ${zero} is 0 → ` +
        `<strong>definitely absent</strong>. SSTable skipped, zero disk reads. (Always correct.)`;
    } else if (truly) {
      msg.innerHTML = `query("${key}") — all three bits set → <strong>maybe present</strong>. ` +
        `Read the SSTable… and yes, it's there. The "maybe" paid off.`;
    } else {
      msg.innerHTML = `query("${key}") — all three bits set → <strong>maybe present</strong>… ` +
        `but you never inserted it. <strong>That's the false positive:</strong> one wasted ` +
        `disk read, caused by other keys' bits overlapping. The polite lie, caught.`;
    }
    render(hs);
  }
  document.getElementById('bloom-ins').addEventListener('click', insert);
  document.getElementById('bloom-qry').addEventListener('click', query);
  document.getElementById('bloom-seed').addEventListener('click', () => {
    for (let i = 1; i <= 6; i++) { input.value = 'k' + i; insert(); }
    input.value = '';
    msg.innerHTML += ' — now query keys you did NOT insert (try k7, then k15, then k17…) until you catch a lie.';
  });
  document.getElementById('bloom-reset').addEventListener('click', () => { input.value = ''; reset(); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') query(); });
  reset();
})();

/* ---------------- Tablet / key-design widget ---------------- */
(function () {
  const stage = document.getElementById('tb-stage');
  if (!stage) return;
  const msg = document.getElementById('tb-msg');

  let tablets, writeSeq;
  function reset() {
    tablets = [
      { label: 'a — g', count: 0, last: false },
      { label: 'h — m', count: 0, last: false },
      { label: 'n — s', count: 0, last: false },
      { label: 't — …', count: 0, last: true },
    ];
    writeSeq = 0;
    msg.textContent = 'Four tablets, four servers, empty. Choose a key design.';
    render(null);
  }

  function writeUser() {
    // user-id keys: effectively uniform over the key space
    const landed = [];
    for (let i = 0; i < 12; i++) {
      const t = (writeSeq * 7 + i * 5) % tablets.length;   // deterministic spread
      tablets[t].count++;
      landed.push(t);
      writeSeq++;
    }
    msg.textContent = 'user-id keys hash-like across the alphabet — every tablet took a share.';
    render(new Set(landed));
  }

  function writeTime() {
    // timestamp-prefixed keys: always the largest keys → always the final tablet
    const last = tablets.length - 1;
    tablets[last].count += 12;
    writeSeq += 12;
    msg.textContent = 'timestamp keys are always the largest keys so far — all 12 landed on the final tablet.';
    render(new Set([last]));
  }

  function split() {
    const hot = tablets.reduce((a, b) => (b.count > a.count ? b : a), tablets[0]);
    if (hot.count === 0) { msg.textContent = 'nothing is hot yet — send some writes first.'; return; }
    const i = tablets.indexOf(hot);
    const half = Math.floor(hot.count / 2);
    const [lo, hi] = hot.label.split(' — ');
    tablets.splice(i, 1,
      { label: `${lo} — ·`, count: hot.count - half, last: false },
      { label: `· — ${hi}`, count: half, last: hot.last });
    msg.textContent = `split "${hot.label}" into two tablets and moved one to a fresh server — now watch where the NEXT timestamp burst lands.`;
    render(new Set([i, i + 1]));
  }

  function render(justHit) {
    const max = Math.max(12, ...tablets.map(t => t.count));
    stage.innerHTML = '<div class="tb-row">' + tablets.map((t, i) => {
      const hot = t.count >= 12 && t.count === Math.max(...tablets.map(x => x.count));
      return `<div class="tb-tablet${hot ? ' hot' : ''}${justHit && justHit.has(i) ? ' hit' : ''}">` +
        `<div class="tb-range">${t.label}</div>` +
        `<div class="tb-fill-track"><div class="tb-fill" style="height:${(100 * t.count / max).toFixed(0)}%"></div></div>` +
        `<div class="tb-count">${t.count} write${t.count === 1 ? '' : 's'}${hot ? ' · HOT' : ''}</div>` +
        `</div>`;
    }).join('') + '</div>';
  }

  document.getElementById('tb-user').addEventListener('click', writeUser);
  document.getElementById('tb-time').addEventListener('click', writeTime);
  document.getElementById('tb-split').addEventListener('click', split);
  document.getElementById('tb-reset').addEventListener('click', reset);
  reset();
})();
