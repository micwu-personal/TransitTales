const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { createServer, preview } = await import('vite');
  const source = await createServer({ logLevel: 'error' });
  const model = await source.ssrLoadModule(path.resolve('src', 'economic', 'model.ts'));
  const storage = await source.ssrLoadModule(path.resolve('src', 'economic', 'storage.ts'));
  const play = await source.ssrLoadModule(path.resolve('src', 'economic', 'opening-play.ts'));
  let server, browser;
  const errors = [], geometry = [];
  const screenshots = process.env.ECONOMIC_SCREENSHOTS;
  if (screenshots) await fs.mkdir(screenshots, { recursive: true });
  const copy = value => JSON.parse(JSON.stringify(value));
  const save = page => page.evaluate(key => localStorage.getItem(key), storage.SAVE_KEY);
  const state = async page => JSON.parse(await save(page)).state;
  const token = (page, id) => page.locator(`[data-play-token="${id}"]`);
  const command = (page, id) => page.locator(`[data-play-command="${id}"]`);
  function subset(pieces, amount) {
    const sums = new Map([[0, []]]);
    pieces.forEach((piece, i) => {
      for (const [total, indices] of [...sums]) if (total + piece <= amount && !sums.has(total + piece)) sums.set(total + piece, [...indices, i]);
    });
    assert.ok(sums.has(amount), `exact subset exists for ${amount}`);
    return sums.get(amount);
  }
  async function select(page, source, pieces, amount) {
    for (const i of subset(pieces, amount)) await token(page, `${source}:${i}`).click();
  }
  async function returnMoney(page, source) {
    while (await page.locator(`[data-play-token^="${source}:"]`).count()) await page.locator(`[data-play-token^="${source}:"]`).first().click();
  }
  async function capture(page, label) {
    await page.evaluate(() => document.fonts.ready);
    const findings = await page.evaluate(() => {
      const scene = document.querySelector('.opening-scene'), scroll = document.querySelector('.opening-scroll');
      if (!scene || !scroll) return ['missing opening scene'];
      const rect = scene.getBoundingClientRect(), sr = scroll.getBoundingClientRect();
      const failures = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('page overflows horizontally');
      if (sr.height < 48 || scroll.scrollWidth > scroll.clientWidth + 1) failures.push(`play area ${Math.round(sr.height)}px; horizontal overflow ${scroll.scrollWidth - scroll.clientWidth}px`);
      if (rect.x < 0 || rect.y < 0 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1) failures.push('scene leaves viewport');
      for (const node of document.querySelectorAll('.opening-cue .primary, .game-footer button')) {
        if (node.disabled) continue;
        const r = node.getBoundingClientRect(), center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (r.width && r.height && (r.width < 43 || r.height < 43 || !node.contains(center))) failures.push(`unreachable/small ${node.id || node.dataset.place}`);
      }
      return failures;
    });
    geometry.push(...findings.map(f => `${label}: ${f}`));
    if (screenshots) await page.screenshot({ path: path.join(screenshots, `${label}.png`) });
  }
  async function drag(page, from, to) {
    await from.scrollIntoViewIfNeeded();
    const a = await from.boundingBox(), b = await to.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.opening-drag-ghost').count(), 0, 'drag ghost is cleaned up');
  }
  async function fillPackets(page, goods, count) {
    for (const good of goods) for (let i = 0; i < count; i++) {
      await token(page, `food:${good}`).click();
      await page.locator(`[data-play-packet="${i}"]`).click();
    }
  }
  async function pay(page, amount) {
    const before = await state(page);
    await select(page, 'purse', play.pursePieces(before), amount);
    await command(page, 'pay').click();
    assert.equal((await state(page)).cash, before.cash - amount, 'only confirmed payment spends money');
    assert.equal(await page.locator('.opening-scroll .transfer-receipt').count(), 1, 'confirmed payment shows its actual changes');
    assert.ok(await page.locator('.transfer-receipt .transfer-out').count(), 'receipt names money leaving the pocket');
    assert.ok(await page.locator('.transfer-receipt .transfer-in').count(), 'receipt names goods entering the bag');
    assert.equal(await page.locator('.opening-scroll').evaluate(el => el.scrollTop), 0, 'new receipt starts in view');
  }
  try {
    if (!process.env.ECONOMIC_BROWSER_URL) server = await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    const base = process.env.ECONOMIC_BROWSER_URL || server.resolvedUrls.local[0];
    try { browser = await chromium.launch({ headless: true }); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    for (const [width, height, children] of [[1440, 900, 1], [390, 844, 2], [320, 568, 3], [844, 390, 2]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(`${width}: ${e.message}`));
      await page.goto(`${base}economic.html`);
      await page.locator('#setup-language').selectOption('zh');
      await page.locator(`#children-${children}`).click();
      await page.locator('#start').click();
      const initial = await save(page);
      await capture(page, `${width}-shop`);
      if (width === 1440) {
        await drag(page, token(page, 'shelf:apple'), page.locator('[data-play-zone="basket"]'));
        assert.equal(await page.locator('[data-play-token^="basket:"]').count(), 1, 'drag adds exactly one apple');
        await token(page, 'basket:0:apple').click();
      }
      await token(page, 'shelf:apple').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('[data-play-token^="basket:"]').count(), 1, 'keyboard can move a product');
      await token(page, 'basket:0:apple').click();
      assert.equal(await save(page), initial, 'reversible arrangement does not save');
      for (let i = 0; i < children; i++) await token(page, 'shelf:apple').click();
      const pieces = play.pursePieces(await state(page));
      await token(page, 'purse:0').click();
      await command(page, 'pay').click();
      assert.equal(await save(page), initial, 'wrong tender does not save or charge');
      await returnMoney(page, 'tender');
      await select(page, 'purse', pieces, children * 80);
      await command(page, 'pay').click();
      assert.equal((await state(page)).inventory.apple, children);
      assert.equal((await state(page)).cash, 3000 - children * 80);
      await page.locator('#opening-go').click();
      await capture(page, `${width}-plates`);
      const bought = await save(page);
      await token(page, 'food:apple').click();
      await page.locator('[data-play-packet="0"]').click();
      await token(page, 'packet:0:apple').click();
      await fillPackets(page, ['apple'], children);
      assert.equal(await save(page), bought, 'placing and retracting food does not consume saved inventory');
      await command(page, 'deliver').click();
      assert.equal((await state(page)).completed, true);
      await page.locator('#next').click(); await page.locator('#go-story').click();
      await capture(page, `${width}-list`);
      const listSave = await save(page);
      await token(page, 'list:toy').click(); await token(page, 'list:apple').click();
      await command(page, 'plan').click();
      assert.equal(await save(page), listSave, 'wrong shopping list is recoverable without saving');
      await token(page, 'plan:0:toy').click(); await token(page, 'list:bread').click();
      await command(page, 'plan').click();
      assert.equal((await state(page)).flags.list, 1);
      const planned = await save(page);
      await token(page, 'shelf:toy').click();
      await select(page, 'purse', play.pursePieces(await state(page)), 180);
      await command(page, 'pay').click();
      assert.equal(await save(page), planned, 'toy cannot trap the player without enough budget for lunch');
      await token(page, 'basket:0:toy').click();
      let remaining = children;
      if (children > 1) {
        await token(page, 'shelf:apple').click(); await pay(page, 80); remaining--;
        await page.reload(); await page.locator('#go-story').click();
        assert.equal((await state(page)).flags.bought_apple, 1, 'partial purchase survives reload');
        assert.equal(await page.locator('[data-play-token^="basket:"]').count(), 0, 'uncommitted basket is discarded on reload');
      }
      for (let i = 0; i < remaining; i++) await token(page, 'shelf:apple').click();
      for (let i = 0; i < children; i++) await token(page, 'shelf:bread').click();
      await pay(page, remaining * 80 + children * 120);
      await page.locator('#opening-go').click();
      await fillPackets(page, ['apple', 'bread'], children);
      await command(page, 'deliver').click();
      assert.equal((await state(page)).completed, true);
      await page.locator('#next').click(); await page.locator('#go-story').click();
      await token(page, 'shelf:bread').click(); await pay(page, 500);
      assert.equal((await state(page)).flags.pendingChange, 380);
      await capture(page, `${width}-change`);
      const changeSave = await save(page);
      await select(page, 'counter', play.counterPieces(await state(page)), 400);
      await command(page, 'collect').click();
      assert.equal(await save(page), changeSave, 'extra change cannot be collected');
      await returnMoney(page, 'hand');
      await select(page, 'counter', play.counterPieces(await state(page)), 300);
      await command(page, 'collect').click();
      assert.equal((await state(page)).flags.pendingChange, 80);
      await page.reload(); await page.locator('#go-story').click();
      assert.equal((await state(page)).flags.pendingChange, 80, 'old short-change save is recoverable');
      await select(page, 'counter', play.counterPieces(await state(page)), 80);
      await command(page, 'collect').click();
      assert.equal((await state(page)).flags.pendingChange, 0);
      await page.locator('#opening-go').click();
      await fillPackets(page, ['bread'], 1);
      await command(page, 'deliver').click();
      assert.equal((await state(page)).completed, true);
      await page.locator('#next').click();
      assert.equal((await state(page)).level, 3);
      assert.equal(await page.locator('.opening-scene').count(), 0, 'later chapters retain their existing gameplay');
      await context.close();
      console.log(`${width}×${height}, ${children} children: three chapters, reversible choices, wrong attempts, partial saves and keyboard passed`);
    }
    for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(({ key, initial }) => localStorage.setItem(key, JSON.stringify(initial)), { key: storage.SAVE_KEY, initial: { state: model.createGame({ gender: 'girl', children: 2 }), checkpoint: model.createGame({ gender: 'girl', children: 2 }), lang: 'mn-Mong' } });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}economic.html`); await page.locator('#go-story').click(); await page.locator('.opening-scene').waitFor();
      await capture(page, `${width}-mongolian`);
      const before = await save(page);
      await token(page, 'shelf:apple').click();
      await page.locator('#language').selectOption('ja');
      assert.equal(await page.locator('[data-play-token^="basket:"]').count(), 1, 'language switch keeps the draft');
      assert.deepEqual((await state(page)), JSON.parse(before).state, 'language selection changes no economic fact');
      await page.locator('#town').click(); await page.locator('[data-place="shop"]').first().click();
      assert.equal(await page.locator('[data-play-token^="basket:"]').count(), 0, 'navigation discards unconfirmed draft');
      await context.close();
    }
    assert.deepEqual(errors, [], 'no runtime exceptions');
    assert.deepEqual(geometry, [], 'batched phone/landscape/vertical-script layout checks');
    console.log('Opening gameplay browser regression passed.');
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.httpServer.close(resolve));
    await source.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
