/* Lab 9 — microvector · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'brute-baseline': {
      title: 'Brute-force baseline',
      body: "<p>Exact search scores every stored vector and selects the top k. With fixed vector width, its scoring work grows linearly with the number of vectors. Keep it as the reference for recall and query cost. For a small corpus, it may already meet the application’s performance requirements.</p>",
    },
    'centroid': {
      title: 'Centroid',
      body: "<p>A representative vector for a cluster, formed from the mean of its assigned vectors. IVF stores a centroid for each list and compares the query with the centroids to choose which lists to search. A cluster’s centroid is only a summary, so a close vector can still belong to an unsearched list.</p>",
    },
    'nprobe': {
      title: 'nprobe / ef_search',
      body: "<p>The lab’s probe setting controls how many IVF lists are searched. FAISS calls this nprobe; pgvector uses ivfflat.probes. HNSW’s ef_search instead controls a graph-search candidate list. Both settings adjust search effort, but they control different operations and should be tuned by measurement.</p>",
    },
    'recall-at-k': {
      title: 'recall@k',
      body: "<p>Count how many of the exact top-k ids also appear in the approximate top-k result, then divide by k. Average the scores across evaluation queries. Average recall@10 of 0.95 means five exact neighbors were missed per ten queries on average, not that every query missed the same number.</p>",
    },
    'embedding-drift': {
      title: 'Embedding drift',
      body: "<p>If a model update changes its embedding space, old document vectors may be incompatible with new query vectors. Record the model version, rebuild corpus embeddings and their index, and switch query embedding to the matching version. Evaluate the new model rather than assuming the old search settings still work.</p>",
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
    { probe: 1, recall: 0.643, comps: 244 },
    { probe: 2, recall: 0.810, comps: 471 },
    { probe: 4, recall: 0.917, comps: 924 },
    { probe: 8, recall: 0.965, comps: 1756 },
    { probe: 16, recall: 0.997, comps: 3229 },
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
      `average exact neighbors missed per query: ${((1 - row.recall) * 10).toFixed(2)}` +
      `</span><span></span></div>`;
  }
  slider.addEventListener('input', render);
  render();
})();
