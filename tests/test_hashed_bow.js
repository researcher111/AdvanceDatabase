'use strict';
// The walkthrough must explain the lab's actual transform, including its
// unusual per-distinct-word repeat weight. Python is the independent oracle.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto'), {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const data = require('../labs/_shared/rag-measurements.js');
const context = {CourseRagMeasurements: data, document: {getElementById: () => null, querySelectorAll: () => []}, Float64Array};
context.window = context;
vm.createContext(context);
for (const file of ['viz.js', 'hashed-bow.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'lectures/lecture-12', file), 'utf8'), context, {filename: file});
}
const api = context.HashedBow;
assert(api, 'the walkthrough exports its calculation API');
const rag = vm.runInContext('RAG', context);
rag.STOP = new Set(data.preview.stop);
rag.build(data.preview.chunks);
const storedChunks = rag.chunks, storedVectors = rag.vectors;
const before = JSON.stringify({dim: rag.DIM, chunks: rag.chunks, vectors: rag.vectors, results: rag.retrieve('How does a database recover after a crash?', 3)});
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 1e-12, `${label}: ${actual} != ${expected}`);
const md5 = word => crypto.createHash('md5').update(word).digest('hex');
const bucket = (word, dimensions) => Number(BigInt('0x' + md5(word)) % BigInt(dimensions));
const texts = [
  'How does a DATABASE recover after a crash?',
  'buffer buffer buffer recovery',
  'recovery buffer buffer buffer',
  'the AND of to with 123 --',
  '',
  'Recover, recovery; crash-recovery. CAFÉ: naïve?',
  'constructor prototype tostring hasownproperty',
];
const dimensions = [8, 16, 2048];
const python = spawnSync(process.env.PYTHON || 'python3', ['-c', `
import collections, json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(sys.argv[1]) / 'labs/lab-10/starter'))
import micro_rag
request = json.load(sys.stdin)
result = []
for width in request['dimensions']:
    micro_rag.DIM = width
    for text in request['texts']:
        tokens = re.findall(r'[a-z]+', text.lower())
        kept = [word for word in tokens if word not in micro_rag.STOPWORDS]
        result.append({'text': text, 'dimensions': width, 'tokens': tokens,
                       'retained': kept, 'vector': micro_rag.embed(text)})
print(json.dumps(result))
`, root], {input: JSON.stringify({texts, dimensions}), encoding: 'utf8', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
assert.equal(python.status, 0, `Python reference failed: ${python.stderr}`);
for (const expected of JSON.parse(python.stdout)) {
  const trace = api.trace(expected.text, expected.dimensions);
  assert.deepEqual(plain(api.tokenize(expected.text)), expected.tokens, 'ASCII word tokenization matches Python');
  assert.deepEqual(plain(trace.tokens), expected.tokens);
  assert.deepEqual(plain(trace.retained), expected.retained, 'stopword removal matches the lab');
  assert.equal(trace.vector.length, expected.dimensions);
  assert.equal(trace.raw.length, expected.dimensions);
  trace.vector.forEach((value, i) => close(value, expected.vector[i], `Python parity at width ${expected.dimensions}, bucket ${i}`));
  for (const row of trace.words) {
    assert.equal(row.hash, md5(row.word), 'the shown MD5 is the actual digest');
    assert.equal(row.bucket, bucket(row.word, expected.dimensions), 'hash modulo uses the selected width');
    assert.equal(row.count, expected.retained.filter(word => word === row.word).length);
    close(row.weight, 1 / (1 + Math.log(row.count)), 'one repeat-scaled weight per distinct word');
  }
  const length = Math.hypot(...trace.vector);
  close(length, expected.retained.length ? 1 : 0, 'nonzero vectors have unit length; empty vectors remain zero');
  assert(trace.vector.every(Number.isFinite), 'all-stopword input cannot create NaN');
}

const repeated = api.trace('buffer buffer buffer recovery', 2048);
assert(repeated.words.find(row => row.word === 'buffer').weight < repeated.words.find(row => row.word === 'recovery').weight,
  'the lab decreases a repeated word’s contribution; it does not use ordinary term frequency');
assert.deepEqual(plain(repeated.vector), plain(api.trace('recovery buffer buffer buffer', 2048).vector), 'word order does not affect this representation');
close(api.compare('buffer buffer buffer recovery', 'recovery buffer buffer buffer', 2048).score, 1, 'reordered words have cosine one');
close(api.compare('the and', 'database recovery', 8).score, 0, 'zero-vector comparison returns zero');

// Find a collision independently. Sharing a bucket must not be described as
// sharing a word or understanding its meaning.
const vocabulary = ['buffer', 'recovery', 'crash', 'index', 'table', 'wal', 'banana', 'moon', 'cache', 'frame'];
const first = new Map(); let pair;
for (const word of vocabulary) {
  const at = bucket(word, 8);
  if (first.has(at)) {pair = [first.get(at), word]; break;}
  first.set(at, word);
}
assert(pair, 'fixture includes a real MD5 collision');
const collided = api.compare(pair[0], pair[1], 8);
close(collided.score, 1, 'different single words in one bucket produce a misleading score of one');
assert.deepEqual(plain(collided.sharedWords), [], 'a collision is not a shared word');
assert(collided.overlaps.some(row => row.collision), 'the explanation marks a hash collision');
const summed = api.trace(pair.join(' '), 8);
close(summed.raw[bucket(pair[0], 8)], 2, 'colliding distinct words add into the same coordinate');

for (const width of dimensions) {
  const comparison = api.compare('crash recovery buffer', 'buffer cache recovery', width);
  const dot = comparison.query.vector.reduce((sum, value, i) => sum + value * comparison.passage.vector[i], 0);
  close(comparison.score, dot, 'comparison uses the displayed normalized vectors');
  close(comparison.overlaps.reduce((sum, row) => sum + row.product, 0), dot, 'displayed coordinate products explain the score');
}
assert.equal(rag.DIM, 2048, 'exploring toy widths cannot change the course search width');
assert.equal(rag.chunks, storedChunks, 'the stored chunks keep their identity');
assert.equal(rag.vectors, storedVectors, 'the stored passage vectors keep their identity');
assert.equal(JSON.stringify({dim: rag.DIM, chunks: rag.chunks, vectors: rag.vectors, results: rag.retrieve('How does a database recover after a crash?', 3)}), before,
  'the existing search corpus, vectors, and ranking remain unchanged');
console.log('Hashed bag-of-words: Python parity at 8/16/2048, independent MD5, repeats, collisions, normalization, cosine, zero input, and search isolation pass.');
