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
    const childhood = await source.ssrLoadModule(path.resolve('src', 'economic', 'childhood.ts'));
    const guidance = await source.ssrLoadModule(path.resolve('src', 'economic', 'family-guidance.ts'));
    const opening = await source.ssrLoadModule(path.resolve('src', 'economic', 'opening-play.ts'));
    const sequenceText = fs.readFileSync(path.resolve('tests','economic-life.test.ts'),'utf8');
    const sequences = new Function('return '+sequenceText.match(/const sequences = ([\s\S]*?);\r?\nfunction entry/)[1])();
    let progressed = model.createGame({gender:'girl',children:1});
    const entries = new Map([[0,structuredClone(progressed)]]);
    for (const route of sequences) {
      for (const id of route) { const result = model.act(progressed,id); assert(result.ok,`Campaign setup: ${id}`); progressed = result.state; }
      progressed = model.advance(progressed); entries.set(progressed.level,structuredClone(progressed));
    }
    const routes = new Map();
    function storyRoute(id) {
      if(routes.has(id))return routes.get(id);
      const queue = [{state:childhood.createChildhood(id,progressed.family,progressed.seed),route:[]}], seen = new Set();
      for (let index=0;index<queue.length&&index<20000;index++) {
        const {state,route}=queue[index]; if(state.completed){routes.set(id,route);return route;}
        if(route.length>=48) continue;
        for(const choice of childhood.childhoodView(state).choices.filter(choice=>!choice.disabled)) {
          const result=childhood.actChildhood(state,choice.id); if(!result.ok) continue;
          const {stage,day,envelope,inventory,flags,completed}=result.state;
          const key=JSON.stringify({stage,day,envelope,inventory,flags,completed});
          if(!seen.has(key)){seen.add(key);queue.push({state:result.state,route:[...route,choice.id]});}
        }
      }
      throw Error(`No bounded UI route for ${id}`);
    }
    production = await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    const base = process.env.ECONOMIC_AUDIO_URL || production.resolvedUrls.local[0];
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
    const results = [], errors = [], layoutErrors = [], artifacts = path.resolve('artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    async function fixture(state, lang, width, height, reducedMotion = 'no-preference') {
      const checkpoint = JSON.parse(JSON.stringify(state));
      assert(storage.loadGame({ getItem: () => JSON.stringify({ state, checkpoint, lang }) }), 'Browser fixture must preserve a valid campaign entry');
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(({ state, checkpoint, lang, key }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ state, checkpoint, lang }));
        if (!localStorage.getItem('transit-tales-economic-audio-v1')) localStorage.setItem('transit-tales-economic-audio-v1', JSON.stringify({ voice: false, effects: false }));
        const AudioClass = window.Audio;
        window.__plays = [];
        window.Audio = function (...args) {
          const audio = new AudioClass(...args);
          audio.addEventListener('playing', () => window.__plays.push(JSON.parse(audio.dataset.narrationScripts)));
          return audio;
        };
        window.Audio.prototype = AudioClass.prototype;
      }, { state, checkpoint, lang, key: storage.SAVE_KEY });
      await page.goto(new URL('economic.html', base).href);
      return { context, page };
    }
    async function layout(page, label) {
      const result = await page.evaluate(() => {
        const rect = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        const overlap = (a, b) => a && b && Math.min(a.right, b.right) > Math.max(a.x, b.x) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.y, b.y) + 1;
        const footer = rect('.game-footer'), places = rect('.location-strip'), tools = rect('.game-tools');
        const complete = rect('.town-complete'), conversation = rect('.conversation'), wish = rect('.wish-note'), header = rect('.game-header');
        return { panelOutside: [conversation,complete].some(r => r && (r.x < -1 || r.right > innerWidth+1 || r.y < -1 || r.bottom > innerHeight+1)), viewportOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1, footer, places, tools, complete, conversation, footerCollision: overlap(places, tools), completionCollision: overlap(complete, places) || overlap(complete, tools), conversationCollision: overlap(conversation, footer), goalCollision: overlap(conversation,wish) || overlap(complete,wish), headerCollision: overlap(conversation,header) };
      });
      for (const [key,message] of Object.entries({panelOutside:'action panel clipped by the screen',viewportOverflow:'viewport overflow',footerCollision:'controls cover places',completionCollision:'places cover the next-round reward',conversationCollision:'conversation covers footer',goalCollision:'dialogue or reward covers the goal',headerCollision:'dialogue covers the header'})) if(result[key]) layoutErrors.push(`${label}: ${message}`);
      if (result.conversation && result.conversation.height < 80) layoutErrors.push(`${label}: unusably short dialogue`);
      return result;
    }
    const playToken = (page, token) => page.locator(`[data-play-token="${token}"]`);
    const playCommand = (page, command) => page.locator(`[data-play-command="${command}"]`);
    const basketItems = (page, item) => page.locator(`.opening-basket [data-play-token$=":${item}"]`);
    const savedGame = page => page.evaluate(key => localStorage.getItem(key), storage.SAVE_KEY);
    const savedState = async page => JSON.parse(await savedGame(page)).state;
    async function unchanged(page, before, label) {
      assert.equal(await savedGame(page), before, label);
    }
    function expectedAction(state, id, quantity) {
      const result = model.act(state, id, quantity);
      assert(result.ok, `Expected campaign action ${state.level}:${id}`);
      return result.state;
    }
    function pieceIndices(pieces, amount) {
      const sums = new Map([[0, []]]);
      pieces.forEach((value, index) => {
        for (const [total, indices] of [...sums]) {
          if (total + value <= amount && !sums.has(total + value)) sums.set(total + value, [...indices, index]);
        }
      });
      assert(sums.has(amount), `Available pieces must make ${amount} cents exactly`);
      return sums.get(amount);
    }
    async function pickMoney(page, source, pieces, amount) {
      const target = source === 'purse' ? 'tender' : 'hand';
      assert.equal(await page.locator(`[data-play-zone="${target}"] [data-play-token]`).count(), 0, 'Payment/change starts empty, never target-prefilled');
      for (const [selected, index] of pieceIndices(pieces, amount).entries()) {
        await playToken(page, `${source}:${index}`).click();
        assert.equal(await playToken(page, `${target}:${index}`).getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator(`[data-play-zone="${target}"] [data-play-token]`).count(), selected + 1, 'One tap moves exactly one stable-index coin');
      }
    }
    async function openingPurchase(page, goods) {
      const before = await savedGame(page), state = JSON.parse(before).state;
      let expected = state;
      if (!state.flags.tags && state.level !== 1) expected = expectedAction(expected, state.level === 0 ? 'read-tags' : 'check-price');
      let total = 0;
      for (const [item, quantity] of Object.entries(goods)) {
        for (let i = 0; i < quantity; i++) {
          await playToken(page, `shelf:${item}`).click();
          assert.equal(await basketItems(page, item).count(), i + 1, 'One shelf tap adds one unit, not both a pointer and click unit');
        }
        total += model.getPrices(state).find(price => price.id === item).price * quantity;
        if (state.level < 2) expected = expectedAction(expected, `buy-${item}`, quantity);
      }
      if (state.level === 2) expected = expectedAction(expected, 'pay-note');
      await pickMoney(page, 'purse', opening.pursePieces(state), state.level === 2 ? 500 : total);
      await unchanged(page, before, 'Basket and tender selections do not spend, change inventory, or save');
      await playCommand(page, 'pay').click();
      assert.deepEqual(await savedState(page), expected, 'Explicit confirmation applies exactly the campaign purchase, including ledger, flags and cash');
      assert.equal(await page.locator('.opening-basket [data-play-token]').count(), 0, 'Confirmed basket is cleared');
      return expected;
    }
    async function purchase(page, id, quantity = 1) {
      if (await page.locator('[data-opening-phase="shop"]').count()) return openingPurchase(page, { [id.replace(/^buy-/, '')]: quantity });
      await page.locator(`[data-product="${id}"]`).click();
      for (let i = 1; i < quantity; i++) await page.locator('#quantity-more').click();
      await page.locator(`[data-action="${id}"]`).click();
    }
    async function reversePayment(page) {
      const before = await savedGame(page), state = JSON.parse(before).state;
      const item = state.level === 2 ? 'bread' : 'apple';
      assert(await playCommand(page, 'pay').isDisabled());
      await playToken(page, `shelf:${item}`).click();
      assert.equal(await basketItems(page, item).count(), 1);
      assert(await playCommand(page, 'pay').isDisabled(), 'Goods alone cannot spend cash');
      await playToken(page, 'purse:0').click();
      assert.equal(await playToken(page, 'tender:0').getAttribute('aria-pressed'), 'true');
      assert.equal(await playToken(page, 'purse:0').count(), 0, 'Selected coin leaves its source, retaining its index');
      if (state.level < 2) {
        assert.notEqual(opening.pursePieces(state)[0], model.getPrices(state).find(price => price.id === item).price);
        await playCommand(page, 'pay').click();
        assert.equal(await page.locator('.opening-cue .choice-error').count(), 1, 'Inexact payment is rejected');
      }
      await unchanged(page, before, 'Selecting or rejecting tender never saves or spends');
      await playToken(page, 'tender:0').click();
      assert.equal(await playToken(page, 'purse:0').getAttribute('aria-pressed'), 'false');
      assert(await playCommand(page, 'pay').isDisabled(), 'Returning tender disables payment');
      await playToken(page, `basket:0:${item}`).click();
      assert.equal(await basketItems(page, item).count(), 0);
      await unchanged(page, before, 'Returning both goods and tender restores the draft without economic mutations');
    }
    async function assembleList(page) {
      const before = await savedGame(page), state = JSON.parse(before).state;
      assert.equal(await page.locator('[data-opening-phase="plan"]').count(), 1);
      assert(await playCommand(page, 'plan').isDisabled());
      await playToken(page, 'list:toy').click();
      assert.equal(await playToken(page, 'plan:0:toy').count(), 1);
      assert(await playCommand(page, 'plan').isDisabled(), 'A one-item shopping list is incomplete');
      await playToken(page, 'list:bread').click();
      assert.equal(await playToken(page, 'plan:1:bread').count(), 1);
      await playCommand(page, 'plan').click();
      assert.equal(await page.locator('.opening-cue .choice-error').count(), 1, 'Toy and bread are not a valid lunch list');
      await unchanged(page, before, 'An incorrect shopping list never commits or travels');
      assert.equal(await page.locator('#visit-home').getAttribute('aria-current'), 'location');
      await playToken(page, 'plan:0:toy').click();
      assert.equal(await playToken(page, 'plan:0:bread').count(), 1, 'Removing a list item reassembles the remaining slots');
      await playToken(page, 'list:apple').click();
      assert.equal(await playToken(page, 'plan:1:apple').count(), 1);
      await unchanged(page, before, 'List assembly and reversal are noncommitting drafts');
      await playCommand(page, 'plan').click();
      assert.deepEqual(await savedState(page), expectedAction(state, 'make-list'));
      assert.equal(await page.locator('[data-opening-phase="shop"]').count(), 1, 'A valid apple/bread list automatically travels to the shop');
      assert.equal(await page.locator('#visit-shop').getAttribute('aria-current'), 'location');
    }
    async function packFood(page, items, recipients) {
      const before = await savedGame(page);
      assert(await playCommand(page, 'deliver').isDisabled(), 'Delivery requires every target to be filled');
      await playToken(page, `food:${items[0]}`).click();
      assert.equal(await playToken(page, `food:${items[0]}`).getAttribute('aria-pressed'), 'true');
      await playToken(page, `food:${items[0]}`).click();
      assert.equal(await playToken(page, `food:${items[0]}`).getAttribute('aria-pressed'), 'false', 'Tapping held food again puts it back');
      for (let child = 0; child < recipients; child++) {
        for (const item of items) {
          await playToken(page, `food:${item}`).click();
          await page.locator(`[data-play-packet="${child}"]`).click();
          assert.equal(await playToken(page, `packet:${child}:${item}`).count(), 1, 'A target receives exactly one food unit');
          assert.equal(await playToken(page, `food:${item}`).getAttribute('aria-pressed'), 'false', 'Assignment releases held food');
          if (child === 0 && item === items[0]) {
            await playToken(page, `packet:${child}:${item}`).click();
            assert.equal(await playToken(page, `packet:${child}:${item}`).count(), 0);
            assert(await playCommand(page, 'deliver').isDisabled(), 'Returning assigned food makes delivery incomplete');
            await unchanged(page, before, 'Food selection, assignment and reversal do not consume saved inventory');
            await playToken(page, `food:${item}`).click();
            await page.locator(`[data-play-packet="${child}"]`).click();
          }
          const assigned = child * items.length + items.indexOf(item) + 1;
          assert.equal(await playCommand(page, 'deliver').isDisabled(), assigned < recipients * items.length);
        }
      }
      assert.equal(await page.locator('.packet-ready').count(), recipients);
      await unchanged(page, before, 'Packing every food target remains a noncommitting draft');
      const expected = expectedAction(JSON.parse(before).state, ['share-apples', 'pack-lunch', 'deliver-bread'][JSON.parse(before).state.level]);
      await playCommand(page, 'deliver').click();
      assert.deepEqual(await savedState(page), expected, 'Delivery consumes food and completes the round exactly once');
    }
    async function dragToken(page, token, zone) {
      const from = playToken(page, token), to = page.locator(`[data-play-zone="${zone}"]`);
      await from.scrollIntoViewIfNeeded();
      const start = await from.boundingBox(), end = await to.boundingBox();
      assert(start && end && end.y >= 0 && end.y + end.height <= page.viewportSize().height, 'Drag destination is on screen');
      await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
      await page.mouse.down();
      await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(100); // Allow the post-drag click-suppression window to expire before the next independent tap.
      assert.equal(await page.locator('.opening-drag-ghost').count(), 0);
    }
    async function storyAction(page, id) {
      const preview = page.locator(`[data-childhood-select="${id}"]`);
      if (await preview.count()) await preview.click();
      const change = page.locator(`[data-change-select="${id}"]`);
      if (await change.count()) { await change.click(); await collectPieces(page); }
      else await page.locator(`[data-childhood-action="${id}"]`).click();
    }
    async function collectPieces(page) {
      const pieces = page.locator('.counter-side:not(.receiving-pocket) [data-money-piece]');
      while (await pieces.count()) await pieces.first().click();
      await page.locator('#confirm-change').click();
    }
    const functionalOnly=process.argv.includes('--functional-only');
    if(!functionalOnly){
    for (const lang of ['zh', 'en', 'ja', 'mn', 'mn-Mong']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(new URL('economic.html', base).href);
      await page.locator('#setup-language').selectOption(lang);
      assert.equal(await page.locator('#setup-voice-toggle').getAttribute('aria-pressed'), 'false');
      assert(await page.locator('#setup-voice-toggle').isVisible(), 'The family-picker voice switch must be reachable');
      await page.locator('#setup-voice-toggle').click();
      assert.equal(await page.locator('#setup-voice-toggle').getAttribute('aria-pressed'), 'true');
      await page.locator('#setup-voice-toggle').click();
      assert.equal(await page.locator('#setup-voice-toggle').getAttribute('aria-pressed'), 'false');
      await page.screenshot({ path: path.join(artifacts, `economic-setup-${lang}.png`) });
      await page.locator('#start').click();
      assert.equal(await page.locator('[data-opening-phase="shop"]').count(), 1);
      assert(await page.evaluate(() => Boolean(document.querySelector('.game-header .game-tools').compareDocumentPosition(document.querySelector('#language')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'Utilities precede language selection in the header');
      const beforeSelection = await savedGame(page);
      await playToken(page, 'shelf:apple').click();
      assert.equal(await basketItems(page, 'apple').count(), 1);
      await unchanged(page, beforeSelection, 'Localized shelf interaction is a draft, not a purchase');
      await layout(page, `${lang} staged shopping 390x844`);
      await page.screenshot({ path: path.join(artifacts, `economic-shopping-${lang}.png`) });
      await context.close();
    }
    for (const [lang, width, height] of [['zh',1440,900],['zh',390,844],['zh',320,568],['zh',844,390],['mn-Mong',390,844],['mn-Mong',320,568]]) {
      const start = entries.get(2);
      const entry = model.act(model.act(start,'check-price').state,'pay-note').state;
      const {page,context} = await fixture(start,lang,width,height);
      await page.locator('#go-story').click();
      await purchase(page, 'buy-bread');
      assert.deepEqual(await savedState(page), entry);
      const savedBefore = await savedGame(page);
      assert(await playCommand(page, 'collect').isDisabled());
      assert.equal(await page.locator('[data-play-zone="hand"] [data-play-token]').count(), 0);
      await playToken(page, 'counter:0').click();
      assert.equal(await playToken(page, 'hand:0').getAttribute('aria-pressed'), 'true');
      await playCommand(page, 'collect').click();
      assert.equal(await page.locator('.opening-cue .choice-error').count(), 1, 'A wrong amount is rejected rather than selecting a prefilled answer');
      await unchanged(page, savedBefore, 'Rejected change does not credit the wallet');
      await playToken(page, 'hand:0').click();
      assert.equal(await playToken(page, 'counter:0').getAttribute('aria-pressed'), 'false');
      assert(await playCommand(page, 'collect').isDisabled());
      await unchanged(page, savedBefore, 'Picking up and putting back money must not affect the saved wallet');
      await page.screenshot({path:path.join(artifacts,`economic-change-${lang}-${width}x${height}.png`)});
      const geometry = await layout(page,`${lang} coin collection ${width}x${height}`);
      results.push({lang,width,height,geometry,partialChange:true});
      await pickMoney(page, 'counter', opening.counterPieces(entry), 300);
      await unchanged(page, savedBefore, 'Selecting partial change does not save before collection');
      await playCommand(page, 'collect').click();
      const partial = await savedState(page);
      assert.deepEqual(partial, expectedAction(entry, 'leave-change'));
      assert.equal(partial.cash,entry.cash+300); assert.equal(partial.flags.pendingChange,80);
      assert((await page.locator('.opening-cue').innerText()).trim().length > 0, 'Partial collection has visible movement feedback');
      assert.equal(await page.locator('.opening-change-receipt').count(), 1);
      const partialSave = await savedGame(page);
      await pickMoney(page, 'counter', opening.counterPieces(partial), 80);
      await unchanged(page, partialSave, 'The remaining change is a draft, not new income');
      await playCommand(page, 'collect').click();
      const final = await savedState(page);
      assert.deepEqual(final, expectedAction(partial, 'collect-rest'));
      assert.equal(final.cash,entry.cash+380); assert.equal(final.flags.pendingChange,0);
      assert.equal(final.cash, start.cash - 120, 'Bread price is deducted exactly once after both collections');
      assert.equal(await page.locator('[data-opening-phase="change"]').count(),0);
      assert.equal(await page.locator('.opening-cue [data-place="school"]').count(), 1);
      await context.close();
    }
    for (const children of [1, 2, 3]) {
      const { page, context } = await fixture(model.createGame({ gender: 'boy', children }), 'zh', 390, 844);
      await page.locator('#go-story').click();
      const beforeSelection = await savedGame(page);
      await playToken(page, 'shelf:apple').click();
      assert.equal(await basketItems(page, 'apple').count(), 1);
      if (children > 1) {
        await playToken(page, 'shelf:apple').click();
        assert.equal(await basketItems(page, 'apple').count(), 2);
        await playToken(page, 'basket:1:apple').click();
        assert.equal(await basketItems(page, 'apple').count(), 1);
      }
      await unchanged(page, beforeSelection, 'Basket selection and unit reversal do not spend or save');
      await page.screenshot({ path: path.join(artifacts, `economic-selection-family-${children}.png`) });
      await playToken(page, 'basket:0:apple').click();
      await unchanged(page, beforeSelection, 'Returning the whole basket does not spend or save');
      assert.equal(await basketItems(page, 'apple').count(), 0);
      assert(await playCommand(page, 'pay').isDisabled());
      await purchase(page, 'buy-apple', children);
      const hint = await page.locator('.opening-cue').innerText();
      assert(hint.includes('家'), 'The successful purchase must explicitly lead home');
      assert.equal(await page.locator('.opening-cue [data-place="home"]').count(), 1);
      if (children === 1) assert(!(await page.locator('.wish-note').innerText()).includes('每个孩子'));
      await page.locator('.opening-cue [data-place="home"]').click();
      await packFood(page, ['apple'], children);
      assert.equal(await page.locator('.round-celebration').count(), 1);
      assert.equal(await page.locator('.completion-keepsake').count(), 1);
      await page.locator('#settings').click();
      assert.equal(await page.locator('.panel-settings').count(), 1);
      assert.equal(await page.locator('#toggle-sound').getAttribute('aria-pressed'), 'false');
      await page.locator('#close').click();
      await page.reload();
      assert.equal(await page.locator('#voice-toggle').getAttribute('aria-pressed'), 'false');
      assert.deepEqual(await page.evaluate(() => window.__plays), []);
      assert.equal(await page.locator('.round-celebration').count(), 0, 'A restored result must not replay the reward animation');
      const geometry = await layout(page, `Chinese family of ${children}`);
      await page.screenshot({ path: path.join(artifacts, `economic-guidance-family-${children}.png`) });
      results.push({ children, hint, geometry });
      await context.close();
    }
    for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [320, 568], [844, 390]]) {
      for (const lang of ['zh', 'mn-Mong']) {
        const { page, context } = await fixture(model.createGame({ gender: 'girl', children: 1 }), lang, width, height, 'reduce');
        await page.locator('#go-story').click();
        await purchase(page, 'buy-apple');
        await page.locator('.opening-cue [data-place="home"]').click();
        await packFood(page, ['apple'], 1);
        assert.equal(await page.locator('.action-moment').count(), 0);
        assert.equal(await page.locator('.opening-flight').count(), 0, 'Reduced motion also suppresses tangible-object flights');
        await page.locator('#journal').click();
        await page.locator('#journal-map').click();
        const geometry = await layout(page, `${lang} ${width}x${height}`);
        await page.screenshot({ path: path.join(artifacts, `economic-reward-${lang}-${width}-${height}.png`) });
        await page.locator('#next-town').click();
        assert.equal(await page.locator('.town-complete').count(), 0);
        await page.locator('#goal-help').click();
        assert.equal(await page.locator('.help-hint').count(), 1);
        assert.equal(await page.locator('.panel-help').count(), 1);
        results.push({ lang, width, height, geometry, reducedMotion: true });
        await context.close();
      }
    }
    for (const [lang,width,height] of [['zh',390,844],['mn-Mong',320,568],['mn-Mong',1440,900]]) {
      for(const story of childhood.CHILDHOOD_STORIES) {
        const route=storyRoute(story.id), {page,context}=await fixture(progressed,lang,width,height);
        const mainBefore=await page.evaluate(key=>localStorage.getItem(key),storage.SAVE_KEY);
        const sideKey=`transit-tales-economic-childhood-v1:${progressed.seed}:${progressed.family.gender}:${progressed.family.children}:${story.id}`;
        await page.locator('#journal').click(); await page.locator(`[data-childhood="${story.id}"]`).click();
        assert((await page.locator('.game-name').innerText()).includes(String(story.age)),'Memory uses the historical childhood age');
        assert.equal(await page.locator('.location-strip').isVisible(),false);
        assert.equal(await page.locator('.childhood-conversation').count(),1);
        const geometry=await layout(page,`${story.id} ${lang} ${width}x${height}`);
        await page.screenshot({path:path.join(artifacts,`economic-side-${story.id}-${lang}-${width}.png`)});
        if(await page.locator('[data-childhood-quote]').count()) {
          const before=await page.evaluate(key=>localStorage.getItem(key),sideKey);
          await page.locator('[data-childhood-quote]').first().click();
          assert.equal(await page.evaluate(key=>localStorage.getItem(key),sideKey),before,'Listening never spends the envelope');
        }
        await storyAction(page, route[0]);
        const savedSide=await page.evaluate(key=>localStorage.getItem(key),sideKey);
        assert(savedSide && childhood.validateChildhood(JSON.parse(savedSide)));
        await page.reload(); assert.equal(await page.locator('.childhood-conversation').count(),1);
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),sideKey),savedSide,'Resume preserves the story');
        assert.equal(await page.locator('.round-celebration').count(),0);
        await page.locator('#goal-help').click(); await page.locator('#help-retry').click(); await page.locator('[data-ui="confirm-retry"]').click();
        assert.equal(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),sideKey)).history.length,0,'Retry resets this envelope only');
        for(const id of route) await storyAction(page, id);
        assert.equal(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),sideKey)).completed,true);
        assert.equal(await page.locator('.round-celebration').count(),1);
        await layout(page,`${story.id} ${lang} ${width}x${height} reward`);
        await page.locator('#leave-childhood-result').click();
        assert.equal(await page.locator('.childhood-conversation').count(),0);
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),storage.SAVE_KEY),mainBefore,'Side stories never alter main money, debt, age, ledger or checkpoint');
        await page.reload(); assert.equal(await page.locator('.childhood-conversation').count(),0);
        results.push({story:story.id,lang,width,height,route,geometry,isolated:true,resumed:true,retried:true});
        await context.close();
      }
    }
    {
      const {page,context}=await fixture(entries.get(2),'zh',390,844);
      await page.locator('#childhood-open').click(); assert.equal(await page.locator('[data-childhood="market"]').isEnabled(),true);
      assert.equal(await page.locator('[data-childhood="travel"]').isDisabled(),true); await context.close();
    }
    fs.writeFileSync(path.join(artifacts,'economic-childhood-ui-results.json'),JSON.stringify(results,null,2));
    }
    for (const children of [1, 2, 3]) {
      let expected = model.createGame({ gender: 'girl', children });
      const {page, context} = await fixture(expected, 'zh', 390, 844, 'reduce');
      await page.locator('#go-story').click();
      await reversePayment(page);
      expected = await purchase(page, 'buy-apple', children);
      assert.equal(expected.cash, model.createGame({ gender: 'girl', children }).cash - children * 80);
      assert.equal(await page.locator('.opening-cue [data-place="home"]').count(), 1);
      await page.locator('.opening-cue [data-place="home"]').click();
      await packFood(page, ['apple'], children);
      expected = expectedAction(expected, 'share-apples');
      await page.locator('#next').click();
      expected = model.advance(expected);
      assert.deepEqual(await savedState(page), expected, 'Next chapter preserves family and carries the confirmed wallet forward');
      await page.locator('#go-story').click();
      await assembleList(page);
      expected = expectedAction(expected, 'make-list');
      await reversePayment(page);
      if (children === 2) {
        expected = await purchase(page, 'buy-apple');
        assert.equal(expected.flags.bought_apple, 1);
        assert.equal(await page.locator('.opening-cue [data-place="school"]').count(), 0, 'An incomplete shopping list must not lead to delivery');
        expected = await purchase(page, 'buy-apple');
        assert.equal(await playToken(page, 'shelf:apple').isDisabled(), true, 'Bought family quantities cannot be bought again');
        expected = await purchase(page, 'buy-bread', children);
      } else expected = await openingPurchase(page, { apple: children, bread: children });
      assert.equal(expected.flags.spent, children * 200);
      assert.equal(expected.inventory.apple, children); assert.equal(expected.inventory.bread, children);
      assert.equal(await page.locator('.opening-cue [data-place="school"]').count(), 1, 'Completed list points to school, not home');
      await page.locator('.opening-cue [data-place="school"]').click();
      assert.equal(await page.locator('.opening-packet').count(), children);
      await packFood(page, ['apple', 'bread'], children);
      expected = expectedAction(expected, 'pack-lunch');
      await page.locator('#next').click();
      expected = model.advance(expected);
      assert.deepEqual(await savedState(page), expected);
      await page.locator('#go-story').click();
      await reversePayment(page);
      const cashBeforeBread = expected.cash;
      expected = await purchase(page, 'buy-bread');
      assert.equal(expected.cash, cashBeforeBread - 500);
      assert.equal(expected.flags.pendingChange, 380);
      assert.equal(expected.inventory.bread, 1, 'The third chapter buys one classmate bread regardless of family size');
      const paidSave = await savedGame(page), coins = opening.counterPieces(expected);
      assert(coins.reduce((sum, value) => sum + value, 0) > 380, 'The counter includes distractor money, not only the correct answer');
      await pickMoney(page, 'counter', coins, coins.reduce((sum, value) => sum + value, 0));
      await playCommand(page, 'collect').click();
      assert.equal(await page.locator('.opening-cue .choice-error').count(), 1, 'Taking all distractor coins is rejected');
      await unchanged(page, paidSave, 'Over-collection does not mutate pending change or cash');
      for (let index = 0; index < coins.length; index++) await playToken(page, `hand:${index}`).click();
      assert(await playCommand(page, 'collect').isDisabled());
      await unchanged(page, paidSave, 'Returning the entire change selection cancels without crediting money');
      await pickMoney(page, 'counter', coins, children === 2 ? 300 : 380);
      await unchanged(page, paidSave, 'Change is not credited until collection');
      await playCommand(page, 'collect').click();
      expected = expectedAction(expected, children === 2 ? 'leave-change' : 'collect-change');
      assert.deepEqual(await savedState(page), expected);
      if (children === 2) {
        assert.equal(expected.cash, cashBeforeBread - 200); assert.equal(expected.flags.pendingChange, 80);
        assert.equal(await page.locator('[data-opening-phase="change"]').count(), 1);
        assert.equal(await page.locator('.opening-cue [data-place="school"]').count(), 0, 'Partial change must not lead to school prematurely');
        const partialSave = await savedGame(page);
        await pickMoney(page, 'counter', opening.counterPieces(expected), 80);
        await unchanged(page, partialSave, 'Picking the remaining 80 cents does not save before collection');
        await playCommand(page, 'collect').click();
        expected = expectedAction(expected, 'collect-rest');
        assert.deepEqual(await savedState(page), expected);
      }
      assert.equal(expected.cash, cashBeforeBread - 120);
      assert.equal(expected.flags.pendingChange, 0);
      assert.equal(await page.locator('.opening-cue [data-place="school"]').count(), 1);
      await page.locator('.opening-cue [data-place="school"]').click();
      assert.equal(await page.locator('.opening-packet').count(), 1, 'Only the classmate target needs filling in chapter three');
      await packFood(page, ['bread'], 1);
      expected = expectedAction(expected, 'deliver-bread');
      await page.locator('#next').click();
      expected = model.advance(expected);
      assert.deepEqual(await savedState(page), expected);
      await page.locator('#go-story').click();
      assert.equal(await page.locator('.opening-scene').count(), 0, 'Later chapters retain their stepped interface');
      assert.equal(await page.locator('[data-action="assign-chores"]').count(), 1);
      results.push({children,openingChapters:[0,1,2],exactPayment:true,listAssembly:true,changeChallenge:true,packetReversal:true,nextChapter:true});
      await context.close();
    }
    {
      const {page, context} = await fixture(model.createGame({gender:'boy',children:2}), 'zh', 1440, 900, 'reduce');
      await page.locator('#go-story').click();
      const before = await savedGame(page);
      await dragToken(page, 'shelf:apple', 'basket');
      assert.equal(await basketItems(page, 'apple').count(), 1, 'Drag plus its compatibility click adds only one unit');
      await playToken(page, 'shelf:apple').click();
      assert.equal(await basketItems(page, 'apple').count(), 2, 'An independent tap after drag still adds exactly one unit');
      await dragToken(page, 'basket:1:apple', 'shelf');
      assert.equal(await basketItems(page, 'apple').count(), 1, 'Dragging back removes one unit only');
      await dragToken(page, 'purse:0', 'tender');
      assert.equal(await playToken(page, 'tender:0').getAttribute('aria-pressed'), 'true', 'A dragged coin stays selected instead of toggling twice');
      await dragToken(page, 'tender:0', 'purse');
      assert.equal(await playToken(page, 'purse:0').getAttribute('aria-pressed'), 'false');
      await playToken(page, 'basket:0:apple').click();
      await unchanged(page, before, 'Dragging and reversing goods/money never changes the source save');
      await playToken(page, 'shelf:toy').click();
      await pickMoney(page, 'purse', opening.pursePieces(JSON.parse(before).state), 180);
      await playCommand(page, 'pay').click();
      assert.equal(await page.locator('.opening-cue .choice-error').count(), 1, 'Exact tender still cannot buy a toy that crowds out required food');
      await unchanged(page, before, 'Budget rejection preserves all saved economics');
      results.push({openingDrag:true,noDoubleCount:true,budgetProtected:true});
      await context.close();
    }
    {
      const {page, context} = await fixture(entries.get(6), 'zh', 390, 844, 'reduce');
      await page.locator('#go-story').click();
      assert.equal(await page.locator('.opening-scene').count(), 0);
      let expected = entries.get(6);
      for (const id of ['observe-shelf', 'wait-delivery', 'unload-truck']) {
        await page.locator(`[data-action="${id}"]`).click();
        expected = expectedAction(expected, id);
      }
      const before = await savedGame(page);
      await page.locator('[data-product="buy-apple"]').click();
      assert.equal(await page.locator('[data-product="buy-apple"]').getAttribute('aria-pressed'), 'true');
      await unchanged(page, before, 'Later product-radio selection remains noncommitting');
      await page.locator('#cancel-purchase').click();
      await unchanged(page, before, 'Later purchase cancellation still preserves the wallet');
      await purchase(page, 'buy-apple');
      expected = expectedAction(expected, 'buy-apple');
      assert.deepEqual(await savedState(page), expected, 'Shared purchase helper retains later campaign economics');
      assert.equal(await page.locator('.step-detail [data-place="home"]').count(), 1);
      await page.locator('.step-detail [data-place="home"]').click();
      await page.locator('[data-action="share-apples"]').click();
      assert.deepEqual(await savedState(page), expectedAction(expected, 'share-apples'));
      results.push({laterCampaignPurchase:true,laterSelectionAndCancel:true});
      await context.close();
    }
    for(const [width,height] of [[390,844],[1280,800]]) {
      const entry=model.createGame({gender:'boy',children:1});
      const {page,context}=await fixture(entry,'zh',width,height);
      const mainBefore=await page.evaluate(key=>localStorage.getItem(key),storage.SAVE_KEY);
      assert.equal(await page.locator('#replay').isDisabled(),true);
      assert.equal(await page.locator('#stop').isDisabled(),true);
      await page.locator('#voice-toggle').click();
      await page.waitForFunction(()=>window.__plays.length>0,{},{timeout:30000}).catch(async error=>{console.error({errors,status:await page.locator('.narration-status').innerText()});throw error;});
      await page.locator('#settings').click();
      await page.waitForFunction(()=>window.__plays.flat().includes('ui.panel-settings'));
      await page.evaluate(()=>window.__plays=[]);
      await page.locator('#replay').click();
      await page.waitForFunction(()=>window.__plays.length>0);
      const expected=guidance.getGuidance(entry).message;
      const catalog=JSON.parse(fs.readFileSync(path.resolve('src','economic','narration-catalog.json'),'utf8'));
      const expectedID=catalog.scripts.find(script=>script.text.zh===expected.zh).id;
      assert.deepEqual(await page.evaluate(()=>window.__plays.flat()),[expectedID],'Speaker reads the current step, not the last settings explanation');
      assert.equal(await page.locator('#replay').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#stop').isEnabled(),true);
      await layout(page,`speaker ${width}x${height}`);
      await page.screenshot({path:path.join(artifacts,`economic-speaker-${width}.png`)});
      await page.locator('#stop').click();
      assert.equal(await page.locator('#replay').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('#stop').isDisabled(),true);
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),storage.SAVE_KEY),mainBefore,'Listening and stopping never choose or advance the game');
      await page.locator('#voice-toggle').click();
      assert.equal(await page.locator('#voice-toggle').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('#replay').isDisabled(),true);
      await page.reload(); assert.deepEqual(await page.evaluate(()=>window.__plays),[]);
      assert.equal(await page.locator('#voice-toggle').getAttribute('aria-pressed'),'false');
      results.push({width,height,voiceStarted:true,voiceOffPersisted:true,currentStepSpeaker:true,playbackIndicator:true,stop:true,noncommitting:true}); await context.close();
    }
    {
      const {page,context}=await fixture(progressed,'zh',390,844);
      const prefix=`transit-tales-economic-childhood-v1:${progressed.seed}:${progressed.family.gender}:${progressed.family.children}:`;
      const mainBefore=await page.evaluate(key=>localStorage.getItem(key),storage.SAVE_KEY);
      await page.evaluate(prefix=>{localStorage.setItem(prefix+'market','{');localStorage.setItem(prefix+'active','market');},prefix);
      await page.reload(); assert.equal(await page.locator('.childhood-conversation').count(),1);
      await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('transit-tales-economic-childhood-v1:'))throw new DOMException('Full','QuotaExceededError');return set.call(this,key,value);};});
      await storyAction(page, storyRoute('market')[0]);
      assert.equal(await page.locator('.save-warning').count(),1);
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),storage.SAVE_KEY),mainBefore);
      results.push({corruptSideSaveRecovered:true,quotaWarning:true,mainSavePreserved:true}); await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(artifacts, functionalOnly?'economic-childhood-functional-results.json':'economic-childhood-ui-results.json'), JSON.stringify(results, null, 2));
    assert.deepEqual(layoutErrors,[]);
    console.log(functionalOnly?'Opening chapters for families of 1–3, exact payment/change, shopping lists, reversible food packets, drag/tap single counts, later campaign purchases, voice controls and isolated childhood save recovery passed.':'Opening chapters for families of 1–3, exact payment/change, shopping lists, reversible food packets, drag/tap single counts, later campaign purchases, family destinations, saved voice-off, reduced-motion rewards, six isolated/resumable childhood stories and Chinese/traditional-Mongolian layouts passed.');
  } finally {
    await browser?.close();
    await new Promise(resolve => production ? production.httpServer.close(resolve) : resolve());
    await source.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
