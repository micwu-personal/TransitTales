const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { buildIntro, buildRush } = require('.\\beijing-browser-planner.cjs');
const { startServer } = require('.\\beijing-browser-server.cjs');

(async () => {
  const server = await startServer();
  let browser;
  try {
    const options = { headless: true, args: ['--autoplay-policy=user-gesture-required'] };
    try { browser = await chromium.launch(options); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ ...options, channel: 'msedge' }); }
    for (const { width, language } of [{ width: 1440, language: 'en' }, { width: 390, language: 'en' }, { width: 390, language: 'zh-CN' }]) {
      const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 1100 : 844 }, hasTouch: width === 390 });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(muted => {
        localStorage.setItem('beijing-voice-muted', String(muted));
        Object.defineProperty(window, 'speechSynthesis', { get() { throw new Error('Game must use recordings, not device voices'); }, configurable: true });
        const stats = window.beijingAudio = { attempts: [], played: [], progress: 0, elements: 0, fast: false, extra: 0 };
        const seen = new Set(), originalPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (this.src.includes('/audio/beijing/')) {
            stats.attempts.push(this.src);
            if (!seen.has(this)) {
              seen.add(this); stats.elements++;
              this.addEventListener('playing', () => stats.played.push(this.src));
              this.addEventListener('timeupdate', () => { stats.progress = Math.max(stats.progress, this.currentTime); });
            }
          }
          return originalPlay.call(this);
        };
        // Accelerate simulation timestamps only; real media decoding and audio timers keep real time.
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => raf(now => { if (stats.fast) stats.extra += 400; callback(now + stats.extra); });
      }, width === 390);
      let missing = width === 390;
      if (missing) await page.route(language === 'zh-CN' ? '**/audio/beijing/mandarin/*.mp3' : '**/audio/beijing/stations/*.mp3', route => {
        if (missing) { missing = false; return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Missing test recording' }); }
        return route.continue();
      });
      await page.goto(server.url);
      await page.locator('#manual-direction').waitFor();
      assert.equal(await page.locator('[data-candidate], .alternatives, .route-workshop').count(), 0, 'no complete-route answers or collapsed builder');
      assert.equal(await page.locator('#manual-end').isEnabled(), false);
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), false);
      await page.locator('#language').selectOption(language);
      const title = await page.locator('.passenger-mission h3').textContent();
      assert.equal(await page.evaluate(() => window.beijingAudio.attempts.length), 0, 'no autoplay on opening');
      if (process.env.TRANSIT_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOTS, `beijing-guided-${width}.png`) });
      await buildIntro(page);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'board', 'completing the player-built route leads to boarding');
      assert.equal(await page.locator('.route-plan li').count(), 2);
      await page.locator('#dimension').evaluate(select => { select.value = '2d'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      const press = locator => width === 390 ? locator.tap() : locator.click();
      await press(page.locator('[data-action="board"]'));
      await page.locator('.journey-svg').waitFor();
      await press(page.locator('#pause'));
      if (width === 390) {
        assert.equal(await page.evaluate(() => window.beijingAudio.attempts.length), 0, 'boarding respects saved mute');
        await press(page.locator('#travel-replay'));
        await page.waitForFunction(() => document.querySelector('#travel-voice').getAttribute('aria-pressed') === 'false', null, { timeout: 15000 });
        assert.ok((await page.locator('#travel-voice-status').textContent()).length > 0);
        assert.equal(await page.locator('#travel-voice').getAttribute('aria-pressed'), 'false');
        assert.ok((await page.locator('#caption').textContent()).length > 0, 'missing media retains captions');
        await press(page.locator('#travel-replay'));
        await page.waitForFunction(part => window.beijingAudio.played.some(src => src.includes(part)), language === 'zh-CN' ? '/mandarin/' : '/stations/', { timeout: 15000 });
        assert.equal(await page.locator('#travel-voice-status').textContent(), '', 'replay retries real media and clears failure');
      } else {
        await page.waitForFunction(() => window.beijingAudio.progress > .05, null, { timeout: 10000 });
        assert.match(await page.evaluate(() => window.beijingAudio.attempts[0]), /\/phrases\/en\/boarding\.mp3$/, 'Board activates the structured boarding recording, not generic ready speech');
      }
      assert.equal(await page.locator('#travel-voice').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.evaluate(() => window.beijingAudio.elements), 1, 'one activated audio element serves all parts and retries');
      await press(page.locator('#travel-voice'));
      assert.equal(await page.evaluate(() => localStorage.getItem('beijing-voice-muted')), 'true');
      await page.locator('#speed').selectOption('15');
      await page.evaluate(() => { window.beijingAudio.fast = true; });
      await press(page.locator('#pause'));
      await page.locator('.journey-postcard').waitFor({ timeout: 30000 });
      assert.equal(await page.locator('.journey-steps li.done').count(), 3);
      assert.match(await page.locator('#best-score').textContent(), language === 'en' ? /Personal best \d+/ : /\d+/);
      assert.ok((await page.locator('.travel-milestones .visited').count()) >= 2);
      await page.locator('[data-action="next"]').click();
      assert.notEqual(await page.locator('.passenger-mission h3').textContent(), title);
      assert.equal(await page.locator('.route-plan li').count(), 0);
      assert.equal(await page.locator('.manual-route').isVisible(), true);
      assert.equal(await page.locator('[data-action="board"]').isEnabled(), false);
      assert.equal(await page.locator('#planner-content').evaluate(panel => panel.scrollTop), 0, 'next mission starts at its passenger request');
      const played = await page.evaluate(() => window.beijingAudio.attempts.length);
      await buildRush(page);
      await press(page.locator('[data-action="board"]'));
      await page.locator('.journey-svg').waitFor();
      await press(page.locator('#pause'));
      assert.equal(await page.evaluate(() => window.beijingAudio.attempts.length), played, 'mute also persists across missions');
      assert.deepEqual(errors, []);
      console.log(`PASS guided ${width} ${language}: route-to-board focus, real MP3 gesture playback/retry, mute, milestones, completion and next mission`);
      await page.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
