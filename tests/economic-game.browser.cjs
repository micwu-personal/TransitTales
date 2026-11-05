const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { createServer, preview } = await import('vite');
  const source = await createServer({ logLevel: 'error' });
  const model = await source.ssrLoadModule(path.resolve('src', 'economic', 'model.ts'));
  const storage = await source.ssrLoadModule(path.resolve('src', 'economic', 'storage.ts'));
  const uiCopy = await source.ssrLoadModule(path.resolve('src', 'economic', 'copy.ts'));
  const places = ['home', 'shop', 'school', 'bank', 'park'];
  let server, browser;
  const errors = [];
  const screenshotDir = process.env.ECONOMIC_SCREENSHOTS;
  if (screenshotDir) await fs.mkdir(screenshotDir, { recursive: true });
  const snapshot = value => JSON.parse(JSON.stringify(value));
  function solution(initial) {
    const queue = [{ state: initial, path: [] }], seen = new Set();
    for (let cursor = 0; cursor < queue.length && cursor < 4000; cursor++) {
      const current = queue[cursor];
      if (current.state.completed) return current.path;
      if (current.path.length >= 32) continue;
      const s = current.state;
      const key = JSON.stringify([s.level, s.day, s.cash, s.savings, s.debt, s.trust, s.inventory, s.flags, s.seed]);
      if (seen.has(key)) continue;
      seen.add(key);
      for (const place of places) for (const offer of model.getActions(s, place)) {
        if (offer.disabled) continue;
        const result = model.act(s, offer.id);
        if (result.ok) queue.push({ state: result.state, path: [...current.path, { place, id: offer.id }] });
      }
    }
    throw new Error(`No bounded UI route found for story ${initial.level + 1}`);
  }
  async function readSave(page) {
    return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storage.SAVE_KEY);
  }
  async function fits(page, label) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1), `${label}: viewport fits`);
    assert.ok(await page.locator('.world-stage > svg').isVisible(), `${label}: illustrated world visible`);
  }
  async function controls(page, selector, label) {
    const failures = await page.locator(selector).evaluateAll(nodes => nodes.flatMap(node => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height || getComputedStyle(node).visibility === 'hidden') return [];
      const center = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return rect.width < 43.5 || rect.height < 43.5 || rect.x < 0 || rect.y < 0 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1 || !center || !node.contains(center) ? [`${node.id}: ${Math.round(rect.width)}×${Math.round(rect.height)}`] : [];
    }));
    assert.deepEqual(failures, [], `${label}: visible controls have reachable 44px targets`);
  }
  async function capture(page, name) {
    if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
  }
  async function use(page, step) {
    await page.locator(`.location-strip [data-place="${step.place}"]`).click();
    const before = (await readSave(page)).state;
    const expected = model.act(before, step.id);
    assert.ok(expected.ok, `legal UI action ${step.id}`);
    const action = page.locator(`[data-action="${step.id}"]`);
    assert.ok(await action.isEnabled(), `enabled UI action ${step.id}`);
    await action.click();
    assert.deepEqual((await readSave(page)).state, snapshot(expected.state), `${step.id}: actual UI persists the exact economic consequence`);
    const state = expected.state;
    if (state.digital > 0 || state.flags.pendingChange || state.bankTerm || state.loan || state.flags.foreignDebt) {
      await page.locator('#wallet').click();
      const english = await page.locator('#language').inputValue() === 'en';
      if (state.digital > 0) assert.match(await page.locator('.minor-wallet').allTextContents().then(values => values.join(' ')), english ? /Digital wallet \(prepaid\)/ : /数字钱包（预付）/);
      if (state.flags.pendingChange) assert.match(await page.locator('.minor-wallet').allTextContents().then(values => values.join(' ')), english ? /Change waiting for you/ : /找零等着领/);
      const numericAmount = value => Number(value.replace(/[^0-9.-]/g, ''));
      const extraAmounts = (await page.locator('.minor-wallet b').allTextContents()).map(numericAmount);
      assert.deepEqual(extraAmounts, [state.digital, state.flags.pendingChange ?? 0].filter(value => value > 0).map(value => value / 100), 'prepaid/pending pouches show the actual home-currency balances');
      if (state.bankTerm || state.loan || state.flags.foreignDebt) assert.ok(await page.locator('.contract-notes').isVisible(), 'maturity/repayment promises remain available in the wallet');
      const displayedWorth = numericAmount(await page.locator('.net-worth b').textContent());
      assert.equal(displayedWorth, model.netWorth(state) / 100, 'wallet shows authoritative net worth including prepaid/foreign/pending funds');
      const items = Object.entries(state.inventory).filter(([, count]) => count > 0);
      assert.equal(await page.locator('.bag-items > span').count(), items.length, 'all held goods are visible');
      for (const [id] of items) assert.ok(uiCopy.itemNames[id], `${id}: goods have a localized name rather than an internal ID`);
      await page.keyboard.press('Escape');
      assert.deepEqual((await readSave(page)).state, snapshot(state), 'opening/closing the wallet does not advance time or change money');
    }
  }
  try {
    server = await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    const base = server.resolvedUrls.local[0];
    try { browser = await chromium.launch({ headless: true }); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    const cases = [[1440, 900, 1], [390, 844, 2], [768, 1024, 3], [844, 390, 2]];
    let operations = 0;
    for (const [width, height, children] of cases) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1100, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`${width}: ${error.message}`));
      await page.goto(`${base}index.html`);
      await page.locator('#play-economic').click();
      await page.locator('#start').waitFor();
      await fits(page, `setup ${width}`);
      await page.locator('#setup-language').selectOption('en');
      await capture(page, `${width}-setup`);
      await page.locator('#setup-language').focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator('#start').evaluate(node => node === document.activeElement), true, 'setup keyboard focus is contained');
      await page.locator(`#children-${children}`).click();
      await page.locator(width === 390 ? '#choose-girl' : '#choose-boy').click();
      await page.locator('#start').click();
      assert.equal((await readSave(page)).state.family.children, children);
      assert.equal((await readSave(page)).state.family.gender, width === 390 ? 'girl' : 'boy');
      const initial = (await readSave(page)).state;
      const first = solution(initial)[0];
      await use(page, first);
      await page.locator('#journal').click();
      await page.locator('#journal-retry').click();
      assert.equal(await page.locator('.panel-retry').getAttribute('aria-modal'), 'true');
      await page.locator('#confirm-retry').click();
      assert.deepEqual((await readSave(page)).state, initial, 'retry restores money, goods, day and seeded events at level entry');
      for (let level = 0; level < model.LEVEL_COUNT; level++) {
        const current = (await readSave(page)).state;
        assert.equal(current.level, level);
        const locale = level % 2 ? 'zh' : 'en';
        await page.locator('#language').selectOption(locale);
        if ([0, 6, 12, 18, 23].includes(level)) {
          if (await page.locator('#town').count()) await page.locator('#town').click();
          await fits(page, `${width}/${locale}/${level + 1}`);
          await controls(page, '.game-header button, .game-header a, .game-header select, .game-tools button, .location-strip button, #go-story', `${width}/${locale}/${level + 1}`);
          await capture(page, `${width}-story-${level + 1}-town`);
          for (const panel of ['wallet', 'journal', 'help', 'settings']) {
            await page.locator(`#${panel}`).click();
            assert.ok(await page.locator(`.panel-${panel}`).isVisible());
            await fits(page, `${width}/${panel}`);
            await controls(page, '.paper-panel #close', `${width}/${panel}`);
            if (panel === 'wallet') await capture(page, `${width}-story-${level + 1}-wallet`);
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('.paper-panel').count(), 0);
            assert.equal(await page.locator(`#${panel}`).evaluate(node => node === document.activeElement), true, 'Escape restores panel trigger focus');
          }
          await page.reload();
          assert.deepEqual((await readSave(page)).state, current, 'language/panels/reload do not change economic state');
          const destination = model.getLevel(current).place;
          await page.locator(`.location-strip [data-place="${destination}"]`).click();
          await capture(page, `${width}-story-${level + 1}-scene`);
        }
        const route = solution((await readSave(page)).state);
        for (const step of route) { await use(page, step); operations++; }
        const completed = (await readSave(page)).state;
        assert.equal(completed.completed, true, `story ${level + 1} finished through actual controls`);
        if (level < model.LEVEL_COUNT - 1) await page.locator('#next, #next-town').click();
      }
      assert.ok(await page.locator('.picnic-ending').isVisible());
      const ending = (await readSave(page)).state;
      assert.equal(ending.debt, 0);
      assert.equal(ending.flags.foreignDebt || 0, 0);
      await capture(page, `${width}-finale`);
      await page.locator('#ending-reset').click();
      await page.locator('#cancel').click();
      assert.deepEqual((await readSave(page)).state, ending, 'cancel new-family confirmation preserves the old story');
      await page.reload();
      assert.ok(await page.locator('.picnic-ending').isVisible(), 'finale survives reload');
      await context.close();
      console.log(`${width}×${height}: family ${children}, 24 stories, bilingual panels, retry and saved finale passed`);
    }
    for (const blocked of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.addInitScript(({ blocked, key }) => {
        if (blocked) Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage unavailable', 'SecurityError'); } });
        else localStorage.setItem(key, '{corrupt save');
      }, { blocked, key: storage.SAVE_KEY });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}economic.html`);
      await page.locator('#start').click();
      assert.ok(await page.locator('.conversation').isVisible(), 'corrupt/unavailable save starts a playable scene');
      await page.locator('.choice:not(:disabled)').first().click();
      if (blocked) assert.ok(await page.locator('.save-warning').isVisible(), 'blocked storage has honest save feedback');
      await context.close();
    }
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noScript.newPage();
    await fallback.goto(`${base}economic.html`);
    assert.ok(await fallback.locator('noscript').isVisible(), 'no-script fallback remains readable');
    assert.ok(await fallback.locator('a[href="index.html"]').first().isVisible());
    await noScript.close();
    assert.deepEqual(errors, [], 'no uncaught game errors');
    console.log(`Economic production browser checks passed: ${operations} real economic choices; no runtime errors.`);
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.httpServer.close(resolve));
    await source.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
