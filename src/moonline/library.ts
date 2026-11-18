import type { Role, Song } from './score';

export const libraryKey = 'transit-tales-moonline-songs-v1';
const roles = new Set<Role>(['piano', 'guitar', 'bass', 'pad', 'drums']);
const bounded = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
function validSong(value: unknown): value is Song {
  if (!value || typeof value !== 'object') return false;
  const s = value as Song;
  return typeof s.id === 'string' && s.id.length <= 100 && typeof s.title === 'string' && s.title.trim().length > 0 && s.title.length <= 150 &&
    bounded(s.bpm, 1, 600) && bounded(s.beats, 0.001, 1000000) && Array.isArray(s.tracks) && s.tracks.length > 0 && s.tracks.length <= 128 &&
    s.tracks.some(t => Array.isArray(t?.notes) && t.notes.length > 0) && s.tracks.every(t => t && typeof t.name === 'string' && t.name.length <= 150 &&
      roles.has(t.role) && Array.isArray(t.notes) && t.notes.length <= 50000 && t.notes.every(n => n && bounded(n.pitch, 0, 127) && Number.isInteger(n.pitch) &&
      bounded(n.beat, 0, s.beats) && bounded(n.length, Number.EPSILON, s.beats) && n.beat + n.length <= s.beats + 1e-6 && bounded(n.velocity, 1, 127)));
}

export function loadLibrary(): Song[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(libraryKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(validSong).slice(0, 40) : [];
  } catch { return []; }
}

export function saveToLibrary(library: Song[], song: Song): Song[] | undefined {
  if (!validSong(song)) return;
  const next = [song, ...library.filter(s => s.id !== song.id)];
  if (next.length > 40) return;
  try { localStorage.setItem(libraryKey, JSON.stringify(next)); return next; }
  catch { return; }
}
