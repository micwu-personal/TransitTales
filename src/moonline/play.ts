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

export function pianoBank(notes: Note[], beat: number, horizon: number, maxWhites: number, playableThrough = beat) {
  const start = lowerBound(notes, beat, n => n.beat);
  if (start === notes.length) return [];
  let low = notes[start].pitch, high = low;
  for (let i = start + 1; i < notes.length && notes[i].beat <= beat + horizon; i++) {
    const note = notes[i], nextLow = Math.min(low, note.pitch), nextHigh = Math.max(high, note.pitch);
    // Keep the first chord and any currently hittable notes visible across register jumps.
    if (note.beat > Math.max(playableThrough, notes[start].beat) && pianoPitches(nextLow, nextHigh).filter(p => !isBlack(p)).length > maxWhites) break;
    low = nextLow; high = nextHigh;
  }
  // Show at least seven natural keys, including the neighboring accidentals.
  while (pianoPitches(low, high).filter(p => !isBlack(p)).length < Math.min(7, maxWhites)) {
    if (high < 127) high++;
    else if (low > 0) low--;
    else break;
  }
  return pianoPitches(low, high);
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

export function instrumentPitches(notes: Note[], beat: number, horizon: number, limit: number, playableThrough = beat) {
  const all = [...new Set(notes.map(n => n.pitch))].sort((a, b) => a - b);
  if (all.length <= limit) return all;
  return pitchBank(notes, beat, horizon, limit, playableThrough);
}

export function pitchBank(notes: Note[], beat: number, horizon: number, limit: number, playableThrough = beat) {
  const pitches = new Set<number>();
  const start = lowerBound(notes, beat, n => n.beat);
  let end = start;
  // Mobile lane limits are soft for chords already in the hit window.
  const requiredThrough = Math.max(playableThrough, notes[start]?.beat ?? beat);
  while (end < notes.length && notes[end].beat <= requiredThrough) pitches.add(notes[end++].pitch);
  while (end < notes.length && notes[end].beat <= beat + horizon && pitches.size < limit) pitches.add(notes[end++].pitch);
  while (end < notes.length && pitches.size < limit) pitches.add(notes[end++].pitch);
  for (let i = start - 1; i >= 0 && pitches.size < limit; i--) pitches.add(notes[i].pitch);
  return [...pitches].sort((a, b) => a - b);
}

// A bank may not contain every future pitch. Preview it in pitch order rather than waiting for the bank to switch.
export function previewTarget(pitch: number, anchors: ReadonlyMap<number, {x: number}>, left: number, width: number, y: number) {
  let lower = -1, higher = 128;
  for (const key of anchors.keys()) {
    if (key < pitch && key > lower) lower = key;
    if (key > pitch && key < higher) higher = key;
  }
  const inset = Math.min(12, width / 2);
  const a = anchors.get(lower)?.x, b = anchors.get(higher)?.x;
  const x = a === undefined ? left + inset : b === undefined ? left + width - inset : a + (b - a) * (pitch - lower) / (higher - lower);
  return {x, y};
}
