export type Role = 'piano' | 'guitar' | 'bass' | 'pad' | 'drums';
export type Note = { pitch: number; beat: number; length: number; velocity: number };
export type Track = { name: string; role: Role; notes: Note[] };
export type Song = { id: string; title: string; bpm: number; beats: number; tracks: Track[] };

export function quantize(beat: number, step: number): number {
  return Number.isFinite(step) && step > 0 ? Math.round(beat / step) * step || 0 : beat;
}

export function pitchName(pitch: number): string {
  const midi = Math.round(pitch);
  if (!Number.isFinite(midi)) return '—';
  return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// Uses only pitch-class weights, not a copy of the melody or a borrowed recording.
export function accompany(song: Song): Track[] {
  const piano: Track = { name: 'Chords', role: 'piano', notes: [] };
  const pad: Track = { name: 'Warm pad', role: 'pad', notes: [] };
  const bass: Track = { name: 'Bass', role: 'bass', notes: [] };
  const drums: Track = { name: 'Drums', role: 'drums', notes: [] };
  const end = Number.isFinite(song.beats) ? song.beats : 0;
  const weights = Array<number>(12).fill(0);
  for (const track of song.tracks) {
    if (track.role === 'drums') continue;
    for (const note of track.notes) {
      if (!Number.isInteger(note.pitch) || note.pitch < 0 || note.pitch > 127 || !Number.isFinite(note.length) || note.length <= 0) continue;
      weights[note.pitch % 12] += Math.min(note.length, 4) * (track.role === 'bass' ? 1.5 : 1);
    }
  }
  const major = [0, 2, 4, 5, 7, 9, 11];
  const minor = [0, 2, 3, 5, 7, 8, 10];
  let tonic = 0;
  let scale = major;
  let best = -Infinity;
  for (let key = 0; key < 12; key++) {
    for (const mode of [major, minor]) {
      const score = mode.reduce((sum, pitch) => sum + weights[(key + pitch) % 12], 0)
        + 0.22 * weights[key] + 0.08 * weights[(key + 7) % 12];
      if (score > best) {
        best = score;
        tonic = key;
        scale = mode;
      }
    }
  }
  const progression = scale === major ? [0, 4, 5, 3, 0, 3, 1, 4] : [0, 5, 2, 6, 0, 3, 5, 4];
  const center = 60 + (tonic > 6 ? tonic - 12 : tonic);
  const degreePitch = (degree: number) => center + scale[degree % 7] + 12 * Math.floor(degree / 7);
  const add = (track: Track, pitch: number, beat: number, length: number, velocity: number) => {
    if (beat < end) track.notes.push({ pitch, beat, length: Math.min(end - beat, length), velocity });
  };
  for (let bar = 0; bar * 4 < end; bar++) {
    const beat = bar * 4;
    const degree = progression[bar % progression.length];
    const [root, third, fifth] = [degreePitch(degree), degreePitch(degree + 2), degreePitch(degree + 4)];
    for (const pitch of [root, third, fifth]) {
      add(piano, pitch, beat, 0.88, 65);
      add(piano, pitch, beat + 2.5, 0.55, 48);
      add(pad, pitch, beat, 4, 43);
    }
    add(bass, root - 24, beat, 1.42, 72);
    add(bass, fifth - 24, beat + 1.5, 0.39, 54);
    add(bass, root - 24, beat + 2, 1.73, 66);
    for (let eighth = 0; eighth < 8; eighth++) {
      const at = beat + eighth / 2;
      if (eighth === 0 || eighth === 4) add(drums, 36, at, 0.18, 82);
      if (eighth === 2 || eighth === 6) add(drums, 38, at, 0.17, 68);
      add(drums, 42, at, 0.08, eighth % 2 === 0 ? 44 : 32);
    }
  }
  piano.notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return [piano, pad, bass, drums];
}
