const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { createServer, preview } = await import('vite');
  const source = await createServer({ logLevel: 'error' });
  const model = await source.ssrLoadModule(path.resolve('src', 'economic', 'model.ts'));
  const storage = await source.ssrLoadModule(path.resolve('src', 'economic', 'storage.ts'));
  const opening = await source.ssrLoadModule(path.resolve('src', 'economic', 'opening-play.ts'));
  const uiCopy = await source.ssrLoadModule(path.resolve('src', 'economic', 'copy.ts'));
  const { common } = await source.ssrLoadModule(path.resolve('src', 'economic', 'legacy-localization.ts'));
  const places = ['home', 'shop', 'school', 'bank', 'park'];
  let server, browser;
  const errors = [], controlFailures = [];
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
    if (failures.length) controlFailures.push({ label, failures });
  }
  async function capture(page, name) {
    if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
  }
  const token = (page, id) => page.locator(`[data-play-token="${id}"]`);
  async function pickMoney(page, source, pieces, amount) {
    const subsets = new Map([[0, []]]);
    pieces.forEach((value, index) => {
      for (const [total, indices] of [...subsets]) if (total + value <= amount && !subsets.has(total + value)) subsets.set(total + value, [...indices, index]);
    });
    assert.ok(subsets.has(amount), `${source}: exact ${amount} cents available`);
    for (const index of subsets.get(amount)) await token(page, `${source}:${index}`).click();
  }
  async function openingCommand(page, command, expected) {
    assert.ok(expected.ok, `legal opening ${command}`);
    await page.locator(`[data-play-command="${command}"]`).click();
    assert.deepEqual((await readSave(page)).state, snapshot(expected.state), `${command}: exact economic consequence persisted`);
    return expected.state;
  }
  async function openingPurchase(page, goods) {
    const before = (await readSave(page)).state;
    await page.locator('.location-strip [data-place="shop"]').click();
    let draft = opening.emptyOpening();
    for (const [item, quantity] of Object.entries(goods)) for (let i = 0; i < quantity; i++) {
      await token(page, `shelf:${item}`).click();
      draft = opening.moveBasket(before, draft, item, 1);
    }
    const pieces = opening.pursePieces(before), amount = before.level === 2 ? 500 : opening.basketTotal(before, draft);
    await pickMoney(page, 'purse', pieces, amount);
    draft.tender = await page.locator('[data-play-token^="tender:"]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.playToken.split(':')[1])));
    return openingCommand(page, 'pay', opening.payOpening(before, draft, { empty: {}, budget: {}, exact: {} }));
  }
  async function first3play(page) {
    let state = (await readSave(page)).state;
    const level = state.level, n = state.family.children;
    if (level === 1) {
      await page.locator('.location-strip [data-place="home"]').click();
      await token(page, 'list:apple').click(); await token(page, 'list:bread').click();
      state = await openingCommand(page, 'plan', model.act(state, 'make-list'));
    }
    state = await openingPurchase(page, level === 0 ? { apple: n } : level === 1 ? { apple: n, bread: n } : { bread: 1 });
    if (level === 2) {
      await pickMoney(page, 'counter', opening.counterPieces(state), 380);
      state = await openingCommand(page, 'collect', model.act(state, 'collect-change'));
    }
    await page.locator(`.location-strip [data-place="${level === 0 ? 'home' : 'school'}"]`).click();
    for (let child = 0; child < (level === 2 ? 1 : n); child++) for (const item of level === 0 ? ['apple'] : level === 1 ? ['apple', 'bread'] : ['bread']) {
      await token(page, `food:${item}`).click();
      await page.locator(`[data-play-packet="${child}"]`).click();
    }
    await openingCommand(page, 'deliver', model.act(state, ['share-apples', 'pack-lunch', 'deliver-bread'][level]));
    return level === 2 ? 3 : level === 1 ? 3 : 2;
  }
  async function use(page, step) {
    await page.locator(`.location-strip [data-place="${step.place}"]`).click();
    const before = (await readSave(page)).state;
    const expected = model.act(before, step.id);
    assert.ok(expected.ok, `legal UI action ${step.id}`);
    const product = page.locator(`[data-product="${step.id}"]`);
    if (await product.count()) await product.click();
    const change = page.locator(`[data-change-select="${step.id}"]`);
    if (await change.count()) {
      await change.click();
      while (await page.locator('.counter-side:not(.receiving-pocket) [data-money-piece]').count()) await page.locator('.counter-side:not(.receiving-pocket) [data-money-piece]').first().click();
    }
    const action = page.locator(`[data-action="${step.id}"]`);
    assert.ok(await action.isEnabled(), `enabled UI action ${step.id}`);
    await action.click();
    assert.deepEqual((await readSave(page)).state, snapshot(expected.state), `${step.id}: actual UI persists the exact economic consequence`);
    const state = expected.state;
    if (state.digital > 0 || state.flags.pendingChange || state.bankTerm || state.loan || state.flags.foreignDebt) {
      await page.locator('#wallet').click();
      const english = await page.locator('#language').inputValue() === 'en';
      if (state.digital > 0) assert.ok((await page.locator('.minor-wallet').allTextContents()).join(' ').includes(uiCopy.text(common('digital'), english ? 'en' : 'zh')));
      if (state.flags.pendingChange) assert.ok((await page.locator('.minor-wallet').allTextContents()).join(' ').includes(uiCopy.text(common('change-money'), english ? 'en' : 'zh')));
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
    const base = process.env.ECONOMIC_AUDIO_URL || server.resolvedUrls.local[0];
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
      assert.equal(await page.locator('.panel-setup').evaluate(node => node.contains(document.activeElement)), true, 'setup keyboard focus is contained');
      await page.locator(`#children-${children}`).click();
      await page.locator(width === 390 ? '#choose-girl' : '#choose-boy').click();
      await page.locator('#start').click();
      assert.equal((await readSave(page)).state.family.children, children);
      assert.equal((await readSave(page)).state.family.gender, width === 390 ? 'girl' : 'boy');
      const initial = (await readSave(page)).state;
      await openingPurchase(page, { apple: children });
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
            await page.locator(`[data-ui="${panel}"]`).click();
            assert.ok(await page.locator(`.panel-${panel}`).isVisible());
            await fits(page, `${width}/${panel}`);
            await controls(page, '.paper-panel #close', `${width}/${panel}`);
            if (panel === 'wallet') await capture(page, `${width}-story-${level + 1}-wallet`);
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('.paper-panel').count(), 0);
            assert.equal(await page.locator(`[data-ui="${panel}"]`).evaluate(node => node === document.activeElement), true, 'Escape restores panel trigger focus');
          }
          await page.reload();
          assert.deepEqual((await readSave(page)).state, current, 'language/panels/reload do not change economic state');
          const destination = model.getLevel(current).place;
          await page.locator(`.location-strip [data-place="${destination}"]`).click();
          await capture(page, `${width}-story-${level + 1}-scene`);
        }
        if (level < 3) operations += await first3play(page);
        else {
          const route = solution((await readSave(page)).state);
          for (const step of route) { await use(page, step); operations++; }
        }
        const completed = (await readSave(page)).state;
        assert.equal(completed.completed, true, `story ${level + 1} finished through actual controls`);
        if (level < model.LEVEL_COUNT - 1) await page.locator('#next, #next-town').click();
      }
      assert.ok(await page.locator('#next, #next-town').isVisible(), 'Legacy arc completes with the expanded campaign still available');
      const ending = (await readSave(page)).state;
      assert.equal(ending.debt, 0);
      assert.equal(ending.flags.foreignDebt || 0, 0);
      await capture(page, `${width}-finale`);
      await page.locator('#settings').click();
      await page.locator('#settings-reset').click();
      await page.locator('#cancel').click();
      assert.deepEqual((await readSave(page)).state, ending, 'cancel new-family confirmation preserves the old story');
      await page.reload();
      assert.deepEqual((await readSave(page)).state, ending, 'Legacy arc completion survives reload');
      assert.ok(await page.locator('#next-town').isVisible(), 'Reload returns completed arc to town');
      await context.close();
      console.log(`${width}×${height}: family ${children}, 24 legacy stories, bilingual panels, retry and saved arc completion passed`);
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
      await token(page, 'shelf:apple').click(); await token(page, 'shelf:apple').click();
      await pickMoney(page, 'purse', opening.pursePieces(model.createGame({ children: 2, gender: 'boy' })), 160);
      await page.locator('[data-play-command="pay"]').click();
      if (blocked) assert.ok(await page.locator('.save-warning').isVisible(), 'blocked storage has honest save feedback');
      await context.close();
    }
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noScript.newPage();
    await fallback.goto(`${base}economic.html`);
    assert.ok(await fallback.locator('noscript').isVisible(), 'no-script fallback remains readable');
    assert.ok(await fallback.locator('a[href="index.html"]').first().isVisible());
    await noScript.close();
    assert.deepEqual(controlFailures, [], 'Visible controls have reachable 44px targets at every checked viewport');
    assert.deepEqual(errors, [], 'no uncaught game errors');
    console.log(`Economic production browser checks passed: ${operations} real economic choices; no runtime errors.`);
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.httpServer.close(resolve));
    await source.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
