import type { Note } from './score';

export const hitWindow = 0.18;
export const approachSeconds = 2.5;
export const keyboardCodes = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote', 'BracketRight'];
export const isBlack = (pitch: number) => [1, 3, 6, 8, 10].includes(pitch % 12);
export const compactCodes = keyboardCodes.filter((_, index) => !isBlack(60 + index));

export function pianoPitches(low: number, high: number) {
  const first = low - Number(isBlack(low)), last = high + Number(isBlack(high));
  return Array.from({length: last - first + 1}, (_, index) => first + index);
}

export function pianoKeys(pitches: number[]) {
  const whites = pitches.filter(pitch => !isBlack(pitch)).length;
  let position = 0;
  return pitches.map((pitch, index) => {
    const black = isBlack(pitch);
    return {pitch, black, left: (black ? position - .31 : position++) / whites,
      width: (black ? .62 : 1) / whites, code: keyboardCodes[index] as string | undefined};
  });
}

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
  if (secondsUntilHit <= 0) return {x: toX, y: toY, depth: 1};
  const travel = Math.max(0, 1 - secondsUntilHit / approachSeconds);
  const depth = Math.min(1, travel);
  return { x: fromX + (toX - fromX) * depth, y: fromY + (toY - fromY) * depth, depth };
}

export function instrumentPitches(notes: Note[], piano: boolean) {
  const all = [...new Set(notes.map(n => n.pitch))].sort((a, b) => a - b);
  if (!piano || !all.length) return all;
  let low = all[0], high = all[all.length - 1];
  while (pianoPitches(low, high).filter(p => !isBlack(p)).length < 7) {
    if (high < 127) high++;
    else low--;
  }
  return pianoPitches(low, high);
}
