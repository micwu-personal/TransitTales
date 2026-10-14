const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  let browser;
  const base = server.resolvedUrls.local[0];
  const viewports = [[1440, 1100], [390, 844], [820, 1180], [1180, 820], [712, 650], [1024, 360]];
  try {
    try { browser = await chromium.launch({ headless: true }); }
    catch { browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    for (const game of ['escalator.html', 'rush-hour.html']) {
      for (const [width, height] of viewports) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1100 });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${base}${game}?view=2d`);
        await page.locator('#hud-toggle').waitFor();
        const language = game === 'escalator.html' ? '#escalator-language' : '#language';
        for (const locale of width === 390 || width === 1440 ? ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'] : ['en']) {
          await page.locator(language).selectOption(locale);
          await page.waitForTimeout(100);
          const bounds = await page.evaluate(() => {
            const root = document.querySelector('.viewport-game');
            const rect = root.getBoundingClientRect();
            const box = n => { const r = n.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height }; };
            return { root:box(root), scene:box(root.querySelector('.scene-surface')), docW:document.documentElement.scrollWidth,docH:document.documentElement.scrollHeight, controls:[...root.querySelectorAll('.game-header-actions button,.game-header-actions select,.game-view-tools button')].filter(n => !n.hidden && n.offsetParent).map(box), inside: rect.bottom <= innerHeight + 1 };
          });
          assert.ok(bounds.inside && bounds.root.y >= -1, `${game}/${locale}/${width}: root fits screen`);
          assert.ok(bounds.docW <= width + 1 && bounds.docH <= height + 1, `${game}/${locale}/${width}: no document scrolling ${JSON.stringify(bounds)}`);
          assert.ok(bounds.scene.w > 200 && bounds.scene.h > 90, `${game}/${locale}/${width}: usable scene`);
          assert.equal(await page.locator(game === 'escalator.html' ? '#mall-camera-controls' : '#city-camera-controls').isVisible(), false, '2D hides camera controls');
          assert.equal(await page.locator(game === 'escalator.html' ? '#escalator-result' : '#result').isVisible(), false, 'unfinished games hide result overlay');
          for (const c of bounds.controls) assert.ok(c.w >= 43 && c.h >= 43 && c.x >= -1 && c.y >= -1 && c.x + c.w <= width + 1 && c.y + c.h <= height + 1, `${game}/${locale}/${width}: reachable 44px controls ${JSON.stringify(c)}`);
          if (await page.locator('#hud-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#hud-toggle').click();
          await page.locator('#hud-close').click();
          assert.equal(await page.locator('#hud-toggle').getAttribute('aria-expanded'), 'false');
          assert.equal(await page.evaluate(() => document.activeElement.id), 'hud-toggle');
          await page.locator('#hud-help').click();
          assert.equal(await page.locator('#game-help-panel').isVisible(), true);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#game-help-panel').isVisible(), false);
          await page.locator('#hud-toggle').click();
          await page.locator('.game-panel-scroll').evaluate(n => { n.scrollTop = n.scrollHeight; });
          assert.equal(await page.evaluate(() => scrollY), 0);
          await page.locator('#hud-close').click();
        }
        if (game === 'escalator.html') {
          await page.locator(language).selectOption('en');
          await page.locator('[data-landing="0,0"]').click();
          assert.ok(await page.locator('#escalator-cancel').isVisible(), 'placement cancel remains outside collapsed panel');
          await page.locator('#escalator-cancel').click();
          assert.equal(await page.locator('#hud-toggle').getAttribute('aria-expanded'), 'false');
        } else {
          await page.locator('[data-station="market"]').click();
          assert.ok(await page.locator('#interior-close').isVisible());
          assert.ok(await page.locator('.game-view-tools button').evaluateAll(buttons => buttons.filter(b => b.offsetParent).every(button => {
            const r = button.getBoundingClientRect();
            return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          })), 'station interior does not obstruct the view toolbar');
          await page.locator('#interior-close').click();
          assert.equal(await page.evaluate(() => scrollY), 0);
        }
        assert.deepEqual(errors, []);
        console.log(`PASS ${game} ${width}x${height}`);
        await page.close();
      }
    }
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
