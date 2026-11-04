// Run with: node tests\universe-game.browser.cjs (Playwright and Chromium/Edge required).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { join } = require('node:path');
const { mkdirSync } = require('node:fs');
(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
  server.middlewares.use('/universe-audio-check',(_request,response) => {response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>Original cosmic music check</title>');});
  let browser;
  try {
    await server.listen(); const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    try {browser = await chromium.launch({headless:true});} catch {browser = await chromium.launch({headless:true,channel:'msedge'});}
    const page = await browser.newPage({viewport:{width:1440,height:1100}}), errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.addInitScript(() => {
      const Original = window.AudioContext;
      window.__contexts = [];
      window.AudioContext = class extends Original {constructor(...args) {super(...args);window.__contexts.push(this);}};
    });
    await page.goto(`${url}/universe-audio-check`);
    const audio = await page.evaluate(async () => {
      const {AMBIENT_SCORE,AMBIENT_DURATION,scheduleAmbientTone} = await import('/src/universe/music.ts');
      const render = async (volume,voice) => {
        const rate = 24000, context = new OfflineAudioContext(1,Math.ceil((AMBIENT_DURATION+.3)*rate),rate);
        const master = context.createGain();master.gain.value=volume;master.connect(context.destination);
        for (const note of AMBIENT_SCORE) if (!voice || note.voice===voice) scheduleAmbientTone(context,master,note,note.time+.05);
        const samples = (await context.startRendering()).getChannelData(0);let peak=0,sum=0,tail=0;
        for (let i=0;i<samples.length;i++) {const v=samples[i];if (!Number.isFinite(v)) throw Error('Nonfinite audio');peak=Math.max(peak,Math.abs(v));sum+=v*v;if(i>(AMBIENT_DURATION+.1)*rate)tail=Math.max(tail,Math.abs(v));}
        return {peak,rms:Math.sqrt(sum/samples.length),tail};
      };
      return {full:await render(.25),muted:await render(0),pad:await render(.25,'pad'),bell:await render(.25,'bell'),bass:await render(.25,'bass')};
    });
    assert.ok(audio.full.peak>.01 && audio.full.peak<.15);assert.ok(audio.full.rms>.001);assert.equal(audio.full.tail,0);assert.equal(audio.muted.peak,0);
    for (const voice of ['pad','bell','bass']) assert.ok(audio[voice].rms>.0001,`${voice} must be audible`);
    console.log('Real offline WebAudio:',JSON.stringify(audio));
    await page.goto(`${url}/`);await page.locator('#play-universe').click();await page.locator('#language').selectOption('en');
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:width===1440?1100:844});
      assert.equal(await page.locator('#atlas').evaluate(el=>el.open),true,'Atlas opens by default on desktop and phone');
      assert.equal(await page.locator('#destination').isVisible(),true);
      assert.equal(await page.locator('#epoch').isVisible(),true);
      assert.equal(await page.locator('.route-controls #destination,.route-controls #epoch').count(),2,'Space and time selectors share the route planner');
    }
    await page.setViewportSize({width:1440,height:1100});
    await page.locator('.cosmic-scene canvas').waitFor();assert.equal(await page.locator('#view3d').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#destination option').count(),40);assert.equal(await page.locator('#epoch option').count(),9);
    await page.locator('#help-toggle').click();await page.locator('#close-help').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#help-panel').isVisible(),false);assert.equal(await page.evaluate(() => document.activeElement.id),'help-toggle');
    await page.locator('#music').click();await page.waitForFunction(() => window.__contexts.some(c=>c.state==='running'));
    await page.locator('#music').click();await page.waitForFunction(() => window.__contexts.every(c=>c.state!=='running'));
    await page.locator('#go-moon').click();await page.locator('#speed').fill('999');await page.locator('#speed').dispatchEvent('input');await page.locator('#speed').dispatchEvent('change');
    assert.ok(parseFloat(await page.locator('#gamma').textContent())>20);
    await page.locator('#depart').click();await page.waitForFunction(() => document.querySelector('#progress').value>.03);
    await page.locator('#pause').click();const paused = await page.locator('#progress').getAttribute('value');await page.waitForTimeout(300);assert.equal(await page.locator('#progress').getAttribute('value'),paused);
    const departure = await page.evaluate(async () => {const {readJourney}=await import('/src/universe/model.ts');return readJourney(localStorage);});
    assert.equal(departure.departureDestinationId,'earth');assert.equal(departure.departureEpochId,'present');assert.equal(departure.destinationId,'moon');
    assert.ok((await page.locator('.window-caption h2').textContent()).includes('Earth → Moon'),'Flight caption preserves departure rather than claiming arrival');
    await page.reload();await page.locator('.cosmic-scene canvas').waitFor();
    const reloaded = await page.evaluate(async () => {const {readJourney}=await import('/src/universe/model.ts');return readJourney(localStorage);});
    assert.equal(reloaded.paused,true);assert.equal(reloaded.progress,departure.progress);assert.equal(reloaded.departureDestinationId,'earth');
    await page.locator('#view2d').click();await page.locator('.cosmic-scene>svg').waitFor();assert.equal(await page.locator('#pause').isEnabled(),true);
    await page.locator('#language').selectOption('zh-CN');assert.equal(await page.locator('#speed').inputValue(),'999');
    await page.locator('#pause').click();await page.locator('[data-choice]').first().waitFor({timeout:15000});
    const choices = await page.evaluate(async () => {const {readJourney,encounterFor}=await import('/src/universe/model.ts');return encounterFor(readJourney(localStorage)).choices;});
    const unsafe=choices.find(c=>!c.safe), safe=choices.find(c=>c.safe);assert.ok(safe);
    if(unsafe) {await page.locator(`#choice-${unsafe.id}`).click();assert.ok(await page.locator('[data-choice]').count()>0);}
    await page.locator(`#choice-${safe.id}`).click();assert.equal(await page.locator('[data-choice]').count(),0,JSON.stringify(await page.evaluate(async () => {const {readJourney}=await import('/src/universe/model.ts');return readJourney(localStorage);})));
    const saved = await page.evaluate(async () => {const {readJourney}=await import('/src/universe/model.ts');return readJourney(localStorage);});
    assert.ok(saved.visited.includes('moon'));assert.ok(saved.properElapsed<saved.elapsed/10);
    await page.reload();await page.locator('#language').selectOption('en');assert.ok((await page.locator('#journal summary').textContent()).includes(`${saved.visited.length}/40`));
    await page.locator('#view2d').click();await page.locator('.cosmic-scene>svg').waitFor();
    await page.locator('#go-quasar').click();await page.locator('#epoch').selectOption('quasar');await page.locator('#depart').click();await page.locator('[data-choice]').first().waitFor({timeout:15000});
    await page.locator('#choice-shield,#choice-detour,#choice-scan,#choice-listen').first().click();
    assert.ok((await page.locator('.window-caption p').textContent()).length>0);
    await page.locator('#epoch').selectOption('bang');assert.equal(await page.locator('.temporal-warning').count(),1);await page.locator('#epoch-apply').click();
    await page.locator('[data-choice]').first().waitFor({timeout:15000});
    const primordial = await page.evaluate(async () => {const {readJourney,encounterFor}=await import('/src/universe/model.ts');return encounterFor(readJourney(localStorage)).choices.find(c=>c.safe).id;});
    await page.locator(`#choice-${primordial}`).click();
    const epochScene = await page.locator('.cosmic-scene').innerHTML();assert.ok(!epochScene.includes('undefined'));assert.ok(!epochScene.includes('NaN'));
    await page.locator('#view3d').click();await page.locator('.cosmic-scene canvas').waitFor();
    await page.evaluate(() => {const canvas=document.querySelector('.cosmic-scene canvas');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl&&gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('Actual context loss extension unavailable');extension.loseContext();});
    await page.locator('.cosmic-scene>svg').waitFor();assert.equal(await page.locator('#view2d').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#epoch').inputValue(),'bang');
    await page.locator('#view3d').click();await page.locator('#view2d').click();await page.locator('.cosmic-scene>svg').waitFor();await page.waitForTimeout(300);assert.equal(await page.locator('.cosmic-scene canvas').count(),0);
    await page.locator('#music').click();await page.waitForFunction(() => window.__contexts.some(c=>c.state==='running'));
    await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(() => window.__contexts.every(c=>c.state!=='running'));assert.equal(await page.locator('#music').getAttribute('aria-pressed'),'false');
    await page.evaluate(() => {delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    if(process.env.TRANSIT_SCREENSHOTS) mkdirSync(process.env.TRANSIT_SCREENSHOTS,{recursive:true});
    const checks=[];
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:width===1440?1100:844});
      for(const lang of ['en','zh-CN','ja','mn-Cyrl-MN','mn-Mong-CN']) {
        await page.locator('#language').selectOption(lang);await page.locator('#atlas').evaluate(el=>{el.open=true;});
        await page.waitForTimeout(100);
        const layout=await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,small:[...document.querySelectorAll('button,select,input,summary')].filter(el=>el.getClientRects().length).filter(el=>{const r=el.getBoundingClientRect();return r.height<43.5||r.width<43.5;}).map(el=>el.id||el.tagName),badText:document.body.textContent.includes('undefined')}));
        assert.ok(layout.scroll<=width+1,`${lang} ${width}px overflow ${layout.scroll}`);assert.deepEqual(layout.small,[],`${lang} ${width}px undersized controls`);assert.equal(layout.badText,false);
        checks.push({lang,width});
        if(process.env.TRANSIT_SCREENSHOTS && (lang==='en'||lang==='mn-Mong-CN')) await page.screenshot({path:join(process.env.TRANSIT_SCREENSHOTS,`universe-${lang}-${width}.png`),fullPage:true});
      }
    }
    await page.locator('#destination').selectOption('beyond');await page.locator('#epoch').selectOption('far');assert.ok((await page.locator('.epoch-note').textContent()).length>0);
    assert.deepEqual(errors,[]);console.log(`Universe gameplay, original audio, persistence, fallback and ${checks.length} layout checks passed.`);
  } finally {if(browser)await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
