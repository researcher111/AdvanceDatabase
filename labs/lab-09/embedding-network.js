/* Architecture and numerical trace for the explicitly invented Lab 9 model. */
(function () {
  'use strict';
  const root = document.getElementById('embedding-network');
  const M = window.EmbeddingModel;
  if (!root || !M) return;
  const ui = document.getElementById('en-interactive');
  let state = M.createState(), selected = 'speed', token = 0, stage = 0, mode = 'trace', limit = 6, branch = 'q';
  const names = ['Token lookup', 'Queries, keys, values', 'Bidirectional attention', 'Residual + feed-forward', 'Mean pooling', 'Shared projection', 'Unit vector + search'];
  const shapes = ['N tokens → N × 3', 'Q, K, V: each N × 3', 'N × N weights → N × 3', 'N × 3 → N × 3', 'N × 3 → one vector of 3', '3 → 2 coordinates', 'one vector of length 1'];
  const fmt = (n, digits = 3) => (Math.abs(n) < 0.5 * 10 ** -digits ? 0 : n).toFixed(digits);
  const vec = a => '[' + a.map(x => fmt(x)).join(', ') + ']';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fill = n => n < 0 ? '#dce9df' : '#f7dfd0';
  const norm = a => Math.hypot(...a);
  const docName = id => ({recovery:'Recovery', speed:'Faster lookup', locking:'Locking'}[id]);

  ui.innerHTML = `
    <div class="en-modes" role="group" aria-label="Explore encoding or training">
      <button type="button" data-mode="trace" aria-pressed="true">1 · Trace an embedding</button>
      <button type="button" data-mode="train" aria-pressed="false">2 · Train on pairs</button>
    </div>
    <div class="en-toolbar">
      <div class="en-select"><label for="en-example">Query to encode</label><select id="en-example">${M.EXAMPLES.map(e => `<option value="${e.id}">${e.label}</option>`).join('')}</select></div>
      <div class="en-select" id="en-window-control"><label for="en-window">Input window · toy tokens</label><select id="en-window"><option value="6">All tokens · up to 6</option><option value="2">Only the first 2</option><option value="3">Only the first 3</option></select></div>
      <div class="en-nav" id="en-navigation"><button type="button" id="en-back" aria-label="Previous model stage">← Back</button><button type="button" id="en-next" aria-label="Next model stage">Next →</button></div>
    </div>
    <div id="en-input" class="en-input"></div>
    <div id="en-trace-panel">
      <div class="en-layout">
        <nav class="en-architecture" aria-label="Embedding model stages"><div class="en-kicker">Architecture</div><p class="en-small">N = retained token count.</p>${names.map((name, i) => `<button type="button" class="en-stage" data-stage="${i}" aria-pressed="false"><span>${i + 1} · ${name}</span><small>${shapes[i]}</small></button>`).join('')}</nav>
        <div id="en-detail" class="en-detail"></div>
      </div>
      <div id="en-output" class="en-output"></div>
      <p class="en-essential">Encoding computes vectors from the current model weights. These computed values are activations. Encoding does not change the model weights.</p>
    </div>
    <div id="en-train-panel" hidden>
      <p class="en-small">A weight controls how input values combine. Training changes six weights in the shared projection matrix. Token lookup, attention, and feed-forward weights stay fixed. Each step uses all three complete query–passage pairs.</p>
      <p class="en-small">The loss penalizes a low score for each labeled match relative to the candidate scores. Lower loss means a better fit to these training pairs.</p>
      <div class="en-train-controls"><button type="button" id="en-train-one">Train projection · 1 step</button><button type="button" id="en-train-many">Train · 20 steps</button><button type="button" id="en-reset">Reset weights</button></div>
      <div id="en-training"></div>
    </div>
    <p id="en-status" class="en-small" role="status" aria-live="polite"></p>`;
  const get = id => document.getElementById(id);
  get('en-example').value = selected;

  function matrix(label, rows) {
    return `<div><strong>${esc(label)}</strong><table aria-label="${esc(label)}"><tbody>${rows.map(row => '<tr>' + row.map(n => `<td style="background:${fill(n)}">${fmt(n)}</td>`).join('') + '</tr>').join('')}</tbody></table></div>`;
  }
  function params(content) {
    return `<details><summary>Inspect the weights and arithmetic</summary><div class="en-params">${content}</div></details>`;
  }
  function table(labels, rows, headers = ['coordinate 0', 'coordinate 1', 'coordinate 2']) {
    return `<table class="en-math-table"><thead><tr><th>Token</th>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, i) => `<tr class="${i === token ? 'is-selected' : ''}"><th scope="row">${esc(labels[i])}</th>${row.map(n => `<td>${fmt(n)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  // Each circle is one actual scalar. Edges show the stated operation's inputs.
  function graph(rows, options = {}) {
    const width = 360, gap = options.sideInputs ? 118 : 92, top = 49, height = top + (rows.length - 1) * gap + 36;
    const positions = rows.map((r, j) => r.values.map((_, i) => ({x: 180 + (i - (r.values.length - 1) / 2) * Math.min(80, 300 / r.values.length), y: top + j * gap})));
    let lines = '';
    for (let j = 1; j < rows.length; j++) {
      positions[j].forEach((b, out) => positions[j - 1].forEach((a, input) => {
        if (rows[j].direct && out !== input) return;
        const weight = rows[j].weights && rows[j].weights[out] && rows[j].weights[out][input];
        const title = weight === undefined ? 'Inputs to ' + rows[j].label : `weight = ${fmt(weight, 6)}`;
        lines += `<path class="en-edge" d="M ${a.x} ${a.y + 22} L ${b.x} ${b.y - 22}"${weight === undefined ? '' : ` style="stroke:${weight < 0 ? '#608c6d' : '#c88763'}"`}><title>${esc(title)}</title></path>`;
      }));
    }
    if (options.skip) positions[0].forEach((a,i)=>{
      const b=positions.at(-1)[i], route=337+i*7;
      lines += `<path class="en-skip" d="M ${a.x+22} ${a.y} C ${route} ${a.y}, ${route} ${b.y}, ${b.x+22} ${b.y}"><title>Add residual coordinate ${i} to output coordinate ${i}.</title></path>`;
    });
    const sideInputs=(options.sideInputs||[]).map(input=>{
      const y=positions[input.row][0].y-72;
      const edges=positions[input.row].map(b=>`<path class="en-edge" d="M 68 ${y+25} L ${b.x} ${b.y-22}"/>`).join('');
      return `${edges}<g><rect x="12" y="${y}" width="112" height="25" rx="4" fill="#e5ecf5" stroke="#b8c4d3"/><text class="en-row-label" x="68" y="${y+13}">${input.label}</text><title>${input.values.map(vec).join('; ')}</title></g>`;
    }).join('');
    const nodes = rows.map((r, j) => `<text class="en-row-label" x="180" y="${positions[j][0].y - 33}">${esc(r.label)}</text>` + r.values.map((n, i) => `<g><circle cx="${positions[j][i].x}" cy="${positions[j][i].y}" r="23" fill="${fill(n)}"/><text x="${positions[j][i].x}" y="${positions[j][i].y}"${r.precision===3?' style="font-size:14px"':''}>${fmt(n, r.precision || 2)}</text><title>${esc(r.label)}[${i}] = ${fmt(n, 7)}</title></g>`).join('')).join('');
    return `<svg class="en-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(rows.map(r => r.label + ': ' + vec(r.values)).join('; '))}">${lines}${sideInputs}${nodes}</svg>`;
  }
  function renderTrace(query, evaluation) {
    const t = query.trace, word = t.tokens[token], count = t.tokens.length;
    let copy, formula, visual, extra = '';
    if (stage === 0) {
      copy = `This toy splits text into word tokens. The token “${word}” has ID ${t.tokenIds[token]}. Like a table lookup by ID, token lookup returns one row of coordinates.`;
      formula = `${count} tokens × 3 coordinates. Selected row: ${vec(t.embeddings[token])}`;
      visual = graph([{label:'token ID', values:[t.tokenIds[token]]}, {label:'lookup vector x', values:t.embeddings[token]}]);
      extra = params(matrix('Token table · retained inputs', t.embeddings));
    } else if (stage === 1) {
      const field = {q:'query', k:'key', v:'value'}[branch];
      copy = 'Root mean square normalization (RMSNorm) rescales the token vector. A weight matrix is a table of stored numbers. Each row produces one output coordinate. Three weight matrices produce the token’s query, key, and value vectors. Attention compares a token’s query vector with each token’s key vector. The comparison controls how much each value vector contributes.';
      formula = `${branch.toUpperCase()} = W${branch} × RMSNorm(x). Each attention vector belongs to one token.`;
      visual = `<div class="en-nav" role="group" aria-label="Attention projection">${['q','k','v'].map(b => `<button type="button" data-branch="${b}" aria-pressed="${branch === b}">${b.toUpperCase()}</button>`).join('')}</div>` + graph([
        {label:'lookup vector', values:t.embeddings[token]}, {label:'RMSNorm(x) · shared denominator', values:t.normalized[token]}, {label:branch.toUpperCase() + ' · ' + word, values:t[branch][token], weights:M.BACKBONE[field]}
      ]);
      extra = '<p class="en-small">The attention query describes one token. The search query is the complete text above.</p>' + params(matrix('Wq', M.BACKBONE.query) + matrix('Wk', M.BACKBONE.key) + matrix('Wv', M.BACKBONE.value));
    } else if (stage === 2) {
      copy = `The query vector for “${word}” scores each retained token’s key vector. Softmax converts these scores into nonnegative attention weights that sum to 1. These computed weights determine how much each value vector contributes. Attention is bidirectional because tokens before and after “${word}” can contribute.`;
      formula = 'score[j] = dot(q, k[j]) / √3; weight = softmax(scores); mix = Σ weight[j] × v[j]';
      visual = graph([{label:'selected token query q', values:t.q[token]}, {label:'scores · t0, t1, …', values:t.scores[token],precision:3}, {label:'attention weights · sum = 1', values:t.attention[token],precision:3}, {label:'weighted value mixture', values:t.mixed[token]}], {sideInputs:[{row:1,label:'All keys K',values:t.k},{row:3,label:'All values V',values:t.v}]});
      extra = `<p class="en-small">Attention weights are computed activations that change with the input. Encoding keeps the stored model weights fixed.</p><details><summary>Inspect each token’s contribution</summary>${table(t.tokens.map((w,i)=>`t${i} · ${w}`), t.scores[token].map((s,i)=>[s,t.attention[token][i]]), ['score','weight'])}<p>Keys used for the scores:</p>${table(t.tokens,t.k)}<p>Values used for the weighted mixture:</p>${table(t.tokens,t.v)}<p>Tokens on both sides can contribute. The toy uses full attention across its retained input.</p></details>`;
    } else if (stage === 3) {
      copy = 'The attention output is added to the original token vector. This addition is a residual connection. A feed-forward network transforms each resulting token vector independently. A second residual connection adds that network’s output to its input.';
      formula = 'r = x + Wo × mix; h = r + Wdown × ReLU(Wup × RMSNorm(r))';
      visual = graph([{label:'attention residual r = x + Wo × mix', values:t.residual[token]}, {label:'RMSNorm(r) · shared denominator',values:t.ffNormalized[token]}, {label:'feed-forward hidden · ReLU', values:t.ffHidden[token],weights:M.BACKBONE.ffUp}, {label:'feed-forward output', values:t.ffOutput[token], weights:M.BACKBONE.ffDown}, {label:'contextual token h · add r', values:t.hidden[token], direct:true}], {skip:true});
      extra = params(matrix('Wo',M.BACKBONE.output) + matrix('Wup',M.BACKBONE.ffUp) + matrix('Wdown',M.BACKBONE.ffDown)) + `<p class="en-small">The toy uses ReLU: negative values become zero. Gemma uses a gated feed-forward network.</p>`;
    } else if (stage === 4) {
      copy = 'Mean pooling averages each coordinate across the retained token vectors. The result is one vector for the complete retained text.';
      formula = `mean[0] = (${t.hidden.map(row=>fmt(row[0])).join(' + ')}) / ${count} = ${fmt(t.pooled[0])}`;
      visual = table(t.tokens, t.hidden) + graph([{label:`one mean · ${count} rows → 1 row`, values:t.pooled}]);
      extra = '<p class="en-small">All retained tokens contribute to the mean. Padding tokens fill unused positions in a batch. Real models exclude those padding tokens from this mean.</p>';
    } else if (stage === 5) {
      copy = 'A projection combines coordinates with weights from a matrix. This projection maps three coordinates into two. Queries and passages use the same matrix.';
      formula = `z[0] = ${state.projection[0].map((w,i)=>`${fmt(w)} × ${fmt(t.pooled[i])}`).join(' + ')} = ${fmt(t.projected[0])}`;
      visual = graph([{label:'pooled vector · 3 coordinates',values:t.pooled}, {label:'projected vector z · 2 coordinates',values:t.projected,weights:state.projection}]);
      extra = params(matrix('Shared projection W · trainable',state.projection));
    } else {
      copy = 'Normalization divides the projected vector by its length, producing a unit vector with length 1. For unit vectors, the dot product equals cosine similarity. Larger cosine scores mean closer vector directions. Compare the passage scores below.';
      formula = `length = √(${fmt(t.projected[0])}² + ${fmt(t.projected[1])}²) = ${fmt(norm(t.projected))}; embedding = z / length`;
      visual = graph([{label:'projected vector z',values:t.projected}, {label:'final embedding · shared denominator',values:t.unit}]);
      extra = '<p class="en-small">The two coordinates describe the complete retained text. They are not probabilities or next-token predictions.</p>';
    }
    get('en-detail').innerHTML = `<div class="en-stage-count">Stage ${stage + 1} / ${names.length}</div><h4>${names[stage]}</h4><p class="en-stage-copy">${esc(copy)}</p>${visual}<div class="en-formula">${esc(formula)}</div>${extra}`;
    get('en-output').innerHTML = ranking(query, evaluation);
    get('en-back').disabled = stage === 0;
    get('en-next').disabled = stage === names.length - 1;
    root.querySelectorAll('[data-stage]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stage) === stage)));
  }
  function ranking(query, evaluation) {
    return `<div class="en-output-heading"><strong>Current query vector</strong><span class="en-vector" data-query-vector="${query.trace.unit.join(',')}">${vec(query.trace.unit)}</span></div><p class="en-small">Queries and passages use the same ${mode === 'trace' && limit < 6 ? 'truncated' : 'full'} input rule. Scores are cosine similarities. Green marks the labeled match.</p><div class="en-results">${query.ranking.map((id,i) => {
      const d = evaluation.documents.find(d=>d.id===id), s=query.scores.find(s=>s.id===id);
      return `<div class="en-result ${id===query.positiveId?'is-positive':''}" data-result="${id}" data-score="${s.cosine}"><span class="en-result-number">${i+1}</span><span class="en-result-text">${esc(d.text)}${id===query.positiveId?'<small>labeled matching passage</small>':''}</span><span class="en-result-score">${fmt(s.cosine)}</span></div>`;
    }).join('')}</div>`;
  }
  function vectorPlot(query, evaluation) {
    const xy = a => [125 + 80*a[0], 112 - 80*a[1]];
    const colors = {recovery:'#b14a2e',speed:'#427553',locking:'#5e6895'};
    const docs = evaluation.documents.map((d,i)=>{
      const [x,y]=xy(d.trace.unit);return `<circle cx="${x}" cy="${y}" r="5" fill="${colors[d.id]}"><title>${docName(d.id)} ${vec(d.trace.unit)}</title></circle><text x="${x+7}" y="${y+5}">D${i+1}</text>`;
    }).join('');
    const [x,y]=xy(query.trace.unit);
    return `<svg viewBox="0 0 250 225" role="img" aria-label="Unit circle showing query and document vectors"><circle cx="125" cy="112" r="80" fill="none" stroke="#d6cebf"/><path d="M 25 112 H 225 M 125 12 V 212" stroke="#e5dfd3"/><line x1="125" y1="112" x2="${x}" y2="${y}" stroke="#303d45" stroke-width="2"/><rect x="${x-4}" y="${y-4}" width="8" height="8" fill="#303d45"/><text x="${x-17}" y="${y-9}">Q</text>${docs}</svg><p class="en-small">Q = query. D1 = recovery. D2 = speed. D3 = locking.</p>`;
  }
  function lossPlot() {
    const history=state.history, max=history[0]*1.08, points=history.map((v,i)=>`${30 + 195*i/Math.max(1,history.length-1)},${190 - 160*v/max}`).join(' ');
    return `<svg viewBox="0 0 250 230" role="img" aria-label="Average training loss falls from ${fmt(history[0],4)} to ${fmt(history.at(-1),4)} over ${state.steps} updates"><path d="M30 20 V190 H230" stroke="#cec5b5" fill="none"/><polyline points="${points}" fill="none" stroke="#b14a2e" stroke-width="2.5"/><circle cx="${history.length===1?30:225}" cy="${190-160*history.at(-1)/max}" r="4" fill="#b14a2e"/><text x="30" y="210">0</text><text x="204" y="210">${state.steps}</text><text x="64" y="225">projection updates</text><text x="35" y="15">start ${fmt(history[0],3)} → now ${fmt(history.at(-1),3)}</text></svg>`;
  }
  function renderTraining(query, evaluation) {
    const positive = evaluation.documents.find(d=>d.id===query.positiveId), p=query.scores.find(s=>s.id===query.positiveId).probability;
    function branchCard(label,text,vector) {return `<div class="en-branch"><span class="en-kicker">${label}</span><p>${esc(text)}</p><span class="en-arrow">↓</span><div class="en-encoder">The same encoder fθ<small>fixed backbone + shared projection</small></div><span class="en-arrow">↓</span><span class="en-vector">${vec(vector)}</span></div>`;}
    get('en-training').innerHTML = `
      <div class="en-metrics"><div class="en-metric"><strong id="en-updates">${state.steps}</strong><span>projection updates</span></div><div class="en-metric"><strong id="en-loss">${fmt(evaluation.loss,4)}</strong><span>mean training loss · 3 pairs</span></div><div class="en-metric"><strong>${Math.round(p*100)}%</strong><span>match’s training softmax share</span></div></div>
      <div class="en-branches">${branchCard('Query',query.text,query.trace.unit)}${branchCard('Matching passage',positive.text,positive.trace.unit)}</div>
      <p class="en-small">The labeled passage is the target match. Each other passage is a negative example for this query. All candidates use the same encoder.</p>
      <p class="en-small">Softmax converts the three cosine scores into shares that sum to 1. The temperature, 0.25, controls how strongly score differences affect those shares.</p>
      <div class="en-formula">p(match) = exp(cosine(match) / 0.25) / Σ exp(cosine(candidate) / 0.25)<br>pair loss = −ln(p(match)) = ${fmt(query.loss,4)}</div>
      <p class="en-small">The exp function raises e to a power. The ln function is the natural logarithm. A larger share for the match produces a smaller loss.</p>
      <p class="en-small">The softmax share compares these three candidates during training. It does not establish a probability that the passage answers the query.</p>
      <div class="en-train-plots"><div class="en-plot"><div class="en-kicker">Actual 2-D toy vectors</div>${vectorPlot(query,evaluation)}</div><div class="en-plot"><div class="en-kicker">Computed training loss</div>${lossPlot()}</div></div>
      <div class="en-output">${ranking(query,evaluation)}</div>
      ${params(matrix('Initial projection',M.INITIAL_PROJECTION)+matrix('Current projection',state.projection))}
      <details><summary>See all three training pairs</summary><div class="en-train-table-wrap"><table class="en-math-table"><thead><tr><th>Query</th><th>Match</th><th>Pair loss</th></tr></thead><tbody>${evaluation.queries.map(q=>`<tr><th scope="row">${esc(q.text)}</th><td>${docName(q.positiveId)}</td><td>${fmt(q.loss,4)}</td></tr>`).join('')}</tbody></table></div></details>
      <p class="en-essential">Both branches use the same encoder and projection matrix. Training changes that matrix, so query and passage vectors both move.</p>
      <p class="en-small">The toy changes each weight slightly to estimate how that weight affects the loss. These estimates guide the next weight update. The toy reduces the step size when needed to avoid increasing training loss. These results use the training pairs. They do not show accuracy on new queries.</p>`;
  }
  function render() {
    const evaluation = M.evaluate(state, {maxTokens:mode==='train'?6:limit});
    const query = evaluation.queries.find(q=>q.id===selected);
    const t = query.trace;
    token = Math.min(token,t.tokens.length-1);
    root.dataset.stage=String(stage); root.dataset.mode=mode; root.dataset.steps=String(state.steps);
    root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    get('en-trace-panel').hidden = mode!=='trace'; get('en-train-panel').hidden = mode!=='train';
    get('en-window-control').hidden = mode==='train'; get('en-navigation').hidden=mode==='train';
    get('en-input').innerHTML=`<div class="en-sentence">${esc(query.text)}</div>${mode==='trace'?`<div class="en-tokens" role="group" aria-label="Select a token to inspect">${t.tokens.map((word,i)=>`<button type="button" class="en-token" data-token="${i}" aria-pressed="${i===token}"><small>t${i} · ID ${t.tokenIds[i]}</small><span>${esc(word)}</span></button>`).join('')}${t.dropped.map(word=>`<span class="en-token is-dropped"><small>discarded</small><span>${esc(word)}</span></span>`).join('')}</div><div class="en-token-note">${t.tokens.length} retained tokens → one 2-coordinate vector. ${t.dropped.length?'Crossed-out tokens never enter this network.':'Choose a token to follow its values.'}</div>`:'<p class="en-small">Predict which passage should rank first. Select <strong>Train · 20 steps</strong>. Compare the scores. Explain why both query and passage vectors move.</p>'}`;
    if (mode==='trace') renderTrace(query,evaluation); else renderTraining(query,evaluation);
    get('en-status').textContent=mode==='trace'?`Stage ${stage+1}: ${names[stage]}. Selected token: ${t.tokens[token]}. Weights after ${state.steps} training updates.`:`${state.steps} training updates. Mean loss ${fmt(evaluation.loss,4)}. Top result: ${docName(query.ranking[0])}.`;
  }
  root.addEventListener('click', event=>{
    const button=event.target.closest('button'); if(!button) return;
    if(button.dataset.mode) mode=button.dataset.mode;
    else if(button.dataset.stage!==undefined) stage=Number(button.dataset.stage);
    else if(button.dataset.token!==undefined) token=Number(button.dataset.token);
    else if(button.dataset.branch) branch=button.dataset.branch;
    else if(button.id==='en-back') stage=Math.max(0,stage-1);
    else if(button.id==='en-next') stage=Math.min(names.length-1,stage+1);
    else if(button.id==='en-train-one') M.train(state,1);
    else if(button.id==='en-train-many') M.train(state,20);
    else if(button.id==='en-reset') state=M.createState();
    else return;
    const tokenFocus=button.dataset.token, branchFocus=button.dataset.branch;
    render();
    if(tokenFocus!==undefined) root.querySelector(`[data-token="${tokenFocus}"]`).focus({preventScroll:true});
    if(branchFocus) root.querySelector(`[data-branch="${branchFocus}"]`).focus({preventScroll:true});
  });
  get('en-example').addEventListener('change',event=>{selected=event.target.value; token=0; render();});
  get('en-window').addEventListener('change',event=>{limit=Number(event.target.value); token=0; render();});
  // Preserve native control keys without moving the page's presentation deck.
  root.addEventListener('keydown',event=>{
    if(event.target.closest('button, select, summary, input')) event.stopPropagation();
  });
  render();
  get('en-fallback').hidden=true; ui.hidden=false;
}());
