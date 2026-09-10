/* Lecture 15 — graph databases & synthesis · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'self-join-chain': {
      title: 'Self-join chain',
      body: "<p>A sequence of joins that repeatedly matches a relationship table to the previous result. Each step adds one hop. Without intermediate deduplication, multiple paths to the same node can produce multiple rows. The widget compares that path enumeration with a traversal that records each visited node.</p>",
    },
    'recursive-cte': {
      title: 'Recursive CTE',
      body: "<p>A common table expression that refers to its own intermediate results. A base query supplies starting rows, and a recursive term produces the next iteration. UNION can remove duplicates, while UNION ALL retains them. Depth bounds, cycle handling, or the absence of further results can stop the recursion. The exact query determines whether it enumerates paths or computes reachability.</p>",
    },
    'bfs': {
      title: 'Breadth-first search (BFS)',
      body: "<p>Breadth-first search expands nodes in increasing hop distance from a start node. A visited set avoids repeatedly expanding the same node. With equal edge costs, the first visit to a target finds a shortest path to it. Kuzu provides a shortest-path operator; SQL can express a search with recursive queries and appropriate stopping rules. Weighted paths require an algorithm suited to their costs.</p>",
    },
    'adjacency-list': {
      title: 'Adjacency list',
      body: "<p>A stored list of a node’s neighbors or incident edges. For example, ada’s outgoing list might contain ben and cyd. The list may be stored alongside node data or in a separate adjacency structure. Traversal reads that structure rather than repeatedly matching endpoint keys across tables.</p>",
    },
    'ifa': {
      title: 'Index-free adjacency',
      body: "<p>Index-free adjacency stores direct references between connected nodes, avoiding an index lookup for each traversal step. It reduces neighbor-lookup work, but visiting many neighbors still costs time and may require storage reads. Graph engines differ in their physical representation; not every graph product uses the same pointer layout.</p>",
    },
    'supernode': {
      title: 'Supernode',
      body: "<p>A node with far more edges than most other nodes. Expanding its adjacency list can dominate a traversal’s cost. This is the graph form of skew. Splitting storage or limiting expansions may help, but any limit must still satisfy the query’s required results.</p>",
    },
    'knowledge-graph': {
      title: 'Knowledge graph',
      body: "<p>A graph of entities and typed relationships, such as a WAL record that must precede a page flush. The graph may be curated or extracted from text. Linking entities and edges to source passages lets retrieval use relationships while preserving a trail back to the evidence.</p>",
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
      `<span><strong>${st.joinRows}</strong> rows matched (path-enumerating join chain — duplicates included)</span>`;
  }

  document.getElementById('walk-step').addEventListener('click', () => {
    if (depth < 5) { depth++; render(); }
  });
  document.getElementById('walk-reset').addEventListener('click', () => { depth = 0; render(); });
  render();
})();
