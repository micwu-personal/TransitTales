// Run with: node tests\escalator-feedback.browser.cjs (uses an ephemeral local Vite server).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function instrument(page) {
  await page.addInitScript(() => {
    let time = 0, next = 0, hidden = false;
    const frames = new Map();
    performance.now = () => time;
    window.requestAnimationFrame = callback => { frames.set(++next, callback); return next; };
    window.cancelAnimationFrame = id => frames.delete(id);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    const audio = { contexts: 0, resumes: 0, notes: 0, stops: 0, disconnects: 0, closes: 0 };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); audio.contexts++; }
      resume() { audio.resumes++; return super.resume(); }
      close() { audio.closes++; return super.close(); }
      createOscillator() {
        audio.notes++; const source = super.createOscillator(), stop = source.stop.bind(source), disconnect = source.disconnect.bind(source);
        source.stop = (...args) => { audio.stops++; return stop(...args); };
        source.disconnect = (...args) => { audio.disconnects++; return disconnect(...args); };
        return source;
      }
    };
    window.feedbackProbe = {
      audio,
      advance(milliseconds) {
        for (let passed = 0; passed < milliseconds; passed += 250) {
          time += Math.min(250, milliseconds - passed);
          const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time));
        }
      },
      hide(value) { hidden = value; document.dispatchEvent(new Event('visibilitychange')); },
    };
  });
}
const advance = (page, milliseconds) => page.evaluate(ms => window.feedbackProbe.advance(ms), milliseconds);
const audio = page => page.evaluate(() => ({ ...window.feedbackProbe.audio }));
async function mode(page, view) {
  await page.locator(`#view-${view}`).click();
  await page.locator(view === '3d' ? '.mall-3d canvas' : '#escalator-board').waitFor();
  await advance(page, 250);
}
async function fit(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'no document-level horizontal overflow');
  const effects = await page.locator('#escalator-effects').boundingBox();
  assert.ok(effects.height >= 44 && effects.x >= 0 && effects.x + effects.width <= (await page.viewportSize()).width + 1, 'reachable 44px sound control');
}
async function addPieces(page, pieces) {
  for (const piece of pieces) {
    await page.locator(`#tool-${piece.type}`).click();
    for (const point of [piece.a, piece.b]) await page.locator(`[data-landing="${point.x},${point.y}"]`).click();
  }
}
async function solvedFirst(page) {
  await addPieces(page, [
    { type: 'short', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } },
    { type: 'short', a: { x: 1, y: 1 }, b: { x: 2, y: 2 } },
  ]);
}
async function begin(page) { await page.locator('#escalator-play').click(); await advance(page, 500); }
async function finish(page) { await advance(page, 30000); }
async function finishAtCelebration(page) {
  for (let frame = 0; frame < 120; frame++) {
    await advance(page, 250);
    if (await page.locator('#escalator-result').isVisible()) return;
  }
  throw Error('Wave did not finish');
}
async function desktop(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page); await page.goto(`${base}/escalator.html?view=2d`); await page.locator('#escalator-board').waitFor();
  await advance(page, 250); await page.locator('#escalator-language').selectOption('en'); await fit(page);
  assert.deepEqual(await audio(page), { contexts: 0, resumes: 0, notes: 0, stops: 0, disconnects: 0, closes: 0 });
  await solvedFirst(page); await page.locator('#escalator-effects').click();
  await page.waitForFunction(() => window.feedbackProbe.audio.resumes === 1);
  assert.equal((await audio(page)).notes, 0, 'enabling is silent');
  assert.equal(await page.locator('#escalator-sound').getAttribute('aria-pressed'), 'false', 'music stays off');
  await begin(page); assert.equal(await page.locator('.shopper.is-unhappy').count(), 0);
  assert.ok((await page.locator('.shopper').first().getAttribute('aria-label')).includes('on their way'), 'travelling shopper is not described as no route');
  await finishAtCelebration(page); assert.equal((await audio(page)).notes, 10);
  assert.equal(await page.locator('#escalator-celebration').isVisible(), true);
  assert.equal(await page.locator('#escalator-problems').isVisible(), false);
  await page.locator('.celebration-notes i').first().evaluate(node => { window.celebrationNode = node; window.celebrationAnimation = node.getAnimations()[0]; });
  await page.locator('#escalator-language').selectOption('zh-CN');
  assert.ok((await page.locator('#celebration-copy').textContent()).includes('大家都到达'));
  await mode(page, '3d'); assert.equal(await page.locator('#escalator-celebration').isVisible(), true);
  assert.equal((await audio(page)).notes, 10); assert.equal((await audio(page)).resumes, 1);
  assert.equal(await page.locator('.celebration-notes i').first().evaluate(node => node === window.celebrationNode && (!node.getAnimations().length || node.getAnimations()[0] === window.celebrationAnimation)), true, 'view/localization does not restart animation');
  assert.equal(await page.locator('.mall-3d').evaluate(node => node.classList.contains('is-celebrating')), true);
  const banner = await page.locator('#escalator-celebration').boundingBox(), scene = await page.locator('#escalator-scene').boundingBox();
  assert.ok(banner.y >= scene.y + scene.height, 'celebration is outside and below interactive renderer');
  if (process.env.ESCALATOR_FEEDBACK_SCREENSHOTS) await page.screenshot({ path: 'tests\\escalator-feedback-desktop.png', fullPage: true });
  await advance(page, 3200); assert.equal(await page.locator('#escalator-celebration').isVisible(), false);
  await page.locator('#escalator-language').selectOption('en'); await mode(page, '2d');
  assert.equal((await audio(page)).notes, 10, 'settled success remains silent');
  await page.locator('#escalator-effects').click(); assert.equal(await page.locator('#escalator-effects').getAttribute('aria-pressed'), 'false');
  await page.locator('#escalator-effects').click(); assert.equal((await audio(page)).notes, 10, 'enable after success is not retroactive');

  const partial = await page.evaluate(async () => {
    const { PUZZLES } = await import('/src/escalator/puzzles.ts');
    const { verifiedSolution, route } = await import('/src/escalator/model.ts');
    for (const [index, puzzle] of PUZZLES.entries()) if (puzzle.requests.length > 1) {
      const board = verifiedSolution(puzzle);
      for (const request of puzzle.requests) {
        const pieces = route(puzzle, board.pieces, request);
        const missing = puzzle.requests.filter(request => route(puzzle, pieces, request) === null).map(request => request.id);
        if (missing.length && missing.length < puzzle.requests.length) return { index, pieces, missing, remaining: board.pieces.filter(piece => !pieces.some(current => current.id === piece.id)) };
      }
    }
    throw Error('No actual partial-route puzzle fixture');
  });
  await page.locator('#escalator-puzzle').selectOption(String(partial.index)); await addPieces(page, partial.pieces); await begin(page);
  assert.equal(await page.locator('#escalator-problems').isVisible(), true);
  assert.equal(await page.locator('#escalator-goals .is-unhappy').count(), partial.missing.length);
  assert.ok(await page.locator('.shopper.is-unhappy .shopper-problem').count());
  assert.ok((await page.locator('.shopper.is-unhappy').first().getAttribute('aria-label')).includes('No complete route'));
  for (const id of partial.missing) assert.ok(await page.locator(`[data-request-issue="${id}"]`).isVisible());
  await finish(page); assert.equal(await page.locator('#escalator-result.is-failed').isVisible(), true);
  assert.equal(await page.locator('#escalator-celebration').isVisible(), false); assert.equal((await audio(page)).notes, 10);
  await mode(page, '3d');
  assert.ok(await page.locator('.mall-3d-rider-label.is-unhappy').count());
  assert.ok((await page.locator('.mall-3d-rider-label.is-unhappy').first().getAttribute('aria-label')).includes('No complete route'));
  assert.ok((await page.locator('.mall-3d-a11y').textContent()).includes('Cannot reach destination'));
  await mode(page, '2d'); await page.locator('#escalator-edit').click();
  assert.equal(await page.locator('#escalator-problems').isVisible(), false); await addPieces(page, partial.remaining);
  await begin(page); await finishAtCelebration(page);
  assert.equal((await audio(page)).notes, 20, 'corrected retry gets one fresh fanfare');
  assert.equal(await page.locator('#escalator-problems').isVisible(), false);
  assert.equal(await page.locator('#escalator-goals .is-unhappy').count(), 0);
  await page.evaluate(() => window.feedbackProbe.hide(true));
  assert.equal(await page.locator('#escalator-celebration').isVisible(), false); const beforeShow = await audio(page);
  await page.evaluate(() => window.feedbackProbe.hide(false)); await advance(page, 500);
  assert.deepEqual(await audio(page), beforeShow, 'showing page cannot resume or replay effects');
  await page.locator('#escalator-replay').click(); await page.waitForFunction(() => window.feedbackProbe.audio.resumes >= 3);
  await finishAtCelebration(page); assert.equal((await audio(page)).notes, 30);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  const beforeRestore = await audio(page);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await advance(page, 500); assert.deepEqual(await audio(page), beforeRestore, 'BFCache restoration is silent');
  assert.equal(await page.locator('#escalator-celebration').isVisible(), false);
  assert.deepEqual(errors, []); await page.close();
  console.log('PASS desktop: independent native WebAudio, one-shot success, both renderers, partial failure, correction/retry and lifecycle');
}
async function mobile(browser, base, language) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page); await page.goto(`${base}/escalator.html?view=2d`); await page.locator('#escalator-board').waitFor();
  await advance(page, 250); await page.locator('#escalator-language').selectOption(language); await fit(page);
  assert.ok((await page.locator('#escalator-effects').textContent()).trim());
  await solvedFirst(page); await begin(page); await finishAtCelebration(page);
  assert.equal(await page.locator('#escalator-celebration.is-static').isVisible(), true);
  assert.equal(await page.locator('.celebration-notes i').first().evaluate(node => getComputedStyle(node).animationName), 'none');
  assert.equal((await audio(page)).contexts, 0, 'visual success works without sound opt-in');
  if (language === 'en' || language === 'zh-CN') {
    await mode(page, '3d'); assert.equal(await page.locator('#escalator-celebration.is-static').isVisible(), true); await fit(page);
  }
  if (language === 'zh-CN' && process.env.ESCALATOR_FEEDBACK_SCREENSHOTS) await page.screenshot({ path: 'tests\\escalator-feedback-mobile.png', fullPage: true });
  await advance(page, 3200); assert.equal(await page.locator('#escalator-celebration').isVisible(), false);
  await page.locator('#escalator-reset').click(); await begin(page);
  assert.equal(await page.locator('#escalator-problems').isVisible(), true);
  assert.ok((await page.locator('[data-request-issue]').first().textContent()).includes('A1 → C3'));
  await finish(page); assert.equal(await page.locator('#escalator-result.is-failed').isVisible(), true); await fit(page);
  assert.equal((await audio(page)).notes, 0); assert.deepEqual(errors, []); await page.close();
  console.log(`PASS mobile ${language}: localized controls/reasons, static celebration, silent default, no overflow`);
}
async function touch(browser, base) {
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
  try {
    await page.goto(`${base}/escalator.html?view=2d`);
    await page.locator('#escalator-board').waitFor();
    await page.locator('#tool-short').tap();
    await page.locator('[data-landing="0,0"]').tap();
    assert.equal(await page.locator('[data-landing="0,0"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-landing="1,1"]').tap();
    assert.equal(await page.locator('[data-piece]').count(), 1, 'tap places exactly one piece');
    await page.locator('[data-piece]').tap();
    assert.equal(await page.locator('[data-piece]').getAttribute('aria-pressed'), 'true');
    await page.evaluate(async () => {
      const { createSvgRenderer } = await import('/src/escalator/renderer.ts');
      const { snapshot } = await import('/src/escalator/view.ts');
      const { verifiedSolution } = await import('/src/escalator/model.ts');
      const { PUZZLES } = await import('/src/escalator/puzzles.ts');
      const host = document.createElement('div'); document.body.append(host);
      const renderer = createSvgRenderer(), calls = [];
      renderer.mount(host, point => calls.push(`landing:${point.x},${point.y}`), id => calls.push(`piece:${id}`));
      renderer.render(snapshot(PUZZLES[0], verifiedSolution(PUZZLES[0]), null, 'en', null, null, true, false, false));
      const first = host.querySelector('[data-landing="0,0"]'), second = host.querySelector('[data-landing="1,1"]');
      const pointer = (target, type, options = {}) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, ...options }));
      const check = (expected, message) => { if (calls.length !== expected) throw Error(`${message}: ${calls.length} callbacks`); };
      pointer(first, 'pointerdown'); pointer(first, 'pointerup');
      first.dispatchEvent(new MouseEvent('click', { bubbles: true })); check(1, 'synthetic click must not double-activate');
      pointer(first, 'pointerdown'); pointer(first, 'pointerup', { clientX: 113 }); check(1, 'drag must not activate');
      pointer(first, 'pointerdown'); pointer(second, 'pointerup'); check(1, 'different target must not activate');
      pointer(first, 'pointerdown'); pointer(first, 'pointerup', { pointerId: 2 }); check(1, 'different pointer must not activate');
      pointer(first, 'pointerdown'); pointer(first, 'pointercancel'); pointer(first, 'pointerup'); check(1, 'cancel must clear pending tap');
      pointer(first, 'pointerdown', { isPrimary: false }); pointer(first, 'pointerup', { isPrimary: false }); check(1, 'secondary pointer must not activate');
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); check(2, 'keyboard remains available after touch');
      renderer.dispose(); pointer(first, 'pointerdown'); pointer(first, 'pointerup'); check(2, 'disposed renderer removes pointer handlers');
      renderer.mount(host, point => calls.push(point), id => calls.push(id));
      renderer.render(snapshot(PUZZLES[0], verifiedSolution(PUZZLES[0]), null, 'en', null, null, true, false, false));
      host.querySelector('[data-landing="0,0"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); check(3, 'remount clears synthetic-click suppression');
      renderer.dispose(); host.remove();
    });
    console.log('PASS tablet touch: real taps, one activation, drag/cancel/identity guards, keyboard and disposal; not physical iPad certification');
  } finally { await page.close(); }
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
    await touch(browser, base);
    await desktop(browser, base);
    for (const language of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN']) await mobile(browser, base, language);
  } finally { await browser?.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
