/* SELECT teaching model. Mirrors the supplied Python methods, including helper
 * calls, short-circuit tests, cursor movement, and planner validation.
 * No SQL execution or network requests. Tests compare it with the Python engine.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./query-trace-source.js'));
  else root.QueryTrace = factory(root.QueryTraceSource);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (source) {
  'use strict';
  const catalog = { students: ['sid', 'name', 'gpa', 'mid'], majors: ['mid2', 'dept'] };
  const keywords = new Set(['select', 'from', 'where', 'and', 'insert', 'into', 'values', 'create', 'table', 'int', 'varchar']);
  const examples = [
    ['Filter students', 'SELECT name FROM students WHERE gpa > 35'],
    ['Join two tables', "SELECT name, dept FROM students, majors WHERE mid = mid2 AND gpa > 35 AND dept = 'ds'"],
    ['All columns', 'SELECT * FROM majors;'],
    ['String value', "SELECT name FROM students WHERE name = 'Ada'"],
    ['Syntax error', 'SELECT name students'],
    ['Unknown field', 'SELECT nickname FROM students'],
  ];
  const clone = value => Array.isArray(value) ? value.map(clone) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([key, val]) => [key, clone(val)])) : value;
  function repr(value) {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    if (typeof value === 'string') {
      const quote = value.includes("'") && !value.includes('"') ? '"' : "'";
      return quote + value.replace(/\\/g, '\\\\').replaceAll(quote, '\\' + quote)
        .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + quote;
    }
    if (Array.isArray(value)) return '[' + value.map(repr).join(', ') + ']';
    if (typeof value === 'object' && 'field' in value) return 'F(' + repr(value.field) + ')';
    return String(value);
  }
  const tokenText = token => '(' + token.kind + ', ' + repr(token.value) + ')';
  const termText = ([field, op, rhs]) => field + ' ' + op + ' ' + (rhs && typeof rhs === 'object' ? rhs.field : repr(rhs));
  function planText(node, depth = 0) {
    if (!node) return '';
    const label = node.type === 'TableScan' ? 'TableScan(' + node.table + ')'
      : node.type === 'ProjectScan' ? 'ProjectScan' + repr(node.fields)
      : node.type === 'SelectScan' ? 'SelectScan[' + node.terms.map(termText).join(' AND ') + ']' : 'ProductScan';
    return '  '.repeat(depth) + label + (node.children || []).map(child => '\n' + planText(child, depth + 1)).join('');
  }
  function lineFor(method, fragment, occurrence = 0) {
    const matches = source.methods[method].filter(line => line.text.includes(fragment));
    if (!matches[occurrence]) throw new Error('Source mapping missing: ' + method + ': ' + fragment);
    return matches[occurrence].number;
  }
  // Match Python's whitespace and Unicode decimal digits, retaining source spans.
  const whitespace = '[\\t\\n\\v\\f\\r \\u001c-\\u001f\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]';
  const leadingSpace = new RegExp('^' + whitespace + '*', 'u');
  const trailingSpace = new RegExp(whitespace + '+$', 'u');
  function integer(raw) {
    let digits = '';
    for (const character of raw) {
      let cp = character.codePointAt(0), start = cp;
      while (/\p{Decimal_Number}/u.test(String.fromCodePoint(start - 1))) start--;
      digits += String((cp - start) % 10);
    }
    return BigInt(digits);
  }

  function build(sql) {
    sql = String(sql);
    const tokens = [], frames = [], calls = [];
    let stage = 'lex', method = 'Lexer.__init__', stack = [method];
    let pos = 0, offset = 0, span = [0, 0], fields = null, tables = null, terms = [], term = null;
    let data = null, accepted = false, plan = null, forest = [], focus = null, error = null;
    class TraceFailure extends Error {}
    function record(fragment, title, note, extra = {}, occurrence = 0) {
      const frame = { stage, method, line: lineFor(method, fragment, occurrence), title, note,
        pos, offset, span, fields, tables, terms, term, data, accepted, plan, forest, focus,
        tokens: tokens.slice(), stack: stack.slice(), error, effect: 'state', ...extra };
      frames.push(clone(frame));
    }
    function fail(fragment, message, note, extra = {}) {
      error = message;
      record(fragment, message, note, { effect: 'error', ...extra });
      throw new TraceFailure(message);
    }
    const current = () => tokens[pos] || { kind: 'EOF', value: null, start: sql.length, end: sql.length };
    const is = (kind, value) => current().kind === kind && (value === undefined || current().value === value);
    function helper(name, kind, value, fragment, save, occurrence = 0) {
      const before = pos, tok = current();
      let answer;
      if (name === 'match') answer = is(kind, value);
      else if (name === 'peek') answer = tok;
      else if (name === 'expect' && !is(kind, value)) {
        calls.push({ helper: name, method: method.split('.').at(-1), pos });
        span = [tok.start, tok.end];
        fail(fragment, 'expected ' + repr(value === undefined ? kind : value) + ', found ' + repr(tok.value),
          'expect cannot consume this token. Fix the query and trace it again. Planning has not begun.', { helper: name, before });
      } else { pos++; answer = name === 'next' ? tok : tok.value; }
      if (save) save(answer);
      span = [tok.start, tok.end];
      calls.push({ helper: name, method: method.split('.').at(-1), pos });
      const args = kind === undefined ? '' : repr(kind) + (value === undefined ? '' : ', ' + repr(value));
      const result = name === 'peek' || name === 'next' ? tokenText(answer) : repr(answer);
      record(fragment, name + '(' + args + ') returns ' + result,
        name === 'match' || name === 'peek'
          ? 'Inspect the current token. The next unread token stays in place.'
          : tok.kind === 'EOF' ? 'The end-of-input check succeeds. There are no trailing tokens.'
          : 'Consume the highlighted token. The cursor now points to the next unread token.',
        { helper: name, before, effect: pos === before ? 'inspect' : 'consume' }, occurrence);
      return answer;
    }
    const match = (kind, value, fragment, occurrence = 0) => helper('match', kind, value, fragment, null, occurrence);
    const expect = (kind, value, fragment, save) => helper('expect', kind, value, fragment, save);
    const next = (fragment, save, occurrence = 0) => helper('next', undefined, undefined, fragment, save, occurrence);
    function enter(name) { method = name; stack.push(method); record('def ', 'Enter ' + method, 'Follow this rule’s Python method. Its caller waits for the returned value.', { effect: 'call' }); }
    function leave() { stack.pop(); method = stack.at(-1); }
    function literal() {
      enter('Parser._parse_literal');
      if (match('NUM', undefined, 'if self.lex.match') || match('STR', undefined, 'if self.lex.match')) {
        const value = next('return self.lex.next()[1]').value;
        leave(); return value;
      }
      helper('peek', undefined, undefined, 'k, v = self.lex.peek()');
      fail('raise ParseError', "expected a number or 'string', found " + repr(current().value), 'A literal must be a number or a single-quoted string.');
    }
    function parseTerm() {
      enter('Parser._parse_term'); term = {};
      expect('ID', undefined, 'field = self.lex.expect', value => { term.field = value; });
      expect('PUNCT', undefined, 'op = self.lex.expect', value => { term.op = value; });
      record('if op not in', 'Check the comparison operator', 'microSQL supports =, <, and >.');
      if (!['=', '<', '>'].includes(term.op)) fail('raise ParseError', 'expected =, < or >, found ' + repr(term.op), 'The operator is not part of this grammar.');
      if (match('ID', undefined, 'if self.lex.match')) next('rhs = F(', token => { term.rhs = { field: token.value }; });
      else {
        record('rhs = self._parse_literal()', 'Read a constant value', 'Call _parse_literal for a number or quoted string.');
        term.rhs = literal();
        record('rhs = self._parse_literal()', 'Save the returned literal', 'This is a fixed value. An identifier would instead produce F(field).');
      }
      const result = [term.field, term.op, term.rhs];
      record('return field, op, rhs', 'Return one predicate term', '(' + result.map(repr).join(', ') + ') describes a comparison; it does not evaluate it.', { effect: 'return' });
      leave(); return result;
    }
    function predicate() {
      enter('Parser._parse_predicate');
      record('terms = [self._parse_term()]', 'Read the first WHERE term', 'A WHERE predicate needs at least one comparison.');
      terms.push(parseTerm()); term = null;
      record('terms = [self._parse_term()]', 'Collect the first term', 'Keep the returned comparison in the terms list.');
      while (match('KEYWORD', 'and', 'while self.lex.match')) {
        next('self.lex.next()');
        record('terms.append', 'Read another AND term', 'Each AND joins another comparison to the same predicate.');
        terms.push(parseTerm()); term = null;
        record('terms.append', 'Append the returned term', 'All collected terms must hold when the plan executes.');
      }
      record('return Predicate', 'Return Predicate(*terms)', 'The predicate contains all comparisons joined by AND.', { effect: 'return' });
      leave();
    }
    function query() {
      enter('Parser.parse_query');
      expect('KEYWORD', 'select', 'self.lex.expect("KEYWORD", "select")');
      if (match('PUNCT', '*', 'if self.lex.match("PUNCT", "*")')) {
        next('self.lex.next()', null, 0); fields = ['*'];
        record('fields = ["*"]', 'Request every field', 'The planner will omit ProjectScan for SELECT *.');
      } else {
        expect('ID', undefined, 'fields = [self.lex.expect', value => { fields = [value]; });
        while (match('PUNCT', ',', 'while self.lex.match', 0)) {
          next('self.lex.next()', null, 1);
          expect('ID', undefined, 'fields.append', value => { fields.push(value); });
        }
      }
      expect('KEYWORD', 'from', 'self.lex.expect("KEYWORD", "from")');
      expect('ID', undefined, 'tables = [self.lex.expect', value => { tables = [value]; });
      while (match('PUNCT', ',', 'while self.lex.match', 1)) {
        next('self.lex.next()', null, 2);
        expect('ID', undefined, 'tables.append', value => { tables.push(value); });
      }
      record('predicate = None', 'Start without a predicate', 'A query with no WHERE needs no SelectScan.');
      let hasPredicate = false;
      if (match('KEYWORD', 'where', 'if self.lex.match("KEYWORD", "where")')) {
        next('self.lex.next()', null, 3);
        record('predicate = self._parse_predicate()', 'Call the predicate rule', 'parse_query waits while the predicate method collects comparisons.');
        predicate(); hasPredicate = true;
        record('predicate = self._parse_predicate()', 'Save the returned predicate', 'The query’s fields, tables, and predicate are now available.');
      }
      data = { fields, tables, predicate: hasPredicate ? terms : null };
      record('return QueryData', 'Return QueryData', 'This object describes the query. Parser.parse still has to reject any trailing syntax.', { effect: 'return' });
      leave();
    }
    try {
      record('self.tokens:', 'Start with SQL characters', 'The lexer will recognize one token at a time. It does not decide the statement’s grammatical structure.');
      if (sql.length > 2000) fail('self.tokens:', 'Use at most 2,000 characters in this walkthrough.', 'Short queries make the individual steps easier to inspect.');
      const re = new RegExp(whitespace + "*(?:(\\p{Decimal_Number}+)|'([^']*)'|([A-Za-z_][A-Za-z0-9_]*)|([(),=<>*;]))", 'uy');
      const end = sql.replace(trailingSpace, '').length;
      while (offset < end) {
        re.lastIndex = offset; const m = re.exec(sql);
        if (!m) {
          const start = offset + sql.slice(offset).match(leadingSpace)[0].length;
          span = [start, Math.min(sql.length, start + (String.fromCodePoint(sql.codePointAt(start) || 0).length))];
          fail('raise ParseError', 'cannot read SQL at: ' + repr(Array.from(sql.slice(offset)).slice(0, 20).join('')), 'The lexer cannot recognize the highlighted characters. No parser or plan runs.');
        }
        const start = offset + m[0].match(leadingSpace)[0].length;
        span = [start, re.lastIndex];
        record('m = self.TOKEN_RE.match', 'Recognize ' + repr(sql.slice(...span)), 'The regular expression matches the next token, skipping whitespace.');
        let kind, value, fragment;
        if (m[1] !== undefined) { kind = 'NUM'; value = integer(m[1]); fragment = 'self.tokens.append(("NUM"'; }
        else if (m[2] !== undefined) { kind = 'STR'; value = m[2]; fragment = 'self.tokens.append(("STR"'; }
        else if (m[3] !== undefined) { value = m[3].toLowerCase(); kind = keywords.has(value) ? 'KEYWORD' : 'ID'; fragment = 'self.tokens.append((kind'; }
        else { kind = 'PUNCT'; value = m[4]; fragment = 'self.tokens.append(("PUNCT"'; }
        tokens.push({ kind, value, start, end: re.lastIndex }); offset = re.lastIndex;
        record(fragment, 'Append ' + tokenText(tokens.at(-1)), kind === 'STR' ? 'Remove the quote delimiters and preserve the string’s case.' : kind === 'NUM' ? 'Convert the digit sequence to an integer.' : kind === 'KEYWORD' || kind === 'ID' ? 'Lowercase the word and distinguish keywords from identifiers.' : 'Keep the punctuation as its own token.', { effect: 'emit' });
      }
      span = [sql.length, sql.length]; pos = 0;
      record('self.pos = 0', 'Tokens are ready for the parser', 'The token cursor starts at 0. EOF is a helper’s end marker, not a stored token.');
      stage = 'parse'; method = 'Parser.parse'; stack = [method];
      record('def parse', 'Choose the statement rule', 'The lexer has finished. The parser will inspect or consume the next unread token.');
      if (match('KEYWORD', 'select', 'if self.lex.match')) {
        record('data = self.parse_query()', 'Call the SELECT grammar rule', 'The first keyword is SELECT, so dispatch to parse_query().');
        query();
        record('data = self.parse_query()', 'Receive QueryData from parse_query()', 'The SELECT rule has returned. Check the optional semicolon and end of input before planning.');
      }
      else {
        if (['insert', 'create'].includes(current().value)) fail('elif self.lex.match', 'This walkthrough traces SELECT queries.', 'Use the SQL prompt above for CREATE and INSERT. The SELECT grammar is shown below.');
        match('KEYWORD', 'insert', 'elif self.lex.match', 0);
        match('KEYWORD', 'create', 'elif self.lex.match', 1);
        fail('raise ParseError', 'statement must start with SELECT, INSERT or CREATE', 'Start this walkthrough with SELECT.');
      }
      if (match('PUNCT', ';', 'if self.lex.match("PUNCT"')) next('self.lex.next()');
      expect('EOF', undefined, 'self.lex.expect("EOF")'); accepted = true;
      record('return data', 'The complete query is valid', 'Return the query description to the database. Planning can now begin.', { effect: 'return' });
      stage = 'plan'; method = 'Database.plan_query'; stack = [method]; span = null;
      record('def plan_query', 'Build a scan tree from QueryData', 'The planner reads the query description and catalog. It does not pull result rows.');
      for (const table of tables) {
        if (!Object.hasOwn(catalog, table)) fail('layouts =', 'no such table in catalog: ' + repr(table), 'This walkthrough’s catalog contains students and majors. Parsing accepted the table name, but planning cannot find its schema.');
      }
      record('layouts =', 'Look up the table schemas', tables.map(table => table + '(' + catalog[table].join(', ') + ')').join('; '));
      const scans = tables.map((table, i) => ({ id: 'table-' + i, type: 'TableScan', table, children: [] }));
      scans.forEach(scan => {
        forest.push(scan); focus = scan.id;
        record('scans.append', 'Create TableScan(' + scan.table + ')', 'Create one scan for this FROM table. Each table starts as a separate input.', { effect: 'create' });
      });
      plan = scans[0]; focus = plan.id;
      record('plan = scans[0]', 'Start with the first table', 'The first FROM table becomes the initial plan.');
      for (let i = 1; i < scans.length; i++) {
        plan = { id: 'product-' + i, type: 'ProductScan', children: [plan, scans[i]] };
        forest = [plan, ...scans.slice(i + 1)]; focus = plan.id;
        record('plan = ProductScan', 'Add ProductScan', 'Combine the plan so far with the next table. Products follow FROM order from left to right.', { effect: 'create' });
      }
      const needed = new Set(fields[0] === '*' ? [] : fields);
      record('needed =', 'Collect the requested output fields', fields[0] === '*' ? 'SELECT * needs no explicit output-field checks.' : repr([...needed]) + ' must be available from the plan.');
      for (const [field, , rhs] of terms) {
        needed.add(field);
        record('needed.add(field)', 'Also check predicate field ' + field, 'WHERE can refer to fields that are not in the output list.');
        if (rhs && typeof rhs === 'object') {
          needed.add(rhs.field);
          record('needed.add(rhs.name)', 'Check the referenced field ' + rhs.field, 'F(' + repr(rhs.field) + ') reads another field, so that field must exist too.');
        }
      }
      const available = new Set(tables.flatMap(table => catalog[table]));
      const unknown = [...needed].filter(field => !available.has(field)).sort();
      record('unknown =', 'Validate field names', unknown.length ? 'Missing: ' + unknown.join(', ') : 'Every referenced field exists in the input scans.');
      if (unknown.length) {
        plan = null; focus = null;
        fail('raise ParseError', 'unknown field(s): ' + unknown.join(', '), 'The Python exception handler closes the scans already opened. No executable plan is returned.', { closed: true });
      }
      record('if data.predicate is not None', 'Does the query have WHERE?', data.predicate ? 'Yes: wrap the current plan in a SelectScan.' : 'No: omit SelectScan.');
      if (data.predicate) {
        plan = { id: 'select', type: 'SelectScan', terms, children: [plan] }; forest = [plan]; focus = plan.id;
        record('plan = SelectScan', 'Add SelectScan for the whole predicate', 'The simple planner keeps all WHERE terms above the product. It does not push filters into the inputs.', { effect: 'create' });
      }
      record('if data.fields !=', 'Does SELECT request specific fields?', fields[0] === '*' ? 'No: SELECT * leaves every field visible, so omit ProjectScan.' : 'Yes: add the projection after the predicate can access its fields.');
      if (fields[0] !== '*') {
        plan = { id: 'project', type: 'ProjectScan', fields, children: [plan] }; forest = [plan]; focus = plan.id;
        record('plan = ProjectScan', 'Add ProjectScan for the output fields', 'Projection is the root: it exposes only ' + fields.join(', ') + '.', { effect: 'create' });
      }
      focus = plan.id;
      record('return plan', 'Plan ready; no rows have been pulled', 'The runner would next call before_first(), then repeatedly call next() on this root. Use the Python terminal to run the query.', { effect: 'return', complete: true });
    } catch (failure) { if (!(failure instanceof TraceFailure)) throw failure; }
    return { sql, tokens, frames, calls, data, accepted, plan, error };
  }
  return { build, catalog, examples, source, repr, tokenText, termText, planText };
});
