const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await server.listen(); const base = server.resolvedUrls.local[0];
    const options = { headless: true, args: ['--autoplay-policy=user-gesture-required'] };
    try { browser = await chromium.launch(options); }
    catch (error) { if (!error.message.includes("Executable doesn't exist")) throw error; browser = await chromium.launch({ ...options, channel: 'msedge' }); }
    for (const language of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN']) {
      const page = await browser.newPage({ viewport: { width: language === 'en' ? 1440 : 390, height: 844 }, hasTouch: language !== 'en' });
      const errors = []; const external = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        if (route.request().url().startsWith(base)) return route.continue();
        external.push(route.request().url()); return route.abort();
      });
      await page.goto(`${base}audio/beijing/manifest.json`); await page.setContent('<button id="enable">Enable recording</button><button id="mute">Mute</button>');
      await page.evaluate(async language => {
        const { DeviceVoice } = await import('/src/beijing/voice.ts');
        Object.defineProperty(window, 'speechSynthesis', { get() { throw new Error('OS speech must not be accessed'); }, configurable: true });
        const stats = window.voiceStats = { factories: 0, sources: [], active: [], rms: 0, progress: 0 };
        const audio = new Audio();
        const originalPlay = audio.play.bind(audio);
        audio.play = () => { stats.sources.push(audio.src); return originalPlay(); };
        audio.addEventListener('timeupdate', () => { stats.progress = Math.max(stats.progress, audio.currentTime); });
        const context = new AudioContext(); const analyzer = context.createAnalyser(); analyzer.fftSize = 256;
        context.createMediaElementSource(audio).connect(analyzer); analyzer.connect(context.destination);
        const bytes = new Float32Array(analyzer.fftSize);
        const timer = setInterval(() => { analyzer.getFloatTimeDomainData(bytes); stats.rms = Math.max(stats.rms, Math.sqrt(bytes.reduce((sum, sample) => sum + sample * sample, 0) / bytes.length)); }, 20);
        let voice;
        voice = window.recordedVoice = new DeviceVoice(language, () => {
          if (stats.active.at(-1) !== voice.queue.active) stats.active.push(voice.queue.active);
        }, { createAudio: () => { stats.factories++; return audio; } });
        const descriptor = { kind: 'ride', stationId: 'beijing-railway-station', lineId: '2' };
        voice.offer('First full announcement', 0.1, 15, descriptor);
        document.querySelector('#enable').onclick = () => {
          void context.resume(); voice.enable();
          if (language === 'en' && stats.sources.length === 1) {
            voice.offer('Old pending', 0.1, 15, { ...descriptor, kind: 'stop' });
            voice.offer('Newest pending', 0.1, 15, { ...descriptor, kind: 'complete' });
          }
        };
        document.querySelector('#mute').onclick = () => voice.mute();
        window.disposeVoiceCheck = async () => { clearInterval(timer); voice.dispose(); await context.close(); };
      }, language);
      assert.equal(await page.evaluate(() => window.voiceStats.sources.length), 0, 'no playback before gesture');
      if (language === 'en') await page.locator('#enable').click(); else await page.locator('#enable').tap();
      await page.waitForFunction(() => window.recordedVoice.status === 'ready', null, { timeout: 10000 });
      await page.waitForFunction(() => window.voiceStats.sources.length >= 2, null, { timeout: 15000 });
      assert.equal(await page.evaluate(() => window.recordedVoice.queue.active), 'First full announcement', 'station part does not end the logical sentence');
      await page.waitForFunction(() => window.recordedVoice.queue.active === '' && window.recordedVoice.audioState === 'ended', null, { timeout: 60000 });
      const stats = await page.evaluate(() => window.voiceStats);
      assert.equal(stats.factories, 1, 'the same media element remains activated for all parts');
      assert.equal(stats.sources.length, language === 'en' ? 10 : 5);
      assert.ok(stats.sources.some(source => source.includes('/stations/beijing-railway-station.mp3')));
      assert.ok(stats.sources.some(source => source.includes('/lines/2.mp3')));
      assert.ok(stats.rms > 0.005, `${language}: decoded recording produces non-silent audio`);
      assert.ok(stats.progress > 0, `${language}: real playback advances`);
      if (language === 'en') {
        assert.ok(stats.active.includes('Newest pending')); assert.ok(!stats.active.includes('Old pending'));
      }
      if (language === 'mn-Mong-CN') assert.ok(stats.sources.some(source => source.includes('/phrases/mn-Cyrl-MN/')));
      if (language === 'en') {
        let identityRequests = 0;
        await page.route('**/audio/beijing/stations/beijing-railway-station.mp3', route => identityRequests++ === 0
          ? route.fulfill({ status: 404, contentType: 'text/plain', body: 'Missing recording' }) : route.continue());
        await page.evaluate(() => { window.recordedVoice.mute(); window.recordedVoice.offer('Still readable after failure', 1, 15, { kind: 'board', stationId: 'beijing-railway-station', lineId: '2' }); });
        await page.locator('#enable').click();
        await page.waitForFunction(() => window.recordedVoice.status === 'unavailable', null, { timeout: 15000 });
        assert.equal(await page.evaluate(() => window.recordedVoice.queue.enabled), false);
        const played = await page.evaluate(() => window.voiceStats.sources.length);
        assert.equal(played, 12, 'missing identity aborts the rest of the logical sentence');
        await page.evaluate(() => {
          window.recordedVoice.offer('Retry current', 1, 15, { kind: 'board', stationId: 'beijing-railway-station', lineId: '2' });
          document.querySelector('#enable').onclick = () => window.recordedVoice.replay('Retry current');
        });
        assert.equal(await page.evaluate(() => window.voiceStats.sources.length), played, 'offered captions do not automatically retry failed media');
        await page.locator('#enable').click();
        await page.waitForFunction(() => window.recordedVoice.status === 'ready', null, { timeout: 10000 });
        await page.waitForFunction(() => window.recordedVoice.queue.active === '' && window.recordedVoice.audioState === 'ended', null, { timeout: 30000 });
        assert.equal(await page.evaluate(() => window.voiceStats.sources.length), played + 5);
        assert.equal(await page.evaluate(() => window.voiceStats.factories), 1);
        console.log('PASS actual HTTP 404: caption retained, no automatic retries, complete explicit replay on same media element');
      }
      await page.locator('#mute').click();
      assert.equal(await page.evaluate(() => window.recordedVoice.status), 'off');
      await page.evaluate(() => window.disposeVoiceCheck());
      assert.deepEqual(external, [], 'recordings need no external runtime speech service'); assert.deepEqual(errors, []);
      console.log(`PASS ${language}: ${stats.sources.length} real MP3 parts; one media element; RMS ${stats.rms.toFixed(3)}`);
      await page.close();
    }
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
