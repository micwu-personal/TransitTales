// Run: node tests\universe-narration.browser.cjs (Playwright and Chromium/Edge required).
// Speech is mocked: these checks verify scheduling, not audible quality or macOS voices.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
function mockSpeech() {
  const voice = (name,lang,localService=true) => ({name,lang,voiceURI:name,localService,default:false});
  let voices = [voice('English','en-US'),voice('Huihui','zh-CN'),voice('Xiaoxiao Natural','zh-CN',false),voice('Japanese','ja-JP')], active, timer;
  const events = new EventTarget();
  window.__speech = { entries:[], completed:[], cancels:0, duration:900, fail:false, voicesChanged(list) { voices = list; events.dispatchEvent(new Event('voiceschanged')); }, finish() { clearTimeout(timer); const item = active; active = null; if (item) { window.__speech.completed.push(item.text); item.onend?.(); } } };
  class Utterance { constructor(text) { this.text = text; } }
  const synth = { getVoices:() => voices, addEventListener:events.addEventListener.bind(events), removeEventListener:events.removeEventListener.bind(events), cancel() { clearTimeout(timer); active = null; window.__speech.cancels++; }, speak(item) {
    if (window.__speech.fail) throw Error('Blocked speech');
    active = item; item.onstart?.();
    window.__speech.entries.push({ text:item.text, voice:item.voice.name, lang:item.lang, rate:item.rate, object:document.querySelector('#narration-caption')?.dataset.object, progress:document.querySelector('#progress')?.value, age:document.querySelector('#route-readout')?.dataset.ageGyr, camera:document.querySelector('#route-readout')?.dataset.cameraAu });
    timer = setTimeout(() => { if (active === item) window.__speech.finish(); },window.__speech.duration);
  } };
  Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true}); Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utterance,configurable:true});
  window.__levels = [];
  if (window.AudioParam) { const target = AudioParam.prototype.setTargetAtTime; AudioParam.prototype.setTargetAtTime = function(value,...args) { window.__levels.push(value); return target.call(this,value,...args); }; }
}
(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server:{host:'127.0.0.1',port:0},logLevel:'error' });
  server.middlewares.use('/universe-voice-check',(_request,response)=>{response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>Isolated voice fixture</title>');});
  let browser;
  try {
    await server.listen(); const url = process.env.UNIVERSE_VOICE_URL || `http://127.0.0.1:${server.httpServer.address().port}`;
    try { browser = await chromium.launch({headless:true}); } catch { browser = await chromium.launch({headless:true,channel:'msedge'}); }
    const context = await browser.newContext({viewport:{width:1440,height:1100}}); await context.addInitScript(mockSpeech);
    const page = await context.newPage(), errors = []; page.on('pageerror',error=>errors.push(error.message));
    const open = async (lang='zh-CN') => { await page.goto(`${url}/universe.html?view=2d`); await page.locator('.cosmic-scene>svg').waitFor(); await page.locator('#language').selectOption(lang); };
    const entries = () => page.evaluate(()=>window.__speech.entries);
    await open('en'); assert.equal((await entries()).length,0,'Narration never autoplays');
    await page.evaluate(()=>window.__speech.voicesChanged([
      {name:'Microsoft Abeo Online (Natural) - English (Nigeria)',voiceURI:'Nigeria',lang:'en-NG',default:true,localService:false},
      {name:'Samantha',voiceURI:'US',lang:'en-US',default:false,localService:true},
      {name:'Microsoft Ana Online (Natural) - English (United States)',voiceURI:'Ana',lang:'en-US',default:false,localService:false},
    ]));
    await page.locator('#narration-listen').click(); assert.equal((await entries()).at(-1).voice,'Microsoft Ana Online (Natural) - English (United States)');
    await page.locator('#narration-voice').selectOption('Nigeria'); assert.equal((await entries()).at(-1).lang,'en-NG','Manual accent remains available');
    await page.locator('#language').selectOption('ja'); await page.locator('#language').selectOption('en');
    assert.equal((await entries()).at(-1).lang,'en-NG','Manual English accent survives language changes');
    await page.locator('#narration-voice').selectOption(''); assert.equal((await entries()).at(-1).voice,'Microsoft Ana Online (Natural) - English (United States)');
    await page.evaluate(()=>window.__speech.voicesChanged([
      {name:'Nigeria Natural',voiceURI:'Nigeria',lang:'en-NG',default:true,localService:false},
      {name:'Samantha',voiceURI:'US',lang:'en-US',default:false,localService:true},
    ]));
    await page.locator('#narration-listen').click(); assert.equal((await entries()).at(-1).voice,'Samantha','US accent wins even without Ana');
    await open(); assert.equal((await entries()).length,0,'Narration never autoplays');
    await page.evaluate(()=>window.__speech.duration=20000); await page.locator('#narration-listen').click();
    assert.equal((await entries()).at(-1).voice,'Xiaoxiao Natural'); assert.equal((await entries()).at(-1).lang,'zh-CN');
    assert.equal(await page.locator('#object-story').getAttribute('open'),'');
    assert.equal(await page.locator('#narration-caption').getAttribute('aria-live'),null,'Speech captions do not make screen readers speak twice');
    await page.locator('#music').click(); await page.waitForFunction(()=>window.__levels.includes(.075));
    await page.locator('#volume').fill('0'); await page.locator('#volume').dispatchEvent('input'); assert.equal(await page.evaluate(()=>window.__levels.at(-1)),0);
    await page.evaluate(()=>window.__speech.finish()); assert.equal(await page.evaluate(()=>window.__levels.at(-1)),0,'Speech ending respects music mute');
    await page.locator('#volume').fill('25'); await page.locator('#volume').dispatchEvent('input'); await page.locator('#narration-listen').click();
    assert.equal(await page.evaluate(()=>window.__levels.at(-1)),.075); await page.locator('#narration-stop').click(); assert.equal(await page.evaluate(()=>window.__levels.at(-1)),.25,'Stopping speech restores original music level');
    await page.locator('#music').click();
    await page.locator('#narration-voice').selectOption('Huihui'); assert.equal((await entries()).at(-1).voice,'Huihui');
    const count = (await entries()).length; await page.locator('#help-toggle').click(); await page.locator('#help-toggle').click(); assert.equal((await entries()).length,count,'Ordinary render does not restart narration');
    await page.locator('#narration-voice').selectOption('');
    for (const id of await page.locator('#destination option').evaluateAll(items=>items.map(i=>i.value))) {
      await page.locator('#destination').selectOption(id); const latest = (await entries()).at(-1); assert.equal(latest.object,id); assert.ok(latest.text.length>25,`${id}: a short readable paragraph`);
      assert.equal(await page.locator('#object-description').textContent(),latest.text);
    }
    await page.locator('#destination').selectOption('saturn');
    await page.evaluate(()=>{window.__speech.entries=[];window.__speech.completed=[];window.__speech.duration=20000;}); await page.locator('#depart').click();
    const flightCancels = await page.evaluate(()=>window.__speech.cancels);
    await page.waitForFunction(()=>!document.querySelector('#depart').disabled);
    assert.deepEqual((await entries()).map(e=>e.object),['earth'],'A long departure line spans all flybys without interruption');
    assert.equal(await page.evaluate(()=>window.__speech.cancels),flightCancels,'Automatic flybys and arrival never cancel the active line');
    assert.equal(await page.locator('#narration-caption').getAttribute('data-object'),'earth','Caption stays with the actually spoken object');
    await page.evaluate(()=>window.__speech.finish());
    assert.deepEqual((await entries()).map(e=>e.object),['earth','saturn'],'Arrival supersedes pending flybys; no stale short plays after arrival');
    assert.equal((await entries()).at(-1).rate,.94); assert.equal(await page.locator('#narration-caption').getAttribute('data-object'),'saturn');
    await page.evaluate(()=>window.__speech.finish());
    assert.equal(await page.locator('#narration-stop').isDisabled(),true); assert.equal(await page.evaluate(()=>window.__speech.completed.length),2);
    await page.locator('#reset-journey').click(); await page.locator('#confirm-reset').click(); await page.locator('#destination').selectOption('saturn');
    await page.evaluate(()=>{window.__speech.entries=[];window.__speech.duration=900;}); await page.locator('#depart').click();
    await page.waitForFunction(()=>window.__speech.entries.some(e=>e.object==='mars'));
    await page.locator('#pause').click(); const stopped = await page.locator('#progress').getAttribute('value'), pausedCount=(await entries()).length;
    await page.waitForTimeout(250); assert.equal(await page.locator('#progress').getAttribute('value'),stopped); assert.equal((await entries()).length,pausedCount);
        await page.locator('#view3d').click(); await page.locator('.cosmic-scene>canvas').waitFor(); assert.equal((await entries()).length,pausedCount,'Renderer replacement preserves paused speech');
        await page.locator('#view2d').click(); await page.locator('.cosmic-scene>svg').waitFor();
        await page.locator('#pause').click(); await page.waitForFunction(()=>window.__speech.entries.some(e=>e.object==='saturn' && e.rate<1));
    const flight = await entries(), intermediate = flight.filter(e=>e.object==='mars'||e.object==='jupiter');
    assert.equal(intermediate.filter(e=>e.object==='jupiter').length,1); assert.ok(intermediate.filter(e=>e.object==='mars').length<=2,'Only a paused active utterance may restart');
    for (const item of intermediate) { assert.ok(item.camera); assert.equal(Number(item.age),13.8); assert.ok(item.progress> (item.object==='mars' ? .23 : .56) && item.progress < (item.object==='mars' ? .34 : .67),`Position-synchronized cue: ${JSON.stringify(item)}`); }
    assert.equal(flight[0].object,'earth'); assert.equal(flight.at(-1).object,'saturn');
    assert.equal(await page.locator('#energy').textContent(),'86%','Completed fractional simulation value is formatted');
    await page.locator('#destination').selectOption('earth'); await page.locator('#depart').click(); await page.waitForTimeout(150);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.notEqual(await page.locator('#narration-status').getAttribute('data-status'),'speaking'); const hiddenCount=(await entries()).length;
    await page.waitForTimeout(250); assert.equal((await entries()).length,hiddenCount);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.locator('#pause').textContent(),'继续'); await page.locator('#pause').click();
    await page.waitForFunction(()=>!document.querySelector('#depart').disabled);
    await page.locator('#narration-toggle').click();
    await page.locator('#language').selectOption('mn-Cyrl-MN'); await page.locator('#narration-listen').click();
    assert.equal(await page.locator('#narration-status').getAttribute('data-status'),'no-voice'); assert.equal((await entries()).at(-1).lang,'zh-CN','No wrong-language fallback');
    await page.locator('#narration-stop').click(); await page.evaluate(()=>window.__speech.voicesChanged([{name:'Mongolian',voiceURI:'Mongolian',lang:'mn-MN',default:false,localService:true}]));
    assert.notEqual((await entries()).at(-1).lang,'mn-MN','Cancelled pending speech never resurrects');
    await page.locator('#narration-listen').click(); assert.equal((await entries()).at(-1).lang,'mn-MN');
    await page.locator('#language').selectOption('zh-CN'); await page.evaluate(()=>window.__speech.voicesChanged([{name:'Mandarin',voiceURI:'Mandarin',lang:'zh-CN',default:false,localService:true}]));
    assert.equal((await entries()).at(-1).lang,'zh-CN','Delayed matching voices satisfy only the current request');
    await page.evaluate(()=>window.__speech.fail=true); await page.locator('#narration-listen').click(); assert.equal(await page.locator('#narration-status').getAttribute('data-status'),'error');
    await page.evaluate(()=>{window.__speech.fail=false;window.__speech.duration=900;});
        await page.locator('#reset-journey').click(); await page.locator('#confirm-reset').click(); await page.emulateMedia({reducedMotion:'reduce'});
        await page.locator('#destination').selectOption('saturn'); await page.evaluate(()=>window.__speech.entries=[]); await page.locator('#depart').click();
        await page.waitForFunction(()=>!document.querySelector('#depart').disabled);
        const reduced = await entries(); assert.deepEqual(reduced.map(e=>e.object),['earth','mars','jupiter','saturn']);
        assert.ok(reduced.find(e=>e.object==='mars').progress>=1/3 && reduced.find(e=>e.object==='mars').progress<.4);
        await page.locator('#reset-journey').click(); await page.locator('#confirm-reset').click(); await page.emulateMedia({reducedMotion:'no-preference'});
        await page.locator('#epoch').selectOption('bang'); await page.evaluate(()=>window.__speech.entries=[]); await page.locator('#epoch-apply').click();
        await page.waitForFunction(()=>!document.querySelector('#depart').disabled); const timeOnly = await entries();
        assert.deepEqual(timeOnly.map(e=>e.object),['earth','earth'],'Time-only travel never invents a passed planet'); assert.notEqual(timeOnly[0].text,timeOnly[1].text,'Big Bang arrival does not describe present Earth');
        const legacyPage = await context.newPage(); legacyPage.on('pageerror',error=>errors.push(error.message));
        await legacyPage.goto(`http://127.0.0.1:${server.httpServer.address().port}/universe-voice-check`);
        const legacyResult = await legacyPage.evaluate(async()=> {
          const replaceAll = String.prototype.replaceAll;
          String.prototype.replaceAll = undefined;
          const synth = window.speechSynthesis;
          synth.addEventListener = undefined; synth.removeEventListener = undefined;
          synth.getVoices = () => { throw Error('Voice registry temporarily unavailable'); };
          const { createNarration } = await import('/src/universe/narration.ts');
          const narrator = createNarration(()=>{});
          try {
            narrator.setEnabled(true); narrator.speak('Legacy browser story');
            const missingStatus = narrator.status;
            synth.getVoices = () => [{name:'US legacy',voiceURI:'US',lang:'en_US',default:false,localService:true}];
            synth.onvoiceschanged(new Event('voiceschanged'));
            return { missingStatus, text:window.__speech.entries.at(-1).text, voice:window.__speech.entries.at(-1).voice };
          } finally { narrator.dispose(); String.prototype.replaceAll = replaceAll; }
        });
        assert.deepEqual(legacyResult,{missingStatus:'no-voice',text:'Legacy browser story',voice:'US legacy'},'Legacy voice API absence/failure does not break narration startup or cleanup');
        await context.close();
        const unsupported = await browser.newContext(); await unsupported.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true});});
        const silent = await unsupported.newPage(); await silent.goto(`${url}/universe.html?view=2d`); await silent.locator('.cosmic-scene>svg').waitFor();
        assert.equal(await silent.locator('#narration-listen').isDisabled(),true); assert.equal(await silent.locator('#narration-toggle').isDisabled(),true); assert.ok((await silent.locator('#object-description').textContent()).length>25); await unsupported.close();
        const layout = await browser.newContext({viewport:{width:532,height:1100}}); await layout.addInitScript(mockSpeech); const p = await layout.newPage(); p.on('pageerror',error=>errors.push(error.message));
    const output = process.env.UNIVERSE_VOICE_SCREENSHOTS; if(output) fs.mkdirSync(output,{recursive:true});
    for (const width of [1440,1100,532,390,320]) for (const lang of ['en','zh-CN','ja','mn-Cyrl-MN','mn-Mong-CN']) {
      await p.setViewportSize({width,height:1100}); await p.goto(`${url}/universe.html?view=2d`); await p.locator('.cosmic-scene>svg').waitFor(); await p.locator('#language').selectOption(lang);
      await p.evaluate(()=>{document.querySelector('#energy').textContent='86%';document.querySelector('#research').textContent='2,520';});
      const geometry = await p.evaluate(()=>[...document.querySelectorAll('.meters>div')].map(cell=> { const box=cell.getBoundingClientRect(); return [...cell.querySelectorAll('span,b')].flatMap(element=>{const range=document.createRange();range.selectNodeContents(element);return [...range.getClientRects()].map(r=>({text:element.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,cellLeft:box.left,cellRight:box.right}));}); }).flat());
      for(const g of geometry) assert.ok(g.left>=g.cellLeft-1 && g.right<=g.cellRight+1,`${width}/${lang}: value or label spills into adjacent cell: ${JSON.stringify(g)}`);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${lang}: no page-wide overflow`);
      await p.locator('#narration-listen').click(); const buttonRects=await p.locator('.narration-actions button').evaluateAll(buttons=>buttons.map(b=>({h:b.getBoundingClientRect().height,w:b.getBoundingClientRect().width}))); assert.ok(buttonRects.every(r=>r.h>=44&&r.w>=44));
      if(output && [1440,390].includes(width) && ['en','zh-CN','mn-Mong-CN'].includes(lang)) {await p.locator('.flight-desk').screenshot({path:path.join(output,`voice-${width}-${lang}.png`)});}
    }
    await layout.close(); assert.deepEqual(errors,[]); console.log('Cosmic narration browser checks passed: US Ana/default/manual accents, finish-before-replace across a whole flight, arrival priority/current captions, opt-in, 28 descriptions, coordinate flybys, pause/hidden/replay, late/missing voices, errors, music duck/mute and 25 responsive locale layouts (mock speech scheduling, not audible quality).');
  } finally { await browser?.close(); await server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
