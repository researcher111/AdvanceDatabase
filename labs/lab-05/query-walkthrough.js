/* DOM controller for the Lab 5 query trace. SQL is always rendered as text. */
(function () {
  'use strict';
  const root = document.getElementById('viz-query-walkthrough');
  if (!root || !window.QueryTrace) return;
  const model = window.QueryTrace;
  const $ = id => root.querySelector('#qw-' + id);
  const stageButtons = [...root.querySelectorAll('[data-qw-stage]')];
  const stageNames = { lex: 'Lexing', parse: 'Parsing', plan: 'Planning' };
  let trace, index = 0, timer = null, playing = false, dirty = false, codeMethod = null, dataStage = null;
  const inFullscreen = () => document.fullscreenElement === root;
  const make = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  function keepVisible(container, node) {
    if (!node) return;
    const area = container.getBoundingClientRect(), item = node.getBoundingClientRect();
    if (item.top < area.top || item.bottom > area.bottom) container.scrollTop += item.top - area.top - container.clientHeight / 2 + item.height / 2;
  }
  function stop() {
    clearTimeout(timer); timer = null; playing = false;
    $('play').textContent = 'Play'; $('play').setAttribute('aria-pressed', 'false');
  }
  function schedule() {
    timer = setTimeout(() => {
      if (!playing || dirty) return;
      if (index < trace.frames.length - 1) { index++; render(); }
      if (index >= trace.frames.length - 1) stop(); else schedule();
    }, Number($('speed').value));
  }
  function displayCode(frame) {
    if (codeMethod !== frame.method) {
      codeMethod = frame.method;
      $('code').replaceChildren(...model.source.methods[frame.method].map(line => {
        const row = make('li'); row.dataset.line = line.number;
        const number = make('span', line.number, 'qw-line-number'); number.setAttribute('aria-hidden', 'true');
        row.append(number, make('code', line.text)); return row;
      }));
    }
    for (const row of $('code').children) {
      const active = Number(row.dataset.line) === frame.line;
      row.classList.toggle('is-active', active);
      row.classList.toggle('is-error', active && Boolean(frame.error));
      if (active) row.setAttribute('aria-current', 'step'); else row.removeAttribute('aria-current');
    }
    $('method').textContent = frame.method + '()';
    $('stack').textContent = 'Call stack: ' + frame.stack.join(' → ');
    keepVisible($('code'), $('code').querySelector('.is-active'));
    const method = frame.stage === 'lex' ? 'Lexer.TOKEN_RE' : 'Lexer.' + (frame.helper || 'expect');
    $('helper-title').textContent = frame.stage === 'lex' ? 'Token-recognition pattern' : 'Inside ' + method + '()';
    $('helper-code').textContent = model.source.methods[method].map(line => line.text).join('\n');
    $('helper-title').parentElement.hidden = frame.stage === 'plan';
  }
  function displayTokens(frame) {
    $('characters').hidden = frame.stage !== 'lex';
    $('token-section').hidden = frame.stage === 'plan';
    if (frame.stage === 'plan') return;
    const span = frame.span || [0, 0];
    $('sql-span').replaceChildren(document.createTextNode(trace.sql.slice(0, span[0])),
      make('mark', trace.sql.slice(...span)), document.createTextNode(trace.sql.slice(span[1])));
    $('token-title').textContent = frame.stage === 'lex' ? 'Tokens produced so far' : 'Token cursor';
    $('cursor').textContent = frame.stage === 'lex' ? frame.tokens.length + ' tokens recognized. Whitespace is skipped.'
      : frame.pos > frame.tokens.length ? 'The end-of-input check passed. No tokens remain.'
      : 'Cursor ' + frame.pos + ': green marks the next unread token. Shaded tokens have been consumed.';
    const values = frame.stage === 'lex' ? frame.tokens : [...frame.tokens, { kind: 'EOF', value: null }];
    $('tokens').replaceChildren(...values.map((token, i) => {
      const current = frame.stage === 'parse' && i === frame.pos;
      const item = make('span', undefined, 'qw-token');
      item.dataset.index = i;
      item.classList.toggle('is-consumed', frame.stage === 'parse' && i < frame.pos);
      item.classList.toggle('is-current', current);
      item.classList.toggle('is-emitted', frame.stage === 'lex' && frame.effect === 'emit' && i === values.length - 1);
      item.append(make('small', i + ' · ' + token.kind), make('span', model.repr(token.value)));
      if (current) item.append(make('em', 'next unread'));
      item.setAttribute('aria-label', 'Token ' + i + ': ' + model.tokenText(token) + (current ? ', next unread' : ''));
      return item;
    }));
    if (!values.length) $('tokens').append(make('p', 'No tokens yet.', 'qw-empty'));
    keepVisible($('tokens'), $('tokens').querySelector('.is-current, .is-emitted'));
  }
  function displayData(frame) {
    $('data-section').hidden = frame.stage === 'lex';
    if (frame.stage !== dataStage) { $('data-section').open = frame.stage !== 'plan'; dataStage = frame.stage; }
    $('data-title').textContent = frame.data ? 'QueryData' + (frame.accepted ? '' : ' (awaiting end check)') : 'Query parts collected so far';
    if (frame.stage === 'plan') $('data-title').textContent = 'QueryData · ' + (frame.fields[0] === '*' ? 'all fields' : frame.fields.length + ' output fields') + ' · ' + frame.tables.length + (frame.tables.length === 1 ? ' table' : ' tables');
    const tuples = frame.terms.map(term => '(' + term.map(model.repr).join(', ') + ')');
    const predicate = frame.data ? (frame.data.predicate ? 'Predicate(' + tuples.join(',\n          ') + ')' : 'None')
      : tuples.length ? tuples.join('\n') : frame.stack.includes('Parser._parse_predicate') ? 'Collecting terms…' : 'None so far';
    $('data').replaceChildren();
    for (const [key, value] of [['fields', frame.fields ? model.repr(frame.fields) : 'Not read yet'], ['tables', frame.tables ? model.repr(frame.tables) : 'Not read yet'], ['predicate', predicate]]) {
      $('data').append(make('dt', key), make('dd', value));
    }
    $('term').textContent = frame.term ? 'Current term: ' + ['field', 'op', 'rhs'].map(key => key + '=' + (key in frame.term ? model.repr(frame.term[key]) : '…')).join(', ') : '';
  }
  function displayPlan(frame) {
    $('plan-section').hidden = frame.stage !== 'plan';
    if (frame.stage !== 'plan') return;
    $('plan-title').textContent = frame.complete ? 'Completed scan plan' : frame.error ? 'Planning stopped' : 'Scan plan under construction';
    const tree = make('ul', undefined, 'qw-tree');
    function branch(node, side) {
      const item = make('li');
      const label = node.type === 'TableScan' ? 'TableScan(' + node.table + ')'
        : node.type === 'ProjectScan' ? 'ProjectScan ' + model.repr(node.fields)
        : node.type === 'SelectScan' ? 'SelectScan' : 'ProductScan';
      const block = make('div', label, 'qw-plan-node'); block.dataset.node = node.id;
      block.classList.toggle('is-active', node.id === frame.focus);
      if (node.type === 'SelectScan') block.append(make('div', node.terms.map(model.termText).join(' AND ')));
      if (side) block.append(make('small', side + ' input'));
      if (frame.complete && node.id === frame.plan?.id) block.append(make('small', 'Root: the runner will call next() here'));
      item.append(block);
      if (node.children.length) {
        const children = make('ul');
        node.children.forEach((child, i) => children.append(branch(child, node.type === 'ProductScan' ? ['Left', 'Right'][i] : '')));
        item.append(children);
      }
      return item;
    }
    frame.forest.forEach(node => tree.append(branch(node, '')));
    $('plan').replaceChildren(tree);
    $('plan').classList.toggle('is-closed', Boolean(frame.closed));
    if (!frame.forest.length) $('plan').append(make('p', frame.error ? 'No plan could be built.' : 'No scans constructed yet.', 'qw-empty'));
    if (frame.closed) $('plan').append(make('p', 'These scans are closed on error. No plan is returned.', 'qw-empty'));
  }
  function render() {
    const frame = trace.frames[index];
    $('action').textContent = frame.title; $('note').textContent = frame.note;
    $('action').parentElement.classList.toggle('is-error', Boolean(frame.error));
    $('progress').textContent = stageNames[frame.stage] + ' · Step ' + (index + 1) + ' / ' + trace.frames.length;
    $('scrub').value = index;
    $('scrub').setAttribute('aria-valuetext', stageNames[frame.stage] + ': ' + frame.title);
    for (const button of stageButtons) {
      const active = button.dataset.qwStage === frame.stage;
      button.disabled = dirty || !trace.frames.some(frame => frame.stage === button.dataset.qwStage);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    }
    $('back').disabled = dirty || index === 0;
    for (const id of ['next', 'play', 'finish']) $(id).disabled = dirty || index === trace.frames.length - 1;
    $('restart').disabled = dirty; $('scrub').disabled = dirty;
    $('workspace').hidden = dirty;
    displayCode(frame); displayTokens(frame); displayData(frame); displayPlan(frame);
    if (inFullscreen() && frame.stage === 'plan') {
      keepVisible(root.querySelector('.qw-visual-panel'), $('plan').querySelector('.is-active'));
    }
    root.dataset.stage = frame.stage; root.dataset.step = index;
  }
  function rebuild() {
    stop(); dirty = false; index = 0;
    trace = model.build($('query').value);
    $('scrub').max = trace.frames.length - 1;
    $('validation').hidden = !trace.error;
    $('validation').textContent = trace.error ? 'This trace stops in ' + stageNames[trace.frames.at(-1).stage].toLowerCase() + ': ' + trace.error + '. Step through to see why, or edit the query and trace again.' : '';
    render();
  }
  function go(nextIndex) { stop(); index = Math.max(0, Math.min(trace.frames.length - 1, nextIndex)); render(); }
  model.examples.forEach(([label], i) => {
    const option = make('option', label); option.value = i; $('example').append(option);
  });
  $('example').value = '0';
  $('example').addEventListener('change', () => {
    if ($('example').value === 'custom') return;
    $('query').value = model.examples[Number($('example').value)][1]; rebuild();
  });
  $('form').addEventListener('submit', event => { event.preventDefault(); rebuild(); });
  $('query').addEventListener('input', () => {
    stop(); dirty = true; $('example').value = 'custom'; render();
    $('validation').hidden = false; $('validation').textContent = 'Query changed. Choose Trace query to build a new walkthrough.';
    $('action').textContent = 'Ready to trace your edit'; $('note').textContent = 'The previous trace is paused. Submit the query above to update all stages.';
  });
  $('query').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); rebuild(); }
  });
  $('restart').addEventListener('click', () => go(0));
  $('back').addEventListener('click', () => go(index - 1));
  $('next').addEventListener('click', () => go(index + 1));
  $('finish').addEventListener('click', () => go(trace.frames.length - 1));
  $('scrub').addEventListener('input', () => go(Number($('scrub').value)));
  for (const button of stageButtons) button.addEventListener('click', () => go(trace.frames.findIndex(frame => frame.stage === button.dataset.qwStage)));
  $('play').addEventListener('click', () => {
    if (playing) { stop(); return; }
    playing = true; $('play').textContent = 'Pause'; $('play').setAttribute('aria-pressed', 'true'); schedule();
  });
  $('speed').addEventListener('change', () => { if (playing) { clearTimeout(timer); schedule(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  function fullscreenChanged() {
    const on = inFullscreen();
    $('fullscreen').setAttribute('aria-pressed', String(on));
    $('fullscreen').textContent = on ? 'Exit full screen' : 'Full screen';
    $('fullscreen').title = on ? 'Exit fullscreen (Esc)' : 'Open the walkthrough in fullscreen';
    if (on) {
      root.scrollTop = 0;
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'SQL query walkthrough');
    } else {
      root.removeAttribute('role'); root.removeAttribute('aria-modal'); root.removeAttribute('aria-label'); $('fullscreen').focus();
    }
    render();
  }
  async function toggleFullscreen() {
    $('view-status').hidden = true;
    try {
      if (inFullscreen()) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch (_) {
      $('view-status').textContent = 'The browser could not change fullscreen mode. The walkthrough is still available on this page.';
      $('view-status').hidden = false;
    }
  }
  $('fullscreen').disabled = !root.requestFullscreen || document.fullscreenEnabled === false;
  if ($('fullscreen').disabled) $('fullscreen').title = 'Fullscreen is unavailable in this browser.';
  $('fullscreen').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', fullscreenChanged);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && inFullscreen()) { event.stopPropagation(); toggleFullscreen(); return; }
    if (event.key === 'Tab' && inFullscreen()) {
      const focusable = [...root.querySelectorAll('button:not(:disabled), a, input:not(:disabled), textarea, select, summary')]
        .filter(node => node.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if (event.target.matches('textarea, input, select') || dirty) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); event.stopPropagation(); go(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  rebuild();
})();
