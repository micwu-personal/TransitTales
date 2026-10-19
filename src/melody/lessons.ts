import { sameMelody, scoreIssues, type Score, type NoteEvent } from './model';

export const LESSON_IDS = ['first', 'length', 'quiet', 'waltz', 'six', 'bass', 'alto', 'tenor', 'sharp', 'natural', 'flat', 'dots'] as const;
export type LessonId = typeof LESSON_IDS[number];
export interface Lesson { id: LessonId; target: Score; initial: Score; }
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
export const LESSONS: readonly Lesson[] = LESSON_IDS.map((id, index) => {
  const target = targets[index];
  const initial = structuredClone(target);
  // A single, visible difference keeps the first experiment approachable.
  initial.events[0].letter = target.events[0].letter === 'D' ? 'E' : 'D';
  return { id, target, initial };
});
export function cloneScore(value: Score): Score { return structuredClone(value); }
export function completesLesson(value: Score, lesson: Lesson): boolean {
  return scoreIssues(value).length === 0 && value.clef === lesson.target.clef && value.key === lesson.target.key && value.meter.beats === lesson.target.meter.beats && value.meter.unit === lesson.target.meter.unit && sameMelody(value, lesson.target);
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
export function readProgress(storage?: Pick<Storage, 'getItem'>): SavedProgress {
  const fallback = { completed: [] as LessonId[], ear: { attempts: 0, correct: 0 }, studio: cloneScore(STUDIO_SCORE) };
  try {
    const raw = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    const completed = Array.isArray(raw.completed) ? LESSON_IDS.filter(id => raw.completed.includes(id)) : [];
    const attempts = Number.isSafeInteger(raw.ear?.attempts) && raw.ear.attempts >= 0 ? raw.ear.attempts : 0;
    const correct = Number.isSafeInteger(raw.ear?.correct) && raw.ear.correct >= 0 && raw.ear.correct <= attempts ? raw.ear.correct : 0;
    const s = raw.studio;
    const valid = s && ['treble', 'bass', 'alto', 'tenor'].includes(s.clef) && ['C', 'G', 'F', 'D', 'Bb'].includes(s.key) && ['2/4', '3/4', '4/4', '6/8'].includes(`${s.meter?.beats}/${s.meter?.unit}`) && Array.isArray(s.events) && s.events.length <= 16 && s.events.every((e: NoteEvent) => e && ['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(e.letter) && Number.isInteger(e.octave) && e.octave >= 0 && e.octave <= 8 && [null, -1, 0, 1].includes(e.accidental) && ['whole', 'half', 'quarter', 'eighth', 'sixteenth'].includes(e.duration) && typeof e.dotted === 'boolean' && typeof e.rest === 'boolean');
    const studio = valid && !scoreIssues(s).some(issue => issue.code === 'out-of-range' || issue.code === 'too-long') ? cloneScore(s) : fallback.studio;
    return { completed, ear: { attempts, correct }, studio };
  } catch { return fallback; }
}
export function writeProgress(storage: Pick<Storage, 'setItem'> | undefined, progress: SavedProgress): boolean {
  try { if (!storage) return false; storage.setItem(SAVE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
