const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  let browser;
  const failures = [];
  const base = server.resolvedUrls.local[0];
  const viewports = [[1440, 1100], [390, 844], [820, 1180], [1180, 820], [712, 650], [1024, 360], [320, 640], [750, 350], [390, 450]].filter(([width, height]) => !process.env.TRANSIT_VIEWPORT || process.env.TRANSIT_VIEWPORT === `${width}x${height}`);
  assert.ok(viewports.length, 'TRANSIT_VIEWPORT must select a supported viewport');
  try {
    try { browser = await chromium.launch({ headless: true }); }
    catch { browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    for (const game of ['escalator.html', 'rush-hour.html']) {
      for (const [width, height] of viewports) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1100 });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        try {
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
          if (game === 'escalator.html') {
            assert.equal(await page.locator('#hud-toggle').getAttribute('aria-expanded'), 'false', 'audio settings start closed');
            assert.ok(await page.locator('.mall-caption #escalator-puzzle').isVisible(), 'puzzle chooser stays in main view');
            assert.ok(await page.locator('#game-play-panel #escalator-goals').isVisible(), 'shopping stays in main view');
            for (const selector of ['#escalator-tools', '.bench-actions', '.wave-controls']) assert.ok(await page.locator(`.game-dock .bench ${selector}`).isVisible(), 'blocks and bench share one group');
            const placement = await page.evaluate(() => {
              const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom }; };
              return { view:box('#scene-view-controls'),language:box('#escalator-language'),blocks:box('#escalator-tools'),bench:box('.bench-actions'),shopping:box('#game-play-panel'),dock:box('.game-dock'),mode:getComputedStyle(document.querySelector('#game-play-panel')).getPropertyValue('--shopping-placement').trim(),buttons:[...document.querySelectorAll('.bench-actions button')].map(n => { const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}; }) };
            });
            assert.ok(placement.view.right <= placement.language.x, 'view switch is left of language chooser');
            assert.ok(placement.bench.y >= placement.blocks.bottom, 'bench action row follows building blocks');
            assert.equal(placement.mode, width >= 1050 || width >= 760 && width/height >= 1.2 || width >= 600 && height <= 550 ? 'column' : 'row');
            if (placement.mode === 'row') assert.ok(placement.shopping.bottom <= placement.dock.y && placement.shopping.h <= 116, 'compact shopping row sits above bench');
            else assert.ok(placement.shopping.x >= placement.dock.right, 'wide shopping column sits right of bench');
            for (const b of placement.buttons) assert.ok(b.w >= 43 && b.h >= 43 && b.x >= 0 && b.y >= 0 && b.right <= width && b.bottom <= height, `bench action fits viewport: ${JSON.stringify(b)}`);
            const shoppingHeight = placement.shopping.h;
            await page.locator('.shopping-request').first().click();
            assert.ok(await page.locator('#escalator-info').isVisible(), 'request opens a compact explanation');
            assert.equal(await page.locator('.shopping-request').first().getAttribute('aria-expanded'), 'true');
            assert.equal(Math.round((await page.locator('#game-play-panel').boundingBox()).height), Math.round(shoppingHeight), 'explanation does not enlarge shopping');
            const info = await page.locator('#escalator-info').boundingBox();
            assert.ok(info.x >= 0 && info.y >= 0 && info.x + info.width <= width && info.y + info.height <= height, 'explanation stays inside viewport');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#escalator-info').isVisible(), false);
            assert.equal(await page.evaluate(() => document.activeElement.className), 'shopping-request');
            assert.equal(await page.locator('#game-play-panel').getAttribute('hidden'), null);
          }
          if (await page.locator('#hud-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#hud-toggle').click();
          if (game === 'escalator.html') {
            for (const selector of ['#escalator-effects', '#escalator-sound', '#music-volume']) assert.ok(await page.locator(selector).isVisible(), 'audio controls need no second disclosure');
            assert.equal(await page.locator('#game-control-panel details').count(), 0);
          }
          await page.locator('#hud-close').click();
          assert.equal(await page.locator('#hud-toggle').getAttribute('aria-expanded'), 'false');
          assert.equal(await page.evaluate(() => document.activeElement.id), 'hud-toggle');
          await page.locator('#hud-help').click();
          assert.equal(await page.locator('#game-help-panel').isVisible(), true);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#game-help-panel').isVisible(), false);
          await page.locator('#hud-toggle').click();
          await page.locator('#game-control-panel .game-panel-scroll').evaluate(n => { n.scrollTop = n.scrollHeight; });
          assert.equal(await page.evaluate(() => scrollY), 0);
          await page.locator('#hud-close').click();
        }
        if (game === 'escalator.html') {
          await page.locator(language).selectOption('en');
          await page.locator('[data-landing="0,0"]').click();
          assert.ok(await page.locator('#escalator-cancel').isVisible(), 'placement cancel remains outside collapsed panel');
          await page.locator('#escalator-cancel').click();
          assert.equal(await page.locator('#hud-toggle').getAttribute('aria-expanded'), 'false');
          if (width === 1440 || width === 390 && height === 844) {
            const initialHeight = (await page.locator('#game-play-panel').boundingBox()).height;
            await page.locator('[data-landing="0,0"]').click();
            await page.locator('[data-landing="1,1"]').click();
            await page.locator('[data-piece]').first().click();
            assert.equal(await page.locator('#hud-toggle').getAttribute('aria-expanded'), 'false', 'selecting a piece does not open settings');
            assert.ok(await page.locator('#escalator-reverse').isEnabled());
            await page.locator('#escalator-reverse').click();
            await page.locator('#escalator-undo').click();
            await page.locator('[data-piece]').first().click();
            assert.ok(await page.locator('#escalator-mirror').isEnabled());
            await page.locator('#escalator-mirror').click();
            assert.match(await page.locator('#escalator-notice').textContent(), /Choose two marked landings/, 'out-of-bounds mirror is rejected without changing the board');
            assert.equal(await page.locator('[data-piece]').count(), 1);
            await page.locator('#escalator-delete').click();
            assert.equal(await page.locator('[data-piece]').count(), 0);
            await page.locator('#escalator-undo').click();
            assert.equal(await page.locator('[data-piece]').count(), 1);
            await page.locator('#escalator-play').click();
            assert.equal(await page.locator('#round-issues').isVisible(), false, 'failure details do not appear before the run finishes');
            await page.locator('#escalator-result:not([hidden])').waitFor();
            assert.ok(await page.locator('#escalator-result.is-failed #round-issues').isVisible(), 'failed-run help is inside result popup');
            assert.equal(await page.locator('#round-issues').getAttribute('open'), null, 'failure details start collapsed');
            await page.locator('#round-issues summary').click();
            assert.ok(await page.locator('#escalator-result #escalator-problems').isVisible());
            assert.equal(Math.round((await page.locator('#game-play-panel').boundingBox()).height), Math.round(initialHeight), 'failed wave does not enlarge shopping');
            await page.locator('.shopping-request').first().click();
            assert.match(await page.locator('#info-body').textContent(), /Cannot reach destination/);
            await page.keyboard.press('Escape');
            await page.locator('#escalator-edit').click();
            await page.locator('[data-landing="1,1"]').click();
            await page.locator('[data-landing="2,2"]').click();
            await page.locator('#escalator-play').click();
            await page.locator('#escalator-result:not([hidden])').waitFor();
            assert.equal(await page.locator('#escalator-result').getAttribute('class').then(c => c.includes('is-failed')), false, 'corrected route succeeds');
            assert.equal(await page.locator('#round-issues').isVisible(), false, 'success has no failure details');
            await page.locator('#escalator-puzzle').selectOption('19');
            for (const locale of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN']) {
              await page.locator(language).selectOption(locale);
              const panelHeight = (await page.locator('#game-play-panel').boundingBox()).height;
              assert.equal(await page.locator('#access-guide p').count(), 0, 'access rules are collapsed icons by default');
              for (const need of ['wheelchair', 'balloon']) {
                const icon = page.locator(`#access-guide [data-info="${need}"]`);
                await icon.click();
                assert.equal(await icon.getAttribute('aria-expanded'), 'true');
                assert.ok((await page.locator('#info-body').textContent()).length > 20, 'related localized explanation opens');
                const popup = await page.locator('#escalator-info').boundingBox();
                assert.ok(popup.x >= 0 && popup.y >= 0 && popup.x + popup.width <= width && popup.y + popup.height <= height, 'localized access explanation fits');
                await page.locator('[data-info-close]').click();
                assert.equal(await icon.getAttribute('aria-expanded'), 'false');
                assert.equal(await page.evaluate(() => document.activeElement.dataset.info), need, 'close restores icon focus');
              }
              await page.locator('#escalator-hint').click();
              assert.ok(await page.locator('#escalator-info').isVisible());
              assert.equal(Math.round((await page.locator('#game-play-panel').boundingBox()).height), Math.round(panelHeight), 'hint does not enlarge shopping');
              await page.locator('#view-2d').click();
              assert.equal(await page.locator('#escalator-info').isVisible(), false, 'outside click dismisses without blocking view controls');
            }
            await page.locator(language).selectOption('en');
          }
          if (process.env.TRANSIT_SCREENSHOTS && (width === 1440 || width === 390 && height === 844)) await page.screenshot({ path: require('node:path').join(process.env.TRANSIT_SCREENSHOTS, `escalator-workbench-${width}.png`) });
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
        } catch (error) {
          failures.push(`${game} ${width}x${height}: ${error.message}; runtime=${JSON.stringify(errors)}`);
          console.error(failures.at(-1));
          if (process.env.TRANSIT_SCREENSHOTS && (width === 1440 || width === 390)) await page.screenshot({ path: require('node:path').join(process.env.TRANSIT_SCREENSHOTS, `${game}-failure-${width}.png`) });
        } finally { await page.close(); }
      }
    }
    assert.deepEqual(failures, [], 'all shared-HUD cases pass');
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
