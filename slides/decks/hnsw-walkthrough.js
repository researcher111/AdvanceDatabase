/* Lecture 11: connect vector positions to a navigable graph before showing layers.
 * Coordinates and links are a small teaching example, not an HNSW build trace.
 */
(function () {
  'use strict';
  const deck = window.COURSE_DECKS?.[11];
  if (!deck) return;
  const scene = deck.scenes.find(item => item.id === 'navigate-a-graph');
  if (!scene) throw new Error('Missing Lecture 11 graph scene.');
  const P = window.DeckViz.palette;
  const nodes = [
    { id: 'v0', x: 1, y: 1 }, { id: 'v1', x: 2, y: 2 }, { id: 'v2', x: 3, y: 1 },
    { id: 'v3', x: 6, y: 4 }, { id: 'v4', x: 7, y: 5 }, { id: 'v5', x: 9, y: 3 },
  ];
  const groups = [[0, 1, 2], [3, 4, 5]];
  const centroids = groups.map((members, index) => ({
    id: 'c' + index, members,
    x: members.reduce((sum, i) => sum + nodes[i].x, 0) / members.length,
    y: members.reduce((sum, i) => sum + nodes[i].y, 0) / members.length,
  }));
  const edges = [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5]];
  const upperNodes = [0, 2, 5], upperEdges = [[0, 2], [2, 5]];
  const query = { id: 'q', x: 7.2, y: 5.2 };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  window.HNSWWalkthrough = { nodes, centroids, edges, upperNodes, upperEdges, query, distance };

  const labels = ['Start with vector positions', 'Choose neighbor links', 'Overlay the graph', 'Choose upper-layer nodes', 'Entry', 'Upper hop', 'Long-range hop', 'Descend', 'Local hop', 'More candidates'];
  const captions = [
    'Start with six vectors on a 2D plot. IVF groups them around centers; HNSW links the vectors themselves.',
    'When adding v4, search the existing graph for candidates. Keep a few useful neighbor links.',
    'Overlay the saved links on the same points. Each node stores the IDs of neighbors it can visit.',
    'Some of the same vectors also appear in a sparse upper layer. They are chosen randomly, not averaged.',
    'Redraw the same links as layers. Start at v0 in the upper layer and compare it with the query.',
    'Follow the upper-layer link from v0 to v2. Its vector is closer to the query.',
    'Follow the longer upper-layer link from v2 to v5 to reach the query’s region.',
    'Move from upper-layer v5 to the same v5 below. This changes layers, not vectors.',
    'From v5, follow the saved link to v4. Its vector is closer to the query.',
    'Search can explore several candidates. Increase ef_search, then measure the work and recall.',
  ];
  const t = (d, key, x, y, value, size = 24, color = P.ink, anchor = 'middle', weight = 500) => d.text(key, x, y, value, size, color, anchor, weight);
  const point = node => ({ x: 130 + node.x * 60, y: 590 - node.y * 60 });
  const rowX = [200, 365, 530, 695, 860, 1100];
  const edgeKey = (prefix, a, b) => 'hw-' + prefix + '-' + a + '-' + b;
  function panel(d, title, lines) {
    d.rect('hw-panel', 815, 229, 390, 366, P.white, P.line, 8, 2);
    t(d, 'hw-panel-title', 840, 261, title, 26, P.green, 'start', 650);
    lines.forEach((line, i) => t(d, 'hw-panel-line-' + i, 840, 309 + 39 * i, line, 22, P.ink, 'start'));
  }
  function foot(d, value) { t(d, 'hw-foot', 640, 643, value, 21, P.muted); }
  function axes(d) {
    d.line('hw-x-axis', 130, 590, 755, 590, P.line, 2);
    d.line('hw-y-axis', 130, 590, 130, 216, P.line, 2);
    [0, 5, 10].forEach(value => t(d, 'hw-x-tick-' + value, 130 + value * 60, 608, String(value), 18, P.muted));
    [2, 4, 6].forEach(value => t(d, 'hw-y-tick-' + value, 107, 590 - value * 60, String(value), 18, P.muted));
    t(d, 'hw-x-label', 771, 590, 'x', 22, P.muted);
    t(d, 'hw-y-label', 130, 202, 'y', 22, P.muted);
  }
  function plot(d, step) {
    axes(d);
    if (step === 0) {
      centroids.forEach(center => {
        const p = point(center);
        center.members.forEach(i => {
          const n = point(nodes[i]);
          d.line('hw-assignment-' + i, n.x, n.y, p.x, p.y, P.line, 2, '5 6');
        });
        d.path('hw-centroid-' + center.id, `M ${p.x} ${p.y - 9} L ${p.x + 9} ${p.y} L ${p.x} ${p.y + 9} L ${p.x - 9} ${p.y} Z`, P.orange, P.orange, 2);
        t(d, 'hw-centroid-label-' + center.id, p.x + 20, p.y + (center.id === 'c0' ? -4 : 3), center.id, 23, P.orange, 'start', 650);
      });
      panel(d, 'The IVF view', [
        'Circles: stored vectors', 'Diamonds: group averages',
        'c0 = (2.00, 1.33)', 'c1 = (7.33, 4.00)',
        'HNSW will link the circles.', 'Its nodes are not centers.',
      ]);
    } else {
      const shownEdges = step === 1 ? edges.filter(([a, b]) => a === 4 || b === 4) : edges;
      shownEdges.forEach(([a, b]) => {
        const from = point(nodes[a]), to = point(nodes[b]);
        d.line(edgeKey('base-edge', a, b), from.x, from.y, to.x, to.y, step === 1 ? P.green : P.line, step === 1 ? 4 : 3);
      });
      if (step === 1) {
        panel(d, 'Choose links for v4', [
          'Candidate', 'v3: kept', 'v5: kept', 'v2: farther',
          'Favor nearby candidates', 'and useful directions.', 'Illustrative choice of 2 links',
        ]);
        t(d, 'hw-distance-heading', 1178, 309, 'Distance', 22, P.ink, 'end');
        [3, 5, 2].forEach((i, row) => t(d, 'hw-candidate-distance-' + i, 1178, 348 + row * 39, distance(nodes[4], nodes[i]).toFixed(2), 22, row < 2 ? P.green : P.muted, 'end', 650));
      } else if (step === 2) {
        panel(d, 'Store neighbors by ID', [
          'v4 → [v3, v5]', 'A line is a saved link.',
          'Follow it to compare a', 'neighbor with the query.',
          'Only selected pairs link.', 'This is an illustrative graph.',
        ]);
      } else {
        upperEdges.forEach(([a, b]) => {
          const from = point(nodes[a]), to = point(nodes[b]);
          d.line(edgeKey('upper-edge', a, b), from.x, from.y, to.x, to.y, P.orange, 4);
        });
        panel(d, 'Sparse upper layer', [
          'Same nodes: v0, v2, v5', 'Orange: upper-layer links',
          'Upper membership is random.', 'Upper links span the plot.',
          'No centroid is a node.', 'Next: redraw these as layers.',
        ]);
      }
    }
    nodes.forEach((node, i) => {
      const p = point(node), selected = step === 1 && [3, 4, 5].includes(i);
      d.circle('hw-node-' + node.id, p.x, p.y, 13, selected ? P.greenLight : P.white, P.green, selected ? 3 : 2);
      const label = i === 3 ? [p.x - 25, p.y - 25] : i === 5 ? [p.x + 42, p.y] : [p.x, p.y + (i === 0 || i === 2 ? 39 : -26)];
      t(d, 'hw-node-label-' + node.id, label[0], label[1], node.id, 23, P.ink, 'middle', 650);
      if (step === 3 && upperNodes.includes(i)) d.circle('hw-upper-' + node.id, p.x, p.y, 21, 'none', P.orange, 3);
    });
    foot(d, 'Toy 2D vectors · Euclidean distance = √(Δx² + Δy²) · illustrative links');
  }
  function layered(d, step) {
    const upperY = 300, baseY = 480;
    t(d, 'hw-layer1', 68, upperY, 'layer 1', 26, P.muted, 'start', 650);
    t(d, 'hw-layer0', 68, baseY, 'layer 0', 26, P.muted, 'start', 650);
    upperNodes.forEach(i => d.line('hw-same-node-' + i, rowX[i], upperY + 23, rowX[i], baseY - 18, P.line, 2, '6 6'));
    edges.forEach(([a, b]) => {
      const x = rowX[a], end = rowX[b], active = step >= 8 && a === 4 && b === 5;
      const color = active ? P.green : P.line, width = active ? 4 : 3;
      if (b - a > 1) d.path(edgeKey('base-edge', a, b), `M ${x} ${baseY} Q ${(x + end) / 2} ${baseY - 112} ${end} ${baseY}`, 'none', color, width);
      else d.line(edgeKey('base-edge', a, b), x, baseY, end, baseY, color, width);
    });
    upperEdges.forEach(([a, b], i) => d.line(edgeKey('upper-edge', a, b), rowX[a], upperY, rowX[b], upperY, step >= 5 + i ? P.orange : P.line, step >= 5 + i ? 4 : 3));
    const upperActive = step === 4 ? 0 : step === 5 ? 2 : 5;
    nodes.forEach((node, i) => {
      const active = (step === 7 && i === 5) || (step >= 8 && i === 4);
      const candidate = step === 9 && [3, 4, 5].includes(i);
      if (candidate) d.circle('hw-candidate-' + i, rowX[i], baseY, 29, 'none', P.green, 3);
      d.circle('hw-node-' + node.id, rowX[i], baseY, 18, active ? P.greenLight : P.white, P.green, active ? 3 : 2);
      t(d, 'hw-node-label-' + node.id, rowX[i], baseY + 43, node.id, 24, P.ink, 'middle', 650);
      if (upperNodes.includes(i)) {
        d.circle('hw-upper-' + node.id, rowX[i], upperY, 20, i === upperActive ? P.orangeLight : P.white, P.orange, i === upperActive ? 4 : 3);
        t(d, 'hw-upper-label-' + node.id, rowX[i], upperY - 38, node.id, 24, P.ink, 'middle', 650);
      }
    });
    if (step >= 7) d.arrow('hw-descend', rowX[5] + 43, upperY + 16, rowX[5] + 43, baseY - 18, P.orange, 3);
    const current = step === 4 ? 0 : step === 5 ? 2 : step <= 7 ? 5 : 4;
    t(d, 'hw-query-coordinates', 387, 578, 'Query q = (7.2, 5.2)', 24, P.ink);
    t(d, 'hw-query-distance', 906, 578, 'distance(q, v' + current + ') = ' + distance(query, nodes[current]).toFixed(2), 24, P.green, 'middle', 650);
    t(d, 'hw-vertical-key', 640, 611, 'Dashed vertical lines: the same vector in two layers', 21, P.muted);
    foot(d, 'Same graph redrawn as rows · horizontal spacing here does not represent distance');
  }

  Object.assign(scene, {
    title: 'Build links, then navigate the graph', kind: 'visual', clarityNative: true,
    states: labels, steps: labels.length,
    draw(d, step) { if (step < 4) plot(d, step); else layered(d, step); },
    teaching: {
      idea: 'HNSW stores links between selected vector neighbors, then uses sparse upper layers and a denser base layer to find candidates for a query.',
      question: 'What does a graph link connect, and how does the search use it?',
      answer: 'A link connects two stored vector IDs. It allows the search to visit a neighbor and compare that neighbor’s vector with the query. Centroids are not HNSW nodes. Upper layers contain a random subset of the same stored vectors.',
      builds: [
        'Begin with the familiar IVF view. The six circles are explicit 2D teaching vectors; the diamonds are the means of vectors v0/v1/v2 and v3/v4/v5. Compute c0 = (2, 4/3) and c1 = (22/3, 4). The axes use equal scales. These coordinates are separate from the earlier IVF miss example. Explain that HNSW will connect the stored vectors themselves; it does not navigate these centroids. Real embeddings usually have many more than two dimensions, and a 2D projection need not preserve their distances.',
        'Illustrate candidate selection when inserting v4. In HNSW, construction searches the existing graph for candidates, then keeps a bounded number of neighbor links. For this 2D example, distances from v4 to v3, v5, and v2 are sqrt(2), sqrt(8), and sqrt(32). The illustrated choice keeps v3 and v5. Nearby candidates are favored, while the diversity heuristic can retain useful directions rather than blindly keeping the exact nearest k. The distances are computed from the coordinates; this selected graph is illustrative, not a recorded execution of the full construction algorithm. Construction can also add reciprocal links and prune existing neighbor lists.',
        'Keep every circle at the same plotted position and overlay the stored base-layer links. Read v4’s neighbor list as IDs v3 and v5. A search that visits v4 can use those IDs to load and score those vectors. Lines show navigable neighbor relationships; the drawing does not mean that every nearby pair is linked. Each shown edge is treated as bidirectional in this small example; real neighbor lists can become asymmetric after pruning.',
        'Highlight v0, v2, and v5 again in orange. HNSW assigns random maximum levels during construction, producing nested subsets of the same vector IDs. Upper nodes are not group means or representative centroids. The orange upper-layer links are separate adjacency lists, so the longer link v2–v5 can exist above even though it is absent at the base layer. The next build redraws these same IDs and links in rows; only their layout changes.',
        'Point out that v0, v2, and v5 appear in both rows. Solid lines connect neighbors within a layer. A dashed vertical line joins two drawings of the same vector; it is not a neighbor edge. Curved base links avoid passing through unrelated nodes. Horizontal spacing no longer represents distance. Start at upper-layer v0 and compute its distance to q = (7.2, 5.2): approximately 7.49.',
        'Follow the actual stored upper-layer edge v0–v2. Distance to q decreases from approximately 7.49 to 5.94. Query distances still use the original coordinates, not the row positions. Explain greedy progress at the upper layer without implying that each hop halves the distance.',
        'Follow the upper-layer edge v2–v5. Distance to q decreases to approximately 2.84. The sparse layer can cross a larger region with one link. This teaching route supplies no guarantee of finding the nearest vector or of logarithmic worst-case time.',
        'Descend at v5. Its ID, stored vector, and distance to q stay exactly the same. Search continues from that vector with the base layer’s neighbor list, here v3 and v4. A layer change is not an edge to a different vector.',
        'Follow the base-layer edge v5–v4. The query distance decreases to approximately 0.28. Full HNSW maintains candidate and retained-result sets at the base layer; this one highlighted route explains navigation rather than replacing that search procedure.',
        'Highlight candidate nodes v3, v4, and v5. ef_search controls the breadth of the candidate search at query time; it is not a hop count or a promise to evaluate exactly that many nodes. Exploring more candidates can improve recall at greater cost. Measure comparisons, latency, and recall against the exact-search baseline; the sketch itself is not an evaluation.',
      ],
      checks: [
        { question: 'Which objects become HNSW nodes: circles or diamonds?', answer: 'The circles: stored vectors v0 through v5. The diamonds are IVF group averages, not HNSW nodes.' },
        { question: 'Why show distances before drawing the links?', answer: 'Construction searches for candidate neighbors and selects a bounded set using vector distances and a diversity heuristic. The v4 example keeps v3 and v5 with distances 1.41 and 2.83.' },
        { question: 'What does the line between v4 and v5 store?', answer: 'A neighbor relationship by vector ID. It lets search visit the neighbor and compare its vector with the query.' },
        { question: 'Are upper-layer nodes centroids?', answer: 'No. They are randomly selected members of the same stored-vector set. Here they are v0, v2, and v5.' },
        { question: 'Does a dashed vertical line connect two different vectors?', answer: 'No. It joins the same vector ID drawn in two layers. Solid links within a layer connect different neighbor vectors.' },
        { question: 'Does distance use the spacing of this row diagram?', answer: 'No. It uses the original vector coordinates. The row layout only makes the layer connections readable.' },
        { question: 'Must an upper-layer edge also exist in the base layer?', answer: 'No. Layers store their own neighbor lists. This example has v2–v5 in the upper layer but not in the base layer.' },
        { question: 'What changes when we descend at v5?', answer: 'The layer and the neighbor list available for navigation. The vector and its distance to the query stay the same.' },
        { question: 'Is the highlighted route the complete HNSW search algorithm?', answer: 'No. It illustrates movement through links. Base-layer search maintains and explores candidate sets.' },
        { question: 'Does ef_search specify an exact number of hops?', answer: 'No. It controls search breadth. Evaluate the actual work, latency, and recall for the chosen setting.' },
      ],
      context: 'Six hand-chosen 2D vectors and illustrative bidirectional links connect geometry, adjacency lists, and layered navigation. Exact Euclidean distances are computed from these coordinates. Real embeddings have many dimensions, graph construction searches and prunes candidates, and neighbor lists can be asymmetric. Random layer membership and per-layer neighbor lists distinguish HNSW from centroid-based IVF.',
      reference: 'Malkov and Yashunin, Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs, sections 3–4 and Algorithms 1, 4, 5. HNSWlib hnswalg.h: getNeighborsByHeuristic2 and mutuallyConnectNewElement.',
    },
  });
  delete scene.term;
  delete scene.definition;
  delete scene.traceId;
  scene.sources = Array.from(new Set([
    ...(scene.sources || []),
    'https://arxiv.org/abs/1603.09320',
    'https://github.com/nmslib/hnswlib/blob/master/hnswlib/hnswalg.h',
  ]));
  window.CourseClarityCaptions[11]['navigate-a-graph'] = captions;
})();
