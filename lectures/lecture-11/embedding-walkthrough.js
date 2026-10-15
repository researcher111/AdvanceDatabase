/* Lecture 11: an offline illustration, not an embedding model.
 * Token splits and contextual vectors below are hand-authored teaching fixtures.
 * Only pooling, normalization, and cosine scoring are computed.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.EmbeddingWalkthrough = api;
    if (!root.document) return;
    const start = () => api.mount(root.document.getElementById('embedding-walkthrough'));
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const queries = {
    recovery: {
      label: 'Crash recovery',
      text: 'How does a database recover after a crash?',
      tokens: ['How', 'does', 'a', 'database', 'recover', 'after', 'a', 'crash', '?'],
      context: [[0.5, 0.2, 0.1], [0.6, 0.1, 0.1], [0.4, 0.2, 0.1], [1.2, 0.3, 0.2], [1.5, 0.2, 0.1], [0.5, 0.1, 0.2], [0.4, 0.1, 0.1], [1.4, 0.3, 0.1], [0.3, 0.1, 0.1]],
      focus: 4,
      clues: ['database', 'crash'],
      connection: 'You understand “recover” by reading “database” and “crash” around it. Context layers let each token’s representation use information from the other tokens.',
      transfer: 'Now choose “A paraphrase.” Should different words still bring back the recovery passage?',
    },
    restart: {
      label: 'A paraphrase',
      text: 'How can a log help after restart?',
      tokens: ['How', 'can', 'a', 'log', 'help', 'after', 'restart', '?'],
      context: [[0.4, 0.2, 0.1], [0.6, 0.2, 0.2], [0.4, 0.1, 0.1], [1.3, 0.4, 0.3], [0.8, 0.3, 0.2], [0.5, 0.2, 0.1], [1.4, 0.3, 0.2], [0.3, 0.1, 0.1]],
      focus: 3,
      clues: ['help', 'restart'],
      connection: '“Log” could mean several things. Here, “help” and “restart” provide clues. Context layers let a token’s representation depend on its sentence, rather than only its spelling.',
      transfer: 'The paraphrase still ranks the recovery passage first in this example. Try “Query speed” and predict which passage moves up.',
    },
    speed: {
      label: 'Query speed',
      text: 'How can an index speed up a query?',
      tokens: ['How', 'can', 'an', 'index', 'speed', 'up', 'a', 'query', '?'],
      context: [[0.1, 0.5, 0.1], [0.2, 0.6, 0.1], [0.1, 0.4, 0.1], [0.3, 1.4, 0.2], [0.2, 1.3, 0.2], [0.1, 0.5, 0.1], [0.1, 0.4, 0.1], [0.2, 1.5, 0.1], [0.1, 0.3, 0.1]],
      focus: 3,
      clues: ['speed', 'query'],
      connection: '“Index” appears beside “speed” and “query.” The surrounding tokens supply context. In a transformer, attention mixes information across positions, and further layers transform those representations.',
      transfer: 'The index passage moves to first place. The stored vectors stayed fixed; changing the question changed their ranking.',
    },
  };

  const passages = [
    {
      id: 'recovery', title: 'Passage 7 · Recovery',
      text: 'After a crash, replay the durable log to restore committed changes.',
      tokens: ['After', 'a', 'crash', ',', 'replay', 'the', 'durable', 'log', 'to', 'restore', 'committed', 'changes', '.'],
      context: [[0.5, 0.2, 0.1], [0.4, 0.1, 0.1], [1.3, 0.3, 0.2], [0.2, 0.1, 0.1], [1.4, 0.3, 0.1], [0.4, 0.1, 0.1], [1.1, 0.3, 0.2], [1.3, 0.3, 0.2], [0.4, 0.1, 0.1], [1.2, 0.2, 0.1], [1.0, 0.3, 0.2], [0.9, 0.3, 0.1], [0.2, 0.1, 0.1]],
    },
    {
      id: 'index', title: 'Passage 12 · Indexes',
      text: 'An index speeds up a query by finding matching rows without scanning the whole table.',
      tokens: ['An', 'index', 'speeds', 'up', 'a', 'query', 'by', 'finding', 'matching', 'rows', 'without', 'scanning', 'the', 'whole', 'table', '.'],
      context: [[0.1, 0.4, 0.1], [0.3, 1.4, 0.2], [0.2, 1.2, 0.1], [0.1, 0.5, 0.1], [0.1, 0.4, 0.1], [0.3, 1.4, 0.2], [0.1, 0.5, 0.1], [0.2, 0.9, 0.2], [0.3, 0.9, 0.1], [0.2, 0.8, 0.2], [0.1, 0.6, 0.1], [0.3, 1.0, 0.2], [0.1, 0.4, 0.1], [0.2, 0.5, 0.1], [0.3, 1.0, 0.2], [0.1, 0.3, 0.1]],
    },
  ];

  function mean(rows) {
    return rows[0].map((_, dimension) => rows.reduce((sum, row) => sum + row[dimension], 0) / rows.length);
  }
  function norm(vector) { return Math.hypot(...vector); }
  function normalize(vector) { const length = norm(vector); return vector.map(value => value / length); }
  function cosine(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0) / (norm(a) * norm(b)); }
  function embed(fixture) { return normalize(mean(fixture.context)); }
  // These stand in for vectors saved at ingestion, independent of the query.
  const stored = passages.map(passage => ({ ...passage, vector: embed(passage) }));
  function rank(queryId) {
    const query = embed(queries[queryId]);
    return stored.map(passage => ({ ...passage, score: cosine(query, passage.vector) })).sort((a, b) => b.score - a.score);
  }
  const vectorText = (vector, digits = 3) => '[' + vector.map(value => value.toFixed(digits)).join(', ') + ']';
  const stages = ['Sentence', 'Tokens', 'Context', 'One vector', 'Compare'];

  function mount(widget) {
    if (!widget || widget.dataset.mounted) return;
    widget.dataset.mounted = 'true';
    const doc = widget.ownerDocument;
    const $ = id => widget.querySelector('#' + id);
    const stageElement = $('ew-stage');
    const select = $('ew-query');
    const back = $('ew-back');
    const next = $('ew-next');
    let stage = 0;
    let queryId = select.value;
    let selectedToken = queries[queryId].focus;

    function node(tag, className, text) {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }
    function paragraph(text, className = 'ew-explain') { return node('p', className, text); }
    function vector(vector, label) {
      const strip = node('div', 'ew-vector');
      strip.setAttribute('aria-label', label + ' ' + vectorText(vector));
      vector.forEach((value, index) => {
        const cell = node('span', 'ew-coordinate');
        cell.append(node('small', '', 'c' + (index + 1)), node('span', '', value.toFixed(3)));
        strip.append(cell);
      });
      return strip;
    }
    function passageCard(passage, extraClass = '') {
      const card = node('div', 'ew-passage ' + extraClass);
      card.append(node('strong', 'ew-passage-title', passage.title), paragraph(passage.text, 'ew-passage-text'));
      return card;
    }

    function render(announce = true) {
      const query = queries[queryId];
      const pooled = mean(query.context);
      const embedding = embed(query);
      widget.dataset.stage = String(stage);
      widget.dataset.query = queryId;
      stageElement.replaceChildren();
      $('ew-question').textContent = query.text;
      $('ew-stage-label').textContent = 'Step ' + (stage + 1) + ' of 5 · ' + stages[stage];
      widget.querySelectorAll('.ew-step').forEach((item, index) => {
        item.classList.toggle('is-current', index === stage);
        item.classList.toggle('is-done', index < stage);
        if (index === stage) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      back.disabled = stage === 0;
      next.disabled = stage === 4;
      next.textContent = stage === 3 ? 'Compare passages →' : stage === 4 ? 'Comparison shown' : 'Next →';

      if (stage === 0) {
        stageElement.append(node('h4', '', 'Which passage would help Maya?'));
        const cards = node('div', 'ew-passage-pair');
        passages.forEach(passage => cards.append(passageCard(passage)));
        stageElement.append(cards, paragraph('Predict before continuing: which passage should rank first for this question? The goal is to compare what the sentences describe, even when their words differ.', 'ew-predict'));
      } else if (stage === 1) {
        stageElement.append(node('h4', '', 'Split text into pieces the model can read'));
        const tokens = node('div', 'ew-tokens');
        query.tokens.forEach((token, index) => {
          const chip = node('span', 'ew-token');
          chip.append(node('small', '', String(index + 1)), node('span', '', token));
          tokens.append(chip);
        });
        stageElement.append(tokens, paragraph('A tokenizer maps text pieces to token IDs. The model looks up a starting vector for each token and accounts for its position. Actual tokenizers may split a word into smaller pieces.'), paragraph(query.tokens.length + ' illustrative tokens → ' + query.tokens.length + ' starting vectors. Next, the model adds context.', 'ew-operation'));
      } else if (stage === 2) {
        stageElement.append(node('h4', '', 'Let each token use the words around it'));
        const connection = node('div', 'ew-context-link');
        connection.append(node('span', '', query.clues.join(' + ')), node('span', 'ew-arrow', '→'), node('strong', '', '“' + query.tokens[query.focus] + '” in this sentence'));
        stageElement.append(connection, paragraph(query.connection));
        const grid = node('div', 'ew-context-grid');
        query.tokens.forEach((token, index) => {
          const button = node('button', 'ew-context-token');
          button.type = 'button';
          button.dataset.tokenIndex = String(index);
          button.setAttribute('aria-pressed', String(index === selectedToken));
          button.setAttribute('aria-controls', 'ew-token-detail');
          button.setAttribute('aria-label', 'Inspect token ' + (index + 1) + ': ' + token);
          button.append(node('span', 'ew-token-word', token));
          const bars = node('span', 'ew-mini-vector');
          bars.setAttribute('aria-hidden', 'true');
          query.context[index].forEach(value => {
            const bar = node('i');
            bar.style.height = (7 + value * 18) + 'px';
            bars.append(bar);
          });
          button.append(bars);
          button.addEventListener('click', () => {
            selectedToken = index;
            grid.querySelectorAll('button').forEach((item, itemIndex) => item.setAttribute('aria-pressed', String(itemIndex === index)));
            detail.textContent = 'Illustrative vector for “' + token + '” at position ' + (index + 1) + ': ' + vectorText(query.context[index], 1) + '. The three coordinate positions do not name topics.';
          });
          grid.append(button);
        });
        const detail = node('p', 'ew-token-detail');
        detail.id = 'ew-token-detail';
        detail.setAttribute('aria-live', 'polite');
        detail.textContent = 'Select a token to inspect its illustrative vector. “' + query.tokens[selectedToken] + '”: ' + vectorText(query.context[selectedToken], 1) + '. The three coordinate positions do not name topics.';
        stageElement.append(grid, detail, paragraph('The learned parameters stay fixed during search. New input changes the representations; it does not train a new model.', 'ew-operation'));
      } else if (stage === 3) {
        stageElement.append(node('h4', '', 'Combine the token vectors into one sentence vector'));
        const calculation = node('div', 'ew-calculation');
        const average = node('div', 'ew-calculation-part');
        average.append(node('strong', '', '1. Average each column'), vector(pooled, 'Mean token vector'));
        const normalized = node('div', 'ew-calculation-part');
        normalized.append(node('strong', '', '2. Scale to magnitude 1'), vector(embedding, 'Normalized question vector'));
        calculation.append(average, node('span', 'ew-arrow', '→'), normalized);
        const firstSum = query.context.reduce((sum, row) => sum + row[0], 0);
        stageElement.append(calculation,
          paragraph('First column: ' + firstSum.toFixed(1) + ' ÷ ' + query.context.length + ' tokens ≈ ' + pooled[0].toFixed(3) + '. Then divide every coordinate by the Euclidean norm (magnitude), ' + norm(pooled).toFixed(3) + '. Displayed numbers are rounded.', 'ew-arithmetic'),
          paragraph('One sentence now has one fixed-size vector: 3 coordinates in this illustration, however many tokens it contains. Real models commonly return hundreds or thousands of coordinates.'),
          paragraph('Context layers → pooling → normalization is one common recipe. Here pooling means an average; other models use a selected token or another pooling method.', 'ew-operation'));
      } else {
        stageElement.append(node('h4', '', 'Compare this question with the saved passages'));
        const queryVector = node('div', 'ew-query-vector');
        queryVector.append(node('strong', '', 'Question vector'), vector(embedding, 'Question vector'));
        stageElement.append(queryVector);
        const ranking = node('div', 'ew-ranking');
        rank(queryId).forEach((passage, index) => {
          const row = passageCard(passage, 'ew-result');
          row.dataset.passage = passage.id;
          row.dataset.score = String(passage.score);
          const rankNumber = node('span', 'ew-rank-number', String(index + 1));
          rankNumber.setAttribute('aria-label', 'Rank ' + (index + 1));
          row.prepend(rankNumber);
          const score = node('div', 'ew-result-math');
          score.append(node('code', 'ew-saved-vector', vectorText(passage.vector)), node('span', 'ew-score', 'cosine ' + passage.score.toFixed(3)));
          row.append(score);
          ranking.append(row);
        });
        stageElement.append(ranking, paragraph('These passage vectors were prepared once with the same illustrative recipe. Only the question vector changes. Cosine compares their directions; the rounded scores are not probabilities.', 'ew-arithmetic'), paragraph(query.transfer, 'ew-predict'));
      }
      if (announce) $('ew-status').textContent = 'Step ' + (stage + 1) + ' of 5: ' + stages[stage] + '. Question: ' + query.label + (stage === 4 ? '. First result: ' + rank(queryId)[0].title + '.' : '.');
    }

    back.addEventListener('click', () => { if (stage > 0) { stage -= 1; render(); } });
    next.addEventListener('click', () => { if (stage < 4) { stage += 1; render(); } });
    select.addEventListener('change', () => { queryId = select.value; selectedToken = queries[queryId].focus; render(); });
    // The lecture has document-level presentation shortcuts. Native controls
    // should retain their own arrow-key and letter-key behavior.
    widget.addEventListener('keydown', event => {
      if (event.target.closest('select, button')) event.stopPropagation();
    });
    $('ew-controls').hidden = false;
    $('ew-fallback').hidden = true;
    $('ew-interactive').hidden = false;
    render(false);
  }
  return { queries, passages, mean, normalize, cosine, embed, rank, mount };
});
