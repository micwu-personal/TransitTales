// Run with: node tests\escalator-music.browser.cjs (requires an available Chromium/Edge).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function render(page, instrument, volume, seconds) {
  return page.evaluate(async ({ instrument, volume, seconds }) => {
    const { createRelaxingMusic, RELAXING_COMPOSITION: score } = await import('/src/escalator/music.ts');
    const sampleRate = 22050;
    const loopSeconds = score.loopBeats * 60 / score.bpm;
    const duration = seconds ?? loopSeconds + 0.5;
    const offline = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);
    const originalContext = window.AudioContext;
    const originalTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;
    const callbacks = new Map();
    const bowed = new WeakSet();
    const plucked = new WeakSet();
    const outputs = new WeakMap();
    let timer = 0;
    let context;
    let sources = 0;
    let unavailable = 0;
    class RenderContext {
      currentTime = 0;
      state = 'running';
      destination = offline.destination;
      constructor() { context = this; }
      resume() { return Promise.resolve(); }
      close() { this.state = 'closed'; return Promise.resolve(); }
      createBiquadFilter() { return offline.createBiquadFilter(); }
      createGain() {
        const gain = offline.createGain();
        const ramp = gain.gain.exponentialRampToValueAtTime.bind(gain.gain);
        gain.gain.exponentialRampToValueAtTime = (...args) => { plucked.add(gain); return ramp(...args); };
        return gain;
      }
      createOscillator() {
        const source = offline.createOscillator();
        sources++;
        const curve = source.detune.setValueCurveAtTime.bind(source.detune);
        source.detune.setValueCurveAtTime = (...args) => { bowed.add(source); return curve(...args); };
        const connect = source.connect.bind(source);
        source.connect = target => { outputs.set(source, target); return connect(target); };
        const start = source.start.bind(source);
        source.start = time => {
          const timbre = bowed.has(source) ? 'strings' : plucked.has(outputs.get(source)) ? 'harp' : 'other';
          if (instrument !== 'all' && timbre !== instrument) source.disconnect();
          return start(time);
        };
        return source;
      }
    }
    window.AudioContext = RenderContext;
    window.setTimeout = callback => { callbacks.set(++timer, callback); return timer; };
    window.clearTimeout = id => { callbacks.delete(id); };
    const music = createRelaxingMusic({ onUnavailable: () => unavailable++ });
    try {
      music.setVolume(volume);
      if (!await music.start()) throw new Error('Offline synthesis did not start');
      // Feed the production lookahead scheduler deterministic audio time, not wall time.
      for (let time = 0.05; time < Math.min(duration - 0.3, loopSeconds - 0.3); time += 0.05) {
        context.currentTime = time;
        const pending = [...callbacks.values()]; callbacks.clear();
        pending.forEach(callback => callback());
        if (!music.playing || callbacks.size !== 1) throw new Error(`Scheduler failed at ${time}s`);
      }
      const buffer = await offline.startRendering();
      const samples = buffer.getChannelData(0);
      let sum = 0, peak = 0, lastPeak = 0;
      for (let index = 0; index < samples.length; index++) {
        const value = samples[index];
        if (!Number.isFinite(value)) throw new Error('Non-finite audio sample');
        sum += value * value;
        peak = Math.max(peak, Math.abs(value));
        if (index > samples.length - sampleRate * 0.2) lastPeak = Math.max(lastPeak, Math.abs(value));
      }
      return { rms:Math.sqrt(sum / samples.length), peak, lastPeak, sources, unavailable, events:score.events.length };
    } finally {
      music.dispose();
      window.AudioContext = originalContext;
      window.setTimeout = originalTimeout;
      window.clearTimeout = originalClearTimeout;
    }
  }, { instrument, volume, seconds });
}

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server:{ host:'127.0.0.1', port:0 }, logLevel:'error' });
  server.middlewares.use('/music-check', (_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html><head><title>Music synthesis check</title></head><body></body></html>');
  });
  let browser;
  try {
    await server.listen();
    const options = { headless:true };
    try { browser = await chromium.launch(options); }
    catch { browser = await chromium.launch({ ...options, channel:'msedge' }); }
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/music-check`);
    const full = await render(page, 'all', 0.35);
    const strings = await render(page, 'strings', 0.35);
    const harp = await render(page, 'harp', 0.35);
    const muted = await render(page, 'all', 0, 8);
    for (const [instrument, metrics] of Object.entries({ full, strings, harp })) {
      assert.equal(metrics.unavailable, 0, `${instrument}: browser accepted all audio automation`);
      assert.ok(metrics.rms > 0.0005 && metrics.rms < 0.04, `${instrument}: audible but quiet RMS ${metrics.rms}`);
      assert.ok(metrics.peak < 0.15, `${instrument}: quiet, unclipped peak ${metrics.peak}`);
      assert.equal(metrics.lastPeak, 0, `${instrument}: finite notes settle to silence at the loop boundary`);
      assert.ok(metrics.sources < 1000, `${instrument}: bounded oscillator allocation`);
    }
    assert.ok(strings.rms / full.rms > 0.1, 'bowed strings make an audible contribution');
    assert.ok(harp.rms / full.rms > 0.1, 'harp makes an audible contribution');
    assert.ok(Math.abs(strings.rms - harp.rms) > 0.0001, 'new instruments have distinct sustained/plucked envelopes');
    assert.equal(muted.peak, 0, 'volume zero renders complete silence');
    console.log(JSON.stringify({ events:full.events, full, strings, harp, muted }, null, 2));
    console.log('PASS: real WebAudio renders the complete score, both new timbres and volume-zero silence.');
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
