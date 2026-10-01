/* Lecture 6 — B+ Trees · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'occupancy': {
      title: 'Occupancy',
      body: "<p>How much of a node’s available space is used. Two keys in a node with four slots means 50% occupancy. Splitting five keys into groups of two and three leaves useful room in both nodes. Repeatedly leaving nearly empty nodes wastes space.</p>",
    },
    'routing-key': {
      title: 'Routing key',
      body: "<p>A key used to choose a child. In our tree, separator 36 sends values below 36 left and values equal to or above 36 right. It gives directions; it does not store row addresses. The actual entry for 36 is in a leaf.</p>",
    },
    'invariant': {
      title: 'Invariant',
      body: "<p>A property that must hold after every completed operation. For this B+ tree, keys are sorted, leaves have equal depth, non-root nodes meet minimum occupancy, and all (key, RID) entries remain in leaves. The lab tests these properties after insertions and splits.</p>",
    },
    'rid-recall': {
      title: 'RID (record identifier)',
      body: "<p>A row address written as (block number, slot number). For example, (0, 4) means block 0, slot 4. The index returns this address; the table scan uses it to fetch the row. If that row is deleted or its slot reused, the index entry must be updated.</p>",
    },
    'fanout': {
      title: 'Fan-out',
      body: "<p>The number of children an internal node has. With 200 children, one decision chooses among 200 groups of keys. More children usually means fewer levels. How many children fit depends on page size, entry size, and how full the nodes are.</p>",
    },
    'selectivity': {
      title: 'Selectivity',
      body: "<p>The fraction of rows that a predicate keeps. A unique-ID lookup keeps one row and is highly selective; a condition matching almost every row is not selective. An index is often useful when few rows match. For many matches, a sequential scan may be cheaper. The optimizer estimates selectivity when comparing plans.</p>",
    },
    'covering-index': {
      title: 'Covering index',
      body: "<p>An index containing all columns needed by a query. This can let the engine answer from index entries without fetching the heap rows. PostgreSQL calls the corresponding plan an index-only scan, though visibility checks may still require heap access. Adding included columns increases index size.</p>",
    },
    'write-amplification': {
      title: 'Write amplification',
      body: "<p>Additional physical writes needed to perform a logical change. Inserting into a table with five indexes updates six structures, but that does not imply exactly six disk writes: buffering, page splits, and logging affect the total. Index maintenance trades additional write work and storage for faster reads.</p>",
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

  let root, height, splits, count, scriptTimer = null;

  function stopScript() {
    if (scriptTimer !== null) clearInterval(scriptTimer);
    scriptTimer = null;
  }

  function newNode(leaf) { return { leaf, keys: [], children: [], next: null, id: Math.random() }; }

  function reset() {
    stopScript();
    root = newNode(true); height = 1; splits = 0; count = 0;
    msg.textContent = 'Insert keys until the root splits. Compare the height before and after.';
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
      msg.innerHTML = `${key} is already present. The lab adds another RID for a duplicate key; this key-only demonstration leaves the tree unchanged.`;
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
        msg.innerHTML = `Insert ${key}: node over capacity → <strong>split</strong>, and no parent existed — ` +
          `a new root [${hoisted}] appears. <strong>Height is now ${height}</strong>; every leaf is one level farther from the root.`;
      } else {
        const j = childIndex(parent, hoisted);
        parent.keys.splice(j, 0, hoisted);
        parent.children.splice(j + 1, 0, sib);
        msg.innerHTML = `Insert ${key}: node over capacity → <strong>split</strong> at the middle, ` +
          `${hoisted} ${node.leaf ? 'copied' : 'moved'} up into the parent.`;
      }
    }
    if (!didSplit) msg.innerHTML = `Insert ${key}: the key fits in the leaf. It is inserted in sorted order; no split is needed.`;
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
    const treeLevels = levels(), leaves = treeLevels[treeLevels.length - 1];
    const keyWidth = Math.max(34, ...treeLevels.flat().flatMap(n => n.keys.map(k => String(k).length * 10 + 18)));
    const nodeWidth = n => Math.max(90, n.keys.length * keyWidth + 20);
    const gap = Math.max(190, ...treeLevels.flat().map(n => nodeWidth(n) + 35));
    const width = Math.max(700, leaves.length * gap + 30), svgHeight = height * 135 + 62;
    const positions = new Map();
    leaves.forEach((n, i) => positions.set(n, {x: width / 2 + (i - (leaves.length - 1) / 2) * gap, y: 35 + (height - 1) * 135}));
    for (let level = treeLevels.length - 2; level >= 0; level--) {
      treeLevels[level].forEach(n => positions.set(n, {
        x: (positions.get(n.children[0]).x + positions.get(n.children[n.children.length - 1]).x) / 2,
        y: 35 + level * 135,
      }));
    }
    const drawing = [];
    treeLevels.flat().forEach(n => {
      const p = positions.get(n);
      n.children.forEach(child => {
        const q = positions.get(child), hot = visited.has(n.id) && visited.has(child.id);
        drawing.push(`<path class="bt-child-edge${hot ? ' active' : ''}" d="M ${p.x} ${p.y + 52} L ${q.x} ${q.y}"/>`);
      });
      if (n.leaf && n.next) {
        const q = positions.get(n.next), left = p.x + nodeWidth(n) / 2 + 5, right = q.x - nodeWidth(n.next) / 2 - 5;
        drawing.push(`<path class="bt-next-edge" d="M ${left} ${p.y + 26} H ${right} m -8 -5 l 8 5 l -8 5"/>`);
      }
    });
    treeLevels.flat().forEach(n => {
      const p = positions.get(n), w = nodeWidth(n), flash = flashKey != null && n.keys.includes(flashKey);
      drawing.push(`<rect class="bt-svg-node ${n.leaf ? 'leaf' : 'internal'}${visited.has(n.id) || flash ? ' active' : ''}" x="${p.x - w / 2}" y="${p.y}" width="${w}" height="52" rx="8"/>`);
      if (!n.keys.length) drawing.push(`<text x="${p.x}" y="${p.y + 27}">empty</text>`);
      n.keys.forEach((k, i) => {
        const x = p.x + (i - (n.keys.length - 1) / 2) * keyWidth;
        if (n.leaf && k === foundKey) drawing.push(`<rect class="bt-found-key" x="${x - keyWidth / 2 + 2}" y="${p.y + 6}" width="${keyWidth - 4}" height="40" rx="4"/>`);
        drawing.push(`<text x="${x}" y="${p.y + 27}">${k}</text>`);
      });
      if (n === root) drawing.push(`<text class="bt-node-label" x="${p.x}" y="${p.y - 17}">${n.leaf ? 'root = leaf' : 'root: routing keys'}</text>`);
    });
    canvas.innerHTML = `<svg class="bt-live-tree" viewBox="0 0 ${width} ${svgHeight}" style="min-width:${width}px" role="img" aria-label="B+ tree with ${count} distinct keys and ${height} levels. Internal branches lead to children; green arrows link leaves in key order.">` + drawing.join('') + '</svg>' +
      (height > 1 ? '<div class="bt-chain">Gray branches: child pointers · green arrows: next leaf · all leaves have equal depth</div>' : '');
    stats.textContent = `keys: ${count}    height: ${height}    splits so far: ${splits}`;
  }

  function runScript(keys, doneMsg) {
    reset();
    let i = 0;
    scriptTimer = setInterval(() => {
      if (i >= keys.length) { stopScript(); if (doneMsg) msg.innerHTML = doneMsg; return; }
      insert(keys[i++]);
    }, 800);
  }

  function manual(inputId, operation) {
    stopScript();
    const value = $(inputId).value;
    const key = Number(value);
    if (!value.trim() || !Number.isSafeInteger(key)) {
      msg.textContent = 'Enter a whole-number key before continuing.';
      return;
    }
    operation(key);
  }

  $('bt-script').addEventListener('click', () =>
    runScript([39, 31, 37, 28, 36, 34],
      'The six example gpas: one split, height 2, root [36] — the tree from the lecture’s traced search.'));
  $('bt-many').addEventListener('click', () =>
    runScript(Array.from({ length: 20 }, (_, k) => k + 1),
      'Sequential inserts split the rightmost leaf as it fills. Root splits increased the height twice; all leaves remain at the same depth.'));
  $('bt-one').addEventListener('click', () => manual('bt-key', insert));
  $('bt-search').addEventListener('click', () => manual('bt-skey', search));
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
      `for ${fmt(n)} distinct keys — one lookup visits ${height} node${height === 1 ? '' : 's'}</div>` +
      (height > maxShow
        ? `<div class="fo-too-tall">${height} levels — too tall to draw. Lower fan-out requires more levels.</div>`
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
