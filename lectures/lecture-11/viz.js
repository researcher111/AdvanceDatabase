/* Lecture 11 — Vector Databases · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'rid': {
      title: 'RID (record ID)',
      body: "<p>A record ID identifies a row by its block number and slot number. The B+ tree index in microdb returns RIDs. The table uses these addresses to read the matching rows. An IVF extension could also store a RID with each vector. Search could then return the vector’s table row.</p>",
    },
    'k-means': {
      title: 'k-means',
      body: "<p>The k-means algorithm groups vectors around centers called centroids. It assigns each vector to its nearest centroid. It then moves each centroid to the average position of its assigned vectors. It repeats assignment and averaging until it meets a convergence rule or reaches an iteration limit.</p><p>IVF uses the resulting centroids to select lists for search. The lab provides k-means. Your code scores vectors, assigns vectors to lists, and searches selected lists.</p>",
    },
    'rag': {
      title: 'RAG (retrieval-augmented generation)',
      body: "<p>Retrieval-augmented generation supplies source passages to a language model along with a question. The model uses those passages to generate an answer. For vector search, the application splits documents into passages called chunks. An embedding model creates vectors for the chunks and the question. Search selects chunks whose vectors are close to the question vector.</p><p>A nearby vector does not guarantee that its chunk supports the answer. Check the retrieved text and the generated claims as well as index recall.</p>",
    },
    'recall': {
      title: 'Recall@k',
      body: "<p>Recall@k is the fraction of the exact top-k neighbors that approximate search returns. Use the same vectors, metric, and tie convention for both searches. Count the shared IDs. Divide that count by k.</p><p>A recall of 1.0 means approximate search returned all exact top-k neighbors. A recall of 0.75 means approximate search missed one quarter of those neighbors. Compare recall with query cost when selecting probe or ef_search.</p>",
    },
    'hnsw': {
      title: 'HNSW (Hierarchical Navigable Small World graph)',
      body: "<p>HNSW is a layered graph index for nearest-neighbor search. Each node represents a stored vector. Links connect nodes that search can visit next. Search follows links toward the query in upper layers, which contain fewer nodes. It then explores candidates in the base layer, which contains all stored vectors.</p><p>The ef_search parameter controls the candidate list during search. Larger settings usually improve recall and increase work. Search can skip vectors, so the result need not match exact search. The graph also needs storage for its links and work to build them.</p>",
    },
    'ivf': {
      title: 'IVF (inverted file index)',
      body: "<p>IVF groups stored vectors into lists. Each list has a center called a centroid. During index construction, each vector joins the list of its nearest centroid.</p><p>Search compares the query vector with C centroids. It selects the P nearest centroids and scores the vectors in their lists. P is the probe count: the number of lists searched. With n vectors and balanced lists, the work is approximately C + P × n/C comparisons.</p><p>A skipped list can contain an exact neighbor. Increasing P searches more lists and can recover that neighbor.</p>",
    },
    'ann': {
      title: 'ANN (approximate nearest neighbor)',
      body: "<p>Approximate nearest-neighbor search avoids some comparisons and can miss neighbors that exact search returns. IVF and HNSW have settings that control how much work search does. Measure recall against exact search. Measure query cost. Use both measurements to choose a setting that meets the application requirements.</p>",
    },
    'pgvector': {
      title: 'pgvector',
      body: "<p>The pgvector extension adds vector data types, distance operators, and IVF and HNSW indexes to PostgreSQL. Tables can store vectors beside other columns. SQL joins, filters, and transactions remain available. Measure performance and result counts when you combine approximate search with filters.</p>",
    },
    'faiss': {
      title: 'FAISS',
      body: "<p>FAISS is a library for similarity search and vector clustering. It has Python and C++ interfaces. It provides index and compression methods, with GPU support for some operations. The application loads, saves, serves, and updates the index. The lab implements one IVF design.</p>",
    },
    'embedding-recall': {
      title: 'Embedding',
      body: "<p>An embedding is a list of numbers that represents content, such as text or an image. Each number is a coordinate of the vector. Training adjusts the model so that similar inputs can produce nearby vectors. What counts as similar depends on the model and comparison metric. Read the retrieved text to check whether it provides useful evidence.</p>",
    },
    'quantization': {
      title: 'Quantization and product quantization (PQ)',
      body: "<p>Quantization stores a compressed approximation of a vector. Product quantization splits a vector into parts. A learned codebook holds representative values for each part. The index stores a code that selects a representative instead of storing the original part.</p><p>This can reduce storage and the cost of distance calculations. The representative can differ from the original values. Measure how this approximation changes search quality.</p>",
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
        msg.innerHTML = `Recall is ${recall.toFixed(2)}. The <strong>points with red rings</strong> belong to the exact top 10. ` +
          `IVF missed them because their lists were not searched. Green points are the IVF results. Increase probe to search more lists.`;
      } else if (mode !== 'exact') {
        msg.innerHTML = `Recall is 1.00. The selected lists contained all exact top-10 neighbors. IVF used ${comparisons} comparisons, including the ${C} centroid comparisons. Exact search uses ${N} comparisons.`;
      } else {
        msg.innerHTML = `Exact search compared the query with all ${N} points using Euclidean distance. The green points are the 10 nearest neighbors. These IDs are the reference for checking IVF.`;
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
  $('vs-reset').addEventListener('click', () => { query = null; stats.textContent = ''; msg.textContent = 'Click the plot to set the query point.'; draw(); });
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
    STEPS.push({ layer: 1, at: cur, note: `Start at ${cur} in the upper layer. Its distance to the query is ${dist(cur).toFixed(0)}. Check the nodes linked to ${cur}.` });
    for (const [layer, edges] of [[1, L1.edges], [0, L0EDGES]]) {
      for (;;) {
        const options = nbrs(cur, edges);
        comparisons += options.length;
        let best = cur;
        for (const n of options) if (dist(n) < dist(best)) best = n;
        if (best === cur) break;
        STEPS.push({ layer, at: best, from: cur,
          note: `Among the nodes linked to ${cur}, ${best} is closest to the query. Follow ${cur} → ${best}. The distance decreases from ${dist(cur).toFixed(0)} to ${dist(best).toFixed(0)}.` });
        cur = best;
      }
      if (layer === 1) STEPS.push({ layer: 0, at: cur, drop: true,
        note: `No node linked to ${cur} in this layer is closer to the query. Continue from the same node, ${cur}, in layer 0.` });
    }
    STEPS.push({ layer: 0, at: cur, done: true,
      note: `No node linked to ${cur} in layer 0 is closer to the query. Return ${cur}. This greedy trace made ${comparisons} neighbor checks, including repeated visits. Exact search compares all 12 stored vectors.` });
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
              `<text x="6" y="158" class="hn-band">base layer (0)</text>`;
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
    msg.textContent = `Step ${step + 1}/${STEPS.length}: ${STEPS[step].note}`;
    document.getElementById('hn-step').disabled = step === STEPS.length - 1;
  }
  document.getElementById('hn-step').addEventListener('click', () => { if (step < STEPS.length - 1) { step++; render(); } });
  document.getElementById('hn-reset').addEventListener('click', () => { step = 0; render(); });
  render();
})();
