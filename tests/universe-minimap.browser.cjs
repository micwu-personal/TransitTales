// Run with: node tests\universe-minimap.browser.cjs (Playwright and Chromium/Edge required).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  server.middlewares.use('/universe-map-check', (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Map fixture</title>'); });
  let browser;
  try {
    await server.listen();
    const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    try { browser = await chromium.launch({ headless: true }); }
    catch { browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixture = async (view, progress = 0, epoch = 'present', destination = 'neptune') => {
      await page.goto(`${url}/universe-map-check`);
      await page.evaluate(async ({ progress, epoch, destination }) => {
        const { createJourney, beginJump, tickJourney, writeJourney } = await import('/src/universe/model.ts');
        const state = tickJourney(beginJump({ ...createJourney(), beta: .65 }, destination, epoch), 7 * progress);
        if (!writeJourney(localStorage, { ...state, paused: true })) throw Error('Cannot save map fixture');
        localStorage.setItem('transit-tales-language', 'en');
      }, { progress, epoch, destination });
      await page.goto(`${url}/universe.html?view=${view}`);
      await page.locator(view === '2d' ? '.cosmic-scene>svg' : '#universe[data-renderer="3d-ready"]').waitFor();
      await page.locator('#language').selectOption('en');
      await page.waitForTimeout(750);
            assert.equal(await page.locator('#navigation-map').getAttribute('data-transition'), '1', 'Demand-driven zoom draws its exact final frame before becoming idle');
    };
    const camera = () => page.locator('#navigation-map').getAttribute('data-camera-au');
    const matchingCamera = async view => {
      const pair = await page.evaluate(view => [document.querySelector('#navigation-map').dataset.cameraAu, document.querySelector(view === '2d' ? '.cosmic-scene>svg' : '.cosmic-scene>canvas').dataset.cameraAu], view);
      assert.equal(pair[0], pair[1], `${view}: map follows the actual shared flight camera`);
    };
    const gpuCorners = () => page.evaluate(() => {
          // Sample before presentation discards the non-preserved GPU buffer.
          document.querySelector('#zoom-in').click();
          const canvas = document.querySelector('.cosmic-scene>canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const pixel = new Uint8Array(4), samples = [];
      for (const [x, y] of [[.04,.04],[.96,.04],[.04,.96],[.96,.96],[.5,.04]]) {
        gl.readPixels(Math.floor(gl.drawingBufferWidth * x), Math.floor(gl.drawingBufferHeight * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        samples.push([...pixel]);
      }
      document.querySelector('#camera-reset').click();
      return samples;
    });
    for (const view of ['2d', '3d']) {
      await fixture(view);
      assert.equal(await page.locator('#navigation-map').getAttribute('open'), '');
      assert.equal(await page.locator('#map-scope').inputValue(), 'adaptive');
      assert.equal(await page.locator('#map-scope>option').count(), 9);
      await matchingCamera(view);
      const start = await camera(), bounds = await page.locator('#navigation-map').getAttribute('data-radius-au');
      if (view === '3d') {
        const pixels = await gpuCorners();
        assert.ok(pixels.every(p => p[3] === 255), 'Real WebGL drawing-buffer pixels must be populated');
        assert.ok(pixels.filter(p => p[2] >= p[0] && p[0] < 65).length >= 4, `Present departure sky must be dark blue, not orange: ${JSON.stringify(pixels)}`);
      }
      await page.locator('#pause').click();
      await page.waitForTimeout(700);
      await matchingCamera(view);
      assert.notEqual(await camera(), start, `${view}: map location moves through space`);
      assert.ok(Math.abs(Number(await page.locator('#navigation-map').getAttribute('data-radius-au')) / Number(bounds) - 1) < 1e-12, `${view}: adaptive extent remains stable during flight`);
      await page.locator('#map-scope').selectOption('solar');
      await page.waitForTimeout(140);
      const progress = Number(await page.locator('#navigation-map').getAttribute('data-transition'));
      assert.ok(progress > 0 && progress < 1, `${view}: scope changes interpolate instead of snapping`);
      await page.locator('#pause').click();
      await page.waitForTimeout(750);
      const paused = await camera();
      await page.waitForTimeout(150);
      assert.equal(await camera(), paused, `${view}: paused camera does not drift`);
      assert.equal(await page.locator('#map-scope').isEnabled(), true);
      for (const scope of ['earth-moon', 'milky-way', 'local-group', 'virgo', 'laniakea', 'universe', 'nearby', 'adaptive']) {
        await page.locator('#map-scope').selectOption(scope);
        await page.waitForTimeout(710);
        assert.equal(await page.locator('#navigation-map').getAttribute('data-scope'), scope);
        assert.ok(Number(await page.locator('#navigation-map').getAttribute('data-radius-au')) > 0);
        assert.equal(await camera(), paused, 'Selecting a scope never relocates the player');
      }
      await page.locator('#map-scope').selectOption('nearby');
      await page.locator('#map-radius').fill('0'); await page.locator('#map-radius').dispatchEvent('change');
      assert.equal(await page.locator('#map-radius').inputValue(), '0.001');
      await page.locator('#map-radius').fill(''); await page.locator('#map-radius').dispatchEvent('change');
      assert.equal(await page.locator('#map-radius').inputValue(), '5');
      await page.waitForTimeout(710);
      const retained = await page.locator('#navigation-map').evaluate(node => { window.__mapNode = node; return node.dataset.radiusAu; });
      await page.locator('#language').selectOption('zh-CN');
      assert.equal(await page.locator('#navigation-map').evaluate(node => node === window.__mapNode), true, 'Language change retains the map DOM');
      assert.equal(await page.locator('#map-scope').inputValue(), 'nearby');
      assert.equal(await page.locator('#navigation-map').getAttribute('data-radius-au'), retained);
      assert.ok((await page.locator('#map-title').textContent()).includes('地图'));
      await page.locator(view === '2d' ? '#view3d' : '#view2d').click();
      await page.locator(view === '2d' ? '.cosmic-scene>canvas' : '.cosmic-scene>svg').waitFor();
      assert.equal(await page.locator('#map-scope').inputValue(), 'nearby');
      assert.equal(await camera(), paused, 'View switching retains map location');
    }
    await fixture('3d', 1, 'bang', 'earth');
    const warm = await gpuCorners();
    assert.ok(warm.filter(p => p[0] > p[2] && p[0] > 80).length >= 4, `Hot primordial sky remains warm: ${JSON.stringify(warm)}`);
    await fixture('3d', .42);
    await page.evaluate(() => {
      const canvas = document.querySelector('.cosmic-scene>canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      gl.getExtension('WEBGL_lose_context').loseContext();
    });
    await page.locator('.cosmic-scene>svg').waitFor();
    await matchingCamera('2d');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#map-scope').selectOption('universe'); await page.waitForTimeout(70);
    assert.equal(await page.locator('#navigation-map').getAttribute('data-transition'), '1');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const output = process.env.UNIVERSE_MAP_SCREENSHOTS;
    if (output) fs.mkdirSync(output, { recursive: true });
    for (const [width, lang] of [[1440,'en'],[390,'en'],[390,'zh-CN'],[390,'ja'],[390,'mn-Cyrl-MN'],[390,'mn-Mong-CN']]) {
      await page.setViewportSize({ width, height: 1100 });
      await fixture('2d', .42);
      await page.locator('#language').selectOption(lang);
      await page.locator('#map-scope').selectOption('adaptive');
      await page.waitForTimeout(750);
      const layout = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        const map = rect('#navigation-map'), scene = rect('.window');
        const overlaps = ['.window-caption','#route-readout','.crew-portrait','.scene-toolbar','.window-footnote'].filter(selector => {
          const r = rect(selector); return r.width && r.height && map.x < r.right && map.right > r.x && map.y < r.bottom && map.bottom > r.y;
        });
        const smallControls = [...document.querySelectorAll('#navigation-map summary,#navigation-map select')].filter(node => node.getBoundingClientRect().height < 44).length;
        return { map, scene, overlaps, smallControls, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      if (output) await page.locator('.window').screenshot({ path: path.join(output, `${width}-${lang}.png`) });
      assert.equal(layout.overflow, false, `${width}/${lang}: no page overflow`);
      assert.equal(layout.smallControls, 0, `${width}/${lang}: native 44px controls`);
      assert.deepEqual(layout.overlaps, [], `${width}/${lang}: corner map does not obscure other scene controls: ${JSON.stringify(layout)}`);
      assert.ok(layout.map.x >= layout.scene.x && layout.map.right <= layout.scene.right && layout.map.bottom <= layout.scene.bottom, `${width}/${lang}: map stays within scene`);
    }
    assert.deepEqual(errors, []);
    console.log('Navigation map: real camera tracking in both renderers, all nine scopes, radius bounds, smooth transitions, pause/view/language continuity, GPU sky colors, context-loss fallback, reduced motion and five-language mobile layouts passed.');
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
