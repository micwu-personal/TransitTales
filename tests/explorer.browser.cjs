// Build first, then run this script with Playwright and Chromium/WebKit installed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, webkit, devices } = require('playwright');

(async () => {
  const { preview } = await import('vite');
  const base = fs.readFileSync('dist/explorer.html', 'utf8').match(/src="([^\"]*)assets\//)?.[1] ?? '/';
  const server = await preview({ configFile: false, base, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  const url = `http://127.0.0.1:${server.httpServer.address().port}${base}`;
  try {
    for (const [engine, profile] of [[chromium, { viewport: { width: 1350, height: 840 } }], [webkit, devices['iPad Mini']], [webkit, devices['iPhone 13']]]) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ ...profile, reducedMotion: profile.isMobile ? 'reduce' : 'no-preference' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
          window.framesDrawn = 0;
          const raf = window.requestAnimationFrame;
          window.requestAnimationFrame = cb => raf.call(window, time => { window.framesDrawn++; cb(time); });
          const Sensor = class extends Event {
            constructor(type, values = {}) { super(type); Object.assign(this, values); }
            static requestPermission() { return Promise.resolve('granted'); }
          };
          window.DeviceOrientationEvent = Sensor;
          window.DeviceMotionEvent = Sensor;
        });
        await page.goto(`${url}index.html`);
        const entry = page.locator('#play-explorer');
        assert.match(await entry.getAttribute('href'), /explorer\.html/);
        await entry.click();
        const root = page.locator('#explorer');
        const click = (id) => page.locator(`#${id}`).click();
        const mode = (value) => page.waitForFunction(v => document.querySelector('#explorer').dataset.mode === v, value);
        await mode('earth');
        await page.locator('#notice').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('#place').textContent(), 'Earth');
        const dimensions = await page.evaluate(() => ({ width: document.body.scrollWidth, window: innerWidth, canvas: document.querySelector('canvas').width }));
        assert.equal(dimensions.width, dimensions.window);
        assert.ok(dimensions.canvas >= dimensions.width);
        if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.name || profile.viewport.width}-earth.png` });
        const frameCount = await page.evaluate(() => window.framesDrawn);
        await page.waitForTimeout(280);
        assert.ok((await page.evaluate(() => window.framesDrawn)) - frameCount < 4, 'idle sky must not animate continuously');
        const compass = () => page.locator('#compass').textContent();
        const origin = await compass();
        await click('right');
        await page.waitForFunction(initial => document.querySelector('#compass').textContent !== initial, origin);
        await page.locator('#sky').focus();
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.up('ArrowUp');
        const beforeDrag = await compass();
        const canvas = await page.locator('#sky').boundingBox();
        await page.mouse.move(canvas.width * .5, canvas.height * .3);
        await page.mouse.down(); await page.mouse.move(canvas.width * .64, canvas.height * .34, { steps: 6 }); await page.mouse.up();
        await page.waitForFunction(initial => document.querySelector('#compass').textContent !== initial, beforeDrag);
        await click('open-settings');
        await click('city');
        assert.equal(await page.locator('#visibility').inputValue(), '2.75');
        await click('noon');
        assert.match(await page.locator('#readout').textContent(), /22:00 UTC/);
        await click('find-sun');
        await page.locator('#settings').waitFor({ state: 'hidden' });
        await click('open-settings'); await click('midnight'); await click('clear');
        await click('motion');
        await page.waitForFunction(() => document.querySelector('#motion-status').textContent.includes('Waiting'));
        await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 45, gamma: 0 })));
        assert.match(await page.locator('#motion-status').textContent(), /is on/);
        await click('motion');
        await click('open-shapes');
        assert.equal(await page.locator('#shape option').count(), 88);
        await click('toggle-lines');
        assert.equal(await page.locator('#toggle-lines').getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('#depth').textContent(), /ly/);
        await click('tour'); await mode('tour');
        if (!profile.isMobile) await page.waitForTimeout(2500);
        if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.name || profile.viewport.width}-tour.png` });
        assert.equal(await page.locator('#open-shapes').isVisible(), false);
        await click('leave-tour'); await mode('earth');
        await click('open-travel');
        await click('launch');
        if (!profile.isMobile) await mode('flight');
        await mode('space');
        assert.notEqual(await root.getAttribute('data-place'), 'earth');
        await click('open-travel'); await page.locator('#destination').selectOption('earth'); await click('start'); await mode('earth');
        await click('language');
        assert.equal(await page.locator('#place').textContent(), '地球');
        assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
        assert.deepEqual(errors, []);
        console.log(`${engine.name()} ${profile.viewport.width}×${profile.viewport.height}: passed`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.httpServer.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
