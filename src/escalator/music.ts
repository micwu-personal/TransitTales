export type MusicInstrument = 'bell' | 'pad' | 'bass' | 'air' | 'strings' | 'harp';
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

type PhraseNote = readonly [beat: number, duration: number, midi: number, expression?: number];
interface CompositionBar {
  chord: string;
  voicing: readonly number[];
  bass: readonly PhraseNote[];
  melody: readonly PhraseNote[];
  strings: readonly PhraseNote[];
  harp: readonly PhraseNote[];
  expression: number;
  padBeat?: number;
}

// Original “Sunlit landings”: five inner voices move by small steps, even through the borrowed bridge.
// Bowed countermelodies cross barlines; harp dyads and answering gestures leave room for the bell theme.
const SCORE: readonly CompositionBar[] = [
  { chord:'Dmaj9', voicing:[54,57,61,64,66], expression:0.9,
    bass:[[0,2.8,38],[3.25,0.6,37]], melody:[[0.5,1.05,74,0.9],[1.75,0.55,78,1.1],[2.75,1,76,0.85]],
    strings:[[1,4.4,66,0.9]], harp:[[0.12,2.1,57,0.8],[0.24,1.8,64,0.7],[3.5,1.2,69,0.85]] },
  { chord:'A13/C#', voicing:[55,57,59,64,66], expression:0.84, padBeat:0.25,
    bass:[[0,3.65,37]], melody:[[0.25,0.6,73,0.8],[1.25,1.5,76,1],[3.25,0.5,71,0.7]],
    strings:[[1.75,2.6,64]], harp:[[2.8,1.4,66,0.9],[2.92,1.2,71,0.7]] },
  { chord:'Bm11', voicing:[54,57,61,62,64], expression:0.96,
    bass:[[0,2.1,35],[2.75,0.9,42]], melody:[[0.75,0.7,74],[2,0.45,78,0.85],[2.75,1.15,81,1.05]],
    strings:[[0.5,2.9,62,1.05],[3.5,1.2,64,0.85]], harp:[[0.25,2.4,61,0.75],[1.5,1.7,66,0.9]] },
  { chord:'Gmaj13', voicing:[54,57,59,64,66], expression:1.04,
    bass:[[0.25,2.6,43],[3.25,0.6,42]], melody:[[0,1.3,79,1.05],[1.75,0.65,78,0.85],[3,0.8,74,0.8]],
    strings:[[0.9,3.8,66]], harp:[[2.5,1.7,59,0.8],[2.64,1.5,69,0.7],[3.5,1.1,74,0.65]] },
  { chord:'Em11', voicing:[55,57,59,62,66], expression:0.92, padBeat:0.5,
    bass:[[0,1.8,40],[2.5,1.1,47]], melody:[[0.5,0.55,76],[1.5,0.65,78,0.9],[2.5,1.15,71,0.8]],
    strings:[[1,3,67,1.1]], harp:[[0.2,2.6,62,0.85],[0.32,2.2,66,0.7]] },
  { chord:'A13sus4', voicing:[55,57,59,62,66], expression:0.86,
    bass:[[0,2.7,45],[3.25,0.6,44]], melody:[[0.25,0.5,71,0.85],[1,0.9,76],[2.25,0.7,74,0.9],[3.25,0.45,73,0.7]],
    strings:[[0.25,1.8,67,0.9],[2.25,2.8,66,0.85]], harp:[[1.5,2.3,59,0.9],[3,1.6,64,0.7]] },
  { chord:'Dmaj9/F#', voicing:[54,57,61,62,64], expression:0.8,
    bass:[[0,3.6,42]], melody:[[0.75,1.7,74],[3,0.75,69,0.65]],
    strings:[[1.5,2.2,64,0.8]], harp:[[0.3,2.9,62,0.75],[0.42,2.6,69,0.65],[2.75,1.9,76,0.8]] },
  { chord:'A13', voicing:[55,57,59,61,66], expression:0.78, padBeat:0.25,
    bass:[[0.5,2.5,45],[3.25,0.6,42]], melody:[[1,0.9,71,0.8],[2.5,0.5,73],[3.25,0.45,76,0.85]],
    strings:[[0.75,2.4,61,0.85]], harp:[[3.1,1.3,66,0.9],[3.23,1.1,71,0.7]] },

  { chord:'Gmaj9(#11)', voicing:[54,57,59,61,62], expression:0.96,
    bass:[[0,1.8,43],[2.25,1.1,47]], melody:[[0,0.8,79],[1,0.45,81,0.85],[1.75,1.2,83,1.1],[3.25,0.6,81,0.8]],
    strings:[[0.5,2.5,74],[3.25,1.6,73,0.85]], harp:[[0.2,2.5,62,0.8],[2.75,1.7,78,0.85]] },
  { chord:'Dmaj9/F#', voicing:[54,57,61,64,66], expression:1.04, padBeat:0.5,
    bass:[[0.5,2.25,42],[3,0.8,40]], melody:[[0.5,1.3,78,1.05],[2.25,0.65,76,0.8],[3.25,0.5,74,0.7]],
    strings:[[1,3.3,69,1.1]], harp:[[1.9,1.8,62,0.9],[2.06,1.5,76,0.7]] },
  { chord:'Em11', voicing:[55,57,59,62,66], expression:1.08,
    bass:[[0,2.2,40],[2.75,0.9,42]], melody:[[0.25,0.65,76,0.85],[1.5,0.5,79],[2.5,1.2,83,1.05]],
    strings:[[0.6,1.65,71],[2.5,2.4,74,1.1]], harp:[[0.15,2.8,59,0.8],[0.28,2.4,66,0.75],[3.25,1.4,78,0.8]] },
  { chord:'Bm11', voicing:[54,57,61,62,64], expression:1.02, padBeat:0.25,
    bass:[[0.25,3.5,35]], melody:[[1,1.7,81,0.95],[3.25,0.5,78,0.7]],
    strings:[[1.2,3.6,73]], harp:[[0.75,2.2,62,0.85],[2.8,1.5,69,0.8]] },
  { chord:'Gmaj13', voicing:[54,57,59,62,64], expression:0.96,
    bass:[[0,2.6,43],[3.25,0.6,42]], melody:[[0.25,0.55,79],[1.25,0.55,78,0.9],[2.25,1.4,74,0.75]],
    strings:[[1,2.8,71,0.95]], harp:[[1.75,2.2,64,0.8],[1.9,1.9,69,0.7],[3.5,1.2,78,0.75]] },
  { chord:'F#7(b9)', voicing:[54,58,61,64,67], expression:0.88, padBeat:0.5,
    bass:[[0,1.75,42],[2.25,1.4,37]], melody:[[0.5,0.8,73,0.9],[1.75,0.7,70,0.75],[2.75,1,76,0.85]],
    strings:[[0.5,1.8,70,0.85],[2.5,2.2,67,0.75]], harp:[[1.3,2,61,0.8],[3.2,1.2,64,0.65]] },
  { chord:'Bm9', voicing:[54,57,61,62,66], expression:0.98,
    bass:[[0,2.8,35],[3.25,0.6,40]], melody:[[0,1.55,78,1.05],[2,0.55,74,0.85],[3,0.7,73,0.75]],
    strings:[[0.75,3.9,66,1.05]], harp:[[0.18,2.7,62,0.85],[0.3,2.4,73,0.7],[2.75,1.5,81,0.8]] },
  { chord:'A13', voicing:[55,57,59,61,66], expression:0.82, padBeat:0.25,
    bass:[[0.5,3.25,45]], melody:[[0.75,0.85,71],[2,0.7,73,0.85],[3,0.7,76,0.7]],
    strings:[[1,2.7,64,0.85]], harp:[[2.5,1.9,59,0.75],[2.65,1.6,66,0.65]] },

  { chord:'Em9', voicing:[55,59,62,66,67], expression:0.86, padBeat:0.5,
    bass:[[0,3.75,40]], melody:[[1,0.95,71,0.8],[2.5,1.3,76,0.75]],
    strings:[[0.75,4.5,67]], harp:[[0.3,2.7,59,0.8],[3.25,1.8,66,0.75]] },
  { chord:'Bm11/D', voicing:[54,57,59,61,64], expression:0.8,
    bass:[[0.5,2.6,38],[3.25,0.6,37]], melody:[[0.5,1.7,74,0.85],[2.75,0.85,73,0.7]],
    strings:[[1.5,3.2,66,0.9]], harp:[[2.5,2,61,0.75],[2.68,1.7,69,0.6]] },
  { chord:'Cmaj9(#11)', voicing:[55,59,62,64,66], expression:0.92, padBeat:0.75,
    bass:[[0,3.7,36]], melody:[[0.75,1,72,0.75],[2.25,1.5,76,0.85]],
    strings:[[1,1.5,64,0.85],[2.75,2.8,66]], harp:[[0.15,3,59,0.8],[0.3,2.7,74,0.7]] },
  { chord:'Gmaj13/B', voicing:[55,57,62,64,66], expression:0.82, padBeat:1,
    bass:[[0.25,3.4,35]], melody:[],
    strings:[[1.75,3.8,67,0.9]], harp:[] },
  { chord:'Am11', voicing:[55,59,60,62,64], expression:0.9, padBeat:0.5,
    bass:[[0.5,2.25,33],[3,0.8,40]], melody:[[1.25,1.9,72,0.75]],
    strings:[[1.75,3.5,64,0.9]], harp:[[0.25,2.8,59,0.8],[3.1,1.4,67,0.65]] },
  { chord:'Gm6/9', voicing:[55,57,58,62,64], expression:0.98, padBeat:0.25,
    bass:[[0,3.6,43]], melody:[[0.5,1.35,70,0.85],[2.5,1.25,69,0.7]],
    strings:[[1.5,2.9,62]], harp:[[1,2.5,58,0.8],[1.2,2.2,64,0.7]] },
  { chord:'Dmaj9/A', voicing:[54,57,61,62,64], expression:0.88,
    bass:[[0.25,2.75,45],[3.25,0.6,40]], melody:[[1,1,74,0.85],[2.5,1,76,0.8]],
    strings:[[0.75,4.1,66]], harp:[[2,2.3,61,0.8],[2.15,2,69,0.65],[3.25,1.4,78,0.7]] },
  { chord:'A7sus4(b9)', voicing:[55,57,58,62,64], expression:0.76, padBeat:0.5,
    bass:[[0.5,3.25,45]], melody:[[1.5,1.6,73,0.75]],
    strings:[[1,1.1,74,0.85],[2.35,1.4,73,0.7]], harp:[[0.75,2.2,64,0.7]] },

  { chord:'Dmaj9', voicing:[54,57,61,64,66], expression:0.9,
    bass:[[0,2.75,38],[3.25,0.6,37]], melody:[[0.5,1.2,74,0.9],[1.75,0.6,78,1.1],[2.75,1.1,76,0.85]],
    strings:[[0.75,4.5,66,0.9]], harp:[[0.2,2.7,62,0.8],[0.34,2.4,69,0.7],[3.3,1.5,81,0.7]] },
  { chord:'A13/C#', voicing:[55,57,59,64,66], expression:0.82, padBeat:0.25,
    bass:[[0.25,3.4,37]], melody:[[0.5,1.5,76],[2.75,0.9,73,0.75]],
    strings:[[1.5,2.8,64]], harp:[[2.25,2.3,59,0.8],[2.4,2,66,0.65]] },
  { chord:'Bm11', voicing:[54,57,61,62,64], expression:0.94,
    bass:[[0,3.6,35]], melody:[[0.75,0.7,74,0.9],[2,0.55,78],[2.75,1.1,81,0.9]],
    strings:[[0.5,3,62],[3.6,1.1,64,0.8]], harp:[[1.25,2.2,61,0.75],[1.38,1.9,69,0.7],[3.25,1.4,78,0.8]] },
  { chord:'Gmaj13', voicing:[54,57,59,62,64], expression:0.96, padBeat:0.5,
    bass:[[0.5,2.5,43],[3.25,0.6,42]], melody:[[1,1.65,79,0.95],[3,0.8,74,0.7]],
    strings:[[0.9,3.7,66]], harp:[[0.25,2.8,59,0.8],[2.8,1.7,76,0.75]] },
  { chord:'Em11', voicing:[55,57,59,62,66], expression:0.86,
    bass:[[0,2.7,40],[3.25,0.6,44]], melody:[[0.5,0.7,76],[1.75,0.8,71,0.8],[3,0.7,73,0.75]],
    strings:[[1,2.8,67,0.95]], harp:[[0.15,2.9,62,0.8],[0.28,2.6,66,0.65]] },
  { chord:'A13', voicing:[55,57,59,61,66], expression:0.78, padBeat:0.25,
    bass:[[0.25,3.4,45]], melody:[[0.25,1.6,73,0.85],[2.5,1.1,76,0.7]],
    strings:[[0.25,2,66,0.9],[2.5,2.3,64,0.8]], harp:[[1.8,2.1,59,0.7],[1.95,1.8,69,0.6]] },
  { chord:'Gm6/9', voicing:[55,57,58,62,64], expression:0.72,
    bass:[[0,2.5,43],[3,0.8,45]], melody:[[0.75,1.4,70,0.85],[2.75,1,69,0.65]],
    strings:[[1,3.5,62,0.85]], harp:[[0.4,2.7,58,0.75],[0.6,2.3,64,0.65],[3,1.5,76,0.65]] },
  { chord:'D6/9', voicing:[54,57,59,62,64], expression:0.64,
    bass:[[0,3.9,38]], melody:[[0.5,3.35,74,0.75]],
    strings:[[0.75,1.35,66,0.8],[2.25,1.7,62,0.65]], harp:[[0.2,3.6,57,0.7],[0.35,3.4,64,0.6],[1.75,2.2,69,0.65]] },
];

function compose(): readonly MusicEvent[] {
  const events: MusicEvent[] = [];
  const add = (instrument: MusicInstrument, bar: number, note: PhraseNote, velocity: number) => {
    events.push({ beat:bar * 4 + note[0], durationBeats:note[1], midi:note[2],
      velocity:velocity * (note[3] ?? 1), instrument });
  };
  SCORE.forEach((bar, index) => {
    const section = Math.floor(index / 8);
    const intensity = [0.9, 1, 0.7, 0.78][section] * bar.expression;
    bar.bass.forEach((note, i) => add('bass', index, note, (i === 0 ? 0.46 : 0.32) * intensity));
    bar.voicing.forEach((midi, voice) => {
      const offset = (bar.padBeat ?? 0) + voice * 0.045;
      add('pad', index, [offset, 3.96 - offset, midi], (0.3 - voice * 0.02) * intensity);
    });
    bar.melody.forEach((note, i) => add('bell', index, note, (i === 0 ? 0.5 : i === 1 ? 0.44 : 0.46) * intensity));
    bar.strings.forEach(note => add('strings', index, note, (section === 1 ? 0.53 : 0.48) * intensity));
    bar.harp.forEach(note => add('harp', index, note, 0.48 * intensity));
    if ([3, 7, 11, 15, 18, 19, 23, 27, 31].includes(index)) {
      add('air', index, [0.75, 3.1, Math.max(...bar.voicing) + 12], 0.18 * intensity);
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
  strings: [{ type: 'triangle', ratio: 1, weight: 0.56, detune: -4 },
    { type: 'sawtooth', ratio: 1, weight: 0.32, detune: 4 }, { type: 'sine', ratio: 2, weight: 0.12, detune: 0 }],
  harp: [{ type: 'triangle', ratio: 1, weight: 0.7, detune: 0 },
    { type: 'sine', ratio: 2, weight: 0.22, detune: 0 }, { type: 'sine', ratio: 3, weight: 0.08, detune: 0 }],
};
const NOTE_LEVEL: Record<MusicInstrument, number> = { bell:0.18, pad:0.055, bass:0.14, air:0.04, strings:0.105, harp:0.145 };
const ATTACK_SECONDS: Record<MusicInstrument, number> = { bell:0.012, pad:0.5, bass:0.08, air:0.8, strings:0.45, harp:0.006 };

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
    const peak = event.velocity * NOTE_LEVEL[event.instrument];
    const attack = Math.min(duration * 0.2, ATTACK_SECONDS[event.instrument]);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(peak * (event.instrument === 'strings' ? 0.78 : 1), time + attack);
    if (event.instrument === 'bell' || event.instrument === 'harp') {
      envelope.gain.exponentialRampToValueAtTime(0.0001, end - 0.02);
    } else if (event.instrument === 'strings') {
      envelope.gain.linearRampToValueAtTime(peak, time + duration * 0.45);
      envelope.gain.linearRampToValueAtTime(peak * 0.7, end - Math.min(duration * 0.35, 0.65));
    } else {
      const release = Math.min(duration * 0.45, event.instrument === 'pad' || event.instrument === 'air' ? 0.8 : 0.3);
      envelope.gain.linearRampToValueAtTime(peak * 0.8, end - release);
    }
    envelope.gain.linearRampToValueAtTime(0, end);
    let toneBus: AudioNode = envelope;
    if (event.instrument === 'strings') {
      const filter = audio.createBiquadFilter();
      voice.nodes.push(filter);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(2400, Math.max(800, midiToFrequency(event.midi) * 3.5)), time);
      filter.Q.setValueAtTime(0.55, time);
      filter.connect(envelope);
      toneBus = filter;
    }
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
      if (event.instrument === 'strings') {
        // Delayed, gentle vibrato without extra free-running modulation nodes.
        const vibrato = Float32Array.from({ length:Math.ceil(duration * 30) + 1 }, (_, sample) => {
          const passed = sample * duration / Math.ceil(duration * 30);
          return partial.detune + 3 * Math.min(1, passed / 0.7) * Math.sin(2 * Math.PI * 5.1 * passed);
        });
        source.detune.setValueCurveAtTime(vibrato, time, duration);
      }
      if (event.instrument === 'harp') {
        // Upper harmonics die away before the plucked fundamental.
        gain.gain.setValueAtTime(partial.weight, time);
        gain.gain.exponentialRampToValueAtTime(partial.weight * 0.05,
          time + Math.min(duration * 0.7, partial.ratio === 1 ? 1.7 : 0.45));
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
      } else gain.gain.value = partial.weight;
      source.connect(gain);
      gain.connect(toneBus);
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
