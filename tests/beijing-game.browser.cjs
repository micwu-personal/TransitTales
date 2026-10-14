const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await server.listen();
    const base = server.resolvedUrls.local[0];
    const options = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
    try { browser = await chromium.launch(options); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ ...options, channel: 'msedge' }); }
    for (const [width, height] of [[1440, 1100], [390, 844], [820, 1180], [1180, 820], [712, 650], [1024, 360]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1100 });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const touch = width < 1100 ? await page.context().newCDPSession(page) : undefined;
      if (touch) await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await page.goto(`${base}beijing.html`);
      await page.locator('[data-candidate="0"]').waitFor();
      assert.equal(await page.locator('.map-station').count(), 426);
      assert.equal(await page.locator('#round option').count(), 7);
      assert.equal(await page.locator('#speed').inputValue(), '5');
      for (const locale of width === 1440 || width === 390 ? ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'] : ['en']) {
        await page.locator('#language').selectOption(locale);
        await page.waitForTimeout(100);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1), `${locale}/${width}: viewport fits`);
        assert.ok(await page.locator('.scene-toolbar button').evaluateAll(buttons => buttons.every(button => {
          const r = button.getBoundingClientRect();
          return r.width >= 43 && r.height >= 43 && r.top >= 0 && r.bottom <= innerHeight && button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        })), `${locale}/${width}: scene controls are reachable`);
      }
      await page.locator('#language').selectOption('en');
      const mapSize = () => page.locator('.network-svg').evaluate(svg => svg.viewBox.baseVal.width);
      const fitted = await mapSize();
      await page.locator('#zoom-in').click(); assert.ok(await mapSize() < fitted);
      await page.locator('#zoom-out').click(); await page.locator('#fit').click();
      await page.locator('#planner-toggle').click();
      const mapBounds = await page.locator('#map-host').boundingBox();
      const point = { x: mapBounds.x + mapBounds.width / 2, y: mapBounds.y + mapBounds.height / 2 };
      await page.mouse.move(point.x, point.y); await page.mouse.wheel(0, -100);
      await page.waitForTimeout(100); assert.ok(await mapSize() < fitted, 'wheel zooms map');
      await page.locator('#fit').click();
      if (touch && (width === 390 || width === 820)) {
        const points = distance => [{ x: point.x - distance / 2, y: point.y, id: 1 }, { x: point.x + distance / 2, y: point.y, id: 2 }];
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(80) });
        for (let i = 1; i <= 6; i++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(80 + i * 12) });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.ok(await mapSize() < fitted * .8, 'natural two-finger pinch zooms map');
        assert.equal(await page.locator('#planner-toggle').getAttribute('aria-expanded'), 'false', 'pinch does not select a station');
        await page.locator('#fit').click();
      }
      const mapX = await page.locator('.network-svg').evaluate(svg => svg.viewBox.baseVal.x);
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x + 50, point.y + 15, { steps: 5 }); await page.mouse.up();
      assert.notEqual(await page.locator('.network-svg').evaluate(svg => svg.viewBox.baseVal.x), mapX, 'drag pans map');
      await page.locator('#fit').click(); await page.locator('#planner-toggle').click();
      await page.locator('#search').fill('天安门');
      assert.ok(await page.locator('#search-results button').count() >= 2);
      await page.locator('#search-results button').first().click();
      assert.match(await page.locator('#selected-station').textContent(), /天安门/);
      await page.locator('#fit').click();
      // Construct the introductory two-service trip without using a suggestion.
      await page.locator('#manual-end').selectOption({ label: '西单 · Xidan' });
      await page.locator('[data-action="add-leg"]').click();
      const transferLine = await page.locator('#manual-line option').evaluateAll(options => options.find(option => /4号线/.test(option.textContent)).value);
      await page.locator('#manual-line').selectOption(transferLine);
      const south = await page.locator('#manual-end option').evaluateAll(options => options.find(option => /北京南站/.test(option.textContent)).value);
      await page.locator('#manual-end').selectOption(south);
      await page.locator('[data-action="add-leg"]').click();
      assert.equal(await page.locator('.route-plan li').count(), 2);
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), true);
      await page.locator('[data-action="undo"]').click();
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), false);
      await page.locator('[data-action="clear"]').click();
      await page.locator('[data-candidate="0"]').click();
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), true);
      if (process.env.TRANSIT_SCREENSHOTS && (width === 1440 || width === 390)) {
        await page.locator('#planner-toggle').click();
        await page.screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOTS, `beijing-map-${width}.png`) });
        await page.locator('#planner-toggle').click();
      }
      await page.locator('[data-action="board"]').click();
      try { await page.locator('.journey-canvas').waitFor({ timeout: 60000 }); }
      catch (error) {
        console.error(await page.evaluate(() => ({ status: document.querySelector('#render-status').textContent, children: document.querySelector('#journey-host').innerHTML.slice(0,1200) })));
        throw error;
      }
      assert.equal(await page.locator('#speed').inputValue(), '5');
      await page.locator('#pause').click();
      await page.evaluate(async () => {
        const { Engine } = await import('/src/babylon.ts');
        window.journeyCamera = () => Engine.LastCreatedScene.activeCamera;
        if (Engine.LastCreatedScene.meshes.length < 50) throw new Error('First-person scenery is not rendered');
      });
      const yaw = await page.evaluate(() => window.journeyCamera().rotation.y);
      const scene = await page.locator('.journey-canvas').boundingBox();
      const look = { x: scene.x + scene.width * .45, y: scene.y + scene.height * .45 };
      if (touch) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...look, id: 1 }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: look.x + 45, y: look.y + 8, id: 1 }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(look.x, look.y); await page.mouse.down();
        await page.mouse.move(look.x + 45, look.y + 8, { steps: 5 }); await page.mouse.up();
      }
      assert.ok(Math.abs(await page.evaluate(() => window.journeyCamera().rotation.y) - yaw) > .05, 'mouse/one-finger drag looks around the carriage');
      const progress = await page.locator('#progress').textContent();
      if (process.env.TRANSIT_SCREENSHOTS && (width === 1440 || width === 390)) await page.screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOTS, `beijing-journey-${width}.png`) });
      await page.locator('#dimension').selectOption('2d');
      await page.locator('.journey-svg').waitFor();
      assert.equal(await page.locator('.journey-canvas').count(), 0);
      assert.equal(await page.locator('#progress').textContent(), progress, 'renderer switching preserves paused travel');
      await page.locator('#speed').selectOption('15');
      await page.locator('#map-view').click(); await page.locator('#journey-view').click();
      assert.equal(await page.locator('#progress').textContent(), progress);
      // A fresh real WebGL context loss must enter the advertised 2D fallback.
      await page.locator('#dimension').selectOption('3d');
      await page.locator('.journey-canvas').waitFor();
      await page.locator('.journey-canvas').evaluate(canvas => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const extension = gl?.getExtension('WEBGL_lose_context');
        if (!extension) throw new Error('Context-loss extension unavailable');
        extension.loseContext();
      });
      await page.locator('.journey-svg').waitFor();
      assert.equal(await page.locator('#dimension').inputValue(), '2d');
      assert.ok((await page.locator('#render-status').textContent()).length > 0);
      assert.equal(await page.locator('#progress').textContent(), progress);
      assert.deepEqual(errors, []);
      console.log(`PASS Beijing ${width}x${height}: full network, locales, manual transfer, search, 5x, pause, renderer preservation and context-loss fallback`);
      await page.close();
    }
  } finally { await browser?.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
