/* Lab 10 — micro-rag · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'echo-mode': {
      title: 'Echo mode',
      body: "<p>The offline mode in which answer() returns the assembled prompt instead of requesting generated text. This lets you inspect the selected evidence and prompt format. The graded tests need no model connection. Configuring LLM_BASE_URL enables the provided model-call path.</p>",
    },
    'eval-set': {
      title: 'Eval set',
      body: "<p>Questions paired with labels identifying relevant documents or passages. The lab supplies 12 questions in corpus.py. Run each configuration against the same labels to compare hit@k and MRR. Generated answers need separate evaluation; retrieval metrics alone do not measure answer correctness.</p>",
    },
    'hashing-trick': {
      title: 'The hashing trick',
      body: "<p>Map each word to a vector position with md5(word) mod DIM. This uses a fixed vector width without a vocabulary table or fitting step. Different words can collide at the same position. Changing DIM affects those collisions, which can change retrieval scores and ranking.</p>",
    },
    'stop-words': {
      title: 'Stop words',
      body: "<p>Words removed before embedding, often because they are frequent and provide little discrimination between documents. The lab uses a fixed list including the, of, and and. Such lists depend on the task: removing a word can also remove useful meaning, so evaluate the choice.</p>",
    },
    'mrr': {
      title: 'MRR (mean reciprocal rank)',
      body: "<p>For each question, take the reciprocal of the first relevant result’s rank: 1 for rank 1, 0.5 for rank 2, and zero if no relevant result is returned. MRR is the average across questions. It distinguishes early and late relevant results even when both count as a hit@k.</p>",
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

/* ---------------- The DIM dial ---------------- */
(function () {
  const slider = document.getElementById('dim-slider');
  if (!slider) return;
  const out = document.getElementById('dim-readout');
  const val = document.getElementById('dim-val');
  // Measured on the reference solution (deterministic, chunked corpus).
  const TABLE = [
    { dim: 64,   hit3: 0.42, mrr: 0.21 },
    { dim: 128,  hit3: 0.50, mrr: 0.44 },
    { dim: 256,  hit3: 0.83, mrr: 0.58 },
    { dim: 512,  hit3: 0.83, mrr: 0.74 },
    { dim: 1024, hit3: 0.92, mrr: 0.75 },
    { dim: 2048, hit3: 0.92, mrr: 0.86 },
    { dim: 4096, hit3: 0.92, mrr: 0.86 },
  ];
  function bar(label, x, cls) {
    return '<div class="dl-row"><span>' + label + '</span>' +
      '<span class="dl-track"><span class="dl-bar ' + cls + '" style="width:' +
      (100 * x).toFixed(1) + '%"></span></span>' +
      '<span class="dl-val">' + x.toFixed(2) + '</span></div>';
  }
  function render() {
    const row = TABLE[+slider.value];
    val.textContent = row.dim;
    out.innerHTML = bar('hit@3', row.hit3, 'recall') + bar('MRR', row.mrr, 'work') +
      '<div class="dl-row"><span></span><span style="font-family:var(--sans);font-size:12px;color:var(--ink-mute)">' +
      (row.dim <= 128 ? 'heavy collisions: ~700 corpus words share ' + row.dim + ' dimensions'
       : row.dim <= 512 ? 'collisions still demote right answers \u2014 MRR lags hit@3'
       : 'collision-free in practice; remaining misses are vocabulary, not hashing') +
      '</span><span></span></div>';
  }
  slider.addEventListener('input', render);
  render();
})();
