import { clampMusicVolume, midiToFrequency } from './music';

// Original D-major bell flourish: a rising welcome, then a warm, shared landing.
export const SUCCESS_PHRASE = Object.freeze([
  { time: 0, midi: 74, duration: .42, velocity: .7 },
  { time: .14, midi: 78, duration: .42, velocity: .65 },
  { time: .28, midi: 81, duration: .5, velocity: .7 },
  { time: .46, midi: 86, duration: .62, velocity: .8 },
  { time: .72, midi: 83, duration: .38, velocity: .55 },
  { time: .88, midi: 81, duration: .4, velocity: .6 },
  { time: 1.12, midi: 74, duration: .95, velocity: .5 },
  { time: 1.12, midi: 78, duration: .95, velocity: .45 },
  { time: 1.12, midi: 81, duration: .95, velocity: .45 },
  { time: 1.12, midi: 86, duration: .95, velocity: .55 },
].map(note => Object.freeze(note)));

export interface RoundSound {
  /** Only call from an explicit enable, play, resume or replay gesture. Makes no sound. */
  enable(): Promise<boolean>;
  mute(): void;
  cancel(): void;
  /** Hiding cancels pending and sounding notes. Showing never resumes audio. */
  setHidden(hidden: boolean): void;
  /** Never creates/resumes audio, queues a delayed fanfare, or starts background music. */
  emitSuccess(): boolean;
  dispose(): void;
  readonly enabled: boolean;
}
interface Voice { source: OscillatorNode; gain: GainNode }
interface Attempt { promise: Promise<boolean>; resolve: (ok: boolean) => void }

export function createRoundSound(options: { onUnavailable?: () => void } = {}): RoundSound {
  let context: AudioContext | undefined, master: GainNode | undefined;
  let enabled = false, hidden = false, disposed = false, armed = false;
  let pending: Attempt | undefined, cleanup: ReturnType<typeof setTimeout> | undefined;
  const voices = new Set<Voice>();
  function disconnect(node: AudioNode | undefined) { try { node?.disconnect(); } catch {} }
  function release(voice: Voice) {
    voice.source.onended = null;
    disconnect(voice.source); disconnect(voice.gain); voices.delete(voice);
  }
  function cancel() {
    if (cleanup !== undefined) clearTimeout(cleanup);
    cleanup = undefined;
    for (const voice of [...voices]) {
      try { voice.source.stop(context?.currentTime ?? 0); } catch {}
      release(voice);
    }
  }
  function cancelPending() { const previous = pending; pending = undefined; previous?.resolve(false); }
  function close() {
    const previous = context;
    context = undefined; armed = false; disconnect(master); master = undefined;
    if (previous) {
      previous.onstatechange = null;
      try { void previous.close().catch(() => {}); } catch {}
    }
  }
  function fail() {
    enabled = false; cancelPending(); cancel(); close();
    try { options.onUnavailable?.(); } catch {}
  }
  function ensureContext(): AudioContext {
    if (context?.state === 'closed') { cancel(); close(); }
    if (!context) {
      const browser = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const Constructor = browser.AudioContext ?? browser.webkitAudioContext;
      if (!Constructor) throw new Error('Web Audio is unavailable');
      context = new Constructor();
      master = context.createGain(); master.gain.value = clampMusicVolume(.45); master.connect(context.destination);
      const audio = context;
      audio.onstatechange = () => {
        if (context === audio && audio.state !== 'running') { armed = false; cancelPending(); cancel(); }
      };
    }
    return context;
  }
  function enable(): Promise<boolean> {
    if (disposed || hidden) return Promise.resolve(false);
    enabled = true;
    if (pending) return pending.promise;
    if (armed && context?.state === 'running') return Promise.resolve(true);
    let resolve!: (ok: boolean) => void;
    const promise = new Promise<boolean>(done => { resolve = done; });
    const attempt = { promise, resolve }; pending = attempt;
    try {
      const audio = ensureContext();
      // Synchronous resume retains click/keyboard activation; completion cannot unlock audio.
      const resuming = audio.resume();
      void Promise.resolve(resuming).then(() => {
        if (pending !== attempt || disposed || hidden || !enabled || context !== audio) return;
        if (audio.state !== 'running') { fail(); return; }
        armed = true; pending = undefined; resolve(true);
      }, () => { if (pending === attempt) fail(); });
    } catch { if (pending === attempt) fail(); }
    return promise;
  }
  return {
    enable,
    cancel,
    mute() { enabled = false; armed = false; cancelPending(); cancel(); close(); },
    setHidden(value) {
      if (disposed || hidden === value) return;
      hidden = value;
      if (hidden) { cancelPending(); cancel(); close(); }
    },
    emitSuccess() {
      const audio = context;
      if (disposed || hidden || !enabled || !armed || pending || !audio || !master || audio.state !== 'running') return false;
      cancel();
      try {
        const now = audio.currentTime + .015;
        for (const note of SUCCESS_PHRASE) {
          const source = audio.createOscillator();
          let gain: GainNode;
          try { gain = audio.createGain(); } catch (error) { disconnect(source); throw error; }
          const voice = { source, gain }; voices.add(voice);
          const start = now + note.time, end = start + note.duration;
          source.type = 'sine'; source.frequency.setValueAtTime(midiToFrequency(note.midi), start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(.18 * note.velocity, start + .012);
          gain.gain.exponentialRampToValueAtTime(.0001, end - .02);
          gain.gain.linearRampToValueAtTime(0, end);
          source.connect(gain); gain.connect(master);
          source.onended = () => release(voice);
          source.start(start); source.stop(end);
        }
        // Wall-clock cleanup also releases notes if the browser freezes audio time.
        cleanup = setTimeout(cancel, 2150);
        return true;
      } catch { fail(); return false; }
    },
    dispose() { if (disposed) return; disposed = true; enabled = false; cancelPending(); cancel(); close(); },
    get enabled() { return enabled && !disposed; },
  };
}
