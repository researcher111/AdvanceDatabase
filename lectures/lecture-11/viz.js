/* Lecture 11 — Vector Databases · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'rid': {
      title: 'RID (record id)',
      body: '<p>The physical address of a row: which block of the table&#39;s file it lives in and which slot within that block. Every index in this course stores RIDs rather than row copies, so an index lookup returns a list of RIDs and the table then fetches those rows by address. An IVF list would store, for each vector, the centroid it belongs to and the RID of the row that owns the vector, which is why it fits the same IndexSelectScan pattern as a B+ tree index in Lab 6.</p>',
    },
    'k-means': {
      title: 'k-means',
      body: '<p>The clustering algorithm IVF uses to split the vector set into C groups. It starts with C guessed centroids, assigns every vector to its nearest centroid, moves each centroid to the average of the vectors assigned to it, and repeats until the assignments stop changing. The result is C centroids and, for each vector, the id of the cluster it belongs to. IVF runs this once at build time and files each vector in its cluster&#39;s list; at query time only the centroids are scored to decide which lists to search. Thursday&#39;s lab provides this step so you can concentrate on the scoring, bucketing, and probing around it.</p>',
    },
    'rag': {
      title: 'RAG (retrieval-augmented generation)',
      body: '<p>A pipeline that answers a question by first retrieving relevant text and then handing that text to a language model to write the answer. The documents are cut into chunks, each chunk is embedded as a vector, and a question is embedded the same way; the k chunks whose vectors are most similar to the question&#39;s are retrieved and pasted into the model&#39;s prompt as evidence. That retrieval step is a nearest-neighbor query, which is why RAG systems sit on the indexes in this lecture. A missed neighbor here can mean the one passage that held the answer never reaches the model, which is why RAG cares about recall more than a recommender does. Next lecture treats the whole pipeline as a systems problem.</p>',
    },
    'recall': {
      title: 'Recall@k',
      body: '<p>The fraction of the true k nearest neighbors that an approximate index actually returned. You compute it by running exact brute-force search to get the true top-k, running the index to get its top-k, and dividing the size of the overlap by k. Recall 1.0 means the index found everything; 0.75 means it missed a quarter of the real neighbors. It is the number that makes &ldquo;approximate&rdquo; honest: the index is allowed to miss, but you measure how much, and you set the index&#39;s dial (probe or ef_search) to reach the recall your application needs.</p>',
    },
    'hnsw': {
      title: 'HNSW (Hierarchical Navigable Small World graph)',
      body: '<p>A graph index for similarity search. Every vector is a node linked to a handful of its nearest neighbors, and a few nodes also appear on upper layers with long-range links, like highways above streets. A query starts at an entry node on the top layer and greedily hops to whichever neighbor is closest to the query; when no neighbor is closer it drops one layer and keeps walking, until it settles on the bottom layer. Because each hop roughly halves the remaining distance, the walk reaches the answer in a near-logarithmic number of hops while computing distances only along its path. Its dial is <code>ef_search</code>, the number of candidate nodes the walk keeps alive at once. The graph must live in RAM and inserts cost more than IVF&#39;s, but it usually wins the recall-at-speed benchmarks.</p>',
    },
    'ivf': {
      title: 'IVF (inverted file index)',
      body: '<p>An index that splits the vector set into clusters ahead of time and searches only a few of them per query. At build time, k-means groups the n vectors into C clusters, each with a centroid (its average vector), and every vector is filed in the list of its nearest centroid. At query time the search scores the C centroids, picks the P closest (P is the &ldquo;probe&rdquo; setting), and runs brute force inside only those P lists. The cost falls from n comparisons to about C plus P times n/C. The risk is a true neighbor that sits in a list the query did not probe; raising P finds more of them and does more work.</p>',
    },
    'ann': {
      title: 'ANN (approximate nearest neighbor)',
      body: '<p>The index family for similarity search that accepts occasionally missing a ' +
        'true neighbor in exchange for orders-of-magnitude less work — with the miss rate ' +
        'measured (recall@k) and tunable (probe / ef_search). "Approximate" is a contract ' +
        'term, not an apology: you choose the operating point.</p>',
    },
    'pgvector': {
      title: 'pgvector',
      body: '<p>The Postgres extension adding a vector column type plus IVF and HNSW index ' +
        'methods — CREATE INDEX ... USING hnsw. Vectors live beside their rows, so joins, ' +
        'WHERE filters, and transactions come free. The default answer to "do we need a ' +
        'vector database?" is usually "you need this extension."</p>',
    },
    'faiss': {
      title: 'FAISS',
      body: '<p>Meta’s C++/Python library of vector indexes — the reference implementations ' +
        'of IVF, HNSW, product quantization, and their combinations, with GPU support. A ' +
        'library, not a server: you bring the storage, serving, and consistency story. ' +
        'Thursday’s IVFIndex is FAISS’s IndexIVFFlat, readable.</p>',
    },
    'embedding-recall': {
      title: 'Embedding',
      body: '<p>A learned map from content (text, images) to vectors where geometric nearness ' +
        'approximates semantic similarity — the DS-native part of this week. The database ' +
        'question starts after the model: storing millions of them and answering nearest- ' +
        'neighbor queries fast is pure systems, and that’s the lecture.</p>',
    },
    'quantization': {
      title: 'Quantization (PQ)',
      body: '<p>Compressing vectors themselves — product quantization splits each vector into ' +
        'sub-vectors and replaces each with a small codebook id, shrinking 1536 floats to a ' +
        'few dozen bytes. Distances are computed on codes, slightly lossy. Combined with IVF ' +
        '(IVF-PQ), it’s how billion-vector indexes fit in RAM.</p>',
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
          `neighbors living in clusters you didn't probe. More probe, fewer rings.`;
      } else if (mode !== 'exact') {
        msg.innerHTML = `Recall 1.00 with ${comparisons} of ${N} comparisons — this query sat safely inside its probed clusters.`;
      } else {
        msg.innerHTML = `Exact: all ${N} points compared, the true top-10 in green. The baseline.`;
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
        note: `no top-layer neighbor of ${cur} is closer — drop to the street layer` });
    }
    STEPS.push({ layer: 0, at: cur, done: true,
      note: `no street neighbor improves — ${cur} is the answer (${comparisons} distance computations vs 12 for brute force)` });
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

    let out = `<text x="6" y="20" class="hn-band">highways (layer 1)</text>` +
              `<text x="6" y="158" class="hn-band">streets (layer 0)</text>`;
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
