import { ode } from './classical-scores';
import type { Note, Song } from './score';

const [cello, bass, bassoon, , violin, violin2, viola, flutes] = ode.tracks;
const byBeat = (a: Note, b: Note) => a.beat - b.beat || a.pitch - b.pitch;

// The upper flute carries the tune at m. 164; at the exposed lower-register
// attacks, take the only sounding flute pitch. Keep the tune in D4's register.
const fluteLead = new Map<number, Note>();
for (const note of flutes.notes) {
  if ((fluteLead.get(note.beat)?.pitch ?? -1) < note.pitch) fluteLead.set(note.beat, note);
}
const melody = [
  ...cello.notes.filter(n => n.beat < 192).map(n => ({ ...n, pitch: n.pitch + (n.beat < 96 ? 12 : 0), velocity: 86 })),
  ...violin.notes.filter(n => n.beat < 288).map(n => ({ ...n, pitch: n.pitch - 12, velocity: 92 })),
  ...[...fluteLead.values()].map(n => ({ ...n, pitch: n.pitch - 24, velocity: 97 })),
].sort(byBeat);

// The original opening bass doubles the tune. This new, sparse bass supports
// phrase harmony without playing the player's melody in another octave.
const openingBass: Note[] = [
  // Each pair gives a bar offset and a bass pitch. The remaining bars are rests.
  [0, 38], [1, 33], [2, 38], [3, 33], [4, 38], [5, 33], [6, 38], [7, 38],
  [8, 33], [9, 38], [10, 33], [11, 33],
  [12, 38], [13, 33], [14, 38], [15, 38], [16, 33], [17, 38], [18, 33], [19, 33],
  [20, 38], [21, 33], [22, 38], [23, 38],
].map(([bar, pitch]) => ({ beat: bar * 4, pitch, length: 1.5, velocity: 49 }));

export const odeMelody: Song = {
  id: 'ode-to-joy-melody', title: 'Ode to Joy · Single Melody', bpm: 144, beats: ode.beats,
  tracks: [
    { name: 'Melody', role: 'piano', notes: melody },
    { name: 'Strings & replies', role: 'pad', notes: [
      ...bassoon.notes.filter(n => n.beat < 190.5).map(n => ({ ...n, length: Math.min(n.length, 190.5 - n.beat), velocity: 49 })),
      ...violin2.notes.filter(n => n.beat < 285.5).map(n => ({ ...n, length: Math.min(n.length, 285.5 - n.beat), velocity: 49 })),
      ...viola.notes.map(n => ({ ...n, velocity: 53 })),
    ].sort(byBeat) },
    { name: 'Bass', role: 'bass', notes: [...openingBass, ...bass.notes.filter(n => n.beat >= 96).map(n => ({ ...n, velocity: n.beat < 288 ? 54 : 62 }))] },
  ],
};
