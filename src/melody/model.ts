export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Clef = 'treble' | 'bass' | 'alto' | 'tenor';
export type KeySignature = 'C' | 'G' | 'F' | 'D' | 'Bb';
export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
export type Pitch = { letter: Letter; octave: number; accidental: null | -1 | 0 | 1 };
export type Dynamic = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
export type NoteEvent = {
  letter: Letter;
  octave: number;
  accidental: null | -1 | 0 | 1;
  duration: Duration;
  dotted: boolean;
  rest: boolean;
  chord?: Pitch[];
  tuplet?: 3;
  dynamic?: Dynamic;
};
export type Score = {
  clef: Clef;
  key: KeySignature;
  meter: { beats: number; unit: 4 | 8 };
  events: NoteEvent[];
  parts?: { clef: Clef; events: NoteEvent[] }[];
  dynamic?: Dynamic;
  repeat?: boolean;
};
export type ResolvedPitch = Pitch & { midi: number; frequency: number; staffStep: number };
export type PerformanceTone = ResolvedPitch & {
  part: number; eventIndex: number; pitchIndex: number; durationBeats: number; dynamic: Dynamic;
};
export type PerformanceMoment = {
  index: number; startBeat: number; durationBeats: number; pitches: PerformanceTone[];
  events: { part: number; index: number }[]; rest: boolean; pass: 0 | 1;
};
export type ResolvedNote = {
  event: NoteEvent;
  index: number;
  midi: number | null;
  frequency: number | null;
  startBeat: number;
  durationBeats: number;
  measure: number;
  staffStep: number;
  pitches: ResolvedPitch[];
  dynamic: Dynamic;
};
export type ScoreIssue = { code: 'empty' | 'overflow' | 'incomplete' | 'too-long' | 'out-of-range' | 'tuplet' | 'voices'; index: number; part?: number };

const letters: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const semitones: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const durations: Record<Duration, number> = { whole: 4, half: 2, quarter: 1, eighth: .5, sixteenth: .25 };
const anchors: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4, alto: 3 * 7 + 3, tenor: 3 * 7 + 1 };
const keys: Record<KeySignature, Partial<Record<Letter, number>>> = {
  C: {}, G: { F: 1 }, F: { B: -1 }, D: { F: 1, C: 1 }, Bb: { B: -1, E: -1 },
};
const owns = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key);

/** Concert A4 = 440 Hz, twelve-tone equal temperament. Invalid MIDI throws RangeError. */
export function midiToFrequency(midi: number): number {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new RangeError('MIDI must be an integer from 0 to 127');
  return 440 * 2 ** ((midi - 69) / 12);
}

const dynamics: Dynamic[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
// All supported written/dotted/triplet values are integral at 24 ticks per quarter.
const ticksPerBeat = 24;
const ticks = (beats: number) => Math.round(beats * ticksPerBeat);

function validatePitch(pitch: Pitch): void {
  if (!pitch || !letters.includes(pitch.letter) || !Number.isSafeInteger(pitch.octave)
    || ![null, -1, 0, 1].includes(pitch.accidental)) throw new RangeError('Malformed pitch');
}

function validateEvent(event: NoteEvent): void {
  validatePitch(event);
  if (!owns(durations, event.duration) || typeof event.dotted !== 'boolean' || typeof event.rest !== 'boolean'
    || (event.tuplet !== undefined && event.tuplet !== 3)
    || (event.dynamic !== undefined && !dynamics.includes(event.dynamic))
    || (event.chord !== undefined && !Array.isArray(event.chord))) throw new RangeError('Malformed note event');
  event.chord?.forEach(validatePitch);
}

export function durationBeats(event: NoteEvent): number {
  validateEvent(event);
  return durations[event.duration] * (event.dotted ? 1.5 : 1) * (event.tuplet === 3 ? 2 / 3 : 1);
}

/** Meter numerator must be a positive safe integer; unsupported/malformed meters throw RangeError. */
export function measureBeats(meter: Score['meter']): number {
  if (!meter || !Number.isSafeInteger(meter.beats) || meter.beats <= 0 || ![4, 8].includes(meter.unit)) {
    throw new RangeError('Meter requires positive integer beats and denominator 4 or 8');
  }
  return meter.beats * 4 / meter.unit;
}

export function staffStep(letter: Letter, octave: number, clef: Clef): number {
  if (!letters.includes(letter) || !Number.isSafeInteger(octave) || !owns(anchors, clef)) throw new RangeError('Invalid staff pitch or clef');
  const step = octave * 7 + letters.indexOf(letter) - anchors[clef];
  if (!Number.isSafeInteger(step)) throw new RangeError('Staff pitch exceeds integer precision');
  return step;
}

export function pitchAtStaffStep(step: number, clef: Clef): { letter: Letter; octave: number } {
  if (!Number.isSafeInteger(step) || !owns(anchors, clef)) throw new RangeError('Invalid staff step or clef');
  const pitch = step + anchors[clef];
  if (!Number.isSafeInteger(pitch)) throw new RangeError('Staff step exceeds integer precision');
  return { letter: letters[((pitch % 7) + 7) % 7], octave: Math.floor(pitch / 7) };
}

/** Malformed structures throw RangeError; incomplete musical drafts remain resolvable. */
function validateScore(score: Score): number {
  if (!score || !owns(anchors, score.clef) || !owns(keys, score.key) || !Array.isArray(score.events)
    || (score.parts !== undefined && !Array.isArray(score.parts))
    || (score.dynamic !== undefined && !dynamics.includes(score.dynamic))
    || (score.repeat !== undefined && typeof score.repeat !== 'boolean')) throw new RangeError('Malformed score');
  const bar = measureBeats(score.meter);
  for (const part of [score, ...(score.parts ?? [])]) {
    if (!part || !owns(anchors, part.clef) || !Array.isArray(part.events)) throw new RangeError('Malformed part');
    part.events.forEach(validateEvent);
  }
  return bar;
}

export function partCount(score: Score): number {
  validateScore(score);
  return 1 + (score.parts?.length ?? 0);
}

function walkPart(score: Score, part: number): ResolvedNote[] {
  const barTicks = ticks(validateScore(score));
  if (!Number.isInteger(part) || part < 0 || part >= 1 + (score.parts?.length ?? 0)) throw new RangeError('Invalid part index');
  const staff = part === 0 ? score : score.parts![part - 1];
  let startTick = 0;
  let previousMeasure = -1;
  let dynamic = score.dynamic ?? 'mf';
  const accidentals = new Map<string, number>();
  return staff.events.map((event, index) => {
    const measure = Math.floor(startTick / barTicks);
    if (measure !== previousMeasure) accidentals.clear();
    previousMeasure = measure;
    dynamic = event.dynamic ?? dynamic;
    const written = event.rest ? [] : [event, ...(event.chord ?? [])];
    // A chord is simultaneous: explicit markings apply consistently to all its tones.
    for (const pitch of written) {
      if (pitch.accidental !== null) accidentals.set(`${pitch.letter}${pitch.octave}`, pitch.accidental);
    }
    const pitches = written.map(pitch => {
      const accidental = accidentals.get(`${pitch.letter}${pitch.octave}`) ?? keys[score.key][pitch.letter] ?? 0;
      const midi = (pitch.octave + 1) * 12 + semitones[pitch.letter] + accidental;
      return { letter: pitch.letter, octave: pitch.octave, accidental: pitch.accidental, midi,
        frequency: midi >= 0 && midi <= 127 ? midiToFrequency(midi) : NaN,
        staffStep: staffStep(pitch.letter, pitch.octave, staff.clef) };
    });
    const durationTicks = ticks(durationBeats(event));
    const resolved: ResolvedNote = {
      event: { ...event, ...(event.chord ? { chord: event.chord.map(pitch => ({ ...pitch })) } : {}) }, index,
      midi: pitches[0]?.midi ?? null, frequency: pitches[0] && Number.isFinite(pitches[0].frequency) ? pitches[0].frequency : null,
      startBeat: startTick / ticksPerBeat, durationBeats: durationTicks / ticksPerBeat, measure,
      staffStep: staffStep(event.letter, event.octave, staff.clef), pitches, dynamic,
    };
    startTick += durationTicks;
    return resolved;
  });
}

function outOfRange(note: ResolvedNote): boolean {
  return [note.event, ...(note.event.chord ?? [])].some(pitch => pitch.octave < 0 || pitch.octave > 8)
    || note.pitches.some(pitch => pitch.midi < 0 || pitch.midi > 127);
}

/** Each staff owns bar-scoped accidental state and independently persistent dynamics. */
export function resolvePart(score: Score, part = 0): ResolvedNote[] {
  const notes = walkPart(score, part);
  if (notes.some(outOfRange)) throw new RangeError('Score pitch is outside supported octave/MIDI range');
  return notes;
}

export function resolveScore(score: Score): ResolvedNote[] { return resolvePart(score); }

const endTicks = (notes: ResolvedNote[]) => notes.length
  ? ticks(notes[notes.length - 1].startBeat) + ticks(notes[notes.length - 1].durationBeats) : 0;

export function totalBeats(score: Score): number {
  return Math.max(...Array.from({ length: partCount(score) }, (_, part) => endTicks(resolvePart(score, part))))
    / ticksPerBeat * (score.repeat ? 2 : 1);
}

export function scoreIssues(score: Score): ScoreIssue[] {
  const count = partCount(score);
  const barTicks = ticks(measureBeats(score.meter));
  const issues: ScoreIssue[] = [];
  const lengths: number[] = [];
  if (count > 4) issues.push({ code: 'voices', index: 0 });
  for (let part = 0; part < count; part++) {
    const notes = walkPart(score, part);
    const add = (code: ScoreIssue['code'], index: number) => issues.push({ code, index, ...(part ? { part } : {}) });
    lengths.push(endTicks(notes));
    if (!notes.length) { add('empty', 0); continue; }
    if (notes.length > 64) add('too-long', 64);
    for (const note of notes) {
      if (outOfRange(note)) add('out-of-range', note.index);
      if ((note.event.chord?.length ?? 0) > 3) add('voices', note.index);
      if (ticks(note.startBeat) % barTicks + ticks(note.durationBeats) > barTicks) add('overflow', note.index);
    }
    for (let i = 0; i < notes.length;) {
      const first = notes[i];
      if (!first.event.tuplet) { i++; continue; }
      const group = notes.slice(i, i + 3);
      const valid = group.length === 3 && group.every(note => note.event.tuplet === 3
        && note.event.duration === first.event.duration && note.event.dotted === first.event.dotted)
        && ticks(first.startBeat) % barTicks + group.reduce((sum, note) => sum + ticks(note.durationBeats), 0) <= barTicks;
      if (!valid) add('tuplet', i);
      i += valid ? 3 : 1;
    }
    if (endTicks(notes) % barTicks !== 0) add('incomplete', notes.length - 1);
  }
  if (lengths.some(length => length !== lengths[0])) issues.push({ code: 'voices', index: 0 });
  return issues;
}

/** Groups new attacks (not sustained tones) and rest onsets on the shared score clock. */
export function resolvePerformance(score: Score): PerformanceMoment[] {
  const parts = Array.from({ length: partCount(score) }, (_, part) => resolvePart(score, part));
  const passTicks = Math.max(...parts.map(endTicks));
  const moments = new Map<number, PerformanceMoment>();
  for (let pass = 0; pass < (score.repeat ? 2 : 1); pass++) {
    parts.forEach((notes, part) => notes.forEach(note => {
      const onset = ticks(note.startBeat) + pass * passTicks;
      let moment = moments.get(onset);
      if (!moment) {
        moment = { index: 0, startBeat: onset / ticksPerBeat, durationBeats: 0, pitches: [], events: [], rest: true, pass: pass as 0 | 1 };
        moments.set(onset, moment);
      }
      moment.events.push({ part, index: note.index });
      moment.pitches.push(...note.pitches.map((pitch, pitchIndex) => ({ ...pitch, part, eventIndex: note.index,
        pitchIndex, durationBeats: note.durationBeats, dynamic: note.dynamic })));
      moment.rest = moment.pitches.length === 0;
    }));
  }
  const result = [...moments.values()].sort((a, b) => a.startBeat - b.startBeat);
  const totalTicks = passTicks * (score.repeat ? 2 : 1);
  result.forEach((moment, index) => {
    moment.index = index;
    moment.durationBeats = ((result[index + 1] ? ticks(result[index + 1].startBeat) : totalTicks)
      - ticks(moment.startBeat)) / ticksPerBeat;
  });
  return result;
}

/** Compares full sounding performance, including dynamics and repeat semantics, not clefs/keys. */
export function sameMelody(actual: Score, target: Score): boolean {
  if (Boolean(actual.repeat) !== Boolean(target.repeat)) return false;
  const a = resolvePerformance(actual);
  const b = resolvePerformance(target);
  const tones = (moment: PerformanceMoment) => moment.pitches.map(pitch => `${pitch.midi}:${ticks(pitch.durationBeats)}:${pitch.dynamic}`).sort();
  return a.length === b.length && a.every((moment, i) => ticks(moment.startBeat) === ticks(b[i].startBeat)
    && ticks(moment.durationBeats) === ticks(b[i].durationBeats) && moment.rest === b[i].rest
    && JSON.stringify(tones(moment)) === JSON.stringify(tones(b[i])));
}
