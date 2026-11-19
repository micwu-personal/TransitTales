import { describe, expect, it } from 'vitest';
import { cuePosition, instrumentPitches, pianoKeys, pianoPitches } from '../src/moonline/play';

const note = (pitch: number, beat: number) => ({pitch, beat, length: 1, velocity: .8});

describe('Moonline cab keyboards', () => {
  it('keeps only chart pitches in compact mode', () => {
    expect(instrumentPitches([note(61, 0), note(67, 1), note(61, 2)], false)).toEqual([61, 67]);
  });

  it('builds a complete piano register centered between the correct white keys', () => {
    const keys = pianoKeys(pianoPitches(61, 66));
    expect(keys.map(k => k.pitch)).toEqual([60, 61, 62, 63, 64, 65, 66, 67]);
    expect(keys.filter(k => k.black).map(k => k.pitch)).toEqual([61, 63, 66]);
    const white = keys.filter(k => !k.black);
    expect(white.map(k => k.width)).toEqual(Array(5).fill(.2));
    for (const key of keys.filter(k => k.black)) {
      const right = white.find(k => k.pitch === key.pitch + 1)!;
      expect(key.left + key.width / 2).toBeCloseTo(right.left);
      expect(key.width).toBeLessThan(right.width);
      expect(cuePosition(0, 10, 10, key.left + key.width / 2, 70)).toEqual({x: key.left + key.width / 2, y: 70, depth: 1});
    }
  });

  it('includes the entire part up front, even across distant register jumps', () => {
    const chart = [note(58, 0), note(60, 0), note(83, 80), note(88, 80), note(94, 120)];
    expect(instrumentPitches(chart, false)).toEqual([58, 60, 83, 88, 94]);
    const piano = pianoKeys(instrumentPitches(chart, true));
    expect(piano.map(key => key.pitch)).toEqual(Array.from({length: 39}, (_, i) => 57 + i));
    const shortcuts = piano.flatMap(({code}) => code ? [code] : []);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
    expect(Math.max(...instrumentPitches([note(127, 0)], true))).toBe(127);
    expect(Math.min(...instrumentPitches([note(0, 0)], true))).toBe(0);
  });
});
