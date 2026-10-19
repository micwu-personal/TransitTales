// Run with: node tests\melody-game.browser.cjs (Playwright and Chromium/Edge required).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { join } = require('node:path');
const { mkdirSync } = require('node:fs');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
  server.middlewares.use('/melody-audio-check', (_request,response) => {
    response.setHeader('Content-Type','text/html'); response.end('<!doctype html><title>Offline music verification</title>');
  });
  let browser;
  try {
    await server.listen();
    const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    try { browser = await chromium.launch({headless:true}); }
    catch { browser = await chromium.launch({headless:true,channel:'msedge'}); }
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors = []; page.on('pageerror',error => errors.push(error.message));
    await page.goto(`${url}/melody-audio-check`);
    const spectral = await page.evaluate(async () => {
      const {scheduleTone} = await import('/src/melody/audio.ts');
      const {midiToFrequency} = await import('/src/melody/model.ts');
      const results = [];
      for (let midi = 0; midi <= 127; midi++) {
        const rate = 48000, start = .05, duration = 1.1;
        const context = new OfflineAudioContext(1,Math.ceil((duration + .15)*rate),rate);
        const volume = context.createGain(); volume.gain.value = .25; volume.connect(context.destination);
        const source = scheduleTone(context,midi,start,duration,volume);
        const expected = midiToFrequency(midi);
        if (source.oscillator.type !== 'sine' || source.oscillator.detune.value !== 0) throw Error('Not unshifted sine synthesis');
        const buffer = await context.startRendering(), samples = buffer.getChannelData(0);
        if (Math.abs(source.oscillator.frequency.value / expected - 1) > 1e-6) throw Error(`Incorrect oscillator frequency for MIDI ${midi}`);
        const crossings = [];
        let peak = 0, edgePeak = 0;
        for (let i = 1; i < samples.length; i++) {
          const a = samples[i-1], b = samples[i];
          if (!Number.isFinite(b)) throw Error('Nonfinite output');
          peak = Math.max(peak,Math.abs(b));
          if (i < .04*rate || i > (start+duration+.02)*rate) edgePeak = Math.max(edgePeak,Math.abs(b));
          if (i > .12*rate && i < (start+duration-.1)*rate && a <= 0 && b > 0) crossings.push((i-1-a/(b-a))/rate);
        }
        if (crossings.length < 5) throw Error(`Too few audible periods: ${midi}`);
        const observed = (crossings.length-1)/(crossings.at(-1)-crossings[0]);
        const cents = 1200*Math.log2(observed/expected);
        if (Math.abs(cents) > .1 || peak < .005 || peak >= .5 || edgePeak !== 0) throw Error(`Bad pitch/envelope MIDI ${midi}: ${JSON.stringify({expected,observed,cents,peak,edgePeak})}`);
        results.push({midi,expected,observed,cents});
      }
      return {notes:results.length,maxErrorCents:Math.max(...results.map(r => Math.abs(r.cents))),a4:results[69],c4:results[60]};
    });
    assert.equal(spectral.notes,128);
    assert.equal(spectral.a4.expected,440);
    console.log('OfflineAudioContext pitch verification:',JSON.stringify(spectral));

    await page.goto(`${url}/`);
    await page.locator('#play-melody').click();
    await page.locator('#language').selectOption('en');
    await page.locator('.journey-scene canvas').waitFor();
    assert.equal(await page.locator('#view3d').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#letter').inputValue(),'D');
    await page.locator('#check').click();
    assert.ok(!await page.locator('#status').evaluate(el => el.classList.contains('success')));
    await page.locator('#letter').selectOption('C');
    await page.locator('#check').click();
    assert.ok(await page.locator('#status').evaluate(el => el.classList.contains('success')));
    await page.locator('#next').click();
    assert.equal(await page.locator('#lesson-length').getAttribute('aria-current'),'step');
    await page.locator('#letter').selectOption('C');
    await page.locator('#undo').click();
    assert.equal(await page.locator('#letter').inputValue(),'D');
    await page.locator('#reset').click();
    await page.locator('#hint').click();
    assert.equal(await page.locator('#target-staff [tabindex]').count(),0);
    await page.locator('#score-note-0').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator('#letter').inputValue(),'E');
    assert.equal(await page.evaluate(() => document.activeElement.id),'score-note-0');
    await page.locator('#undo').click();

    const lessons = await page.evaluate(async () => {
      const {LESSONS} = await import('/src/melody/lessons.ts');
      return LESSONS.map(l => ({id:l.id,letter:l.target.events[0].letter}));
    });
    for (const lesson of lessons) {
      await page.locator(`#lesson-${lesson.id}`).click();
      await page.locator('#letter').selectOption(lesson.letter);
      await page.locator('#check').click();
      assert.ok(await page.locator('#status').evaluate(el => el.classList.contains('success')),`complete ${lesson.id}`);
    }
    await page.reload();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('transit-tales-melody-v1')));
    assert.equal(saved.completed.length,12);

    await page.locator('#mode-studio').click();
    await page.locator('#reset').click();
    assert.equal(await page.locator('#draft-staff .score-note').count(),0);
    await page.locator('#add').click();
    await page.locator('#letter').selectOption('A');
    await page.locator('#duration').selectOption('whole');
    await page.locator('#tempo').fill('40'); await page.locator('#tempo').press('Tab');
    await page.locator('#view2d').click();
    await page.locator('.journey-scene>svg').waitFor();
    await page.locator('#view3d').click();
    await page.locator('.journey-scene canvas').waitFor();
    assert.equal(await page.locator('#letter').inputValue(),'A');
    assert.equal(await page.locator('#duration').inputValue(),'whole');
    await page.locator('#play').click();
    await page.waitForFunction(() => !document.querySelector('#stop').disabled).catch(async error => { throw Error(`${error.message}; status=${await page.locator('#status').textContent()}; errors=${JSON.stringify(errors)}`); });
    await page.locator('#view2d').click();
    assert.equal(await page.locator('#stop').isEnabled(),true);
    await page.locator('#stop').click();
    assert.equal(await page.locator('#stop').isDisabled(),true);
    await page.locator('#view3d').click();
    await page.locator('.journey-scene canvas').waitFor();
    await page.evaluate(() => document.querySelector('.journey-scene canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
    await page.locator('.journey-scene>svg').waitFor();
    assert.equal(await page.locator('#view2d').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#letter').inputValue(),'A');
    await page.reload();
    await page.locator('#mode-studio').click();
    assert.equal(await page.locator('#letter').inputValue(),'A');
    await page.locator('#remove').click();
    await page.locator('#undo').click();
    assert.equal(await page.locator('#letter').inputValue(),'A');

    // Deterministic question selection, but production playback and answer handling.
    await page.evaluate(() => { Math.random = () => .75; });
    await page.locator('#mode-ear').click();
    await page.locator('.audio-settings summary').click();
    await page.locator('#mute').check();
    await page.locator('#ear-play').click();
    assert.equal(await page.locator('[data-ear]:enabled').count(),0);
    await page.locator('#mute').uncheck();
    await page.locator('.audio-settings summary').click();
    await page.locator('#ear-play').click();
    await page.waitForFunction(() => !document.querySelector('#ear-69').disabled);
    assert.equal(await page.locator('.ear-result').count(),0);
    assert.equal(await page.locator('.ear-platform').textContent().then(s => /\d+\.\d+ Hz/.test(s)),false);
    await page.locator('#ear-69').click();
    assert.ok(await page.locator('.ear-result').textContent().then(s => s.includes('A4') && s.includes('440.000000 Hz')));
    assert.equal(await page.locator('[data-ear]:enabled').count(),0);
    let stats = await page.evaluate(() => JSON.parse(localStorage.getItem('transit-tales-melody-v1')).ear);
    assert.deepEqual(stats,{attempts:1,correct:1});
    await page.locator('#ear-next').click();
    await page.waitForFunction(() => !document.querySelector('#ear-70').disabled);
    assert.equal(await page.locator('.ear-result').count(),0);
    await page.locator('#ear-60').click();
    assert.ok(await page.locator('.ear-result').textContent().then(s => s.includes('A♯4')));
    stats = await page.evaluate(() => JSON.parse(localStorage.getItem('transit-tales-melody-v1')).ear);
    assert.deepEqual(stats,{attempts:2,correct:1});

    const artifactDir = process.env.TRANSIT_SCREENSHOTS;
    if (artifactDir) mkdirSync(artifactDir,{recursive:true});
    for (const viewport of [{width:1440,height:1100},{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport);
      for (const lang of ['en','zh-CN','ja','mn-Cyrl-MN','mn-Mong-CN']) {
        await page.locator('#lesson-first').click();
        await page.locator('#language').selectOption(lang);
        await page.locator('#view2d').click();
        await page.locator('.journey-scene>svg').waitFor();
        const dimensions = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:Array.from(document.querySelectorAll('main *,header *')).filter(el => {
          if (el.getBoundingClientRect().right <= innerWidth+1) return false;
          for (let ancestor=el.parentElement; ancestor; ancestor=ancestor.parentElement) {
            if (['auto','scroll','hidden','clip'].includes(getComputedStyle(ancestor).overflowX)) return false;
          }
          return true;
        }).map(el => ({tag:el.tagName,class:el.className,left:el.getBoundingClientRect().left,width:el.getBoundingClientRect().width})).slice(0,12)}));
        if (dimensions.scroll > dimensions.width+1 && artifactDir) await page.screenshot({path:join(artifactDir,`overflow-${lang}-${viewport.width}.png`),fullPage:true});
        assert.ok(dimensions.scroll <= dimensions.width+1,`${lang} ${viewport.width} overflow: ${JSON.stringify(dimensions)}`);
        for (const selector of ['#play','#check','#letter','#view2d']) {
          const rect = await page.locator(selector).boundingBox();
          assert.ok(rect && rect.height >= 44,`${selector}: 44px target`);
        }
        await page.locator('#letter').selectOption('C');
        await page.locator('#check').click();
        assert.ok(await page.locator('#status').evaluate(el => el.classList.contains('success')));
        if (artifactDir && [1440,390].includes(viewport.width)) await page.screenshot({path:join(artifactDir,`melody-${lang}-${viewport.width}.png`),fullPage:true});
        if ([1440,390].includes(viewport.width)) {
          await page.locator('#view3d').click();
          await page.locator('.journey-scene canvas').waitFor();
          const controls = await page.locator('.journey-scene').evaluate(scene => {
            const bounds=scene.getBoundingClientRect();
            return Array.from(scene.querySelectorAll('button')).map(button => {
              const r=button.getBoundingClientRect();
              return {width:r.width,height:r.height,inside:r.left>=bounds.left && r.right<=bounds.right && r.top>=bounds.top && r.bottom<=bounds.bottom};
            });
          });
          assert.equal(controls.length,3);
          assert.ok(controls.every(r => r.width>=44 && r.height>=44 && r.inside),`${lang} ${viewport.width} camera targets: ${JSON.stringify(controls)}`);
        }
      }
    }
    await page.locator('#language').selectOption('en');
    await page.locator('#mode-studio').click();
    await page.locator('#play').click();
    await page.waitForFunction(() => !document.querySelector('#stop').disabled);
    await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.locator('#stop').isDisabled(),true);
    await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:false}); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.locator('#stop').isDisabled(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: all twelve lessons, persistence, keyboard edits, genuine 3D/SVG state, context-loss fallback, concealed ear answers, audio controls and 20 responsive locale combinations.');
  } finally { await browser?.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
