'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const modelPath = path.join(__dirname, '../labs/lab-09/embedding-model.js');
const M = require(modelPath);

const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const state = M.createState();
const initialState = JSON.stringify(state);
const trace = M.encode(M.EXAMPLES[0].text, state);

assert.deepEqual(trace.tokens, ['recover', 'database', 'after', 'crash']);
assert.equal(trace.tokenIds.length, 4);
assert.equal(trace.ffHidden[0].length, 4);
assert.equal(trace.hidden[0].length, 3);
assert.equal(trace.unit.length, 2);
trace.tokenIds.forEach((id, i) => assert.deepEqual(trace.embeddings[i], M.VOCAB[id].vector));

// Check probability rows and one complete attention calculation independently.
trace.attention.forEach(row => {
  close(row.reduce((sum, value) => sum + value, 0), 1);
  row.forEach(value => assert.ok(value > 0 && value < 1));
});
const rawScores = trace.k.map(key => dot(trace.q[0], key) / Math.sqrt(3));
const denominator = rawScores.reduce((sum, value) => sum + Math.exp(value), 0);
rawScores.forEach((value, i) => {
  close(trace.scores[0][i], value);
  close(trace.attention[0][i], Math.exp(value) / denominator);
});
for (let coordinate = 0; coordinate < 3; coordinate++) {
  close(trace.mixed[0][coordinate], trace.v.reduce((sum, row, i) =>
    sum + row[coordinate] * trace.attention[0][i], 0));
}

// Later words affect an earlier row. This block has no causal attention mask.
const changed = M.encode('recover database after index', state);
assert.notDeepEqual(trace.hidden[0], changed.hidden[0]);

// No positional encoding means the mean-pooled result is permutation invariant.
const reversed = M.encode('crash after database recover', state);
trace.unit.forEach((value, i) => close(value, reversed.unit[i]));

// Recover mean pooling and the shared projection from the exposed token rows.
trace.pooled.forEach((value, i) => {
  close(value, trace.hidden.reduce((sum, row) => sum + row[i], 0) / trace.tokens.length);
});
trace.projected.forEach((value, i) => close(value, dot(state.projection[i], trace.pooled)));
close(dot(trace.unit, trace.unit), 1);
trace.normalized.forEach((row, i) => {
  const source = trace.embeddings[i];
  const rms = Math.sqrt(dot(source, source) / 3 + M.EPSILON);
  row.forEach((value, j) => close(value, source[j] / rms));
});

// Prefix truncation must discard the suffix before any attention computation.
const short = M.encode('recover database after crash', state, {maxTokens: 2});
const prefix = M.encode('recover database', state, {maxTokens: 2});
assert.deepEqual(short.dropped, ['after', 'crash']);
assert.deepEqual(short.unit, prefix.unit);
assert.deepEqual(short.attention, prefix.attention);
assert.deepEqual(M.encode('xylophone', state).tokenIds, [0]);
assert.throws(() => M.encode('', state), /at least one word/);
[0, 1, 7, 2.5, NaN].forEach(maxTokens =>
  assert.throws(() => M.encode('recover', state, {maxTokens}), /integer from 2 to 6/));

const baseline = M.evaluate(state);
baseline.queries.forEach(query => {
  const logits = query.scores.map(score => score.cosine / M.TEMPERATURE);
  const positive = query.scores.findIndex(score => score.id === query.positiveId);
  const expectedLoss = Math.log(logits.reduce((sum, value) => sum + Math.exp(value), 0)) - logits[positive];
  close(query.loss, expectedLoss);
  close(query.scores.reduce((sum, score) => sum + score.probability, 0), 1);
  query.scores.forEach(score => {
    const doc = baseline.documents.find(document => document.id === score.id);
    close(score.cosine, dot(query.trace.unit, doc.trace.unit));
  });
});
assert.equal(JSON.stringify(state), initialState, 'Inference must not update any weights.');
assert.equal(baseline.queries.find(query => query.id === 'speed').ranking[0], 'recovery');

const backboneBefore = JSON.stringify(M.BACKBONE);
const trained = M.train(state, 30);
assert.ok(trained.loss < baseline.loss / 10, 'Real training must reduce contrastive loss.');
assert.equal(state.steps, 30);
assert.equal(state.history.length, 31);
state.history.slice(1).forEach((loss, i) => assert.ok(loss <= state.history[i] + 1e-12));
assert.notDeepEqual(state.projection, M.INITIAL_PROJECTION);
assert.equal(JSON.stringify(M.BACKBONE), backboneBefore, 'Training must preserve the backbone.');
assert.deepEqual(M.encode(M.EXAMPLES[0].text, state).pooled, trace.pooled);
trained.queries.forEach(query => assert.equal(query.ranking[0], query.positiveId));
assert.notDeepEqual(trained.documents[0].trace.unit, baseline.documents[0].trace.unit,
  'Training must recompute document vectors with the same updated projection.');
assert.deepEqual(M.createState(), JSON.parse(initialState), 'Reset must restore the full initial state.');
const secondRun = M.createState();
M.train(secondRun, 30);
assert.deepEqual(secondRun, state, 'Training must be deterministic.');
assert.deepEqual(M.train(state, 0), trained);
assert.throws(() => M.train(state, -1), /integer from 0 to 1000/);

// The standalone page loads this exact file without a bundler.
const browser = {};
vm.runInNewContext(fs.readFileSync(modelPath, 'utf8'), browser);
assert.equal(typeof browser.EmbeddingModel.encode, 'function');
close(browser.EmbeddingModel.evaluate(browser.EmbeddingModel.createState()).loss, baseline.loss);
console.log(`Embedding model passed: loss ${baseline.loss.toFixed(6)} → ${trained.loss.toFixed(6)}; speed ranking corrected.`);
