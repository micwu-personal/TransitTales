export interface AmbientNote { readonly time: number; readonly midi: number; readonly duration: number; readonly voice: 'pad' | 'bell' | 'bass'; }
const beat = 60 / 56;
export const AMBIENT_DURATION = 32 * 4 * beat;
const harmonies = [[50,57,60,64,69], [48,55,59,62,67], [46,53,57,60,65], [53,60,64,67,72], [50,57,62,65,69], [55,62,65,69,74], [48,55,60,64,71], [50,57,61,64,69]];
const melody = [76, 81, 79, 74, 77, 84, 79, 76];
export const AMBIENT_SCORE: readonly AmbientNote[] = Object.freeze(harmonies.flatMap((chord, phrase) => {
  const start = phrase * 16 * beat;
  const notes: AmbientNote[] = chord.map((midi, i) => ({time: start + i * .21, midi, duration: 14 * beat, voice: 'pad'}));
  notes.push({time: start, midi: chord[0] - 12, duration: 11 * beat, voice: 'bass'});
  for (let i = 0; i < 3; i++) notes.push({time: start + (3 + i * 4 + (phrase % 2)) * beat, midi: melody[(phrase + i) % melody.length], duration: 3 * beat, voice: 'bell'});
  return notes;
}).sort((a,b) => a.time - b.time).map(note => Object.freeze(note)));

export function scheduleAmbientTone(context: BaseAudioContext, output: AudioNode, note: AmbientNote, start: number): OscillatorNode {
  const oscillator = context.createOscillator(), envelope = context.createGain();
  oscillator.type = note.voice === 'bass' ? 'triangle' : 'sine';
  oscillator.frequency.value = 440 * 2 ** ((note.midi - 69) / 12);
  const level = note.voice === 'pad' ? .035 : note.voice === 'bass' ? .025 : .045;
  const attack = note.voice === 'bell' ? .04 : 1.6;
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(level, start + Math.min(attack, note.duration / 3));
  envelope.gain.exponentialRampToValueAtTime(.0001, start + note.duration);
  envelope.gain.setValueAtTime(0, start + note.duration + .03);
  oscillator.connect(envelope); envelope.connect(output);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  oscillator.start(start); oscillator.stop(start + note.duration + .04);
  return oscillator;
}
export function createAmbientMusic(onUnavailable: () => void) {
  let context: AudioContext | null = null, master: GainNode | null = null;
  let timer: ReturnType<typeof setInterval> | undefined, active = false, requested = false, disposed = false, generation = 0, volume = .25, origin = 0, index = 0, cycle = 0;
  const sources = new Set<OscillatorNode>();
  function schedule() {
    if (!active || !context || !master) return;
    let scheduled = 0;
    while (origin + cycle * AMBIENT_DURATION + AMBIENT_SCORE[index].time < context.currentTime + .7 && scheduled++ < AMBIENT_SCORE.length) {
      const note = AMBIENT_SCORE[index], start = origin + cycle * AMBIENT_DURATION + note.time;
      if (start >= context.currentTime) {
        const source = scheduleAmbientTone(context, master, note, start); sources.add(source);
        source.addEventListener('ended', () => sources.delete(source), {once: true});
      }
      index++; if (index === AMBIENT_SCORE.length) { index = 0; cycle++; }
    }
  }
  function stop() {
    generation++; active = false; requested = false; clearInterval(timer); timer = undefined;
    if (context && master) { master.gain.cancelScheduledValues(context.currentTime); master.gain.setValueAtTime(0, context.currentTime); }
    for (const source of sources) { try { source.stop(); } catch { /* Already finished. */ } }
    sources.clear();
    if (context?.state === 'running') void context.suspend().catch(() => {});
  }
  return {
    get playing() { return active; },
    async start(): Promise<boolean> {
      if (disposed || document.hidden) return false;
      if (active) return true;
      const ticket = ++generation; requested = true;
      try {
        context ??= new AudioContext();
        if (!master) { master = context.createGain(); master.gain.value = 0; master.connect(context.destination); }
        await context.resume();
        if (ticket !== generation || disposed || document.hidden) {
          if ((!requested || document.hidden) && context?.state === 'running') void context.suspend().catch(() => {});
          return false;
        }
        if (context.state !== 'running') throw new Error('Audio is suspended');
        origin = context.currentTime + .1; index = 0; cycle = 0; active = true;
        master.gain.cancelScheduledValues(context.currentTime); master.gain.setValueAtTime(0, context.currentTime); master.gain.linearRampToValueAtTime(volume, context.currentTime + .7);
        schedule(); timer = setInterval(schedule, 200); return true;
      } catch { if (ticket === generation) { stop(); onUnavailable(); } return false; }
    },
    stop,
    setVolume(value: number) {
      volume = Number.isFinite(value) ? Math.min(.5, Math.max(0, value)) : .25;
      if (context && master && active) { master.gain.cancelScheduledValues(context.currentTime); master.gain.setTargetAtTime(volume, context.currentTime, .08); }
    },
    dispose() { disposed = true; stop(); if (context) void context.close().catch(() => {}); context = null; master = null; },
  };
}
