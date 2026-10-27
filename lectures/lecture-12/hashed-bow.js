/* Lecture 12: trace Lab 10's weighted hashed bag-of-words, without changing RAG. */
(function () {
  'use strict';

  const DEFAULT_STOP = new Set(window.CourseRagMeasurements?.preview?.stop || []);
  const PRESETS = {
    shared: ['database log', 'database log replay'],
    repeated: ['recovery recovery recovery crash', 'recovery crash'],
    reordered: ['database recovery log', 'log database recovery'],
    collision: ['car', 'banana'],
    synonyms: ['car', 'automobile'],
  };

  function tokenize(text) {
    return String(text).toLowerCase().match(/[a-z]+/g) || [];
  }

  function trace(text, dimensions = 8, stopWords = DEFAULT_STOP) {
    if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 65536) {
      throw new RangeError('The vector width must be an integer from 1 to 65536.');
    }
    const stop = stopWords instanceof Set ? stopWords : new Set(stopWords);
    const tokens = tokenize(text);
    const retained = tokens.filter(word => !stop.has(word));
    const removed = tokens.filter(word => stop.has(word));
    const counts = new Map();
    retained.forEach(word => counts.set(word, (counts.get(word) || 0) + 1));
    const raw = Array(dimensions).fill(0);
    const words = Array.from(counts, ([word, count]) => {
      const hash = md5hex(word);
      // Reduce the complete MD5 integer without losing precision in a JS Number.
      let bucket = 0;
      for (const digit of hash) bucket = (bucket * 16 + parseInt(digit, 16)) % dimensions;
      const weight = 1 / (1 + Math.log(count));
      raw[bucket] += weight;
      return { word, count, hash, bucket, weight };
    });
    const norm = Math.sqrt(raw.reduce((sum, value) => sum + value * value, 0));
    const vector = raw.map(value => norm === 0 ? 0 : value / norm);
    return { tokens, retained, removed, words, raw, norm, vector, dimensions };
  }

  function compare(queryText, passageText, dimensions = 8, stopWords = DEFAULT_STOP) {
    const query = trace(queryText, dimensions, stopWords);
    const passage = trace(passageText, dimensions, stopWords);
    const passageWords = new Set(passage.words.map(item => item.word));
    const sharedWords = query.words.map(item => item.word).filter(word => passageWords.has(word));
    const overlaps = [];
    let score = 0;
    for (let bucket = 0; bucket < dimensions; bucket++) {
      const product = query.vector[bucket] * passage.vector[bucket];
      score += product;
      if (!product) continue;
      const qw = query.words.filter(item => item.bucket === bucket).map(item => item.word);
      const pw = passage.words.filter(item => item.bucket === bucket).map(item => item.word);
      const shared = qw.filter(word => pw.includes(word));
      overlaps.push({ bucket, queryWords: qw, passageWords: pw, sharedWords: shared,
        collision: qw.some(q => pw.some(p => p !== q)), product });
    }
    return { query, passage, score, sharedWords, overlaps };
  }

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const number = value => value === 0 ? '0' : value.toFixed(3);
  const STAGES = ['Text', 'Words and counts', 'Hash and add', 'Normalize', 'Compare'];

  function mount(root = document.getElementById('hashed-bow')) {
    if (!root || root.dataset.mounted === 'true') return;
    root.dataset.mounted = 'true';
    root.classList.add('hb-widget');
    root.innerHTML = `
      <div class="hb-live">
        <div class="hb-settings">
          <label for="hb-preset">Try an example<select id="hb-preset">
            <option value="" disabled>Custom text</option>
            <option value="shared">Shared words</option><option value="repeated">Repeat a word</option>
            <option value="reordered">Change word order</option><option value="collision">Unrelated words collide</option>
            <option value="synonyms">Different words, similar meaning</option></select></label>
          <label for="hb-width">Vector width<select id="hb-width">
            <option value="8">8 buckets · teaching example</option><option value="16">16 buckets · teaching example</option>
            <option value="2048">2,048 buckets · Lab 10</option></select></label>
        </div>
        <p id="hb-width-note" class="hb-small"></p>
        <div class="hb-inputs">
          <label for="hb-query"><span class="hb-side-label">Query</span><textarea id="hb-query" rows="2" maxlength="400" spellcheck="false"></textarea></label>
          <label for="hb-passage"><span class="hb-side-label">Passage</span><textarea id="hb-passage" rows="2" maxlength="400" spellcheck="false"></textarea></label>
        </div>
        <p class="hb-small">Edit either text. Each input accepts up to 400 characters. Both texts use the same hash and vector width.</p>
        <ol id="hb-progress" class="hb-progress" aria-label="Embedding steps"></ol>
        <div class="hb-controls">
          <button id="hb-back" type="button">← Back</button><button id="hb-step" type="button" class="hb-primary">Step →</button>
          <button id="hb-finish" type="button">Show result</button><button id="hb-reset" type="button">Restart trace</button>
        </div>
        <p id="hb-status" class="hb-small" role="status" aria-live="polite" aria-atomic="true"></p>
        <section id="hb-stage" class="hb-stage" aria-labelledby="hb-stage-title"></section>
      </div>
      <div class="hb-print"></div>`;
    const externalPrint = document.getElementById('hb-print');
    const printPanel = externalPrint || root.querySelector('.hb-print');
    if (externalPrint) {
      root.querySelector('.hb-print').remove();
      externalPrint.classList.add('hb-widget');
    }
    const el = id => root.querySelector('#' + id);
    const queryInput = el('hb-query');
    const passageInput = el('hb-passage');
    const widthInput = el('hb-width');
    const presetInput = el('hb-preset');
    let result;
    let timeline;
    let position = 0;

    function rebuild() {
      result = compare(queryInput.value, passageInput.value, Number(widthInput.value));
      timeline = [{ stage: 0 }, { stage: 1 }];
      ['query', 'passage'].forEach(side => result[side].words.forEach((item, index) => {
        timeline.push({ stage: 2, side, index, item });
      }));
      if (timeline.length === 2) timeline.push({ stage: 2 });
      timeline.push({ stage: 3 }, { stage: 4 });
      position = 0;
      render();
    }

    function setPreset() {
      if (!PRESETS[presetInput.value]) return;
      const [query, passage] = PRESETS[presetInput.value];
      queryInput.value = query;
      passageInput.value = passage;
      rebuild();
    }

    function tokensPanel(data, label) {
      const removed = new Set(data.removed);
      const tokens = data.tokens.map(word => `<span class="hb-token${removed.has(word) ? ' hb-removed' : ''}">${esc(word)}${removed.has(word) ? '<small>removed</small>' : ''}</span>`).join('');
      const rows = data.words.map(item => `<tr><th scope="row">${esc(item.word)}</th><td>${item.count}</td><td>${number(item.weight)}</td></tr>`).join('');
      return `<article class="hb-card"><h4>${label}</h4><div class="hb-tokens">${tokens || '<p>No ASCII words found.</p>'}</div>
        ${rows ? `<table><caption>One weight per distinct retained word</caption><thead><tr><th scope="col">Word</th><th scope="col">Count</th><th scope="col">Lab weight</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>No words remain after filtering.</p>'}</article>`;
    }

    function buckets(data, values, selected, normalized = false) {
      const indexes = data.dimensions <= 16 ? Array.from({ length: data.dimensions }, (_, i) => i)
        : values.map((value, i) => value ? i : -1).filter(i => i !== -1);
      if (!indexes.length) return '<p class="hb-empty">All 2,048 coordinates are zero.</p>';
      const max = Math.max(1, ...values);
      return `<div class="hb-buckets${data.dimensions > 16 ? ' hb-sparse' : ''}">${indexes.map(bucket => {
        const value = values[bucket];
        return `<div class="hb-bucket${bucket === selected ? ' hb-selected' : ''}${value === 0 ? ' hb-zero' : ''}" data-bucket="${bucket}">
          <span class="hb-bucket-label">bucket ${bucket}</span><div class="hb-bar-track" aria-hidden="true"><span style="height:${100 * value / max}%"></span></div>
          <strong>${number(value)}</strong><span class="hb-bucket-kind">${normalized ? 'unit value' : 'weight sum'}</span></div>`;
      }).join('')}</div>`;
    }

    function hashPanel(data, side, state) {
      const values = Array(data.dimensions).fill(0);
      const processed = timeline.slice(0, position + 1).filter(step => step.stage === 2 && step.side === side);
      processed.forEach(step => { values[step.item.bucket] += step.item.weight; });
      const active = state.side === side;
      const words = data.words.map((item, index) => {
        const target = timeline.findIndex(step => step.side === side && step.index === index);
        const isActive = active && state.index === index;
        return `<button type="button" class="hb-word${isActive ? ' hb-selected' : ''}${target < position ? ' hb-done' : ''}" data-hb-position="${target}" aria-pressed="${isActive}"><strong>${esc(item.word)}</strong><span>count ${item.count} · weight ${number(item.weight)}</span></button>`;
      }).join('');
      return `<article class="hb-card"><h4>${side === 'query' ? 'Query' : 'Passage'}</h4>
        <div class="hb-word-list">${words || '<p>No retained words.</p>'}</div>
        <p class="hb-small">${processed.length} of ${data.words.length} distinct words added.</p>
        ${buckets(data, values, active ? state.item.bucket : -1)}</article>`;
    }

    function activeHash(state) {
      if (!state.item) return '<p>No words remain. Both vectors contain only zeros.</p>';
      const item = state.item;
      const preceding = result[state.side].words.slice(0, state.index).filter(word => word.bucket === item.bucket);
      const before = preceding.reduce((sum, word) => sum + word.weight, 0);
      return `<div class="hb-hash-detail">
        <div class="hb-route" aria-label="${esc(item.word)} hashes to bucket ${item.bucket}">
          <div><small>${state.side === 'query' ? 'Query word' : 'Passage word'}</small><strong>${esc(item.word)}</strong><small>weight ${number(item.weight)}</small></div>
          <svg viewBox="0 0 60 24" aria-hidden="true"><path d="M2 12H54M43 3l11 9-11 9"/></svg>
          <div><small>Fixed hash function</small><strong>MD5</strong><small>hash % ${result.query.dimensions}</small></div>
          <svg viewBox="0 0 60 24" aria-hidden="true"><path d="M2 12H54M43 3l11 9-11 9"/></svg>
          <div class="hb-destination"><small>Add the weight</small><strong>bucket ${item.bucket}</strong><small>${number(before)} + ${number(item.weight)} = ${number(before + item.weight)}</small></div>
        </div>
        ${preceding.length ? `<p class="hb-collision-note"><strong>Collision:</strong> ${esc(preceding.map(word => word.word).join(', '))} already uses this bucket. The weights add.</p>` : ''}
        <details><summary>Inspect the hash calculation</summary><p><code>MD5("${esc(item.word)}") = ${item.hash}</code></p>
          <p>Read the hash as a hexadecimal integer. Its remainder after division by ${result.query.dimensions} is ${item.bucket}.</p>
          <p><code>weight = 1 / (1 + ln(${item.count})) = ${number(item.weight)}</code></p></details>
      </div>`;
    }

    function normalizedPanel(data, label) {
      return `<article class="hb-card"><h4>${label}</h4>
        <p class="hb-norm"><span>Vector length before division</span><strong>${number(data.norm)}</strong></p>
        <p class="hb-small">${data.norm ? 'Divide every bucket value by this length. The resulting vector has length 1.' : 'No words remain. Keep the zero vector. It has length 0, not 1.'}</p>
        ${buckets(data, data.vector, -1, true)}</article>`;
    }

    function comparisonPanel() {
      const overlapRows = result.overlaps.map(item => `<tr><th scope="row">${item.bucket}</th><td>${esc(item.queryWords.join(', '))}</td><td>${esc(item.passageWords.join(', '))}</td>
        <td>${item.sharedWords.length ? `<span class="hb-match-badge">Shared: ${esc(item.sharedWords.join(', '))}</span>` : ''}${item.collision ? '<span class="hb-collision-badge">Different words collide</span>' : ''}</td>
        <td>${number(result.query.vector[item.bucket])} × ${number(result.passage.vector[item.bucket])}<br><strong>${number(item.product)}</strong></td></tr>`).join('');
      let explanation;
      if (!result.query.norm || !result.passage.norm) explanation = 'At least one text has no retained words. Its zero vector gives a dot product of 0.';
      else if (!result.overlaps.length) explanation = 'The vectors have no shared nonzero buckets. This score cannot recognize meaning shared by different words.';
      else if (!result.sharedWords.length) explanation = 'No retained words match. The positive score comes entirely from different words sharing buckets.';
      else explanation = 'Shared words contribute to the score. Different words can also contribute when their hashes select the same bucket.';
      return `<div class="hb-score-row"><div class="hb-score"><span>Dot product</span><strong data-score="${result.score}">${number(result.score)}</strong></div>
        <p>${explanation}</p></div>
        ${overlapRows ? `<div class="hb-table-scroll" role="region" aria-label="Dot-product contributions" tabindex="0"><table class="hb-overlaps"><caption>Multiply matching coordinates, then add. Only nonzero products are shown.</caption><thead><tr><th scope="col">Bucket</th><th scope="col">Query words</th><th scope="col">Passage words</th><th scope="col">Why they overlap</th><th scope="col">Product</th></tr></thead><tbody>${overlapRows}</tbody></table></div>` : ''}
        <p class="hb-equation"><code>score = Σ query[i] × passage[i] = ${number(result.score)}</code></p>
        <p class="hb-small">The dot product equals cosine similarity when both vectors have length 1. A high score does not establish relevant evidence.</p>
        <div class="hb-transfer"><strong>Try another prediction.</strong> Repeat a word, reverse the word order, or switch to 2,048 buckets. Explain which step changes.</div>`;
    }

    function render() {
      const state = timeline[position];
      const width = result.query.dimensions;
      el('hb-width-note').textContent = width === 2048
        ? 'This width matches Lab 10. The diagram shows nonzero buckets only. All omitted coordinates are zero.'
        : 'This smaller teaching width makes collisions easy to see. Lab 10 uses 2,048 buckets with the same calculation.';
      el('hb-progress').innerHTML = STAGES.map((name, index) => `<li${index === state.stage ? ' aria-current="step"' : ''} class="${index < state.stage ? 'hb-complete' : ''}"><span>${index + 1}</span>${name}</li>`).join('');
      el('hb-back').disabled = position === 0;
      el('hb-step').disabled = position === timeline.length - 1;
      el('hb-finish').disabled = position === timeline.length - 1;
      el('hb-status').textContent = `Step ${position + 1} of ${timeline.length} · ${STAGES[state.stage]}${state.item ? ' · ' + state.side + ' word: ' + state.item.word : ''}`;
      const panel = el('hb-stage');
      panel.dataset.stage = state.stage;
      let content;
      if (state.stage === 0) {
        content = `<h3 id="hb-stage-title">Predict which words will bring the vectors closer</h3>
          <p>Think of numbered buckets. The same word always goes into the same bucket at a fixed vector width.</p>
          <div class="hb-predict"><strong>Before you step:</strong> Which words occur in both texts? Could different words land in one bucket?</div>
          <p>First, find words and remove the lab’s stop words. Then add one calculated weight for each distinct retained word.</p>
          <p class="hb-small">This is Lab 10’s deterministic baseline. It uses no trained embedding model and does not preserve word order.</p>`;
      } else if (state.stage === 1) {
        content = `<h3 id="hb-stage-title">Count retained words, then calculate their weights</h3>
          <p>Convert text to lowercase. Match sequences of letters <code>a–z</code>. Remove the lab’s stop words, such as <code>the</code> and <code>how</code>.</p>
          <p class="hb-equation"><code>weight = 1 / (1 + ln(count))</code></p>
          <p class="hb-small"><code>ln</code> means the natural logarithm.</p>
          <p>Lab 10 adds this weight once per distinct word. Repeating a word reduces its weight before normalization.</p>
          <div class="hb-two-up">${tokensPanel(result.query, 'Query')}${tokensPanel(result.passage, 'Passage')}</div>
          <p class="hb-small">The count and the weight are different values. This lab does not add the raw count to a bucket.</p>`;
      } else if (state.stage === 2) {
        content = `<h3 id="hb-stage-title">Follow one word into its bucket</h3><p>Hash each distinct word. Add its weight to the selected bucket. Different words can select the same bucket.</p>
          ${activeHash(state)}<div class="hb-two-up">${hashPanel(result.query, 'query', state)}${hashPanel(result.passage, 'passage', state)}</div>
          <p class="hb-small">Select a word to inspect that point in the trace. The highlighted word and bucket belong to the same step.</p>`;
      } else if (state.stage === 3) {
        content = `<h3 id="hb-stage-title">Scale each nonzero vector to length 1</h3>
          <p>Square each bucket value. Add the squares, then take the square root to find the vector’s length.</p>
          <p class="hb-equation"><code>length = √Σ bucket[i]²<br>unit[i] = bucket[i] / length</code></p>
          <div class="hb-two-up">${normalizedPanel(result.query, 'Query')}${normalizedPanel(result.passage, 'Passage')}</div>
          <div class="hb-predict"><strong>Predict the score.</strong> Which bucket positions are nonzero in both vectors?</div>`;
      } else {
        content = `<h3 id="hb-stage-title">Compare the same bucket positions</h3>${comparisonPanel()}`;
      }
      panel.innerHTML = content;
      panel.querySelectorAll('[data-hb-position]').forEach(button => button.addEventListener('click', () => {
        position = Number(button.dataset.hbPosition);
        render();
        el('hb-stage').querySelector(`[data-hb-position="${position}"]`)?.focus({ preventScroll: true });
      }));
      printPanel.innerHTML = `<h3>Hashed bag-of-words: the current example</h3>
        <p><strong>Query:</strong> ${esc(queryInput.value)}<br><strong>Passage:</strong> ${esc(passageInput.value)}<br><strong>Width:</strong> ${width} buckets.</p>
        <p>Lowercase ASCII words → remove stop words → count each retained word → hash and add its weight → normalize → dot product.</p>
        <p><code>weight = 1 / (1 + ln(count))</code>. Add this weight once per distinct word. Repetition reduces the weight before normalization.</p>
        <div class="hb-two-up">${tokensPanel(result.query, 'Query')}${tokensPanel(result.passage, 'Passage')}</div>
        <div class="hb-two-up">${normalizedPanel(result.query, 'Query')}${normalizedPanel(result.passage, 'Passage')}</div>
        ${comparisonPanel()}`;
    }

    presetInput.addEventListener('change', setPreset);
    widthInput.addEventListener('change', rebuild);
    function editText() {
      presetInput.value = '';
      rebuild();
    }
    queryInput.addEventListener('input', editText);
    passageInput.addEventListener('input', editText);
    el('hb-back').addEventListener('click', () => { position = Math.max(0, position - 1); render(); });
    el('hb-step').addEventListener('click', () => { position = Math.min(timeline.length - 1, position + 1); render(); });
    el('hb-finish').addEventListener('click', () => { position = timeline.length - 1; render(); });
    el('hb-reset').addEventListener('click', () => { position = 0; render(); });
    // Keep native editing and control keys out of document-level slide shortcuts.
    root.addEventListener('keydown', event => {
      if (event.target.closest('select, textarea, button, summary, [tabindex]')) event.stopPropagation();
    });
    setPreset();
    const fallback = document.getElementById('hb-fallback');
    if (fallback) fallback.hidden = true;
  }

  window.HashedBow = Object.freeze({ tokenize, trace, compare, mount });
  mount();
})();
