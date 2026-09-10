/* Lecture 12 — RAG as a systems problem · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'hashed-bag-of-words': {
      title: 'Hashed bag-of-words',
      body: "<p>The lab represents text by counting words in a fixed-width vector. A hash selects the position incremented for each word, then the nonzero vector is normalized. The method needs no training or vocabulary table. It relies on word overlap and can also match unrelated words that hash to the same position. Increasing DIM reduces collisions but does not solve vocabulary mismatch.</p>",
    },
    'lost-in-the-middle': {
      title: 'Lost in the middle',
      body: "<p>Liu et al. found that the tested language models used evidence less reliably when it appeared in the middle of a long context than at the beginning or end. This makes passage selection and ordering worth evaluating. Sending more retrieved text does not automatically improve an answer.</p>",
    },
    'eval-set': {
      title: 'Eval set',
      body: "<p>A collection of questions paired with labels identifying relevant source documents or passages. Run each retrieval configuration on the same questions and compare its results with those labels. This makes configurations comparable and exposes failure cases. Keep separate held-out questions for the final evaluation. The lab supplies 12 questions; the project requires its own set.</p>",
    },
    'mrr': {
      title: 'MRR (mean reciprocal rank)',
      body: "<p>Mean reciprocal rank measures how early the first relevant result appears. For each question, take 1 divided by that result’s rank: 1.0 for rank 1, 0.5 for rank 2, and about 0.33 for rank 3. Use zero when no relevant result appears in the evaluated list. Average these values across the questions. Unlike hit@k, MRR distinguishes a relevant result at rank 1 from one at rank 3.</p>",
    },
    'hit-at-k': {
      title: 'hit@k',
      body: "<p>The fraction of evaluation questions whose first k results include at least one labeled relevant source. It measures whether evidence was retrieved within the cutoff, without rewarding a higher rank inside that cutoff. The lab uses k = 3 and requires hit@3 of at least 0.90.</p>",
    },
    'parametric': {
      title: 'Parametric knowledge',
      body: "<p>Information represented in a model’s learned parameters. It differs from evidence supplied in the prompt for a particular question. Learned parameters do not provide a reliable source lookup or citation trail. RAG supplies retrieved passages so answers can be checked against explicit sources.</p>",
    },
    'context-window': {
      title: 'Context window',
      body: "<p>The model’s token limit for the context of a request. Inputs, retrieved passages, and the generated response must fit the model’s applicable limits. Longer context can increase processing cost and latency. Choose how much evidence to include by measuring answer quality as well as whether the text fits.</p>",
    },
    'stale-cache': {
      title: 'Cache invalidation',
      body: "<p>A cached or derived record becomes stale when the source changes without a corresponding update. In RAG, an old chunk or embedding can keep returning outdated evidence. Track document and embedding versions, update affected records, and coordinate the index change with the source update.</p>",
    },
    'bm25': {
      title: 'BM25',
      body: "<p>A keyword-ranking function based on query-term frequency, document length, and how common each term is across documents. It is useful for exact terms such as identifiers and error codes, while learned embeddings can help with paraphrases. PostgreSQL’s built-in full-text search has its own ranking functions; it does not implement BM25 by default.</p>",
    },
    'reranker': {
      title: 'Reranker',
      body: "<p>A second-stage scorer that reorders a shortlist of retrieved candidates. A model can read each question and chunk together to assess relevance more closely than a first-stage similarity score. Applying it to a shortlist limits the cost. Evaluate whether the changed ranking improves retrieval and answers.</p>",
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- micro-rag core (parity-tested against micro_rag.py) ---------------- */
/* MD5 gives word→dimension parity with Python's hashlib.md5. */
function md5hex(str) {
  function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
  function add(a, b) { return (a + b) | 0; }
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
             5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
             4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
             6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const bytes = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((bitLen / Math.pow(2, 8 * i)) & 0xff);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < bytes.length; off += 64) {
    const M = [];
    for (let j = 0; j < 16; j++)
      M[j] = bytes[off + 4 * j] | (bytes[off + 4 * j + 1] << 8) |
             (bytes[off + 4 * j + 2] << 16) | (bytes[off + 4 * j + 3] << 24);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16)      { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D;          g = (3 * i + 5) % 16; }
      else             { F = C ^ (B | ~D);       g = (7 * i) % 16; }
      F = add(add(add(F, A), K[i]), M[g]);
      A = D; D = C; C = B; B = add(B, rol(F, S[i]));
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D);
  }
  function hex(n) {
    let s = '';
    for (let i = 0; i < 4; i++) s += ((n >>> (8 * i)) & 0xff).toString(16).padStart(2, '0');
    return s;
  }
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

const RAG = {
  DIM: 2048,
  STOP: null,
  chunks: null,
  vectors: null,
  wordDim(word) {
    // int(md5, 16) % 2048 keeps only the low 11 bits = last 3 hex chars.
    return parseInt(md5hex(word).slice(-3), 16) % RAG.DIM;
  },
  embed(text) {
    const counts = {};
    for (const w of (text.toLowerCase().match(/[a-z]+/g) || [])) {
      if (RAG.STOP.has(w)) continue;
      counts[w] = (counts[w] || 0) + 1;
    }
    const v = new Float64Array(RAG.DIM);
    for (const w in counts) v[RAG.wordDim(w)] += 1.0 / (1.0 + Math.log(counts[w]));
    let norm = 0;
    for (let i = 0; i < RAG.DIM; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1.0;
    for (let i = 0; i < RAG.DIM; i++) v[i] /= norm;
    return v;
  },
  dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; },
  build(chunks) {
    RAG.chunks = chunks;
    RAG.vectors = chunks.map(c => RAG.embed(c.text));
  },
  retrieve(question, k) {
    const qv = RAG.embed(question);
    const scored = RAG.vectors.map((v, i) => [RAG.dot(qv, v), i]);
    scored.sort((x, y) => y[0] - x[0] || x[1] - y[1]);
    return scored.slice(0, k).map(([score, i]) => Object.assign({ score }, RAG.chunks[i]));
  },
  buildPrompt(question, retrieved) {
    const lines = ['Answer using ONLY the sources below. Cite as [doc_id].', ''];
    for (const c of retrieved) lines.push('[' + c.doc + '] ' + c.title + ': ' + c.text);
    lines.push('');
    lines.push('Question: ' + question);
    return lines.join('\n');
  },
};

const RAG_DATA = {"chunks":[{"doc":"blocks","title":"Blocks and pages","text":"Disks move data in fixed-size blocks because a storage trip costs the same regardless of size. microdb uses 4 KB blocks; a page is the in-memory copy of a block. Block number k of a file begins at byte k times the block size. Reading whole blocks makes neighboring data nearly free to fetch."},{"doc":"fsync","title":"Durability and fsync","text":"A normal write only reaches the operating system's cache; fsync forces bytes to durable storage and costs ten to a thousand times more. Databases ration fsync carefully. Lab 1 measured buffered versus durable writes per second, and the ratio motivates the entire design of transaction logging."},{"doc":"bufferpool","title":"The buffer pool","text":"The buffer pool is the database's own cache: fixed frames each holding one block, with a pin and unpin protocol so pages in use are never evicted. LRU chooses eviction victims by recency. Databases build their own pool rather than trusting the OS cache because they need pinning and control over write ordering for recovery."},{"doc":"cliff","title":"The sequential flooding cliff","text":"A sequential scan through an LRU pool one frame smaller than the file achieves a zero percent hit rate: each block is evicted just before it is needed again. Real engines defend with ring buffers or midpoint insertion. Hot-set workloads, whose working set fits the pool, hit above ninety percent."},{"doc":"slots","title":"Record slots and layout","text":"Rows live in fixed-size slots: a four-byte in-use flag then fields at offsets computed from the schema. Fixed slots make addressing arithmetic, updates in-place, and deletes a flag flip. The waste inside reserved space is internal fragmentation, the deliberate rent paid for O(1) access."},{"doc":"tombstone","title":"Tombstones and deletion","text":"In microdb, deleting a record marks its slot empty; a later insert can reuse the slot. The old bytes may remain until overwritten. Production engines use different deletion schemes, including MVCC versions or tombstones, and may need vacuum or compaction to reclaim space."},{"doc":"rid","title":"Record identifiers","text":"A RID is a row's physical address: block number and slot number. In microdb, the address stays stable while the row exists. An index maps field values to RIDs and must remove stale entries when a row is deleted or its slot is reused."},{"doc":"catalog","title":"The system catalog","text":"The catalog stores every table's schema and layout in ordinary tables like field_catalog. The catalog's own layout is hardcoded at startup to break the circular dependency, a move called bootstrapping. In Postgres the psql backslash-d command is just a catalog query."},{"doc":"iterator","title":"The iterator model","text":"Every query operator implements before_first, next, get_val, has_field, and close. Pipelined scans pass rows on demand with little buffering. Sorts, hash joins, and some aggregations retain data, so the iterator interface alone does not guarantee constant memory."},{"doc":"product","title":"Products and joins","text":"A join is a cartesian product filtered by a predicate. The nested-loop product rewinds its right input for every left row, so pairing costs the product of the table sizes. Hash joins and merge joins exist to avoid building pairs that will be discarded."},{"doc":"pushdown","title":"Predicate pushdown","text":"Filtering each input before a join instead of filtering joined pairs afterward can cut work by orders of magnitude with an identical answer, guaranteed by relational algebra. The same idea reaches into Parquet files as chunk skipping and across clusters in distributed engines."},{"doc":"parsing","title":"Parsing SQL","text":"A lexer turns characters into tokens; a recursive-descent parser turns tokens into a description, one method per grammar rule using peek, next, match, and expect. Parsing to plain data lets the planner be a separate, swappable stage, and expect() produces helpful errors by construction."},{"doc":"planner","title":"Planning and naivety","text":"The naive planner builds table scans, folds products left to right, then adds one select and one project. It is always correct and often slow, because it never pushes filters down; doing that safely requires knowing which fields each term references and how many rows will survive."},{"doc":"btree","title":"B+ trees","text":"A B+ tree keeps sorted keys in leaves linked left to right, with internal nodes holding routing keys. A full node splits at its middle key, which is copied up from a leaf or moved up from an internal node; the root splitting grows the tree and keeps every leaf at the same depth."},{"doc":"btree","title":"B+ trees","text":"Fan-out around two hundred makes a hundred-million-row tree four levels tall."},{"doc":"selectivity","title":"Selectivity and index choice","text":"Selectivity is the fraction of rows a predicate keeps. Indexes shine on selective predicates like an equality on a unique id and lose to a plain scan on unselective ones, where random jumps cost more than one smooth read. Optimizers estimate selectivity from statistics to choose."},{"doc":"wal","title":"Write-ahead logging","text":"In this lab's undo log, the old value must reach durable storage before the changed data page can. Commit flushes data pages before syncing the commit record. This FORCE/STEAL design needs earlier log and page syncs as well as the final commit sync."},{"doc":"recovery","title":"Crash recovery","text":"Recovery reads the log newest first, so each transaction's fate is known before its writes are encountered. Writes of unfinished transactions are undone by restoring old values. Recovery must be idempotent because a crash can interrupt recovery itself; rollback receipts make reruns skip cleanly."},{"doc":"locks","title":"Two-phase locking","text":"Shared locks allow many readers; exclusive locks allow one writer and no readers. Strict two-phase locking holds all locks until commit, which guarantees serializability and prevents dirty reads, at the price of waiting and deadlocks, which engines break by aborting a victim."},{"doc":"mvcc","title":"Multi-version concurrency control","text":"Updates create new row versions. A snapshot determines which committed versions a reader can see: per statement at READ COMMITTED, or per transaction at REPEATABLE READ in PostgreSQL. Ordinary snapshot reads do not block row writers, but explicit locks can conflict. Vacuum reclaims versions no snapshot needs."},{"doc":"columnar","title":"Columnar storage","text":"Analytics touches all rows but few columns, so column stores keep each column's values contiguous: queries read only named columns, and runs of same-typed values compress with run-length and dictionary encoding. Row stores win point lookups; column stores win scans."},{"doc":"parquet","title":"Parquet and partitioning","text":"Parquet stores columns in chunks with min-max statistics so engines skip data without reading it. Hive partitioning puts the partition column in folder names like month equals twelve, letting a filter skip whole directories. DuckDB reports scanning one of twelve files."},{"doc":"vectors","title":"Vector search and IVF","text":"Embeddings turn similarity into geometry: nearest neighbors by cosine. Exact search compares against everything; IVF clusters vectors with k-means and probes only the lists nearest the query. The probe parameter trades recall against comparisons, and recall at k measures what fraction of true neighbors were found."},{"doc":"warehouse","title":"Cloud warehouses","text":"Cloud warehouses separate storage from compute: data rests in object storage while query clusters spin up on demand and bill by bytes scanned. Naming only needed columns and partitioning on filtered keys directly reduces cost, because the columnar lessons become line items."},{"doc":"lakehouse","title":"The lakehouse","text":"A lakehouse adds a transactional metadata layer such as Delta or Iceberg over Parquet files in object storage: a manifest records which files form the table, enabling ACID commits, schema evolution, and time travel. Structurally it is a catalog plus a log conferring table-hood on a lake."}],"stop":["a","an","and","are","as","at","be","because","by","can","each","for","from","has","have","how","in","is","it","its","like","more","most","no","not","of","on","one","only","or","so","than","that","the","their","them","then","there","these","they","this","to","was","what","when","where","which","while","who","why","will","with","you","your"]};

/* ---------------- Ask-the-course widget ---------------- */
(function () {
  const input = document.getElementById('ask-input');
  if (!input || !RAG_DATA) return;
  RAG.STOP = new Set(RAG_DATA.stop);
  RAG.build(RAG_DATA.chunks);
  const results = document.getElementById('ask-results');
  const promptBox = document.getElementById('ask-prompt');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function run(question) {
    if (!question.trim()) return;
    const top = RAG.retrieve(question, 3);
    const maxScore = Math.max(top[0].score, 1e-9);
    results.innerHTML = top.map((c, rank) =>
      '<div class="ask-hit' + (c.score < 0.12 ? ' weak' : '') + '">' +
      '<div class="ask-hit-head"><span class="ask-rank">' + (rank + 1) + '</span>' +
      '<span class="ask-doc">[' + esc(c.doc) + ']</span>' +
      '<span class="ask-title">' + esc(c.title) + '</span>' +
      '<span class="ask-bar-track"><span class="ask-bar" style="width:' +
      (100 * c.score / maxScore).toFixed(1) + '%"></span></span>' +
      '<span class="ask-score">' + c.score.toFixed(3) + '</span></div>' +
      '<div class="ask-text">' + esc(c.text) + '</div></div>'
    ).join('') +
    (top[0].score < 0.12
      ? '<div class="ask-warn">Best score ' + top[0].score.toFixed(2) +
        ' — weak retrieval. No shared content words: this is the synonym wall.</div>'
      : '');
    promptBox.textContent = RAG.buildPrompt(question, top);
  }
  document.getElementById('ask-go').addEventListener('click', () => run(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(input.value); });
  document.querySelectorAll('.ask-presets .btn').forEach(btn =>
    btn.addEventListener('click', () => { input.value = btn.dataset.q; run(btn.dataset.q); }));
})();

/* ---------------- Chunk-size dial ---------------- */
(function () {
  const slider = document.getElementById('ck-slider');
  if (!slider) return;
  const out = document.getElementById('ck-readout');
  const val = document.getElementById('ck-val');
  // Measured on the reference solution (deterministic): chunk_corpus(max_words=…) + eval set.
  const TABLE = [
    { mw: 10, chunks: 64, hit3: 0.83, mrr: 0.74, note: 'sentence fragments — sharp but starved of shared words' },
    { mw: 20, chunks: 63, hit3: 0.83, mrr: 0.74, note: 'still fragmentary; a chunk rarely holds a whole claim' },
    { mw: 30, chunks: 51, hit3: 0.92, mrr: 0.71, note: 'chunks start holding whole claims; rank still suffers' },
    { mw: 45, chunks: 34, hit3: 0.83, mrr: 0.72, note: 'awkward middle: splits land mid-topic on this corpus' },
    { mw: 60, chunks: 25, hit3: 0.92, mrr: 0.86, note: "the lab's setting — nearly one chunk per document" },
    { mw: 90, chunks: 24, hit3: 1.00, mrr: 0.89, note: 'whole documents — optimal HERE because each doc is one topic' },
  ];
  function bar(label, x, cls) {
    return `<div class="dl-row"><span>${label}</span>` +
      `<span class="dl-track"><span class="dl-bar ${cls}" style="width:${(100 * x).toFixed(1)}%"></span></span>` +
      `<span class="dl-val">${x.toFixed(2)}</span></div>`;
  }
  function render() {
    const row = TABLE[+slider.value];
    val.textContent = row.mw;
    out.innerHTML = bar('hit@3', row.hit3, 'recall') + bar('MRR', row.mrr, 'work') +
      `<div class="dl-row"><span></span><span style="font-family:var(--sans);font-size:12px;color:var(--ink-mute)">` +
      `${row.chunks} chunks · ${row.note}</span><span></span></div>`;
  }
  slider.addEventListener('input', render);
  render();
})();

/* ---------------- Pipeline flow ---------------- */
(function () {
  const flow = document.getElementById('pipe-flow');
  if (!flow) return;
  const detail = document.getElementById('pipe-detail');

  const STAGES = [
    { name: 'Chunk', built: true, io: 'documents → retrievable units',
      you: "Choose retrievable text units and keep their source ids, titles, and positions. These records need enough context to be useful when retrieved on their own.",
      thursday: "chunk_corpus() — provided; use the slider to compare chunk sizes" },
    { name: 'Embed', built: true, io: 'text → unit vector',
      you: "Represent each chunk as a vector. The lab normalizes nonzero vectors so dot products give cosine scores. A new embedding model requires rebuilding the stored vectors.",
      thursday: "embed() — provided; evaluate a learned model for your project" },
    { name: 'Index', built: true, io: 'chunk vectors → ANN structure',
      you: "Build a searchable structure over the chunk vectors. The lab uses the provided BruteForceIndex at this corpus size; larger workloads can be compared with approximate indexes.",
      thursday: "BruteForceIndex — provided from Lab 9" },
    { name: 'Retrieve', built: true, io: 'question vector → top-k chunks',
      you: "Embed the question, search the index, and use each returned id to locate the corresponding chunk. Preserve the index-to-chunk mapping and result order.",
      thursday: "Retriever — implement and test with the evaluation set" },
    { name: 'Assemble + Generate', built: false, io: 'k chunks + question → prompt → answer',
      you: "Format the retrieved chunks with source labels, add the question, and send the prompt to the generator. In echo mode, inspect the prompt directly instead of calling a model.",
      thursday: "build_prompt — implement; answer() — provided" },
  ];

  let current = 0;
  function render() {
    flow.innerHTML = STAGES.map((s, i) =>
      (i ? '<span class="pipe-arrow">→</span>' : '') +
      `<button type="button" class="pipe-stage${s.built ? ' built' : ' new'}${i === current ? ' active' : ''}" data-i="${i}">` +
      `${s.name}<span class="pipe-io">${s.io}</span></button>`
    ).join('');
    const s = STAGES[current];
    detail.innerHTML =
      `<div class="pipe-d-head">${s.name} · ${s.built ? 'connects to earlier labs' : 'prompt assembly and generation'}</div>` +
      `<p>${s.you}</p>` +
      `<p class="pipe-d-thu">Thursday: <code>${s.thursday}</code></p>`;
    flow.querySelectorAll('.pipe-stage').forEach(b =>
      b.addEventListener('click', () => { current = +b.dataset.i; render(); }));
  }
  render();
})();
