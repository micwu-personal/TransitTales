const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { createServer, preview } = await import('vite');
  const source = await createServer({ logLevel: 'error' });
  let production, browser;
  try {
    const model = await source.ssrLoadModule(path.resolve('src', 'economic', 'model.ts'));
    const storage = await source.ssrLoadModule(path.resolve('src', 'economic', 'storage.ts'));
    const guidance = await source.ssrLoadModule(path.resolve('src', 'economic', 'narration-guidance.ts'));
    const narration = await source.ssrLoadModule(path.resolve('src', 'economic', 'narration.ts'));
    const opening = await source.ssrLoadModule(path.resolve('src', 'economic', 'opening-play.ts'));
    async function first3playPurchase(page, state) {
      await page.locator('[data-play-token="shelf:apple"]').click();
      const pieces = opening.pursePieces(state), amount = 80;
      const subsets = new Map([[0, []]]);
      pieces.forEach((value, index) => {
        for (const [total, indices] of [...subsets]) if (total + value <= amount && !subsets.has(total + value)) subsets.set(total + value, [...indices, index]);
      });
      assert(subsets.has(amount));
      for (const index of subsets.get(amount)) await page.locator(`[data-play-token="purse:${index}"]`).click();
      await page.locator('[data-play-command="pay"]').click();
    }
    const manifest = JSON.parse(fs.readFileSync(path.resolve('public', 'audio', 'economic', 'manifest.json'), 'utf8'));
    assert.equal(manifest.complete, true);
    const sequences = new Function('return ' + fs.readFileSync(path.resolve('tests', 'economic-life.test.ts'), 'utf8').match(/const sequences = ([\s\S]*?);\r?\nfunction entry/)[1])();
    production = await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    const base = process.env.ECONOMIC_AUDIO_URL || production.resolvedUrls.local[0];
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : undefined);
    browser = await chromium.launch({ headless: true, executablePath });
    const results = [], errors = [], failures = [], artifacts = path.resolve('artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    for (const gender of ['boy', 'girl']) for (const width of [390, 1440]) for (const level of [0, 6]) {
      let state = model.createGame({ children: 1, gender });
      for (let i = 0; i < level; i++) {
        for (const id of sequences[i]) { const result = model.act(state, id); assert(result.ok, `${i}:${id}`); state = result.state; }
        state = model.advance(state);
      }
      const checkpoint = JSON.parse(JSON.stringify(state));
      if (level) state = model.act(state, 'observe-shelf').state;
      assert(storage.loadGame({ getItem: () => JSON.stringify({ state, checkpoint, lang: 'zh' }) }), 'Fixture must be a valid continued game');
      const draft = opening.moveBasket(state, opening.emptyOpening(), 'apple', 1);
      const pieces = opening.pursePieces(state);
      draft.tender = pieces.map((value, index) => value === 10 ? index : -1).filter(index => index >= 0).slice(0, 8);
      const result = level ? model.act(state, 'buy-apple') : opening.payOpening(state, draft, { empty: {}, budget: {}, exact: {} });
      assert(result.ok);
      const amount = level ? 150 : 80;
      const cues = level ? guidance.outcomeNarration(state, result.state, result.message, 'zh') : [
        ...guidance.outcomeNarration(state, result.state, undefined, 'zh'),
        ...(!result.state.completed ? narration.scriptIds([model.getGuidance(result.state).message]) : [])
      ];
      const changes = guidance.outcomeChanges(state, result.state);
      const cashIndex = cues.findIndex(cue => Array.isArray(cue) && cue.includes('legacy.common.change-down'));
      const itemIndex = cues.findIndex(cue => Array.isArray(cue) && cue.includes('ui.bag-item'));
      assert(cues[cashIndex].includes(`money.home.${amount}`));
      assert(cues[itemIndex].includes('ui.item-count.item.1'));
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(({ state, checkpoint, key }) => {
        localStorage.setItem(key, JSON.stringify({ state, checkpoint, lang: 'zh' }));
        const AudioClass = window.Audio;
        window.__players = []; window.__ended = []; window.__played = []; window.__audioErrors = [];
        window.Audio = function (...args) {
          const audio = new AudioClass(...args); window.__players.push(audio);
          audio.addEventListener('playing', () => window.__played.push({ ids: JSON.parse(audio.dataset.narrationScripts), url: audio.src, at: performance.now(), duration: audio.duration }));
          audio.addEventListener('ended', () => window.__ended.push({ ids: JSON.parse(audio.dataset.narrationScripts), at: performance.now() }));
          audio.addEventListener('error', () => window.__audioErrors.push(audio.src));
          return audio;
        };
        window.Audio.prototype = AudioClass.prototype;
        const originalFetch = window.fetch;
        window.fetch = (...args) => originalFetch(...args).then(response => {
          if (String(args[0]).endsWith('audio/economic/manifest.json')) response.clone().json().then(data => { window.__ready = data.complete; });
          return response;
        });
      }, { state, checkpoint, key: storage.SAVE_KEY });
      try {
        await page.goto(new URL('economic.html', base).href);
        await page.waitForFunction(() => window.__ready === true);
        if (await page.locator('#voice-toggle').getAttribute('aria-pressed') === 'false') await page.locator('#voice-toggle').click();
        await page.locator('#go-story').click();
        if (await page.locator('[data-ui="stop"]').isEnabled()) await page.locator('[data-ui="stop"]').click();
        await page.evaluate(() => { window.__ended = []; window.__played = []; window.__audioErrors = []; });
        if (level) {
          await page.locator('[data-product="buy-apple"]').click();
          if (await page.locator('[data-ui="stop"]').isEnabled()) await page.locator('[data-ui="stop"]').click();
          await page.evaluate(() => { window.__ended = []; window.__played = []; });
          await page.locator('[data-action="buy-apple"]').click();
          assert((await page.locator('.spoken').textContent()).includes('背包里多了1个苹果'));
        } else {
          await first3playPurchase(page, state);
          const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).state, storage.SAVE_KEY);
          assert.deepEqual(saved, JSON.parse(JSON.stringify(result.state)), 'Opening purchase persists exact cash/apple changes');
        }
        assert.equal(await page.locator('.transfer-receipt').count(), 1, 'Explicit cash and item outcome remains visible');
        const displayed = await page.locator('.transfer-receipt').innerText();
        for (const row of changes) assert(displayed.includes(guidance.outcomeChangeText(row, 'zh')));
        assert.equal(await page.locator('.transfer-row').count(), changes.length);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1));
        // No seeking: finish both change sentences and the opening's next guidance.
        const expected = (level ? cues.slice(0, itemIndex + 1) : cues).map(cue => typeof cue === 'string' ? [cue] : [...cue]);
        await page.waitForFunction(count => window.__ended.length >= count, expected.length, { timeout: 60000 });
        const evidence = await page.evaluate(() => ({ played: window.__played, ended: window.__ended, players: window.__players.length, errors: window.__audioErrors, status: document.querySelector('.narration-status').textContent }));
        assert.deepEqual(evidence.ended.slice(0, expected.length).map(cue => cue.ids), expected);
        for (const index of [cashIndex, itemIndex]) {
          assert(evidence.played[index].url.startsWith('blob:'));
          assert(evidence.played[index].duration > 0 && evidence.played[index].duration < 15);
        }
        assert.equal(evidence.players, 1); assert.deepEqual(evidence.errors, []); assert.equal(evidence.status, '');
        const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).state, storage.SAVE_KEY);
        assert.deepEqual(saved, JSON.parse(JSON.stringify(result.state)));
        const gaps = evidence.played.slice(1, expected.length).map((cue, index) => Math.round(cue.at - evidence.ended[index].at));
        if (await page.locator('[data-ui="stop"]').isEnabled()) await page.locator('[data-ui="stop"]').click();
        await page.screenshot({ path: path.join(artifacts, `economic-chinese-outcome-${gender}-${width}-${amount}.png`) });
        results.push({ gender, width, level, amount, displayed, unseekedCompletedCues: expected.length, cashClauseSeconds: evidence.played[cashIndex].duration, itemClauseSeconds: evidence.played[itemIndex].duration, interCuePreparationMs: gaps, retainedAudioElements: evidence.players });
        console.log(JSON.stringify(results.at(-1)));
      } catch (error) {
        failures.push(`${gender}/${width}/chapter ${level + 1}: ${error.message}`);
        console.error(failures.at(-1));
      } finally { await context.close(); }
    }
    assert.deepEqual(failures, [], 'All Chinese opening/later outcomes must retain visible and narrated exact cash/item changes');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(artifacts, 'economic-chinese-outcome-results.json'), JSON.stringify(results, null, 2));
    console.log('Eight Chinese desktop/mobile boy/girl purchase cases: explicit cash/apple changes and unseeked 0.80/1.50 amount clauses passed. Not native-pronunciation or physical-device certification.');
  } finally {
    await browser?.close();
    await new Promise(resolve => production ? production.httpServer.close(resolve) : resolve());
    await source.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
