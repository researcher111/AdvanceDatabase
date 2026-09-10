/* Lecture 11 — Vector Databases · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'rid': {
      title: 'RID (record id)',
      body: "<p>A record id identifies a row by its block number and slot number. The B+ tree index in microdb returns RIDs so the table can fetch matching rows. An IVF extension could use the same pattern to link candidate vectors back to table records.</p>",
    },
    'k-means': {
      title: 'k-means',
      body: "<p>A clustering algorithm that alternates between assigning vectors to the nearest centroid and replacing each centroid with the average of its assigned vectors. It stops when a convergence rule or iteration limit is reached. IVF uses the resulting centroids to choose which lists to search. The lab provides k-means so you can focus on scoring, assigning vectors to lists, and probing those lists.</p>",
    },
    'rag': {
      title: 'RAG (retrieval-augmented generation)',
      body: "<p>Retrieval-augmented generation first retrieves relevant evidence, then supplies it to a language model to help answer a question. In vector-based retrieval, documents are split into chunks and both chunks and questions are embedded. Nearest-neighbor search selects candidate evidence. Missing a useful passage can harm the answer, so the pipeline needs evaluation beyond index recall.</p>",
    },
    'recall': {
      title: 'Recall@k',
      body: "<p>Recall@k is the fraction of the exact top-k neighbors that approximate search returns. Run both searches, count the overlapping ids, and divide by k. A score of 1.0 means all exact neighbors were returned; 0.75 means one quarter were missed. Use this measurement, together with query cost, to choose settings such as probe or ef_search.</p>",
    },
    'hnsw': {
      title: 'HNSW (Hierarchical Navigable Small World graph)',
      body: "<p>HNSW is a layered graph index for nearest-neighbor search. Queries navigate a sparse upper layer before exploring a candidate set in the bottom layer. This can find useful neighbors without comparing every vector, but it does not guarantee an exact result. The ef_search parameter controls the search candidate list. Larger settings usually improve recall and cost more work. Graph links also add storage and build overhead.</p>",
    },
    'ivf': {
      title: 'IVF (inverted file index)',
      body: "<p>IVF assigns vectors to cluster lists. A query scores the C centroids, selects the P closest lists, and searches the vectors in those lists. For similarly sized lists, the work is about C + P × n/C comparisons. A true neighbor in an unsearched list is missed. Increasing P searches more vectors and can recover those neighbors.</p>",
    },
    'ann': {
      title: 'ANN (approximate nearest neighbor)',
      body: "<p>Approximate nearest-neighbor search avoids some comparisons and may miss exact neighbors. Algorithms such as IVF and HNSW expose settings that adjust search effort. Measure recall and query cost to decide whether the resulting tradeoff meets your application’s needs.</p>",
    },
    'pgvector': {
      title: 'pgvector',
      body: "<p>A PostgreSQL extension that adds vector data types, distance operators, and IVF and HNSW indexes. Vectors can be stored with other table columns. SQL joins, filters, and transactions remain available, although approximate search and filtering have specific performance and result-count considerations.</p>",
    },
    'faiss': {
      title: 'FAISS',
      body: "<p>A library for similarity search and vector clustering, with Python and C++ interfaces. It provides several index and compression methods, with GPU support for selected operations. Your application is responsible for loading, saving, serving, and updating the index. The lab’s IVF implementation demonstrates one of the underlying designs.</p>",
    },
    'embedding-recall': {
      title: 'Embedding',
      body: "<p>A numeric vector representing content such as text or an image. An embedding model is trained so that some geometric relationships reflect useful relationships between inputs. Similarity depends on the model and metric; nearby vectors are not guaranteed to be relevant evidence for every task.</p>",
    },
    'quantization': {
      title: 'Quantization (PQ)',
      body: "<p>Quantization stores a compressed approximation of a vector. Product quantization splits a vector into parts and replaces each part with an entry from a learned codebook. This can reduce storage and distance-computation cost, while introducing approximation error. Measure the effect on search quality.</p>",
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- 2-D vector space widget ---------------- */
(function () {
  const canvas = document.getElementById('vs-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const msg = $('vs-msg'), stats = $('vs-stats');
  const W = canvas.width, H = canvas.height;
  const N = 300, C = 8, K = 10;

  const rand = LabBase.makeLcg(6042);
  // clustered 2-D points
  const centers = Array.from({ length: C }, () => [40 + rand() * (W - 80), 30 + rand() * (H - 60)]);
  const PTS = Array.from({ length: N }, (_, i) => {
    const c = centers[i % C];
    return [c[0] + (rand() * 2 - 1) * 55, c[1] + (rand() * 2 - 1) * 45];
  });
  // k-means-lite for display clusters
  let cents = centers.map(c => [...c]);
  for (let it = 0; it < 4; it++) {
    const sums = cents.map(() => [0, 0, 0]);
    PTS.forEach(p => {
      const b = best(p, cents);
      sums[b][0] += p[0]; sums[b][1] += p[1]; sums[b][2] += 1;
    });
    cents = sums.map((s, i) => s[2] ? [s[0] / s[2], s[1] / s[2]] : cents[i]);
  }
  const assign = PTS.map(p => best(p, cents));

  function dist2(a, b) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; }
  function best(p, cs) {
    let bi = 0, bd = Infinity;
    cs.forEach((c, i) => { const d = dist2(p, c); if (d < bd) { bd = d; bi = i; } });
    return bi;
  }

  let query = null, mode = 'exact', probe = 1;

  function truth() {
    return PTS.map((p, i) => [dist2(query, p), i]).sort((a, b) => a[0] - b[0]).slice(0, K).map(t => t[1]);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    let probed = new Set(), found = new Set(), comparisons = 0, tr = [];
    if (query) {
      tr = truth();
      if (mode === 'exact') {
        found = new Set(tr);
        comparisons = N;
      } else {
        const order = cents.map((c, i) => [dist2(query, c), i]).sort((a, b) => a[0] - b[0]);
        probed = new Set(order.slice(0, probe).map(t => t[1]));
        comparisons = C;
        const cand = [];
        PTS.forEach((p, i) => {
          if (probed.has(assign[i])) { cand.push([dist2(query, p), i]); comparisons++; }
        });
        found = new Set(cand.sort((a, b) => a[0] - b[0]).slice(0, K).map(t => t[1]));
      }
    }
    // probed regions (rough): tint points by probed cluster
    PTS.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], found.has(i) ? 5 : 3, 0, 7);
      if (query && probed.has(assign[i]) && mode !== 'exact') {
        ctx.fillStyle = found.has(i) ? '#3a8a5b' : '#fde0d2';
      } else {
        ctx.fillStyle = found.has(i) ? '#3a8a5b' : '#d8d4c8';
      }
      ctx.fill();
      // true neighbors missed: ring them in red
      if (query && tr.includes(i) && !found.has(i)) {
        ctx.strokeStyle = '#b14a2e';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    // centroids
    cents.forEach(c => {
      ctx.beginPath(); ctx.arc(c[0], c[1], 6, 0, 7);
      ctx.strokeStyle = '#8a857d'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    if (query) {
      ctx.strokeStyle = '#1f1d1a'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(query[0] - 6, query[1] - 6); ctx.lineTo(query[0] + 6, query[1] + 6);
      ctx.moveTo(query[0] - 6, query[1] + 6); ctx.lineTo(query[0] + 6, query[1] - 6);
      ctx.stroke();
      const recall = tr.filter(i => found.has(i)).length / K;
      stats.textContent = `mode: ${mode === 'exact' ? 'exact' : 'IVF probe ' + probe}` +
        `    comparisons: ${comparisons}/${N}    recall@10: ${recall.toFixed(2)}`;
      if (mode !== 'exact' && recall < 1) {
        msg.innerHTML = `Recall ${recall.toFixed(2)} — the <strong>red-ringed points</strong> are true ` +
          `neighbors in clusters that were not searched. Increase probe to search more clusters.`;
      } else if (mode !== 'exact') {
        msg.innerHTML = `Recall 1.00 with ${comparisons} of ${N} comparisons — all exact top-10 neighbors were in the searched clusters.`;
      } else {
        msg.innerHTML = `Exact search compared all ${N} points. Green points are the exact top-10 neighbors.`;
      }
    }
  }

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    query = [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
    draw();
  });
  $('vs-exact').addEventListener('click', () => { mode = 'exact'; draw(); });
  $('vs-p1').addEventListener('click', () => { mode = 'ivf'; probe = 1; draw(); });
  $('vs-p2').addEventListener('click', () => { mode = 'ivf'; probe = 2; draw(); });
  $('vs-p4').addEventListener('click', () => { mode = 'ivf'; probe = 4; draw(); });
  $('vs-reset').addEventListener('click', () => { query = null; stats.textContent = ''; msg.textContent = 'Click in the space below to place a query point.'; draw(); });
  draw();
})();

/* ---------------- HNSW greedy walk ---------------- */
(function () {
  const svg = document.getElementById('hn-svg');
  if (!svg) return;
  const msg = document.getElementById('hn-msg');

  // Layer-0 y-band: 140..240; layer-1 nodes reuse x, drawn in band 10..110.
  const NODES = {
    A: [40, 60], B: [90, 115], C: [150, 35], D: [210, 95], E: [250, 45],
    F: [310, 115], G: [370, 55], H: [430, 105], I: [470, 35], J: [530, 95],
    K: [590, 50], L: [350, 15],
  };
  const L1 = { nodes: ['A', 'E', 'I', 'K'], edges: [['A','E'], ['E','I'], ['I','K']] };
  const L0EDGES = [['A','B'],['A','C'],['B','C'],['B','D'],['C','E'],['D','E'],['D','F'],
                   ['E','L'],['F','G'],['F','H'],['G','L'],['G','I'],['H','J'],['I','J'],
                   ['I','L'],['J','K'],['F','E']];
  const Q = [545, 68];
  const ENTRY = 'A';

  function nbrs(node, edges) {
    return edges.filter(e => e.includes(node)).map(e => e[0] === node ? e[1] : e[0]);
  }
  function dist(name) {
    const [x, y] = NODES[name];
    return Math.hypot(x - Q[0], y - Q[1]);
  }
  // Precompute the walk honestly: greedy on layer 1, then greedy on layer 0.
  const STEPS = [];   // {layer, from, to, note}
  let comparisons = 0;
  (function walk() {
    let cur = ENTRY;
    STEPS.push({ layer: 1, at: cur, note: `enter the top layer at ${cur} (distance ${dist(cur).toFixed(0)})` });
    for (const [layer, edges] of [[1, L1.edges], [0, L0EDGES]]) {
      for (;;) {
        const options = nbrs(cur, edges);
        comparisons += options.length;
        let best = cur;
        for (const n of options) if (dist(n) < dist(best)) best = n;
        if (best === cur) break;
        STEPS.push({ layer, at: best, from: cur,
          note: `hop ${cur} → ${best}: distance ${dist(cur).toFixed(0)} → ${dist(best).toFixed(0)}` });
        cur = best;
      }
      if (layer === 1) STEPS.push({ layer: 0, at: cur, drop: true,
        note: `no top-layer neighbor of ${cur} is closer — move to layer 0` });
    }
    STEPS.push({ layer: 0, at: cur, done: true,
      note: `no layer-0 neighbor is closer — return ${cur} (${comparisons} distance computations vs 12 for brute force)` });
  })();

  let step = 0;
  function y1(name) { return NODES[name][1] * 0.75 + 12; }       // layer-1 band
  function y0(name) { return NODES[name][1] * 0.75 + 148; }     // layer-0 band

  function render() {
    const visited = STEPS.slice(0, step + 1);
    const cur = visited[visited.length - 1];
    const pathEdges = new Set();
    visited.forEach(s => { if (s.from) pathEdges.add(s.layer + ':' + [s.from, s.at].sort().join('')); });
    const visitedNodes = new Set(visited.map(s => s.layer + ':' + s.at));

    let out = `<text x="6" y="20" class="hn-band">upper layer (1)</text>` +
              `<text x="6" y="158" class="hn-band">bottom layer (0)</text>`;
    // layer-1 edges + nodes
    for (const [a, b] of L1.edges) {
      const hot = pathEdges.has('1:' + [a, b].sort().join(''));
      out += `<line x1="${NODES[a][0]}" y1="${y1(a)}" x2="${NODES[b][0]}" y2="${y1(b)}" class="hn-edge${hot ? ' hot' : ''}"/>`;
    }
    // descent line
    if (visited.some(s => s.drop)) {
      const d = visited.find(s => s.drop);
      out += `<line x1="${NODES[d.at][0]}" y1="${y1(d.at)}" x2="${NODES[d.at][0]}" y2="${y0(d.at)}" class="hn-edge drop hot"/>`;
    }
    for (const [a, b] of L0EDGES) {
      const hot = pathEdges.has('0:' + [a, b].sort().join(''));
      out += `<line x1="${NODES[a][0]}" y1="${y0(a)}" x2="${NODES[b][0]}" y2="${y0(b)}" class="hn-edge${hot ? ' hot' : ''}"/>`;
    }
    for (const n of L1.nodes) {
      const isCur = cur.layer === 1 && cur.at === n;
      out += `<circle cx="${NODES[n][0]}" cy="${y1(n)}" r="10" class="hn-node l1${visitedNodes.has('1:' + n) ? ' seen' : ''}${isCur ? ' cur' : ''}"/>` +
             `<text x="${NODES[n][0]}" y="${y1(n) + 3.5}" class="hn-label">${n}</text>`;
    }
    for (const n in NODES) {
      const isCur = cur.layer === 0 && cur.at === n;
      const done = cur.done && cur.at === n;
      out += `<circle cx="${NODES[n][0]}" cy="${y0(n)}" r="10" class="hn-node${visitedNodes.has('0:' + n) ? ' seen' : ''}${isCur ? ' cur' : ''}${done ? ' answer' : ''}"/>` +
             `<text x="${NODES[n][0]}" y="${y0(n) + 3.5}" class="hn-label">${n}</text>`;
    }
    // query star on both bands
    out += `<text x="${Q[0]}" y="${Q[1] * 0.75 + 16}" class="hn-query">★</text>` +
           `<text x="${Q[0]}" y="${Q[1] * 0.75 + 152}" class="hn-query">★</text>`;
    svg.innerHTML = out;
    msg.textContent = `step ${step + 1}/${STEPS.length}: ${STEPS[step].note}`;
    document.getElementById('hn-step').disabled = step === STEPS.length - 1;
  }
  document.getElementById('hn-step').addEventListener('click', () => { if (step < STEPS.length - 1) { step++; render(); } });
  document.getElementById('hn-reset').addEventListener('click', () => { step = 0; render(); });
  render();
})();
