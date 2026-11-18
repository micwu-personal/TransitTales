import type { Role, Song } from './score';

const LOOKAHEAD = 0.18;
const POLL_MS = 25;
const LEAD = 0.05;
const floorGain = 0.0001;
const wallTime = () => performance.now() / 1000;
const isRunning = (context: AudioContext) => context.state === 'running';

type Cue = { role: Role; pitch: number; beat: number; length: number; level: number; click?: boolean };
type Transport = {
  context: AudioContext;
  origin: number;
  first: number;
  end: number;
  beatSeconds: number;
  cues: Cue[];
  next: number;
  timer?: ReturnType<typeof setInterval>;
};
type Voice = { sources: AudioScheduledSourceNode[]; nodes: AudioNode[] };

function audibleTime(context: AudioContext): number {
  const render = context.currentTime;
  try {
    const stamp = context.getOutputTimestamp?.();
    if (stamp && Number.isFinite(stamp.contextTime) && Number.isFinite(stamp.performanceTime) && stamp.performanceTime! > 0) {
      return Math.min(render, stamp.contextTime! + Math.max(0, wallTime() - stamp.performanceTime! / 1000));
    }
  } catch { /* Timestamp unavailable; use estimated output latency. */ }
  return render - (context.baseLatency || 0) - (context.outputLatency || 0);
}

export class JourneyAudio {
  private context?: AudioContext;
  private noise?: AudioBuffer;
  private transport?: Transport;
  private position = 0;
  private watched = false;
  private watchedContext?: AudioContext;
  private voices = new Set<Voice>();

  /** Call from a user gesture and await before starting. */
  async unlock(): Promise<void> {
    const LegacyContext = (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const Context = globalThis.AudioContext ?? LegacyContext;
    if (!Context) throw new Error('Web Audio is unavailable');
    if (!this.context || this.context.state === 'closed') {
      this.context = new Context();
      this.noise = undefined;
    }
    const context = this.context;
    if (isRunning(context)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Some browsers leave resume pending indefinitely when autoplay is blocked.
      await Promise.race([context.resume(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Audio context did not start')), 1500);
      })]);
      if (!isRunning(context)) throw new Error('Audio context did not start');
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  /** Omitted track is by index; -1 plays every track. The pre-roll begins at fromBeat - countIn. */
  start(song: Song, omittedTrack: number, fromBeat = 0, countIn = 0, speed = 1): void {
    this.stop();
    const end = Number.isFinite(song.beats) ? Math.max(0, song.beats) : 0;
    const from = Number.isFinite(fromBeat) ? Math.max(0, Math.min(end, fromBeat)) : 0;
    const count = Number.isFinite(countIn) ? Math.max(0, countIn) : 0;
    const first = from - count;
    this.position = first;
    const beatSeconds = 60 / song.bpm / speed;
    if (from >= end || !Number.isFinite(beatSeconds) || beatSeconds <= 0 || this.hidden()) return;
    const context = this.context;
    if (!context || !isRunning(context)) throw new Error('Audio must be unlocked before playback');
    const cues: Cue[] = [];

    for (let tick = 0; tick < count; tick++) {
      const beat = first + tick;
      cues.push({ role: 'piano', pitch: tick === 0 ? 84 : 79, beat, length: Math.min(from - beat, 0.075 / beatSeconds), level: 0.055, click: true });
    }
    song.tracks.forEach((track, index) => {
      if (index === omittedTrack) return;
      for (const note of track.notes) {
        const beat = Math.max(from, note.beat);
        const finish = Math.min(end, note.beat + note.length);
        if (!Number.isFinite(beat) || !Number.isFinite(finish) || finish <= beat
          || !Number.isFinite(note.pitch) || note.pitch < 0 || note.pitch > 127
          || !Number.isFinite(note.velocity) || note.velocity <= 0
          || (track.role === 'drums' && note.beat < from)) continue;
        cues.push({ role: track.role, pitch: note.pitch, beat, length: finish - beat, level: Math.min(1, note.velocity / 127) });
      }
    });
    cues.sort((a, b) => a.beat - b.beat);
    const origin = context.currentTime + LEAD;
    const transport: Transport = { context, origin, first, end, beatSeconds, cues, next: 0 };
    this.transport = transport;
    this.watch();
    this.pump();
    if (this.transport === transport) transport.timer = setInterval(this.pump, POLL_MS);
  }

  get beat(): number {
    const run = this.transport;
    if (!run) return this.position;
    const now = audibleTime(run.context);
    this.position = Math.max(this.position, Math.min(run.end, run.first + (now - run.origin) / run.beatSeconds));
    return this.position;
  }

  /** At natural completion, running becomes false and beat remains at song.beats. */
  get running(): boolean {
    const run = this.transport;
    if (!run) return false;
    if (this.hidden() || !isRunning(run.context)) this.stop();
    else if (this.beat >= run.end) this.finish();
    return this.transport !== undefined;
  }

  stop(): void {
    void this.beat;
    this.finish();
    for (const voice of this.voices) {
      for (const source of voice.sources) {
        source.onended = null;
        try { source.stop(); }
        catch (error) {
          // Some engines reject a second stop after a source has already ended.
          if ((error as { name?: string } | null)?.name !== 'InvalidStateError') throw error;
        }
      }
      this.dispose(voice);
    }
    this.unwatchIfIdle();
  }

  tap(role: Role, pitch: number, seconds = 0.3): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.hidden() || !Number.isFinite(seconds) || seconds <= 0
      || !Number.isFinite(pitch) || pitch < 0 || pitch > 127) return;
    this.play(context, role, pitch, context.currentTime + 0.006, seconds, 0.82);
    this.watch();
  }

  private hidden(): boolean { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; }

  private onVisibility = () => { if (this.hidden()) this.stop(); };
  private onContextState = () => { if (this.context?.state !== 'running') this.stop(); };

  private watch(): void {
    if (!this.watched) {
      this.watched = true;
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
    }
    if (this.watchedContext !== this.context) {
      this.watchedContext?.removeEventListener('statechange', this.onContextState);
      this.watchedContext = this.context;
      this.watchedContext?.addEventListener('statechange', this.onContextState);
    }
  }

  private unwatchIfIdle(): void {
    if (!this.watched || this.transport || this.voices.size) return;
    this.watched = false;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    this.watchedContext?.removeEventListener('statechange', this.onContextState);
    this.watchedContext = undefined;
  }

  private finish(): void {
    if (this.transport?.timer !== undefined) clearInterval(this.transport.timer);
    this.transport = undefined;
    this.unwatchIfIdle();
  }

  private pump = (): void => {
    const run = this.transport;
    if (!run || !this.running) return;
    const context = run.context;
    const horizon = context.currentTime + LOOKAHEAD;
    while (run.next < run.cues.length) {
      const cue = run.cues[run.next];
      const at = run.origin + (cue.beat - run.first) * run.beatSeconds;
      if (at > horizon) break;
      run.next++;
      // If a stalled main thread missed a cue, do not bunch late notes at the current time.
      if (at >= context.currentTime) this.play(context, cue.role, cue.pitch, at, cue.length * run.beatSeconds, cue.level, cue.click);
    }
  };

  private dispose(voice: Voice): void {
    if (!this.voices.delete(voice)) return;
    for (const node of voice.nodes) node.disconnect();
    this.unwatchIfIdle();
  }

  private noiseBuffer(context: AudioContext): AudioBuffer {
    if (!this.noise) {
      this.noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.4), context.sampleRate);
      const samples = this.noise.getChannelData(0);
      let state = 0x4b1d239a;
      for (let i = 0; i < samples.length; i++) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        samples[i] = state / 0x80000000 - 1;
      }
    }
    return this.noise;
  }

  private play(context: AudioContext, role: Role, pitch: number, at: number, seconds: number, level: number, click = false): void {
    const envelope = context.createGain();
    const voice: Voice = { sources: [], nodes: [envelope] };
    envelope.connect(context.destination);
    let input: AudioNode = envelope;
    const filter = (type: BiquadFilterType, frequency: number) => {
      const node = context.createBiquadFilter();
      node.type = type;
      node.frequency.value = frequency;
      node.connect(input);
      voice.nodes.push(node);
      input = node;
    };
    const oscillate = (type: OscillatorType, hz: number, cents = 0) => {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = hz;
      osc.detune.value = cents;
      osc.connect(input);
      voice.sources.push(osc);
      voice.nodes.push(osc);
      return osc;
    };
    const hz = 440 * 2 ** ((pitch - 69) / 12);
    let attack = 0.008;
    let release = 0.06;
    let sustain = 0.65;
    let peak = 0.085 * level;
    let duration = seconds;
    if (click) {
      oscillate('sine', hz);
      attack = 0.002;
      release = 0.035;
      sustain = 0.3;
      peak = level;
    } else if (role === 'drums') {
      attack = 0.003;
      sustain = 0.24;
      if (pitch === 35 || pitch === 36) {
        duration = Math.min(seconds, 0.23);
        const drum = oscillate('sine', 140);
        drum.frequency.setValueAtTime(140, at);
        drum.frequency.exponentialRampToValueAtTime(43, at + Math.min(0.12, duration));
        peak = 0.23 * level;
      } else {
        const hat = [42, 44, 46, 49, 51, 52, 55, 57, 59].includes(pitch);
        duration = Math.min(seconds, pitch === 42 || pitch === 44 ? 0.08 : hat ? 0.3 : 0.19);
        filter(hat ? 'highpass' : 'bandpass', hat ? 6900 : 1700);
        const source = context.createBufferSource();
        source.buffer = this.noiseBuffer(context);
        source.connect(input);
        voice.sources.push(source);
        voice.nodes.push(source);
        peak = (hat ? 0.13 : 0.26) * level;
      }
      release = duration * 0.6;
    } else if (role === 'bass') {
      filter('lowpass', 600);
      oscillate('triangle', hz);
      peak = 0.16 * level;
      release = 0.07;
    } else if (role === 'guitar') {
      filter('lowpass', Math.min(4500, 1000 + hz * 3));
      oscillate('sawtooth', hz);
      attack = 0.004;
      sustain = 0.19;
      release = 0.09;
    } else if (role === 'pad') {
      filter('lowpass', 1400);
      oscillate('triangle', hz, -5);
      oscillate('triangle', hz, 5);
      attack = 0.16;
      release = 0.23;
      sustain = 0.85;
      peak = 0.033 * level;
    } else {
      oscillate('triangle', hz);
      oscillate('sine', hz * 2);
      attack = 0.005;
      sustain = 0.34;
      release = 0.12;
      peak = 0.054 * level;
    }
    const end = at + duration;
    const rise = at + Math.min(attack, duration * 0.25);
    const fade = end - Math.min(release, duration * 0.55);
    const gain = envelope.gain;
    gain.setValueAtTime(floorGain, at);
    gain.exponentialRampToValueAtTime(Math.max(floorGain, peak), rise);
    if (fade > rise) {
      const steady = Math.max(floorGain, peak * sustain);
      gain.exponentialRampToValueAtTime(steady, Math.min(fade, rise + 0.18));
      gain.setValueAtTime(steady, fade);
    }
    gain.exponentialRampToValueAtTime(floorGain, end);
    this.voices.add(voice);
    voice.sources[0].onended = () => this.dispose(voice);
    for (const source of voice.sources) {
      source.start(at);
      source.stop(end);
    }
  }
}
