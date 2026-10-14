// Run: node tests\camera-gestures.browser.cjs. Chromium/Edge touch emulation, not physical Apple certification.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');

const games = [
  { route: 'rush-hour.html', canvas: '#rush-3d-canvas', reset: '#city-reset', zoom: '#city-zoom-', group: '#city-camera-controls', language: '#language', target: '[data-station="market"]', flat: '#map', mode: '#city-view-2d' },
  { route: 'escalator.html', canvas: '#escalator-3d-canvas', reset: '#reset-camera', zoom: '#mall-zoom-', group: '#mall-camera-controls', language: '#escalator-language', target: '[data-landing="0,0"]', flat: '#escalator-board', mode: '#view-2d' },
];
const settle = async page => {
  await page.waitForTimeout(200);
  await page.waitForFunction(() => {
    const c = window.gestureCamera();
    return Math.abs(c.inertialRadiusOffset) < 0.001 && Math.abs(c.inertialAlphaOffset) < 0.001 && Math.abs(c.inertialBetaOffset) < 0.001;
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const camera = page => page.evaluate(() => {
  const c = window.gestureCamera();
  return { radius: c.radius, alpha: c.alpha, beta: c.beta, lower: c.lowerRadiusLimit, upper: c.upperRadiusLimit, target: c.getTarget().asArray(), scroll: scrollY, scale: visualViewport.scale };
});
async function openSpace(page, game) {
  await page.locator(game.canvas).scrollIntoViewIfNeeded();
  return page.evaluate(selector => {
    const canvas = document.querySelector(selector), r = canvas.getBoundingClientRect();
    for (let y = r.top + 25; y < Math.min(innerHeight - 25, r.bottom - 25); y += 18) {
      for (let x = r.left + 90; x < r.right - 90; x += 18) {
        if ([x - 75, x, x + 75].every(px => document.elementFromPoint(px, y) === canvas)) return { x, y };
      }
    }
    throw Error('No open canvas space for two fingers');
  }, game.canvas);
}
async function pinch(session, point, from, to, cancel = false) {
  const points = distance => [
    { x: point.x - distance / 2, y: point.y, id: 1 },
    { x: point.x + distance / 2, y: point.y, id: 2 },
  ];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from) });
  for (let i = 1; i <= 10; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(from + (to - from) * i / 10) });
    await new Promise(resolve => setTimeout(resolve, 35));
  }
  await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
}
async function check(browser, base, game, viewport, touch, screenshots) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const page = await context.newPage(), errors = [];
  await page.addInitScript(() => {
    window.mediaChanges = 0;
    window.Audio = new Proxy(window.Audio, {
      construct(target, args) {
        const audio = Reflect.construct(target, args);
        window.lastBroadcastAudio = audio;
        for (const event of ['play', 'pause', 'emptied']) audio.addEventListener(event, () => window.mediaChanges++);
        return audio;
      },
    });
  });
  if (touch) {
    const emulation = await context.newCDPSession(page);
    await emulation.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${base}/${game.route}`); await page.locator(game.canvas).waitFor();
    if (touch) assert.ok(await page.evaluate(() => navigator.maxTouchPoints >= 2), 'emulator supports multiple fingers');
    await page.locator(game.language).selectOption('en');
    await page.evaluate(async () => {
      const { Engine } = await import('/src/babylon.ts');
      window.gestureCamera = () => Engine.LastCreatedScene.activeCamera;
      window.cameraClicks = 0; window.audioChanges = 0;
      const canvas = document.querySelector('canvas'), surface = canvas.closest('.mall-3d,.rush-3d');
      surface.addEventListener('click', event => { if (event.target.closest('[data-landing],[data-piece],[data-station],[data-train]')) window.cameraClicks++; });
      for (const event of ['play', 'pause', 'emptied']) document.addEventListener(event, () => window.audioChanges++, true);
    });
    await settle(page);
    const reset = await camera(page), p = await openSpace(page, game), initial = await camera(page);
    await page.mouse.move(p.x, p.y); await page.mouse.wheel(0, -260); await settle(page);
    const zoomed = await camera(page);
    assert.ok(zoomed.radius < initial.radius * 0.96, `${game.route}: wheel zooms in`);
    assert.ok(Math.abs(zoomed.scroll - initial.scroll) < 1, 'wheel stays within the 3D surface');
    const wheelOut = await openSpace(page, game); await page.mouse.move(wheelOut.x, wheelOut.y);
    await page.mouse.wheel(0, 300); await settle(page);
    const afterWheelOut = await camera(page);
    assert.ok(afterWheelOut.radius > zoomed.radius * 1.04, `wheel zooms out: ${zoomed.radius} → ${afterWheelOut.radius}`);
    await page.locator(game.reset).click(); await settle(page);
    const beforeDrag = await camera(page), drag = await openSpace(page, game);
    await page.mouse.move(drag.x, drag.y); await page.mouse.down(); await page.mouse.move(drag.x + 45, drag.y + 20, { steps: 10 }); await page.mouse.up(); await settle(page);
    assert.ok(Math.abs((await camera(page)).alpha - beforeDrag.alpha) > 0.01, 'mouse drag orbits');
    await page.locator(game.reset).click(); await settle(page);
    if (touch) {
      const session = await context.newCDPSession(page), point = await openSpace(page, game), before = await camera(page);
      await pinch(session, point, 65, 145); await settle(page);
      const close = await camera(page);
      assert.ok(close.radius < before.radius * 0.8, `spreading two fingers zooms in: ${before.radius} → ${close.radius}`);
      assert.equal(close.scale, before.scale, 'pinch does not zoom the whole page');
      assert.ok(Math.abs(close.scroll - before.scroll) < 1, 'pinch does not scroll the page');
      await pinch(session, await openSpace(page, game), 145, 65); await settle(page);
      assert.ok((await camera(page)).radius > close.radius * 1.15, 'closing two fingers zooms out');
      await pinch(session, await openSpace(page, game), 75, 115, true); await settle(page);
      const q = await openSpace(page, game), beforeOrbit = await camera(page);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y, id: 1 }] });
      for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x + i * 5, y: q.y + i * 2, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await settle(page);
      assert.ok(Math.abs((await camera(page)).alpha - beforeOrbit.alpha) > 0.01, 'one finger orbits after cancelled pinch');
      assert.equal(await page.evaluate(() => window.cameraClicks), 0, 'gestures do not click game controls');
      await page.locator(game.reset).click(); await settle(page);
      const label = page.locator(game.target); await label.scrollIntoViewIfNeeded();
      const selectedBeforeDrag = await label.getAttribute('aria-pressed');
      const box = await label.boundingBox(), center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x + 10, y: center.y, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal(await label.getAttribute('aria-pressed'), selectedBeforeDrag, 'drag over a native label does not change selection');
      if (game.route === 'rush-hour.html') assert.equal(await page.locator('#interior-close').isVisible(), false, 'drag does not open a station interior');
      await label.tap(); assert.equal(await label.getAttribute('aria-pressed'), 'true', 'a fresh tap works immediately after a drag');
      if (game.route === 'escalator.html') await page.locator('#escalator-cancel').click();
      else await page.locator('#interior-close').click();
      await page.evaluate(() => { window.audioChanges = 0; });
      await session.detach();
    }
    await page.locator(game.reset).click(); await settle(page);
    assert.ok(Math.abs((await camera(page)).radius - reset.radius) < 0.05, 'reset restores complete-scene framing');
    await page.locator(`${game.zoom}in`).focus(); await page.keyboard.press('Enter'); await settle(page);
    assert.ok((await camera(page)).radius < reset.radius, 'keyboard zoom button works');
    await page.locator(`${game.zoom}out`).click(); await settle(page);
    assert.ok(Math.abs((await camera(page)).radius - reset.radius) < 0.05, 'button directions are inverse');
    const anchors = game.route === 'rush-hour.html' ? 'button[data-station]' : 'button[data-landing]';
    const completeLabels = await page.locator(`${anchors}:visible`).count();
    for (let i = 0; i < 15; i++) await page.locator(`${game.zoom}in`).click();
    const minimum = await camera(page); assert.ok(Math.abs(minimum.radius - minimum.lower) < 0.05, 'close-up bound');
    await settle(page);
    assert.ok(await page.locator(`${anchors}:visible`).count() <= completeLabels, 'close-ups do not introduce extra projected controls');
    const visibleLeadersStayInFrame = await page.evaluate(selector => {
      const canvas = document.querySelector(selector), surface = canvas.closest('.mall-3d,.rush-3d');
      return [...surface.querySelectorAll('line')].filter(line => getComputedStyle(line).display !== 'none').every(line => {
        const x = Number(line.getAttribute('x1')), y = Number(line.getAttribute('y1'));
        return x >= 0 && x <= canvas.clientWidth && y >= 0 && y <= canvas.clientHeight;
      });
    }, game.canvas);
    assert.ok(visibleLeadersStayInFrame, 'offscreen anchors do not leave leaders clamped along scene edges');
    if (screenshots && (viewport.width === 1440 || viewport.width === 390)) {
      await page.locator(game.canvas).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshots, `${game.route.split('.')[0]}-closeup-${viewport.width}.png`) });
    }
    for (let i = 0; i < 20; i++) await page.locator(`${game.zoom}out`).click();
    const maximum = await camera(page); assert.ok(Math.abs(maximum.radius - maximum.upper) < 0.05, 'zoom-out bound');
    await page.locator(game.reset).click(); await settle(page);
    assert.equal(await page.locator(`${anchors}:visible`).count(), completeLabels, 'reset restores all framed labels');
    await page.locator(`${game.zoom}in`).click(); await settle(page);
    const originalRatio = (await camera(page)).radius / reset.radius;
    const rotated = { width: viewport.height, height: viewport.width };
    await page.setViewportSize(rotated); await settle(page);
    const resizedZoom = await camera(page); await page.locator(game.reset).click(); await settle(page);
    assert.ok(Math.abs(resizedZoom.radius / (await camera(page)).radius - originalRatio) < 0.03, 'orientation preserves zoom proportion');
    assert.equal(await page.evaluate(() => window.audioChanges), 0, 'camera controls do not play or interrupt audio');
    await page.setViewportSize(viewport); await settle(page);
    if (touch) await page.locator(game.target).tap(); else await page.locator(game.target).click();
    assert.equal(await page.locator(game.target).getAttribute('aria-pressed'), 'true', 'native gameplay tap remains usable');
    if (game.route === 'escalator.html') {
      if (touch) await page.locator('[data-landing="1,1"]').tap(); else await page.locator('[data-landing="1,1"]').click();
      assert.equal(await page.locator('[data-piece]').count(), 1, 'touch builds exactly one route piece');
    } else {
      await page.locator('#interior-close').click();
    }
    for (const language of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN']) {
      await page.locator(game.language).selectOption(language); await settle(page);
      for (const selector of [`${game.zoom}in`, `${game.zoom}out`]) {
        const button = page.locator(selector), box = await button.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, '44px zoom target');
        assert.ok(await button.getAttribute('aria-label'), 'localized accessible label');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'no horizontal page overflow');
    }
    await page.locator(game.language).selectOption('en');
    if (game.route === 'rush-hour.html') {
      await page.locator(game.target).click();
      await page.locator('#broadcast-studio').click();
      await page.locator('#broadcast-preview').selectOption('safety');
      await page.waitForFunction(() => window.lastBroadcastAudio && !window.lastBroadcastAudio.paused);
      // Keep the real recording active while slow software-WebGL checks scroll to the camera toolbar.
      await page.evaluate(() => { window.lastBroadcastAudio.playbackRate = 0.1; window.lastBroadcastAudio.currentTime = 0; });
      await page.waitForFunction(() => window.lastBroadcastAudio.currentTime > 0);
      const beforeAudio = await page.evaluate(() => ({ media: window.mediaChanges, time: window.lastBroadcastAudio.currentTime, caption: document.querySelector('#broadcast-caption').textContent }));
      await page.locator(`${game.zoom}in`).click(); await page.locator(`${game.zoom}out`).click(); await page.locator(game.reset).click();
      const afterAudio = await page.evaluate(() => ({ media: window.mediaChanges, time: window.lastBroadcastAudio.currentTime, caption: document.querySelector('#broadcast-caption').textContent }));
      assert.equal(afterAudio.media, beforeAudio.media, 'zoom/reset do not pause, replace or restart active speech');
      assert.equal(afterAudio.caption, beforeAudio.caption, 'camera controls preserve the active caption');
      assert.ok(afterAudio.time >= beforeAudio.time, 'active recording keeps progressing');
      await page.locator('#interior-close').click();
    } else {
      if (await page.locator('#hud-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#hud-toggle').click();
      await page.locator('.game-panel-scroll details').evaluate(node => { node.open = true; });
      await page.locator('#escalator-sound').click();
      await page.locator('#escalator-sound[aria-pressed="true"]').waitFor();
      await page.locator('#hud-close').click(); await settle(page);
      await page.locator('#escalator-play').click(); await page.locator('#escalator-play').click();
      const wave = await page.locator('#escalator-progress').getAttribute('aria-valuenow');
      await page.locator(`${game.zoom}in`).click(); await page.locator(`${game.zoom}out`).click(); await page.locator(game.reset).click();
      assert.equal(await page.locator('#escalator-progress').getAttribute('aria-valuenow'), wave, 'camera controls preserve a paused shopper wave');
      assert.equal(await page.locator('#escalator-sound').getAttribute('aria-pressed'), 'true', 'music remains enabled');
      assert.equal(await page.locator('[data-piece]').count(), 1, 'camera controls preserve the built route');
      await page.locator('#hud-toggle').click();
      await page.locator('#escalator-sound').click();
      await page.locator('#hud-close').click();
    }
    if (screenshots && (viewport.width === 1440 || viewport.width === 390)) {
      await page.locator(game.canvas).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshots, `${game.route.split('.')[0]}-zoom-${viewport.width}.png`) });
    }
    await page.locator(game.mode).click();
    await page.locator(game.flat).waitFor(); assert.equal(await page.locator(game.group).isVisible(), false, 'zoom controls hidden in 2D');
    assert.equal(await page.locator(game.canvas).count(), 0, 'disposed canvas removed');
    assert.deepEqual(errors, [], 'no runtime errors');
    console.log(`PASS ${game.route} ${viewport.width}×${viewport.height}: wheel/buttons/orbit${touch ? '/pinch/cancel/taps' : ''}, bounds/orientation/locales/2D cleanup`);
  } finally { await context.close(); }
}
(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await server.listen(); const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    const options = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
    try { browser = await chromium.launch(options); } catch (error) {
      if (!error.message.includes("Executable doesn't exist")) throw error;
      browser = await chromium.launch({ ...options, channel: 'msedge' });
    }
    for (const game of games) for (const [viewport, touch] of [[{ width: 1440, height: 1100 }, false], [{ width: 390, height: 844 }, true], [{ width: 820, height: 1180 }, true]]) {
      await check(browser, base, game, viewport, touch, process.env.CAMERA_SCREENSHOTS);
    }
  } finally { await browser?.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
