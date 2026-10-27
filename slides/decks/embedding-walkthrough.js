/* Lecture 11: native, editable SVG builds of a data-science search example.
 * Token splits and vectors below are manual teaching fixtures, not model output.
 * Keep this scene in place and preserve its four-minute teaching allocation.
 */
(function () {
  'use strict';
  const deck = window.COURSE_DECKS?.[11];
  if (!deck) return;
  const api = window.EmbeddingWalkthrough;
  if (!api) throw new Error('The embedding slide requires the shared vector math helpers.');
  // Slide-only examples share arithmetic helpers with the reading, not its text.
  // Every token has one explicit contextual vector. No model is run here.
  const queries = {
    overfitting: {
      text: 'Why does my model fail on new data?',
      tokens: ['Why', 'does', 'my', 'model', 'fail', 'on', 'new', 'data', '?'],
      context: [[0.5, 0.2, 0.1], [0.6, 0.1, 0.1], [0.4, 0.2, 0.1], [1.2, 0.3, 0.2], [1.5, 0.2, 0.1], [0.5, 0.1, 0.2], [0.4, 0.1, 0.1], [1.4, 0.3, 0.1], [0.3, 0.1, 0.1]],
      focus: 3,
    },
    paraphrase: {
      text: 'Why are predictions worse outside the training data?',
      tokens: ['Why', 'are', 'predictions', 'worse', 'outside', 'the', 'training', 'data', '?'],
      context: [[0.4, 0.2, 0.1], [0.6, 0.2, 0.2], [0.4, 0.1, 0.1], [1.3, 0.4, 0.3], [0.8, 0.3, 0.2], [0.5, 0.2, 0.1], [1.4, 0.3, 0.2], [0.5, 0.2, 0.1], [0.3, 0.1, 0.1]],
    },
    missing: {
      text: 'How can I fill in missing numeric values?',
      tokens: ['How', 'can', 'I', 'fill', 'in', 'missing', 'numeric', 'values', '?'],
      context: [[0.1, 0.5, 0.1], [0.2, 0.6, 0.1], [0.1, 0.4, 0.1], [0.3, 1.4, 0.2], [0.2, 1.3, 0.2], [0.1, 0.5, 0.1], [0.1, 0.4, 0.1], [0.2, 1.5, 0.1], [0.1, 0.3, 0.1]],
    },
  };
  const passages = [
    {
      id: 'overfitting', title: 'Passage 7 · Overfitting',
      text: 'Overfitting can cause low training error but high test error.',
      tokens: ['Overfitting', 'can', 'cause', 'low', 'training', 'error', 'but', 'high', 'test', 'error', '.'],
      context: [[0.5, 0.2, 0.1], [0.4, 0.1, 0.1], [1.3, 0.3, 0.2], [0.4, 0.1, 0.1], [1.4, 0.3, 0.1], [0.4, 0.1, 0.1], [1.1, 0.3, 0.2], [1.3, 0.3, 0.2], [0.4, 0.1, 0.1], [1.2, 0.2, 0.1], [0.2, 0.1, 0.1]],
    },
    {
      id: 'missing', title: 'Passage 12 · Missing values',
      text: 'Replace missing numeric values with the column median from the training data.',
      tokens: ['Replace', 'missing', 'numeric', 'values', 'with', 'the', 'column', 'median', 'from', 'the', 'training', 'data', '.'],
      context: [[0.1, 0.4, 0.1], [0.3, 1.4, 0.2], [0.2, 1.2, 0.1], [0.1, 0.5, 0.1], [0.1, 0.4, 0.1], [0.3, 1.4, 0.2], [0.1, 0.5, 0.1], [0.2, 0.9, 0.2], [0.3, 0.9, 0.1], [0.2, 0.8, 0.2], [0.1, 0.6, 0.1], [0.3, 1.0, 0.2], [0.1, 0.3, 0.1]],
    },
  ];
  const stored = passages.map(passage => ({ ...passage, vector: api.embed(passage) }));
  function rank(queryId) {
    const query = api.embed(queries[queryId]);
    return stored.map(passage => ({ ...passage, score: api.cosine(query, passage.vector) })).sort((a, b) => b.score - a.score);
  }
  const scene = deck.scenes.find(item => item.id === 'embedding');
  if (!scene) throw new Error('Missing Lecture 11 embedding scene.');
  const P = window.DeckViz.palette;
  const colors = [P.orange, P.green, P.blue];
  const fills = [P.orangeLight, P.greenLight, P.blueLight];
  const labels = ['Predict the passage', 'Split into tokens', 'Use the other words', 'Make one vector', 'Rank the passages', 'Try a paraphrase', 'Change the question'];
  const captions = [
    'Maya’s model works on training data but fails on new data. Which passage could explain this pattern?',
    'A tokenizer splits text into pieces called tokens. Each token ID selects a starting vector. The model also uses token positions.',
    'Context is the surrounding text. “Airplane” and “new data” give different clues about what “model” means.',
    'Average the token vectors to make one vector. Divide its coordinates by its length to give it length one.',
    'Compare the query vector with each stored passage vector. A higher cosine score puts a passage earlier in the ranking.',
    'The question now uses different words for the same problem. In this example, the overfitting passage still ranks first.',
    'The question now asks how to fill missing numeric values. Only the query vector changes. The stored passage vectors stay fixed.',
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
      { key: 'airplane', x: 65, title: 'A model airplane', lines: ['The model airplane fits on a desk.'], clue: '“airplane” + “desk” give clues', meaning: 'model → small physical copy' },
      { key: 'prediction', x: 665, title: 'A prediction model', lines: ['Why does my model fail', 'on new data?'], clue: '“new data” gives a clue', meaning: 'model → learned prediction rule' },
    ];
    examples.forEach(example => {
      const x = example.x;
      d.rect('ew-context-' + example.key, x, 298, 550, 234, P.white, P.line, 8, 2);
      text(d, 'ew-context-' + example.key + '-title', x + 25, 330, example.title, 24, P.green, 'start', 650);
      example.lines.forEach((line, index) => text(d, 'ew-context-' + example.key + '-sentence-' + index, x + 25, 374 + index * 31, line, 25, P.ink, 'start'));
      text(d, 'ew-context-' + example.key + '-clue', x + 25, 449, example.clue, 23, P.muted, 'start');
      text(d, 'ew-context-' + example.key + '-meaning', x + 25, 493, example.meaning, 25, P.orange, 'start', 650);
    });
    text(d, 'ew-context-mechanism', 640, 566, 'The embedding model uses other tokens to update the vector for “model”.', 25, P.ink);
    text(d, 'ew-context-vector', 640, 606, 'Illustrative vector for “model” here: ' + vectorString(query.context[query.focus]), 24, P.green);
    foot(d, 'A different sentence can change the token vector. The trained embedding model stays fixed.');
  }
  function predict(d) {
    passages.forEach((passage, index) => {
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
    const query = queries[queryId];
    overview(d);
    text(d, 'ew-query-vector-label', 101, 382, 'q =', 26, P.green, 'start', 650);
    text(d, 'ew-query-vector', 360, 382, vectorString(api.embed(query)), 26, P.green);
    text(d, 'ew-cosine-rule', 970, 382, 'cosine = q · v for unit vectors', 23, P.muted);
    rank(queryId).forEach((passage, index) => {
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
    embeddingExample: { queries, passages },
    states: labels,
    steps: labels.length,
    // The existing scene's four-minute allocation is intentionally unchanged.
    draw(d, step) {
      const queryId = step === 5 ? 'paraphrase' : step === 6 ? 'missing' : 'overfitting';
      const query = queries[queryId];
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
        'Maya’s model works well on training data but poorly on new data. She searches her machine-learning notes for a possible explanation. Read the question and both stored passages. A stored passage is also called a chunk.\n\nAsk which passage should rank first. Pause before revealing any vectors or scores. Overfitting is one possible cause, not a diagnosis. These texts and vector values are classroom examples.',
        'Identify the displayed text pieces as tokens. Each token has an ID that selects a starting vector. The model also receives position information. This example uses manual splits. A real tokenizer can split a word into smaller pieces and treat punctuation separately.',
        'Compare model in the two sentences. Airplane and desk suggest a small physical copy. New data suggests a learned prediction rule. Maya’s training results give additional context for the classroom story. Only the displayed query text enters this example.\n\nThe embedding model uses other tokens to update each token vector. Transformer attention combines information from tokens, and later layers transform those representations. The trained parameters stay fixed. This example supplies three manual coordinates for model in the query. It supplies no vector for the airplane sentence. These coordinates are not model outputs or attention measurements.',
        'Average each coordinate across the nine token vectors. This combines, or pools, them into one vector. Divide each coordinate by that vector’s length, also called its Euclidean norm. The result has length one. The reading widget uses the same arithmetic with a different text example. The display rounds the numbers.\n\nOther models can use different pooling methods, such as a selected final token. This example has three dimensions. Real models often use hundreds or thousands.',
        'Compare the query vector with each stored passage vector. All three vectors have length one, so the dot product equals cosine similarity. The computed scores are not probabilities or measurements of retrieval quality. Applications usually compute passage vectors before search and reuse them for many questions. Read the first passage to check whether it answers the question.',
        'Before advancing, ask students to predict the result for a question about worse predictions outside the training data. Show the paraphrase and its scores. Its query vector also ranks the overfitting passage first in this example. A real model still needs tests with representative paraphrases.',
        'Before advancing, ask which passage should rank first for a question about filling missing numeric values. Reveal the new ranking. The passage describes median imputation: replace a missing value with its column’s median from the training data. This is one method, not a rule for every dataset.\n\nBoth stored passage vectors stay fixed. Review sentence → tokens → context → query vector → comparison. Ask why switching to an incompatible query model would invalidate these comparisons.',
      ],
      checks: [
        { question: 'Which passage could explain good training results and poor results on new data?', answer: 'Passage 7 describes overfitting as one possible cause. Predict the first result before the scores appear. Then read the passage to check its relevance. A similar passage does not diagnose Maya’s model.' },
        { question: 'Does one word always become exactly one token?', answer: 'No. A tokenizer can split a word into smaller pieces and treat punctuation separately. This example uses manual splits.' },
        { question: 'Which words help distinguish the two meanings of model?', answer: 'Airplane and desk suggest a small physical copy. New data suggests a learned prediction rule. These words supply context. The embedding model uses information from other tokens to update the vector for model. The same word can have different vectors in different sentences. The trained embedding model stays fixed during search.' },
        { question: 'What do we divide by to normalize the averaged vector?', answer: 'Divide each coordinate by the length, or Euclidean norm, of the mean vector. The result has length one. Other models can use different pooling methods.' },
        { question: 'Do these cosine scores evaluate a current embedding model?', answer: 'No. The scores come from manual example vectors. They are not measurements of model outputs. A cosine score is not the probability that a passage answers the question.' },
        { question: 'Does this result guarantee correct matches for all paraphrases?', answer: 'No. This example shows the intended behavior with manual numbers. Test a real model with representative questions and paraphrases. Check the relevance of its results.' },
        { question: 'What changed when the missing-values passage ranked first?', answer: 'The question and its query vector changed. The stored passage vectors stayed fixed. Comparisons require the same model and compatible settings. Equal dimensions alone are not sufficient.' },
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
