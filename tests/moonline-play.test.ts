import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encodeMidi, decodeMidi } from '../src/moonline/midi';
import { cuePosition, instrumentPitches, matchingNote, pitchBank } from '../src/moonline/play';
import { routes } from '../src/moonline/repertoire';

const n = (pitch: number, beat: number) => ({ pitch, beat, length: .4, velocity: 90 });

describe('Moonline approach and performance', () => {
  it('hits the real anchor at the exact score time and begins at the horizon', () => {
    expect(cuePosition(2.5, 400, 200, 70, 600)).toEqual({x: 400, y: 200, depth: 0});
    expect(cuePosition(0, 400, 200, 70, 600)).toEqual({x: 70, y: 600, depth: 1});
    expect(cuePosition(-.05, 400, 200, 570, 600)).toEqual({x: 570, y: 600, depth: 1});
  });
  it('requires the correct pitch and matches repeated notes one at a time', () => {
    const chart = [n(60, 0), n(60, .5), n(64, .5), n(60, 1)];
    expect(matchingNote(chart, new Set(), 60, .51, .5)).toBe(1);
    expect(matchingNote(chart, new Set([1]), 60, .51, .5)).toBe(-1);
    expect(matchingNote(chart, new Set([1]), 64, .51, .5)).toBe(2);
    expect(matchingNote(chart, new Set(), 67, .51, .5)).toBe(-1);
  });
  it('keeps narrow charts fixed and prioritizes upcoming notes in wide charts', () => {
    const chart = Array.from({length: 40}, (_, i) => n(i, i));
    expect(instrumentPitches(chart.slice(0, 6), 20, 2, 8)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(pitchBank(chart, 10, 2, 8)).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
  });
});

describe('Moonline classical charts', () => {
  it.each(routes)('round-trips the $song.title chart through Standard MIDI', ({song, sections}) => {
    const bytes = encodeMidi(song);
    const bundled = readFileSync(new URL(`../src/moonline/scores/${song.id}.mid`, import.meta.url));
    expect(Buffer.compare(bundled, bytes)).toBe(0);
    expect([...bytes.slice(0, 4)]).toEqual([77, 84, 104, 100]);
    const imported = decodeMidi(bytes, song.id, song.title);
    expect(imported.beats).toBeCloseTo(song.beats, 2);
    expect(imported.bpm).toBeCloseTo(song.bpm, 2);
    expect(imported.tracks.map(t => [t.role, t.notes.length])).toEqual(song.tracks.map(t => [t.role, t.notes.length]));
    expect(sections[0].at).toBe(0);
    expect(sections.at(-1)!.at).toBeLessThan(song.beats);
  });
});
