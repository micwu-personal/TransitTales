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
    async function purchase(page, id, quantity = 1) {
      await page.locator(`[data-product="${id}"]`).click();
      for (let i = 1; i < quantity; i++) await page.locator('#quantity-more').click();
      await page.locator(`[data-action="${id}"]`).click();
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
      await page.locator('[data-action="read-tags"]').click();
      assert(await page.evaluate(() => Boolean(document.querySelector('.game-header .game-tools').compareDocumentPosition(document.querySelector('#language')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'Utilities precede language selection in the header');
      await page.locator('[data-product="buy-apple"]').click();
      await layout(page, `${lang} staged shopping 390x844`);
      await page.screenshot({ path: path.join(artifacts, `economic-shopping-${lang}.png`) });
      await context.close();
    }
    for (const [lang, width, height] of [['zh',1440,900],['zh',390,844],['zh',320,568],['zh',844,390],['mn-Mong',390,844],['mn-Mong',320,568]]) {
      const start = entries.get(2);
      const entry = model.act(model.act(start,'check-price').state,'pay-note').state;
      const {page,context} = await fixture(start,lang,width,height);
      await page.locator('#go-story').click();
      await page.locator('[data-action="check-price"]').click();
      await page.locator('[data-action="pay-note"]').click();
      const savedBefore = await page.evaluate(key => localStorage.getItem(key),storage.SAVE_KEY);
      await page.locator('[data-change-select="collect-change"]').click();
      assert(await page.locator('#confirm-change').isDisabled());
      await page.locator('#money-piece-0').click();
      assert.equal(await page.locator('#money-piece-0').getAttribute('aria-pressed'),'true');
      assert(await page.locator('#confirm-change').isDisabled());
      await page.locator('#money-piece-0').click();
      assert.equal(await page.locator('#money-piece-0').getAttribute('aria-pressed'),'false');
      assert.equal(await page.evaluate(key => localStorage.getItem(key),storage.SAVE_KEY),savedBefore,'Picking up and putting back money must not affect the saved wallet');
      await page.screenshot({path:path.join(artifacts,`economic-change-${lang}-${width}x${height}.png`)});
      await layout(page,`${lang} coin collection ${width}x${height}`);
      await page.locator('#cancel-change').click();
      assert.equal(await page.evaluate(key => localStorage.getItem(key),storage.SAVE_KEY),savedBefore);
      await page.locator('[data-change-select="leave-change"]').click();
      await collectPieces(page);
      const partial = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).state,storage.SAVE_KEY);
      assert.equal(partial.cash,entry.cash+300); assert.equal(partial.flags.pendingChange,80);
      assert(await page.locator('.transfer-receipt').isVisible());
      await page.locator('[data-change-select="collect-rest"]').click();
      await collectPieces(page);
      const final = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).state,storage.SAVE_KEY);
      assert.equal(final.cash,entry.cash+380); assert.equal(final.flags.pendingChange,0);
      assert.equal(await page.locator('.change-tray').count(),0);
      await context.close();
    }
    for (const children of [1, 2, 3]) {
      const { page, context } = await fixture(model.createGame({ gender: 'boy', children }), 'zh', 390, 844);
      await page.locator('#go-story').click();
      await page.locator('[data-action="read-tags"]').click();
      const beforeSelection = await page.evaluate(key => localStorage.getItem(key), storage.SAVE_KEY);
      await page.locator('[data-product="buy-apple"]').click();
      if (children > 1) { await page.locator('#quantity-more').click(); await page.locator('#quantity-less').click(); }
      assert.equal(await page.evaluate(key => localStorage.getItem(key), storage.SAVE_KEY), beforeSelection, 'Selection and quantity changes do not spend or save');
      assert.equal(await page.locator('[data-product="buy-apple"]').getAttribute('aria-pressed'), 'true');
      await page.screenshot({ path: path.join(artifacts, `economic-selection-family-${children}.png`) });
      await page.locator('#cancel-purchase').click();
      assert.equal(await page.evaluate(key => localStorage.getItem(key), storage.SAVE_KEY), beforeSelection, 'Cancel does not spend or save');
      assert.equal(await page.locator('[data-product="buy-apple"]').getAttribute('aria-pressed'), 'false');
      await purchase(page, 'buy-apple', children);
      const hint = await page.locator('.step-detail').innerText();
      assert(hint.includes('家'), 'The successful purchase must explicitly lead home');
      assert.equal(await page.locator('.step-detail [data-place="home"]').count(), 1);
      if (children === 1) assert(!(await page.locator('.wish-note').innerText()).includes('每个孩子'));
      await page.locator('.step-detail [data-place="home"]').click();
      await page.locator('[data-action="share-apples"]').click();
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
        await page.locator('[data-action="read-tags"]').click();
        await purchase(page, 'buy-apple');
        await page.locator('.step-detail [data-place="home"]').click();
        await page.locator('[data-action="share-apples"]').click();
        assert.equal(await page.locator('.action-moment').count(), 0);
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
    assert.deepEqual(layoutErrors,[]);
    fs.writeFileSync(path.join(artifacts,'economic-childhood-ui-results.json'),JSON.stringify(results,null,2));
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
    console.log(functionalOnly?'Voice activation, saved voice-off and isolated childhood save recovery passed.':'Family home guidance, saved voice-off, reduced-motion rewards, six isolated/resumable childhood stories and Chinese/traditional-Mongolian layouts passed.');
  } finally {
    await browser?.close();
    await new Promise(resolve => production ? production.httpServer.close(resolve) : resolve());
    await source.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
