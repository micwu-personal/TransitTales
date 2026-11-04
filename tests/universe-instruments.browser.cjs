// Run npm run build, then node tests\universe-instruments.browser.cjs (Playwright WebKit).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webkit, devices } = require('playwright');
(async () => {
  let server, browser;
  try {
    let url = process.env.UNIVERSE_INSTRUMENTS_URL;
    if (!url) {
      const base = fs.readFileSync(path.join(process.cwd(), 'dist', 'universe.html'), 'utf8').match(/src="([^"]*)assets\//)?.[1] ?? '/';
      const { preview } = await import('vite');
      server = await preview({ configFile: false, base, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
      url = `http://127.0.0.1:${server.httpServer.address().port}${base}universe.html`;
    }
    browser = await webkit.launch({ headless: true });
    async function check(name, run, sensors = false) {
      const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
      await context.addInitScript(mockSensors => {
        localStorage.setItem('transit-tales-language', 'en');
        Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
        window.__rafCalls = 0;
        const raf = window.requestAnimationFrame;
        window.requestAnimationFrame = callback => raf.call(window, now => { window.__rafCalls++; callback(now); });
        if (mockSensors) {
          window.__sensorRequests = 0; window.__sensorPermission = 'granted';
          for (const name of ['DeviceOrientationEvent', 'DeviceMotionEvent']) {
            window[name] = class extends Event {
              constructor(type, values = {}) { super(type); Object.assign(this, values); }
              static requestPermission() { window.__sensorRequests++; return Promise.resolve(window.__sensorPermission); }
            };
          }
        }
      }, sensors);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try { await run(page); assert.deepEqual(errors, []); console.log(`PASS ${name}`); }
      finally { await context.close(); }
    }
    const open = async (page, view = '2d') => {
      await page.goto(`${url}${url.includes('?') ? '&' : '?'}view=${view}`, { waitUntil: 'domcontentloaded' });
      await page.locator(`#universe[data-ready="true"][data-renderer="${view === '3d' ? '3d' : '2d'}-ready"]`).waitFor({ timeout: 20000 });
      await page.locator('.cosmic-scene').scrollIntoViewIfNeeded();
    };
    const action = (page, body) => page.evaluate(body);
    await check('idle SVG is demand-driven; speed changes geometry, optics and clocks', async page => {
      await open(page); await page.waitForTimeout(1100);
      await page.evaluate(() => {
        window.__rafCalls = 0; window.__idleMutations = 0;
        new MutationObserver(records => window.__idleMutations += records.length).observe(document.querySelector('.cosmic-scene'), { subtree: true, attributes: true, childList: true });
      });
      await page.waitForTimeout(700);
      assert.deepEqual(await page.evaluate(() => [window.__rafCalls, window.__idleMutations]), [0, 0]);
      assert.equal(await page.locator('#render-quality').inputValue(), 'eco');
      assert.equal(await page.locator('#destination>option').count(), 40);
      for (const id of ['europa','titan','pluto','sirius','betelgeuse','crab-pulsar','cygnus-x1','eta-carinae','tarantula','m33','m87','centaurus-a']) assert.equal(await page.locator(`#go-${id}`).count(), 1);
      await action(page, () => {
        const destination = document.getElementById('destination'); destination.value = 'moon'; destination.dispatchEvent(new Event('change'));
        const speed = document.getElementById('speed'); speed.value = '200'; speed.dispatchEvent(new Event('input'));
        document.getElementById('depart').click();
      });
      await page.waitForFunction(() => document.querySelector('#progress').value > .25);
      await action(page, () => document.getElementById('pause').click());
      const before = await page.locator('.cosmic-scene>svg').getAttribute('data-camera-au');
      const optics = await page.locator('#flight-sr').textContent();
      const transform = await page.locator('[data-route-body="moon"]').getAttribute('transform');
      assert.ok(parseFloat(await page.locator('#flight-gamma').textContent()) > 1);
      await action(page, () => { const speed = document.getElementById('speed'); speed.value = '900'; speed.dispatchEvent(new Event('input')); });
      assert.equal(await page.locator('.cosmic-scene>svg').getAttribute('data-camera-au'), before);
      assert.notEqual(await page.locator('#flight-sr').textContent(), optics);
      await page.waitForFunction(transform => document.querySelector('[data-route-body="moon"]').getAttribute('transform') !== transform, transform);
      assert.ok(parseFloat(await page.locator('#flight-gamma').textContent()) > 2);
      await action(page, () => { const speed = document.getElementById('speed'); speed.value = '0'; speed.dispatchEvent(new Event('input')); document.getElementById('pause').click(); });
      const stopped = await page.locator('#progress').getAttribute('value');
      await page.waitForTimeout(350); assert.equal(await page.locator('#progress').getAttribute('value'), stopped);
      assert.match(await page.locator('#flight-stationary').textContent(), /zero/);
      assert.doesNotMatch(await page.locator('.flight-instruments').textContent(), /Infinity|NaN|undefined/);
      await action(page, () => { const speed = document.getElementById('speed'); speed.value = '999'; speed.dispatchEvent(new Event('input')); });
      await page.locator('[data-choice]').first().waitFor({ timeout: 12000 });
      assert.notEqual(await page.locator('#flight-observer').textContent(), '0 s');
      assert.notEqual(await page.locator('#flight-traveler').textContent(), await page.locator('#flight-observer').textContent());
    });
    await check('mobile GPU budget scales pixels and has no idle loop', async page => {
      await open(page, '3d'); await page.waitForTimeout(1100);
      const pixels = () => page.evaluate(() => { const canvas = document.querySelector('.cosmic-scene>canvas'); return [canvas.width, canvas.clientWidth]; });
      const eco = await pixels(); assert.ok(Math.abs(eco[0] - eco[1]) <= 1);
      await page.evaluate(() => { window.__rafCalls = 0; }); await page.waitForTimeout(600);
      assert.equal(await page.evaluate(() => window.__rafCalls), 0);
      await page.locator('#render-quality').selectOption('high');
      await page.locator('#universe[data-renderer="3d-ready"]').waitFor();
      const high = await pixels(); assert.ok(Math.abs(high[0] / high[1] - 1.5) < .01);
      await page.locator('#render-quality').selectOption('eco');
      await page.locator('#universe[data-renderer="3d-ready"]').waitFor();
      assert.ok(Math.abs((await pixels())[0] - (await pixels())[1]) <= 1);
    });
    await check('motion is opt-in, bounded, recenterable and never changes astronomical position', async page => {
      await open(page);
      assert.equal(await page.evaluate(() => window.__sensorRequests), 0);
      await page.locator('#motion-mode').selectOption('inspect');
      await action(page, () => document.getElementById('motion-enable').click());
      await page.waitForFunction(() => document.querySelector('#motion-status').dataset.status === 'waiting');
      const position = await page.locator('#navigation-map').getAttribute('data-camera-au');
      const view = await page.locator('.cosmic-scene>svg').getAttribute('viewBox');
      for (const values of [{ alpha: 0, beta: 0, gamma: 0 }, { alpha: 30, beta: 20, gamma: 10 }]) await page.evaluate(values => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', values)), values);
      await page.waitForFunction(() => document.querySelector('#motion-status').dataset.status === 'active');
      await page.waitForFunction(view => document.querySelector('.cosmic-scene>svg').getAttribute('viewBox') !== view, view);
      assert.equal(await page.locator('#navigation-map').getAttribute('data-camera-au'), position);
      assert.equal(await page.locator('.cosmic-scene>svg').getAttribute('data-camera-au'), position);
      await action(page, () => document.getElementById('motion-recenter').click());
      await page.waitForFunction(view => document.querySelector('.cosmic-scene>svg').getAttribute('viewBox') === view, view);
      await action(page, () => document.getElementById('motion-enable').click());
      assert.equal(await page.locator('#motion-status').getAttribute('data-status'), 'idle');
      const requests = await page.evaluate(() => window.__sensorRequests); assert.ok(requests > 0);
      await action(page, () => document.getElementById('motion-enable').click());
      await page.waitForFunction(() => document.querySelector('#motion-status').dataset.status === 'waiting');
      assert.equal(await page.evaluate(() => window.__sensorRequests), requests);
      await action(page, () => document.getElementById('motion-enable').click());
    }, true);
    await check('denied permission leaves pointer navigation available', async page => {
      await open(page); await page.evaluate(() => { window.__sensorPermission = 'denied'; });
      await action(page, () => document.getElementById('motion-enable').click());
      await page.waitForFunction(() => document.querySelector('#motion-status').dataset.status === 'denied');
      await action(page, () => document.getElementById('zoom-in').click());
      assert.notEqual(await page.locator('.cosmic-scene>svg').getAttribute('viewBox'), '0 0 1000 620');
    }, true);
    await check('missing sensor readings time out without changing the scene', async page => {
      await open(page); const view = await page.locator('.cosmic-scene>svg').getAttribute('viewBox');
      await action(page, () => document.getElementById('motion-enable').click());
      await page.waitForFunction(() => document.querySelector('#motion-status').dataset.status === 'no-events', null, { timeout: 15000 });
      assert.equal(await page.locator('.cosmic-scene>svg').getAttribute('viewBox'), view);
      assert.equal(await page.locator('#motion-recenter').isDisabled(), true);
    }, true);
    console.log('Production instruments, power budgets and mocked sensor integration passed; this does not measure watts or certify physical sensors.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.httpServer.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
