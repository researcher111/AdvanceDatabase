/* Lab 6 — The B+ Tree Index · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'rid-stability': {
      title: 'RID stability',
      body: '<p>Lab 3’s quiet promise, cashed in today: because slotted storage never moves ' +
        'records (updates overwrite in place, deletes flip a flag), a (block, slot) address ' +
        'written into an index leaf stays correct indefinitely. Without stable RIDs an index ' +
        'would be a map to moving targets — worthless the day after you built it.</p>',
    },
    'fanout': {
      title: 'Fan-out',
      body: '<p>A node’s branching factor. The lab’s ORDER-4 nodes make tall-ish trees you can ' +
        'watch split; a real node sized to a disk page holds ~200 keys, making a 100-million-row ' +
        'tree just 4 levels tall. Same algorithm, different logarithm base — and the base comes ' +
        'from Lab 1’s block size.</p>',
    },
    'occupancy': {
      title: 'Occupancy',
      body: '<p>How full nodes actually are, on average. Mid-point splits guarantee at least ' +
        'half-full nodes, which is what makes the height bound real. Skewed splits (see the ' +
        'verify exercise) keep every invariant while quietly wrecking occupancy — and height ' +
        'is where the damage shows up.</p>',
    },
    'covering-idea': {
      title: 'Covering index',
      body: '<p>An index that carries extra column values alongside its RIDs so hot queries ' +
        'can be answered from the index alone — zero heap visits. Postgres’s index-only scans ' +
        'and its INCLUDE clause are this idea shipped; the Going Further has you build the ' +
        'toy version and measure the saved jumps.</p>',
    },
    'stale-index': {
      title: 'Stale index',
      body: '<p>An index that no longer reflects its table — the fate of any index the engine ' +
        'doesn’t maintain on every write. Real engines update all of a table’s indexes inside ' +
        'the same transaction as the row change (paying write amplification); your lab tree is ' +
        'honest about being a snapshot, built by one scan, current until the next insert.</p>',
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
    msg.innerHTML = `This <strong>${kind}</strong> just went overfull (5 keys, ORDER 4). ` +
      `Click the key that gets <strong>hoisted</strong> to the parent.`;
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
      msg.innerHTML = `The split hoists the <strong>middle</strong> key — ` +
        `<code>len(keys) // 2</code> → index ${mid} → <strong>${deal.keys[mid]}</strong>. ` +
        `(Any other pivot wrecks occupancy — see the verify exercise.) Reveal to see the halves.`;
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
      verb = `<strong>moved</strong> up — internal keys are guides, so it leaves entirely`;
    }
    document.getElementById('sd-result').innerHTML =
      `<div class="sd-parent-label">parent gains: ${hoist} (${deal.leaf ? 'copied' : 'moved'})</div>` +
      `<div class="sd-pair">` +
      `<span>${renderNode(left, deal.leaf)}</span>` +
      `<span>${renderNode(right, deal.leaf)}</span></div>` +
      (deal.leaf ? `<div class="sd-parent-label">…and the chain now runs left → right → old next</div>` : '');
    msg.innerHTML = `${hoist} is ${verb}. Deal again — three straight and _split is dictation.`;
    revealBtn.hidden = true;
  }

  dealBtn.addEventListener('click', dealOne);
  revealBtn.addEventListener('click', reveal);
})();
