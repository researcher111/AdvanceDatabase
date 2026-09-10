'use strict';

// Run with: node tests/test_scan_walkthrough.js
// These checks use fixed expected paths through the Python shown in item 5.
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const modelPath = path.join(__dirname, '../labs/lab-03/scan-walkthrough-model.js');
const { scenarios, buildTrace } = require(modelPath);

function last(trace) { return trace[trace.length - 1]; }
function lines(trace) { return trace.map(frame => frame.line); }
function usedCount(blocks) { return blocks.flat().filter(flag => flag === 1).length; }
function assertDeepFrozen(value) {
  if (value !== null && typeof value === 'object') {
    assert(Object.isFrozen(value), 'Every nested object must be frozen');
    Object.values(value).forEach(assertDeepFrozen);
  }
}

assert.equal(scenarios.length, 6);
assertDeepFrozen(scenarios);
assert.throws(() => buildTrace('missing'), /Unknown TableScan scenario/);

const same = buildTrace('next-same-block');
assert.deepEqual(lines(same), [1, 2, 3, 8]);
assert.deepEqual(same[1].probe, { block: 0, start: 0, checked: [1, 2, 3], found: 3 });
assert.equal(last(same).currentSlot, 3);
assert.equal(last(same).result, true);

const crossing = buildTrace('next-empty-block');
assert.deepEqual(lines(crossing), [1, 2, 3, 4, 6, 7, 3, 4, 6, 7, 3, 8]);
assert.deepEqual(crossing.filter(frame => frame.probe).map(frame => frame.probe), [
  { block: 0, start: 1, checked: [2, 3, 4], found: -1 },
  { block: 1, start: -1, checked: [0, 1, 2, 3, 4], found: -1 },
  { block: 2, start: -1, checked: [0], found: 0 }
]);
assert.deepEqual([last(crossing).block, last(crossing).currentSlot, last(crossing).result], [2, 0, true]);
assert.deepEqual(crossing.filter(frame => frame.moveFrom !== null).map(frame => [frame.moveFrom, frame.block, frame.currentSlot]), [[0, 1, -1], [1, 2, -1]]);

const end = buildTrace('next-end');
assert.deepEqual(lines(end), [1, 2, 3, 4, 5]);
assert.deepEqual(end[1].probe, { block: 0, start: 2, checked: [3, 4], found: -1 });
assert.deepEqual([last(end).block, last(end).currentSlot, last(end).result], [0, -1, false]);

const reuse = buildTrace('insert-same-block');
assert.deepEqual(lines(reuse), [1, 2, 3, 9]);
assert.deepEqual(reuse[1].probe, { block: 0, start: 0, checked: [1, 2], found: 2 });
assert.equal(reuse[1].blocks[0][2], 1, 'insert_after must mark the flag immediately');
assert.equal(reuse[1].slot, 2);
assert.equal(reuse[1].currentSlot, 0, 'current_slot does not receive slot until line 9');
assert.equal(reuse[2].currentSlot, 0);
assert.equal(last(reuse).currentSlot, 2);
assert.deepEqual(last(reuse).reserved, { block: 0, slot: 2 });

const nextBlock = buildTrace('insert-next-block');
assert.deepEqual(lines(nextBlock), [1, 2, 3, 4, 6, 7, 8, 3, 9]);
assert.deepEqual(nextBlock.filter(frame => frame.probe).map(frame => frame.probe), [
  { block: 0, start: 1, checked: [2, 3, 4], found: -1 },
  { block: 1, start: -1, checked: [0, 1], found: 1 }
]);
assert.deepEqual([last(nextBlock).block, last(nextBlock).currentSlot], [1, 1]);
assert.deepEqual(last(nextBlock).blocks, [[0, 1, 1, 1, 1], [1, 1, 1, 0, 0]]);
assert(nextBlock.every(frame => frame.appendedBlock === null), 'Existing block path must not append');

const append = buildTrace('insert-append');
assert.deepEqual(lines(append), [1, 2, 3, 4, 5, 8, 3, 9]);
assert.equal(append[0].blocks[0][1], 0, 'An earlier free slot makes the forward-only rule visible');
assert.equal(last(append).blocks[0][1], 0, 'insert must not search backward');
assert.deepEqual(append[4].blocks, [[1, 0, 1, 1, 1], [0, 0, 0, 0, 0]], 'New block is empty before the next search');
assert.deepEqual([append[4].moveFrom, append[4].block, append[4].currentSlot], [0, 1, -1]);
assert.deepEqual(append[5].probe, { block: 1, start: -1, checked: [0], found: 0 });
assert.deepEqual([append[5].slot, append[5].currentSlot, append[5].blocks[1][0]], [0, -1, 1]);
assert.deepEqual(last(append).blocks, [[1, 0, 1, 1, 1], [1, 0, 0, 0, 0]]);
assert.deepEqual([last(append).block, last(append).currentSlot], [1, 0]);
assert(append.slice(4).every(frame => frame.appendedBlock === 1), 'New block marker persists after append');

for (const scenario of scenarios) {
  const trace = buildTrace(scenario.id);
  const again = buildTrace(scenario.id);
  assertDeepFrozen(trace);
  assert.deepEqual(trace, again, 'Reset produces the same trace');
  assert.notEqual(trace[0].blocks, again[0].blocks, 'Separate traces own their arrays');
  assert.notEqual(trace[0].blocks, scenario.blocks, 'Trace does not alias the scenario');
  assert.deepEqual(trace[0].blocks, scenario.blocks);
  assert.equal(trace.filter(frame => frame.done).length, 1);
  assert.equal(last(trace).done, true);
  assert(trace.slice(0, -1).every(frame => frame.result === null));

  for (let index = 0; index < trace.length; index += 1) {
    const frame = trace[index];
    assert(frame.block >= 0 && frame.block < frame.blocks.length, 'Exactly one valid block is current/pinned');
    if (index > 0) {
      assert.notEqual(frame.blocks, trace[index - 1].blocks);
      assert.notEqual(frame.blocks[0], trace[index - 1].blocks[0]);
    }
    const moveLines = scenario.method === 'next' ? [6] : [5, 7];
    if (frame.moveFrom !== null) {
      assert(moveLines.includes(frame.line));
      assert.equal(frame.block, frame.moveFrom + 1);
      assert.equal(frame.currentSlot, -1, 'Moving resets the scan before slot 0');
    } else {
      assert(!moveLines.includes(frame.line), 'Each move identifies the old pin');
    }
    const searchLines = scenario.method === 'next' ? [2, 7] : [2, 8];
    assert.equal(frame.probe !== null, searchLines.includes(frame.line));
    if (scenario.method === 'next') {
      assert.deepEqual(frame.blocks, scenario.blocks, 'next is read-only on every frame');
      assert.equal(frame.slot, null);
      assert.equal(frame.reserved, null);
      assert.equal(frame.appendedBlock, null);
    } else if (frame.reserved !== null) {
      assert.equal(frame.blocks[frame.reserved.block][frame.reserved.slot], 1);
    }
  }
  if (scenario.method === 'insert') {
    assert.equal(last(trace).result, 'None');
    assert.equal(usedCount(last(trace).blocks), usedCount(scenario.blocks) + 1, 'Exactly one EMPTY flag becomes USED');
    const changed = [];
    last(trace).blocks.forEach((block, blockIndex) => block.forEach((flag, slotIndex) => {
      const original = scenario.blocks[blockIndex] ? scenario.blocks[blockIndex][slotIndex] : 0;
      if (flag !== original) changed.push({ block: blockIndex, slot: slotIndex });
    }));
    assert.deepEqual(changed, [last(trace).reserved], 'No unrelated slot flag changes');
  }
}

assert.throws(() => { append[0].blocks[0][0] = 0; }, TypeError);
assert.throws(() => { append[5].probe.checked.push(2); }, TypeError);
assert.throws(() => { append[5].reserved.slot = 3; }, TypeError);

// Also exercise the browser export, where module/require do not exist.
const browser = {};
vm.runInNewContext(fs.readFileSync(modelPath, 'utf8'), browser);
assert.equal(browser.ScanWalkthrough.scenarios.length, 6);
assert.equal(last(browser.ScanWalkthrough.buildTrace('next-end')).result, false);

console.log('TableScan walkthrough: all 6 scenarios and execution-state checks passed.');
