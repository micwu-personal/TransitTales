import { midiToFrequency, partCount, resolvePerformance, scoreIssues, type Dynamic, type PerformanceMoment, type Score } from './model';

export interface NotePlayer {
  play(score: Score, bpm: number): Promise<boolean>;
  stop(): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
  readonly playing: boolean;
  readonly elapsedSeconds: number;
}
export type NotePlayerOptions = {
  onPosition?: (index: number, progress: number) => void;
  onFinish?: () => void;
  onUnavailable?: () => void;
};
type Tone = { oscillator: OscillatorNode; gain: GainNode };

function disconnectTone(tone: Tone): void {
  try { tone.oscillator.stop(); } catch { /* Already stopped or never started. */ }
  try { tone.oscillator.disconnect(); } catch { /* Best-effort teardown. */ }
  try { tone.gain.disconnect(); } catch { /* Best-effort teardown. */ }
}

/** Exact mathematical 440-Hz equal-temperament target; physical output is subject to device clock precision. */
export function scheduleTone(context: BaseAudioContext, midi: number, start: number, duration: number, destination: AudioNode, amplitude = 1): Tone {
  const frequency = midiToFrequency(midi);
  if (!Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(start + duration)
    || !Number.isFinite(amplitude) || amplitude < 0 || amplitude > 1) {
    throw new RangeError('Tone start must be nonnegative and duration positive and finite');
  }
  const oscillator = context.createOscillator();
  let gain: GainNode | undefined;
  try {
    gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(0, start);
    const attack = Math.min(.004, duration * .08);
    const decay = Math.min(.035, duration * .2);
    const release = Math.min(.012, duration * .12);
    const gap = Math.min(.012, duration * .1);
    const sustain = amplitude * .72;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(amplitude, start + attack);
    gain.gain.linearRampToValueAtTime(sustain, start + attack + decay);
    gain.gain.setValueAtTime(sustain, start + duration - gap - release);
    gain.gain.linearRampToValueAtTime(0, start + duration - gap);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
    return { oscillator, gain };
  } catch (error) {
    try { oscillator.stop(); } catch { /* May not have started. */ }
    oscillator.disconnect();
    gain?.disconnect();
    throw error;
  }
}

// Relative amplitude in dB, not frequency or timbre changes. ff is the bounded peak.
const dynamicDecibels: Record<Dynamic, number> = { pp: -18, p: -14, mp: -10, mf: -6, f: -3, ff: 0 };

function polyphonyLimit(moments: PerformanceMoment[]): number {
  const edges = moments.flatMap(moment => moment.pitches.flatMap(pitch => [
    { tick: Math.round(moment.startBeat * 24), change: 1 },
    { tick: Math.round((moment.startBeat + pitch.durationBeats) * 24), change: -1 },
  ])).sort((a, b) => a.tick - b.tick || a.change - b.change);
  let active = 0;
  let maximum = 1;
  for (const edge of edges) { active += edge.change; maximum = Math.max(maximum, active); }
  return maximum;
}

/** BPM 40..160; incomplete/partial-tuplet/unequal-length voice drafts are safe previews. */
export function createNotePlayer(options: NotePlayerOptions = {}): NotePlayer {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let tones: Tone[] = [];
  let generation = 0;
  let disposed = false;
  let active = false;
  let volume = .25;
  let muted = false;
  let startTime = 0;
  let totalSeconds = 0;
  let elapsed = 0;
  let ticker: ReturnType<typeof setInterval> | undefined;
  const documentTarget = typeof document === 'undefined' ? undefined : document;
  const windowTarget = typeof window === 'undefined' ? undefined : window;

  const stop = () => {
    generation++;
    active = false;
    elapsed = 0;
    if (ticker !== undefined) clearInterval(ticker);
    ticker = undefined;
    for (const tone of tones) disconnectTone(tone);
    tones = [];
    try { master?.disconnect(); } catch { /* Best-effort teardown. */ }
    master = undefined;
  };
  const hidden = () => { if (documentTarget?.hidden) stop(); };
  const stateChanged = () => { if (active && context?.state !== 'running') stop(); };
  documentTarget?.addEventListener('visibilitychange', hidden);
  windowTarget?.addEventListener('pagehide', stop);

  function applyVolume(): void {
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(muted ? 0 : volume, now + .01);
  }

  function unavailable(token: number): false {
    if (token === generation && !disposed) {
      stop();
      options.onUnavailable?.();
    }
    return false;
  }

  return {
    async play(score, bpm) {
      stop();
      const token = generation;
      if (disposed || documentTarget?.hidden || !Number.isFinite(bpm) || bpm < 40 || bpm > 160) return false;
      let moments: PerformanceMoment[];
      try {
        const issues = scoreIssues(score);
        const partialTuplet = issues.some(issue => issue.code === 'tuplet');
        if (partCount(score) > 4 || [score, ...(score.parts ?? [])].some(part => part.events.some(event => (event.chord?.length ?? 0) > 3))
          || issues.some(issue => issue.code === 'out-of-range' || issue.code === 'too-long'
            || (issue.code === 'overflow' && !partialTuplet))) return false;
        moments = resolvePerformance(score);
        if (!moments.length) return false;
      } catch { return false; }

      // Construction and resume happen before the first await, inside the user's gesture.
      try {
        if (!context) {
          const host = windowTarget ?? globalThis;
          const Constructor = (host as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).AudioContext
            ?? (host as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Constructor) return unavailable(token);
          context = new Constructor();
          context.addEventListener('statechange', stateChanged);
        }
        if (context.state === 'closed') return unavailable(token);
        if (context.state !== 'running') await context.resume();
        if (token !== generation || disposed) return false;
        if (documentTarget?.hidden) { stop(); return false; }
        if (context.state !== 'running') return unavailable(token);
        if (!master) {
          master = context.createGain();
          master.connect(context.destination);
        }
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setValueAtTime(muted ? 0 : volume, context.currentTime);
        const secondsPerBeat = 60 / bpm;
        startTime = context.currentTime + .025;
        const last = moments[moments.length - 1];
        totalSeconds = (last.startBeat + last.durationBeats) * secondsPerBeat;
        const normalization = polyphonyLimit(moments);
        for (const moment of moments) {
          for (const pitch of moment.pitches) tones.push(scheduleTone(context, pitch.midi,
            startTime + moment.startBeat * secondsPerBeat, pitch.durationBeats * secondsPerBeat, master,
            10 ** (dynamicDecibels[pitch.dynamic] / 20) / normalization));
        }
        active = true;
        const tick = () => {
          if (!active || token !== generation || !context) return;
          if (context.state !== 'running' || documentTarget?.hidden) { stop(); return; }
          elapsed = Math.max(0, Math.min(totalSeconds, context.currentTime - startTime));
          if (elapsed >= totalSeconds) {
            stop();
            elapsed = totalSeconds;
            options.onFinish?.();
            return;
          }
          const beat = elapsed / secondsPerBeat;
          const moment = moments.find(moment => beat >= moment.startBeat && beat < moment.startBeat + moment.durationBeats);
          if (moment) options.onPosition?.(moment.index, Math.min(1, Math.max(0, (beat - moment.startBeat) / moment.durationBeats)));
        };
        ticker = setInterval(tick, 1000 / 30);
        return true;
      } catch { return unavailable(token); }
    },
    stop,
    setVolume(value) {
      if (!Number.isFinite(value)) throw new RangeError('Volume must be finite');
      volume = Math.min(1, Math.max(0, value));
      if (!disposed) applyVolume();
    },
    setMuted(value) {
      muted = Boolean(value);
      if (!disposed) applyVolume();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      documentTarget?.removeEventListener('visibilitychange', hidden);
      windowTarget?.removeEventListener('pagehide', stop);
      context?.removeEventListener('statechange', stateChanged);
      master?.disconnect();
      master = undefined;
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    },
    get playing() { return active; },
    get elapsedSeconds() {
      return active && context ? Math.max(0, Math.min(totalSeconds, context.currentTime - startTime)) : elapsed;
    },
  };
}
