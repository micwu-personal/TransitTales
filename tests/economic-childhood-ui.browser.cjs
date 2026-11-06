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
        return { viewportOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1, footer, places, tools, complete, conversation, footerCollision: overlap(places, tools), completionCollision: overlap(complete, places) || overlap(complete, tools), conversationCollision: overlap(conversation, footer), goalCollision: overlap(conversation,wish) || overlap(complete,wish), headerCollision: overlap(conversation,header) };
      });
      for (const [key,message] of Object.entries({viewportOverflow:'viewport overflow',footerCollision:'controls cover places',completionCollision:'places cover the next-round reward',conversationCollision:'conversation covers footer',goalCollision:'dialogue or reward covers the goal',headerCollision:'dialogue covers the header'})) if(result[key]) layoutErrors.push(`${label}: ${message}`);
      if (result.conversation && result.conversation.height < 80) layoutErrors.push(`${label}: unusably short dialogue`);
      return result;
    }
    const functionalOnly=process.argv.includes('--functional-only');
    if(!functionalOnly){
    for (const children of [1, 2, 3]) {
      const { page, context } = await fixture(model.createGame({ gender: 'boy', children }), 'zh', 390, 844);
      await page.locator('#go-story').click();
      await page.locator('[data-action="read-tags"]').click();
      await page.locator('[data-action="buy-apple"]').click();
      const hint = await page.locator('.next-step').innerText();
      assert(hint.includes('家'), 'The successful purchase must explicitly lead home');
      assert.equal(await page.locator('.next-step [data-place="home"]').count(), 1);
      if (children === 1) assert(!(await page.locator('.wish-note').innerText()).includes('每个孩子'));
      await page.locator('.next-step [data-place="home"]').click();
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
        await page.locator('[data-action="buy-apple"]').click();
        await page.locator('.next-step [data-place="home"]').click();
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
        await page.locator(`[data-childhood-action="${route[0]}"]`).click();
        const savedSide=await page.evaluate(key=>localStorage.getItem(key),sideKey);
        assert(savedSide && childhood.validateChildhood(JSON.parse(savedSide)));
        await page.reload(); assert.equal(await page.locator('.childhood-conversation').count(),1);
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),sideKey),savedSide,'Resume preserves the story');
        assert.equal(await page.locator('.round-celebration').count(),0);
        await page.locator('#goal-help').click(); await page.locator('#help-retry').click(); await page.locator('[data-ui="confirm-retry"]').click();
        assert.equal(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),sideKey)).history.length,0,'Retry resets this envelope only');
        for(const id of route) await page.locator(`[data-childhood-action="${id}"]`).click();
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
    {
      const {page,context}=await fixture(model.createGame({gender:'boy',children:1}),'zh',390,844);
      await page.locator('#voice-toggle').click();
      await page.waitForFunction(()=>window.__plays.length>0,{},{timeout:30000}).catch(async error=>{console.error({errors,status:await page.locator('.narration-status').innerText()});throw error;});
      await page.locator('#voice-toggle').click();
      assert.equal(await page.locator('#voice-toggle').getAttribute('aria-pressed'),'false');
      await page.reload(); assert.deepEqual(await page.evaluate(()=>window.__plays),[]);
      assert.equal(await page.locator('#voice-toggle').getAttribute('aria-pressed'),'false');
      results.push({voiceStarted:true,voiceOffPersisted:true}); await context.close();
    }
    {
      const {page,context}=await fixture(progressed,'zh',390,844);
      const prefix=`transit-tales-economic-childhood-v1:${progressed.seed}:${progressed.family.gender}:${progressed.family.children}:`;
      const mainBefore=await page.evaluate(key=>localStorage.getItem(key),storage.SAVE_KEY);
      await page.evaluate(prefix=>{localStorage.setItem(prefix+'market','{');localStorage.setItem(prefix+'active','market');},prefix);
      await page.reload(); assert.equal(await page.locator('.childhood-conversation').count(),1);
      await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('transit-tales-economic-childhood-v1:'))throw new DOMException('Full','QuotaExceededError');return set.call(this,key,value);};});
      await page.locator(`[data-childhood-action="${storyRoute('market')[0]}"]`).click();
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
