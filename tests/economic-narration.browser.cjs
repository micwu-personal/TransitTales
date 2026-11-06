const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { createServer, preview } = await import('vite');
  const source = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let production, browser;
  try {
    await source.listen();
    const model = await source.ssrLoadModule(path.resolve('src', 'economic', 'model.ts'));
    const storage = await source.ssrLoadModule(path.resolve('src', 'economic', 'storage.ts'));
    const guidance = await source.ssrLoadModule(path.resolve('src', 'economic', 'narration-guidance.ts'));
    const manifest = JSON.parse(fs.readFileSync(path.resolve('public', 'audio', 'economic', 'manifest.json'), 'utf8'));
    assert.equal(manifest.complete, true);
    const sequences = new Function('return ' + fs.readFileSync(path.resolve('tests', 'economic-life.test.ts'), 'utf8').match(/const sequences = ([\s\S]*?);\r?\nfunction entry/)[1])();
    production = await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    const url = process.env.ECONOMIC_AUDIO_URL || production.resolvedUrls.local[0];
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : undefined);
    browser = await chromium.launch({ headless: true, executablePath });
    const errors = [], results = [];
    for (const lang of ['zh', 'en', 'ja', 'mn', 'mn-Mong']) for (const gender of ['boy', 'girl']) for (const level of [1, 19]) {
      let state = model.createGame({ children: 2, gender });
      for (let i = 0; i < level; i++) {
        for (const id of sequences[i]) {
          const result = model.act(state, id);
          assert(result.ok, `${i}:${id}`);
          state = result.state;
        }
        state = model.advance(state);
      }
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const requested = new Set();
      page.on('request', request => requested.add(request.url()));
      await page.addInitScript(({ key, state, lang }) => {
        localStorage.setItem(key, JSON.stringify({ state, checkpoint: state, lang }));
        const OriginalAudio = window.Audio;
        window.__audioPlayers = []; window.__audioEnded = []; window.__audioPlayed = []; window.__audioErrors = []; window.__audioCues = []; window.__audioWavs = {};
        const createObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = blob => { const url = createObjectURL(blob); window.__audioWavs[url] = blob; return url; };
        window.Audio = function (...args) {
          const audio = new OriginalAudio(...args);
          window.__audioPlayers.push(audio);
          audio.addEventListener('playing', () => window.__audioPlayed.push(audio.src));
          audio.addEventListener('ended', () => { window.__audioEnded.push(audio.src); window.__audioCues.push({ url: audio.src, ids: JSON.parse(audio.dataset.narrationScripts) }); });
          audio.addEventListener('error', () => window.__audioErrors.push(audio.src));
          return audio;
        };
        window.Audio.prototype = OriginalAudio.prototype;
        const originalFetch = window.fetch;
        window.fetch = (...args) => originalFetch(...args).then(response => {
          if (String(args[0]).endsWith('audio/economic/manifest.json')) response.clone().json().then(data => { window.__manifestComplete = data.complete; });
          return response;
        });
      }, { key: storage.SAVE_KEY, state, lang });
      await page.goto(new URL('economic.html', url).href);
      await page.waitForFunction(() => window.__manifestComplete === true);
      await page.locator('#go-story').click();
      await page.locator('[data-ui="stop"]').click();
      const offers = model.getActions(state, model.getLevel(state).place);
      const offer = offers.find(candidate => candidate.disabled) || offers[0];
      assert(offer);
      const ids = guidance.choiceNarration(state, offer, lang);
      const speech = lang === 'mn-Mong' ? 'mn' : lang;
      const expected = ids.map(cue => typeof cue === 'string' ? [cue] : [...cue]);
      const recording = id => new URL('audio/economic/' + manifest.recordings[`${speech}|${gender}|${id}`].file, url).href;
      await page.evaluate(() => { window.__audioEnded = []; window.__audioPlayed = []; window.__audioErrors = []; window.__audioCues = []; });
      const saved = await page.evaluate(key => localStorage.getItem(key), storage.SAVE_KEY);
      await page.locator(`[data-listen="${offer.id}"]`).click();
      // Seek only after real playback begins; this checks media activation and queue order, not pronunciation.
      await page.waitForFunction(expectedCount => {
        for (const audio of window.__audioPlayers) if (!audio.paused && Number.isFinite(audio.duration) && audio.currentTime < audio.duration - 0.08) audio.currentTime = Math.max(0, audio.duration - 0.05);
        return window.__audioEnded.length >= expectedCount;
      }, expected.length, { timeout: 60000, polling: 100 });
      const evidence = await page.evaluate(async () => ({
        ended: window.__audioEnded, played: window.__audioPlayed, cues: window.__audioCues,
        errors: window.__audioErrors, players: window.__audioPlayers.length, status: document.querySelector('.narration-status').textContent,
        wavs: Object.fromEntries(await Promise.all(Object.entries(window.__audioWavs).map(async ([url, blob]) => {
          const view = new DataView(await blob.arrayBuffer());
          return [url, { type: blob.type, channels: view.getUint16(22, true), sampleRate: view.getUint32(24, true), samples: view.getUint32(40, true) / 2 }];
        })))
      }));
      assert.deepEqual(evidence.cues.map(cue => cue.ids), expected, `${lang}/${gender}/${level}`);
      for (let i = 0; i < expected.length; i++) {
        if (expected[i].length === 1) assert.equal(evidence.ended[i], recording(expected[i][0]));
        else {
          assert(evidence.ended[i].startsWith('blob:'));
          const wav = evidence.wavs[evidence.ended[i]];
          assert.equal(wav.type, 'audio/wav'); assert.equal(wav.channels, 1); assert.equal(wav.sampleRate, 24000);
          assert(wav.samples > 0 && wav.samples <= 60 * wav.sampleRate);
          for (const id of expected[i]) assert(requested.has(recording(id)), `Unfetched constituent ${id}`);
        }
      }
      assert.deepEqual(evidence.errors, []);
      assert.equal(evidence.players, 1);
      assert.equal(evidence.status, '');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), storage.SAVE_KEY), saved, 'Listening changed the saved choice');
      results.push({ lang, gender, level, disabled: !!offer.disabled, clips: expected.length, prerecordedFragments: expected.flat().length, continuousClauses: expected.filter(cue => cue.length > 1).length, retainedAudioElements: evidence.players });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
    assert.deepEqual(errors, []);
    const artifacts = path.resolve('artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    fs.writeFileSync(path.join(artifacts, 'economic-final-bundle-audio-results.json'), JSON.stringify(results, null, 2));
    console.log('Production bundle:20 cases, all5 written locales/all8 voices, exact choice/FX constituent IDs, real continuous Chinese WAV playback and one retained player passed. Audio seeking used; not pronunciation certification.');
  } finally {
    await browser?.close();
    await new Promise(resolve => production ? production.httpServer.close(resolve) : resolve());
    await source.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
