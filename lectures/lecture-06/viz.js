/* Lecture 6 — B+ Trees · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'occupancy': {
      title: 'Occupancy',
      body: '<p>How full a node is: the number of keys it holds divided by the maximum it could hold. Splitting at the middle leaves two nodes at about 50%, and inserts then fill them back up, so on average nodes run around two thirds full. Occupancy matters because it decides how many nodes the same keys need, and therefore how tall the tree is and how many blocks a lookup reads. A skewed split that leaves one node nearly empty drives occupancy down: the tree is still correct, but it is bigger and taller than it has to be.</p>',
    },
    'routing-key': {
      title: 'Routing key',
      body: '<p>A key stored in an internal node purely to steer a search. An internal node with keys [k1, k2, ..., kn] has n+1 children, and the rule is: everything less than k1 is in the first child, everything from k1 up to (but not including) k2 is in the second, and so on. A routing key carries no RID and points at no row; it is a signpost, not data. That is why an internal split can move its middle key up and out of the node, while a leaf split must leave a copy behind: the leaf key is the real entry, the routing key is only a guide to it.</p>',
    },
    'invariant': {
      title: 'Invariant',
      body: '<p>A property that must be true of the structure after every operation, no matter what order the operations came in. For the B+ tree the key invariants are: every leaf is the same distance from the root, keys inside a node are sorted, every node except the root is at least half full, and every (key, RID) entry lives in a leaf. An operation is correct if the invariants held before it and still hold after it; that is what Thursday&#39;s harness checks after each batch of inserts. The split is designed so that it never breaks any of them, which is why the tree needs no separate rebalancing step.</p>',
    },
    'rid-recall': {
      title: 'RID (record id) — recall',
      body: '<p>A row’s stable physical address from Lab 3: (block number, slot number). ' +
        'Stability was the whole point: because slotted storage never moves records, a ' +
        'structure built today that says “gpa 39 lives at (0, 0)” is still right next month. ' +
        'The B+ tree is exactly such a structure — its leaves are full of RIDs.</p>',
    },
    'fanout': {
      title: 'Fan-out',
      body: '<p>How many children an internal node has — the branching factor. A binary tree ' +
        'has fan-out 2; a B+ tree node sized to a 4–8 KB disk block holds ~200 keys, so ' +
        'fan-out ≈ 200. Height shrinks with the logarithm’s base: log₂(10⁸) ≈ 27 levels, ' +
        'log₂₀₀(10⁸) ≈ 4. Fan-out is why databases feel instant.</p>',
    },
    'selectivity': {
      title: 'Selectivity',
      body: '<p>The fraction of rows a predicate keeps: <code>uid = 77777</code> keeps 1 in a ' +
        'million (highly selective); <code>gpa &gt; 0</code> keeps everything (not selective ' +
        'at all). Indexes shine on selective predicates and actively hurt on unselective ones ' +
        '— week 9’s optimizer estimates selectivity to decide which tool to use.</p>',
    },
    'covering-index': {
      title: 'Covering index',
      body: '<p>An index that contains every column a query needs, so the engine answers from ' +
        'the index alone and never visits the heap rows — no RID jumps at all. Postgres calls ' +
        'the trick an index-only scan; DBAs design for it deliberately on hot queries.</p>',
    },
    'write-amplification': {
      title: 'Write amplification',
      body: '<p>When one logical write becomes several physical ones: insert a row into a ' +
        'table with five indexes and six structures must be updated. Indexes trade write ' +
        'amplification for read speed — a trade the LSM trees of week 14 make in the opposite ' +
        'direction.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Live B+ tree ---------------- */
(function () {
  const root0 = document.getElementById('viz-btree');
  if (!root0) return;
  const ORDER = 4;
  const $ = id => document.getElementById(id);
  const msg = $('bt-msg'), canvas = $('bt-canvas'), stats = $('bt-stats');

  let root, height, splits, count;

  function newNode(leaf) { return { leaf, keys: [], children: [], next: null, id: Math.random() }; }

  function reset() {
    root = newNode(true); height = 1; splits = 0; count = 0;
    msg.textContent = 'Insert keys and watch for the first split — it changes the tree’s whole shape.';
    render();
  }

  function childIndex(node, key) {
    let i = 0;
    while (i < node.keys.length && key >= node.keys[i]) i++;
    return i;
  }

  function descend(key) {
    const path = [root];
    while (!path[path.length - 1].leaf) {
      const n = path[path.length - 1];
      path.push(n.children[childIndex(n, key)]);
    }
    return path;
  }

  function insert(key) {
    const path = descend(key);
    const leaf = path[path.length - 1];
    if (leaf.keys.includes(key)) {
      msg.innerHTML = `${key} already present — the lab shares the slot (duplicate RIDs); the demo just shrugs.`;
      return;
    }
    let i = 0;
    while (i < leaf.keys.length && leaf.keys[i] < key) i++;
    leaf.keys.splice(i, 0, key);
    count += 1;
    let didSplit = false;
    for (let d = path.length - 1; d >= 0; d--) {
      const node = path[d];
      if (node.keys.length <= ORDER) continue;
      didSplit = true; splits += 1;
      const mid = Math.floor(node.keys.length / 2);
      const sib = newNode(node.leaf);
      let hoisted;
      if (node.leaf) {
        hoisted = node.keys[mid];
        sib.keys = node.keys.slice(mid);
        node.keys = node.keys.slice(0, mid);
        sib.next = node.next; node.next = sib;
      } else {
        hoisted = node.keys[mid];
        sib.keys = node.keys.slice(mid + 1);
        sib.children = node.children.slice(mid + 1);
        node.keys = node.keys.slice(0, mid);
        node.children = node.children.slice(0, mid + 1);
      }
      const parent = d > 0 ? path[d - 1] : null;
      if (parent === null) {
        const nr = newNode(false);
        nr.keys = [hoisted];
        nr.children = [node, sib];
        root = nr; height += 1;
        msg.innerHTML = `Insert ${key}: node full → <strong>split</strong>, and no parent existed — ` +
          `a new root [${hoisted}] appears. <strong>Height is now ${height}</strong>; every leaf sank one level together.`;
      } else {
        const j = childIndex(parent, hoisted);
        parent.keys.splice(j, 0, hoisted);
        parent.children.splice(j + 1, 0, sib);
        msg.innerHTML = `Insert ${key}: leaf full → <strong>split</strong> at the middle, ` +
          `${hoisted} ${node.leaf ? 'copied' : 'moved'} up into the parent.`;
      }
    }
    if (!didSplit) msg.innerHTML = `Insert ${key}: room in the leaf — sorted in, nothing else moves.`;
    render(didSplit ? key : null);
  }

  function search(key) {
    const path = descend(key);
    const leaf = path[path.length - 1];
    const found = leaf.keys.includes(key);
    render(null, path, found ? key : null);
    msg.innerHTML = `search(${key}): touched <strong>${path.length} node${path.length > 1 ? 's' : ''}</strong> ` +
      `(the height) — ${found ? `found it` : `absent; a scan would have touched all ${count}`}.`;
  }

  function levels() {
    const out = [];
    let level = [root];
    while (level.length) {
      out.push(level);
      level = level.flatMap(n => n.children);
    }
    return out;
  }

  function render(flashKey, visitedPath, foundKey) {
    const visited = new Set((visitedPath || []).map(n => n.id));
    canvas.innerHTML = levels().map(level =>
      `<div class="bt-level">` + level.map(n => {
        const cls = ['bt-node'];
        if (n.leaf) cls.push('leaf');
        if (visited.has(n.id)) cls.push('visited');
        if (flashKey !== null && flashKey !== undefined && n.keys.includes(flashKey)) cls.push('split-flash');
        return `<div class="${cls.join(' ')}">` + n.keys.map(k =>
          `<span class="bt-key${k === foundKey ? ' found' : ''}">${k}</span>`).join('') + '</div>';
      }).join('') + `</div>`
    ).join('') + (height > 1 ? `<div class="bt-chain">leaves are chained left → right (the range-scan road)</div>` : '');
    stats.textContent = `keys: ${count}    height: ${height}    splits so far: ${splits}`;
  }

  function runScript(keys, doneMsg) {
    reset();
    let i = 0;
    const t = setInterval(() => {
      if (i >= keys.length) { clearInterval(t); if (doneMsg) msg.innerHTML = doneMsg; return; }
      insert(keys[i++]);
    }, 800);
  }

  $('bt-script').addEventListener('click', () =>
    runScript([39, 31, 37, 28, 36, 34],
      'The six pinned gpas: one split, height 2, root [36] — the tree from the lecture’s traced search.'));
  $('bt-many').addEventListener('click', () =>
    runScript(Array.from({ length: 20 }, (_, k) => k + 1),
      'Sequential inserts: splits march rightward, the root grows twice. Note every leaf is STILL the same depth.'));
  $('bt-one').addEventListener('click', () => insert(Number($('bt-key').value)));
  $('bt-search').addEventListener('click', () => search(Number($('bt-skey').value)));
  $('bt-reset').addEventListener('click', reset);
  reset();
})();

/* ---------------- Fan-out slider ---------------- */
(function () {
  const slider = document.getElementById('fo-slider');
  if (!slider) return;
  const stage = document.getElementById('fo-stage');
  const val = document.getElementById('fo-val');
  let n = 100000000;

  function fanout() {
    // slider 1..100 maps log-scale to 2..400
    return Math.max(2, Math.round(Math.pow(10, 0.30103 + (slider.value / 100) * 2.3) ));
  }
  function fmt(x) {
    if (x >= 1e9) return (x / 1e9).toFixed(x >= 1e10 ? 0 : 1) + 'B';
    if (x >= 1e6) return (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + 'M';
    if (x >= 1e3) return (x / 1e3).toFixed(x >= 1e4 ? 0 : 1) + 'k';
    return String(x);
  }
  function render() {
    const f = fanout();
    val.textContent = f;
    // levels bottom-up: leaves hold n entries, each upper level divides by f
    const levels = [];
    let count = Math.ceil(n / f);          // leaf nodes
    levels.push(count);
    while (count > 1) { count = Math.ceil(count / f); levels.push(count); }
    const height = levels.length;
    const maxShow = 16;
    const shown = levels.slice().reverse();   // root first
    stage.innerHTML =
      `<div class="fo-verdict">height = <strong>${height}</strong> level${height === 1 ? '' : 's'} ` +
      `for ${fmt(n)} rows at fan-out ${f} — a point lookup touches ${height} node${height === 1 ? '' : 's'}</div>` +
      (height > maxShow
        ? `<div class="fo-too-tall">${height} levels — too tall to draw. This is the binary-tree tax.</div>`
        : shown.map((c, i) => {
            const w = Math.max(3, 100 * (Math.log10(c) + 0.3) / (Math.log10(shown[shown.length - 1]) + 0.3));
            const label = i === 0 ? 'root' : (i === shown.length - 1 ? 'leaves' : `level ${i + 1}`);
            return `<div class="fo-row"><span class="fo-label">${label}</span>` +
              `<span class="fo-track"><span class="fo-bar" style="width:${w.toFixed(1)}%"></span></span>` +
              `<span class="fo-count">${fmt(c)} node${c === 1 ? '' : 's'}</span></div>`;
          }).join(''));
    document.querySelectorAll('#viz-fanout .qj-controls .btn').forEach(b =>
      b.classList.toggle('primary', +b.dataset.n === n));
  }
  document.querySelectorAll('#viz-fanout .qj-controls .btn').forEach(b =>
    b.addEventListener('click', () => { n = +b.dataset.n; render(); }));
  slider.addEventListener('input', render);
  render();
})();
