import type { Note } from './score';

export const hitWindow = 0.18;
export const approachSeconds = 2.5;
export const keyboardCodes = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote', 'BracketRight'];
export const isBlack = (pitch: number) => [1, 3, 6, 8, 10].includes(pitch % 12);
export const lowerBound = <T>(sorted: T[], value: number, at: (item: T) => number) => {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (at(sorted[mid]) < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

export function matchingNote(notes: Note[], played: Set<number>, pitch: number, beat: number, secondsPerBeat: number) {
  const window = hitWindow / secondsPerBeat;
  let best = -1, distance = Infinity;
  for (let i = lowerBound(notes, beat - window, n => n.beat); i < notes.length && notes[i].beat <= beat + window; i++) {
    const d = Math.abs(notes[i].beat - beat);
    if (notes[i].pitch === pitch && !played.has(i) && d < distance) { best = i; distance = d; }
  }
  return best;
}

export function cuePosition(secondsUntilHit: number, fromX: number, fromY: number, toX: number, toY: number) {
  const travel = Math.pow(Math.max(0, 1 - secondsUntilHit / approachSeconds), 1.7);
  const depth = Math.min(1, travel);
  return { x: fromX + (toX - fromX) * depth, y: fromY + (toY - fromY) * depth, depth };
}

export function instrumentPitches(notes: Note[], beat: number, horizon: number, limit: number) {
  const all = [...new Set(notes.map(n => n.pitch))].sort((a, b) => a - b);
  if (all.length <= limit) return all;
  return pitchBank(notes, beat, horizon, limit);
}

export function pitchBank(notes: Note[], beat: number, horizon: number, limit: number) {
  const pitches = new Set<number>();
  const start = lowerBound(notes, beat, n => n.beat);
  let end = start;
  while (end < notes.length && notes[end].beat <= beat + horizon && pitches.size < limit) pitches.add(notes[end++].pitch);
  while (end < notes.length && pitches.size < limit) pitches.add(notes[end++].pitch);
  for (let i = start - 1; i >= 0 && pitches.size < limit; i--) pitches.add(notes[i].pitch);
  return [...pitches].sort((a, b) => a - b);
}
