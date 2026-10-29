'use strict';
// Optional UI checks: Playwright + Chromium. Network access is disabled.
// PLAYWRIGHT_CHROMIUM_EXECUTABLE selects an installed browser.
// EMBEDDING_NETWORK_QA_OUTPUT selects the screenshot directory.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const M = require('../labs/lab-09/embedding-model.js');
const url = pathToFileURL(path.resolve(__dirname, '../labs/lab-09/microvector.html')).href;
const output = process.env.EMBEDDING_NETWORK_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'embedding-network-'));
fs.mkdirSync(output, {recursive:true});
const fmt = (n, digits = 3) => (Math.abs(n) < 0.5 * 10 ** -digits ? 0 : n).toFixed(digits);

(async () => {
  const browser = await chromium.launch({headless:true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
    await context.route(/^https?:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    const level1 = page.locator('#embedding-level-1');
    const level2 = page.locator('#embedding-level-2');
    const level3 = page.locator('#embedding-level-3');
    const widget = page.locator('#embedding-network');
    const query = widget.locator('#en-example');
    const windowSize = widget.locator('#en-window');
    const next = widget.locator('#en-next');
    const back = widget.locator('#en-back');
    const detail = widget.locator('#en-detail');
    await level1.locator('#el1-example').waitFor({state:'visible'});
    let state = M.createState();
    let checkedStages = 0;

    async function stage(number) {
      await widget.locator(`.en-stage[data-stage="${number}"]`).click();
      assert.equal(await widget.getAttribute('data-stage'), String(number));
      assert.equal(await widget.locator('.en-stage[aria-pressed="true"]').count(), 1);
      assert.equal(await detail.locator('.en-stage-count').textContent(), `Stage ${number + 1} / 7`);
    }
    async function mode(name) {
      await widget.locator(`button[data-mode="${name}"]`).click();
      assert.equal(await widget.getAttribute('data-mode'), name);
      assert.equal(await widget.locator('.en-modes [aria-pressed="true"]').count(), 1);
    }
    async function checkRanking(id, limit = 6, training = false) {
      const evaluated = M.evaluate(state, {maxTokens:limit});
      const expected = evaluated.queries.find(item => item.id === id);
      const panel = widget.locator(training ? '#en-training' : '#en-output');
      const actual = await panel.locator('.en-result').evaluateAll(elements => elements.map(element => ({
        id:element.dataset.result, score:Number(element.dataset.score),
        display:element.querySelector('.en-result-score').textContent,
        positive:element.classList.contains('is-positive')
      })));
      assert.deepEqual(actual.map(row => row.id), expected.ranking, `${id}: displayed rank uses current model state`);
      for (const row of actual) {
        // Recompute cosine independently from vectors, outside the browser UI.
        const document = evaluated.documents.find(item => item.id === row.id);
        const cosine = expected.trace.unit.reduce((sum, x, i) => sum + x * document.trace.unit[i], 0);
        assert(Math.abs(row.score - cosine) < 1e-8, `${id}/${row.id}: score ${row.score} uses actual unit vectors (${cosine})`);
        assert.equal(row.display, fmt(cosine));
        assert.equal(row.positive, row.id === expected.positiveId);
      }
      const vector = (await panel.locator('[data-query-vector]').getAttribute('data-query-vector')).split(',').map(Number);
      // Finite-difference training can differ slightly between Node and Chrome.
      assert(vector.every((value, i) => Math.abs(value - expected.trace.unit[i]) < 1e-8));
      assert(Math.abs(Math.hypot(...vector) - 1) < 1e-12, 'displayed query vector has unit length');
      if (training) assert.equal(await widget.locator('#en-loss').innerText(), fmt(evaluated.loss, 4));
      if (training) {
        const clipped = await widget.locator('.en-plot svg text').evaluateAll(elements => elements.filter(element => {
          const box = element.getBBox(), view = element.ownerSVGElement.viewBox.baseVal;
          return box.x < view.x - 1 || box.x + box.width > view.x + view.width + 1;
        }).map(element => element.textContent));
        assert.deepEqual(clipped, [], 'training plot labels fit their SVG viewports');
      }
      return expected;
    }
    async function checkGraph(rows) {
      const titles = await detail.locator('.en-graph g:has(> circle) > title').allTextContents();
      assert.equal(titles.length, rows.flat().length, 'every computed coordinate is drawn');
      titles.forEach((title, i) => assert.equal(Number(title.split(' = ').at(-1)), Number(fmt(rows.flat()[i], 7))));
      const cells = await detail.locator('.en-graph g:has(> circle) > text').allTextContents();
      cells.forEach((cell, i) => {
        const digits = (cell.split('.')[1] || '').length;
        assert(digits >= 2, 'numeric cells retain at least two decimal places');
        assert.equal(cell, fmt(rows.flat()[i], digits), 'circle labels match their computed values');
      });
    }
    async function fits(label, element = widget) {
      assert(await element.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${label}: no horizontal overflow`);
      assert(await element.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= -1 && rect.right <= innerWidth + 1; }), `${label}: stays inside viewport`);
    }
    async function screenshot(name, element = widget) { await element.screenshot({path:path.join(output, name + '.png')}); }
    async function disclose(element, open) {
      if (await element.evaluate(element => element.open) !== open) await element.locator(':scope > summary').click();
      assert.equal(await element.evaluate(element => element.open), open);
    }
    async function checkVector(element, expected) {
      const actual = (await element.getAttribute('data-vector')).split(',').map(Number);
      assert.equal(actual.length, expected.length, 'displayed vector has the expected coordinate count');
      assert(actual.every((value, index) => Math.abs(value - expected[index]) < 1e-8), 'displayed vector uses actual model coordinates');
      assert.equal(await element.innerText(), '[' + expected.map(value => fmt(value)).join(', ') + ']');
    }
    async function checkSimpleScores(id, limit = 6) {
      const expected = M.evaluate(state, {maxTokens:limit}).queries.find(query => query.id === id);
      const rows = await level1.locator('#el1-results [data-doc]').evaluateAll(elements => elements.map(element => ({
        id:element.dataset.doc, score:Number(element.querySelector('.el-score').dataset.score),
        display:element.querySelector('.el-score').textContent
      })));
      assert.deepEqual(rows.map(row => row.id), expected.ranking, 'essential comparison shows the actual model ranking');
      rows.forEach(row => {
        const expectedScore = expected.scores.find(score => score.id === row.id).cosine;
        assert(Math.abs(row.score - expectedScore) < 1e-8);
        assert.equal(row.display, fmt(expectedScore));
      });
    }
    async function checkSharedState(id, limit = 6) {
      const actual = await page.evaluate(() => window.EmbeddingExplorer.getSnapshot());
      const expected = M.evaluate(state, {maxTokens:limit});
      assert.equal(actual.selected, id);
      assert.equal(actual.limit, limit);
      assert.equal(actual.steps, state.steps);
      for (const [i, query] of actual.evaluation.queries.entries()) {
        assert.deepEqual(query.ranking, expected.queries[i].ranking, 'all detail levels use the actual model ranking');
        query.trace.unit.forEach((value, j) => assert(Math.abs(value - expected.queries[i].trace.unit[j]) < 1e-8));
      }
      assert.equal(await level1.locator('#el1-example').inputValue(), id);
      assert.equal(await query.inputValue(), id);
      assert.equal(await level2.locator('#el2-window').inputValue(), String(limit));
      assert.equal(await windowSize.inputValue(), String(limit));
      const expectedQuery = expected.queries.find(query => query.id === id);
      await checkVector(level1.locator('#el1-vector'), expectedQuery.trace.unit);
      return expectedQuery;
    }

    // The first encounter is small. Each optional level opens independently.
    assert(await level1.isVisible(), 'essential interaction is visible on first load');
    assert(await level1.locator('#embedding-level-1-fallback').isHidden(), 'interactive version replaces the static fallback');
    for (const level of [level2, level3]) {
      assert.equal(await level.evaluate(element => element.tagName), 'DETAILS');
      assert.equal(await level.evaluate(element => element.open), false, 'optional detail starts collapsed');
      assert(await level.locator(':scope > summary').isVisible(), 'closed level retains its native control');
    }
    assert(await level3.evaluate(element => !element.parentElement.closest('#embedding-level-2')), 'optional levels are not nested');
    assert(await widget.isHidden(), 'full numerical diagram does not load visibly');
    await fits('desktop essentials', level1);
    await screenshot('desktop-level-1', level1);

    const simpleQuery = level1.locator('#el1-example');
    const simpleResults = level1.locator('#el1-results');
    assert(await simpleResults.isVisible(), 'candidate passages are available for the prediction');
    assert.equal(await simpleResults.locator('.el-score').count(), 0, 'students can predict before revealing scores');
    assert.equal(await simpleResults.locator('.is-match, .el-match-label').count(), 0, 'prediction does not reveal the supplied answer');
    assert(await simpleQuery.evaluate(element => element.labels.length > 0));
    await simpleQuery.selectOption('recovery');
    await checkSharedState('recovery');
    await level1.locator('#el1-compare').click();
    assert.equal(await simpleResults.locator('.el-score').count(), M.DOCS.length, 'comparison reveals passage scores');
    await checkSimpleScores('recovery');
    await screenshot('desktop-level-1-results', level1);

    await disclose(level2, true);
    assert.equal(await level3.evaluate(element => element.open), false, 'middle level does not open the full diagram');
    assert(await level2.locator('#el2-window').evaluate(element => element.labels.length > 0));
    await simpleQuery.selectOption('speed');
    assert.equal(await simpleResults.locator('.el-score').count(), 0, 'new query restores the prediction step');
    await level2.locator('#el2-window').selectOption('2');
    const shortQuery = await checkSharedState('speed', 2);
    const shortTrace = shortQuery.trace;
    for (let index = 0; index < 4; index++) {
      await level2.locator(`#el2-stage-${index}`).click();
      assert.equal(await level2.locator('#el2-stage-panel').getAttribute('data-stage'), String(index));
      assert.equal(await level2.locator('[data-el-stage][aria-pressed="true"]').count(), 1);
      if (index < 2) {
        assert.equal(await level2.locator('[data-el-token]').count(), 2, 'discarded tokens have no selectable vector');
        for (let token = 0; token < 2; token++) {
          await level2.locator(`#el2-token-${token}`).click();
          await checkVector(level2.locator('#el2-token-value'), index ? shortTrace.hidden[token] : shortTrace.embeddings[token]);
          assert.equal(await level2.locator('[data-el-token][aria-pressed="true"]').count(), 1);
        }
      }
      if (index === 2) {
        assert.equal(await level2.locator('.el-token-table tbody tr').count(), 2);
        await checkVector(level2.locator('#el2-mean'), shortTrace.pooled);
      }
      if (index === 3) await checkVector(level2.locator('#el2-vector'), shortTrace.unit);
    }
    await level1.locator('#el1-compare').click();
    await checkSimpleScores('speed', 2);
    await fits('desktop middle level', level2);
    await screenshot('desktop-level-2-truncated', level2);

    await disclose(level3, true);
    await query.waitFor({state:'visible'});
    assert.equal(await level2.evaluate(element => element.open), true, 'both optional levels can stay open');
    await checkRanking('speed', 2);
    await stage(4);
    await disclose(level2, false);
    assert(await detail.isVisible(), 'closing middle level leaves the full diagram open');
    await disclose(level3, false);
    await disclose(level2, true);
    await checkSharedState('speed', 2);
    assert.equal(await level2.locator('#el2-stage-panel').getAttribute('data-stage'), '3', 'reopening preserves the middle stage');
    await checkVector(level2.locator('#el2-vector'), shortTrace.unit);
    await disclose(level3, true);
    assert.equal(await widget.getAttribute('data-stage'), '4', 'reopening retains the detailed stage');
    await windowSize.selectOption('6');
    await checkSharedState('speed');
    await disclose(level2, false);

    assert.equal(await query.inputValue(), 'speed', 'default query demonstrates a training correction');
    assert.deepEqual(await query.locator('option').evaluateAll(options => options.map(option => option.value)), M.EXAMPLES.map(item => item.id));
    for (const control of [query, windowSize]) assert(await control.evaluate(element => element.labels.length > 0), 'select has a native label');
    const initial = await checkRanking('speed');
    assert.notEqual(initial.ranking[0], initial.positiveId, 'default untrained ranking needs correction');

    for (const example of M.EXAMPLES) {
      await query.selectOption(example.id);
      const trace = M.encode(example.text, state);
      await stage(0);
      assert(await back.isDisabled());
      assert.equal(await widget.locator('button[data-token]').count(), trace.tokens.length);
      const views = new Set();
      for (let index = 0; index < 7; index++) {
        if (index) await next.click();
        assert.equal(await widget.getAttribute('data-stage'), String(index));
        views.add(await detail.innerText());
        await checkRanking(example.id);
        if (index === 0) await checkGraph([[trace.tokenIds[0]], trace.embeddings[0]]);
        if (index === 2) await checkGraph([trace.q[0], trace.scores[0], trace.attention[0], trace.mixed[0]]);
        if (index === 3) await checkGraph([trace.residual[0], trace.ffNormalized[0], trace.ffHidden[0], trace.ffOutput[0], trace.hidden[0]]);
        if (index === 4) {
          assert.deepEqual(await detail.locator('.en-math-table td').allTextContents(), trace.hidden.flat().map(value => fmt(value)));
          await checkGraph([trace.pooled]);
        }
        if (index === 5) await checkGraph([trace.pooled, trace.projected]);
        if (index === 6) await checkGraph([trace.projected, trace.unit]);
        checkedStages++;
      }
      assert.equal(views.size, 7, 'each stage reveals a distinct mechanism');
      assert(await next.isDisabled());
      await back.click();
      assert.equal(await widget.getAttribute('data-stage'), '5', 'back navigation works');
    }

    // Selecting a token and a Q/K/V branch recomputes actual displayed arithmetic.
    await query.selectOption('speed');
    await stage(1);
    const trace = M.encode(M.EXAMPLES.find(item => item.id === 'speed').text, state);
    for (const branch of ['q','k','v']) {
      await detail.locator(`[data-branch="${branch}"]`).click();
      for (const token of [0, trace.tokens.length - 1]) {
        await widget.locator(`[data-token="${token}"]`).click();
        assert.equal(await widget.locator('[data-token][aria-pressed="true"]').count(), 1);
        await checkGraph([trace.embeddings[token], trace.normalized[token], trace[branch][token]]);
      }
    }
    await screenshot('desktop-qkv');
    await stage(2);
    await screenshot('desktop-attention');
    const beforeInference = await widget.locator('#en-output').innerText();
    await query.selectOption('recovery');
    await query.selectOption('speed');
    assert.equal(await widget.locator('#en-output').innerText(), beforeInference, 'inference leaves weights and scores unchanged');
    assert.equal(await widget.getAttribute('data-steps'), '0');

    // Truncation changes both query and document preprocessing, without training.
    await windowSize.selectOption('2');
    assert.equal(await widget.locator('button[data-token]').count(), 2);
    assert.equal(await widget.locator('.en-token.is-dropped').count(), 3);
    await checkRanking('speed', 2);
    await stage(4);
    assert.equal(await detail.locator('.en-math-table tbody tr').count(), 2, 'pooling only sees retained tokens');
    await screenshot('desktop-truncated');
    await windowSize.selectOption('3');
    await checkRanking('speed', 3);

    // Training ignores the toy truncation control and uses full training pairs.
    await mode('train');
    assert(await windowSize.isHidden());
    await checkRanking('speed', 6, true);
    await screenshot('desktop-training-before');
    const oldLoss = Number(await widget.locator('#en-loss').innerText());
    await widget.locator('#en-train-one').click(); M.train(state, 1);
    assert.equal(await widget.getAttribute('data-steps'), '1');
    await checkRanking('speed', 6, true);
    await widget.locator('#en-train-many').click(); M.train(state, 20);
    assert.equal(await widget.getAttribute('data-steps'), '21');
    assert(Number(await widget.locator('#en-loss').innerText()) < oldLoss, 'real training reduces loss');
    const trained = await checkRanking('speed', 6, true);
    assert.equal(trained.ranking[0], trained.positiveId, 'training corrects default speed ranking');
    await screenshot('desktop-training-after');
    await checkSharedState('speed', 3);
    await disclose(level3, false);
    await disclose(level2, true);
    await checkSharedState('speed', 3);
    await disclose(level2, false);
    await disclose(level3, true);
    assert.equal(await widget.getAttribute('data-mode'), 'train', 'reopening preserves the training view');
    assert.equal(await widget.getAttribute('data-steps'), '21', 'reopening preserves trained weights');
    await checkRanking('speed', 6, true);
    for (const example of M.EXAMPLES) {
      await query.selectOption(example.id);
      await checkRanking(example.id, 6, true);
    }
    await query.selectOption('speed');
    await mode('trace');
    await checkRanking('speed', 3);
    await windowSize.selectOption('6');
    await checkRanking('speed');
    await mode('train');
    await widget.locator('#en-reset').click(); state = M.createState();
    assert.equal(await widget.getAttribute('data-steps'), '0');
    await checkRanking('speed', 6, true);
    assert.equal(Number(await widget.locator('#en-loss').innerText()), oldLoss, 'reset restores original loss');
    await mode('trace');
    await stage(2);

    // Every stage and both modes remain readable at a phone width.
    await page.setViewportSize({width:390,height:844});
    await disclose(level3, false);
    await fits('phone essentials', level1);
    await fits('phone closed middle level', level2);
    await fits('phone closed full level', level3);
    await screenshot('phone-level-1', level1);
    await disclose(level2, true);
    for (let index = 0; index < 4; index++) {
      await level2.locator(`#el2-stage-${index}`).click();
      assert.equal(await level2.locator('#el2-stage-panel').getAttribute('data-stage'), String(index));
      await fits(`phone middle stage ${index}`, level2);
    }
    await screenshot('phone-level-2', level2);
    await disclose(level2, false);
    await disclose(level3, true);
    for (let index = 0; index < 7; index++) { await stage(index); await fits(`phone stage ${index}`); }
    await stage(2); await screenshot('phone-attention');
    await stage(4); await screenshot('phone-pooling');
    await mode('train'); await fits('phone training'); await screenshot('phone-training');
    await mode('trace');
    await page.setViewportSize({width:1440,height:1000});

    // Native controls must not trigger the shared presentation keyboard handler.
    const slide = await widget.evaluate(target => {
      let index = 0;
      for (const element of document.querySelector('main').children) {
        if ((element.tagName === 'H2' && element.id) || element.classList.contains('new-slide')) index++;
        if (element === target || element.contains(target)) return index;
      }
    });
    assert(Number.isInteger(slide), 'widget belongs to a slide build element');
    await page.evaluate(index => localStorage.setItem('lab.presentationSlide', String(index)), slide);
    await page.locator('#present-toggle').click();
    await page.locator('#present-forward').focus(); await page.keyboard.press('a');
    const counter = await page.locator('#present-counter').innerText();
    for (const level of [level2, level3]) {
      const wasOpen = await level.evaluate(element => element.open);
      await level.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await level.evaluate(element => element.open), !wasOpen, 'Enter toggles the native disclosure');
      assert.equal(await page.locator('#present-counter').innerText(), counter, 'Enter does not reveal a slide build');
      await page.keyboard.press('Space');
      assert.equal(await level.evaluate(element => element.open), wasOpen, 'Space toggles the native disclosure');
      assert.equal(await page.locator('#present-counter').innerText(), counter, 'Space does not reveal a slide build');
    }
    await level1.locator('#el1-example').focus(); await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#present-counter').innerText(), counter, 'essential query keys do not change the slide');
    await next.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#present-counter').innerText(), counter);
    await query.focus(); await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#present-counter').innerText(), counter);
    await page.keyboard.press('p');
    assert(await page.locator('body').evaluate(element => element.classList.contains('presentation-mode')));
    await stage(2); await screenshot('presentation-attention');
    await widget.locator('.en-modes').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output, 'presentation-top.png')});
    await widget.locator('#en-output').scrollIntoViewIfNeeded();
    assert(await widget.locator('#en-output').evaluate(element => {
      const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight;
    }), 'presentation scroll exposes the complete ranking');
    await page.screenshot({path:path.join(output, 'presentation-results.png')});
    await page.locator('#present-toggle').click();

    // Printing must include the static explanation even when both levels are closed.
    await disclose(level2, false);
    await disclose(level3, false);
    await page.emulateMedia({media:'print'});
    assert(await level1.locator('#embedding-level-1-fallback').isVisible(), 'print retains the essential model explanation');
    assert(await level1.locator('#embedding-level-1-ui').isHidden(), 'print hides essential interactive controls');
    assert(await level2.locator('#embedding-level-2-fallback').isVisible(), 'print includes the closed middle level explanation');
    assert(await level2.locator('#embedding-level-2-ui').isHidden(), 'print hides middle interactive controls');
    assert(await widget.locator('.en-print').isVisible(), 'print retains a static explanation');
    assert(await widget.locator('#en-interactive').isHidden(), 'print hides interactive controls');
    await screenshot('print');
    const plainContext = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    await plainContext.route(/^https?:\/\//, route => route.abort());
    const plain = await plainContext.newPage(); await plain.goto(url);
    const simpleFallback = plain.locator('#embedding-level-1');
    assert(await simpleFallback.locator('#embedding-level-1-fallback').isVisible(), 'no-JS retains the essential model explanation');
    assert(await simpleFallback.locator('#embedding-level-1-ui').isHidden());
    assert(await simpleFallback.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'no-JS essential explanation fits a phone');
    await simpleFallback.screenshot({path:path.join(output, 'no-script-level-1.png')});
    assert.equal(await plain.locator('#embedding-level-2').evaluate(element => element.open), false);
    assert.equal(await plain.locator('#embedding-level-3').evaluate(element => element.open), false);
    await plain.locator('#embedding-level-2 > summary').click();
    assert(await plain.locator('#embedding-level-2-fallback').isVisible(), 'no-JS middle level expands to a static explanation');
    assert(await plain.locator('#embedding-level-2-ui').isHidden());
    await plain.locator('#embedding-level-2').screenshot({path:path.join(output, 'no-script-level-2.png')});
    await plain.locator('#embedding-level-3 > summary').click();
    const fallback = plain.locator('#embedding-network');
    assert(await fallback.locator('#en-fallback').isVisible(), 'no-JS retains the mechanism explanation');
    assert(await fallback.locator('#en-interactive').isHidden());
    assert(await fallback.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'no-JS phone explanation fits');
    await fallback.screenshot({path:path.join(output, 'no-script.png')});
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log(`Passed progressive disclosure, shared state, 4 middle stages, ${checkedStages} full query/stage combinations, computed coordinates, training, reset, truncation, mobile, presentation, closed-level print, and no-JS. Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
