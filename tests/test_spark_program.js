'use strict';
// Ensure the teaching walkthrough stays synchronized with the runnable program.
// Run: node tests/test_spark_program.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({window: {}});
for (const file of ['slides/_shared/visuals.js', 'slides/decks/spark-ray.js', 'slides/decks/spark-program.js']) {
  vm.runInContext(read(file), context, {filename: file});
}
const source = read('lectures/lecture-13/spark_lunch.py').trimEnd();
const lines = source.split('\n');
const excerpts = context.window.COURSE_DECKS['13b'].scenes.filter(scene => scene.programSource);
const highlighted = new Set();
assert.equal(excerpts.length, 7);
for (const scene of excerpts) {
  const excerpt = scene.programSource;
  assert.equal(excerpt.lines.join('\n'), lines.slice(excerpt.firstLine - 1, excerpt.firstLine - 1 + excerpt.lines.length).join('\n'), scene.id);
  assert.equal(excerpt.activeLines.length, scene.steps);
  for (const active of excerpt.activeLines) for (const line of active) {
    assert(line >= excerpt.firstLine && line < excerpt.firstLine + excerpt.lines.length, scene.id + ' highlights a visible line');
    highlighted.add(line);
  }
}
lines.forEach((line, index) => {
  if (line.trim()) assert(highlighted.has(index + 1), 'source line ' + (index + 1) + ' has an explanation');
});

const html = read('lectures/lecture-13/spark-ray.html');
const decode = text => text.replace(/&(?:quot|#39|lt|gt|amp);/g, entity => ({'&quot;':'"', '&#39;':"'", '&lt;':'<', '&gt;':'>', '&amp;':'&'})[entity]);
const complete = html.match(/<pre id="spark-source"><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
assert(complete, 'reading retains the complete program');
assert.equal(decode(complete[1]).trimEnd(), source);
const readingParts = [...html.matchAll(/Source lines (\d+)–(\d+)\.[^<]*<\/p>\s*<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)];
assert.equal(readingParts.length, excerpts.length);
for (const [, first, last, code] of readingParts) {
  assert.equal(decode(code), lines.slice(Number(first) - 1, Number(last)).join('\n'), 'reading lines ' + first + '–' + last);
}
console.log('Spark program: all seven slide and reading excerpts preserve the source; every nonblank line is explained.');
