/* Item 5: display a reversible, line-by-line trace of one TableScan call. */
(function () {
  'use strict';
  const root = document.getElementById('viz-table-methods');
  const model = window.ScanWalkthrough;
  if (!root || !model) return;

  const $ = id => root.querySelector('#' + id);
  const scenarioSelect = $('ts-scenario');
  const code = $('ts-code');
  let method, trace, frameIndex;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderCode() {
    const source = document.getElementById('table-' + method + '-code').textContent.trim();
    code.replaceChildren();
    source.split('\n').forEach((line, index) => {
      const row = element('li', 'ts-code-line');
      const number = element('span', 'ts-line-number', index + 1);
      number.setAttribute('aria-hidden', 'true');
      const body = element('code', '', line);
      if (window.LabBase && window.LabBase.highlightLine) {
        body.innerHTML = window.LabBase.highlightLine(line, 'python');
      }
      row.append(number, body);
      code.append(row);
    });
    $('ts-code-title').textContent = 'TableScan.' + method + '()';
  }

  function renderBlocks(frame) {
    const blocks = $('ts-blocks');
    blocks.replaceChildren();
    frame.blocks.forEach((slots, blockIndex) => {
      const pinned = blockIndex === frame.block;
      const block = element('div', 'ts-block');
      block.classList.toggle('is-pinned', pinned);
      block.classList.toggle('is-released', blockIndex === frame.moveFrom);
      block.classList.toggle('is-appended', blockIndex === frame.appendedBlock);
      block.dataset.block = blockIndex;
      const header = element('div', 'ts-block-header');
      header.append(element('span', 'ts-block-name', 'Block ' + blockIndex));
      header.append(element('span', 'ts-pin-label', pinned ? '● pinned' :
        (blockIndex === frame.moveFrom ? 'just unpinned' : 'unpinned')));
      block.append(header);
      block.append(element('div', 'ts-before', pinned && frame.currentSlot === -1 ? 'current_slot = -1' : ''));
      slots.forEach((used, slotIndex) => {
        const current = pinned && frame.currentSlot === slotIndex;
        const searched = frame.probe && frame.probe.block === blockIndex;
        const checked = searched && frame.probe.checked.includes(slotIndex);
        const found = searched && frame.probe.found === slotIndex;
        const reserved = frame.reserved && frame.reserved.block === blockIndex && frame.reserved.slot === slotIndex;
        const slot = element('div', 'ts-slot');
        slot.setAttribute('role', 'group');
        slot.dataset.slot = slotIndex;
        slot.classList.toggle('is-used', Boolean(used));
        slot.classList.toggle('is-current', current);
        slot.classList.toggle('is-checked', Boolean(checked));
        slot.classList.toggle('is-found', Boolean(found));
        slot.classList.toggle('is-reserved', Boolean(reserved));
        slot.setAttribute('aria-label', `Block ${blockIndex}, slot ${slotIndex}: ${used ? 'USED' : 'EMPTY'}` +
          (current ? ', current slot' : '') + (checked ? ', searched this line' : '') +
          (found ? ', helper returned this slot' : '') + (reserved ? ', newly reserved' : ''));
        slot.append(element('span', 'ts-cursor', current ? '▶' : ''));
        slot.append(element('span', 'ts-slot-index', 'slot ' + slotIndex));
        slot.append(element('span', 'ts-slot-flag', reserved ? 'USED · new' : (used ? 'USED' : 'EMPTY')));
        block.append(slot);
      });
      blocks.append(block);
    });
  }

  function render() {
    const frame = trace[frameIndex];
    renderBlocks(frame);
    $('ts-block-value').textContent = frame.block;
    $('ts-current-value').textContent = frame.currentSlot;
    $('ts-local-label').textContent = method === 'insert' ? 'local slot' : 'helper result';
    const lastSearch = trace.slice(0, frameIndex + 1).reverse().find(entry => entry.probe);
    const localValue = method === 'insert' ? frame.slot : (lastSearch ? lastSearch.probe.found : null);
    $('ts-local-value').textContent = localValue === null ? '—' : localValue;
    $('ts-return-value').textContent = frame.done ?
      (frame.result === true ? 'True' : frame.result === false ? 'False' : 'None') : 'not returned';
    $('ts-return-value').classList.toggle('is-returned', frame.done);
    $('ts-message').textContent = (frameIndex === 0 ? 'Before the call: ' : 'Line ' + frame.line + ': ') + frame.message;
    $('ts-code-caption').textContent = frameIndex === 0 ? 'Method entry · ready to step' : 'Highlighted line just executed';
    $('ts-progress').textContent = `Step ${frameIndex} of ${trace.length - 1}`;
    $('ts-step').disabled = frame.done;
    $('ts-finish').disabled = frame.done;
    $('ts-back').disabled = frameIndex === 0;
    Array.from(code.children).forEach((row, index) => {
      const active = index + 1 === frame.line;
      row.classList.toggle('is-active', active);
      if (active) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    });
  }

  function loadScenario(id) {
    const scenario = model.scenarios.find(entry => entry.id === id);
    trace = model.buildTrace(id);
    frameIndex = 0;
    $('ts-description').textContent = scenario.description;
    render();
  }

  function selectMethod(selected) {
    method = selected;
    ['next', 'insert'].forEach(name => {
      $('ts-' + name + '-mode').setAttribute('aria-pressed', String(name === method));
      $('ts-' + name + '-mode').classList.toggle('primary', name === method);
    });
    scenarioSelect.replaceChildren();
    model.scenarios.filter(entry => entry.method === method).forEach(scenario => {
      const option = element('option', '', scenario.label);
      option.value = scenario.id;
      scenarioSelect.append(option);
    });
    scenarioSelect.value = method === 'next' ? 'next-empty-block' : 'insert-append';
    renderCode();
    loadScenario(scenarioSelect.value);
  }

  $('ts-next-mode').addEventListener('click', () => selectMethod('next'));
  $('ts-insert-mode').addEventListener('click', () => selectMethod('insert'));
  scenarioSelect.addEventListener('change', () => loadScenario(scenarioSelect.value));
  $('ts-step').addEventListener('click', () => { if (frameIndex < trace.length - 1) { frameIndex++; render(); } });
  $('ts-back').addEventListener('click', () => { if (frameIndex > 0) { frameIndex--; render(); } });
  $('ts-restart').addEventListener('click', () => { frameIndex = 0; render(); });
  $('ts-finish').addEventListener('click', () => { frameIndex = trace.length - 1; render(); });
  // Let focused controls keep their native keys instead of triggering the
  // page's presentation shortcuts (arrows, Page Up/Down, and letter keys).
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape' && event.target.matches('button, select, [tabindex]')) {
      event.stopPropagation();
    }
  });
  selectMethod('next');
})();
