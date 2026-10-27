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
    'Maya asks about crash recovery. Which stored passage should rank first?',
    'A tokenizer splits text into pieces called tokens. Each token ID selects a starting vector. The model also uses token positions.',
    'Context is the surrounding text. “Flu” and “database” give different clues about what “recover” means.',
    'Average the token vectors to make one vector. Divide its coordinates by its length to give it length one.',
    'Compare the query vector with each stored passage vector. A higher cosine score puts a passage earlier in the ranking.',
    'The question now uses different words for the same task. In this example, the recovery passage still ranks first.',
    'The question now asks about query speed. Only the query vector changes. The same stored passage vectors produce a different ranking.',
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
    text(d, 'ew-disclaimer', 640, 260, 'Example tokens and vectors · computed scores · no model outputs', 20, P.muted);
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
    foot(d, 'A different sentence can change the token vector. The trained model stays fixed.');
  }
  function predict(d) {
    api.passages.forEach((passage, index) => {
      const x = index ? 680 : 80, width = 520;
      d.rect('ew-choice-' + passage.id, x, 329, width, 193, P.white, P.line, 8, 2);
      text(d, 'ew-choice-' + passage.id + '-title', x + 25, 362, passage.title, 26, P.green, 'start', 650);
      wrap(passage.text, 37).forEach((line, lineIndex) => text(d, 'ew-choice-' + passage.id + '-line-' + lineIndex, x + 25, 406 + lineIndex * 33, line, 25, P.ink, 'start'));
    });
    text(d, 'ew-predict', 640, 578, 'Predict the first result. Then examine each step in the model.', 28, P.orange);
    foot(d, 'Same stored chunks · a different question can change the ranking');
  }
  function tokenize(d, query) {
    tokens(d, query);
    d.arrow('ew-lookup-arrow', 640, 403, 640, 456, P.orange, 4);
    d.box('ew-lookup', 310, 470, 660, 75, 'Token IDs → starting vectors + position information', P.greenLight, P.green, 26);
    text(d, 'ew-token-count', 640, 587, query.tokens.length + ' token pieces → ' + query.tokens.length + ' starting vectors', 28, P.green);
    foot(d, 'A tokenizer can split one word into smaller pieces. This example uses manual splits.');
  }
  function pooling(d, query) {
    const average = api.mean(query.context), embedding = api.embed(query);
    const magnitude = Math.hypot(...average);
    text(d, 'ew-pool-title', 325, 319, '1. Average each coordinate', 27, P.ink, 'middle', 650);
    text(d, 'ew-normalize-title', 960, 319, '2. Divide by the vector length', 27, P.ink, 'middle', 650);
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
    text(d, 'ew-magnitude', 954, 537, 'Length of mean vector ≈ ' + magnitude.toFixed(3), 23, P.muted);
    text(d, 'ew-pool-count', 325, 537, query.tokens.length + ' token vectors → 1 mean vector', 23, P.muted);
    text(d, 'ew-fixed-size', 640, 588, 'One query vector → 3 coordinates, for any number of tokens', 26, P.green);
    foot(d, 'Other models can use different pooling methods and dimensions. The display rounds the numbers.');
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
    foot(d, 'Use the same model and compatible settings. Read the passage to check relevance.');
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
      idea: 'An embedding model creates vectors for questions and stored passages. Changing the question can change passage scores without changing the stored vectors.',
      question: 'Why can a new question change the ranking while the stored passage vectors stay fixed?',
      answer: 'The same trained model creates a new query vector with compatible query and document settings. Cosine similarity compares it with each stored passage vector. New scores can change their ranking. Equal dimensions alone do not make vectors from unrelated models compatible.',
      builds: [
        'Read the recovery question and both stored passages. A stored passage is also called a chunk. Ask which passage should rank first. Pause before revealing any vectors or scores. Exact string search can miss useful text with different words. These passages and vector values are classroom examples.',
        'Identify the displayed text pieces as tokens. Each token has an ID that selects a starting vector. The model also receives position information. This example uses manual splits. A real tokenizer can split a word into smaller pieces and treat punctuation separately.',
        'Compare recover in the two sentences. Flu suggests getting well. Database and crash suggest restoring database state. These surrounding words supply context.\n\nThe model uses other tokens to update each token vector. Transformer attention combines information from tokens, and later layers transform those representations. The trained parameters stay fixed. This example supplies three manual coordinates for recover in the query. It supplies no vector for the illness sentence. These coordinates are not model outputs or attention measurements.',
        'Average each coordinate across the nine token vectors. This combines, or pools, them into one vector. Divide each coordinate by that vector’s length, also called its Euclidean norm. The result has length one. The reading widget uses the same data. The display rounds the numbers.\n\nOther models can use different pooling methods, such as a selected final token. This example has three dimensions. Real models often use hundreds or thousands.',
        'Compare the query vector with each stored passage vector. All three vectors have length one, so the dot product equals cosine similarity. The computed scores are not probabilities or measurements of retrieval quality. Applications usually compute passage vectors before search and reuse them for many questions. Read the first passage to check whether it answers the question.',
        'Before advancing, ask students to predict the result for the question about log and restart. Show the paraphrase and its scores. Its query vector also ranks the recovery passage first in this example. A real model still needs tests with representative paraphrases.',
        'Before advancing, ask which passage should rank first for a question about query speed. Reveal the new ranking. Both stored passage vectors stay fixed. Review sentence → tokens → context → query vector → comparison. Ask why switching to an incompatible query model would invalidate these comparisons.',
      ],
      checks: [
        { question: 'Which passage should help answer the crash-recovery question?', answer: 'Passage 7 explains how to replay the durable log to restore committed changes. Predict the first result before the scores appear. Then read the passage to check its relevance.' },
        { question: 'Does one word always become exactly one token?', answer: 'No. A tokenizer can split a word into smaller pieces and treat punctuation separately. This example uses manual splits.' },
        { question: 'Which words change what recover means in the two sentences?', answer: 'Flu gives recover the meaning get well. Database and crash give recover the meaning restore database state. These words supply context. The model uses information from other tokens to update the vector for recover. The same word can have different vectors in different sentences. The trained model stays fixed during search.' },
        { question: 'What do we divide by to normalize the averaged vector?', answer: 'Divide each coordinate by the length, or Euclidean norm, of the mean vector. The result has length one. Other models can use different pooling methods.' },
        { question: 'Do these cosine scores evaluate a current embedding model?', answer: 'No. The scores come from manual example vectors. They are not measurements of model outputs. A cosine score is not the probability that a passage answers the question.' },
        { question: 'Does this result guarantee correct matches for all paraphrases?', answer: 'No. This example shows the intended behavior with manual numbers. Test a real model with representative questions and paraphrases. Check the relevance of its results.' },
        { question: 'What changed when the index passage ranked first?', answer: 'The question and its query vector changed. The stored passage vectors stayed fixed. Comparisons require the same model and compatible settings. Equal dimensions alone are not sufficient.' },
      ],
      context: 'This manual example uses three coordinates so students can inspect every value. Real models often return hundreds or thousands of coordinates. Models can require different tokenizers, pooling methods, query and document formats, normalization, and metrics. The reading lists model examples and official references in the embedding-models section. Evaluate retrieval quality with representative questions and relevant passages.',
      reference: 'Reading: lectures/lecture-11/vectors.html#embedding-walkthrough-title and #embedding-models. Mechanism references: Hugging Face tokenizer summary. Sentence Transformers custom model documentation (Transformer, Pooling, Normalize).',
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
