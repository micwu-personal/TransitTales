// Run with Node and Playwright; servers and browser are always closed afterward.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
async function instrument(page) {
  await page.addInitScript(() => {
    let time = 0, id = 0; const frames = new Map();
    performance.now = () => time;
    requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    cancelAnimationFrame = id => frames.delete(id);
    window.atriumAdvance = ms => {
      for (let left = ms; left > 0; left -= 50) {
        time += Math.min(left, 50); const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time));
      }
    };
  });
}
const advance = (page, ms) => page.evaluate(ms => window.atriumAdvance(ms), ms);
const camera = page => page.evaluate(async () => {
  const { Engine } = await import('/src/babylon.ts'); const camera = Engine.Instances.at(-1).scenes[0].activeCamera;
  return { alpha: camera.alpha, beta: camera.beta, radius: camera.radius };
});
async function tap(page, locator, touch) { if (touch) await locator.tap(); else await locator.click(); }
async function run(browser, base, view, reducedMotion, viewport, index) {
  const page = await browser.newPage({ viewport, hasTouch: true, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await instrument(page); await page.goto(`${base}/escalator.html?view=${view}`);
    await page.locator(view === '3d' ? '.mall-3d canvas' : '#escalator-board').waitFor(); await advance(page, 250);
    await page.locator('#escalator-language').selectOption('en');
    assert.equal(await page.locator('#escalator-puzzle option').count(), 20);
    await page.locator('#escalator-building').selectOption('sky-atrium');
    await page.locator('#escalator-puzzle').selectOption(String(index)); await advance(page, 250);
    assert.equal(await page.locator('#escalator-puzzle option').count(), 20);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'no horizontal page overflow');
    const pieces = await page.evaluate(async index => {
      const { PUZZLES } = await import('/src/escalator/puzzles.ts'); return PUZZLES[index].solution;
    }, index);
    for (const piece of pieces) {
      await tap(page, page.locator(`#tool-${piece.type}`), true);
      for (const point of [piece.a, piece.b]) {
        const deck = point.z ?? 0;
        await tap(page, page.locator(view === '3d' ? `.mall-depth-controls [data-depth="${deck}"]` : `#mall-depth-controls [data-depth-select="${deck}"]`), true);
        await advance(page, 250);
        const target = page.locator(`[data-landing="${point.x},${point.y},${deck}"]`);
        await tap(page, target, true);
      }
    }
    if (view === '3d') {
      const geometry = await page.evaluate(async pieces => {
        const { Engine, Vector3 } = await import('/src/babylon.ts');
        const { mallPoint3d } = await import('/src/escalator/renderer3d.ts');
        const scene = Engine.Instances.at(-1).scenes[0];
        const invalid = [];
        for (let p = 0; p < pieces.length; p++) {
          const piece = pieces[p], a = mallPoint3d(piece.a), b = mallPoint3d(piece.b);
          for (const mesh of scene.meshes.filter(mesh => mesh.metadata?.kind === 'piece' && mesh.metadata.id === `p${p + 1}`)) {
            const vertices = mesh.getVerticesData('position'), indices = mesh.getIndices(), matrix = mesh.computeWorldMatrix(true);
            if (!indices.every(index => index >= 0 && index < vertices.length / 3)) invalid.push(`p${p + 1}: indices`);
            for (let index = 0; index < vertices.length; index += 3) {
              const v = Vector3.TransformCoordinates(Vector3.FromArray(vertices, index), matrix);
              if (['x', 'z'].some(axis => v[axis] < Math.min(a[axis], b[axis]) - .91 || v[axis] > Math.max(a[axis], b[axis]) + .91)) {
                invalid.push(`p${p + 1}: detached geometry`); break;
              }
            }
          }
        }
        return invalid;
      }, pieces);
      assert.deepEqual(geometry, [], 'real rendered escalators stay in one connected span');
    }
    assert.equal(await page.locator('[data-piece]').count(), pieces.length, 'every two-touch placement creates exactly one piece');
    assert.equal(await page.locator('.route-status').count(), await page.locator('.route-status').filter({ hasText: '✓' }).count());
    for (const language of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN']) {
      await page.locator('#escalator-language').selectOption(language); await advance(page, 250);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `no overflow in ${language}`);
    }
    await page.locator('#escalator-language').selectOption('en'); await advance(page, 250);
    if (process.env.ATRIUM_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.ATRIUM_SCREENSHOTS, `atrium-${view}-${viewport.width}-build.png`) });
    const original = view === '3d' ? await camera(page) : null;
    await tap(page, page.locator('#escalator-play'), true);
    assert.equal(await page.locator('.cinema-canvas').isVisible(), false, 'departure is not a completed journey');
    await advance(page, 3500);
    if (original) {
      const current = await camera(page);
      if (reducedMotion) assert.equal(current.alpha, original.alpha); else assert.notEqual(current.alpha, original.alpha, 'successful journeys rotate gently');
      await tap(page, page.locator('#escalator-play'), true); const paused = await camera(page); await advance(page, 1000);
      assert.equal((await camera(page)).alpha, paused.alpha, 'paused tour is frozen'); await tap(page, page.locator('#escalator-play'), true);
    }
    for (let step = 0; step < 240 && !(await page.locator('#escalator-result').isVisible()); step++) await advance(page, 250);
    assert.equal(await page.locator('#escalator-result.is-failed').count(), 0);
    assert.equal(await page.locator('.cinema-canvas').isVisible(), true, 'fireworks start after successful arrival');
    await advance(page, 2100);
    if (process.env.ATRIUM_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.ATRIUM_SCREENSHOTS, `atrium-${view}-${viewport.width}-finale.png`) });
    await page.locator('#escalator-language').selectOption('zh-CN');
    assert.equal(await page.locator('.cinema-canvas').isVisible(), true, 'localization preserves the finale');
    await advance(page, 6000); assert.equal(await page.locator('.cinema-canvas').isVisible(), true, 'finale lasts beyond eight seconds');
    await advance(page, 1000); assert.equal(await page.locator('.cinema-canvas').isVisible(), false, 'finale ends after nine seconds without localization restart');
    await tap(page, page.locator('#escalator-replay'), true); await advance(page, 250);
    assert.equal(await page.locator('.cinema-canvas').isVisible(), false, 'replay does not celebrate before arrivals');
    await page.locator('#escalator-building').selectOption('mall'); assert.equal(await page.locator('#escalator-puzzle').inputValue(), '0');
    assert.deepEqual(errors, []); console.log(`PASS ${view} ${viewport.width}px: depth taps, solved round ${index + 1}, ${reducedMotion ? 'static' : 'animated'} finale, reset and localization`);
  } finally { await page.close(); }
}
(async () => {
  const { createServer } = await import('vite'); const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await server.listen(); const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    const options = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
    try { browser = await chromium.launch(options); } catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ ...options, channel: 'msedge' }); }
    if (process.env.ATRIUM_VIEW !== '3d') await run(browser, base, '2d', false, { width: 1024, height: 768 }, 20);
    if (process.env.ATRIUM_VIEW !== '2d') {
      await run(browser, base, '3d', false, { width: 1024, height: 768 }, 39);
      await run(browser, base, '3d', true, { width: 390, height: 844 }, 20);
    }
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
