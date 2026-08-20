/* Lecture 5 — From SQL Text to Plan · widgets. */

/* ---------------- Glossary ---------------- */
(function () {
  const GLOSSARY = {
    'front-end': {
      title: 'Front end (of a language system)',
      body: '<p>The stages that understand <em>text</em>: lexing (characters to tokens) and ' +
        'parsing (tokens to structure). Compilers, interpreters, and databases all have one; ' +
        'everything after it works on structured data and never sees a character again. ' +
        'microdb’s back end is the scan machinery you built in Lab 4.</p>',
    },
    'bnf': {
      title: 'BNF (Backus–Naur Form)',
      body: '<p>The standard notation for grammars: each line defines a rule, <code>|</code> ' +
        'separates alternatives, <code>{ }</code> repeats, <code>[ ]</code> is optional. ' +
        'Reading BNF is a durable skill — the SQL standard, JSON’s spec, HTTP’s RFCs, and ' +
        'every programming language reference are written in a dialect of it.</p>',
    },
    'ast': {
      title: 'AST (abstract syntax tree)',
      body: '<p>The structured, tree-shaped description a parser produces — “abstract” because ' +
        'it keeps meaning and drops spelling (no commas, no parentheses, no keyword tokens). ' +
        'microdb’s QueryData is a tiny AST. Keeping it as plain data is what lets a planner, ' +
        'an optimizer, or a pretty-printer each consume it independently.</p>',
    },
    'repl': {
      title: 'REPL',
      body: '<p>Read–Eval–Print Loop: the interactive prompt pattern — read a line, execute ' +
        'it, print the result, repeat. <code>python3</code> itself is one; <code>psql</code> ' +
        'is Postgres’s; <code>microdb.py</code> is yours. Fifty lines of loop around ' +
        '<code>db.execute()</code>, and an engine becomes a tool.</p>',
    },
    'reserved-word': {
      title: 'Reserved word',
      body: '<p>A word the grammar claims for itself — you can’t name a table ' +
        '<code>select</code> because the lexer promotes it to a keyword before the parser ' +
        'ever sees it. Real SQL splits hairs (reserved vs non-reserved vs context-dependent ' +
        'keywords); microdb reserves its eleven words flatly and keeps the lexer one regex.</p>',
    },
  };
  if (window.LabBase && LabBase.initGlossary) LabBase.initGlossary(GLOSSARY);
  if (window.LabBase && LabBase.initAnnotatedCode) LabBase.initAnnotatedCode();
})();

/* ---------------- SQL pipeline widget ---------------- */
(function () {
  const root = document.getElementById('viz-sql');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const msg = $('sq-msg'), stages = $('sq-stages');

  const KEYWORDS = new Set(['select', 'from', 'where', 'and', 'insert', 'into',
                            'values', 'create', 'table', 'int', 'varchar']);

  function lex(sql) {
    const re = /\s*(?:(\d+)|'([^']*)'|([A-Za-z_][A-Za-z0-9_]*)|([(),=<>*]))/y;
    const toks = [];
    let pos = 0;
    while (pos < sql.length) {
      re.lastIndex = pos;
      const m = re.exec(sql);
      if (!m) break;
      if (m[1] !== undefined) toks.push(['NUM', Number(m[1])]);
      else if (m[2] !== undefined) toks.push(['STR', m[2]]);
      else if (m[3] !== undefined) {
        const w = m[3].toLowerCase();
        toks.push([KEYWORDS.has(w) ? 'KEYWORD' : 'ID', w]);
      } else toks.push(['PUNCT', m[4]]);
      pos = re.lastIndex;
    }
    return toks;
  }

  function stage(title, bodyHtml, err) {
    return `<div class="sq-stage${err ? ' err' : ''}">` +
      `<div class="sq-stage-title">${title}</div>${bodyHtml}</div>`;
  }

  function tokChips(toks) {
    return '<div class="sq-toks">' + toks.map(([k, v]) => {
      const cls = k === 'KEYWORD' ? 'kw' : (k === 'NUM' || k === 'STR') ? 'lit' : '';
      return `<span class="sq-tok ${cls}">${k} ${v}</span>`;
    }).join('') + '</div>';
  }

  // A tiny mirror of the lab's parser, enough for the demo queries.
  function parse(toks) {
    let i = 0;
    const peek = () => toks[i] || ['EOF', null];
    const next = () => toks[i++] || ['EOF', null];
    const match = (k, v) => peek()[0] === k && (v === undefined || peek()[1] === v);
    const expect = (k, v) => {
      if (!match(k, v)) throw new Error(`expected ${JSON.stringify(v ?? k)}, found ${JSON.stringify(peek()[1])}`);
      return next()[1];
    };
    const term = () => {
      const f = expect('ID');
      const op = expect('PUNCT');
      if (!'=<>'.includes(op)) throw new Error(`expected =, < or > after '${f}'`);
      if (match('NUM') || match('STR')) return [f, op, next()[1]];
      if (match('ID')) return [f, op, { field: next()[1] }];
      throw new Error(`expected a value or field after '${op}', found ${JSON.stringify(peek()[1])}`);
    };
    if (match('KEYWORD', 'insert')) {
      expect('KEYWORD', 'insert'); expect('KEYWORD', 'into');
      const table = expect('ID');
      expect('KEYWORD', 'values'); expect('PUNCT', '(');
      const vals = [next()[1]];
      while (match('PUNCT', ',')) { next(); vals.push(next()[1]); }
      expect('PUNCT', ')');
      return { kind: 'InsertData', table, values: vals };
    }
    expect('KEYWORD', 'select');
    let fields;
    if (match('PUNCT', '*')) { next(); fields = ['*']; }
    else { fields = [expect('ID')]; while (match('PUNCT', ',')) { next(); fields.push(expect('ID')); } }
    expect('KEYWORD', 'from');
    const tables = [expect('ID')];
    while (match('PUNCT', ',')) { next(); tables.push(expect('ID')); }
    let predicate = null;
    if (match('KEYWORD', 'where')) {
      next();
      predicate = [term()];
      while (match('KEYWORD', 'and')) { next(); predicate.push(term()); }
    }
    return { kind: 'QueryData', fields, tables, predicate };
  }

  function showTerm([f, op, rhs]) {
    return `${f} ${op} ${typeof rhs === 'object' ? 'F(' + rhs.field + ')' : JSON.stringify(rhs)}`;
  }

  function describe(d) {
    if (d.kind === 'InsertData') {
      return `InsertData(table=${d.table}, values=[${d.values.join(', ')}])`;
    }
    return `QueryData(\n  fields    = [${d.fields.join(', ')}]\n` +
      `  tables    = [${d.tables.join(', ')}]\n` +
      `  predicate = ${d.predicate ? d.predicate.map(showTerm).join(' AND ') : 'None'}\n)`;
  }

  function planText(d) {
    if (d.kind === 'InsertData') return `TableScan(${d.table}).insert()  +  set each field`;
    let lines = [], pad = 0;
    const push = t => lines.push('  '.repeat(pad) + t);
    if (d.fields[0] !== '*') { push(`ProjectScan[${d.fields.join(', ')}]`); pad++; }
    if (d.predicate) { push(`SelectScan[${d.predicate.map(showTerm).join(' AND ')}]`); pad++; }
    if (d.tables.length === 2) {
      push('ProductScan'); pad++;
      push(`TableScan(${d.tables[0]})`);
      push(`TableScan(${d.tables[1]})`);
    } else {
      push(`TableScan(${d.tables[0]})`);
    }
    return lines.join('\n');
  }

  function run(sql, note) {
    const toks = lex(sql);
    let html = stage('1 · text', `<div class="sq-body">${sql}</div>`) +
               stage('2 · tokens (lexer)', tokChips(toks));
    try {
      const d = parse(toks);
      html += stage('3 · description (parser)', `<div class="sq-body">${describe(d)}</div>`);
      html += stage('4 · plan (planner)', `<div class="sq-body">${planText(d)}</div>`);
      msg.innerHTML = note;
    } catch (e) {
      html += stage('3 · ParseError', `<div class="sq-body">${e.message}</div>`, true);
      msg.innerHTML = 'The parser died <em>well</em>: it names what it expected and what it found.';
    }
    stages.innerHTML = html;
  }

  $('sq-q1').addEventListener('click', () =>
    run("SELECT name FROM students WHERE gpa > 35",
        'Four stages, one row of chips each — the whole front end at a glance.'));
  $('sq-q2').addEventListener('click', () =>
    run("SELECT name, dept FROM students, majors WHERE mid = mid2 AND gpa > 35",
        'Note the description: <code>mid = F(mid2)</code> — an ID on the right became a field reference. That one fork is what makes joins parseable.'));
  $('sq-q3').addEventListener('click', () =>
    run("INSERT INTO students VALUES (7, 'gil', 33)",
        'INSERT parses with the provided worked-example method — read it before Thursday.'));
  $('sq-q4').addEventListener('click', () =>
    run("SELECT name students",
        ''));
  msg.textContent = 'Pick a statement to push through the pipeline.';
})();

/* ---------------- A parse, frame by frame ---------------- */
(function () {
  const tokensEl = document.getElementById('tr-tokens');
  if (!tokensEl) return;

  const TOKENS = [
    ['KW', 'select'], ['ID', 'name'], ['PUNCT', ','], ['ID', 'gpa'],
    ['KW', 'from'], ['ID', 'students'], ['KW', 'where'],
    ['ID', 'gpa'], ['OP', '>'], ['NUM', '35'],
  ];
  // Each step: tokens consumed so far, call stack, one-line note, QueryData fields.
  const STEPS = [
    { c: 0, stack: [], note: 'dispatch peeks: KEYWORD "select" — route to parse_query',
      data: {} },
    { c: 1, stack: ['parse_query'], note: 'expect(KEYWORD, "select") — consumed and discarded',
      data: {} },
    { c: 2, stack: ['parse_query'], note: 'field list: expect(ID) returns "name"',
      data: { fields: ['name'] } },
    { c: 4, stack: ['parse_query'], note: 'match(",") — consume it and expect another ID: "gpa" (the { , } idiom)',
      data: { fields: ['name', 'gpa'] } },
    { c: 5, stack: ['parse_query'], note: 'no comma next — field list done. expect(KEYWORD, "from")',
      data: { fields: ['name', 'gpa'] } },
    { c: 6, stack: ['parse_query'], note: 'table list: expect(ID) returns "students"',
      data: { fields: ['name', 'gpa'], tables: ['students'] } },
    { c: 7, stack: ['parse_query'], note: 'match(KEYWORD, "where") — yes: consume it and CALL _parse_predicate',
      data: { fields: ['name', 'gpa'], tables: ['students'] } },
    { c: 7, stack: ['parse_query', '_parse_predicate'], note: '_parse_predicate needs at least one term — CALL _parse_term',
      data: { fields: ['name', 'gpa'], tables: ['students'] } },
    { c: 8, stack: ['parse_query', '_parse_predicate', '_parse_term'], note: '_parse_term: expect(ID) returns "gpa" (left side)',
      data: { fields: ['name', 'gpa'], tables: ['students'] } },
    { c: 9, stack: ['parse_query', '_parse_predicate', '_parse_term'], note: 'expect(OP) returns ">"',
      data: { fields: ['name', 'gpa'], tables: ['students'] } },
    { c: 10, stack: ['parse_query', '_parse_predicate', '_parse_term'], note: 'expect(NUM) returns 35 — term complete, RETURN Term(gpa > 35)',
      data: { fields: ['name', 'gpa'], tables: ['students'] } },
    { c: 10, stack: ['parse_query', '_parse_predicate'], note: 'no AND next — predicate complete, RETURN Predicate([gpa > 35])',
      data: { fields: ['name', 'gpa'], tables: ['students'], predicate: 'gpa > 35' } },
    { c: 10, stack: ['parse_query'], note: 'tokens exhausted — RETURN the finished QueryData. The stack unwinds; the description remains.',
      data: { fields: ['name', 'gpa'], tables: ['students'], predicate: 'gpa > 35', done: true } },
  ];

  let step = 0;
  const note = document.getElementById('tr-note');
  const stackEl = document.getElementById('tr-stack');
  const dataEl = document.getElementById('tr-data');

  function render() {
    const s = STEPS[step];
    tokensEl.innerHTML = TOKENS.map(([kind, val], i) =>
      `<span class="tr-tok${i < s.c ? ' used' : ''}${i === s.c ? ' cursor' : ''}">` +
      `<span class="tr-kind">${kind}</span>${val}</span>`).join('');
    stackEl.innerHTML = s.stack.length
      ? s.stack.map((f, i) => `<div class="tr-frame" style="margin-left:${i}em">${f}()</div>`).join('')
      : '<div class="tr-frame empty">(empty — parsing not started or finished)</div>';
    const d = s.data;
    dataEl.innerHTML =
      `<div class="tr-field">fields: ${d.fields ? '[' + d.fields.join(', ') + ']' : '…'}</div>` +
      `<div class="tr-field">tables: ${d.tables ? '[' + d.tables.join(', ') + ']' : '…'}</div>` +
      `<div class="tr-field">predicate: ${d.predicate || '…'}</div>` +
      (d.done ? '<div class="tr-field done">→ handed to the planner, untouched by execution</div>' : '');
    note.textContent = `step ${step + 1}/${STEPS.length}: ${s.note}`;
    document.getElementById('tr-step').disabled = step === STEPS.length - 1;
    document.getElementById('tr-back').disabled = step === 0;
  }
  document.getElementById('tr-step').addEventListener('click', () => { if (step < STEPS.length - 1) { step++; render(); } });
  document.getElementById('tr-back').addEventListener('click', () => { if (step > 0) { step--; render(); } });
  document.getElementById('tr-reset').addEventListener('click', () => { step = 0; render(); });
  render();
})();
