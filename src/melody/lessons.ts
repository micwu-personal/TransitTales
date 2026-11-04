import { sameMelody, scoreIssues, type Score, type NoteEvent, type Pitch, type Dynamic } from './model';

export const LESSON_IDS = [
  'first', 'length', 'quiet', 'waltz', 'six', 'bass', 'alto', 'tenor', 'sharp', 'natural', 'flat', 'dots',
  'echo', 'heartbeat', 'syncopation', 'triplet', 'triplet-rest', 'tunnel', 'repeat', 'dynamics',
  'thirds', 'fifths', 'triads', 'minor', 'inversion', 'chord-rhythm', 'chord-accidentals', 'arpeggio',
  'duet', 'ostinato', 'canon', 'conversation', 'alto-duet', 'tenor-duet', 'ensemble', 'finale',
] as const;
export type LessonId = typeof LESSON_IDS[number];
export type LessonGroup = 'foundations' | 'rhythm' | 'harmony' | 'ensemble';
export interface Lesson { id: LessonId; group: LessonGroup; target: Score; initial: Score; }
export function note(letter: NoteEvent['letter'], octave: number, duration: NoteEvent['duration'] = 'quarter', accidental: NoteEvent['accidental'] = null, dotted = false, rest = false): NoteEvent {
  return { letter, octave, duration, accidental, dotted, rest };
}
const score = (events: NoteEvent[], clef: Score['clef'] = 'treble', key: Score['key'] = 'C', beats = 4, unit: 4 | 8 = 4): Score => ({ events, clef, key, meter: { beats, unit } });
const targets: Score[] = [
  score([note('C', 4), note('E', 4), note('G', 4)], 'treble', 'C', 3),
  score([note('C', 4, 'half'), note('E', 4), note('G', 4)]),
  score([note('C', 4), note('C', 4, 'quarter', null, false, true), note('E', 4), note('G', 4)]),
  score([note('C', 4), note('E', 4), note('G', 4), note('G', 4), note('E', 4), note('C', 4)], 'treble', 'C', 3),
  score([note('C', 4, 'eighth'), note('D', 4, 'eighth'), note('E', 4, 'eighth'), note('G', 4, 'eighth'), note('E', 4, 'eighth'), note('C', 4, 'eighth')], 'treble', 'C', 6, 8),
  score([note('C', 3), note('E', 3), note('G', 3, 'half')], 'bass'),
  score([note('C', 4), note('D', 4), note('E', 4, 'half')], 'alto'),
  score([note('C', 4), note('B', 3), note('A', 3, 'half')], 'tenor'),
  score([note('F', 4, 'quarter', 1), note('F', 4), note('F', 4, 'quarter', 0), note('F', 4), note('F', 4, 'whole')]),
  score([note('F', 4), note('F', 4, 'quarter', 0), note('F', 4), note('F', 4, 'quarter', 1), note('F', 4, 'whole')], 'treble', 'G'),
  score([note('B', 4), note('B', 4, 'quarter', 0), note('B', 4), note('B', 4, 'quarter', -1), note('B', 4, 'whole')], 'treble', 'F'),
  score([note('C', 4, 'quarter', null, true), note('D', 4, 'eighth'), note('E', 4, 'half')]),
];
const pitch = (letter: Pitch['letter'], octave: number, accidental: Pitch['accidental'] = null): Pitch => ({ letter, octave, accidental });
const chord = (tones: Pitch[], duration: NoteEvent['duration'] = 'quarter'): NoteEvent => ({ ...note(tones[0].letter, tones[0].octave, duration, tones[0].accidental), chord: tones.slice(1) });
const triplet = (...events: NoteEvent[]): NoteEvent[] => events.map(event => ({ ...event, tuplet: 3 }));
const rest = (duration: NoteEvent['duration'] = 'quarter'): NoteEvent => note('C', 4, duration, null, false, true);
const marked = (event: NoteEvent, dynamic: Dynamic): NoteEvent => ({ ...event, dynamic });
const duet = (melody: NoteEvent[], bass: NoteEvent[], clef: Score['clef'] = 'bass'): Score => ({ ...score(melody), parts: [{ clef, events: bass }] });
const cMajor = () => [pitch('C', 4), pitch('E', 4), pitch('G', 4)];
const fMajor = () => [pitch('F', 4), pitch('A', 4), pitch('C', 5)];
const gMajor = () => [pitch('G', 4), pitch('B', 4), pitch('D', 5)];

targets.push(
  score([note('G', 4, 'eighth'), note('G', 4, 'eighth'), note('E', 4), note('G', 4, 'eighth'), note('G', 4, 'eighth'), note('C', 5)]),
  score([note('A', 4, 'eighth'), note('A', 4, 'eighth'), rest(), note('F', 4, 'eighth'), note('F', 4, 'eighth'), note('E', 4)]),
  score([rest('eighth'), note('E', 4), note('G', 4, 'eighth'), note('A', 4, 'quarter', null, true), note('G', 4, 'eighth')]),
  score([...triplet(note('E', 4, 'eighth'), note('G', 4, 'eighth'), note('B', 4, 'eighth')), note('A', 4), note('G', 4, 'half')]),
  score([...triplet(note('C', 5, 'eighth'), rest('eighth'), note('G', 4, 'eighth')), ...triplet(note('E', 4, 'eighth'), note('G', 4, 'eighth'), note('C', 5, 'eighth')), note('B', 4, 'half')]),
  score([note('C', 5, 'sixteenth'), note('B', 4, 'sixteenth'), note('A', 4, 'sixteenth'), note('G', 4, 'sixteenth'), rest(), note('E', 4, 'quarter', null, true), note('G', 4, 'eighth')]),
  { ...score([note('E', 4), note('G', 4, 'eighth'), note('A', 4, 'eighth'), note('C', 5, 'half')]), repeat: true },
  score([marked(note('C', 5), 'p'), note('B', 4), marked(note('G', 4), 'f'), note('E', 4), marked(note('C', 4, 'whole'), 'pp')]),
  score([chord([pitch('C', 4), pitch('E', 4)]), chord([pitch('D', 4), pitch('F', 4)]), chord([pitch('E', 4), pitch('G', 4)], 'half')]),
  score([chord([pitch('G', 3), pitch('D', 4)], 'half'), chord([pitch('C', 4), pitch('G', 4)], 'half')]),
  score([chord(cMajor()), chord(fMajor()), chord(gMajor()), chord(cMajor())]),
  score([chord([pitch('A', 3), pitch('C', 4), pitch('E', 4)], 'half'), chord([pitch('D', 4), pitch('F', 4), pitch('A', 4)], 'half')]),
  score([chord([pitch('E', 4), pitch('G', 4), pitch('C', 5)], 'half'), chord([pitch('G', 4), pitch('C', 5), pitch('E', 5)], 'half')]),
  score([chord(cMajor(), 'eighth'), chord(cMajor(), 'eighth'), rest(), chord(fMajor()), chord(gMajor())]),
  score([chord([pitch('C', 4), pitch('E', 4, -1), pitch('G', 4)]), chord([pitch('C', 4), pitch('E', 4), pitch('G', 4)]), chord([pitch('C', 4), pitch('E', 4, 0), pitch('G', 4)]), chord(cMajor()), chord(cMajor(), 'whole')]),
  score([note('C', 4, 'eighth'), note('E', 4, 'eighth'), note('G', 4, 'eighth'), note('C', 5, 'eighth'), chord(cMajor(), 'half')]),
  duet([note('E', 4), note('G', 4), note('C', 5, 'half')], [note('C', 3, 'half'), note('G', 2, 'half')]),
  duet([note('E', 4), note('D', 4), note('G', 4), note('C', 5), note('B', 4), note('G', 4), note('E', 4, 'half')], Array.from({ length: 8 }, (_, index) => note(index % 2 ? 'G' : 'C', index % 2 ? 2 : 3))),
  duet([note('C', 4), note('E', 4), note('G', 4), note('C', 5), rest('half'), note('E', 4, 'half')], [rest('half'), note('C', 3), note('E', 3), note('G', 3), note('C', 4), rest('half')]),
  duet([note('G', 4), note('E', 4), rest('half'), note('A', 4), note('G', 4), rest('half')], [rest('half'), note('C', 3), note('G', 2), rest('half'), note('F', 3), note('E', 3)]),
  duet([note('C', 5), note('A', 4), note('G', 4, 'half')], [note('E', 4, 'half'), note('C', 4, 'half')], 'alto'),
  duet([note('D', 5), note('C', 5), note('A', 4, 'half')], [note('D', 4), note('F', 4), note('G', 4, 'half')], 'tenor'),
  { ...duet([chord(cMajor(), 'half'), chord(gMajor(), 'half')], [note('C', 3), note('G', 2), note('G', 2), note('D', 3)]), parts: [
    { clef: 'alto', events: [note('E', 4, 'half'), note('D', 4, 'half')] },
    { clef: 'bass', events: [note('C', 3), note('G', 2), note('G', 2), note('D', 3)] },
  ] },
  { ...duet([
    ...triplet(marked(note('C', 5, 'eighth'), 'mp'), note('G', 4, 'eighth'), note('E', 4, 'eighth')),
    chord(fMajor()), chord(gMajor(), 'half'), marked(chord(cMajor(), 'whole'), 'p'),
  ], [note('C', 3, 'half'), note('G', 2, 'half'), note('C', 3, 'whole')]), repeat: true },
);

type Repair = (initial: Score) => void;
const repairs: Repair[] = [
  s => { s.events[0].letter = 'D'; },
  s => { s.events[0].duration = 'quarter'; },
  s => { s.events[1].rest = false; },
  s => { s.meter.beats = 2; },
  s => { s.events[4].letter = 'A'; },
  s => { s.events[2].letter = 'B'; },
  s => { s.clef = 'tenor'; },
  s => { s.events[1].octave = 4; },
  s => { s.events[0].accidental = -1; },
  s => { s.events[1].accidental = 1; },
  s => { s.events[0].accidental = 1; },
  s => { s.events[0].dotted = false; },
  s => { s.events[1].letter = 'A'; s.events[4].letter = 'F'; },
  s => { s.events[2].rest = false; },
  s => { s.events[1].duration = 'eighth'; s.events[2].duration = 'quarter'; },
  s => { s.events.slice(0, 3).forEach(event => { delete event.tuplet; }); },
  s => { s.events[1].rest = false; s.events[4].letter = 'A'; },
  s => { s.events[2].letter = 'F'; s.events[4].rest = false; },
  s => { s.repeat = false; },
  s => { s.events[2].dynamic = 'p'; s.events[4].dynamic = 'f'; },
  s => { s.events[1].chord![0].letter = 'G'; },
  s => { s.events[0].chord![0].letter = 'E'; },
  s => { s.events[1].chord![1].letter = 'D'; s.events[2].chord![0].letter = 'A'; },
  s => { s.events[0].chord![0].accidental = 1; },
  s => { s.events[1].chord![1].octave = 4; },
  s => { s.events[0].duration = 'quarter'; s.events[1].duration = 'quarter'; },
  s => { s.events[0].chord![0].accidental = 1; },
  s => { s.events[4].chord![0].letter = 'F'; },
  s => { s.parts![0].events[1].letter = 'F'; },
  s => { s.parts![0].events[5].letter = 'A'; s.events[4].letter = 'A'; },
  s => { s.parts![0].events[0].rest = false; },
  s => { s.events[2].rest = false; s.parts![0].events[4].rest = false; },
  s => { s.parts![0].clef = 'treble'; },
  s => { s.parts![0].events[1].letter = 'E'; },
  s => { s.events[1].chord![0].letter = 'A'; s.parts![1].events[2].letter = 'F'; },
  s => { s.events[0].dynamic = 'f'; s.events[3].chord![1].letter = 'A'; s.parts![0].events[2].letter = 'D'; s.repeat = false; },
];
export const LESSONS: readonly Lesson[] = LESSON_IDS.map((id, index) => {
  const target = targets[index];
  const initial = structuredClone(target);
  repairs[index](initial);
  const group: LessonGroup = index < 12 ? 'foundations' : index < 20 ? 'rhythm' : index < 28 ? 'harmony' : 'ensemble';
  return { id, group, target, initial };
});
export function cloneScore(value: Score): Score { return structuredClone(value); }
export function completesLesson(value: Score, lesson: Lesson): boolean {
  const target = lesson.target;
  return scoreIssues(value).length === 0 && value.clef === target.clef && value.key === target.key
    && value.meter.beats === target.meter.beats && value.meter.unit === target.meter.unit
    && (value.parts?.length ?? 0) === (target.parts?.length ?? 0)
    && (value.parts ?? []).every((part, index) => part.clef === target.parts![index].clef)
    && sameMelody(value, target);
}
export const STUDIO_SCORE = score([note('C', 4), note('E', 4), note('G', 4), note('C', 5)]);
export const EAR_PITCHES = Array.from({ length: 13 }, (_, index) => 60 + index);
export function drawEarPitch(previous: number | null, random = Math.random): number {
  const choices = EAR_PITCHES.filter(pitch => pitch !== previous);
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
  return choices[index];
}
export function scoreForMidi(midi: number): Score {
  if (!Number.isInteger(midi) || midi < 60 || midi > 72) throw new RangeError('Ear training uses C4–C5.');
  const names: NoteEvent['letter'][] = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const pitchClass = midi % 12;
  return score([note(names[pitchClass], Math.floor(midi / 12) - 1, 'quarter', [1, 3, 6, 8, 10].includes(pitchClass) ? 1 : null)]);
}
export interface SavedProgress { completed: LessonId[]; ear: { attempts: number; correct: number }; studio: Score; }
export const SAVE_KEY = 'transit-tales-melody-v1';
const CLEFS = ['treble', 'bass', 'alto', 'tenor'] as const;
const DYNAMICS = ['pp', 'p', 'mp', 'mf', 'f', 'ff'] as const;
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function readPitch(value: unknown): Pitch | null {
  if (!record(value) || !['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(value.letter as string)
    || !Number.isInteger(value.octave) || (value.octave as number) < 0 || (value.octave as number) > 8
    || ![null, -1, 0, 1].includes(value.accidental as number | null)) return null;
  return { letter: value.letter as Pitch['letter'], octave: value.octave as number, accidental: value.accidental as Pitch['accidental'] };
}
function readEvents(value: unknown): NoteEvent[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const events: NoteEvent[] = [];
  for (const raw of value) {
    const p = readPitch(raw);
    if (!p || !record(raw) || !['whole', 'half', 'quarter', 'eighth', 'sixteenth'].includes(raw.duration as string)
      || typeof raw.dotted !== 'boolean' || typeof raw.rest !== 'boolean'
      || (raw.tuplet !== undefined && raw.tuplet !== 3)
      || (raw.dynamic !== undefined && !DYNAMICS.includes(raw.dynamic as Dynamic))) return null;
    const event: NoteEvent = { ...p, duration: raw.duration as NoteEvent['duration'], dotted: raw.dotted, rest: raw.rest };
    if (raw.chord !== undefined) {
      if (!Array.isArray(raw.chord) || raw.chord.length > 3) return null;
      const tones = raw.chord.map(readPitch);
      if (tones.some(tone => tone === null)) return null;
      event.chord = tones as Pitch[];
    }
    if (raw.tuplet === 3) event.tuplet = 3;
    if (raw.dynamic !== undefined) event.dynamic = raw.dynamic as Dynamic;
    events.push(event);
  }
  return events;
}
function readStudio(value: unknown): Score | null {
  if (!record(value) || !CLEFS.includes(value.clef as Score['clef']) || !['C', 'G', 'F', 'D', 'Bb'].includes(value.key as string)
    || !record(value.meter) || !['2/4', '3/4', '4/4', '6/8'].includes(`${value.meter.beats}/${value.meter.unit}`)
    || (value.repeat !== undefined && typeof value.repeat !== 'boolean')
    || (value.dynamic !== undefined && !DYNAMICS.includes(value.dynamic as Dynamic))) return null;
  const events = readEvents(value.events);
  if (!events) return null;
  const studio: Score = { clef: value.clef as Score['clef'], key: value.key as Score['key'], meter: { beats: value.meter.beats as number, unit: value.meter.unit as 4 | 8 }, events };
  if (value.parts !== undefined) {
    if (!Array.isArray(value.parts) || value.parts.length > 3) return null;
    studio.parts = [];
    for (const part of value.parts) {
      if (!record(part) || !CLEFS.includes(part.clef as Score['clef'])) return null;
      const partEvents = readEvents(part.events);
      if (!partEvents) return null;
      studio.parts.push({ clef: part.clef as Score['clef'], events: partEvents });
    }
  }
  if (value.repeat !== undefined) studio.repeat = value.repeat as boolean;
  if (value.dynamic !== undefined) studio.dynamic = value.dynamic as Dynamic;
  return scoreIssues(studio).some(issue => issue.code === 'out-of-range' || issue.code === 'too-long') ? null : studio;
}
export function readProgress(storage?: Pick<Storage, 'getItem'>): SavedProgress {
  const fallback = { completed: [] as LessonId[], ear: { attempts: 0, correct: 0 }, studio: cloneScore(STUDIO_SCORE) };
  try {
    const stored = storage?.getItem(SAVE_KEY) ?? 'null';
    if (stored.length > 128_000) return fallback;
    const raw = JSON.parse(stored);
    if (!raw || typeof raw !== 'object') return fallback;
    const completed = Array.isArray(raw.completed) ? LESSON_IDS.filter(id => raw.completed.includes(id)) : [];
    const attempts = Number.isSafeInteger(raw.ear?.attempts) && raw.ear.attempts >= 0 ? raw.ear.attempts : 0;
    const correct = Number.isSafeInteger(raw.ear?.correct) && raw.ear.correct >= 0 && raw.ear.correct <= attempts ? raw.ear.correct : 0;
    const studio = readStudio(raw.studio) ?? fallback.studio;
    return { completed, ear: { attempts, correct }, studio };
  } catch { return fallback; }
}
export function writeProgress(storage: Pick<Storage, 'setItem'> | undefined, progress: SavedProgress): boolean {
  try { if (!storage) return false; storage.setItem(SAVE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
