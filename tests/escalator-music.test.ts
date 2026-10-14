import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clampMusicVolume, createRelaxingMusic, midiToFrequency, RELAXING_COMPOSITION, type RelaxingMusic } from '../src/escalator/music';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn((value: number, _time: number) => { this.value = value; return this; });
  linearRampToValueAtTime = vi.fn((value: number, _time: number) => { this.value = value; return this; });
  exponentialRampToValueAtTime = vi.fn((value: number, _time: number) => { this.value = value; return this; });
  cancelScheduledValues = vi.fn((_time: number) => this);
  cancelAndHoldAtTime = vi.fn((_time: number) => this);
}
class FakeNode {
  connect = vi.fn((_node: unknown) => this);
  disconnect = vi.fn();
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine';
  frequency = new FakeParam();
  detune = new FakeParam();
  onended: (() => void) | null = null;
  ended = false;
  stopTime = Infinity;
  start = vi.fn((_time: number) => {});
  stop = vi.fn((time: number) => { this.stopTime = time; });
  finish() { if (!this.ended) { this.ended = true; this.onended?.(); } }
}
class FakeContext {
  static instances: FakeContext[] = [];
  static failConstruction = false;
  static initialState: AudioContextState = 'suspended';
  static resumeImpl: (context: FakeContext) => Promise<void> = async context => { context.state = 'running'; };
  state: AudioContextState = FakeContext.initialState;
  currentTime = 0;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  sources: FakeOscillator[] = [];
  resume = vi.fn(() => FakeContext.resumeImpl(this));
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain = vi.fn(() => { const node = new FakeGain(); this.gains.push(node); return node; });
  createOscillator = vi.fn(() => { const source = new FakeOscillator(); this.sources.push(source); return source; });
  constructor() {
    if (FakeContext.failConstruction) throw new Error('Device unavailable');
    FakeContext.instances.push(this);
  }
  elapse(seconds: number) {
    this.currentTime += seconds;
    for (const source of this.sources) if (source.stopTime <= this.currentTime) source.finish();
  }
}
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const controllers: RelaxingMusic[] = [];
function controller(options?: { onUnavailable?: () => void }) {
  const music = createRelaxingMusic(options);
  controllers.push(music);
  return music;
}
function latestContext() { return FakeContext.instances.at(-1)!; }
async function flush() { await Promise.resolve(); await Promise.resolve(); }
async function advance(audio: FakeContext, seconds: number) {
  const steps = Math.round(seconds / 0.05);
  for (let step = 0; step < steps; step++) { audio.elapse(0.05); await vi.advanceTimersByTimeAsync(50); }
}
beforeEach(() => {
  vi.useFakeTimers();
  FakeContext.instances = [];
  FakeContext.failConstruction = false;
  FakeContext.initialState = 'suspended';
  FakeContext.resumeImpl = async context => { context.state = 'running'; };
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('webkitAudioContext', undefined);
});
afterEach(() => {
  for (const music of controllers.splice(0)) music.dispose();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('original relaxing composition', () => {
  it('exports frozen, deterministic 32-bar note data at 70 BPM', () => {
      expect(RELAXING_COMPOSITION).toMatchObject({ bpm: 70, bars: 32, beatsPerBar: 4, loopBeats: 128 });
      expect(RELAXING_COMPOSITION.events).toHaveLength(266);
    expect(Object.isFrozen(RELAXING_COMPOSITION)).toBe(true);
    expect(Object.isFrozen(RELAXING_COMPOSITION.events)).toBe(true);
    const instruments = new Set<string>();
    let previousBeat = -1;
    for (const event of RELAXING_COMPOSITION.events) {
      expect(Object.isFrozen(event)).toBe(true);
      for (const value of [event.beat, event.durationBeats, event.midi, event.velocity]) expect(Number.isFinite(value)).toBe(true);
      expect(event.beat).toBeGreaterThanOrEqual(previousBeat);
      expect(event.beat).toBeGreaterThanOrEqual(0);
      expect(event.beat).toBeLessThan(RELAXING_COMPOSITION.loopBeats);
      expect(event.durationBeats).toBeGreaterThan(0);
      expect(event.beat + event.durationBeats).toBeLessThanOrEqual(RELAXING_COMPOSITION.loopBeats);
      expect(Number.isInteger(event.midi)).toBe(true);
      expect(event.midi).toBeGreaterThanOrEqual(0);
      expect(event.midi).toBeLessThanOrEqual(127);
      expect(event.velocity).toBeGreaterThan(0);
      expect(event.velocity).toBeLessThanOrEqual(1);
      expect(midiToFrequency(event.midi)).toBeGreaterThan(0);
      instruments.add(event.instrument);
      previousBeat = event.beat;
    }
    expect([...instruments].sort()).toEqual(['air', 'bass', 'bell', 'pad']);
  });
  it('develops an answering section, spacious borrowed-color bridge, and recognizable reprise', () => {
    const { events, sections, harmonies } = RELAXING_COMPOSITION;
    expect(sections).toEqual([
      { name:'A', startBar:0, bars:8 }, { name:'B', startBar:8, bars:8 },
      { name:'bridge', startBar:16, bars:8 }, { name:'reprise', startBar:24, bars:8 },
    ]);
    expect(Object.isFrozen(sections)).toBe(true);
    expect(sections.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(harmonies)).toBe(true);
    expect(harmonies).toHaveLength(32);
    expect(new Set(harmonies).size).toBeGreaterThanOrEqual(16);
    expect(harmonies.slice(16, 24)).toContain('Cmaj9');
    expect(harmonies.slice(16, 24)).toContain('Gm6');
    expect(harmonies.at(-1)).toBe('D6/9');
    const notes = (bar: number, instrument: string) => events.filter(e => e.instrument === instrument && Math.floor(e.beat / 4) === bar);
    const rhythm = (bar: number, instrument: string) => notes(bar, instrument).map(e => [e.beat % 4, e.durationBeats]);
    expect(new Set(Array.from({ length:32 }, (_, bar) => JSON.stringify(rhythm(bar, 'bell')))).size).toBeGreaterThan(20);
    expect(new Set(Array.from({ length:32 }, (_, bar) => JSON.stringify(rhythm(bar, 'bass')))).size).toBeGreaterThan(12);
    expect(notes(19, 'bell')).toHaveLength(0);
    expect(notes(19, 'pad')).toHaveLength(4);
    expect(notes(19, 'air')).toHaveLength(1);
    expect(notes(0, 'bell').map(e => [e.beat % 4, e.midi])).toEqual(notes(24, 'bell').map(e => [e.beat % 4, e.midi]));
    const melodies = sections.map(section => events.filter(e => e.instrument === 'bell' && e.beat >= section.startBar * 4 && e.beat < (section.startBar + section.bars) * 4));
    expect(Math.max(...melodies[1].map(e => e.midi))).toBeGreaterThan(Math.max(...melodies[0].map(e => e.midi)));
    expect(melodies[2].length).toBeLessThan(melodies[0].length);
    expect(Math.max(...melodies[3].map(e => e.velocity))).toBeLessThan(Math.max(...melodies[0].map(e => e.velocity)));
    expect(events.filter(e => e.instrument === 'air')).toHaveLength(9);
  });
  it('converts MIDI tuning and clamps unsafe volume inputs', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(81)).toBe(880);
    expect(midiToFrequency(60)).toBeCloseTo(261.625565);
    expect([-2, 0, 0.37, 1, 4, NaN, Infinity, -Infinity].map(clampMusicVolume)).toEqual([0, 0, 0.37, 1, 1, 0, 1, 0]);
  });
});

describe('gesture-driven music and scheduling', () => {
  it('does not create an audio context, timer, or sources before a gesture', async () => {
    const music = controller();
    music.setVolume(0.25);
    music.setHidden(true);
    music.setHidden(false);
    expect(music.playing).toBe(false);
    expect(FakeContext.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    const result = music.start();
    expect(latestContext().resume).toHaveBeenCalledOnce();
    expect(music.playing).toBe(false);
    expect(await result).toBe(true);
    expect(latestContext().gains[0].gain.value).toBe(0.25);
    expect(music.playing).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
  });
  it('shares a pending resume and does not duplicate a running scheduler on repeated starts', async () => {
    const gate = deferred();
    FakeContext.resumeImpl = context => gate.promise.then(() => { context.state = 'running'; });
    const music = controller();
    const first = music.start();
    const second = music.start();
    expect(first).toBe(second);
    expect(latestContext().resume).toHaveBeenCalledOnce();
    gate.resolve();
    expect(await first).toBe(true);
    const sources = latestContext().sources.length;
    expect(await music.start()).toBe(true);
    expect(latestContext().sources).toHaveLength(sources);
    expect(latestContext().resume).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);
  });
  it('synthesizes finite quiet notes and repeats the same loop without accumulating live nodes', async () => {
    const music = controller();
    expect(await music.start()).toBe(true);
    const audio = latestContext();
    const loopSeconds = RELAXING_COMPOSITION.loopBeats * 60 / RELAXING_COMPOSITION.bpm;
    await advance(audio, loopSeconds + 0.3);
    expect(music.playing).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    const bass = audio.sources.filter(source => source.frequency.setValueAtTime.mock.calls[0][0] === midiToFrequency(38));
    expect(bass.length).toBeGreaterThanOrEqual(2);
    const opening = bass[0].start.mock.calls[0][0];
    expect(bass.some(source => Math.abs(source.start.mock.calls[0][0] - opening - loopSeconds) < 0.001)).toBe(true);
    expect(audio.sources.filter(source => source.onended !== null).length).toBeLessThan(30);
    expect(audio.sources.filter(source => source.ended).every(source => source.disconnect.mock.calls.length === 1)).toBe(true);
    for (const source of audio.sources) {
      expect(['sine', 'triangle']).toContain(source.type);
      expect(Number.isFinite(source.start.mock.calls[0][0])).toBe(true);
      expect(Number.isFinite(source.stopTime)).toBe(true);
      expect(source.stopTime).toBeGreaterThan(source.start.mock.calls[0][0]);
      expect(Number.isFinite(source.frequency.value)).toBe(true);
    }
    for (const gain of audio.gains.slice(2)) {
      expect(gain.gain.value).toBeLessThanOrEqual(1);
      const calls = [gain.gain.setValueAtTime, gain.gain.linearRampToValueAtTime, gain.gain.exponentialRampToValueAtTime]
        .flatMap(fn => fn.mock.calls.map((args, i) => ({ args, order:fn.mock.invocationCallOrder[i] })))
        .sort((a, b) => a.order - b.order);
      let previous = -Infinity;
      for (const { args:[value, time] } of calls) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0.18);
        expect(time).toBeGreaterThanOrEqual(previous);
        previous = time;
      }
    }
  });
  it('seeks past overdue notes after a stall rather than emitting a backlog', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    audio.elapse(60);
    const before = audio.sources.length;
    await vi.advanceTimersByTimeAsync(50);
    expect(audio.sources.length - before).toBeLessThan(15);
    expect(vi.getTimerCount()).toBe(1);
    for (const source of audio.sources.slice(before)) expect(source.start.mock.calls[0][0]).toBeGreaterThanOrEqual(60);
  });
  it('clamps and ramps master volume without rebuilding voices, including zero', async () => {
    const music = controller();
    music.setVolume(10);
    await music.start();
    const audio = latestContext();
    const master = audio.gains[0];
    expect(master.gain.value).toBe(1);
    const count = audio.sources.length;
    music.setVolume(-1);
    expect(master.gain.cancelAndHoldAtTime).toHaveBeenCalledWith(0);
    expect(master.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 0.05);
    music.setVolume(NaN);
    expect(master.gain.value).toBe(0);
    music.setVolume(0.34);
    expect(master.gain.value).toBe(0.34);
    expect(audio.sources).toHaveLength(count);
    expect(music.playing).toBe(true);
  });
  it('falls back to cancelScheduledValues when cancelAndHoldAtTime is unavailable', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    Object.defineProperty(audio.gains[0].gain, 'cancelAndHoldAtTime', { value: undefined });
    Object.defineProperty(audio.gains[1].gain, 'cancelAndHoldAtTime', { value: undefined });
    music.setVolume(0.2);
    music.stop();
    expect(audio.gains[0].gain.cancelScheduledValues).toHaveBeenCalledWith(0);
    expect(audio.gains[1].gain.cancelScheduledValues).toHaveBeenCalledWith(0);
    await vi.advanceTimersByTimeAsync(60);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels future sources, fades sounding notes, and releases the stopped session', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    await advance(audio, 0.3);
    const count = audio.sources.length;
    const live = audio.sources.filter(source => !source.ended);
    music.stop();
    expect(music.playing).toBe(false);
    expect(audio.gains[1].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, audio.currentTime + 0.05);
    for (const source of live) {
      const start = source.start.mock.calls[0][0];
      expect(source.stopTime).toBeLessThanOrEqual(audio.currentTime + 0.05);
      if (start > audio.currentTime) expect(source.stopTime).toBe(audio.currentTime);
    }
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(vi.getTimerCount()).toBe(0);
    expect(audio.sources).toHaveLength(count);
    expect(audio.sources.every(source => source.disconnect.mock.calls.length > 0 && source.onended === null)).toBe(true);
    expect(audio.gains[1].disconnect).toHaveBeenCalled();
    expect(audio.close).not.toHaveBeenCalled();
  });
  it('keeps quick stop/start fades separate so old cleanup cannot detach fresh playback', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    const oldBus = audio.gains[1];
    music.stop();
    expect(await music.start()).toBe(true);
    const newBus = audio.gains.find(gain => gain !== oldBus && gain.connect.mock.calls.some(([target]) => target === audio.gains[0]))!;
    await vi.advanceTimersByTimeAsync(100);
    expect(oldBus.disconnect).toHaveBeenCalled();
    expect(newBus.disconnect).not.toHaveBeenCalled();
    expect(music.playing).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
  });
  it('settles canceled pending starts immediately and ignores their late rejection', async () => {
    const gate = deferred();
    FakeContext.resumeImpl = () => gate.promise;
    const unavailable = vi.fn();
    const music = controller({ onUnavailable: unavailable });
    const pending = music.start();
    music.stop();
    expect(await pending).toBe(false);
    gate.reject(new Error('Late rejection'));
    await flush();
    expect(music.playing).toBe(false);
    expect(latestContext().sources).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(unavailable).not.toHaveBeenCalled();
  });
  it('isolates out-of-order resume completions after stop and restart', async () => {
    const firstGate = deferred();
    const secondGate = deferred();
    let calls = 0;
    FakeContext.resumeImpl = audio => (++calls === 1 ? firstGate.promise : secondGate.promise).then(() => { audio.state = 'running'; });
    const music = controller();
    const first = music.start();
    music.stop();
    const second = music.start();
    firstGate.resolve();
    await flush();
    expect(await first).toBe(false);
    expect(music.playing).toBe(false);
    expect(latestContext().sources).toHaveLength(0);
    secondGate.resolve();
    expect(await second).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('quiet arrival feedback', () => {
  it('defaults music volume to .35 and never creates or resumes audio for feedback', async () => {
    const music = controller();
    music.emitArrival(1);
    expect(FakeContext.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    await music.start();
    const audio = latestContext();
    expect(audio.gains[0].gain.value).toBe(0.35);
    music.stop();
    await vi.advanceTimersByTimeAsync(60);
    const count = audio.sources.length;
    music.emitArrival(1);
    expect(audio.sources).toHaveLength(count + 2);
    expect(audio.resume).toHaveBeenCalledOnce();
    expect(music.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
  });
  it('bounds arrival count, rate-limits repeated calls, and cleans finished feedback', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    const before = audio.sources.length;
    music.emitArrival(1000);
    const feedback = audio.sources.slice(before);
    expect(feedback).toHaveLength(6);
    const frequency = feedback.filter((_, index) => index % 2 === 0).map(source => source.frequency.value);
    expect(frequency).toEqual([74, 78, 81].map(midiToFrequency));
    music.emitArrival(3);
    expect(audio.sources).toHaveLength(before + 6);
    for (const source of feedback) expect(source.stopTime).toBeLessThan(0.5);
    audio.elapse(0.55);
    expect(feedback.every(source => source.onended === null && source.disconnect.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    const next = audio.sources.length;
    music.emitArrival(1.9);
    expect(audio.sources).toHaveLength(next + 2);
  });
  it('ignores invalid counts, hidden/suspended/disposed audio, and pending resumes', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    const before = audio.sources.length;
    for (const value of [0, -1, 0.9, NaN, Infinity, -Infinity]) music.emitArrival(value);
    expect(audio.sources).toHaveLength(before);
    music.setHidden(true);
    music.emitArrival(1);
    expect(audio.sources).toHaveLength(before);
    music.setHidden(false);
    music.emitArrival(1);
    expect(audio.sources).toHaveLength(before);
    await flush();
    audio.state = 'suspended';
    const suspended = audio.sources.length;
    music.emitArrival(1);
    expect(audio.sources).toHaveLength(suspended);
    music.dispose();
    music.emitArrival(1);
    expect(audio.sources).toHaveLength(suspended);
  });
  it('cancels feedback sources and cleanup timers on stop, hiding, and disposal', async () => {
    for (const action of ['stop', 'hide', 'dispose'] as const) {
      const music = controller();
      await music.start();
      const audio = latestContext();
      const before = audio.sources.length;
      music.emitArrival(3);
      const feedback = audio.sources.slice(before);
      if (action === 'stop') music.stop();
      else if (action === 'hide') music.setHidden(true);
      else music.dispose();
      for (const source of feedback) expect(source.stopTime).toBe(0);
      await vi.advanceTimersByTimeAsync(60);
      expect(feedback.every(source => source.onended === null && source.disconnect.mock.calls.length > 0)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      music.dispose();
    }
  });
  it('isolates feedback synthesis failures without stopping background music', async () => {
    const unavailable = vi.fn();
    const music = controller({ onUnavailable: unavailable });
    await music.start();
    const audio = latestContext();
    const before = audio.gains.length;
    audio.createOscillator.mockImplementationOnce(() => { throw new Error('Feedback unavailable'); });
    expect(() => music.emitArrival(1)).not.toThrow();
    expect(music.playing).toBe(true);
    expect(audio.gains.slice(before).every(gain => gain.disconnect.mock.calls.length > 0)).toBe(true);
    expect(unavailable).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('visibility, failure, and disposal', () => {
  it('stops hidden scheduling and restores only user-enabled music', async () => {
    const music = controller();
    music.setHidden(true);
    music.setHidden(false);
    expect(FakeContext.instances).toHaveLength(0);
    await music.start();
    const audio = latestContext();
    const count = audio.sources.length;
    music.setHidden(true);
    expect(music.playing).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(audio.sources).toHaveLength(count);
    expect(vi.getTimerCount()).toBe(0);
    music.setHidden(false);
    await flush();
    expect(music.playing).toBe(true);
    expect(FakeContext.instances).toHaveLength(1);
    music.setHidden(true);
    music.stop();
    music.setHidden(false);
    await flush();
    expect(music.playing).toBe(false);
    await vi.advanceTimersByTimeAsync(60);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels a resume hidden mid-flight and waits for a new restoration attempt', async () => {
    const gate = deferred();
    FakeContext.resumeImpl = audio => gate.promise.then(() => { audio.state = 'running'; });
    const music = controller();
    const first = music.start();
    music.setHidden(true);
    expect(await first).toBe(false);
    gate.resolve();
    await flush();
    expect(music.playing).toBe(false);
    expect(latestContext().sources).toHaveLength(0);
    music.setHidden(false);
    await flush();
    expect(music.playing).toBe(true);
    expect(latestContext().resume).toHaveBeenCalledTimes(2);
  });
  it('records an explicit start while hidden without scheduling or forcing autoplay', async () => {
    const music = controller();
    music.setHidden(true);
    expect(await music.start()).toBe(false);
    expect(FakeContext.instances).toHaveLength(0);
    music.stop();
    music.setHidden(false);
    await flush();
    expect(FakeContext.instances).toHaveLength(0);
  });
  it('stops scheduling when the browser suspends audio and allows a new gesture to resume', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    audio.state = 'suspended';
    expect(music.playing).toBe(false);
    await vi.advanceTimersByTimeAsync(50);
    expect(vi.getTimerCount()).toBe(0);
    expect(await music.start()).toBe(true);
    expect(audio.resume).toHaveBeenCalledTimes(2);
  });
  it.each(['unsupported', 'constructor', 'resume-sync', 'resume-reject', 'still-suspended'] as const)('handles %s without leaked timers or rejected start promises', async failure => {
    if (failure === 'unsupported') vi.stubGlobal('AudioContext', undefined);
    if (failure === 'constructor') FakeContext.failConstruction = true;
    if (failure === 'resume-sync') FakeContext.resumeImpl = () => { throw new Error('Blocked'); };
    if (failure === 'resume-reject') FakeContext.resumeImpl = async () => { throw new Error('Blocked'); };
    if (failure === 'still-suspended') FakeContext.resumeImpl = async () => {};
    const unavailable = vi.fn();
    const music = controller({ onUnavailable: unavailable });
    expect(await music.start()).toBe(false);
    expect(music.playing).toBe(false);
    expect(unavailable).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    for (const audio of FakeContext.instances) expect(audio.close).toHaveBeenCalledOnce();
    music.setHidden(true);
    music.setHidden(false);
    await flush();
    expect(unavailable).toHaveBeenCalledOnce();
  });
  it('supports the prefixed constructor and survives throwing UI feedback', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', FakeContext);
    expect(await controller().start()).toBe(true);
    FakeContext.failConstruction = true;
    const music = controller({ onUnavailable: () => { throw new Error('UI failed'); } });
    expect(await music.start()).toBe(false);
  });
  it('can retry a failed start and rebuild an externally closed context', async () => {
    const unavailable = vi.fn();
    const music = controller({ onUnavailable: unavailable });
    FakeContext.failConstruction = true;
    expect(await music.start()).toBe(false);
    FakeContext.failConstruction = false;
    expect(await music.start()).toBe(true);
    const old = latestContext();
    old.state = 'closed';
    expect(await music.start()).toBe(true);
    expect(FakeContext.instances).toHaveLength(2);
    expect(old.sources.every(source => source.onended === null)).toBe(true);
    expect(unavailable).toHaveBeenCalledOnce();
  });
  it('closes a partially initialized context if gain setup fails', async () => {
    vi.stubGlobal('AudioContext', class extends FakeContext {
      constructor() {
        super();
        this.createGain.mockImplementation(() => { throw new Error('Gain unavailable'); });
      }
    });
    const unavailable = vi.fn();
    const music = controller({ onUnavailable: unavailable });
    expect(await music.start()).toBe(false);
    expect(latestContext().close).toHaveBeenCalledOnce();
    expect(latestContext().resume).not.toHaveBeenCalled();
    expect(unavailable).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cleans already scheduled voices and disconnected nodes on synthesis errors', async () => {
    const unavailable = vi.fn();
    const music = controller({ onUnavailable: unavailable });
    const first = music.start();
    const audio = latestContext();
    audio.createOscillator.mockImplementationOnce(() => {
      const source = new FakeOscillator();
      audio.sources.push(source);
      return source;
    }).mockImplementationOnce(() => { throw new Error('Synthesis unavailable'); });
    expect(await first).toBe(false);
    expect(audio.close).toHaveBeenCalledOnce();
    expect(audio.sources).toHaveLength(1);
    expect(audio.sources[0].stop).toHaveBeenLastCalledWith(0);
    expect(audio.sources[0].disconnect).toHaveBeenCalledOnce();
    expect(audio.sources[0].onended).toBeNull();
    expect(audio.gains.every(gain => gain.disconnect.mock.calls.length > 0)).toBe(true);
    expect(unavailable).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('disposes immediately, clears fading sessions, closes once, and rejects all later starts', async () => {
    const music = controller();
    await music.start();
    const audio = latestContext();
    music.stop();
    expect(await music.start()).toBe(true);
    music.dispose();
    expect(music.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(audio.close).toHaveBeenCalledOnce();
    expect(audio.sources.every(source => source.onended === null && source.disconnect.mock.calls.length > 0)).toBe(true);
    expect(audio.gains.every(gain => gain.disconnect.mock.calls.length > 0)).toBe(true);
    music.dispose();
    music.stop();
    music.setVolume(0.8);
    music.setHidden(true);
    music.setHidden(false);
    expect(await music.start()).toBe(false);
    expect(audio.close).toHaveBeenCalledOnce();
    expect(FakeContext.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['resolve', 'reject'] as const)('cancels a pending resume on dispose and ignores late %s', async outcome => {
    const gate = deferred();
    FakeContext.resumeImpl = () => gate.promise;
    const unavailable = vi.fn();
    const music = controller({ onUnavailable: unavailable });
    const pending = music.start();
    const audio = latestContext();
    music.dispose();
    expect(await pending).toBe(false);
    if (outcome === 'resolve') gate.resolve(); else gate.reject(new Error('Closed'));
    await flush();
    expect(audio.sources).toHaveLength(0);
    expect(audio.close).toHaveBeenCalledOnce();
    expect(unavailable).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(await music.start()).toBe(false);
  });
});
