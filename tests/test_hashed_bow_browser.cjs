'use strict';
// Optional UI checks: Playwright + Chromium. The widget must work from a local
// file without a model service. Set HASHED_BOW_QA_OUTPUT to retain screenshots.
const {chromium} = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'lectures/lecture-12/rag.html')).href;
const output = process.env.HASHED_BOW_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'hashed-bow-'));
fs.mkdirSync(output, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    await context.route(/^https?:\/\//, route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    const widget = page.locator('#hashed-bow-shell');
    const query = widget.locator('#hb-query'), passage = widget.locator('#hb-passage');
    const preset = widget.locator('#hb-preset'), width = widget.locator('#hb-width');
    const back = widget.locator('#hb-back'), step = widget.locator('#hb-step');
    const finish = widget.locator('#hb-finish'), reset = widget.locator('#hb-reset');
    const stage = widget.locator('#hb-stage');
    await query.waitFor({state: 'visible'});
    for (const control of [query, passage, preset, width]) {
      assert(await control.evaluate(element => element.labels.length > 0 && [...element.labels].some(label => label.textContent.trim())), 'each input has a native text label');
    }
    assert.deepEqual(await width.locator('option').evaluateAll(elements => elements.map(element => element.value)), ['8', '16', '2048']);
    const cases = await preset.locator('option').evaluateAll(elements => elements.map(element => element.value).filter(Boolean));
    assert.deepEqual(cases, ['shared', 'repeated', 'reordered', 'collision', 'synonyms']);
    assert(await back.isDisabled(), 'the first step has no previous state');
    assert.equal(await stage.getAttribute('data-stage'), '0');

    // Save the existing search's results before exploring toy dimensions.
    await page.locator('#ask-input').fill('How does a database recover after a crash?');
    await page.locator('#ask-go').click();
    const searchBefore = await page.locator('#ask-results').innerText();
    const ragBefore = await page.evaluate(() => JSON.stringify({dim: RAG.DIM, chunks: RAG.chunks, vectors: RAG.vectors, result: RAG.retrieve('How does a database recover after a crash?', 3)}));
    let states = 0;
    for (const name of cases) {
      await preset.selectOption(name);
      await width.selectOption('8');
      const seen = new Set();
      for (let i = 0; i < 60; i++) {
        seen.add(await stage.getAttribute('data-stage'));
        assert((await widget.locator('#hb-status').innerText()).trim(), 'each step explains the current operation');
        states++;
        if (await step.isDisabled()) break;
        await step.click();
      }
      assert.deepEqual([...seen].sort(), ['0', '1', '2', '3', '4'], `${name}: stepping visits all five stages`);
      assert(await step.isDisabled(), `${name}: stepping stops at the completed comparison`);
      assert.equal(await stage.getAttribute('data-stage'), '4');
      const expected = await page.evaluate(() => window.HashedBow.compare(document.getElementById('hb-query').value, document.getElementById('hb-passage').value, Number(document.getElementById('hb-width').value)).score);
      const displayed = Number(await widget.locator('[data-score]').first().getAttribute('data-score'));
      assert(Math.abs(displayed - expected) < 1e-6, `${name}: the final score agrees with the vectors`);
      if (name === 'reordered') assert(Math.abs(expected - 1) < 1e-12, 'reordering words leaves the vector unchanged');
      if (name === 'collision') assert(Math.abs(expected - 1) < 1e-12, 'the collision preset exposes a misleading perfect match');
      if (name === 'synonyms') assert.equal(expected, 0, 'the synonym preset demonstrates missing word overlap');
      await widget.screenshot({path: path.join(output, `${name}.png`)});
      if (name === 'collision') {
        await width.selectOption('2048');
        await finish.click();
        assert.equal(Number(await stage.locator('[data-score]').getAttribute('data-score')), 0, 'a wider vector separates this pair of colliding words');
      }
      await back.click();
      assert.notEqual(await stage.getAttribute('data-stage'), '4', 'Back leaves the completed comparison');
      await finish.click();
      assert.equal(await stage.getAttribute('data-stage'), '4', 'Finish returns to the comparison');
      await reset.click();
      assert.equal(await stage.getAttribute('data-stage'), '0', 'Reset returns to the start');
    }

    await query.fill('buffer buffer buffer recovery');
    await passage.fill('recovery buffer');
    assert.equal(await preset.inputValue(), '', 'edited inputs are labeled as custom text');
    assert.equal(await stage.getAttribute('data-stage'), '0', 'editing text restarts the trace');
    await finish.click();
    await width.selectOption('2048');
    assert.equal(await stage.getAttribute('data-stage'), '0', 'changing width restarts the trace');
    await finish.click();
    await back.click();
    assert.equal(await stage.getAttribute('data-stage'), '3');
    const shownBuckets = await stage.locator('[data-bucket]').count();
    assert(shownBuckets > 0 && shownBuckets < 100, 'the 2048-dimensional view shows occupied coordinates instead of 2048 cells');
    assert(/2,?048/.test(await widget.innerText()), 'the sparse view retains the full vector dimension');
    await widget.screenshot({path: path.join(output, 'width-2048.png')});

    await reset.click();
    await step.click();
    await step.click();
    assert.equal(await stage.getAttribute('data-stage'), '2');
    const words = stage.locator('[data-hb-position]');
    const statusBefore = await widget.locator('#hb-status').innerText();
    await words.last().click();
    assert.notEqual(await widget.locator('#hb-status').innerText(), statusBefore, 'selecting a word jumps to its hash operation');
    assert.equal(await stage.locator('[data-hb-position][aria-pressed="true"]').count(), 1, 'one active word is announced');
    await widget.screenshot({path: path.join(output, 'hash-routing-2048.png')});
    await width.selectOption('8');
    await step.click();
    await step.click();
    await widget.screenshot({path: path.join(output, 'hash-routing-8.png')});

    await query.fill('the and 123');
    await passage.fill('');
    await finish.click();
    assert.equal(Number(await widget.locator('[data-score]').first().getAttribute('data-score')), 0, 'empty/all-stopword texts have a finite score of zero');
    assert(!/NaN|Infinity/.test(await stage.innerText()), 'empty text has a readable finite explanation');
    await query.fill('<img src=x onerror="window.hbInjected=true"> recovery');
    await passage.fill('recovery');
    await finish.click();
    assert.equal(await widget.locator('img').count(), 0, 'editable text cannot introduce an HTML element');
    assert.equal(await page.evaluate(() => window.hbInjected), undefined, 'editable text never executes markup');

    // Native keyboard activation works and cannot trigger lecture shortcuts.
    await preset.selectOption('shared');
    await step.focus();
    await page.keyboard.press('Enter');
    assert.notEqual(await stage.getAttribute('data-stage'), '0', 'Enter activates Step');
    await query.focus();
    await page.keyboard.type('p');
    assert(!(await page.locator('body').evaluate(element => element.classList.contains('presentation-mode'))), 'typing in an input cannot toggle presentation');
    const slide = await widget.evaluate(element => {
      let index = 0;
      for (const child of document.querySelector('main').children) {
        if ((child.tagName === 'H2' && child.id) || child.classList.contains('new-slide')) index++;
        if (child === element || child.contains(element)) return index;
      }
    });
    assert(Number.isInteger(slide), 'the widget belongs to a lecture slide');
    await page.evaluate(index => localStorage.setItem('lab.presentationSlide', String(index)), slide);
    await page.locator('#present-toggle').click();
    await page.locator('#present-forward').focus();
    await page.keyboard.press('a');
    const counter = await page.locator('#present-counter').textContent();
    await step.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#present-counter').textContent(), counter, 'widget arrow keys do not advance the lecture');
    await width.focus();
    await page.keyboard.press('p');
    assert(await page.locator('body').evaluate(element => element.classList.contains('presentation-mode')), 'widget controls do not toggle presentation');
    await widget.screenshot({path: path.join(output, 'presentation.png')});
    await page.locator('#present-toggle').click();

    await page.setViewportSize({width: 390, height: 844});
    await preset.selectOption('shared');
    for (const size of ['8', '16', '2048']) {
      await width.selectOption(size);
      for (let i = 0; i < 60; i++) {
        assert(await widget.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `phone width ${size}: no horizontal widget overflow`);
        assert(await widget.evaluate(element => {const rect = element.getBoundingClientRect(); return rect.left >= -1 && rect.right <= innerWidth + 1;}), `phone width ${size}: widget fits the viewport`);
        if (await step.isDisabled()) break;
        await step.click();
      }
    }
    await widget.screenshot({path: path.join(output, 'phone-2048.png')});
    const ragAfter = await page.evaluate(() => JSON.stringify({dim: RAG.DIM, chunks: RAG.chunks, vectors: RAG.vectors, result: RAG.retrieve('How does a database recover after a crash?', 3)}));
    assert.equal(ragAfter, ragBefore, 'widget width and text controls leave the actual course index unchanged');
    assert.equal(await page.locator('#ask-results').innerText(), searchBefore, 'the course search results stay unchanged');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.emulateMedia({media: 'print'});
    assert(await widget.locator('#hb-print').isVisible(), 'printing includes a complete static explanation');
    assert(await query.isHidden(), 'printing hides controls that cannot be used on paper');
    await widget.screenshot({path: path.join(output, 'print.png')});
    const offline = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
    await offline.route(/^https?:\/\//, route => route.abort());
    const plain = await offline.newPage();
    await plain.goto(url);
    const fallback = plain.locator('#hashed-bow-shell');
    assert(await fallback.locator('#hb-fallback').isVisible(), 'the explanation remains available without JavaScript');
    await fallback.screenshot({path: path.join(output, 'no-script.png')});
    assert(await fallback.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'the no-script explanation fits a phone');
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log(`Hashed bag-of-words: ${cases.length} presets, ${states} trace states, editing, widths, keyboard, presentation, phone, print, fallback, and search isolation pass. Screenshots: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
