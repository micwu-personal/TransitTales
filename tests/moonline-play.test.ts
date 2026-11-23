import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encodeMidi, decodeMidi } from '../src/moonline/midi';
import { approachingPitches, countInBeats, cuePosition, matchingNote } from '../src/moonline/play';
import { routes } from '../src/moonline/repertoire';

const n = (pitch: number, beat: number) => ({ pitch, beat, length: .4, velocity: 90 });

describe('Moonline approach and performance', () => {
  it('hits the real anchor at the exact score time and begins at the horizon', () => {
    expect(cuePosition(2.5, 400, 200, 70, 600)).toEqual({x: 400, y: 200, depth: 0});
    expect(cuePosition(0, 400, 200, 70, 600)).toEqual({x: 70, y: 600, depth: 1});
    expect(cuePosition(-.05, 400, 200, 570, 600)).toEqual({x: 570, y: 600, depth: 1});
  });
  it('shows one guide per approaching pitch and drops early hits, past notes and distant cues', () => {
    const chart = [n(50, -.1), n(53, 0), n(54, .25), n(54, .4), n(55, .5), n(57, .6)];
    expect([...approachingPitches(chart, new Set(), 0, 5)]).toEqual([54, 55]);
    expect([...approachingPitches(chart, new Set([2, 3]), 0, 5)]).toEqual([55]);
    expect([...approachingPitches(chart, new Set(), .6, 5)]).toEqual([]);
  });
  it('keeps a full preview without a long count-in at 10% speed', () => {
    expect(countInBeats(.5)).toBe(5);
    for (const secondsPerBeat of [.375 * 10, .5 * 10, 1 * 10]) {
      const duration = countInBeats(secondsPerBeat) * secondsPerBeat;
      expect(duration).toBeGreaterThanOrEqual(2.5);
      expect(duration).toBeLessThanOrEqual(4);
    }
  });
  it('requires the correct pitch and matches repeated notes one at a time', () => {
    const chart = [n(60, 0), n(60, .5), n(64, .5), n(60, 1)];
    expect(matchingNote(chart, new Set(), 60, .51, .5)).toBe(1);
    expect(matchingNote(chart, new Set([1]), 60, .51, .5)).toBe(-1);
    expect(matchingNote(chart, new Set([1]), 64, .51, .5)).toBe(2);
    expect(matchingNote(chart, new Set(), 67, .51, .5)).toBe(-1);
  });

});

describe('Moonline classical charts', () => {
  function bundledScore(id: string) {
    return decodeMidi(readFileSync(new URL(`../src/moonline/scores/${id}.mid`, import.meta.url)), id, id);
  }

  function attacks(track: ReturnType<typeof bundledScore>['tracks'][number], from: number, to: number) {
    return track.notes.filter(note => note.beat >= from && note.beat < to)
      .map(({beat, pitch, length}) => [beat, pitch, length]);
  }

  it('preserves Beethoven’s low-string statement and variation (IV, mm. 92–139)', () => {
    const score = bundledScore('ode-to-joy');
    const [theme, bass] = score.tracks;
    expect(score.beats).toBe(383);
    expect(score.tracks).toHaveLength(10);
    expect(score.tracks.slice(2).every(track => track.notes[0].beat >= 95)).toBe(true);
    expect(score.bpm).toBe(160);
    expect(attacks(theme, 0, 4)).toEqual([[0, 54, 2], [2, 55, 1], [3, 57, 1]]);
    expect(attacks(bass, 0, 4)).toEqual([[0, 42, 2], [2, 43, 1], [3, 45, 1]]);
    expect(attacks(theme, 12, 16)).toEqual([[12, 54, 1.5], [13.5, 52, .5], [14, 52, 2]]);
    expect(attacks(theme, 36, 40)).toEqual([[36, 52, 1], [37, 54, .5], [37.5, 55, .5], [38, 54, 1], [39, 50, 1]]);
    expect(attacks(theme, 47, 50)).toEqual([[47, 54, 2], [49, 54, 1]]);
    expect(attacks(theme, 96, 100)).toEqual([[96, 66, 2], [98, 67, 1], [99, 69, 1]]);
    expect(attacks(bass, 95, 104)).toEqual([[95, 45, 3], [98, 38, 2], [100, 35, 1.5], [101.5, 37, .5], [102, 38, 1], [103, 43, 2]]);
  });

  it('retains Beethoven’s independent counterpoint and sounding registers through the tutti', () => {
    const score = bundledScore('ode-to-joy');
    const [cello, bass, bassoon1, bassoon2, violin1, violin2, viola, flutes, horns, timpani] = score.tracks;
    expect(attacks(bassoon1, 96, 104)).toEqual([[99, 66, 1], [100, 62, 1.5], [101.5, 64, .5], [102, 66, 1], [103, 59, 2]]);
    expect(attacks(bassoon2, 95, 99)).toEqual([[95, 57, 3], [98, 50, 2]]);
    expect(attacks(bass, 192, 201)).toEqual([[192, 38, 9]]);
    expect(attacks(violin1, 192, 196)).toEqual([[192, 78, 2], [194, 79, 1], [195, 81, 1]]);
    expect(attacks(violin2, 188, 194)).toEqual([[190.5, 71, .5], [191, 69, .5], [191.5, 67, .5], [192, 66, 1], [193, 62, 1]]);
    expect(attacks(cello, 286.5, 288)).toEqual([[286.5, 55, .5], [287, 54, .5], [287.5, 52, .5]]);
    expect(attacks(viola, 284, 288)).toEqual([[286.5, 59, .5], [287, 57, .5], [287.5, 55, .5]]);
    expect(attacks(flutes, 288, 291)).toEqual([[288, 86, 2], [288, 90, 2], [290, 88, 1], [290, 91, 1]]);
    expect(attacks(horns, 288, 291)).toEqual([[288, 62, 2], [288, 66, 2], [290, 64, 1], [290, 67, 1]]);
    expect(attacks(timpani, 288, 292)).toEqual([[288, 50, 1], [289.5, 50, .5], [290, 50, 1], [291.5, 50, .5]]);
    expect(attacks(flutes, 382, 384)).toEqual([[382, 78, 1], [382, 86, 1]]);
  });

  it('keeps Beethoven’s theme playable in one register through every orchestral handoff', () => {
    const score = bundledScore('ode-to-joy-melody');
    const [lead, strings, bass] = score.tracks;
    expect(score.tracks.map(track => track.name)).toEqual(['Melody', 'Strings & replies', 'Bass']);
    expect(score.beats).toBe(383);
    expect(lead.notes.every((n, i) => n.pitch >= 57 && n.pitch <= 69
      && (i === 0 || lead.notes[i - 1].beat + lead.notes[i - 1].length === n.beat))).toBe(true);
    for (const start of [0, 96, 192, 288]) {
      expect(attacks(lead, start, start + 4)).toEqual([[start, 66, 2], [start + 2, 67, 1], [start + 3, 69, 1]]);
    }
    expect(attacks(lead, 380, 383)).toEqual([[380, 64, 1.5], [381.5, 62, .5], [382, 62, 1]]);
    expect(attacks(bass, 0, 16)).toEqual([[0, 38, 1.5], [4, 33, 1.5], [8, 38, 1.5], [12, 33, 1.5]]);
    expect(strings.notes.some(n => n.beat >= 288)).toBe(true);
  });

  it('preserves both Mozart staves, including the written cadences (K. 265, Thema)', () => {
    const score = bundledScore('ah-vous-dirai-je-maman');
    const [right, left] = score.tracks;
    expect(score.beats).toBe(48);
    expect(score.tracks.map(track => track.role)).toEqual(['piano', 'piano', 'pad', 'guitar', 'bass']);
    expect(attacks(right, 0, 2)).toEqual([[0, 72, 1], [1, 72, 1]]);
    expect(attacks(left, 0, 2)).toEqual([[0, 48, 1], [1, 60, 1]]);
    expect(attacks(right, 12, 16)).toEqual([[12, 74, 1], [13, 74, .75], [13.75, 76, .25], [14, 72, 2]]);
    expect(attacks(right, 28, 32)).toEqual([[28, 76, 1], [29, 76, .75], [29.75, 77, .25], [30, 76, 1], [31, 74, 1]]);
    expect(attacks(left, 28, 34)).toEqual([[28, 60, 1], [29, 60, .75], [29.75, 62, .25], [30, 55, 2], [30, 60, 1], [31, 59, 1], [32, 48, 1], [33, 60, 1]]);
    expect(attacks(left, 46, 48)).toEqual([[46, 48, 2]]);
  });
  it('voices the Moonline parts at Mozart’s within-bar changes without reharmonizing pickups', () => {
    const { tracks: [, , inner, plucked, bass] } = bundledScore('ah-vous-dirai-je-maman');
    expect(attacks(inner, 10, 14)).toEqual([[10, 67, 1], [11, 64, 1], [12, 57, 1], [13, 59, 1]]);
    expect(attacks(bass, 10, 14)).toEqual([[10, 48, 1], [11, 45, 1], [12, 41, 1], [13, 43, 1]]);
    expect(attacks(plucked, 12, 14)).toEqual([[12.5, 69, .5], [13.5, 67, .25]]);
    expect(attacks(inner, 30, 32)).toEqual([[30, 64, 1], [31, 62, 1]]);
    expect(attacks(bass, 30, 32)).toEqual([[30, 43, 2]]);
    expect(attacks(bass, 42, 46)).toEqual([[42, 48, 1], [43, 45, 1], [44, 41, 1], [45, 43, 1]]);
  });

  it('keeps Schubert’s introduction and piano replies outside the player melody', () => {
    const { tracks: [melody, accompaniment, replies, bass] } = bundledScore('schubert-serenade');
    expect(melody.notes[0]).toMatchObject({ beat: 12, pitch: 69 });
    expect(accompaniment.notes[0].beat).toBe(0);
    expect(bass.notes[0].beat).toBe(0);
    expect(replies.notes[0]).toMatchObject({ beat: 24, pitch: 73 });
    expect(attacks(melody, 24, 30)).toEqual([]);
  });

  it('keeps Chopin’s pickup, within-bar bass motion, and download attribution', () => {
    const id = 'chopin-nocturne-op-9-no-2';
    const { tracks: [melody, chords, bass] } = bundledScore(id);
    expect(attacks(melody, 0, .5)).toEqual([[0, 70, .5]]);
    expect(attacks(bass, .5, 6.5)).toEqual([[.5, 39, .5], [2, 51, .5], [3.5, 39, .5], [5, 38, .5]]);
    expect(attacks(chords, 24, 24.5)).toEqual([[24, 58, .5], [24, 63, .5], [24, 67, .5]]);
    const bytes = readFileSync(new URL(`../src/moonline/scores/${id}.mid`, import.meta.url));
    expect(bytes.includes('Renato Biolcati Rinaldi')).toBe(true);
    expect(bytes.includes('https://creativecommons.org/licenses/by-sa/3.0/')).toBe(true);
  });

  it.each(routes)('round-trips the $song.title chart through Standard MIDI', ({song, sections, partNames}) => {
    const bytes = encodeMidi(song);
    const bundled = readFileSync(new URL(`../src/moonline/scores/${song.id}.mid`, import.meta.url));
    expect(Buffer.compare(bundled, bytes)).toBe(0);
    expect([...bytes.slice(0, 4)]).toEqual([77, 84, 104, 100]);
    const imported = decodeMidi(bytes, song.id, song.title);
    expect(imported.beats).toBeCloseTo(song.beats, 2);
    expect(imported.bpm).toBeCloseTo(song.bpm, 2);
    expect(imported.tracks).toEqual(song.tracks);
    expect(partNames?.map(([en]) => en)).toEqual(song.tracks.map(track => track.name));
    expect(new Set(partNames?.map(([, zh]) => zh)).size).toBe(song.tracks.length);
    for (const track of imported.tracks) {
      expect(track.notes.length).toBeGreaterThan(0);
      expect(track.notes.every(note => note.beat >= 0 && note.beat + note.length <= song.beats)).toBe(true);
    }
    expect(sections[0].at).toBe(0);
    expect(sections.at(-1)!.at).toBeLessThan(song.beats);
  });
});
