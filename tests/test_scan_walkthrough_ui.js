'use strict';

// Run with: node tests/test_scan_walkthrough_ui.js
// A small DOM contract harness checks wiring and rendered state, not layout.
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const lab = path.join(__dirname, '../labs/lab-03');
const html = fs.readFileSync(path.join(lab, 'recordpages.html'), 'utf8');
const decode = text => text.replace(/&(lt|gt|amp|quot);/g, (_, name) => ({ lt: '<', gt: '>', amp: '&', quot: '"' })[name]);

class Node {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.className = '';
    this.disabled = false;
    this._text = '';
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, enabled) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        if (enabled) classes.add(name); else classes.delete(name);
        this.className = [...classes].join(' ');
      }
    };
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set innerHTML(value) { this.textContent = decode(value.replace(/<[^>]+>/g, '')); }
  append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
  replaceChildren(...nodes) { this._text = ''; this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  matches(selector) {
    return selector.split(',').some(part => {
      const token = part.trim();
      return token.startsWith('[') ? this.getAttribute(token.slice(1, -1)) !== null : token.toUpperCase() === this.tagName;
    });
  }
  dispatch(type, extra = {}) {
    const event = Object.assign({ target: this, stopped: false, defaultPrevented: false,
      stopPropagation() { this.stopped = true; }, preventDefault() { this.defaultPrevented = true; }
    }, extra);
    if (type === 'click' && this.disabled) return event;
    for (let node = this; node && !event.stopped; node = node.parent) {
      (node.listeners[type] || []).forEach(listener => listener(event));
    }
    return event;
  }
}

// IDs and source snippets come from the page, so missing/misspelled IDs fail.
const nodes = new Map();
for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
  assert(!nodes.has(match[3]), 'Duplicate HTML ID: ' + match[3]);
  const node = new Node(match[1]);
  for (const attr of match[2].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) node.setAttribute(attr[1], attr[2] || '');
  node.className = node.getAttribute('class') || '';
  node.disabled = node.getAttribute('disabled') !== null;
  nodes.set(match[3], node);
}
const get = id => { assert(nodes.has(id), 'Missing HTML ID: ' + id); return nodes.get(id); };
const root = get('viz-table-methods');
const widget = html.slice(html.indexOf('id="viz-table-methods"'), html.indexOf('id="table-next-code"'));
const widgetIds = new Set([...widget.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
root.querySelector = selector => widgetIds.has(selector.slice(1)) ? get(selector.slice(1)) : null;
widgetIds.forEach(id => { if (id !== 'viz-table-methods') get(id).parent = root; });
const sources = {};
for (const match of html.matchAll(/<pre\b[^>]*id="table-(next|insert)-code"[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)) {
  sources[match[1]] = decode(match[2]).trim().split('\n');
  get('table-' + match[1] + '-code').textContent = decode(match[2]);
}
assert.equal(sources.next.length, 8);
assert.equal(sources.insert.length, 9);
const context = { document: { getElementById: id => nodes.get(id) || null, createElement: tag => new Node(tag) } };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(lab, 'scan-walkthrough-model.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(lab, 'scan-walkthrough.js'), 'utf8'), context);

const click = id => get(id).dispatch('click');
const value = id => get(id).textContent;
const blocks = () => get('ts-blocks').children;
const slots = block => blocks()[block].children.filter(node => node.classList.contains('ts-slot'));
const activeLine = () => {
  const rows = get('ts-code').children;
  const active = rows.filter(row => row.classList.contains('is-active'));
  assert.equal(active.length, 1, 'Exactly one code line is active');
  assert.equal(active[0].getAttribute('aria-current'), 'step');
  assert(rows.filter(row => row !== active[0]).every(row => row.getAttribute('aria-current') === null));
  return rows.indexOf(active[0]) + 1;
};
function checkFrame() {
  assert.equal(blocks().filter(block => block.classList.contains('is-pinned')).length, 1);
  assert.equal(Number(blocks().find(block => block.classList.contains('is-pinned')).dataset.block), Number(value('ts-block-value')));
  assert.equal(get('ts-step').disabled, get('ts-finish').disabled);
  blocks().forEach((_, index) => slots(index).forEach(slot => assert.equal(slot.getAttribute('role'), 'group')));
  activeLine();
}
function checkSource(method) {
  assert.deepEqual(get('ts-code').children.map(row => row.children[1].textContent), sources[method]);
  assert.equal(get('ts-' + method + '-mode').getAttribute('aria-pressed'), 'true');
  assert.equal(get('ts-' + (method === 'next' ? 'insert' : 'next') + '-mode').getAttribute('aria-pressed'), 'false');
}
function finishByStepping() {
  const executed = [activeLine()];
  for (let count = 0; !get('ts-step').disabled; count += 1) {
    assert(count < 30, 'Stepping must reach a result');
    click('ts-step');
    checkFrame();
    executed.push(activeLine());
  }
  assert.equal(get('ts-back').disabled, false);
  return executed;
}
function result(block, slot, returned) {
  assert.deepEqual([value('ts-block-value'), value('ts-current-value'), value('ts-return-value')], [String(block), String(slot), returned]);
  assert(get('ts-step').disabled && get('ts-finish').disabled);
  checkFrame();
}

assert.equal(get('ts-scenario').value, 'next-empty-block');
assert(get('ts-back').disabled);
assert.equal(value('ts-return-value'), 'not returned');
checkSource('next');
assert.deepEqual(finishByStepping(), [1, 2, 3, 4, 6, 7, 3, 4, 6, 7, 3, 8]);
result(2, 0, 'True');
assert(slots(2)[0].classList.contains('is-current'));

click('ts-insert-mode');
checkSource('insert');
assert.equal(get('ts-scenario').value, 'insert-append');
assert.equal(blocks().length, 1);
assert(get('ts-back').disabled);
assert.deepEqual(finishByStepping(), [1, 2, 3, 4, 5, 8, 3, 9]);
result(1, 0, 'None');
assert(slots(1)[0].classList.contains('is-reserved'));
assert(slots(1)[0].getAttribute('aria-label').includes('newly reserved'));
assert(!slots(0)[1].classList.contains('is-used'), 'Earlier free slot remains empty');

click('ts-back'); // Line 3: slot reserved, current_slot still -1.
click('ts-back'); // Line 8: helper has marked slot 0 USED.
assert.equal(value('ts-current-value'), '-1');
assert.equal(value('ts-local-value'), '0');
click('ts-back'); // Line 5: new block exists but has no reserved flag yet.
assert.equal(activeLine(), 5);
assert.equal(blocks().length, 2);
assert(slots(1).every(slot => !slot.classList.contains('is-used')));
click('ts-back'); // Line 4: append has not happened.
assert.equal(activeLine(), 4);
assert.equal(blocks().length, 1);
assert.equal(value('ts-block-value'), '0');
checkFrame();
click('ts-restart');
assert.equal(activeLine(), 1);
assert.equal(value('ts-current-value'), '2');
assert.equal(value('ts-local-value'), '—');
assert.equal(value('ts-return-value'), 'not returned');
assert(get('ts-back').disabled && !get('ts-step').disabled);

const expected = {
  next: { 'next-same-block': [0, 3, 'True'], 'next-empty-block': [2, 0, 'True'], 'next-end': [0, -1, 'False'] },
  insert: { 'insert-same-block': [0, 2, 'None'], 'insert-next-block': [1, 1, 'None'], 'insert-append': [1, 0, 'None'] }
};
for (const method of ['next', 'insert', 'next']) {
  click('ts-' + method + '-mode');
  checkSource(method);
  const select = get('ts-scenario');
  assert.deepEqual(select.children.map(option => option.value), Object.keys(expected[method]));
  for (const [id, outcome] of Object.entries(expected[method])) {
    select.value = id;
    select.dispatch('change');
    assert.equal(activeLine(), 1);
    assert(get('ts-back').disabled);
    assert.equal(value('ts-return-value'), 'not returned');
    checkFrame();
    click('ts-finish');
    result(...outcome);
    click('ts-step'); // Disabled controls cannot advance a finished trace.
    result(...outcome);
    click('ts-restart');
    assert.equal(activeLine(), 1);
    assert(get('ts-back').disabled && !get('ts-finish').disabled);
  }
}

// Native control keys stay inside the widget, while Escape can still exit
// the page's presentation mode. The handler must not prevent default input.
for (const [id, key] of [['ts-scenario', 'ArrowDown'], ['ts-step', ' '], ['ts-next-mode', 'Enter']]) {
  const event = get(id).dispatch('keydown', { key });
  assert.equal(event.stopped, true);
  assert.equal(event.defaultPrevented, false);
}
assert.equal(get('ts-scenario').dispatch('keydown', { key: 'Escape' }).stopped, false);
assert.equal(root.dispatch('keydown', { key: 'ArrowRight' }).stopped, false);
const codeRegionTag = html.match(/<div\b[^>]*class="ts-code-scroll"[^>]*>/)[0];
assert(codeRegionTag.includes('tabindex="0"'), 'Code region must allow keyboard scrolling');
const codeRegion = new Node('div');
codeRegion.setAttribute('tabindex', '0');
codeRegion.parent = root;
assert.equal(codeRegion.dispatch('keydown', { key: 'ArrowRight' }).stopped, true);

console.log('TableScan walkthrough UI: all 6 scenarios, controls, source lines, and reversible state passed.');
