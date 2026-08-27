/* Lecture 15 — graph databases & synthesis · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'self-join-chain': {
      title: 'Self-join chain',
      body: '<p>A join of a table with itself, repeated once per hop. To find who ada follows, join <code>follows</code> to the students; to find who those people follow, join <code>follows</code> to that result again, and so on, one extra join per hop. Each join matches keys across every row of the previous result, and it produces one row per path rather than one per node, so a person reachable by several routes appears several times until a final <code>DISTINCT</code>. That is the relational way to answer ‘within k hops’, and it is what the counter in the widget compares the traversal against.</p>',
    },
    'recursive-cte': {
      title: 'Recursive CTE',
      body: '<p>A common table expression (the <code>WITH name AS (...)</code> form) that refers to itself. It has two parts joined by <code>UNION ALL</code>: a base query that produces the starting rows, and a step query that reads the rows produced so far and produces the next batch. The engine runs the step again and again, feeding each batch back in, until a step returns no new rows or a condition such as <code>depth &lt; 3</code> stops it. That is a loop expressed in relational algebra, and it is how plain SQL walks a graph one hop per iteration. It works well for a few hops; row counts grow with every level, and there is no built-in notion of a path or a visited set.</p>',
    },
    'bfs': {
      title: 'Breadth-first search (BFS)',
      body: '<p>Breadth-first search, the standard way to find a shortest path in a graph where every edge counts the same. Starting from one node it visits every neighbor one hop away, then everything two hops away, and so on, keeping a queue of nodes to expand next and a set of nodes already seen so a cycle is never walked twice. Because it works outward in rings, the first time it reaches the target it has found a shortest path. Kuzu&#39;s <code>SHORTEST</code> runs a search of this shape for you; in SQL you would have to build the queue, the visited set, and the stopping rule yourself inside a recursive CTE. Dijkstra&#39;s algorithm is the cousin for graphs whose edges carry different costs.</p>',
    },
    'adjacency-list': {
      title: 'Adjacency list',
      body: '<p>A node’s own list of its neighbors — "ada follows: [ben, cyd]" stored with ' +
        'ada, not in a separate table. The graph equivalent of denormalizing the join: ' +
        'finding neighbors becomes reading a field instead of probing an index. Kept in ' +
        'both directions (follows-out and followed-by-in) so traversal works either way.</p>',
    },
    'ifa': {
      title: 'Index-free adjacency',
      body: '<p>The graph-database storage promise: getting from a node to its neighbors ' +
        'costs one pointer-follow, independent of how big the graph is — no index probe, no ' +
        'key matching. A relational join costs per-lookup even with a perfect index; ' +
        'traversal under index-free adjacency costs per-neighbor. That constant-factor gap, ' +
        'compounded over k hops, is the product’s entire pitch.</p>',
    },
    'supernode': {
      title: 'Supernode',
      body: '<p>A node with a vastly outsized neighbor list — the celebrity with 50M ' +
        'followers. Any traversal touching it explodes; storage for its adjacency list ' +
        'becomes its own problem. It’s Lecture 13’s skew wearing a graph costume, and the ' +
        'mitigations rhyme too: split the list, cap expansions, special-case the ' +
        'celebrities.</p>',
    },
    'knowledge-graph': {
      title: 'Knowledge graph',
      body: '<p>A graph whose nodes are real-world entities (people, systems, concepts) and ' +
        'whose edges are typed facts between them — "WAL —protects→ page writes." Built by ' +
        'extraction from text or curated by hand; queried by traversal. GraphRAG builds a ' +
        'small one from your corpus so retrieval can follow relationships instead of only ' +
        'similarity.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- Walk the graph ---------------- */
(function () {
  const svg = document.getElementById('walk-svg');
  if (!svg) return;

  const NODES = {
    ada: [90, 80], ben: [300, 50], cyd: [250, 220],
    dee: [470, 120], eli: [430, 280], fay: [590, 220],
  };
  const EDGES = [
    ['ada', 'ben'], ['ada', 'cyd'], ['ben', 'dee'], ['cyd', 'dee'],
    ['dee', 'eli'], ['eli', 'fay'], ['fay', 'ada'], ['cyd', 'eli'], ['ben', 'ada'],
  ];
  const OUT = {};
  for (const name in NODES) OUT[name] = [];
  for (const [a, b] of EDGES) OUT[a].push(b);

  let start = 'ada', depth = 0;

  // BFS state up to `depth`: hop number per reached node, set of walked edges,
  // traversal edge-visit count, and join-chain row count (paths per level).
  function computeState() {
    const hop = { [start]: 0 };
    const walked = new Set();
    let edgeVisits = 0;
    let frontier = [start];
    for (let d = 1; d <= depth; d++) {
      const next = [];
      for (const n of frontier) {
        for (const m of OUT[n]) {
          edgeVisits++;
          walked.add(n + '>' + m);
          if (!(m in hop)) { hop[m] = d; next.push(m); }
        }
      }
      frontier = next;
    }
    // Join chain: level k matches one row per PATH of length k (no dedup mid-plan).
    let joinRows = 0, paths = [start];
    for (let d = 1; d <= depth; d++) {
      const next = [];
      for (const end of paths) for (const m of OUT[end]) next.push(m);
      joinRows += next.length;
      paths = next;
    }
    return { hop, walked, edgeVisits, joinRows };
  }

  function shorten(x1, y1, x2, y2, r) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    return [x1 + dx / len * r, y1 + dy / len * r, x2 - dx / len * r, y2 - dy / len * r];
  }

  function render() {
    const st = computeState();
    let html = `<defs>
      <marker id="walk-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#8a8375"/></marker>
      <marker id="walk-arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#b14a2e"/></marker>
    </defs>`;
    for (const [a, b] of EDGES) {
      const hot = st.walked.has(a + '>' + b);
      const [x1, y1, x2, y2] = shorten(NODES[a][0], NODES[a][1], NODES[b][0], NODES[b][1], 26);
      html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
        stroke="${hot ? '#b14a2e' : '#8a8375'}" stroke-width="${hot ? 2.5 : 1.2}"
        marker-end="url(#walk-arrow${hot ? '-hot' : ''})"/>`;
    }
    for (const name in NODES) {
      const [x, y] = NODES[name];
      const h = st.hop[name];
      const reached = h !== undefined;
      const fill = name === start ? '#b14a2e' : reached ? '#fde0d2' : '#f0eee5';
      const stroke = reached ? '#b14a2e' : '#8a8375';
      html += `<g class="walk-node" data-name="${name}" style="cursor:pointer">
        <circle cx="${x}" cy="${y}" r="22" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
        <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="13"
          font-family="ui-monospace, monospace" fill="${name === start ? '#fff' : '#1f1d1a'}">${name}</text>` +
        (reached && name !== start
          ? `<text x="${x}" y="${y - 28}" text-anchor="middle" font-size="11" fill="#b14a2e" font-family="system-ui">hop ${h}</text>` : '') +
        `</g>`;
    }
    svg.innerHTML = html;
    svg.querySelectorAll('.walk-node').forEach(g =>
      g.addEventListener('click', () => { start = g.dataset.name; depth = 0; render(); }));

    const reachedNames = Object.keys(st.hop).filter(n => n !== start).sort();
    document.getElementById('walk-msg').textContent =
      depth === 0 ? `start: ${start} — click another student to move the start`
                  : `depth ${depth} from ${start}: {${reachedNames.join(', ') || 'nobody'}}`;
    document.getElementById('walk-stats').innerHTML = depth === 0 ? '' :
      `<span><strong>${st.edgeVisits}</strong> edge visits (traversal — each node expanded once)</span> · ` +
      `<span><strong>${st.joinRows}</strong> rows matched (SQL self-join chain — one per path, duplicates included)</span>`;
  }

  document.getElementById('walk-step').addEventListener('click', () => {
    if (depth < 5) { depth++; render(); }
  });
  document.getElementById('walk-reset').addEventListener('click', () => { depth = 0; render(); });
  render();
})();
