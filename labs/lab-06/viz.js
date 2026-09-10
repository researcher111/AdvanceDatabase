/* Lab 6 — The B+ Tree Index · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'rid-stability': {
      title: 'RID stability',
      body: "<p>In microdb’s fixed-slot heap, an existing row keeps the same block and slot address. Deletion can make that slot available to another row, so indexes must remove obsolete entries. Systems that move records need a way to update references or preserve a stable identifier.</p>",
    },
    'fanout': {
      title: 'Fan-out',
      body: "<p>The number of children of an internal tree node. Larger nodes can hold more separators and child references, often reducing tree height. The lab uses a small node capacity to make splits visible. A disk index’s capacity depends on page size and entry size.</p>",
    },
    'occupancy': {
      title: 'Occupancy',
      body: "<p>The fraction of a node’s capacity that is in use. Splitting near the middle distributes entries across both resulting nodes. Very uneven splits can preserve search order while leaving many nodes sparsely filled, increasing space use and tree height.</p>",
    },
    'covering-idea': {
      title: 'Covering index',
      body: "<p>An index contains everything needed for a query when it includes all required keys and column values. This can avoid heap reads. Some engines still need to visit the heap for visibility checks; PostgreSQL can avoid those checks when its visibility information permits an index-only scan.</p>",
    },
    'stale-index': {
      title: 'Stale index',
      body: "<p>An index whose entries no longer agree with the table. The lab builds an index from a table snapshot, so later inserts, deletes, or indexed-field changes require corresponding index updates. Production engines coordinate these changes with the row operation.</p>",
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Split drill ---------------- */
(function () {
  const root = document.getElementById('viz-split');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('sd-msg'), area = $('sd-area'), stats = $('sd-stats'),
        dealBtn = $('sd-deal'), revealBtn = $('sd-reveal');

  const DEALS = [
    { leaf: true,  keys: [28, 31, 34, 36, 39] },
    { leaf: false, keys: [10, 20, 30, 40, 50] },
    { leaf: true,  keys: [3, 7, 12, 18, 25] },
    { leaf: false, keys: [15, 35, 55, 75, 95] },
    { leaf: true,  keys: [41, 42, 43, 44, 45] },
  ];
  let deal = null, streak = 0, dealt = 0, answered = false;

  function renderNode(keys, leaf, clickable, marks) {
    return `<div class="sd-node${leaf ? ' leaf' : ''}">` + keys.map((k, i) => {
      const cls = ['sd-key'];
      if (marks && marks[i]) cls.push(marks[i]);
      return `<span class="${cls.join(' ')}" data-i="${i}" data-k="${k}">${k}</span>`;
    }).join('') + `</div>`;
  }

  function dealOne() {
    deal = DEALS[dealt % DEALS.length];
    dealt += 1;
    answered = false;
    revealBtn.hidden = true;
    const kind = deal.leaf ? 'LEAF' : 'INTERNAL node';
    msg.innerHTML = `This <strong>${kind}</strong> exceeds its key capacity (5 keys, ORDER 4). ` +
      `Select the key to send to the parent.`;
    area.innerHTML =
      `<div class="sd-node-label">overfull ${deal.leaf ? 'leaf' : 'internal node'}</div>` +
      renderNode(deal.keys, deal.leaf, true) +
      `<div class="sd-result" id="sd-result"></div>`;
    area.querySelectorAll('.sd-key').forEach(el =>
      el.addEventListener('click', () => answer(+el.dataset.i, el)));
    stats.textContent = `drills: ${dealt - 1} done · streak: ${streak}`;
  }

  function answer(i, el) {
    if (answered) return;
    answered = true;
    const mid = Math.floor(deal.keys.length / 2);
    if (i === mid) {
      streak += 1;
      el.classList.add('right-answer');
      msg.innerHTML = `Yes — the middle key, <strong>${deal.keys[mid]}</strong> (index ` +
        `len//2 = ${mid}). Now say aloud: which keys go right, and is ${deal.keys[mid]} ` +
        `<em>copied</em> or <em>moved</em>? Then reveal.`;
    } else {
      streak = 0;
      el.classList.add('wrong-answer');
      area.querySelectorAll('.sd-key')[mid].classList.add('right-answer');
      msg.innerHTML = `The split sends the <strong>middle</strong> key — ` +
        `<code>len(keys) // 2</code> → index ${mid} → <strong>${deal.keys[mid]}</strong>. ` +
        `This lab splits at the middle to distribute entries evenly. Reveal the resulting nodes.`;
    }
    revealBtn.hidden = false;
    stats.textContent = `drills: ${dealt - 1} done · streak: ${streak}`;
  }

  function reveal() {
    const mid = Math.floor(deal.keys.length / 2);
    const hoist = deal.keys[mid];
    let left, right, verb;
    if (deal.leaf) {
      left = deal.keys.slice(0, mid);
      right = deal.keys.slice(mid);            // COPIED: hoisted key stays in the right leaf
      verb = `<strong>copied</strong> up — it stays in the right leaf too, because leaves must hold all data`;
    } else {
      left = deal.keys.slice(0, mid);
      right = deal.keys.slice(mid + 1);        // MOVED: guides don't need duplicates
      verb = `<strong>moved</strong> up — it is removed from both resulting internal nodes`;
    }
    document.getElementById('sd-result').innerHTML =
      `<div class="sd-parent-label">parent gains: ${hoist} (${deal.leaf ? 'copied' : 'moved'})</div>` +
      `<div class="sd-pair">` +
      `<span>${renderNode(left, deal.leaf)}</span>` +
      `<span>${renderNode(right, deal.leaf)}</span></div>` +
      (deal.leaf ? `<div class="sd-parent-label">…and the chain now runs left → right → old next</div>` : '');
    msg.innerHTML = `${hoist} is ${verb}. Try another example, then apply these rules in _split.`;
    revealBtn.hidden = true;
  }

  dealBtn.addEventListener('click', dealOne);
  revealBtn.addEventListener('click', reveal);
})();
