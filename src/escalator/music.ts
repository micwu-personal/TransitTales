export type MusicInstrument = 'bell' | 'pad' | 'bass';
export interface MusicEvent {
  readonly beat: number;
  readonly durationBeats: number;
  readonly midi: number;
  readonly velocity: number;
  readonly instrument: MusicInstrument;
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function clampMusicVolume(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}

function compose(): readonly MusicEvent[] {
  // Original eight-bar D-major sketch: suspended extensions, no percussion, and spacious bells.
  const harmony = [
    { bass: 38, pad: [54, 57, 64], bells: [74, 69, 76, 73, 69] },
    { bass: 37, pad: [52, 57, 61], bells: [73, 76, 69, 71, 76] },
    { bass: 35, pad: [54, 57, 62], bells: [74, 78, 73, 69, 74] },
    { bass: 43, pad: [54, 59, 62], bells: [71, 74, 69, 78, 74] },
    { bass: 40, pad: [55, 59, 66], bells: [76, 71, 78, 74, 71] },
    { bass: 33, pad: [54, 59, 62], bells: [74, 69, 73, 78, 73] },
    { bass: 43, pad: [55, 59, 64], bells: [71, 76, 74, 69, 71] },
    { bass: 45, pad: [55, 57, 62], bells: [69, 74, 76, 71, 73] },
  ];
  const positions = [0.25, 1, 1.75, 2.75, 3.25];
  const velocities = [0.58, 0.46, 0.52, 0.43, 0.48];
  const events: MusicEvent[] = [];
  harmony.forEach((bar, index) => {
    const beat = index * 4;
    events.push({ beat, durationBeats: 3.7, midi: bar.bass, velocity: 0.52, instrument: 'bass' });
    for (const midi of bar.pad) events.push({ beat, durationBeats: 3.95, midi, velocity: 0.4, instrument: 'pad' });
    bar.bells.forEach((midi, note) => events.push({
      beat: beat + positions[note], durationBeats: 0.65, midi, velocity: velocities[note], instrument: 'bell',
    }));
  });
  return Object.freeze(events.sort((a, b) => a.beat - b.beat).map(event => Object.freeze(event)));
}

export const RELAXING_COMPOSITION = Object.freeze({
  bpm: 70,
  beatsPerBar: 4,
  bars: 8,
  loopBeats: 32,
  events: compose(),
});

export interface RelaxingMusic {
  /** Call from a user gesture. Resolves false on cancellation or unavailable audio. */
  start(): Promise<boolean>;
  stop(): void;
  setVolume(value: number): void;
  /** Forward page visibility; returning to the page never enables music by itself. */
  setHidden(hidden: boolean): void;
  /** Quiet feedback on an already-unlocked context; never enables or resumes music. */
  emitArrival(count: number): void;
  dispose(): void;
  readonly playing: boolean;
}

interface Voice {
  nodes: AudioNode[];
  sources: OscillatorNode[];
  start: number;
  end: number;
  finished: boolean;
}
interface Session {
  bus: GainNode;
  voices: Set<Voice>;
  retiring: boolean;
  fading?: boolean;
  cleanup?: ReturnType<typeof setTimeout>;
}
interface StartAttempt {
  promise: Promise<boolean>;
  resolve: (result: boolean) => void;
}
interface PartialTone {
  type: OscillatorType;
  ratio: number;
  weight: number;
  detune: number;
}

const SECONDS_PER_BEAT = 60 / RELAXING_COMPOSITION.bpm;
const LOOKAHEAD = 0.2;
const TICK_MS = 50;
const FADE_SECONDS = 0.05;
const PARTIALS: Record<MusicInstrument, readonly PartialTone[]> = {
  bell: [{ type: 'sine', ratio: 1, weight: 0.85, detune: 0 }, { type: 'sine', ratio: 2, weight: 0.15, detune: 2 }],
  pad: [{ type: 'sine', ratio: 1, weight: 0.76, detune: -5 }, { type: 'triangle', ratio: 1, weight: 0.24, detune: 5 }],
  bass: [{ type: 'sine', ratio: 1, weight: 1, detune: 0 }],
};

function disconnect(node: AudioNode): void {
  try { node.disconnect(); } catch { /* Already detached, or the context was closed. */ }
}
function stopSource(source: OscillatorNode, time: number): void {
  try { source.stop(time); } catch { /* A failed setup may not have started this source. */ }
}
function hold(param: AudioParam, time: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
  else {
    const value = param.value;
    param.cancelScheduledValues(time);
    param.setValueAtTime(value, time);
  }
}

export function createRelaxingMusic(options: { onUnavailable?: () => void } = {}): RelaxingMusic {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let volume = 0.35;
  let enabled = false;
  let hidden = false;
  let disposed = false;
  let pending: StartAttempt | undefined;
  let active: Session | undefined;
  let scheduler: ReturnType<typeof setTimeout> | undefined;
  const sessions = new Set<Session>();
  let epoch = 0;
  let loop = 0;
  let index = 0;
  let nextArrivalTime = -Infinity;

  function finishVoice(session: Session, voice: Voice): void {
    if (voice.finished) return;
    voice.finished = true;
    for (const source of voice.sources) source.onended = null;
    for (const node of voice.nodes) disconnect(node);
    session.voices.delete(voice);
    if (session.retiring && session.voices.size === 0) finishSession(session);
  }
  function finishSession(session: Session): void {
    session.retiring = false;
    if (session.cleanup !== undefined) clearTimeout(session.cleanup);
    session.cleanup = undefined;
    for (const voice of [...session.voices]) finishVoice(session, voice);
    disconnect(session.bus);
    sessions.delete(session);
  }
  function cancelPending(): void {
    const attempt = pending;
    pending = undefined;
    attempt?.resolve(false);
  }
  function silence(immediate = false): void {
    if (scheduler !== undefined) clearTimeout(scheduler);
    scheduler = undefined;
    active = undefined;
    const now = context?.currentTime ?? 0;
    for (const session of [...sessions]) {
      if (immediate) {
        for (const voice of session.voices) for (const source of voice.sources) stopSource(source, now);
        finishSession(session);
      } else if (!session.fading) {
        session.fading = true;
        session.retiring = true;
        if (session.cleanup !== undefined) clearTimeout(session.cleanup);
        hold(session.bus.gain, now);
        session.bus.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
        for (const voice of session.voices) for (const source of voice.sources) {
          stopSource(source, voice.start > now ? now : Math.min(voice.end, now + FADE_SECONDS));
        }
        // Audio time can freeze in a suspended tab; wall-clock cleanup still releases every node.
        session.cleanup = setTimeout(() => finishSession(session), (FADE_SECONDS + 0.01) * 1000);
      }
    }
  }
  function notifyUnavailable(): void {
    try { options.onUnavailable?.(); } catch { /* UI feedback must not reject playback promises. */ }
  }
  function closeContext(): void {
    const previous = context;
    context = undefined;
    nextArrivalTime = -Infinity;
    if (master) disconnect(master);
    master = undefined;
    if (previous && previous.state !== 'closed') {
      try { void previous.close().catch(() => {}); } catch { /* Closing is best-effort on older engines. */ }
    }
  }
  function fail(): void {
    enabled = false;
    cancelPending();
    silence(true);
    closeContext();
    notifyUnavailable();
  }
  function ensureContext(): AudioContext {
    if (context?.state === 'closed') {
      silence(true);
      closeContext();
    }
    if (!context) {
      const browser = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const Constructor = browser.AudioContext ?? browser.webkitAudioContext;
      if (!Constructor) throw new Error('Web Audio is unavailable');
      context = new Constructor();
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
    }
    return context;
  }
  function scheduleNote(audio: AudioContext, session: Session, event: MusicEvent, time: number): void {
    const duration = event.durationBeats * SECONDS_PER_BEAT;
    const end = time + duration;
    const envelope = audio.createGain();
    const voice: Voice = { nodes: [envelope], sources: [], start: time, end, finished: false };
    session.voices.add(voice);
    envelope.connect(session.bus);
    const peak = event.velocity * (event.instrument === 'bell' ? 0.18 : event.instrument === 'pad' ? 0.08 : 0.14);
    const attack = event.instrument === 'pad' ? 0.5 : event.instrument === 'bass' ? 0.08 : 0.012;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(peak, time + attack);
    if (event.instrument === 'bell') envelope.gain.exponentialRampToValueAtTime(0.0001, end - 0.02);
    else {
      envelope.gain.linearRampToValueAtTime(peak * 0.8, end - (event.instrument === 'pad' ? 0.8 : 0.3));
    }
    envelope.gain.linearRampToValueAtTime(0, end);
    const partials = PARTIALS[event.instrument];
    let ended = 0;
    for (const partial of partials) {
      const source = audio.createOscillator();
      voice.sources.push(source);
      voice.nodes.push(source);
      const gain = audio.createGain();
      voice.nodes.push(gain);
      source.type = partial.type;
      source.frequency.setValueAtTime(midiToFrequency(event.midi) * partial.ratio, time);
      source.detune.setValueAtTime(partial.detune, time);
      gain.gain.value = partial.weight;
      source.connect(gain);
      gain.connect(envelope);
      source.onended = () => { if (++ended === partials.length) finishVoice(session, voice); };
      source.start(time);
      source.stop(end);
    }
  }
  function nextEvent(): void {
    if (++index === RELAXING_COMPOSITION.events.length) { index = 0; loop++; }
  }
  function tick(): void {
    scheduler = undefined;
    const audio = context;
    const session = active;
    if (!audio || !session || !enabled || hidden || disposed) return;
    if (audio.state !== 'running') { silence(true); return; }
    try {
      const now = audio.currentTime;
      // Seek instead of bursting overdue notes after a browser stall or device interruption.
      const beat = Math.max(0, (now - epoch) / SECONDS_PER_BEAT);
      const nextBeat = loop * RELAXING_COMPOSITION.loopBeats + RELAXING_COMPOSITION.events[index].beat;
      if (nextBeat < beat - 0.1) {
        loop = Math.floor(beat / RELAXING_COMPOSITION.loopBeats);
        index = RELAXING_COMPOSITION.events.findIndex(event => event.beat >= beat % RELAXING_COMPOSITION.loopBeats);
        if (index === -1) { index = 0; loop++; }
      }
      while (true) {
        const event = RELAXING_COMPOSITION.events[index];
        const time = epoch + (loop * RELAXING_COMPOSITION.loopBeats + event.beat) * SECONDS_PER_BEAT;
        if (time >= now + LOOKAHEAD) break;
        scheduleNote(audio, session, event, Math.max(now, time));
        nextEvent();
      }
      scheduler = setTimeout(tick, TICK_MS);
    } catch { fail(); }
  }
  function start(): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    enabled = true;
    if (hidden) return Promise.resolve(false);
    if (pending) return pending.promise;
    if (active && context?.state === 'running') return Promise.resolve(true);
    silence();
    let resolve!: (result: boolean) => void;
    const promise = new Promise<boolean>(done => { resolve = done; });
    const attempt: StartAttempt = { promise, resolve };
    pending = attempt;
    try {
      const audio = ensureContext();
      // Invoke resume synchronously here, before any Promise boundary loses the user gesture.
      const resuming = audio.resume();
      void Promise.resolve(resuming).then(() => {
        if (pending !== attempt || disposed || hidden || !enabled || context !== audio) return;
        try {
          if (audio.state !== 'running') throw new Error('Audio context did not resume');
          const bus = audio.createGain();
          const session: Session = { bus, voices: new Set(), retiring: false };
          sessions.add(session);
          bus.connect(master!);
          bus.gain.setValueAtTime(0, audio.currentTime);
          bus.gain.linearRampToValueAtTime(1, audio.currentTime + 0.15);
          active = session;
          epoch = audio.currentTime + 0.04;
          loop = 0;
          index = 0;
          tick();
          if (pending === attempt) { pending = undefined; resolve(active === session); }
        } catch { if (pending === attempt) fail(); }
      }, () => { if (pending === attempt) fail(); });
    } catch { if (pending === attempt) fail(); }
    return promise;
  }

  return {
    start,
    stop() {
      enabled = false;
      cancelPending();
      silence();
    },
    setVolume(value) {
      volume = clampMusicVolume(value);
      if (master && context) {
        hold(master.gain, context.currentTime);
        master.gain.linearRampToValueAtTime(volume, context.currentTime + FADE_SECONDS);
      }
    },
    setHidden(value) {
      if (disposed || hidden === value) return;
      hidden = value;
      if (hidden) { cancelPending(); silence(); }
      else if (enabled) { void start(); }
    },
    emitArrival(count) {
      const audio = context;
      if (disposed || hidden || pending || !audio || !master || audio.state !== 'running'
        || !Number.isFinite(count) || count < 1 || audio.currentTime < nextArrivalTime) return;
      let session: Session | undefined;
      try {
        const bus = audio.createGain();
        session = { bus, voices: new Set(), retiring: false };
        sessions.add(session);
        bus.gain.value = 0.35;
        bus.connect(master);
        const now = audio.currentTime;
        const notes = [74, 78, 81].slice(0, Math.min(3, Math.floor(count)));
        notes.forEach((midi, note) => scheduleNote(audio, session!, {
          beat: 0, durationBeats: 0.35, midi, velocity: 0.3, instrument: 'bell',
        }, now + 0.01 + note * 0.08));
        session.retiring = true;
        const feedback = session;
        session.cleanup = setTimeout(() => finishSession(feedback), 550);
        nextArrivalTime = now + 0.4;
      } catch {
        if (session) {
          for (const voice of session.voices) for (const source of voice.sources) stopSource(source, audio.currentTime);
          finishSession(session);
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      cancelPending();
      silence(true);
      closeContext();
    },
    get playing() { return !!active && !hidden && !disposed && context?.state === 'running'; },
  };
}
