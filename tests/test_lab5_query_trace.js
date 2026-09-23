'use strict';
// Compare browser traces with the unchanged Python lexer, parser, and planner.
// Run: node tests/test_lab5_query_trace.js
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const model = require('../labs/lab-05/query-trace.js');
const sourceCheck = spawnSync('python3', [path.join(__dirname, '../scripts/generate_lab5_query_source.py'), '--check'], { encoding: 'utf8' });
assert.equal(sourceCheck.status, 0, sourceCheck.stdout + sourceCheck.stderr);
const fixtureQueries = [
  ...model.examples.map(x => x[1]), '', '   ', 'SELECT', 'SELECT FROM students',
  'SELECT name, FROM students', 'SELECT name FROM', 'SELECT * FROM students,',
  'SELECT name FORM students', 'SELECT name FROM students WHERE',
  'SELECT name FROM students WHERE gpa >= 35', 'SELECT name FROM students WHERE gpa > -1',
  'SELECT name FROM students WHERE gpa > 3.5', 'SELECT name FROM students WHERE gpa > 35 OR gpa < 20',
  'SELECT name FROM students WHERE gpa , 35', 'SELECT name FROM students WHERE gpa >',
  'SELECT name FROM students WHERE gpa > 35 AND', "SELECT name FROM students WHERE name = 'O''Brien'",
  "SELECT name FROM students WHERE name = 'unterminated", 'SELECT name FROM unknown',
  'SELECT name FROM students WHERE mid = unknown', 'SELECT nickname FROM students WHERE wat = missing',
  'SELECT * FROM students', 'SELECT name, gpa FROM students;',
  'SELECT dept, name FROM majors, students WHERE mid2 = mid AND dept = \'ds\'',
  "SELECT * FROM students, majors, students WHERE mid = mid2 AND name = ''",
  'SELECT * FROM students; SELECT * FROM majors', 'SELECT * FROM students;;',
  ' \t SeLeCt NAME\nFROM STUDENTS \r\nWHERE GPA > ٣٥ ;  ',
  "SELECT name FROM students WHERE name = '<img src=x onerror=alert(1)>'",
  'SELECT name FROM students WHERE sid = 999999999999999999999999999',
  "SELECT name FROM students WHERE name = '😀'", 'SELECT name FROM students WHERE name = from',
];
// Exercise combinations, not just the authored examples.
for (const fields of ['*', 'name', 'name, gpa', 'name, dept']) {
  for (const tables of ['students', 'students, majors', 'majors, students']) {
    for (const where of ['', ' WHERE gpa > 35', " WHERE mid = mid2 AND dept = 'ds'"]) {
      fixtureQueries.push(`SELECT ${fields} FROM ${tables}${where}`);
    }
  }
}
const python = String.raw`
import inspect, json, sys
from sql_frontend import Lexer, Parser, ParseError, render_plan
from query_engine import F
from measure_sql import school
class TracedLexer(Lexer):
    def __init__(self, sql):
        super().__init__(sql)
        self.depth = 0
        self.calls = []
def wrap(name):
    original = getattr(Lexer, name)
    def traced(self, *args):
        method = inspect.currentframe().f_back.f_code.co_name
        self.depth += 1
        try: return original(self, *args)
        finally:
            self.depth -= 1
            if self.depth == 0:
                self.calls.append(dict(helper=name, method=method, pos=self.pos))
    return traced
for name in ('peek', 'next', 'match', 'expect'):
    setattr(TracedLexer, name, wrap(name))
def rhs(value):
    if isinstance(value, F): return {'field':value.name}
    if isinstance(value, int): return {'integer':str(value)}
    return value
results = []
with school(3) as db:
    for sql in json.load(sys.stdin):
        result = dict(tokens=[], calls=[], data=None, accepted=False, plan='', error=None, stage='lex')
        try:
            lexer = TracedLexer(sql)
            result['tokens'] = [[k, str(v) if k == 'NUM' else v] for k, v in lexer.tokens]
            result['stage'] = 'parse'
            parser = Parser.__new__(Parser); parser.lex = lexer
            # Capture the QueryData even if the final EOF check subsequently fails.
            parse_query = parser.parse_query
            def capture():
                data = parse_query()
                result['data'] = dict(fields=data.fields, tables=data.tables,
                    predicate=[[f,op,rhs(v)] for f,op,v in data.predicate.terms] if data.predicate else None)
                return data
            parser.parse_query = capture
            try: data = parser.parse()
            finally: result['calls'] = lexer.calls
            result['accepted'] = True
            result['stage'] = 'plan'
            scan = db.plan_query(data)
            try: result['plan'] = render_plan(scan)
            finally: scan.close()
        except (ParseError, KeyError) as exc:
            result['error'] = exc.args[0]  # KeyError.__str__ adds another quoting layer
        results.append(result)
print(json.dumps(results))
`;
const run = spawnSync('python3', ['-c', python], {
  cwd: path.join(__dirname, '../labs/lab-05/starter'), input: JSON.stringify(fixtureQueries),
  encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
});
assert.equal(run.status, 0, run.stderr);
const expected = JSON.parse(run.stdout);
const normalize = value => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? { integer: item.toString() } : item));
fixtureQueries.forEach((sql, i) => {
  const trace = model.build(sql), actual = expected[i], last = trace.frames.at(-1);
  assert.equal(trace.error, actual.error, 'Error: ' + sql);
  assert.equal(last.stage, actual.stage, 'Stopping stage: ' + sql);
  if (actual.stage !== 'lex') assert.deepEqual(trace.tokens.map(t => [t.kind, t.kind === 'NUM' ? String(t.value) : t.value]), actual.tokens, 'Tokens: ' + sql);
  assert.deepEqual(trace.calls, actual.calls, 'Helper calls and cursor positions: ' + sql);
  assert.deepEqual(normalize(trace.data), actual.data, 'QueryData: ' + sql);
  assert.equal(trace.accepted, actual.accepted, 'Accepted: ' + sql);
  assert.equal(model.planText(trace.plan), actual.plan, 'Plan: ' + sql);
  trace.frames.forEach(frame => {
    assert(model.source.methods[frame.method].some(line => line.number === frame.line), 'Existing source line');
    if (frame.helper) assert.equal(frame.pos - frame.before, frame.effect === 'consume' ? 1 : 0, frame.title);
    if (frame.stage === 'plan') assert(frame.accepted, 'Planning only starts after EOF check');
  });
  const before = normalize(trace.frames[0]);
  if (last.fields) last.fields.push('mutated');
  assert.deepEqual(normalize(trace.frames[0]), before, 'Independent rewind snapshots');
});
assert.match(model.build('x'.repeat(2001)).error, /2,000/);
assert.match(model.build('CREATE TABLE t (id INT)').error, /SELECT queries/);
console.log(`Lab 5 query traces match the Python lexer, parser, and planner for ${fixtureQueries.length} queries.`);
