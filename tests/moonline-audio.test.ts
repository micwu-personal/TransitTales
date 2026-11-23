import { afterEach, describe, expect, it, vi } from 'vitest';
import { JourneyAudio } from '../src/moonline/audio';
import { decodeMidi, encodeMidi } from '../src/moonline/midi';
import { accompany, pitchName, quantize, type Song } from '../src/moonline/score';

const song: Song = {
  id: 'test', title: 'Blue Moonline', bpm: 120, beats: 4,
  tracks: [
    { name: 'Keys', role: 'piano', notes: [{ pitch: 60, beat: 0, length: 1, velocity: 100 }] },
    { name: 'Bass', role: 'bass', notes: [{ pitch: 36, beat: 0, length: 2, velocity: 90 }] },
  ],
};

const midi0 = (events: number[]) => new Uint8Array([
  77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96,
  77, 84, 114, 107, 0, 0, 0, events.length, ...events,
]);

describe('Moonline scores and MIDI', () => {
  it('generates deterministic, bounded parts without changing the source', () => {
    const original = { ...song, beats: 4.3 };
    const before = structuredClone(original);
    const parts = accompany(original);
    expect(original).toEqual(before);
    expect(parts).toEqual(accompany(original));
    expect(parts.map(track => track.role)).toEqual(['piano', 'pad', 'bass', 'drums']);
    for (const { notes } of parts) {
      expect(notes.length).toBeGreaterThan(0);
      for (const { pitch, beat, length, velocity } of notes) {
        expect(pitch).toBeGreaterThanOrEqual(0);
        expect(pitch).toBeLessThanOrEqual(127);
        expect(velocity).toBeGreaterThanOrEqual(1);
        expect(velocity).toBeLessThanOrEqual(127);
        expect(length).toBeGreaterThan(0);
        expect(beat + length).toBeLessThanOrEqual(original.beats);
      }
    }
    expect(quantize(1.38, 0.25)).toBe(1.5);
    expect(quantize(1.38, 0)).toBe(1.38);
    expect(pitchName(60)).toBe('C4');
    expect(pitchName(0)).toBe('C-1');
  });

  it('writes SMF type 1 and preserves parts, empty tracks, and trailing rests', () => {
    const input: Song = {
      ...song, beats: 7.5,
      tracks: [...song.tracks,
        { name: '弦', role: 'guitar', notes: [{ pitch: 127, beat: 3.25, length: 0.5, velocity: 1 }] },
        { name: 'Pad', role: 'pad', notes: [] },
        { name: 'Percussion', role: 'drums', notes: [{ pitch: 38, beat: 1, length: 0.125, velocity: 127 }] },
        { name: 'Drum rests', role: 'drums', notes: [] },
        { name: 'Other keys', role: 'piano', notes: [] },
      ],
    };
    const bytes = encodeMidi(input);
    expect(Array.from(bytes.slice(0, 14))).toEqual([77, 84, 104, 100, 0, 0, 0, 6, 0, 1, 0, 8, 3, 192]);
    expect(decodeMidi(bytes, input.id, input.title)).toEqual(input);
  });

  it('reads type 0 running status and flattens tempo changes across sustained notes', () => {
    const bytes = midi0([
      0, 0xFF, 0x03, 3, 77, 105, 120,
      0, 0xC0, 24,
      0, 0x90, 60, 110,
      48, 64, 80,
      48, 0xFF, 0x51, 3, 0x0F, 0x42, 0x40,
      0, 0x99, 36, 127,
      24, 36, 0,
      72, 0x90, 60, 0,
      0, 64, 0,
      48, 0xFF, 0x2F, 0,
    ]);
    expect(decodeMidi(bytes, song.id, song.title)).toEqual({
      id: song.id, title: song.title, bpm: 120, beats: 4,
      tracks: [
        { name: 'Mix (ch 1)', role: 'guitar', notes: [
          { pitch: 60, beat: 0, length: 3, velocity: 110 },
          { pitch: 64, beat: 0.5, length: 2.5, velocity: 80 },
        ] },
        { name: 'Mix (ch 10)', role: 'drums', notes: [{ pitch: 36, beat: 1, length: 0.5, velocity: 127 }] },
      ],
    });
  });

  it('pairs overlapping unisons FIFO per channel and keeps trailing track length on re-export', () => {
    const bytes = midi0([
      0, 0x90, 60, 110,
      24, 0x91, 60, 70,
      24, 0x90, 60, 90,
      24, 0x81, 60, 0,
      24, 0x80, 60, 0,
      48, 60, 0,
      48, 0xFF, 0x2F, 0,
    ]);
    const imported = decodeMidi(bytes, song.id, song.title);
    expect(imported.beats).toBe(2);
    expect(imported.tracks.map(track => track.notes)).toEqual([
      [{ pitch: 60, beat: 0, length: 1, velocity: 110 }, { pitch: 60, beat: 0.5, length: 1, velocity: 90 }],
      [{ pitch: 60, beat: 0.25, length: 0.5, velocity: 70 }],
    ]);
    const extended = { ...imported, beats: 4 };
    const reexported = encodeMidi(extended);
    expect(decodeMidi(reexported, song.id, song.title)).toEqual(extended);
    expect(encodeMidi(decodeMidi(reexported, song.id, song.title))).toEqual(reexported);
    // The conductor ends at 4, but the last channel preserves its original 2-beat
    // EOT: delta (2 - 0.75) * 960 = 1200 ticks, encoded as a two-byte VLQ.
    expect(Array.from(reexported.slice(-5))).toEqual([0x89, 0x30, 0xFF, 0x2F, 0]);
  });

  it('rejects truncated chunks, malformed deltas, and SMPTE timing', () => {
    expect(() => decodeMidi(encodeMidi(song).slice(0, -1), '', '')).toThrow(/truncated/i);
    expect(() => decodeMidi(midi0([128, 128, 128, 128]), '', '')).toThrow(/variable-length/i);
    const smpte = midi0([0, 0xFF, 0x2F, 0]);
    smpte[12] = 0xE7;
    expect(() => decodeMidi(smpte, '', '')).toThrow(/PPQ/);
  });
});

class Parameter {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime = vi.fn<(value: number, at: number) => void>();
}

class Source {
  frequency = new Parameter();
  detune = new Parameter();
  type?: string;
  onended?: () => void;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn<(at: number) => void>();
  stop = vi.fn<(at?: number) => void>();
}

class TestContext extends EventTarget {
  static last: TestContext;
  state = 'suspended';
  currentTime = 10;
  baseLatency = 0;
  outputLatency = 0;
  sampleRate = 8000;
  destination = {};
  stamp?: { contextTime: number; performanceTime: number };
  sources: Source[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  constructor() { super(); TestContext.last = this; }
  getOutputTimestamp() { return this.stamp; }
  gains: Parameter[] = [];
  createGain() {
    const gain = new Parameter(); this.gains.push(gain);
    return { gain, connect() {}, disconnect() {} };
  }
  createOscillator() { const osc = new Source(); this.sources.push(osc); return osc; }
  createBufferSource() { return this.createOscillator(); }
  createBiquadFilter() { return { frequency: new Parameter(), connect() {}, disconnect() {} }; }
  createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
}

async function setup() {
  vi.useFakeTimers();
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('AudioContext', TestContext);
  const audio = new JourneyAudio();
  await audio.unlock();
  return { audio, context: TestContext.last, doc };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Moonline transport', () => {
  it('schedules count-in and accompaniment on a fixed audio-time grid at playback speed', async () => {
    const { audio, context } = await setup();
    audio.start(song, 0, 0, 1, 2);
    expect(audio.beat).toBe(-1);
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0].start).toHaveBeenCalledWith(10.05);
    context.currentTime = 10.19;
    vi.advanceTimersByTime(25);
    expect(context.sources).toHaveLength(2); // click + bass, but no piano
    expect(context.sources[1].start).toHaveBeenCalledWith(10.3);
    expect(context.sources[1].stop).toHaveBeenCalledWith(10.8);
    context.currentTime = 10.55;
    expect(audio.beat).toBeCloseTo(1);
    context.currentTime = 11.4;
    expect(audio.running).toBe(false);
    expect(audio.beat).toBe(4);
    expect(vi.getTimerCount()).toBe(0);
    audio.stop();
  });

  it('schedules the backing on the cue clock at 10% after a short fractional count-in', async () => {
    const { audio, context } = await setup();
    audio.start(song, 0, 0, .5, .1);
    expect(audio.beat).toBe(-.5);
    expect(context.sources).toHaveLength(1);
    context.currentTime = 12.45;
    vi.advanceTimersByTime(25);
    expect(context.sources).toHaveLength(2);
    expect(context.sources[1].start).toHaveBeenCalledWith(12.55);
    context.currentTime = 17.55;
    expect(audio.beat).toBeCloseTo(1);
    audio.stop();
  });

  it('changes only the scheduled player part gain, never backing or tap gain', async () => {
    const { audio, context } = await setup();
    const peaks = (part: number, guide: number) => {
      context.gains.length = 0;
      audio.start(song, part, 0, 0, 1, guide);
      audio.tap('piano', 60);
      return context.gains.map(gain => gain.exponentialRampToValueAtTime.mock.calls[0][0]);
    };
    const [full, bass, tap] = peaks(-1, 0);
    expect(peaks(0, 0)).toEqual([bass, tap]);
    expect(peaks(0, .25)).toEqual([full * .25, bass, tap]);
    audio.stop();
  });

  it('resumes at the same beat and schedules slower onsets on the shared clock', async () => {
    const { audio, context } = await setup();
    const from = 1, rate = .7;
    const chart = { ...song, tracks: [{ name: 'Bass', role: 'bass' as const, notes: [1, 2].map(beat => ({pitch: 36, beat, length: .2, velocity: 90})) }] };
    audio.start(chart, -1, from, 0, rate);
    expect(audio.beat).toBe(from);
    const first = context.sources[0].start.mock.calls[0][0];
    context.currentTime = first + .6;
    vi.advanceTimersByTime(25);
    expect(context.sources[1].start.mock.calls[0][0] - first).toBeCloseTo(.5 / rate);
    context.currentTime = context.sources[1].start.mock.calls[0][0];
    expect(audio.beat).toBeCloseTo(2);
    audio.stop();
  });

  it('resumes sustained roles, omits old percussion hits, and prefers the actual output clock', async () => {
    const { audio, context } = await setup();
    const drums = { name: 'Drums', role: 'drums' as const, notes: [{ pitch: 36, beat: 0, length: 2, velocity: 127 }] };
    audio.start({ ...song, tracks: [...song.tracks, drums] }, -1, 0.5);
    expect(audio.beat).toBe(0.5);
    expect(context.sources).toHaveLength(3); // both piano oscillators, one bass
    expect(context.sources[0].stop).toHaveBeenCalledWith(10.3);
    expect(context.sources[2].stop).toHaveBeenCalledWith(10.8);
    vi.advanceTimersByTime(5); // The browser timestamp is uninitialized at performance time zero.
    context.currentTime = 10.55;
    context.stamp = { contextTime: 10.25, performanceTime: performance.now() };
    expect(audio.beat).toBeCloseTo(0.9, 2);
    context.stamp = undefined;
    context.baseLatency = 0.05;
    context.outputLatency = 0.15;
    expect(audio.beat).toBeCloseTo(1.1, 2);
    audio.stop();
  });

  it('skips stale cues after timer stalls and cancels scheduled voices when hidden', async () => {
    const { audio, context, doc } = await setup();
    audio.start({ ...song, tracks: [{ name: 'Bass', role: 'bass', notes: [
      { pitch: 36, beat: 1, length: 1, velocity: 90 },
      { pitch: 38, beat: 2, length: 1, velocity: 90 },
    ] }] }, -1);
    context.currentTime = 10.9;
    vi.advanceTimersByTime(25);
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0].start).toHaveBeenCalledWith(11.05);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(context.sources[0].stop).toHaveBeenLastCalledWith();
    expect(context.sources[0].disconnect).toHaveBeenCalledOnce();
    const stoppedAt = audio.beat;
    context.currentTime = 12;
    expect(audio.beat).toBe(stoppedAt);
    expect(audio.running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    audio.tap('drums', 42);
    expect(context.sources).toHaveLength(1);
  });

  it('cleans up live taps during context suspension and resumes through unlock', async () => {
    const { audio, context } = await setup();
    audio.tap('drums', 42);
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0].start).toHaveBeenCalledOnce();
    context.state = 'suspended';
    context.dispatchEvent(new Event('statechange'));
    expect(context.sources[0].disconnect).toHaveBeenCalledOnce();
    await audio.unlock();
    expect(context.resume).toHaveBeenCalledTimes(2);
    audio.tap('guitar', 69);
    expect(context.sources[1].type).toBe('sawtooth');
    audio.stop();
  });

  it('rejects unlock when Web Audio is unavailable and does not run a silent transport', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const audio = new JourneyAudio();
    await expect(audio.unlock()).rejects.toThrow(/unavailable/);
    expect(() => audio.start(song, -1)).toThrow(/unlocked/);
    expect(audio.running).toBe(false);
  });

  it('rejects both a no-op resume and a resume that never settles', async () => {
    const { audio, context } = await setup();
    context.state = 'suspended';
    context.resume.mockResolvedValueOnce(undefined);
    await expect(audio.unlock()).rejects.toThrow(/did not start/);
    context.resume.mockImplementationOnce(() => new Promise(() => {}));
    const result = expect(audio.unlock()).rejects.toThrow(/did not start/);
    await vi.advanceTimersByTimeAsync(1500);
    await result;
    expect(audio.running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('still disconnects every voice if an ended source throws on stop', async () => {
    const { audio, context } = await setup();
    audio.start(song, -1);
    context.sources[0].stop.mockImplementationOnce(() => { throw new DOMException('Already ended', 'InvalidStateError'); });
    expect(() => audio.stop()).not.toThrow();
    for (const source of context.sources) expect(source.disconnect).toHaveBeenCalledOnce();
    expect(audio.running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
