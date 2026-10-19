import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNotePlayer, scheduleTone, type NotePlayer } from '../src/melody/audio';
import { midiToFrequency, type NoteEvent, type Score } from '../src/melody/model';

class Parameter {
  value = 0;
  setValueAtTime = vi.fn((value: number, _time: number) => { this.value = value; return this; });
  linearRampToValueAtTime = vi.fn((value: number, _time: number) => { this.value = value; return this; });
  cancelScheduledValues = vi.fn((_time: number) => this);
}
class Node {
  connect = vi.fn();
  disconnect = vi.fn();
}
class Gain extends Node { gain = new Parameter(); }
class Oscillator extends Node {
  type = 'square';
  frequency = new Parameter();
  detune = new Parameter();
  start = vi.fn();
  stop = vi.fn();
}
let initialState: AudioContextState;
let resumeFactory: (() => Promise<void>) | undefined;
let failCreation = false;
const contexts: Context[] = [];
class Context extends EventTarget {
  currentTime = 10;
  state: AudioContextState = initialState;
  destination = new Node();
  oscillators: Oscillator[] = [];
  gains: Gain[] = [];
  constructor() { super(); if (failCreation) throw new Error('context unavailable'); contexts.push(this); }
  createOscillator = vi.fn(() => { const value = new Oscillator(); this.oscillators.push(value); return value; });
  createGain = vi.fn(() => { const value = new Gain(); this.gains.push(value); return value; });
  resume = vi.fn(async () => { if (resumeFactory) await resumeFactory(); this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  changeState(state: AudioContextState) { this.state = state; this.dispatchEvent(new Event('statechange')); }
}
class Document extends EventTarget { hidden = false; }
class Window extends EventTarget { AudioContext: typeof Context | undefined = Context; }
let doc: Document;
let win: Window;
const players: NotePlayer[] = [];
const note = (patch: Partial<NoteEvent> = {}): NoteEvent => ({ letter: 'A', octave: 4, accidental: null, duration: 'quarter', dotted: false, rest: false, ...patch });
const score = (events = [note()]): Score => ({ clef: 'treble', key: 'C', meter: { beats: 4, unit: 4 }, events });
function player(options: Parameters<typeof createNotePlayer>[0] = {}) {
  const result = createNotePlayer(options); players.push(result); return result;
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const asContext = (context: Context) => context as unknown as BaseAudioContext;
const asNode = (node: Node) => node as unknown as AudioNode;
const environment = (globalThis as typeof globalThis & { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
beforeEach(() => {
  vi.useFakeTimers(); contexts.length = 0; initialState = 'running'; resumeFactory = undefined; failCreation = false;
  doc = new Document(); win = new Window();
  vi.stubGlobal('document', doc); vi.stubGlobal('window', win);
});
afterEach(() => { for (const value of players.splice(0)) value.dispose(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('pure sine tone scheduling', () => {
  it('schedules exact tuning, zero detune, a click-free envelope and stop at the boundary', () => {
    const context = new Context();
    const destination = new Node();
    const handles = scheduleTone(asContext(context), 69, 11, .5, asNode(destination));
    const oscillator = context.oscillators[0];
    const gain = context.gains[0];
    expect(handles).toEqual({ oscillator, gain });
    expect(oscillator.type).toBe('sine');
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledExactlyOnceWith(440, 11);
    expect(oscillator.detune.setValueAtTime).toHaveBeenCalledExactlyOnceWith(0, 11);
    expect(oscillator.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(destination);
    expect(oscillator.start).toHaveBeenCalledExactlyOnceWith(11);
    expect(oscillator.stop).toHaveBeenCalledExactlyOnceWith(11.5);
    expect(gain.gain.setValueAtTime.mock.calls).toEqual([[0, 11], [1, 11.482]]);
    expect(gain.gain.linearRampToValueAtTime.mock.calls).toEqual([[1, 11.008], [0, 11.5]]);
  });
  it('preserves frequency precision at every MIDI and keeps tiny envelopes inside duration', () => {
    const context = new Context();
    for (let midi = 0; midi <= 127; midi++) {
      scheduleTone(asContext(context), midi, 0, .001, asNode(context.destination));
      const oscillator = context.oscillators.at(-1)!;
      const gain = context.gains.at(-1)!;
      expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(midiToFrequency(midi), 0);
      expect(gain.gain.linearRampToValueAtTime.mock.calls).toEqual([[1, .00015], [0, .001]]);
      expect(gain.gain.setValueAtTime.mock.calls).toEqual([[0, 0], [1, .0008]]);
      expect(oscillator.stop).toHaveBeenCalledWith(.001);
    }
  });
  it('validates timing and pitches before creating nodes and cleans partial schedules', () => {
    const context = new Context();
    for (const [midi, start, duration] of [[128, 0, 1], [69, -1, 1], [69, NaN, 1], [69, 0, 0], [69, 0, Infinity]]) {
      expect(() => scheduleTone(asContext(context), midi, start, duration, asNode(context.destination))).toThrow(RangeError);
    }
    expect(context.oscillators).toHaveLength(0);
    context.createGain.mockImplementationOnce(() => { throw new Error('gain failure'); });
    expect(() => scheduleTone(asContext(context), 69, 0, 1, asNode(context.destination))).toThrow('gain failure');
    expect(context.oscillators[0].disconnect).toHaveBeenCalled();
  });
});

describe('note player playback', () => {
  it('allows incomplete previews, schedules rests silently and respects dotted rhythm/BPM', async () => {
    const value = player();
    expect(await value.play(score([note({ duration: 'eighth', dotted: true }), note({ rest: true }), note({ letter: 'C' })]), 120)).toBe(true);
    const context = contexts[0];
    expect(context.oscillators).toHaveLength(2);
    expect(context.oscillators[0].start).toHaveBeenCalledWith(10.025);
    expect(context.oscillators[0].stop).toHaveBeenCalledWith(10.4);
    expect(context.oscillators[1].start).toHaveBeenCalledWith(10.9);
    expect(context.oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(261.6255653005986, 10.9);
    expect(context.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(.25, 10);
    expect(value.playing).toBe(true);
  });
  it('uses the audio clock for rest highlighting, progress, lead-in and natural completion', async () => {
    const onPosition = vi.fn(); const onFinish = vi.fn();
    const value = player({ onPosition, onFinish });
    await value.play(score([note(), note({ rest: true })]), 120);
    const context = contexts[0];
    expect(value.elapsedSeconds).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(value.playing).toBe(true);
    expect(onPosition.mock.calls.length).toBeLessThanOrEqual(30);
    expect(onFinish).not.toHaveBeenCalled();
    context.currentTime = 10.275;
    expect(value.elapsedSeconds).toBeCloseTo(.25);
    vi.advanceTimersByTime(34);
    expect(onPosition).toHaveBeenLastCalledWith(0, .5);
    context.currentTime = 10.775;
    vi.advanceTimersByTime(34);
    expect(onPosition).toHaveBeenLastCalledWith(1, .5);
    context.currentTime = 11.025;
    vi.advanceTimersByTime(34);
    expect(value.playing).toBe(false);
    expect(value.elapsedSeconds).toBe(1);
    expect(onFinish).toHaveBeenCalledExactlyOnceWith();
    vi.advanceTimersByTime(1000);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(context.oscillators.every(n => n.disconnect.mock.calls.length > 0)).toBe(true);
    expect(context.gains.every(n => n.disconnect.mock.calls.length > 0)).toBe(true);
  });
  it('stop disconnects every node, cancels callbacks, resets elapsed and reuses only one context', async () => {
    const onPosition = vi.fn(); const onFinish = vi.fn();
    const value = player({ onPosition, onFinish });
    await value.play(score(), 60);
    const context = contexts[0];
    context.currentTime = 10.5;
    value.stop(); value.stop();
    expect(value.playing).toBe(false); expect(value.elapsedSeconds).toBe(0);
    expect(context.oscillators[0].disconnect).toHaveBeenCalled();
    expect(context.gains.every(n => n.disconnect.mock.calls.length > 0)).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(onPosition).not.toHaveBeenCalled(); expect(onFinish).not.toHaveBeenCalled();
    await value.play(score(), 60);
    expect(contexts).toHaveLength(1);
    expect(context.oscillators).toHaveLength(2);
  });
  it('supports explicitly silent muted/zero-volume playback, volume clamps and ramped changes', async () => {
    const value = player(); value.setMuted(true); value.setVolume(.8);
    expect(await value.play(score(), 80)).toBe(true);
    const context = contexts[0]; const master = context.gains[0];
    expect(master.gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
    value.setMuted(false);
    expect(master.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(.8, 10.01);
    value.setVolume(2);
    expect(master.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(1, 10.01);
    value.setVolume(-1);
    expect(master.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 10.01);
    expect(() => value.setVolume(NaN)).toThrow(RangeError);
    expect(await value.play(score(), 80)).toBe(true);
    expect(context.gains[2].gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
    expect(value.playing).toBe(true);
    value.stop(); value.setMuted(false); value.setVolume(.5);
    vi.advanceTimersByTime(5000);
    expect(value.playing).toBe(false);
    expect(context.oscillators).toHaveLength(2);
  });
  it('accepts a rest-only preview without oscillator sources', async () => {
    const value = player();
    expect(await value.play(score([note({ rest: true })]), 160)).toBe(true);
    expect(contexts[0].oscillators).toHaveLength(0);
    expect(value.playing).toBe(true);
  });
  it('rejects invalid drafts, malformed inputs and out-of-bounds BPM without audio creation', async () => {
    const unavailable = vi.fn(); const value = player({ onUnavailable: unavailable });
    for (const invalid of [score([]), score([note({ octave: 9 })]), score([note({ duration: 'half', dotted: true }), note({ duration: 'half' })]),
      score(Array.from({ length: 17 }, () => note({ duration: 'sixteenth' }))), null as unknown as Score]) {
      expect(await value.play(invalid, 80)).toBe(false);
    }
    for (const bpm of [0, 39, 161, NaN, Infinity]) expect(await value.play(score(), bpm)).toBe(false);
    expect(contexts).toHaveLength(0); expect(unavailable).not.toHaveBeenCalled();
    expect(await value.play(score(), 40)).toBe(true);
  });
});

describe('resume races, native lifecycle and failures', () => {
  it.each(['stop', 'dispose'] as const)('%s during gesture-synchronous pending resume prevents ghost audio', async operation => {
    initialState = 'suspended'; const pending = deferred(); resumeFactory = () => pending.promise;
    const unavailable = vi.fn(); const value = player({ onUnavailable: unavailable });
    const playing = value.play(score(), 80);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
    expect(contexts[0].oscillators).toHaveLength(0);
    value[operation](); pending.resolve();
    expect(await playing).toBe(false);
    expect(contexts[0].oscillators).toHaveLength(0);
    expect(value.playing).toBe(false); expect(unavailable).not.toHaveBeenCalled();
  });
  it('a new play supersedes pending resume; only the latest melody is scheduled', async () => {
    initialState = 'suspended'; const pending = deferred(); resumeFactory = () => pending.promise;
    const value = player();
    const first = value.play(score(), 80);
    const second = value.play(score([note({ letter: 'C' })]), 80);
    pending.resolve();
    expect(await first).toBe(false); expect(await second).toBe(true);
    expect(contexts).toHaveLength(1); expect(contexts[0].oscillators).toHaveLength(1);
    expect(contexts[0].oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(midiToFrequency(60), 10.025);
  });
  it('stale rejected resume does not stop or report an error for newer playback', async () => {
    initialState = 'suspended'; const firstResume = deferred(); const secondResume = deferred();
    let calls = 0; resumeFactory = () => (++calls === 1 ? firstResume.promise : secondResume.promise);
    const unavailable = vi.fn(); const value = player({ onUnavailable: unavailable });
    const first = value.play(score(), 80); const second = value.play(score(), 80);
    secondResume.resolve(); expect(await second).toBe(true);
    firstResume.reject(new Error('old resume rejected')); expect(await first).toBe(false);
    expect(value.playing).toBe(true); expect(unavailable).not.toHaveBeenCalled();
  });
  it('hidden/pagehide cancels active or pending audio and visibility/pageshow never auto-replays', async () => {
    initialState = 'suspended'; const pending = deferred(); resumeFactory = () => pending.promise;
    const value = player(); const first = value.play(score(), 80);
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); pending.resolve();
    expect(await first).toBe(false); expect(contexts[0].oscillators).toHaveLength(0);
    expect(await value.play(score(), 80)).toBe(false);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('pageshow'));
    expect(value.playing).toBe(false);
    await value.play(score(), 80);
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    expect(value.playing).toBe(false); expect(contexts[0].oscillators[0].disconnect).toHaveBeenCalled();
    doc.hidden = false;
    await value.play(score(), 80);
    win.dispatchEvent(new Event('pagehide'));
    expect(value.playing).toBe(false);
    win.dispatchEvent(new Event('pageshow'));
    expect(value.playing).toBe(false);
  });
  it('context interruption stops playback so resuming cannot replay stale sources', async () => {
    const value = player(); await value.play(score(), 80);
    const context = contexts[0]; context.changeState('suspended');
    expect(value.playing).toBe(false); expect(context.oscillators[0].disconnect).toHaveBeenCalled();
    context.changeState('running'); vi.advanceTimersByTime(1000);
    expect(value.playing).toBe(false);
  });
  it('dispose closes the context once, removes native listeners and cannot recreate audio', async () => {
    const removeDocument = vi.spyOn(doc, 'removeEventListener'); const removeWindow = vi.spyOn(win, 'removeEventListener');
    const value = player(); await value.play(score(), 80);
    const context = contexts[0]; const removeContext = vi.spyOn(context, 'removeEventListener');
    value.dispose(); value.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith('pagehide', expect.any(Function));
    expect(removeContext).toHaveBeenCalledWith('statechange', expect.any(Function));
    expect(await value.play(score(), 80)).toBe(false);
    expect(contexts).toHaveLength(1);
  });
  it('reports unsupported/context creation/resume/closed/scheduling failures, never success in silence', async () => {
    const unavailable = vi.fn(); const value = player({ onUnavailable: unavailable });
    win.AudioContext = undefined; expect(await value.play(score(), 80)).toBe(false);
    win.AudioContext = Context; failCreation = true; expect(await value.play(score(), 80)).toBe(false);
    failCreation = false; initialState = 'suspended'; resumeFactory = async () => { throw new Error('denied'); };
    expect(await value.play(score(), 80)).toBe(false);
    const context = contexts[0]; context.state = 'closed'; expect(await value.play(score(), 80)).toBe(false);
    expect(unavailable).toHaveBeenCalledTimes(4);
    const other = player({ onUnavailable: unavailable }); initialState = 'running';
    await other.play(score(), 80); other.stop();
    const otherContext = contexts[1]; otherContext.createOscillator.mockImplementationOnce(() => { throw new Error('scheduling failure'); });
    expect(await other.play(score(), 80)).toBe(false); expect(other.playing).toBe(false);
    expect(unavailable).toHaveBeenCalledTimes(5);
  });
  it('a resume resolving without a running context is unavailable, not successful silence', async () => {
    initialState = 'suspended'; const value = player({ onUnavailable: vi.fn() });
    const pending = deferred(); resumeFactory = () => pending.promise;
    const playing = value.play(score(), 80);
    contexts[0].resume.mockImplementationOnce(async () => {});
    pending.resolve(); await playing; value.stop(); contexts[0].state = 'suspended';
    expect(await value.play(score(), 80)).toBe(false);
    expect(value.playing).toBe(false);
  });
});

// Opt-in actual browser verification: $env:MELODY_BROWSER='1'; npm test -- tests\melody-audio.test.ts
it.skipIf(environment.MELODY_BROWSER !== '1')('renders pure, correctly tuned sine spectra and exact silent boundaries in real OfflineAudioContext', async () => {
  vi.useRealTimers();
  const { createServer } = await import('vite');
  const childModule: string = 'node:child_process';
  const fsModule: string = 'node:fs/promises';
  const pathModule: string = 'node:path';
  const { spawn } = await import(childModule);
  const { mkdir, rm } = await import(fsModule);
  const { resolve } = await import(pathModule);
  const profile: string = resolve('.melody-audio-browser-profile');
  await mkdir(profile, { recursive: true });
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] },
    server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent', plugins: [{ name: 'melody-offline-check', configureServer(server) {
      server.middlewares.use('/melody-frequency-check', (_request, response) => {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><body>Melody audio check</body>');
      });
    } }],
  });
  let child: ReturnType<typeof spawn> | undefined;
  let socket: WebSocket | undefined;
  let closeBrowser: (() => Promise<unknown>) | undefined;
  let renderTimeout: ReturnType<typeof setTimeout> | undefined;
  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
  try {
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw new Error('Missing local server address');
    const base = `http://127.0.0.1:${address.port}`;
    const audioResponse = await fetch(`${base}/src/melody/audio.ts`);
    if (!audioResponse.ok) throw new Error(`Audio module HTTP ${audioResponse.status}: ${(await audioResponse.text()).slice(0, 1500)}`);
    child = spawn(environment.MELODY_EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--remote-debugging-port=0', `--user-data-dir=${profile}`, `${base}/melody-frequency-check`,
    ], { env: { ...environment, TEMP: profile, TMP: profile }, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = ''; let launchError: Error | undefined;
    child.on('error', (error: Error) => { launchError = error; });
    child.stderr.on('data', (data: { toString(): string }) => { stderr += data.toString(); });
    let port: string | undefined;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launchError) throw launchError;
      const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { port = match[1]; break; }
      await sleep(100);
    }
    if (!port) throw new Error(`No Edge debugging endpoint: ${stderr.slice(0, 500)}`);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json() as { type: string; webSocketDebuggerUrl: string }[];
    const page = targets.find(target => target.type === 'page');
    if (!page) throw new Error('No Edge page target');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      socket!.addEventListener('open', () => resolve(), { once: true });
      socket!.addEventListener('error', reject, { once: true });
    });
    type Response = { result?: { value?: unknown }; exceptionDetails?: unknown };
    let nextId = 0;
    const pending = new Map<number, { resolve: (result: Response) => void; reject: (error: unknown) => void }>();
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      const entry = pending.get(message.id);
      if (entry) { pending.delete(message.id); if (message.error) entry.reject(message.error); else entry.resolve(message.result); }
    });
    const call = (method: string, params: object = {}) => new Promise<Response>((resolve, reject) => {
      const id = ++nextId; pending.set(id, { resolve, reject }); socket!.send(JSON.stringify({ id, method, params }));
    });
    closeBrowser = () => Promise.race([call('Browser.close').catch(() => {}), sleep(1000)]);
    await call('Page.navigate', { url: `${base}/melody-frequency-check` });
    for (let attempt = 0; attempt < 100; attempt++) {
      const loaded = await call('Runtime.evaluate', { expression: 'location.href + "|" + document.readyState', returnByValue: true });
      if (loaded.result?.value === `${base}/melody-frequency-check|complete`) break;
      await sleep(100);
    }
    async function check(base: string) {
      const audioPath = `${base}/src/melody/audio.ts`;
      const modelPath = `${base}/src/melody/model.ts`;
      const browserImport = new Function('path', 'return import(path)');
      const { scheduleTone } = await browserImport(audioPath);
      const { midiToFrequency } = await browserImport(modelPath);
      const results = [];
      for (const midi of [0, 12, 59, 60, 65, 69, 81, 120, 127]) {
        const rate = 44100;
        const offline = new OfflineAudioContext(1, Math.ceil(3.2 * rate), rate);
        const master = offline.createGain(); master.gain.value = .25; master.connect(offline.destination);
        scheduleTone(offline, midi, .1, 3, master);
        const data = (await offline.startRendering()).getChannelData(0);
        const first = Math.ceil(.13 * rate), last = Math.floor(3.07 * rate);
        const expected = midiToFrequency(midi), crossings: number[] = [];
        let power = 0, real = 0, imaginary = 0;
        for (let i = first; i < last; i++) {
          if (data[i] <= 0 && data[i + 1] > 0) crossings.push((i - data[i] / (data[i + 1] - data[i])) / rate);
          power += data[i] * data[i];
          real += data[i] * Math.cos(2 * Math.PI * expected * i / rate);
          imaginary += data[i] * Math.sin(2 * Math.PI * expected * i / rate);
        }
        const measured = (crossings.length - 1) / (crossings.at(-1)! - crossings[0]);
        const fundamentalPowerRatio = 2 * (real * real + imaginary * imaginary) / ((last - first) * power);
        const tailSilent = data.slice(Math.ceil(3.101 * rate)).every(x => x === 0);
        results.push({ midi, expected, measured, fundamentalPowerRatio, tailSilent, rms: Math.sqrt(power / (last - first)) });
      }
      return results;
    }
    const result = await Promise.race([
      call('Runtime.evaluate', { expression: `(${check.toString()})(${JSON.stringify(base)})`, awaitPromise: true, returnByValue: true }),
      new Promise<never>((_resolve, reject) => { renderTimeout = setTimeout(() => reject(new Error('Offline rendering timed out')), 45000); }),
    ]);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    const metrics = result.result?.value as { midi: number; expected: number; measured: number; fundamentalPowerRatio: number; tailSilent: boolean; rms: number }[];
    expect(metrics).toHaveLength(9);
    for (const metric of metrics) {
      expect(Math.abs(metric.measured - metric.expected), `MIDI ${metric.midi} frequency`).toBeLessThan(.02);
      expect(metric.fundamentalPowerRatio, `MIDI ${metric.midi} spectrum`).toBeGreaterThan(.95);
      expect(metric.tailSilent, `MIDI ${metric.midi} release`).toBe(true);
      expect(metric.rms).toBeGreaterThan(.16); expect(metric.rms).toBeLessThan(.19);
    }
    console.info('Offline tuning verified:', JSON.stringify(metrics));
  } finally {
    if (renderTimeout !== undefined) clearTimeout(renderTimeout);
    if (socket?.readyState === WebSocket.OPEN) await closeBrowser?.();
    socket?.close();
    if (child && child.exitCode === null) { await sleep(500); if (child.exitCode === null) child.kill(); }
    await server.close();
    await sleep(500);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}, 90000);
