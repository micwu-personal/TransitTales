export type MusicInstrument = 'bell' | 'pad' | 'bass' | 'air';
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

type PhraseNote = readonly [beat: number, duration: number, midi: number];
interface CompositionBar {
  chord: string;
  voicing: readonly number[];
  bass: readonly PhraseNote[];
  melody: readonly PhraseNote[];
  padBeat?: number;
}

// Original “Sunlit landings”: a D-major theme, answering phrase, borrowed-color bridge, and quieter return.
// Notes and rests are authored phrases, not scale samples or per-bar arpeggio templates.
const SCORE: readonly CompositionBar[] = [
  { chord:'Dmaj9', voicing:[54,57,61,64], bass:[[0,2.5,38],[3,0.8,37]], melody:[[0.5,0.85,74],[1.75,0.55,78],[2.75,0.9,76]] },
  { chord:'Aadd9/C#', voicing:[52,57,59,64], bass:[[0,3.65,37]], melody:[[0.25,0.55,73],[1.25,1.25,76],[3,0.65,69]], padBeat:0.25 },
  { chord:'Bm7', voicing:[54,57,62,66], bass:[[0,2.1,35],[2.75,0.9,42]], melody:[[0.75,0.7,74],[2,0.45,78],[2.75,0.9,81]] },
  { chord:'Gmaj9', voicing:[54,57,59,62], bass:[[0.25,2.6,43],[3.25,0.6,42]], melody:[[0,1.15,79],[1.75,0.6,78],[3,0.7,74]] },
  { chord:'Em9', voicing:[55,59,62,66], bass:[[0,1.8,40],[2.5,1.1,47]], melody:[[0.5,0.55,76],[1.5,0.6,78],[2.5,1.1,71]], padBeat:0.5 },
  { chord:'A13sus', voicing:[55,59,62,66], bass:[[0,2.7,45],[3.25,0.6,44]], melody:[[0.25,0.45,73],[1,0.8,76],[2.25,0.65,74],[3.25,0.45,73]] },
  { chord:'Dadd9/F#', voicing:[57,62,64,69], bass:[[0,3.6,42]], melody:[[0.75,1.4,74],[2.75,0.75,69]] },
  { chord:'A9', voicing:[55,59,61,64], bass:[[0.5,2.5,45],[3.25,0.6,42]], melody:[[1,0.85,71],[2.5,0.5,73],[3.25,0.45,76]], padBeat:0.25 },

  { chord:'Gmaj9', voicing:[57,59,62,66], bass:[[0,1.8,43],[2.25,1.1,47]], melody:[[0,0.75,79],[1,0.45,81],[1.75,1.1,83],[3.25,0.5,81]] },
  { chord:'Dmaj9/F#', voicing:[57,61,64,66], bass:[[0.5,2.25,42],[3,0.8,40]], melody:[[0.5,1.2,78],[2.25,0.65,76],[3.25,0.5,74]], padBeat:0.5 },
  { chord:'Em9', voicing:[55,59,66,69], bass:[[0,2.2,40],[2.75,0.9,42]], melody:[[0.25,0.65,76],[1.5,0.5,79],[2.5,0.95,83]] },
  { chord:'Bm11', voicing:[57,62,64,66], bass:[[0.25,3.5,35]], melody:[[1,1.4,81],[3,0.5,78]], padBeat:0.25 },
  { chord:'Gmaj7', voicing:[54,59,62,67], bass:[[0,2.6,43],[3.25,0.6,42]], melody:[[0.25,0.5,79],[1.25,0.5,78],[2.25,1.2,74]] },
  { chord:'F#7', voicing:[54,58,61,64], bass:[[0,1.75,42],[2.25,1.4,37]], melody:[[0.5,0.75,73],[1.75,0.65,70],[2.75,0.8,76]], padBeat:0.5 },
  { chord:'Bm9', voicing:[54,57,61,62], bass:[[0,2.8,35],[3.25,0.6,40]], melody:[[0,1.35,78],[2,0.5,74],[3,0.65,73]] },
  { chord:'A13', voicing:[55,59,61,66], bass:[[0.5,3.25,45]], melody:[[0.75,0.75,71],[2,0.6,73],[3,0.65,76]], padBeat:0.25 },

  { chord:'Em9', voicing:[55,59,62,66], bass:[[0,3.75,40]], melody:[[1,0.8,71],[2.5,1.2,76]], padBeat:0.5 },
  { chord:'Bm7/D', voicing:[54,57,59,66], bass:[[0.5,2.6,38],[3.25,0.6,37]], melody:[[0.5,1.5,74],[2.75,0.7,73]] },
  { chord:'Cmaj9', voicing:[55,59,62,64], bass:[[0,3.7,36]], melody:[[0.75,0.85,72],[2.25,1.3,76]], padBeat:0.75 },
  { chord:'Gadd9/B', voicing:[55,57,62,67], bass:[[0.25,3.4,35]], melody:[], padBeat:1 },
  { chord:'Am9', voicing:[55,59,60,64], bass:[[0.5,2.25,33],[3,0.8,40]], melody:[[1.25,1.65,72]], padBeat:0.5 },
  { chord:'Gm6', voicing:[55,58,62,64], bass:[[0,3.6,43]], melody:[[0.5,1.2,70],[2.5,1.1,69]], padBeat:0.25 },
  { chord:'Dsus2/A', voicing:[57,62,64,69], bass:[[0.25,2.75,45],[3.25,0.6,40]], melody:[[1,0.8,74],[2.5,0.8,76]] },
  { chord:'A7', voicing:[55,57,61,64], bass:[[0.5,3.25,45]], melody:[[1.5,1.3,73]], padBeat:0.5 },

  { chord:'Dmaj9', voicing:[54,57,61,64], bass:[[0,2.75,38],[3.25,0.6,37]], melody:[[0.5,0.95,74],[1.75,0.5,78],[2.75,0.95,76]] },
  { chord:'Aadd9/C#', voicing:[52,57,59,64], bass:[[0.25,3.4,37]], melody:[[0.5,1.2,76],[2.5,0.8,73]], padBeat:0.25 },
  { chord:'Bm9', voicing:[54,57,61,66], bass:[[0,3.6,35]], melody:[[0.75,0.6,74],[2,0.5,78],[2.75,0.95,81]] },
  { chord:'Gmaj9', voicing:[54,57,59,62], bass:[[0.5,2.5,43],[3.25,0.6,42]], melody:[[1,1.4,79],[3,0.7,74]], padBeat:0.5 },
  { chord:'Em9', voicing:[55,59,62,66], bass:[[0,2.7,40],[3.25,0.6,44]], melody:[[0.5,0.6,76],[1.75,0.7,71],[3,0.6,73]] },
  { chord:'A13', voicing:[55,59,61,66], bass:[[0.25,3.4,45]], melody:[[0.25,1.25,73],[2.25,0.85,76]], padBeat:0.25 },
  { chord:'Gm6', voicing:[55,58,62,64], bass:[[0,2.5,43],[3,0.8,45]], melody:[[0.75,1.15,70],[2.5,0.9,69]] },
  { chord:'D6/9', voicing:[54,57,59,64], bass:[[0,3.8,38]], melody:[[0.5,2.3,74]] },
];

function compose(): readonly MusicEvent[] {
  const events: MusicEvent[] = [];
  const add = (instrument: MusicInstrument, bar: number, note: PhraseNote, velocity: number) => {
    events.push({ beat:bar * 4 + note[0], durationBeats:note[1], midi:note[2], velocity, instrument });
  };
  SCORE.forEach((bar, index) => {
    const section = Math.floor(index / 8);
    const intensity = [0.9, 1, 0.68, 0.8][section];
    bar.bass.forEach((note, i) => add('bass', index, note, (i === 0 ? 0.46 : 0.34) * intensity));
    const voicing = index % 2 === 0 ? bar.voicing : [...bar.voicing].reverse();
    voicing.forEach((midi, voice) => {
      const offset = (bar.padBeat ?? 0) + voice * 0.07;
      add('pad', index, [offset, 3.85 - offset, midi], (0.32 - voice * 0.025) * intensity);
    });
    bar.melody.forEach((note, i) => add('bell', index, note, (i === 0 ? 0.54 : i === 1 ? 0.43 : 0.47) * intensity));
    // Soft, held upper chord tones frame phrase endings; the bridge leaves a whole melody bar silent.
    if ([3, 7, 11, 15, 18, 19, 23, 27, 31].includes(index)) {
      add('air', index, [0.75, 3.1, Math.max(...bar.voicing) + 12], 0.23 * intensity);
    }
  });
  return Object.freeze(events.sort((a, b) => a.beat - b.beat).map(event => Object.freeze(event)));
}

export const RELAXING_COMPOSITION = Object.freeze({
  title: 'Sunlit landings',
  bpm: 70,
  beatsPerBar: 4,
  bars: SCORE.length,
  loopBeats: SCORE.length * 4,
  sections: Object.freeze([
    Object.freeze({ name:'A', startBar:0, bars:8 }),
    Object.freeze({ name:'B', startBar:8, bars:8 }),
    Object.freeze({ name:'bridge', startBar:16, bars:8 }),
    Object.freeze({ name:'reprise', startBar:24, bars:8 }),
  ]),
  harmonies: Object.freeze(SCORE.map(bar => bar.chord)),
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
  air: [{ type: 'sine', ratio: 1, weight: 1, detune: -3 }],
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
    const peak = event.velocity * ({ bell:0.18, pad:0.08, bass:0.14, air:0.045 }[event.instrument]);
    const attack = Math.min(duration * 0.3, { bell:0.012, pad:0.5, bass:0.08, air:0.8 }[event.instrument]);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(peak, time + attack);
    if (event.instrument === 'bell') envelope.gain.exponentialRampToValueAtTime(0.0001, end - 0.02);
    else {
      const release = Math.min(duration * 0.45, event.instrument === 'pad' || event.instrument === 'air' ? 0.8 : 0.3);
      envelope.gain.linearRampToValueAtTime(peak * 0.8, end - release);
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
