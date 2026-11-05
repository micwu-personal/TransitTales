// Run npm run build first, then node tests\universe-ipad.browser.cjs (Playwright WebKit required).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webkit, devices } = require('playwright');

(async () => {
  let server, browser;
  try {
    let url = process.env.UNIVERSE_IPAD_URL;
    if (!url) {
      const html = fs.readFileSync(path.join(process.cwd(), 'dist', 'universe.html'), 'utf8');
      const base = html.match(/src="([^"]*)assets\//)?.[1] ?? '/';
      const { preview } = await import('vite');
      server = await preview({ configFile: false, base, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
      url = `http://127.0.0.1:${server.httpServer.address().port}${base}universe.html`;
    }
    browser = await webkit.launch({ headless: true });
    const address = query => `${url}${url.includes('?') ? '&' : '?'}${query}`;
    const ready = page => page.locator('#universe[data-ready="true"]').waitFor({ state: 'visible', timeout: 20000 });
    const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
    async function check(name, setup, run, options = devices['iPad Pro 11']) {
      if (process.env.UNIVERSE_IPAD_CHECK && !new RegExp(process.env.UNIVERSE_IPAD_CHECK, 'i').test(name)) return;
      const context = await browser.newContext({ ...options, locale: 'zh-CN' });
      const page = await context.newPage(), errors = [], failedRequests = [];
      page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && message.text().includes('Universe Journey could not start')) console.error(message.text()); });
      try {
        if (setup) await setup(page, context);
        await run(page, context);
        assert.deepEqual(errors, [], `${name}: unexpected script errors`);
        console.log(`PASS ${name}`);
      } catch (error) {
        console.error(`${name}: ${JSON.stringify(errors)}; failed requests: ${JSON.stringify(failedRequests)}; startup: ${await page.locator('#startup-status').textContent().catch(() => '')}`);
        throw error;
      } finally { await context.close(); }
    }
    const artifactDirectory = process.env.UNIVERSE_IPAD_ARTIFACTS;
    if (artifactDirectory) fs.mkdirSync(artifactDirectory, { recursive: true });
    for (const [name, options] of [
      ['desktop', { viewport: { width: 1440, height: 1100 } }],
      ['iPad portrait', devices['iPad Pro 11']],
      ['iPad landscape', { ...devices['iPad Pro 11'], viewport: { width: 1194, height: 834 } }],
      ['phone', devices['iPhone 13']],
    ]) {
      await check(`${name}: production layout and touch controls`, null, async page => {
        await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
        await page.locator(`#universe[data-renderer="${options.hasTouch ? '2d' : '3d'}-ready"]`).waitFor({ timeout: 15000 });
        if (options.hasTouch) {
          assert.equal(await page.locator('.cosmic-scene>canvas').count(), 0);
          assert.equal(await page.locator('.cosmic-scene>svg filter').count(), 0);
          assert.equal(await page.locator('#universe').getAttribute('data-safe-startup'), 'true');
        }
        assert.equal(await page.locator('#universe-startup').isVisible(), false);
        assert.equal(await page.locator('#map-scope>option').count(), 9);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (artifactDirectory) await page.screenshot({ path: path.join(artifactDirectory, `${name.replace(/ /g, '-')}.png`) });
        await page.locator('#destination').selectOption('moon');
        assert.equal(await page.locator('#navigation-title').textContent(), '月球');
        await page.locator('#depart')[options.hasTouch ? 'tap' : 'click']();
        await page.locator('#pause')[options.hasTouch ? 'tap' : 'click']();
        assert.equal(await page.locator('#pause').textContent(), '继续');
      }, options);
    }
    for (const [name, userAgent] of [
      ['iPadOS 26.6', 'Mozilla/5.0 (iPad; CPU OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1'],
      ['iPad desktop-site mode', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Safari/605.1.15'],
    ]) {
      await check(`${name}: safe Sun refresh, all destinations and zero idle rendering`, async (_page, context) => {
        await context.addInitScript(() => {
          window.__gpuContexts = 0; window.__appFrames = 0;
          const getContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
            if (/webgl/i.test(kind)) window.__gpuContexts++;
            return getContext.call(this, kind, ...args);
          };
          const raf = window.requestAnimationFrame;
          window.requestAnimationFrame = callback => { window.__appFrames++; return raf(callback); };
          if (!localStorage.getItem('universe-journey-v1')) localStorage.setItem('universe-journey-v1', JSON.stringify({ version: 1, state: {
            destinationId: 'sun', epochId: 'present', departureDestinationId: 'earth', departureEpochId: 'present', beta: .65,
            phase: 'encounter', progress: 1, paused: false, shield: 100, energy: 86, research: 0, friendship: 0,
            visited: ['sun'], completed: [], choiceId: null, outcome: null, elapsed: 7, properElapsed: 5.32,
          } }));
        });
      }, async page => {
        const optionalRequests = [];
        page.on('request', request => { if (/renderer3d[-.]/.test(request.url())) optionalRequests.push(request.url()); });
        await page.goto(address('view=3d'), { waitUntil: 'domcontentloaded' });
        for (let refresh = 0; refresh < 3; refresh++) {
          if (refresh) await page.reload({ waitUntil: 'domcontentloaded' });
          await ready(page);
          assert.equal(await page.locator('#universe').getAttribute('data-renderer'), '2d-ready');
          assert.equal(await page.locator('#navigation-title').textContent(), '太阳');
          assert.equal(await page.locator('.cosmic-scene>svg').getAttribute('data-render-budget'), 'safe');
          assert.equal(await page.locator('.cosmic-scene>svg filter').count(), 0);
          assert.ok(await page.locator('.cosmic-scene>svg *').count() < 1500);
          assert.equal(await page.evaluate(() => window.__gpuContexts), 0);
        }
        if (artifactDirectory) await page.locator('.window').screenshot({ path: path.join(artifactDirectory, `${name.replace(/ /g, '-')}-sun.png`) });
        assert.deepEqual(optionalRequests, [], 'No optional GPU module loads on touch-device startup, even with a 3D URL');
        assert.equal(await page.locator('.atlas-list').isVisible(), false);
        const options = await page.locator('#destination option').evaluateAll(nodes => nodes.map(node => ({ id: node.value, label: node.textContent })));
        assert.equal(options.length, 40);
        for (const option of options) {
          await page.locator('#destination').selectOption(option.id);
          assert.equal(await page.locator('#navigation-title').textContent(), option.label);
        }
        await page.locator('#destination').selectOption('sun');
        await page.locator('.cosmic-scene').scrollIntoViewIfNeeded(); await page.waitForTimeout(1100);
        await page.evaluate(() => {
          window.__appFrames = 0; window.__sceneWrites = 0;
          const observer = new MutationObserver(records => window.__sceneWrites += records.length);
          for (const node of document.querySelectorAll('.cosmic-scene, #navigation-map')) observer.observe(node, { subtree: true, childList: true, attributes: true });
        });
        await page.waitForTimeout(800);
        assert.deepEqual(await page.evaluate(() => [window.__appFrames, window.__sceneWrites]), [0, 0], 'Eco Sun stops drawing once its map settles');
        await page.locator('#destination').selectOption('moon'); await page.locator('#depart').tap();
        await page.waitForFunction(() => document.querySelector('#progress').value > .15);
        await page.locator('#pause').tap();
        await page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem('universe-journey-v1')); saved.state.paused = false;
          localStorage.setItem('universe-journey-v1', JSON.stringify(saved));
        });
        await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
        assert.equal(await page.locator('#pause').textContent(), '继续', 'Saved travel always reloads paused');
        assert.ok(Number(await page.locator('#progress').getAttribute('value')) > .15);
        await page.locator('#pause').tap();
        await page.waitForFunction(() => document.querySelector('#progress').value > .3);
      }, { ...devices['iPad Pro 11'], userAgent });
    }
    await check('older Safari APIs: startup, flight, map, pause and saved language', async (_page, context) => {
      await context.addInitScript(() => {
        Element.prototype.replaceChildren = undefined;
        String.prototype.replaceAll = undefined;
        Object.hasOwn = undefined;
        const match = window.matchMedia;
        window.matchMedia = function (query) {
          const result = match.call(window, query);
          result.addEventListener = undefined; result.removeEventListener = undefined;
          return result;
        };
        localStorage.setItem('transit-tales-language', 'zh-CN');
      });
    }, async page => {
      await page.goto(address('view=2d'), { waitUntil: 'domcontentloaded' }); await ready(page);
      assert.equal(await page.locator('#language').inputValue(), 'zh-CN');
      await page.locator('#destination').selectOption('saturn'); await page.locator('#depart').tap();
      const before = await page.locator('#navigation-map').getAttribute('data-camera-au');
      await page.waitForTimeout(400); assert.notEqual(await page.locator('#navigation-map').getAttribute('data-camera-au'), before);
      await page.locator('#pause').tap(); await page.waitForTimeout(100);
      const paused = await page.locator('#navigation-map').getAttribute('data-camera-au');
      await page.waitForTimeout(150); assert.equal(await page.locator('#navigation-map').getAttribute('data-camera-au'), paused);
      assert.equal(await page.locator('.cosmic-scene>svg').getAttribute('data-camera-au'), paused);
      await page.locator('#map-scope').selectOption('solar'); await page.waitForTimeout(750);
      assert.equal(await page.locator('#navigation-map').getAttribute('data-scope'), 'solar');
      await page.locator('#pause').tap();
      assert.equal(await page.locator('#pause').textContent(), '暂停');
      await page.locator('[data-choice]').first().waitFor({ timeout: 30000 });
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
      assert.equal(await page.locator('#navigation-title').textContent(), '土星');
      assert.equal(await page.locator('#language').inputValue(), 'zh-CN');
    });
    await check('blocked optional 3D: immediate interactive SVG fallback', async page => {
      await page.route('**/renderer3d-*.js', route => route.abort());
    }, async page => {
      await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
            await page.locator('#view3d').tap();
            await page.waitForFunction(() => document.querySelector('#view2d')?.getAttribute('aria-pressed') === 'true');
            assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
            await page.locator('#destination').selectOption('mars'); await page.locator('#depart').tap();
      assert.equal(await page.locator('#depart').isDisabled(), true);
    });
    await check('delayed optional 3D: preview upgrades without resetting selection', async page => {
      await page.route('**/renderer3d-*.js', async route => { await delay(1800); await route.continue(); });
    }, async page => {
      await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
            await page.locator('#view3d').tap();
            assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
            await page.locator('#destination').selectOption('moon');
            await page.locator('#universe[data-renderer="3d-ready"]').waitFor();
      assert.equal(await page.locator('#navigation-title').textContent(), '月球');
    });
    let releaseShaders;
    await check('delayed shaders: SVG survives journey and language rerenders until a genuine GPU frame', async page => {
      const held = new Promise(resolve => { releaseShaders = resolve; });
      await page.route(/\/(?:default|pbr)\.(?:vertex|fragment)-[^/]+\.js$/, async route => { await held; await route.continue(); });
    }, async page => {
      await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
            await page.locator('#view3d').tap();
            await page.locator('.cosmic-scene>canvas').waitFor({ state: 'attached' });
      assert.equal(await page.locator('#universe').getAttribute('data-renderer'), '3d-warming');
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
      await page.evaluate(() => {
        for (const [id, value] of [['destination', 'moon'], ['epoch', 'first']]) {
          const select = document.getElementById(id); select.value = value; select.dispatchEvent(new Event('change'));
        }
        document.getElementById('depart').click(); document.getElementById('pause').click();
        const language = document.getElementById('language'); language.value = 'ja'; language.dispatchEvent(new Event('change'));
      });
      assert.equal(await page.locator('.cosmic-scene>canvas').count(), 1);
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
      releaseShaders();
      await page.locator('#universe[data-renderer="3d-ready"]').waitFor({ timeout: 15000 });
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 0);
      assert.equal(await page.locator('#language').inputValue(), 'ja');
    });
    await check('blocked shaders: usable SVG and local diagnostics instead of a blank canvas', async page => {
      await page.route(/\/(?:default|pbr)\.(?:vertex|fragment)-[^/]+\.js$/, route => route.abort());
    }, async page => {
      await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
            await page.locator('#view3d').tap();
            await page.locator('#universe[data-renderer="2d-ready"]').waitFor({ timeout: 12000 });
      assert.equal(await page.locator('.cosmic-scene>canvas').count(), 0);
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
      await page.locator('#universe-diagnostics>summary').tap();
      assert.match(await page.locator('#universe-diagnostic-output').textContent(), /SVG: true; GPU: false/);
      await page.locator('#destination').selectOption('moon'); await page.locator('#depart').tap();
      assert.equal(await page.locator('#depart').isDisabled(), true);
    });
    await check('removed stylesheet: essential scene geometry still renders', null, async page => {
      await page.goto(address('view=2d'), { waitUntil: 'domcontentloaded' }); await ready(page);
      await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove()));
      const geometry = await page.locator('.cosmic-scene>svg').boundingBox();
      assert.ok(geometry && geometry.width > 100 && geometry.height >= 300);
      await page.locator('#destination').selectOption('moon'); assert.equal(await page.locator('#navigation-title').textContent(), '月球');
    });
    await check('3D timeout: late module cannot override the fallback', async page => {
      await page.route('**/renderer3d-*.js', async route => { await delay(10500); await route.continue(); });
    }, async page => {
      await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
            await page.locator('#view3d').tap();
            assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
            await page.waitForFunction(() => document.querySelector('#view2d')?.getAttribute('aria-pressed') === 'true', null, { timeout: 12000 });
      await page.waitForTimeout(3500);
      assert.equal(await page.locator('.cosmic-scene>canvas').count(), 0);
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
      await page.locator('#destination').selectOption('moon');
      assert.equal(await page.locator('#navigation-title').textContent(), '月球');
    });
    await check('manual 2D choice cancels an in-flight 3D upgrade', async page => {
      await page.route('**/renderer3d-*.js', async route => { await delay(1800); await route.continue(); });
    }, async page => {
      await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
            await page.locator('#view3d').tap();
            await page.locator('#view2d').tap(); await page.waitForTimeout(2500);
      assert.equal(await page.locator('.cosmic-scene>canvas').count(), 0);
      assert.equal(await page.locator('#view2d').getAttribute('aria-pressed'), 'true');
    });
    await check('WebGL unavailable: controls and SVG remain usable', async (_page, context) => {
      await context.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /webgl/i.test(type) ? null : getContext.call(this, type, ...args); };
      });
    }, async page => {
      await page.goto(address(''), { waitUntil: 'domcontentloaded' }); await ready(page);
            await page.locator('#view3d').tap();
            await page.waitForFunction(() => document.querySelector('#view2d')?.getAttribute('aria-pressed') === 'true');
            assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
            await page.locator('#destination').selectOption('moon');
      assert.equal(await page.locator('#navigation-title').textContent(), '月球');
    });
    await check('restricted storage and optional voice API do not block startup', async (_page, context) => {
      await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage is blocked'); } });
        Object.defineProperty(window, 'speechSynthesis', { value: { getVoices() { throw new Error('Voice catalogue unavailable'); }, cancel() {}, speak() {}, pause() {}, resume() {} } });
      });
    }, async page => {
      await page.goto(address('view=2d'), { waitUntil: 'domcontentloaded' }); await ready(page);
      await page.locator('#destination').selectOption('moon');
      assert.equal(await page.locator('#navigation-title').textContent(), '月球');
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
    });
    for (const recovery of ['retry', 'fresh']) await check(`failed entry module: bilingual recovery and working ${recovery}`, async page => {
      await page.route('**/universe-*.js', route => route.fulfill({ status: 503, contentType: 'text/plain', headers: { 'cache-control': 'no-store' }, body: 'Temporary network failure' }));
    }, async page => {
      await page.goto(address('view=2d'), { waitUntil: 'domcontentloaded' });
      await page.locator('#universe-startup[data-state="error"]').waitFor();
      assert.equal(await page.locator('#universe').isVisible(), false);
      assert.match(await page.locator('#startup-status').textContent(), /游戏未能启动/);
      assert.equal(await page.locator('#universe-startup a[href="index.html"]').isVisible(), true);
      await page.unroute('**/universe-*.js');
      if (recovery === 'retry') {
        await page.locator('#startup-retry').tap(); await ready(page);
        assert.ok(new URL(page.url()).searchParams.get('retry'));
      } else {
        const opened = page.context().waitForEvent('page');
        await page.locator('#startup-fresh').tap();
        const fresh = await opened, freshErrors = [];
        fresh.on('pageerror', error => freshErrors.push(error.message));
        await ready(fresh); assert.deepEqual(freshErrors, []);
        assert.equal(new URL(fresh.url()).searchParams.get('view'), '2d');
      }
    });
    await check('stalled main module: recovery stays readable and loading can resume', async page => {
      await page.route('**/universe-*.js', async route => { await delay(14000); await route.continue(); });
    }, async page => {
      await page.goto(address('view=2d'), { waitUntil: 'domcontentloaded' });
      await page.locator('#universe-startup[data-state="slow"]').waitFor({ timeout: 17000 });
      assert.match(await page.locator('#startup-status').textContent(), /加载时间较长/);
      await ready(page);
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
    });
    await check('failed entry stylesheet: readable recovery rather than an inert list', async page => {
      await page.route('**/universe-*.css', route => route.abort());
    }, async page => {
      await page.goto(address('view=2d'), { waitUntil: 'domcontentloaded' });
      await page.locator('#universe-startup[data-state="error"]').waitFor();
      assert.equal(await page.locator('#universe').isVisible(), false);
      assert.equal(await page.locator('#startup-retry').isVisible(), true);
      await page.unroute('**/universe-*.css');
      await page.locator('#startup-retry').tap(); await ready(page);
      assert.equal(await page.locator('.cosmic-scene>svg').count(), 1);
    });
    await check('stalled entry stylesheet: loading shell does not wait for external CSS', async page => {
      await page.route('**/universe-*.css', async route => { await delay(14000); await route.continue(); });
    }, async page => {
      await page.goto(address('view=2d'), { waitUntil: 'domcontentloaded' });
      await page.locator('#universe-startup[data-state="slow"]').waitFor({ timeout: 17000 });
      assert.equal(await page.locator('#startup-retry').isVisible(), true);
      assert.equal(await page.locator('#universe').isVisible(), false);
      await ready(page);
    });
    console.log('Production WebKit/iPad-emulation checks passed. Physical iPad and China-network review remain separate.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.httpServer.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
