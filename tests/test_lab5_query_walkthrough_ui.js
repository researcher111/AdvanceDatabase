'use strict';
// Run with Node and Playwright available. Optionally set PLAYWRIGHT_CHROMIUM_EXECUTABLE.
// Browser checks run offline and cover user interactions as well as source highlighting.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(path.join(__dirname, '../labs/lab-05/sqlfrontend.html')).href + '#worked-example');
    const root = page.locator('#viz-query-walkthrough');
    await root.waitFor();
    assert.equal(await root.getAttribute('data-stage'), 'lex');
    const columns = await page.evaluate(() => {
      const left = document.querySelector('.qw-code-panel').getBoundingClientRect();
      const right = document.querySelector('.qw-visual-panel').getBoundingClientRect();
      const root = document.querySelector('.qw').getBoundingClientRect();
      const toc = document.querySelector('.toc').getBoundingClientRect();
      return { left: left.x, right: right.x, sameY: Math.abs(left.y - right.y) < 1, rootRight: root.right, rootLeft: root.left, tocRight: toc.right, width: innerWidth };
    });
    assert(columns.right > columns.left && columns.sameY, 'Code left, visuals right');
    assert(columns.rootLeft > columns.tocRight && columns.rootRight <= columns.width, 'Diagram fits beside TOC');
    const frameCount = await page.locator('#qw-scrub').getAttribute('max');
    // All steps in the initial query must highlight the corresponding real Python line.
    const checked = await page.evaluate(() => {
      const trace = QueryTrace.build(document.querySelector('#qw-query').value);
      const slider = document.querySelector('#qw-scrub');
      return trace.frames.map((frame, i) => {
        slider.value = i; slider.dispatchEvent(new Event('input', { bubbles: true }));
        const rows = document.querySelectorAll('#qw-code [aria-current="step"]');
        const token = document.querySelector('#qw-tokens .is-current');
        return { line: rows.length === 1 && +rows[0].dataset.line === frame.line,
          method: document.querySelector('#qw-method').textContent === frame.method + '()',
          cursor: frame.stage !== 'parse' || (frame.pos <= frame.tokens.length ? +token?.dataset.index === frame.pos : !token),
          complete: Boolean(frame.complete), index: i };
      });
    });
    assert(checked.every(frame => frame.line && frame.method && frame.cursor));
    assert.equal(checked.length, Number(frameCount) + 1);
    assert(checked.at(-1).complete);
    assert(await page.locator('#qw-next').isDisabled());
    assert((await page.locator('#qw-plan').textContent()).includes('ProjectScan'));
    await page.locator('#qw-back').click();
    assert(!(await page.locator('#qw-next').isDisabled()));
    await page.locator('[data-qw-stage="parse"]').click();
    assert.equal(await root.getAttribute('data-stage'), 'parse');
    await page.locator('#qw-fullscreen').click();
    await page.waitForFunction(() => document.fullscreenElement?.id === 'viz-query-walkthrough');
    assert.equal(await page.locator('#qw-fullscreen').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await page.locator('#qw-fullscreen').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    // Join, SELECT *, strings, parser errors, planner errors.
    for (let i = 0; i < 6; i++) {
      await page.locator('#qw-example').selectOption(String(i));
      await page.locator('#qw-finish').click();
      const expectedError = i >= 4;
      assert.equal(await page.locator('#qw-validation').isVisible(), expectedError);
      assert.equal(await root.getAttribute('data-stage'), i === 4 ? 'parse' : 'plan');
      if (i === 1) {
        assert.equal(await page.locator('.qw-plan-node').count(), 5);
        assert((await page.locator('#qw-data').textContent()).includes("F('mid2')"));
      }
      if (i === 2) assert.equal(await page.locator('.qw-plan-node').count(), 1);
      if (i === 4) assert(await page.locator('[data-qw-stage="plan"]').isDisabled());
      if (i === 5) assert((await page.locator('#qw-plan').textContent()).includes('closed on error'));
    }
    await page.locator('#qw-query').fill('SELECT name\nFROM students WHERE gpa > 35;');
    assert(await page.locator('#qw-next').isDisabled());
    assert(!(await page.locator('#qw-workspace').isVisible()));
    await page.locator('#qw-query').press('Control+Enter');
    assert(!(await page.locator('#qw-next').isDisabled()));
    await page.locator('#qw-speed').selectOption('450');
    const before = Number(await root.getAttribute('data-step'));
    await page.locator('#qw-play').click();
    await page.waitForFunction(before => +document.querySelector('.qw').dataset.step > before, before);
    await page.locator('#qw-play').click();
    const paused = await root.getAttribute('data-step');
    await page.waitForTimeout(600);
    assert.equal(await root.getAttribute('data-step'), paused);
    await page.locator('#qw-play').click();
    await page.locator('#qw-query').fill("SELECT name FROM students WHERE name = '<img src=x onerror=alert(1)>'");
    assert.equal(await page.locator('#qw-play').getAttribute('aria-pressed'), 'false');
    await root.getByRole('button', { name: 'Trace query', exact: true }).click();
    await page.locator('#qw-finish').click();
    assert.equal(await root.locator('img').count(), 0);
    assert((await page.locator('#qw-plan').textContent()).includes('<img src=x onerror=alert(1)>'));
    // Prepare a readable review screenshot: default query partway through parsing.
    await page.locator('#qw-example').selectOption('0');
    await page.locator('#qw-scrub').evaluate(el => { el.value = 29; el.dispatchEvent(new Event('input', { bubbles: true })); });
    if (process.env.QUERY_REVIEW_DIR) await root.screenshot({ path: path.join(process.env.QUERY_REVIEW_DIR, 'lab5-query-desktop.png') });
    await page.locator('#qw-example').selectOption('1');
    await page.locator('#qw-finish').click();
    if (process.env.QUERY_REVIEW_DIR) await root.screenshot({ path: path.join(process.env.QUERY_REVIEW_DIR, 'lab5-query-plan.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#qw-fullscreen').click();
    await page.waitForFunction(() => document.fullscreenElement?.id === 'viz-query-walkthrough');
    const fullscreen = await page.evaluate(() => {
      const query = document.querySelector('#qw-query').getBoundingClientRect();
      const code = document.querySelector('#qw-code .is-active').getBoundingClientRect();
      const plan = document.querySelector('#qw-plan .is-active').getBoundingClientRect();
      const leaf = [...document.querySelectorAll('.qw-plan-node')].at(-1).getBoundingClientRect();
      return [query, code, plan, leaf].every(rect => rect.top >= 0 && rect.bottom <= innerHeight);
    });
    assert(fullscreen, 'Query, highlighted code, and the complete example plan fit in fullscreen');
    await page.locator('#qw-fullscreen').focus();
    await page.keyboard.press('Shift+Tab');
    assert(await root.evaluate(root => root.contains(document.activeElement)), 'Fullscreen retains keyboard focus');
    if (process.env.QUERY_REVIEW_DIR) await page.screenshot({ path: path.join(process.env.QUERY_REVIEW_DIR, 'lab5-query-fullscreen.png') });
    await page.locator('#qw-fullscreen').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await page.locator('#qw-fullscreen').textContent(), 'Full screen');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#qw-example').selectOption('0');
    await page.locator('[data-qw-stage="parse"]').click();
    const mobile = await page.evaluate(() => {
      const code = document.querySelector('.qw-code-panel').getBoundingClientRect();
      const visual = document.querySelector('.qw-visual-panel').getBoundingClientRect();
      const root = document.querySelector('.qw').getBoundingClientRect();
      return { stacked: visual.top > code.bottom, left: root.left, right: root.right, width: innerWidth,
        overflow: document.querySelector('.qw').scrollWidth > document.querySelector('.qw').clientWidth + 1 };
    });
    assert(mobile.stacked && mobile.left >= 0 && mobile.right <= mobile.width && !mobile.overflow, JSON.stringify(mobile));
    if (process.env.QUERY_REVIEW_DIR) await root.screenshot({ path: path.join(process.env.QUERY_REVIEW_DIR, 'lab5-query-mobile.png') });
    assert.deepEqual(errors, []);
    console.log('Lab 5 query UI passes offline: all source highlights, cursors, stages, playback, edits, errors, desktop and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
