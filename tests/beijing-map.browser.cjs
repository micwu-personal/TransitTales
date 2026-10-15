const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const { createServer, preview } = await import('vite');
  const production = process.env.TRANSIT_PREVIEW_DIR;
  const server = production
    ? await preview({ base: process.env.TRANSIT_PREVIEW_BASE || '/', build: { outDir: path.resolve(production) }, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
    : await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    if (!production) await server.listen();
    try { browser = await chromium.launch({ headless: true }); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    for (const [width, height] of [[1440, 1100], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width === 390 });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${server.resolvedUrls.local[0]}beijing.html`);
      await page.locator('[data-candidate="0"]').waitFor();
      await page.locator('#language').selectOption('en');
      await page.locator('#search').fill('西单');
      await page.locator('#search-results button').first().click();
      await page.locator('#planner-toggle').click();
      const measure = () => page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('.station-text')).filter(text => {
          const style = getComputedStyle(text);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).map(text => {
          const r = text.getBoundingClientRect(), m = text.getScreenCTM();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, size: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(m.a, m.b), english: text.querySelector('tspan') ? parseFloat(getComputedStyle(text.querySelector('tspan')).fontSize) * Math.hypot(m.a, m.b) : 0 };
        });
        let overlaps = 0;
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          if (a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y) overlaps++;
        }
        const svg = document.querySelector('.network-svg').getBoundingClientRect();
        return { labels, overlaps, bounds: { x: svg.x, y: svg.y, right: svg.right, bottom: svg.bottom } };
      });
      const check = async state => {
        await page.waitForTimeout(120);
        const result = await measure();
        assert.ok(result.labels.length >= 2, `${state}/${width}: readable labels are present`);
        assert.ok(result.labels.every(label => label.size >= 10 && label.size <= 14 && label.english >= 9 && label.english <= 11), `${state}/${width}: bilingual station text stays in screen pixels, not oversized map units: ${JSON.stringify(result.labels.slice(0, 5))}`);
        assert.equal(result.overlaps, 0, `${state}/${width}: visible labels do not overlap`);
        assert.ok(result.labels.every(label => label.x >= result.bounds.x - 1 && label.y >= result.bounds.y - 1 && label.right <= result.bounds.right + 1 && label.bottom <= result.bounds.bottom + 1), `${state}/${width}: labels stay within the viewport`);
        return result;
      };
      if (process.env.TRANSIT_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOTS, `beijing-map-fit-${width}.png`) });
      await check('center');
      for (let i = 0; i < 6; i++) await page.locator('#zoom-in').click();
      await check('maximum zoom');
      if (process.env.TRANSIT_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOTS, `beijing-map-close-${width}.png`) });
      const paths = await page.locator('.network-lines path').evaluateAll(paths => paths.map(path => ({ vector: getComputedStyle(path).vectorEffect, stroke: parseFloat(getComputedStyle(path).strokeWidth) })));
      assert.ok(paths.every(path => path.vector === 'non-scaling-stroke' && path.stroke >= 2 && path.stroke <= 5), 'tracks remain visible without becoming giant bands');
      const selected = await page.locator('.map-station.selected').getAttribute('aria-label');
      const bounds = await page.locator('.network-svg').boundingBox();
      const point = { x: bounds.x + bounds.width * .5, y: bounds.y + bounds.height * .5 };
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x + 60, point.y + 20, { steps: 5 }); await page.mouse.up();
      assert.equal(await page.locator('.map-station.selected').getAttribute('aria-label'), selected, 'panning never selects a new station');
      await check('pan');
      await page.locator('#fit').click(); await check('fit');
      assert.equal(await page.locator('.map-station[role="button"]').count(), 426, 'decluttering never removes station access');
      await page.locator('.map-station.selected').focus(); await page.keyboard.press('ArrowRight');
      await check('keyboard center');
      const focused = await page.locator('.map-station:focus').getAttribute('aria-label');
      assert.ok(focused && focused !== selected, 'arrow navigation centers and focuses a real station');
      if (width === 390) {
        const touch = await page.context().newCDPSession(page);
        await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        const touchBounds = await page.locator('.network-svg').boundingBox();
        const touchPoint = { x: touchBounds.x + touchBounds.width / 2, y: touchBounds.y + touchBounds.height / 2 };
        const points = distance => [{ x: touchPoint.x - distance / 2, y: touchPoint.y, id: 1 }, { x: touchPoint.x + distance / 2, y: touchPoint.y, id: 2 }];
        const before = await page.locator('.network-svg').evaluate(svg => svg.viewBox.baseVal.width);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(70) });
        for (let i = 1; i <= 5; i++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(70 + i * 14) });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.ok(await page.locator('.network-svg').evaluate(svg => svg.viewBox.baseVal.width) < before, 'two-finger pinch zooms');
        await check('pinch');
      }
      await page.setViewportSize({ width: width === 390 ? 844 : 1100, height: width === 390 ? 390 : 800 });
      await check('resize');
      for (const locale of ['zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN']) {
        await page.locator('#language').selectOption(locale); await check(locale);
      }
      if (process.env.TRANSIT_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOTS, `beijing-map-after-${width}.png`) });
      assert.deepEqual(errors, []);
      console.log(`PASS Beijing map ${width}: bounded bilingual labels, zero overlap, stable tracks, search/keyboard/pan/pinch/resize and five locales`);
      await page.close();
    }
  } finally {
    await browser?.close();
    if (production) await new Promise(resolve => server.httpServer.close(resolve)); else await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
