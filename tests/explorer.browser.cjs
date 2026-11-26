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
    for (const [engine, profile, reducedMotion = false] of [[chromium, { viewport: { width: 1350, height: 840 } }], [webkit, devices['iPad Mini']], [webkit, devices['iPhone 13'], true]]) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ ...profile, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(simulateSlowDraws => {
          window.framesDrawn = 0;
          window.skyLabels = [];
          let slowDraws = simulateSlowDraws ? 3 : 0;
          const ctx = CanvasRenderingContext2D.prototype;
          const transform = ctx.setTransform, fillText = ctx.fillText;
          ctx.setTransform = function (...args) {
            if (this.canvas.id === 'sky') {
              window.skyLabels = [];
              if (window.slowEffects || (slowDraws && document.querySelector('#notice')?.hidden)) {
                if (slowDraws) slowDraws--;
                const until = performance.now() + 27;
                while (performance.now() < until) { /* Simulate a slow draw. */ }
              }
            }
            return transform.apply(this, args);
          };
          ctx.fillText = function (text, x, y, ...args) {
            if (this.canvas.id === 'sky') window.skyLabels.push({ text, x, y, w: this.measureText(text).width, credit: this.font.startsWith('11px') });
            return fillText.call(this, text, x, y, ...args);
          };
          const raf = window.requestAnimationFrame;
          window.requestAnimationFrame = cb => raf.call(window, time => { window.framesDrawn++; cb(time); });
          const Sensor = class extends Event {
            constructor(type, values = {}) { super(type); Object.assign(this, values); }
            static requestPermission() { return Promise.resolve('granted'); }
          };
          window.DeviceOrientationEvent = Sensor;
          window.DeviceMotionEvent = Sensor;
        }, engine === chromium);
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
        if (engine === chromium) {
          await page.locator('#frame-hint').waitFor({ state: 'visible' });
          await click('open-settings');
          assert.equal(await page.locator('#camera-motion').inputValue(), 'full', 'the hint must not change the setting');
          await click('open-settings');
          await click('dismiss-frame-hint');
        }
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
        assert.equal(await page.locator('#camera-motion').inputValue(), 'full');
        if (reducedMotion) await page.locator('#camera-motion').selectOption('gentle');
        await click('city');
        assert.equal(await page.locator('#visibility').inputValue(), '2.75');
        await click('noon');
        assert.match(await page.locator('#readout').textContent(), /22:21 UTC/);
        await click('find-sun');
        await page.locator('#settings').waitFor({ state: 'hidden' });
        await page.waitForFunction(() => {
          const sky = document.querySelector('#sky');
          const box = sky.getBoundingClientRect();
          const sun = window.skyLabels.find(label => label.text === 'Sun');
          return sun && Math.abs(sun.y - box.height / 2) < 2 && Math.abs(sun.x - 12 - box.width / 2) < 3;
        });
        const sunBox = await page.locator('#sky').boundingBox();
        const x = sunBox.x + sunBox.width / 2, y = sunBox.y + sunBox.height / 2;
        assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [x, y]), 'sky');
        if (profile.isMobile) await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
        await page.locator('#object-launch').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#object-name').textContent(), 'Sun');
        if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.viewport.width}-object.png` });
        await click('object-launch');
        await mode('space');
        assert.equal(await root.getAttribute('data-place'), 'sun');
        await click('open-travel'); await page.locator('#destination').selectOption('earth'); await click('start');
        await mode('earth');
        await click('open-settings'); await click('midnight'); await click('clear');
        await click('motion');
        await page.waitForFunction(() => document.querySelector('#motion-status').textContent.includes('Waiting'));
        await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 45, gamma: 0 })));
        assert.match(await page.locator('#motion-status').textContent(), /is on/);
        await click('motion');
        const names = page.locator('#star-names');
        const labels = () => page.evaluate(() => window.skyLabels);
        await names.press('Home');
        assert.equal(await names.getAttribute('aria-valuetext'), 'Off');
        await page.waitForTimeout(120);
        const off = await labels();
        await names.press('End');
        assert.equal(await names.getAttribute('aria-valuetext'), 'Dense');
        await page.waitForFunction(count => window.skyLabels.length > count, off.length);
        const dense = await labels();
        for (const [i, a] of dense.entries()) for (const b of dense.slice(i + 1)) {
          if (a.credit && b.credit) continue;
          assert.ok(Math.abs(a.y - b.y) >= 18 || a.x + a.w + 7 <= b.x || b.x + b.w + 7 <= a.x, `${a.text} overlaps ${b.text}`);
        }
        if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.viewport.width}-labels.png` });
        await click('open-shapes');
        assert.equal(await page.locator('#shape option').count(), 88);
        await click('toggle-lines');
        assert.equal(await page.locator('#toggle-lines').getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('#depth').textContent(), /ly/);
        await page.locator('#settings').waitFor({ state: 'hidden' });
        const earthBearing = await compass();
        const passage = (value) => page.waitForFunction(v => document.querySelector('#explorer').dataset.passage === v, value);
        const verifyMovingSky = async (state, value) => {
          const frames = await page.evaluate(async ([state, value]) => {
            const sky = document.querySelector('#sky');
            const sample = document.createElement('canvas');
            sample.width = 96; sample.height = 64;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            const frames = new Set();
            for (let i = 0; i < 5; i++) {
              if (document.querySelector('#explorer').dataset[state] !== value) break;
              ctx.drawImage(sky, 0, 0, 96, 64);
              frames.add(ctx.getImageData(0, 0, 96, 64).data.join(','));
              await new Promise(resolve => setTimeout(resolve, 120));
            }
            return frames.size;
          }, [state, value]);
          assert.ok(frames >= 3, `${value}: expected visibly different intermediate sky frames, got ${frames}`);
        };
        const verifyDissolve = async () => {
          await page.waitForFunction(() => {
            const overlay = document.querySelector('.sky-dissolve');
            return overlay && +getComputedStyle(overlay).opacity > 0 && +getComputedStyle(overlay).opacity < .95;
          });
          await page.locator('.sky-dissolve').waitFor({ state: 'detached' });
        };
        await click('tour'); await mode('tour');
        if (!reducedMotion) {
          await passage('entering');
          await verifyMovingSky('passage', 'entering');
          await page.waitForTimeout(550);
          if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.viewport.width}-ascent.png` });
        } else await verifyDissolve();
        await passage('');
        if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.viewport.width}-tour.png` });
        assert.equal(await page.locator('#shapes').isVisible(), true);
        assert.equal(await page.locator('#tour').isEnabled(), false);
        const tourZoom = await compass();
        await page.locator('#sky').focus();
        await page.keyboard.press('+');
        await page.waitForFunction(initial => document.querySelector('#compass').textContent !== initial, tourZoom);
        await click('leave-tour');
        if (!reducedMotion) {
          await passage('returning'); await verifyMovingSky('passage', 'returning');
        } else await verifyDissolve();
        await mode('earth');
        await page.waitForFunction(bearing => document.querySelector('#compass').textContent === bearing, earthBearing);
        assert.equal(await page.locator('#shapes').isVisible(), true);
        if (!profile.isMobile) {
          await click('tour'); await passage('entering');
          await page.waitForTimeout(450);
          await page.keyboard.press('Escape'); await passage('returning'); await mode('earth');
          assert.equal(await compass(), earthBearing);
        }
        await click('open-travel');
        await page.locator('#destination').selectOption('hip-70890');
        await click('launch');
        if (!reducedMotion) {
          await mode('flight'); await verifyMovingSky('mode', 'flight');
          await page.waitForFunction(() => document.querySelector('#travel-progress').value > .42);
          if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.viewport.width}-flight.png` });
        } else await verifyDissolve();
        await mode('space');
        assert.notEqual(await root.getAttribute('data-place'), 'earth');
        let survey = false;
        for (const id of ['m1', 'm42', 'm45', 'm31']) {
          await click('open-travel'); await page.locator('#destination').selectOption(id); await click('start');
          await page.waitForFunction(id => document.querySelector('#sky').dataset.observedPlates?.split(' ').includes(id), id);
          assert.equal(await root.getAttribute('data-place'), id);
          survey ||= (await page.locator('#sky').getAttribute('data-observed-plates')).includes('milky-way');
          if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.viewport.width}-${id}.png` });
        }
        assert.ok(survey, 'the Galactic survey should be visible from at least one nearby arrival');
        const arrive = async id => {
          await click('open-travel'); await page.locator('#destination').selectOption(id); await click('start');
          await page.waitForFunction(value => document.querySelector('#explorer').dataset.place === value, id);
        };
        await arrive('sgr-a');
        assert.match(await page.locator('#fact-text').textContent(), /4 million solar masses/);
        const effectsFrames = await page.evaluate(() => window.framesDrawn);
        if (reducedMotion) {
          await page.waitForTimeout(270);
          const delta = await page.evaluate(before => window.framesDrawn - before, effectsFrames);
          assert.ok(delta < 4, `unexpected animation frame count with reduced motion: ${delta}`);
        } else {
          await page.waitForFunction(before => window.framesDrawn - before >= 4, effectsFrames, { timeout: 5000 });
        }
        if (engine === chromium) {
          await page.evaluate(() => { window.slowEffects = true; });
          await page.locator('#use-still').waitFor({ state: 'visible' });
          await page.evaluate(() => { window.slowEffects = false; });
          await click('use-still');
        }
        await click('open-settings');
        if (engine !== chromium) await click('effects-toggle');
        assert.equal(await page.locator('#effects-toggle').getAttribute('aria-pressed'), 'false');
        await click('open-settings');
        await arrive('voyager-2');
        assert.match(await page.locator('#fact-text').textContent(), /Uranus and Neptune/);
        await click('look-earth');
        await arrive('voyager-1');
        await click('pale-blue-dot');
        await page.waitForFunction(() => document.querySelector('#explorer').dataset.place === 'pale-blue-dot');
        assert.match(await page.locator('#readout').textContent(), /1990-02-14 04:48 UTC/);
        assert.match(await page.locator('#prompt').textContent(), /Not the original photograph/);
        await page.waitForFunction(() => window.skyLabels.some(label => label.text === 'Earth'));
        if (process.env.EXPLORER_SCREENSHOTS) await page.screenshot({ path: `${process.env.EXPLORER_SCREENSHOTS}/${profile.viewport.width}-pale-blue.png` });
        await arrive('earth'); await mode('earth');
        await click('open-settings');
        await page.locator('#site-select').selectOption('beijing');
        assert.match(await page.locator('#readout').textContent(), /Beijing/);
        await page.locator('#site-select').selectOption('custom');
        await page.locator('#site-lat').fill('-33.86'); await page.locator('#site-lon').fill('151.21');
        await page.locator('#site-form button[type=submit]').click();
        assert.match(await page.locator('#readout').textContent(), /-33.86°, 151.21°/);
        if (engine === chromium) {
          await page.evaluate(() => Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
            configurable: true, value: (_ok, fail) => fail({ code: 1 }),
          }));
          await click('device-site');
          assert.match(await page.locator('#site-status').textContent(), /unavailable/);
          assert.match(await page.locator('#readout').textContent(), /-33.86°, 151.21°/);
          await page.evaluate(() => Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
            configurable: true, value: ok => ok({ coords: { latitude: 42, longitude: 72 } }),
          }));
          await click('device-site');
          assert.match(await page.locator('#readout').textContent(), /42°, 72°/);
          await page.route('**/explorer/stars.json', route => route.abort());
        }
        await click('open-settings');
        await click('language');
        assert.equal(await page.locator('#place').textContent(), '地球');
        assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
        await page.reload(); await mode('earth');
        await page.locator('#notice').waitFor({ state: 'hidden' });
        await click('open-settings');
        assert.equal(await names.inputValue(), '3');
        assert.equal(await names.getAttribute('aria-valuetext'), '密集');
        assert.deepEqual(errors, []);
        console.log(`${engine.name()} ${profile.viewport.width}×${profile.viewport.height}: passed`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.httpServer.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
