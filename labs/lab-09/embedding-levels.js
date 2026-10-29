/* Two small views of the same invented model used by the full numerical trace. */
(function () {
  'use strict';
  const M = window.EmbeddingModel;
  const explorer = window.EmbeddingExplorer;
  const simple = document.getElementById('embedding-level-1-ui');
  const middle = document.getElementById('embedding-level-2-ui');
  if (!M || !explorer || !simple || !middle) return;

  let revealed = false, stage = 0, token = 0, lastInput = '';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const fmt = number => (Math.abs(number) < 0.0005 ? 0 : number).toFixed(3);
  const vec = values => '[' + values.map(fmt).join(', ') + ']';
  const names = {recovery: 'Recovery', speed: 'Faster lookup', locking: 'Locking'};
  const stages = ['Token vectors', 'Add context', 'Take the mean', 'One text vector'];
  const vector = (values, id = '') => `<span${id ? ` id="${id}"` : ''} class="el-vector" data-vector="${values.join(',')}">${esc(vec(values))}</span>`;
  const arrow = '<span class="el-arrow" aria-hidden="true">→</span>';
  const trainingNote = steps => steps ? `<p class="el-state-note">Shared model: ${steps} training ${steps === 1 ? 'step' : 'steps'} completed in Level 3. All levels use these updated weights.</p>` : '';

  function renderSimple(snapshot, query) {
    const {evaluation, selected, limit, steps} = snapshot;
    const order = revealed ? query.ranking : M.DOCS.map(doc => doc.id);
    const best = query.ranking[0];
    const clipped = query.trace.dropped.length > 0;
    simple.dataset.revealed = String(revealed);
    simple.innerHTML = `
      <div class="el-controls"><div class="el-select"><label for="el1-example">Choose a search query</label><select id="el1-example">${M.EXAMPLES.map(example => `<option value="${example.id}"${example.id === selected ? ' selected' : ''}>${esc(example.label)}</option>`).join('')}</select></div></div>
      <p class="el-predict"><strong>Predict:</strong> Which passage answers this query?</p>
      <div class="el-simple-flow" aria-label="The encoder turns the query into one vector">
        <div class="el-flow-box el-text-box"><span class="el-kicker">Search query</span><p>“${esc(query.text)}”</p>${clipped ? `<small>The window retains: “${esc(query.trace.tokens.join(' '))}”.</small>` : ''}</div>
        ${arrow}<div class="el-flow-box el-encoder-box"><span class="el-kicker">Embedding model</span><strong>Encode the text</strong><small>The same model encodes each passage.</small></div>
        ${arrow}<div class="el-flow-box el-vector-box"><span class="el-kicker">One query vector</span>${vector(query.trace.unit, 'el1-vector')}<small>Two coordinates in this toy.</small></div>
      </div>
      <p class="el-plain">A vector is a list of numbers. The model produces one vector for each text.</p>
      ${limit < 6 ? `<p class="el-window-note">The current window keeps up to ${limit} tokens per query or passage. Passage cards show complete source text.</p>` : ''}
      <div id="el1-results" class="el-candidates" aria-label="Candidate passages${revealed ? ' ranked by vector similarity' : ''}">${order.map((id, index) => {
        const doc = evaluation.documents.find(item => item.id === id);
        const score = query.scores.find(item => item.id === id).cosine;
        return `<div class="el-candidate${revealed && id === query.positiveId ? ' is-match' : ''}" data-doc="${id}"><div class="el-candidate-heading"><strong>${revealed ? `${index + 1} · ` : ''}${names[id]}</strong>${revealed ? `<span class="el-score" data-score="${score}">${fmt(score)}</span>` : ''}</div><p>“${esc(doc.text)}”</p>${revealed && id === query.positiveId ? '<span class="el-match-label">Intended match · supplied label</span>' : ''}</div>`;
      }).join('')}</div>
      <div class="el-reveal-row"><button type="button" id="el1-compare" aria-expanded="${revealed}" aria-controls="el1-comparison">${revealed ? 'Hide scores' : 'Compare passages'}</button>${revealed ? '<span class="el-small">The supplied label does not set the model’s score.</span>' : ''}</div>
      <div id="el1-comparison" class="el-comparison"${revealed ? '' : ' hidden'} role="status">
        <p><strong>Read the scores:</strong> Cosine similarity compares vector directions. A larger score means more similar vectors.</p>
        <p>${best === query.positiveId ? `The intended match ranks first for this query.` : `The model ranks “${names[best]}” first. The intended match is “${names[query.positiveId]}”.`} The highest score can still be wrong.</p>
        <p><strong>Explain:</strong> Why must you read the highest-scoring passage before accepting the result?</p>
      </div>
      ${trainingNote(steps)}`;
  }

  function tokenControls(trace) {
    return `<div class="el-token-list" role="group" aria-label="Select a retained token">${trace.tokens.map((word, i) => `<button type="button" id="el2-token-${i}" data-el-token="${i}" aria-pressed="${i === token}">${esc(word)}<small>token ${i}</small></button>`).join('')}</div>`;
  }

  function renderMiddle(snapshot, query) {
    const {limit, steps} = snapshot, t = query.trace;
    token = Math.min(token, t.tokens.length - 1);
    let content = '';
    if (stage === 0) {
      content = `<p>This toy splits text into word tokens. A lookup table gives each token an initial vector.</p>
        <p class="el-small">Select a token to read its three stored coordinates.</p>${tokenControls(t)}
        <div class="el-operation"><div class="el-operation-part"><span class="el-kicker">Selected token</span><strong>“${esc(t.tokens[token])}”</strong></div>${arrow}<div class="el-operation-part"><span class="el-kicker">Lookup vector</span>${vector(t.embeddings[token], 'el2-token-value')}</div></div>
        <p class="el-takeaway">Each retained token starts with its own vector. This is not yet the vector for the complete text.</p>`;
    } else if (stage === 1) {
      content = `<p>The model combines information across the retained tokens. It then transforms each token vector.</p>
        <p class="el-small">Select a token to compare its initial vector with its vector after context.</p>${tokenControls(t)}
        <div class="el-operation"><div class="el-operation-part"><span class="el-kicker">Before · ${esc(t.tokens[token])}</span>${vector(t.embeddings[token])}</div>${arrow}<div class="el-operation-part"><span class="el-kicker">After context · ${esc(t.tokens[token])}</span>${vector(t.hidden[token], 'el2-token-value')}</div></div>
        <p class="el-takeaway">Tokens on both sides can contribute. This is bidirectional attention. Level 3 shows the attention calculations and later transformations.</p>`;
    } else if (stage === 2) {
      content = `<p>Mean pooling averages each coordinate across the token vectors after context.</p>
        <div class="el-table-wrap"><table class="el-token-table"><caption>Retained tokens after context</caption><thead><tr><th scope="col">Token</th><th scope="col">Three coordinates</th></tr></thead><tbody>${t.tokens.map((word, i) => `<tr><th scope="row">${esc(word)}</th><td>${vector(t.hidden[i])}</td></tr>`).join('')}</tbody></table></div>
        <div class="el-mean-output"><span class="el-kicker">${t.tokens.length} token vectors → one mean vector</span>${vector(t.pooled, 'el2-mean')}</div>
        <p class="el-small el-arithmetic">First coordinate: (${t.hidden.map(row => fmt(row[0])).join(' + ')}) ÷ ${t.tokens.length} ≈ ${fmt(t.pooled[0])}.</p>
        <p class="el-takeaway">The mean combines the retained text into one vector. Discarded tokens cannot contribute.</p>`;
    } else {
      content = `<p>A shared projection combines the mean’s three coordinates into two. Normalization then rescales this vector to length 1.</p>
        <div class="el-final-flow"><div class="el-operation-part"><span class="el-kicker">Mean · 3 coordinates</span>${vector(t.pooled, 'el2-mean')}</div>${arrow}<div class="el-operation-part"><span class="el-kicker">Projection · 2 coordinates</span>${vector(t.projected)}</div>${arrow}<div class="el-operation-part el-final-vector"><span class="el-kicker">Final vector · length 1</span>${vector(t.unit, 'el2-vector')}</div></div>
        <p class="el-small">Vector length means geometric magnitude here. The final vector still has two coordinates.</p>
        <p class="el-takeaway">The same model processes queries and passages. Level 1 compares their final vectors to rank passages.</p>`;
    }
    middle.innerHTML = `
      <div class="el-controls"><div><span class="el-kicker">Current query · shared across levels</span><p class="el-current-query">“${esc(query.text)}”</p></div><div class="el-select"><label for="el2-window">Toy input window</label><select id="el2-window">${[[6,'All tokens · up to 6'], [2,'Only the first 2'], [3,'Only the first 3']].map(([value,label]) => `<option value="${value}"${value === limit ? ' selected' : ''}>${label}</option>`).join('')}</select></div></div>
      <p class="el-small">The window sets the maximum token count. The same limit applies to the query and every candidate passage.</p>
      <div class="el-window-note" role="status"><strong>Retained:</strong> ${esc(t.tokens.join(' · '))}.${t.dropped.length ? ` <span class="el-dropped"><strong>Discarded:</strong> ${esc(t.dropped.join(' · '))}.</span> The model never receives these discarded tokens.` : ' No query tokens are discarded.'}</div>
      <div class="el-stages" role="group" aria-label="Four steps inside an embedding model">${stages.map((name, i) => `<button type="button" id="el2-stage-${i}" data-el-stage="${i}" aria-pressed="${stage === i}"><span>${i + 1}</span>${name}</button>`).join('')}</div>
      <div id="el2-stage-panel" class="el-stage-panel" data-stage="${stage}"><span class="el-kicker">Step ${stage + 1} of 4</span><h4>${stages[stage]}</h4>${content}</div>
      ${trainingNote(steps)}`;
  }

  function render() {
    const focused = document.activeElement;
    const focusId = focused && (simple.contains(focused) || middle.contains(focused)) ? focused.id : '';
    const snapshot = explorer.getSnapshot();
    const query = snapshot.evaluation.queries.find(item => item.id === snapshot.selected);
    if (!query) return;
    const input = `${snapshot.selected}:${snapshot.limit}`;
    if (input !== lastInput) revealed = false;
    lastInput = input;
    renderSimple(snapshot, query);
    renderMiddle(snapshot, query);
    simple.hidden = false;
    middle.hidden = false;
    ['embedding-level-1-fallback', 'embedding-level-2-fallback'].forEach(id => {
      const fallback = document.getElementById(id);
      if (fallback) fallback.hidden = true;
    });
    if (focusId) document.getElementById(focusId)?.focus({preventScroll: true});
  }

  simple.addEventListener('change', event => {
    if (event.target.id === 'el1-example') explorer.setExample(event.target.value);
  });
  simple.addEventListener('click', event => {
    if (event.target.closest('#el1-compare')) { revealed = !revealed; render(); }
  });
  middle.addEventListener('change', event => {
    if (event.target.id === 'el2-window') explorer.setWindow(Number(event.target.value));
  });
  middle.addEventListener('click', event => {
    const stageButton = event.target.closest('[data-el-stage]');
    const tokenButton = event.target.closest('[data-el-token]');
    if (stageButton) { stage = Number(stageButton.dataset.elStage); render(); }
    else if (tokenButton) { token = Number(tokenButton.dataset.elToken); render(); }
  });
  [simple, middle].forEach(host => host.addEventListener('keydown', event => {
    if (event.target.closest('button, select')) event.stopPropagation();
  }));
  document.addEventListener('embedding:change', render);
  render();
}());
