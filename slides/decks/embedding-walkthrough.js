/* Lecture 11: native, editable SVG builds of the reading's embedding example.
 * Token splits and vectors come from the shared illustrative data, not a model.
 * Keep this scene in place and preserve its four-minute teaching allocation.
 */
(function () {
  'use strict';
  const deck = window.COURSE_DECKS?.[11];
  if (!deck) return;
  const api = window.EmbeddingWalkthrough;
  if (!api) throw new Error('The embedding slide requires the shared embedding example.');
  const scene = deck.scenes.find(item => item.id === 'embedding');
  if (!scene) throw new Error('Missing Lecture 11 embedding scene.');
  const P = window.DeckViz.palette;
  const colors = [P.orange, P.green, P.blue];
  const fills = [P.orangeLight, P.greenLight, P.blueLight];
  const labels = ['Predict the passage', 'Split into tokens', 'Use the other words', 'Make one vector', 'Rank recovery passages', 'Try a paraphrase', 'Change the question'];
  const captions = [
    'Maya asks about crash recovery. Which stored passage should the search put first?',
    'The tokenizer splits the sentence into pieces. Token IDs select starting vectors; positions matter too.',
    'Context means the other words in the sentence. They help us decide what “recover” means here.',
    'This example averages the token vectors, then divides the mean by its magnitude to make one unit vector.',
    'Compare the question vector with the saved passage vectors. The higher cosine score ranks first.',
    'Different words can describe the same task. This paraphrase still ranks the recovery passage first.',
    'The question now asks about query speed. The stored vectors stay fixed, but their ranking changes.',
  ];

  function text(d, key, x, y, value, size = 24, color = P.ink, anchor = 'middle', weight = 500) {
    d.text(key, x, y, value, size, color, anchor, weight);
  }
  function wrap(value, limit) {
    const lines = [''];
    value.split(/\s+/).forEach(word => {
      const last = lines.length - 1;
      if (lines[last] && (lines[last] + ' ' + word).length > limit) lines.push(word);
      else lines[last] = (lines[last] + ' ' + word).trim();
    });
    return lines;
  }
  function vectorString(values) { return '[' + values.map(value => value.toFixed(3)).join(', ') + ']'; }
  function base(d, query) {
    text(d, 'ew-query', 640, 215, query.text, 31, P.ink, 'middle', 650);
    text(d, 'ew-disclaimer', 640, 260, 'Illustrative token splits and vectors · computed scores, not real model outputs', 20, P.muted);
  }
  function foot(d, value) { text(d, 'ew-foot', 640, 647, value, 22, P.muted); }
  function tokens(d, query) {
    const width = 110, gap = 12, start = (1280 - (query.tokens.length * width + (query.tokens.length - 1) * gap)) / 2;
    query.tokens.forEach((token, index) => {
      const x = start + index * (width + gap);
      d.box('ew-token-' + index, x, 328, width, 54, token, P.white, P.line, 23);
    });
  }
  function context(d, query) {
    const examples = [
      { key: 'health', x: 65, title: 'Recover from an illness', lines: ['She will recover after the flu.'], clue: '“flu” gives a clue', meaning: 'recover → get well' },
      { key: 'database', x: 665, title: 'Recover a database', lines: ['How does a database recover', 'after a crash?'], clue: '“database” + “crash” give clues', meaning: 'recover → restore database state' },
    ];
    examples.forEach(example => {
      const x = example.x;
      d.rect('ew-context-' + example.key, x, 298, 550, 234, P.white, P.line, 8, 2);
      text(d, 'ew-context-' + example.key + '-title', x + 25, 330, example.title, 24, P.green, 'start', 650);
      example.lines.forEach((line, index) => text(d, 'ew-context-' + example.key + '-sentence-' + index, x + 25, 374 + index * 31, line, 25, P.ink, 'start'));
      text(d, 'ew-context-' + example.key + '-clue', x + 25, 449, example.clue, 23, P.muted, 'start');
      text(d, 'ew-context-' + example.key + '-meaning', x + 25, 493, example.meaning, 25, P.orange, 'start', 650);
    });
    text(d, 'ew-context-mechanism', 640, 566, 'The model uses the other tokens to update the vector for “recover”.', 25, P.ink);
    text(d, 'ew-context-vector', 640, 606, 'Illustrative vector for “recover” here: ' + vectorString(query.context[query.focus]), 24, P.green);
    foot(d, 'Same word, different sentence: its vector can change. The trained model stays fixed.');
  }
  function predict(d) {
    api.passages.forEach((passage, index) => {
      const x = index ? 680 : 80, width = 520;
      d.rect('ew-choice-' + passage.id, x, 329, width, 193, P.white, P.line, 8, 2);
      text(d, 'ew-choice-' + passage.id + '-title', x + 25, 362, passage.title, 26, P.green, 'start', 650);
      wrap(passage.text, 37).forEach((line, lineIndex) => text(d, 'ew-choice-' + passage.id + '-line-' + lineIndex, x + 25, 406 + lineIndex * 33, line, 25, P.ink, 'start'));
    });
    text(d, 'ew-predict', 640, 578, 'Predict first. Then follow the question through the model.', 28, P.orange);
    foot(d, 'Same stored passages · a different question can require a different ranking');
  }
  function tokenize(d, query) {
    tokens(d, query);
    d.arrow('ew-lookup-arrow', 640, 403, 640, 456, P.orange, 4);
    d.box('ew-lookup', 310, 470, 660, 75, 'Token IDs → starting vectors + position information', P.greenLight, P.green, 26);
    text(d, 'ew-token-count', 640, 587, query.tokens.length + ' token pieces → ' + query.tokens.length + ' starting vectors', 28, P.green);
    foot(d, 'Real tokenizers may split a word into smaller pieces. These splits are illustrative.');
  }
  function pooling(d, query) {
    const average = api.mean(query.context), embedding = api.embed(query);
    const magnitude = Math.hypot(...average);
    text(d, 'ew-pool-title', 325, 319, '1. Average each coordinate', 27, P.ink, 'middle', 650);
    text(d, 'ew-normalize-title', 960, 319, '2. Divide by the magnitude', 27, P.ink, 'middle', 650);
    average.forEach((value, coordinate) => {
      const x = 90 + coordinate * 158;
      d.rect('ew-mean-cell-' + coordinate, x, 357, 145, 140, fills[coordinate], colors[coordinate], 7, 2);
      text(d, 'ew-mean-label-' + coordinate, x + 72.5, 383, 'c' + (coordinate + 1), 21, P.muted);
      const sum = query.context.reduce((total, row) => total + row[coordinate], 0);
      text(d, 'ew-mean-sum-' + coordinate, x + 72.5, 423, sum.toFixed(1) + ' ÷ ' + query.context.length, 24, P.ink);
      text(d, 'ew-mean-' + coordinate, x + 72.5, 467, value.toFixed(3), 29, colors[coordinate], 'middle', 650);
      const right = 719 + coordinate * 158;
      d.rect('ew-embedding-cell-' + coordinate, right, 357, 145, 140, fills[coordinate], colors[coordinate], 7, 2);
      text(d, 'ew-embedding-label-' + coordinate, right + 72.5, 383, 'c' + (coordinate + 1), 21, P.muted);
      text(d, 'ew-embedding-' + coordinate, right + 72.5, 436, embedding[coordinate].toFixed(3), 29, colors[coordinate], 'middle', 650);
    });
    d.arrow('ew-normalize-arrow', 579, 427, 688, 427, P.orange, 4);
    text(d, 'ew-magnitude', 954, 537, 'Euclidean norm of mean ≈ ' + magnitude.toFixed(3), 23, P.muted);
    text(d, 'ew-pool-count', 325, 537, query.tokens.length + ' token vectors → 1 mean vector', 23, P.muted);
    text(d, 'ew-fixed-size', 640, 588, 'One sentence → 3 coordinates here, however many tokens it contains', 26, P.green);
    foot(d, 'One common recipe; pooling rules and real dimensions vary. Numbers are rounded.');
  }
  function overview(d) {
    const entries = [[65, 220, 'Token pieces'], [350, 240, 'Use other words'], [655, 260, 'Pool + normalize'], [980, 230, 'One vector']];
    entries.forEach(([x, width, label], index) => {
      d.box('ew-overview-' + index, x, 294, width, 51, label, index === 3 ? P.greenLight : P.white, index === 3 ? P.green : P.line, 22);
      if (index < entries.length - 1) d.arrow('ew-overview-arrow-' + index, x + width + 10, 319, entries[index + 1][0] - 13, 319, P.orange, 3);
    });
  }
  function ranking(d, queryId) {
    const query = api.queries[queryId];
    overview(d);
    text(d, 'ew-query-vector-label', 101, 382, 'q =', 26, P.green, 'start', 650);
    text(d, 'ew-query-vector', 360, 382, vectorString(api.embed(query)), 26, P.green);
    text(d, 'ew-cosine-rule', 970, 382, 'cosine = q · v for unit vectors', 23, P.muted);
    api.rank(queryId).forEach((passage, index) => {
      const y = 412 + index * 113;
      d.rect('ew-result-' + passage.id, 65, y, 1145, 102, index === 0 ? P.greenLight : P.white, index === 0 ? P.green : P.line, 7, 2);
      text(d, 'ew-rank-' + passage.id, 98, y + 48, String(index + 1), 36, P.green, 'middle', 650);
      text(d, 'ew-passage-' + passage.id + '-title', 139, y + 22, passage.title, 23, P.green, 'start', 650);
      wrap(passage.text, 64).forEach((line, lineIndex) => text(d, 'ew-passage-' + passage.id + '-line-' + lineIndex, 139, y + 51 + lineIndex * 27, line, 22, P.ink, 'start'));
      text(d, 'ew-score-' + passage.id, 1060, y + 30, passage.score.toFixed(3), 30, P.green, 'middle', 650);
      text(d, 'ew-stored-' + passage.id, 1055, y + 72, vectorString(passage.vector), 21, P.muted);
    });
    foot(d, 'Same model + compatible settings → comparable vectors; read the passage to check relevance.');
  }

  Object.assign(scene, {
    title: 'Inside an embedding model',
    kind: 'visual',
    clarityNative: true,
    states: labels,
    steps: labels.length,
    // The existing scene's four-minute allocation is intentionally unchanged.
    draw(d, step) {
      const queryId = step === 5 ? 'restart' : step === 6 ? 'speed' : 'recovery';
      const query = api.queries[queryId];
      base(d, query);
      if (step === 0) predict(d);
      else if (step === 1) tokenize(d, query);
      else if (step === 2) context(d, query);
      else if (step === 3) pooling(d, query);
      else ranking(d, queryId);
    },
    teaching: {
      idea: 'An embedding model maps the question and each passage to comparable vectors; a new question changes the similarity ranking of the same saved passages.',
      question: 'Why does changing Maya’s question change the ranking without changing the stored passage vectors?',
      answer: 'The same trained model and compatible query/document settings give a new question vector. Cosine compares that vector with each saved passage vector, producing new scores and a new order. Matching dimensions alone does not make unrelated model spaces compatible.',
      builds: [
        'Calibrate with the familiar task: read Maya’s recovery question and both passages. Ask which passage should rank first before revealing vectors or scores. An exact string search can miss useful text with different wording. These are fictional classroom passages.',
        'Trace text pieces into token IDs, then starting vectors and position information. The visible token splits are hand-authored teaching examples; an actual tokenizer can split words into subwords and handle punctuation differently.',
        'Read the illness sentence first: recover means get well because flu supplies a clue. Then read Maya’s question: database and crash make recover mean restoring database state. These other words are the context. Connect that familiar act of reading to the model: it uses information from the other tokens to update each token vector, so the same word can have a different vector in a different sentence. Inspect the three illustrative numbers for recover in Maya’s question; no vector is shown or measured for the illness sentence. A transformer uses attention and further layers for these updates. The numbers are hand-authored examples, not learned outputs or attention measurements. The trained model stays fixed during search.',
        'Average each coordinate across all nine contextual token vectors. The sums, means, Euclidean norm, and normalized coordinates are computed from the same data as the reading widget. Values shown are rounded. This is one common transformer recipe; other models use different pooling, including a selected final token. Three dimensions keep the arithmetic visible; real output dimensions commonly number in the hundreds or thousands.',
        'Compare the unit question vector with the two saved unit passage vectors. Scores are computed cosine similarities, not probabilities or measured retrieval quality. In a real system the passages are embedded when stored, then reused for many questions. Read the top passage to check that it answers the question.',
        'Ask for a prediction, then show the restart/log paraphrase. Its different question vector still ranks the recovery passage first in this illustrative example. This demonstrates the intended behavior, not a guarantee that every paraphrase will work in every model.',
        'Ask which passage should move up when Maya wants a faster query. Reveal the new ranking while keeping both saved passage vectors unchanged. Return to the whole sentence → tokens → context → vector → comparison sequence. Ask a student to explain why switching to an incompatible question model would break the comparison.',
      ],
      checks: [
        { question: 'Which passage should help with Maya’s crash-recovery question?', answer: 'Passage 7 explains replaying the durable log to restore committed changes. Predict that passage before seeing the scores, then read it to check its usefulness.' },
        { question: 'Does one word always become exactly one token?', answer: 'No. A real tokenizer may split a word into smaller pieces and treat punctuation separately. The displayed splits are illustrative.' },
        { question: 'Which words change what recover means in the two sentences?', answer: 'Flu makes recover mean get well. Database and crash make it mean restoring database state. Those other words are the context. The model uses information from other tokens to update the vector for recover, so the same word can have different vectors in different sentences. The trained model stays fixed during search.' },
        { question: 'What do we divide by to normalize the averaged vector?', answer: 'Divide every coordinate of the mean vector by that mean vector’s Euclidean norm. This produces magnitude one. Averaging and normalization are one common recipe; models can use other pooling methods.' },
        { question: 'Do these cosine scores evaluate a current embedding model?', answer: 'No. They are computed from hand-authored example vectors, not real model outputs. A cosine score is not a probability that a passage answers the question.' },
        { question: 'Does the paraphrase’s successful match guarantee that all paraphrases work?', answer: 'No. It demonstrates the intended behavior using illustrative numbers. Test a real model with representative questions, paraphrases, and relevance judgments.' },
        { question: 'What changed when the index passage moved to first place?', answer: 'The question and its vector changed. The saved passage vectors stayed fixed. Comparisons require the same model and compatible settings; matching dimensions alone is insufficient.' },
      ],
      context: 'Three coordinates keep every value visible in this hand-authored example. Real models commonly return hundreds or thousands of coordinates, and their tokenizer, pooling, query/document formatting, normalization, and metric requirements can differ. Current model examples and official references are in the reading’s embedding-models section. Evaluate retrieval quality on representative questions and relevant passages.',
      reference: 'Reading: lectures/lecture-11/vectors.html#embedding-walkthrough-title and #embedding-models. Mechanism references: Hugging Face tokenizer summary; Sentence Transformers custom model documentation (Transformer, Pooling, Normalize).',
    },
  });
  delete scene.term;
  delete scene.definition;
  delete scene.traceId;
  scene.sources = Array.from(new Set([
    ...(scene.sources || []),
    'lectures/lecture-11/vectors.html#embedding-walkthrough-title',
    'lectures/lecture-11/vectors.html#embedding-models',
    'https://huggingface.co/docs/transformers/tokenizer_summary',
    'https://sbert.net/docs/sentence_transformer/usage/custom_models.html',
  ]));
  window.CourseClarityCaptions[11].embedding = captions;
})();
