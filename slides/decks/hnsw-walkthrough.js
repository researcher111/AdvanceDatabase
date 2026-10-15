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

  const labels = ['Plot the vectors', 'Select neighbor links', 'Show the graph links', 'Select upper-layer nodes', 'Start the search', 'Follow an upper-layer link', 'Follow the next link', 'Change layers', 'Follow a base-layer link', 'Search more candidates'];
  const captions = [
    'The plot shows six vectors. IVF groups vectors by centroid. HNSW stores links between selected vectors.',
    'To add v4, search the existing graph for candidate neighbors. Select a limited number of neighbor links.',
    'The lines show the saved links between vectors. Each node stores the IDs of neighbors that search can visit.',
    'A sparse upper layer contains some of the same vectors. HNSW selects upper-layer membership at random.',
    'The rows show the same nodes and links by layer. Start at upper-layer v0. Compare v0 with the query vector.',
    'Follow the upper-layer link from v0 to v2. Vector v2 is closer to the query vector.',
    'Follow the upper-layer link from v2 to v5. Vector v5 is closer to the query vector.',
    'Move from upper-layer v5 to base-layer v5. The layer changes. The vector stays the same.',
    'Follow the base-layer link from v5 to v4. Vector v4 is closer to the query vector.',
    'Search can explore several candidates. A larger ef_search can improve recall and increase work. Measure both effects.',
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
        'Circles: stored vectors', 'Diamonds: centroids',
        'c0 = (2.00, 1.33)', 'c1 = (7.33, 4.00)',
        'HNSW links selected vectors.', 'Centroids are not its nodes.',
      ]);
    } else {
      const shownEdges = step === 1 ? edges.filter(([a, b]) => a === 4 || b === 4) : edges;
      shownEdges.forEach(([a, b]) => {
        const from = point(nodes[a]), to = point(nodes[b]);
        d.line(edgeKey('base-edge', a, b), from.x, from.y, to.x, to.y, step === 1 ? P.green : P.line, step === 1 ? 4 : 3);
      });
      if (step === 1) {
        panel(d, 'Select links for v4', [
          'Candidate', 'v3: kept', 'v5: kept', 'v2: farther',
          'Select nearby candidates.', 'Keep useful directions.', 'Example: 2 selected links',
        ]);
        t(d, 'hw-distance-heading', 1178, 309, 'Distance', 22, P.ink, 'end');
        [3, 5, 2].forEach((i, row) => t(d, 'hw-candidate-distance-' + i, 1178, 348 + row * 39, distance(nodes[4], nodes[i]).toFixed(2), 22, row < 2 ? P.green : P.muted, 'end', 650));
      } else if (step === 2) {
        panel(d, 'Store neighbors by ID', [
          'v4 → [v3, v5]', 'A line is a saved link.',
          'Search compares neighbor', 'and query vectors.',
          'Only selected pairs have links.', 'This graph is an example.',
        ]);
      } else {
        upperEdges.forEach(([a, b]) => {
          const from = point(nodes[a]), to = point(nodes[b]);
          d.line(edgeKey('upper-edge', a, b), from.x, from.y, to.x, to.y, P.orange, 4);
        });
        panel(d, 'Sparse upper layer', [
          'Stored vectors: v0, v2, v5', 'Orange: upper-layer links',
          'Membership is random.', 'Upper links cross the plot.',
          'No centroid is a node.', 'Next: show the same layers.',
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
    foot(d, 'Example 2D vectors and links · Euclidean distance = √(Δx² + Δy²)');
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
    foot(d, 'Same graph in rows · horizontal spacing does not represent vector distance');
  }

  Object.assign(scene, {
    title: 'Build links, then search the graph', kind: 'visual', clarityNative: true,
    states: labels, steps: labels.length,
    draw(d, step) { if (step < 4) plot(d, step); else layered(d, step); },
    teaching: {
      idea: 'HNSW stores links between selected vector neighbors. Search follows sparse upper layers and then explores a denser base layer.',
      question: 'What does a graph link connect? How does search use the link?',
      answer: 'A link connects two stored vector IDs. Search uses the link to visit a neighbor and compare its vector with the query vector. Centroids are not HNSW nodes. Upper layers contain random subsets of the same stored vectors.',
      builds: [
        'The circles show six example vectors on axes with equal scales. The diamonds show their group means: c0 = (2, 4/3) and c1 = (22/3, 4). The groups contain v0/v1/v2 and v3/v4/v5. These coordinates differ from the earlier IVF example. HNSW connects stored vectors, not these centroids. Real embeddings usually have more dimensions, and a 2D projection can change their distances.',
        'HNSW searches the existing graph for candidates before it adds a vector. Construction selects a limited number of links, with nearby candidates and useful directions. Here, distances from v4 to v3, v5, and v2 are sqrt(2), sqrt(8), and sqrt(32). The example selects v3 and v5. These distances use the plotted coordinates, but the links do not record a complete HNSW construction run. Construction can also add reverse links and remove links from existing neighbor lists.',
        'Show the saved base-layer links at the same vector positions. Node v4 stores neighbor IDs v3 and v5. Search can use these IDs to load the neighbor vectors and compare them with the query vector. A line shows a selected neighbor relationship. Each link works in both directions in this example. Real neighbor lists can become asymmetric after construction removes some links.',
        'Highlight v0, v2, and v5 in orange. HNSW assigns a random maximum level to each vector during construction. Each upper layer contains a subset of the vectors in the layer below. Each layer stores its own neighbor lists. Thus, v2–v5 can exist in the upper layer without a corresponding base-layer link. The next step shows the same IDs and links in rows.',
        'Nodes v0, v2, and v5 appear in both rows. Solid lines connect neighbors in one layer, while dashed vertical lines connect drawings of the same vector. Curved base-layer links pass around unrelated nodes. Horizontal spacing does not represent vector distance. Start at upper-layer v0. Its distance to q = (7.2, 5.2) is approximately 7.49.',
        'Follow the saved upper-layer link v0–v2. The distance to q decreases from approximately 7.49 to 5.94. Distance calculations use the original vector coordinates, not the row positions. This greedy step reduces the distance. It does not imply that each step halves the distance.',
        'Follow the upper-layer link v2–v5. The distance to q decreases to approximately 2.84. This link crosses a larger region of the vector plot. This example path does not guarantee the nearest result. It also does not establish logarithmic worst-case time.',
        'Move to the base layer at v5. The vector ID, coordinates, and distance to q stay the same. Search now uses the base-layer neighbor list for v5. This list contains v3 and v4. A layer change does not move to a different vector.',
        'Follow the base-layer link v5–v4. The query distance decreases to approximately 0.28. HNSW maintains candidate and retained-result sets during base-layer search. This example path explains how search follows links. It does not show the complete search procedure.',
        'Highlight candidate nodes v3, v4, and v5. The ef_search setting controls search breadth, not the number of links followed or vectors evaluated. More candidates can improve recall and increase work. Measure comparisons and latency. Compare recall with the exact-search baseline. This diagram does not measure search quality.',
      ],
      checks: [
        { question: 'Which objects become HNSW nodes: circles or diamonds?', answer: 'The circles become nodes. They represent stored vectors v0 through v5. The diamonds represent IVF centroids.' },
        { question: 'How does HNSW select neighbor links?', answer: 'Construction searches for candidate neighbors. It uses vector distances and a diversity rule to select a limited set. This example keeps v3 and v5 at distances 1.41 and 2.83 from v4.' },
        { question: 'What does the line between v4 and v5 store?', answer: 'The line represents a saved neighbor ID. Search can use that ID to visit a neighbor and compare its vector with the query vector.' },
        { question: 'Are upper-layer nodes centroids?', answer: 'No. Upper-layer nodes come from the same stored vectors. HNSW selects their membership at random. This example uses v0, v2, and v5.' },
        { question: 'Does a dashed vertical line connect two different vectors?', answer: 'No. The dashed line joins two drawings of the same vector. Solid lines connect different neighbor vectors in one layer.' },
        { question: 'Does distance use the spacing of this row diagram?', answer: 'No. Distance calculations use the original vector coordinates. The rows make layer connections easier to see.' },
        { question: 'Must an upper-layer edge also exist in the base layer?', answer: 'No. Layers store their own neighbor lists. This example has v2–v5 in the upper layer but not in the base layer.' },
        { question: 'What changes when search moves to base-layer v5?', answer: 'The layer and available neighbor list change. The vector and its distance to the query vector stay the same.' },
        { question: 'Does the highlighted path show the complete HNSW search algorithm?', answer: 'No. The path shows how search follows links. Base-layer search maintains and explores candidate sets.' },
        { question: 'Does ef_search specify how many links search follows?', answer: 'No. The setting controls search breadth. Measure the work, latency, and recall for the selected setting.' },
      ],
      context: 'This example uses six manual 2D vectors and links that work in both directions. Euclidean distance calculations use the plotted coordinates. Real embeddings usually have many dimensions. HNSW construction searches candidate vectors and can remove links, which can produce asymmetric neighbor lists. HNSW uses random layer membership and separate neighbor lists for each layer. IVF uses centroid lists instead.',
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
