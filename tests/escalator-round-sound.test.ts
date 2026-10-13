import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoundSound, SUCCESS_PHRASE, type RoundSound } from '../src/escalator/round-sound';
import { createRoundFeedback } from '../src/escalator/round-feedback';
import { advanceWave, startWave, verifiedSolution } from '../src/escalator/model';
import { PUZZLES } from '../src/escalator/puzzles';
import { snapshot } from '../src/escalator/view';

class Param {
  value = 0;
  setValueAtTime = vi.fn((_value: number, _time: number) => this);
  linearRampToValueAtTime = vi.fn((_value: number, _time: number) => this);
  exponentialRampToValueAtTime = vi.fn((_value: number, _time: number) => this);
}
class Node {
  connect = vi.fn((_node: unknown) => this);
  disconnect = vi.fn();
}
class Gain extends Node { gain = new Param(); }
class Source extends Node {
  type = 'sine'; frequency = new Param(); onended: (() => void) | null = null;
  start = vi.fn((_time: number) => {});
  stop = vi.fn((_time: number) => {});
}
class Context {
  static instances: Context[] = [];
  static fail = false;
  static resumeImpl: (audio: Context) => Promise<void> = async audio => { audio.state = 'running'; };
  state: AudioContextState = 'suspended'; currentTime = 7;
  destination = new Node(); gains: Gain[] = []; sources: Source[] = [];
  onstatechange: (() => void) | null = null;
  resume = vi.fn(() => Context.resumeImpl(this));
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain = vi.fn(() => { const gain = new Gain(); this.gains.push(gain); return gain; });
  createOscillator = vi.fn(() => { const source = new Source(); this.sources.push(source); return source; });
  constructor() { if (Context.fail) throw Error('Unavailable'); Context.instances.push(this); }
}
function deferred() {
  let resolve!: () => void, reject!: (reason: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const controllers: RoundSound[] = [];
const make = (onUnavailable?: () => void) => { const sound = createRoundSound({ onUnavailable }); controllers.push(sound); return sound; };
const latest = () => Context.instances.at(-1)!;
beforeEach(() => {
  vi.useFakeTimers(); Context.instances = []; Context.fail = false;
  Context.resumeImpl = async audio => { audio.state = 'running'; };
  vi.stubGlobal('AudioContext', Context); vi.stubGlobal('webkitAudioContext', undefined);
});
afterEach(() => { controllers.splice(0).forEach(sound => sound.dispose()); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('independent original happy-ending sound', () => {
  it('does not autoplay, and enabling synchronously resumes but makes no notes or timers', async () => {
    const sound = make(); sound.setHidden(true); sound.setHidden(false);
    expect(sound.enabled).toBe(false); expect(sound.emitSuccess()).toBe(false);
    expect(Context.instances).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
    const enabled = sound.enable(); expect(latest().resume).toHaveBeenCalledOnce();
    expect(latest().sources).toHaveLength(0); expect(sound.emitSuccess()).toBe(false);
    expect(await enabled).toBe(true); expect(sound.enabled).toBe(true);
    expect(latest().sources).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
    expect(await sound.enable()).toBe(true); expect(latest().resume).toHaveBeenCalledOnce();
  });
  it('has a frozen finite ten-note rising phrase and warm final chord shorter than 2.1 seconds', () => {
    expect(Object.isFrozen(SUCCESS_PHRASE)).toBe(true); expect(SUCCESS_PHRASE).toHaveLength(10);
    expect(SUCCESS_PHRASE.slice(0, 4).map(note => note.midi)).toEqual([74, 78, 81, 86]);
    expect(SUCCESS_PHRASE.slice(-4).map(note => note.time)).toEqual([1.12, 1.12, 1.12, 1.12]);
    for (const note of SUCCESS_PHRASE) {
      expect(Object.isFrozen(note)).toBe(true); expect(Object.values(note).every(Number.isFinite)).toBe(true);
      expect(note.time).toBeGreaterThanOrEqual(0); expect(note.duration).toBeGreaterThan(0);
      expect(note.time + note.duration).toBeLessThan(2.1); expect(note.velocity).toBeGreaterThan(0); expect(note.velocity).toBeLessThanOrEqual(1);
    }
  });
  it('plays once per successful round without background music and never for a redraw, locale or view change', async () => {
    const sound = make(); await sound.enable(); const audio = latest();
    const p = PUZZLES[0], board = verifiedSolution(p), wave = advanceWave(startWave(p, board), 100);
    const feedback = createRoundFeedback(() => sound.emitSuccess());
    expect(feedback.complete(wave, 0)).toBe(true); expect(audio.sources).toHaveLength(10);
    for (const language of ['en', 'zh-CN', 'ja'] as const) {
      snapshot(p, board, wave, language, null, null, false, false, false, feedback.celebrating(100));
      expect(feedback.complete(wave, 100)).toBe(false);
    }
    expect(audio.sources).toHaveLength(10); expect(audio.resume).toHaveBeenCalledOnce(); expect(Context.instances).toHaveLength(1);
    for (const [i, source] of audio.sources.entries()) {
      expect(source.type).toBe('sine'); expect(source.start).toHaveBeenCalledWith(7.015 + SUCCESS_PHRASE[i].time);
      expect(source.stop).toHaveBeenCalledWith(7.015 + SUCCESS_PHRASE[i].time + SUCCESS_PHRASE[i].duration);
    }
    expect(vi.getTimerCount()).toBe(1); await vi.advanceTimersByTimeAsync(2150);
    for (const source of audio.sources) { expect(source.disconnect).toHaveBeenCalledOnce(); expect(source.onended).toBeNull(); }
    expect(vi.getTimerCount()).toBe(0);
    feedback.begin(); expect(feedback.complete(wave, 4000)).toBe(true); expect(audio.sources).toHaveLength(20);
  });
  it.each(['mute', 'hide', 'dispose'] as const)('settles pending enable on %s and late resolution cannot play', async action => {
    const gate = deferred(); Context.resumeImpl = audio => gate.promise.then(() => { audio.state = 'running'; });
    const sound = make(), first = sound.enable(), audio = latest();
    expect(sound.enable()).toBe(first); expect(audio.resume).toHaveBeenCalledOnce(); expect(sound.emitSuccess()).toBe(false);
    if (action === 'hide') sound.setHidden(true); else sound[action]();
    expect(await first).toBe(false); gate.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(sound.emitSuccess()).toBe(false); expect(audio.sources).toHaveLength(0); expect(audio.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['cancel', 'mute', 'hide', 'dispose'] as const)('%s stops and disconnects every scheduled voice', async action => {
    const sound = make(); await sound.enable(); const audio = latest(); sound.emitSuccess();
    if (action === 'hide') sound.setHidden(true); else sound[action]();
    for (const source of audio.sources) { expect(source.stop).toHaveBeenLastCalledWith(7); expect(source.disconnect).toHaveBeenCalledOnce(); expect(source.onended).toBeNull(); }
    for (const gain of audio.gains.slice(1)) expect(gain.disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0); if (action !== 'cancel') expect(sound.emitSuccess()).toBe(false);
  });
  it('never resumes on visibility restoration; an opted-in player can re-arm on a fresh play gesture', async () => {
    const sound = make(); await sound.enable(); const old = latest(); sound.emitSuccess();
    sound.setHidden(true); expect(await sound.enable()).toBe(false); sound.setHidden(false);
    expect(sound.enabled).toBe(true); expect(sound.emitSuccess()).toBe(false);
    expect(Context.instances).toHaveLength(1); expect(old.resume).toHaveBeenCalledOnce();
    expect(await sound.enable()).toBe(true); expect(Context.instances).toHaveLength(2); expect(latest().sources).toHaveLength(0);
    expect(sound.emitSuccess()).toBe(true);
  });
  it('disarms and cancels on an audio interruption and cannot automatically play after recovery', async () => {
    const sound = make(); await sound.enable(); const audio = latest(); sound.emitSuccess();
    audio.state = 'suspended'; audio.onstatechange?.(); expect(sound.emitSuccess()).toBe(false); expect(vi.getTimerCount()).toBe(0);
    audio.state = 'running'; audio.onstatechange?.(); expect(sound.emitSuccess()).toBe(false);
    expect(await sound.enable()).toBe(true); expect(sound.emitSuccess()).toBe(true);
  });
  it('does not queue a success while unlocking, or retroactively play it after enabling', async () => {
    const gate = deferred(); Context.resumeImpl = audio => gate.promise.then(() => { audio.state = 'running'; });
    const sound = make(); const enabling = sound.enable(); expect(sound.emitSuccess()).toBe(false);
    gate.resolve(); expect(await enabling).toBe(true); expect(latest().sources).toHaveLength(0);
  });
  it.each(['constructor', 'unsupported', 'resume-throw', 'resume-reject', 'master-gain', 'master-connect'] as const)('contains %s failures without blocking play', async failure => {
    const unavailable = vi.fn(() => { throw Error('Callback failure'); });
    if (failure === 'constructor') Context.fail = true;
    if (failure === 'unsupported') vi.stubGlobal('AudioContext', undefined);
    if (failure === 'resume-throw') Context.resumeImpl = () => { throw Error('Resume'); };
    if (failure === 'resume-reject') Context.resumeImpl = async () => { throw Error('Resume'); };
    if (failure === 'master-gain' || failure === 'master-connect') {
      vi.stubGlobal('AudioContext', class extends Context {
        constructor() { super(); if (failure === 'master-gain') this.createGain.mockImplementation(() => { throw Error('Gain'); }); else this.createGain.mockImplementation(() => { const gain = new Gain(); this.gains.push(gain); gain.connect.mockImplementation(() => { throw Error('Connect'); }); return gain; }); }
      });
    }
    const sound = make(unavailable); expect(await sound.enable()).toBe(false); expect(sound.enabled).toBe(false); expect(sound.emitSuccess()).toBe(false);
    expect(unavailable).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    for (const audio of Context.instances) expect(audio.close).toHaveBeenCalledOnce();
  });
  it.each(['source', 'gain', 'envelope', 'source-connect', 'gain-connect', 'start', 'stop'] as const)('releases partial synthesis safely on %s errors', async failure => {
    const unavailable = vi.fn(), sound = make(unavailable); await sound.enable(); const audio = latest();
    if (failure === 'source') audio.createOscillator.mockImplementation(() => { throw Error('Source'); });
    else if (failure === 'gain') audio.createGain.mockImplementation(() => { throw Error('Gain'); });
    else audio.createOscillator.mockImplementation(() => {
      const source = new Source(); audio.sources.push(source);
      if (failure === 'envelope') source.frequency.setValueAtTime.mockImplementation(() => { throw Error('Envelope'); });
      if (failure === 'source-connect') source.connect.mockImplementation(() => { throw Error('Connect'); });
      if (failure === 'gain-connect') audio.createGain.mockImplementation(() => { const gain = new Gain(); audio.gains.push(gain); gain.connect.mockImplementation(() => { throw Error('Connect'); }); return gain; });
      if (failure === 'start' || failure === 'stop') source[failure].mockImplementation(() => { throw Error('Scheduling'); });
      source.disconnect.mockImplementation(() => { throw Error('Disconnect'); }); return source;
    });
    expect(sound.emitSuccess()).toBe(false); expect(sound.enabled).toBe(false); expect(unavailable).toHaveBeenCalledOnce();
    expect(audio.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    for (const source of audio.sources) { expect(source.disconnect).toHaveBeenCalled(); expect(source.onended).toBeNull(); }
    for (const gain of audio.gains) expect(gain.disconnect).toHaveBeenCalled();
  });
  it('a muted success still settles once and enabling later cannot replay that round', async () => {
    const sound = make(), feedback = createRoundFeedback(() => sound.emitSuccess());
    const p = PUZZLES[0], board = verifiedSolution(p), wave = advanceWave(startWave(p, board), 100);
    expect(feedback.complete(wave, 0)).toBe(true); expect(feedback.celebrating(0)).toBe(true);
    expect(Context.instances).toHaveLength(0); await sound.enable();
    expect(feedback.complete(wave, 1)).toBe(false); expect(latest().sources).toHaveLength(0);
    sound.mute(); feedback.begin(); expect(feedback.complete(wave, 4000)).toBe(true);
    expect(latest().sources).toHaveLength(0); expect(sound.enabled).toBe(false);
  });
  it('handles natural note endings and rejected close without duplicate cleanup', async () => {
    const sound = make(); await sound.enable(); const audio = latest(); sound.emitSuccess();
    const source = audio.sources[0]; source.onended?.(); expect(source.disconnect).toHaveBeenCalledOnce();
    audio.close.mockRejectedValue(Error('Close')); sound.mute(); await Promise.resolve();
    expect(source.disconnect).toHaveBeenCalledOnce(); expect(sound.emitSuccess()).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
});
