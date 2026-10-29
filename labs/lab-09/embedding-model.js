/* Invented teaching model. These weights and word tokens do not come from Gemma.
 * One bidirectional block: RMSNorm, one attention head, residual, ReLU MLP,
 * residual, mean pooling, a shared linear projection, and L2 normalization.
 * No positional encoding, padding, task prefixes, or production model extras.
 * Training changes only the shared projection. The backbone remains fixed.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EmbeddingModel = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TEMPERATURE = 0.25;
  const EPSILON = 1e-8;
  const WORDS = {
    '[UNK]': [0.3, 0.3, 0.3],
    redo: [1.0, 0.0, 0.3], log: [0.9, 0.1, 0.4],
    restores: [1.0, 0.1, 0.1], committed: [0.8, 0.0, 0.4],
    changes: [0.7, 0.2, 0.4], index: [0.1, 1.0, 0.2],
    finds: [0.1, 0.8, 0.1], rows: [0.3, 0.7, 0.3],
    without: [0.2, 0.3, 0.1], scanning: [0.1, 1.0, 0.1],
    locks: [0.1, 0.1, 1.0], stop: [0.2, 0.2, 0.6],
    conflicting: [0.0, 0.1, 1.0], writes: [0.3, 0.1, 0.8],
    recover: [1.0, 0.1, 0.1], database: [0.4, 0.4, 0.4],
    after: [0.1, 0.2, 0.1], crash: [0.9, -0.2, 0.3],
    restore: [1.0, 0.1, 0.1], failure: [0.8, -0.1, 0.2],
    find: [0.1, 0.8, 0.1], with: [0.2, 0.2, 0.1],
    an: [0.2, 0.2, 0.2]
  };
  const VOCAB = Object.entries(WORDS).map(([token, vector], id) => ({id, token, vector}));
  const IDS = Object.fromEntries(VOCAB.map(({token, id}) => [token, id]));
  const DOCS = [
    {id: 'recovery', text: 'redo log restores committed changes'},
    {id: 'speed', text: 'index finds rows without scanning'},
    {id: 'locking', text: 'locks stop conflicting writes'}
  ].map(doc => ({...doc, tokens: doc.text.split(' ')}));
  const EXAMPLES = [
    {id: 'recovery', label: 'Recovery', text: 'recover database after crash', positiveId: 'recovery'},
    {id: 'paraphrase', label: 'Same idea, new words', text: 'restore changes after failure', positiveId: 'recovery'},
    {id: 'speed', label: 'Faster lookup', text: 'find rows with an index', positiveId: 'speed'}
  ].map(example => ({...example, tokens: example.text.split(' ')}));
  // Each matrix row produces one output coordinate: y = W x.
  const BACKBONE = {
    query: [[0.4, 0.1, 0.0], [0.0, 0.4, 0.1], [0.1, 0.0, 0.4]],
    key: [[0.3, 0.0, 0.1], [0.1, 0.3, 0.0], [0.0, 0.1, 0.3]],
    value: [[0.3, 0.1, 0.0], [0.0, 0.3, 0.1], [0.1, 0.0, 0.3]],
    output: [[0.2, 0.0, 0.1], [0.1, 0.2, 0.0], [0.0, 0.1, 0.2]],
    ffUp: [[0.3, -0.2, 0.1], [-0.1, 0.3, 0.1], [0.1, 0.0, 0.3], [0.2, 0.1, -0.2]],
    ffDown: [[0.15, -0.05, 0.1, 0.1], [0.1, 0.15, -0.05, 0.0], [0.0, 0.1, 0.15, 0.1]]
  };
  const INITIAL_PROJECTION = [[1.0, -0.1, 0.1], [0.1, -0.3, 0.7]];
  const dot = (a, b) => a.reduce((total, value, i) => total + value * b[i], 0);
  const linear = (matrix, vector) => matrix.map(row => dot(row, vector));
  const add = (a, b) => a.map((value, i) => value + b[i]);
  const norm = vector => Math.sqrt(dot(vector, vector));
  const unit = vector => {
    const length = norm(vector);
    return length > EPSILON ? vector.map(value => value / length) : vector.map(() => 0);
  };
  const rmsNorm = vector => {
    const rms = Math.sqrt(dot(vector, vector) / vector.length + EPSILON);
    return vector.map(value => value / rms);
  };
  const softmax = values => {
    const maximum = Math.max(...values);
    const exps = values.map(value => Math.exp(value - maximum));
    const total = exps.reduce((a, b) => a + b, 0);
    return exps.map(value => value / total);
  };
  function tokenize(text) {
    return String(text).toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
  }
  function encode(text, state, options = {}) {
    const maxTokens = options.maxTokens === undefined ? 6 : options.maxTokens;
    if (!Number.isInteger(maxTokens) || maxTokens < 2 || maxTokens > 6) {
      throw new RangeError('maxTokens must be an integer from 2 to 6.');
    }
    const allTokens = tokenize(text);
    if (!allTokens.length) throw new Error('Enter at least one word.');
    const tokens = allTokens.slice(0, maxTokens);
    const tokenIds = tokens.map(token => IDS[token] === undefined ? 0 : IDS[token]);
    const embeddings = tokenIds.map(id => VOCAB[id].vector.slice());
    const normalized = embeddings.map(rmsNorm);
    const q = normalized.map(row => linear(BACKBONE.query, row));
    const k = normalized.map(row => linear(BACKBONE.key, row));
    const v = normalized.map(row => linear(BACKBONE.value, row));
    // Every row attends to every retained token, including later tokens.
    const scores = q.map(query => k.map(key => dot(query, key) / Math.sqrt(3)));
    const attention = scores.map(softmax);
    const mixed = attention.map(weights => [0, 1, 2].map(column =>
      weights.reduce((total, weight, i) => total + weight * v[i][column], 0)));
    const attentionOutput = mixed.map(row => linear(BACKBONE.output, row));
    const residual = embeddings.map((row, i) => add(row, attentionOutput[i]));
    const ffNormalized = residual.map(rmsNorm);
    const ffHidden = ffNormalized.map(row => linear(BACKBONE.ffUp, row).map(value => Math.max(0, value)));
    const ffOutput = ffHidden.map(row => linear(BACKBONE.ffDown, row));
    const hidden = residual.map((row, i) => add(row, ffOutput[i]));
    const pooled = [0, 1, 2].map(column => hidden.reduce((sum, row) => sum + row[column], 0) / hidden.length);
    const projected = linear(state.projection, pooled);
    return {tokens, tokenIds, dropped: allTokens.slice(maxTokens), embeddings, normalized,
      q, k, v, scores, attention, mixed, attentionOutput, residual, ffNormalized,
      ffHidden, ffOutput, hidden, pooled, projected, unit: unit(projected)};
  }
  function evaluate(state, options = {}) {
    const documents = DOCS.map(doc => ({...doc, trace: encode(doc.text, state, options)}));
    const queries = EXAMPLES.map(example => {
      const trace = encode(example.text, state, options);
      const cosines = documents.map(doc => dot(trace.unit, doc.trace.unit));
      const probabilities = softmax(cosines.map(value => value / TEMPERATURE));
      const scores = documents.map((doc, i) => ({id: doc.id, cosine: cosines[i], probability: probabilities[i]}));
      const positiveIndex = DOCS.findIndex(doc => doc.id === example.positiveId);
      const ranking = scores.slice().sort((a, b) => b.cosine - a.cosine).map(score => score.id);
      return {...example, trace, scores, ranking, loss: -Math.log(probabilities[positiveIndex])};
    });
    return {documents, queries, temperature: TEMPERATURE,
      loss: queries.reduce((sum, query) => sum + query.loss, 0) / queries.length};
  }
  function createState() {
    const state = {projection: INITIAL_PROJECTION.map(row => row.slice()), steps: 0, history: []};
    state.history.push(evaluate(state).loss);
    return state;
  }
  function train(state, steps = 1) {
    if (!Number.isInteger(steps) || steps < 0 || steps > 1000) {
      throw new RangeError('steps must be an integer from 0 to 1000.');
    }
    // Centered finite differences are practical for these six trainable numbers.
    // Both query and document vectors use the perturbed shared projection.
    const delta = 1e-5;
    for (let step = 0; step < steps; step++) {
      const before = evaluate(state).loss;
      const original = state.projection.map(row => row.slice());
      const gradient = original.map(row => row.map(() => 0));
      for (let row = 0; row < 2; row++) {
        for (let column = 0; column < 3; column++) {
          state.projection[row][column] = original[row][column] + delta;
          const plus = evaluate(state).loss;
          state.projection[row][column] = original[row][column] - delta;
          const minus = evaluate(state).loss;
          gradient[row][column] = (plus - minus) / (2 * delta);
          state.projection[row][column] = original[row][column];
        }
      }
      // Backtracking keeps each visible update from increasing training loss.
      let rate = 0.3;
      let after = before;
      let accepted = false;
      for (let attempt = 0; attempt < 16; attempt++, rate /= 2) {
        state.projection = original.map((row, i) => row.map((value, j) => value - rate * gradient[i][j]));
        after = evaluate(state).loss;
        if (Number.isFinite(after) && after <= before) { accepted = true; break; }
      }
      if (!accepted) { state.projection = original; after = before; }
      state.steps += 1;
      state.history.push(after);
    }
    return evaluate(state);
  }
  // Freeze fixtures so UI code cannot accidentally change the fixed backbone.
  function freeze(value) {
    Object.values(value).forEach(child => { if (child && typeof child === 'object') freeze(child); });
    return Object.freeze(value);
  }
  [VOCAB, DOCS, EXAMPLES, BACKBONE, INITIAL_PROJECTION].forEach(freeze);
  return {VOCAB, DOCS, EXAMPLES, BACKBONE, INITIAL_PROJECTION, TEMPERATURE,
    EPSILON, createState, tokenize, encode, evaluate, train};
}));
