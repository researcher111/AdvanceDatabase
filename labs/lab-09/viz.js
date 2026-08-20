/* Lab 9 — microvector · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'brute-baseline': {
      title: 'Brute-force baseline',
      body: '<p>The exact search you keep around forever: compare against everything, O(n) ' +
        'per query, guaranteed right. Every ANN result is judged against it (recall@k is ' +
        '"fraction of the brute-force answer found"), and at small scale it is simply the ' +
        'correct engineering choice. The project spec requires it for both reasons.</p>',
    },
    'centroid': {
      title: 'Centroid',
      body: '<p>A cluster’s mean vector — k-means’s summary of a neighborhood. IVF stores one ' +
        'per list and routes queries by scoring them: cheap coarse geography before fine ' +
        'search. 20 centroids summarize 4,000 vectors the way 20 road signs summarize a ' +
        'city.</p>',
    },
    'nprobe': {
      title: 'nprobe / ef_search',
      body: '<p>The production names for this lab’s probe parameter — FAISS and pgvector call ' +
        'it nprobe (IVF), HNSW implementations call theirs ef_search. Same contract ' +
        'everywhere: more lists/frontier searched, higher recall, more work. Tuning it IS ' +
        'vector-database operations.</p>',
    },
    'recall-at-k': {
      title: 'recall@k',
      body: '<p>Of the true k nearest neighbors (per brute force), the fraction your index ' +
        'returned. The honesty metric of approximate search: 0.95 recall@10 means you ' +
        'typically miss half a neighbor per query. Distinct from the classifier recall of ' +
        'your ML courses — same word, same spirit, different denominator.</p>',
    },
    'embedding-drift': {
      title: 'Embedding drift',
      body: '<p>When the embedding model changes (new version, fine-tune), old vectors and ' +
        'new queries stop sharing a geometry — similarity across the gap is meaningless. ' +
        'Indexes must be rebuilt from re-embedded content: the operational cost that makes ' +
        'teams version their embedding models like schemas.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- The dial ---------------- */
(function () {
  const slider = document.getElementById('dl-probe');
  if (!slider) return;
  const out = document.getElementById('dl-readout');
  const val = document.getElementById('dl-val');
  // The reference solution's measured table (seeded, deterministic).
  const TABLE = [
    { probe: 1,  recall: 0.758, comps: 236 },
    { probe: 2,  recall: 0.885, comps: 471 },
    { probe: 4,  recall: 0.948, comps: 882 },
    { probe: 8,  recall: 0.985, comps: 1702 },
    { probe: 16, recall: 1.000, comps: 3284 },
    { probe: 20, recall: 1.000, comps: 4020 },
  ];
  const EXACT = 4000;

  function render() {
    const row = TABLE[+slider.value];
    val.textContent = row.probe;
    out.innerHTML =
      `<div class="dl-row"><span>recall@10</span>` +
      `<span class="dl-track"><span class="dl-bar recall" style="width:${(row.recall * 100).toFixed(1)}%"></span></span>` +
      `<span class="dl-val">${row.recall.toFixed(3)}</span></div>` +
      `<div class="dl-row"><span>comparisons/query</span>` +
      `<span class="dl-track"><span class="dl-bar work" style="width:${(100 * row.comps / EXACT).toFixed(1)}%"></span>` +
      `<span class="dl-mark" style="left:100%"></span></span>` +
      `<span class="dl-val">${row.comps.toLocaleString()} (${(EXACT / row.comps).toFixed(1)}x)</span></div>` +
      `<div class="dl-row"><span></span><span style="font-family:var(--sans);font-size:12px;color:var(--ink-mute)">` +
      `missing ~${Math.round((1 - row.recall) * 10)} of the true top-10 per query` +
      `</span><span></span></div>`;
  }
  slider.addEventListener('input', render);
  render();
})();
