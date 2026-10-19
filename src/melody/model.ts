export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Clef = 'treble' | 'bass' | 'alto' | 'tenor';
export type KeySignature = 'C' | 'G' | 'F' | 'D' | 'Bb';
export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
export type NoteEvent = {
  letter: Letter;
  octave: number;
  accidental: null | -1 | 0 | 1;
  duration: Duration;
  dotted: boolean;
  rest: boolean;
};
export type Score = {
  clef: Clef;
  key: KeySignature;
  meter: { beats: number; unit: 4 | 8 };
  events: NoteEvent[];
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
};
export type ScoreIssue = { code: 'empty' | 'overflow' | 'incomplete' | 'too-long' | 'out-of-range'; index: number };

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

function validateEvent(event: NoteEvent): void {
  if (!event || !letters.includes(event.letter) || !Number.isSafeInteger(event.octave)
    || ![null, -1, 0, 1].includes(event.accidental) || !owns(durations, event.duration)
    || typeof event.dotted !== 'boolean' || typeof event.rest !== 'boolean') {
    throw new RangeError('Malformed note event');
  }
}

export function durationBeats(event: NoteEvent): number {
  validateEvent(event);
  return durations[event.duration] * (event.dotted ? 1.5 : 1);
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

/** Malformed structures throw intentional RangeError; musical draft issues are returned by scoreIssues. */
function validateScore(score: Score): number {
  if (!score || !owns(anchors, score.clef) || !owns(keys, score.key) || !Array.isArray(score.events)) throw new RangeError('Malformed score');
  const bar = measureBeats(score.meter);
  for (const event of score.events) validateEvent(event);
  return bar;
}

function walkScore(score: Score): ResolvedNote[] {
  const bar = validateScore(score);
  let startBeat = 0;
  let previousMeasure = -1;
  const accidentals = new Map<string, number>();
  return score.events.map((event, index) => {
    const measure = Math.floor(startBeat / bar);
    if (measure !== previousMeasure) accidentals.clear();
    previousMeasure = measure;
    const writtenPitch = `${event.letter}${event.octave}`;
    let midi: number | null = null;
    if (!event.rest) {
      if (event.accidental !== null) accidentals.set(writtenPitch, event.accidental);
      const accidental = accidentals.get(writtenPitch) ?? keys[score.key][event.letter] ?? 0;
      midi = (event.octave + 1) * 12 + semitones[event.letter] + accidental;
    }
    const beats = durationBeats(event);
    const resolved = {
      event: { ...event }, index, midi,
      frequency: midi !== null && Number.isInteger(midi) && midi >= 0 && midi <= 127 ? midiToFrequency(midi) : null,
      startBeat, durationBeats: beats, measure,
      staffStep: staffStep(event.letter, event.octave, score.clef),
    };
    startBeat += beats;
    return resolved;
  });
}

function outOfRange(note: ResolvedNote): boolean {
  return note.event.octave < 0 || note.event.octave > 8 || (note.midi !== null && (note.midi < 0 || note.midi > 127));
}

/** Resolves incomplete/overflow drafts, but rejects pitches outside written octaves 0..8 or MIDI 0..127. */
export function resolveScore(score: Score): ResolvedNote[] {
  const notes = walkScore(score);
  if (notes.some(outOfRange)) throw new RangeError('Score pitch is outside supported octave/MIDI range');
  return notes;
}

export function scoreIssues(score: Score): ScoreIssue[] {
  const notes = walkScore(score);
  const issues: ScoreIssue[] = [];
  if (!notes.length) return [{ code: 'empty', index: 0 }];
  if (notes.length > 16) issues.push({ code: 'too-long', index: 16 });
  const bar = measureBeats(score.meter);
  for (const note of notes) {
    if (outOfRange(note)) issues.push({ code: 'out-of-range', index: note.index });
    if (note.startBeat % bar + note.durationBeats > bar) issues.push({ code: 'overflow', index: note.index });
  }
  const last = notes[notes.length - 1];
  if ((last.startBeat + last.durationBeats) % bar !== 0) issues.push({ code: 'incomplete', index: last.index });
  return issues;
}

/** Compares sounding pitches/rests and timing only, not notation, clef, key, or meter. */
export function sameMelody(actual: Score, target: Score): boolean {
  const a = resolveScore(actual);
  const b = resolveScore(target);
  return a.length === b.length && a.every((note, i) => note.midi === b[i].midi
    && note.startBeat === b[i].startBeat && note.durationBeats === b[i].durationBeats);
}
