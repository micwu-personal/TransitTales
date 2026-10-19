const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const flat = process.argv.includes('--2d');
const rounds = {
  'little-bay': ['first-shift', 'concert', 'connections', 'kite-day', 'ferry-fair'],
  'lantern-isles': ['island-welcome', 'lantern-parade', 'star-party', 'regatta', 'balloon-finale'],
};
const hot = ['market', 'stadium', 'central', 'north', 'harbor', 'market', 'central', 'museum', 'riverside', 'airport'];
const languages = ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'];
const durations = [180, 195, 210, 200, 225, 180, 200, 210, 215, 230];
const clockText = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await server.listen();
    const options = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
    try { browser = await chromium.launch(options); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ ...options, channel: 'msedge' }); }
    const viewports = process.env.RUSH_VIEWPORTS ? JSON.parse(process.env.RUSH_VIEWPORTS) : [[1440, 1000], [390, 844], [820, 1180]];
    for (const [width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1100 });
      page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.clear();
        window.__rushAudio = [];
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () { window.__rushAudio.push({ node: this, source: this.src }); return play.call(this); };
        const raf = requestAnimationFrame;
        window.requestAnimationFrame = callback => {
          if (callback.name === 'frame') window.__rushFrame = callback;
          return window.__rushStepping ? 0 : raf(callback);
        };
      });
      await page.goto(`${server.resolvedUrls.local[0]}rush-hour.html${flat ? '?view=2d' : ''}`);
      await page.waitForFunction(mode => document.querySelector(`#city-view-${mode}`)?.getAttribute('aria-pressed') === 'true' && document.querySelector('#city-map')?.getAttribute('aria-busy') === 'false', flat ? '2d' : '3d');
      const touch = width < 1100 ? await page.context().newCDPSession(page) : undefined;
      if (touch) await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      const openPanel = async () => { if (!await page.locator('#game-control-panel').isVisible()) await page.locator('#hud-toggle').click(); };
      const closePanel = async () => { if (await page.locator('#game-control-panel').isVisible()) await page.locator('#hud-close').click(); };
      const closeInterior = async () => { if (await page.locator('#interior').isVisible()) await page.locator('#interior-close').click(); };
      const selected = () => page.locator('#city-map [data-station][aria-pressed="true"]').getAttribute('data-station');
      const checkMap = async map => {
        assert.equal(await page.locator('#city-map > [data-map]').getAttribute('data-map'), map);
        assert.equal(await page.locator('#city-map [data-station]').count(), 10);
        if (flat) {
          assert.equal(await page.locator('#city-map canvas').count(), 0, '2D is a real SVG renderer');
          assert.equal(await page.locator('#map [data-island-bridge]').count() > 0, map === 'lantern-isles');
          assert.equal(await page.locator('#map [data-place]').count() > 0, map === 'lantern-isles');
        } else {
          const audit = await page.evaluate(async () => {
            const { Engine } = await import('/src/babylon.ts');
            const engine = Engine.Instances[0], scene = engine?.scenes[0];
            if (!scene) return { missing: true };
            let invalid = 0, trainTriangles = 0;
            for (const mesh of scene.meshes) {
              const vertices = mesh.getTotalVertices(), indices = mesh.getIndices();
              if (indices) {
                for (const index of indices) if (index < 0 || index >= vertices) invalid++;
                if (mesh.metadata?.train) trainTriangles += indices.length / 3;
              }
            }
            return { engines: Engine.Instances.length, roots: scene.transformNodes.filter(n => ['rush-coast', 'rush-lantern-isles'].includes(n.name)).map(n => n.name), places: scene.transformNodes.filter(n => n.name.startsWith('rush-place-')).length, invalid, trainTriangles, webgl: engine.getRenderingCanvas().getContext('webgl2') !== null };
          });
          assert.equal(audit.engines, 1); assert.equal(audit.webgl, true);
          assert.deepEqual(audit.roots, [map === 'lantern-isles' ? 'rush-lantern-isles' : 'rush-coast']);
          assert.equal(audit.places, map === 'lantern-isles' ? 9 : 0);
          assert.equal(audit.invalid, 0); assert.ok(audit.trainTriangles > 0, 'batched trains have actual valid triangles');
        }
      };
      const reachable = async selector => {
        const node = page.locator(selector); await node.scrollIntoViewIfNeeded();
        assert.ok(await node.evaluate(button => {
          const r = button.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return r.width >= 43 && r.height >= 43 && r.top >= 0 && r.bottom <= innerHeight + 1 && button.contains(hit);
        }), `${width}: ${selector} is a reachable 44px target`);
      };
      await openPanel();
      assert.equal(await page.locator('#rush-map option').count(), 2);
      for (const language of width === 820 ? ['en'] : languages) {
        await closeInterior(); await openPanel();
        await page.locator('#language').selectOption(language);
        assert.equal(await page.locator('html').getAttribute('lang'), language);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1), `${language}/${width}: no document overflow`);
        for (const [map, ids] of Object.entries(rounds)) {
          await page.locator('#rush-map').selectOption(map);
          assert.equal(await page.locator('#scenario option').count(), 5);
          assert.deepEqual(await page.locator('#scenario option').evaluateAll(nodes => nodes.map(n => n.value)), ids);
          for (let i = 0; i < ids.length; i++) {
            await page.locator('#scenario').selectOption(ids[i]);
            assert.equal(await page.locator('#clock').textContent(), clockText(durations[Object.keys(rounds).indexOf(map) * 5 + i]));
            assert.equal(await selected(), hot[Object.keys(rounds).indexOf(map) * 5 + i]);
            assert.equal(await page.locator('#interior').isVisible(), false, 'round reset closes reused-ID inspectors');
            assert.equal(await page.locator('#result').isVisible(), false);
            assert.ok((await page.locator('#station-place').textContent()).trim());
            assert.ok((await page.locator('#event-copy').textContent()).trim());
            assert.ok((await page.locator('#round-label').textContent()).endsWith(`${i + 1}/5`));
          }
          for (const selector of ['#rush-map', '#scenario', '#event-next']) await reachable(selector);
          await checkMap(map);
          if (process.env.RUSH_SCREENSHOT_PREFIX && language === 'en') {
            if (width < 1100) await closePanel();
            await page.waitForTimeout(200);
            await page.screenshot({ path: `${process.env.RUSH_SCREENSHOT_PREFIX}-${map}-${flat ? '2d' : '3d'}-${width}.png` });
            await openPanel();
          }
          await page.locator('#event-next').click();
          assert.equal(await page.locator('#interior').isVisible(), true, 'event forecast visits its canonical station');
          assert.equal(await selected(), map === 'lantern-isles' ? 'airport' : 'harbor');
          const canonical = await page.locator('#station-name').textContent();
          assert.ok((await page.locator('#interior-title').textContent()).includes(canonical));
          await closeInterior();
        }
      }
      await page.locator('#language').selectOption('en');
      await page.locator('#rush-map').selectOption('lantern-isles');
      await page.locator('#scenario').selectOption('lantern-parade');
      await closePanel();
      if (!flat) {
        const labels = page.locator('.rush-3d-labels');
        await labels.evaluate(node => { node.style.visibility = 'hidden'; });
        const point = await page.evaluate(async () => {
          const { Engine, Vector3 } = await import('/src/babylon.ts');
          const { Matrix } = await import('/node_modules/@babylonjs/core/Maths/math.vector.js');
          const engine = Engine.Instances[0], scene = engine.scenes[0], canvas = engine.getRenderingCanvas(), camera = scene.activeCamera;
          const bounds = canvas.getBoundingClientRect(), viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          for (const mesh of scene.meshes.filter(n => n.metadata?.station && n.metadata.station !== 'central')) {
            mesh.computeWorldMatrix(true);
            const p = Vector3.Project(mesh.getBoundingInfo().boundingBox.centerWorld, Matrix.Identity(), scene.getTransformMatrix(), viewport);
            const x = p.x * bounds.width / engine.getRenderWidth(), y = p.y * bounds.height / engine.getRenderHeight();
            const hit = scene.pick(x, y, n => n.isPickable && !!n.metadata, false, camera);
            if (hit?.pickedMesh?.metadata?.station === mesh.metadata.station && document.elementFromPoint(bounds.x + x, bounds.y + y) === canvas) return { x: bounds.x + x, y: bounds.y + y, station: mesh.metadata.station };
          }
        });
        assert.ok(point, 'actual unobscured platform has a valid picking ray');
        if (touch) {
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 1 }] });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else await page.mouse.click(point.x, point.y);
        await labels.evaluate(node => { node.style.visibility = ''; });
        assert.equal(await selected(), point.station, 'canvas mouse/touch picks the new map station mesh');
        assert.equal(await page.locator('#interior').isVisible(), true);
        await closeInterior();
      }
      const station = page.locator('#city-map [data-station="museum"]');
      await station.focus(); await station.press('Enter');
      assert.equal(await selected(), 'museum');
      await page.locator('#broadcast-play').click();
      await page.waitForFunction(() => window.__rushAudio.length > 0);
      assert.ok(await page.evaluate(() => window.__rushAudio.at(-1).source.includes('/en/') && window.__rushAudio.at(-1).source.endsWith('.mp3')), 'nearby fictional places retain canonical recorded audio');
      await closeInterior();
      await page.locator('#start').click(); await page.waitForTimeout(1300); await page.locator('#start').click();
      const pausedClock = await page.locator('#clock').textContent();
      const positions = await page.locator('#city-map [data-train]').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform') ?? n.getAttribute('style')));
      await page.waitForTimeout(300);
      assert.deepEqual(await page.locator('#city-map [data-train]').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform') ?? n.getAttribute('style'))), positions);
      await page.locator('#language').selectOption('ja');
      assert.equal(await page.locator('#clock').textContent(), pausedClock); assert.equal(await selected(), 'museum');
      if (!flat) {
        const before = await page.evaluate(async () => { const { Engine } = await import('/src/babylon.ts'); const c = Engine.Instances[0].scenes[0].activeCamera; return { alpha: c.alpha, radius: c.radius }; });
        const canvas = await page.locator('#city-map canvas').boundingBox();
        const x = canvas.x + canvas.width * .2, y = canvas.y + canvas.height * .7;
        if (touch) {
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 90, y: y + 30, id: 1 }] });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 100, y + 30, { steps: 8 }); await page.mouse.up(); }
        await page.waitForTimeout(500);
        const rotated = await page.evaluate(async () => { const { Engine } = await import('/src/babylon.ts'); return Engine.Instances[0].scenes[0].activeCamera.alpha; });
        assert.ok(Math.abs(rotated - before.alpha) > .01, 'real mouse/touch dragging orbits the city');
        assert.equal(await page.locator('#interior').isVisible(), false, 'drag never activates stations');
        await page.locator('#city-zoom-in').click();
        const zoomed = await page.evaluate(async () => { const { Engine } = await import('/src/babylon.ts'); return Engine.Instances[0].scenes[0].activeCamera.radius; });
        await page.locator('#city-reset').click();
        const reset = await page.evaluate(async () => { const { Engine } = await import('/src/babylon.ts'); const c = Engine.Instances[0].scenes[0].activeCamera; return { alpha: c.alpha, radius: c.radius }; });
        assert.ok(Math.abs(reset.alpha - before.alpha) < .01); assert.ok(reset.radius > zoomed);
        assert.equal(await selected(), 'museum'); assert.equal(await page.locator('#clock').textContent(), pausedClock);
      }
      await page.locator('#city-view-2d').click();
      assert.equal(await page.locator('#map').getAttribute('data-map'), 'lantern-isles');
      assert.equal(await selected(), 'museum'); assert.equal(await page.locator('#clock').textContent(), pausedClock);
      if (flat && width === viewports[0][0]) {
        await page.locator('#language').selectOption('en'); await openPanel();
        let index = 0;
        for (const [map, ids] of Object.entries(rounds)) {
          await page.locator('#rush-map').selectOption(map);
          for (const id of ids) {
            await page.locator('#scenario').selectOption(id); await closePanel();
            await page.locator('#start').click();
            await page.evaluate(seconds => {
              window.__rushStepping = true;
              try { const now = performance.now(); for (let i = 1; i <= seconds * 4 + 8; i++) window.__rushFrame(now + i * 250); }
              finally { window.__rushStepping = false; }
            }, durations[index++]);
            assert.equal(await page.locator('#result').isVisible(), true, `${id} finishes and saves`);
            assert.ok(await page.evaluate(key => Number(localStorage.getItem(`rush-best-${key}`)) > 0, id));
            await page.locator('#next').click();
            const expected = index === 10 ? rounds['little-bay'][0] : [...rounds['little-bay'], ...rounds['lantern-isles']][index];
            assert.equal(await page.locator('#scenario').inputValue(), expected, 'next continues across map boundary');
            assert.equal(await page.locator('#result').isVisible(), false); await openPanel();
          }
        }
        assert.equal(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('rush-best-')).length), 10);
        await page.locator('#rush-map').selectOption('lantern-isles'); await closePanel();
      }
      if (!flat) {
        await page.locator('#city-view-3d').click();
        await page.waitForFunction(() => document.querySelector('#city-view-3d')?.getAttribute('aria-pressed') === 'true');
        await page.locator('#city-map canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
        await page.locator('#map[data-map="lantern-isles"]').waitFor();
        assert.equal(await selected(), 'museum'); assert.equal(await page.locator('#clock').textContent(), pausedClock);
        assert.equal(await page.evaluate(async () => { const { Engine } = await import('/src/babylon.ts'); return Engine.Instances.length; }), 0, 'fallback disposes old WebGL scene');
      }
      assert.deepEqual(errors, []);
      console.log(`Rush ${flat ? 'SVG' : 'WebGL'} ${width}×${height}: maps, five rounds, locales, places/events, state/audio${flat ? ', progression' : ', picking/orbit/reset/fallback'} PASS`);
      if (process.env.RUSH_SCREENSHOT_PREFIX) await page.screenshot({ path: `${process.env.RUSH_SCREENSHOT_PREFIX}-${width}.png` });
      await page.close();
    }
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
