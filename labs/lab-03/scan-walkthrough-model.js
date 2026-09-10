/* Execution traces for the TableScan methods shown in Lab 3, item 5. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ScanWalkthrough = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (value !== null && typeof value === 'object') {
      var result = {};
      Object.keys(value).forEach(function (key) { result[key] = copy(value[key]); });
      return result;
    }
    return value;
  }

  function freeze(value) {
    if (value !== null && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }

  var scenarios = freeze([
    {
      id: 'next-same-block', label: 'Skip empty slots', method: 'next',
      description: 'The scan is on slot 0. Find the next USED slot, skipping two EMPTY slots.',
      blocks: [[1, 0, 0, 1, 0]], block: 0, currentSlot: 0
    },
    {
      id: 'next-empty-block', label: 'Cross an empty block', method: 'next',
      description: 'The current block has no later rows. Skip an entirely EMPTY block to reach slot 0 in the last block.',
      blocks: [[1, 1, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 1, 0, 0]],
      block: 0, currentSlot: 1
    },
    {
      id: 'next-end', label: 'Reach the end', method: 'next',
      description: 'The scan is on the final USED slot. There are no later rows or blocks.',
      blocks: [[1, 0, 1, 0, 0]], block: 0, currentSlot: 2
    },
    {
      id: 'insert-same-block', label: 'Reuse an empty slot', method: 'insert',
      description: 'Search after slot 0 and reserve the first EMPTY slot in this block.',
      blocks: [[1, 1, 0, 1, 0]], block: 0, currentSlot: 0
    },
    {
      id: 'insert-next-block', label: 'Use the next block', method: 'insert',
      description: 'No EMPTY slot remains after the current position. Search the next existing block.',
      blocks: [[0, 1, 1, 1, 1], [1, 0, 1, 0, 0]], block: 0, currentSlot: 1
    },
    {
      id: 'insert-append', label: 'Append a new block', method: 'insert',
      description: 'All slots after slot 2 are USED. The EMPTY slot at index 1 is behind the scan, so insert appends a block.',
      blocks: [[1, 0, 1, 1, 1]], block: 0, currentSlot: 2
    }
  ]);

  function buildTrace(id) {
    var scenario = scenarios.find(function (item) { return item.id === id; });
    if (!scenario) throw new Error('Unknown TableScan scenario: ' + id);

    var state = {
      blocks: copy(scenario.blocks), block: scenario.block,
      currentSlot: scenario.currentSlot, slot: null,
      reserved: null, appendedBlock: null
    };
    var trace = [];

    // Every frame owns its nested data, so replay never changes earlier frames.
    function emit(line, message, extra) {
      var frame = Object.assign({
        line: line, probe: null, moveFrom: null,
        message: message, done: false, result: null
      }, state, extra || {});
      trace.push(freeze(copy(frame)));
    }

    // RecordPage helpers search strictly AFTER start. insert_after also sets
    // the matching EMPTY flag to USED before returning the slot index.
    function search(start, wanted) {
      var probe = { block: state.block, start: start, checked: [], found: -1 };
      var slots = state.blocks[state.block];
      for (var index = start + 1; index < slots.length; index += 1) {
        probe.checked.push(index);
        if (slots[index] === wanted) {
          probe.found = index;
          if (wanted === 0) {
            slots[index] = 1;
            state.reserved = { block: state.block, slot: index };
          }
          break;
        }
      }
      return probe;
    }

    function describeSearch(probe, inserting) {
      var helper = inserting ? 'insert_after' : 'next_after';
      var prefix = helper + '(' + probe.start + ') searches block ' + probe.block + ' after slot ' + probe.start + '. ';
      if (probe.found < 0) {
        return prefix + 'No ' + (inserting ? 'EMPTY' : 'USED') + ' slot remains, so it returns -1.';
      }
      if (inserting) {
        return prefix + 'It marks EMPTY slot ' + probe.found + ' USED and returns ' + probe.found + '. The local slot variable receives this index.';
      }
      return prefix + 'It finds USED slot ' + probe.found + ' and stores that index in current_slot.';
    }

    function move(block) {
      var previous = state.block;
      state.block = block;
      state.currentSlot = -1;
      return previous;
    }

    var probe;
    var previous;
    var atLast;
    emit(1, 'Enter ' + scenario.method + '(). Block ' + state.block + ' is pinned; current_slot is ' + state.currentSlot + '.');

    if (scenario.method === 'next') {
      probe = search(state.currentSlot, 1);
      state.currentSlot = probe.found;
      emit(2, describeSearch(probe, false), { probe: probe });
      while (true) {
        emit(3, 'current_slot < 0 is ' + (state.currentSlot < 0 ? 'True: search another block.' : 'False: a row was found; leave the loop.'));
        if (state.currentSlot >= 0) break;
        atLast = state.block === state.blocks.length - 1;
        emit(4, '_at_last_block() is ' + (atLast ? 'True: there is no next block.' : 'False: another block exists.'));
        if (atLast) {
          emit(5, 'Return False. No later row exists; current_slot remains -1 and the last block stays pinned.', { done: true, result: false });
          return freeze(trace);
        }
        previous = move(state.block + 1);
        emit(6, 'Unpin block ' + previous + ', pin block ' + state.block + ', and reset current_slot to -1.', { moveFrom: previous });
        probe = search(-1, 1);
        state.currentSlot = probe.found;
        emit(7, describeSearch(probe, false) + ' Starting after -1 includes slot 0.', { probe: probe });
      }
      emit(8, 'Return True. The scan is positioned on the row at block ' + state.block + ', slot ' + state.currentSlot + '.', { done: true, result: true });
    } else {
      probe = search(state.currentSlot, 0);
      state.slot = probe.found;
      emit(2, describeSearch(probe, true), { probe: probe });
      while (true) {
        emit(3, 'slot < 0 is ' + (state.slot < 0 ? 'True: search another block.' : 'False: a slot was reserved; leave the loop.'));
        if (state.slot >= 0) break;
        atLast = state.block === state.blocks.length - 1;
        emit(4, '_at_last_block() is ' + (atLast ? 'True: append a block.' : 'False: use the next existing block.'));
        if (atLast) {
          state.blocks.push([0, 0, 0, 0, 0]);
          state.appendedBlock = state.blocks.length - 1;
          previous = move(state.appendedBlock);
          emit(5, 'Append block ' + state.block + ' with all flags EMPTY. Unpin block ' + previous + ', pin the new block, and reset current_slot to -1.', { moveFrom: previous });
        } else {
          emit(6, 'Take the else branch: the next block already exists.');
          previous = move(state.block + 1);
          emit(7, 'Unpin block ' + previous + ', pin block ' + state.block + ', and reset current_slot to -1.', { moveFrom: previous });
        }
        probe = search(-1, 0);
        state.slot = probe.found;
        emit(8, describeSearch(probe, true) + ' Starting after -1 includes slot 0.', { probe: probe });
      }
      state.currentSlot = state.slot;
      emit(9, 'Copy slot into current_slot: the scan now points to block ' + state.block + ', slot ' + state.currentSlot + '. insert() finishes and returns None; the caller can now write the fields.', { done: true, result: 'None' });
    }
    return freeze(trace);
  }

  return freeze({ scenarios: scenarios, buildTrace: buildTrace });
}));
