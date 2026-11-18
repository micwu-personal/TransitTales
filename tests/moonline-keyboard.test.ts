import { describe, expect, it } from 'vitest';
import { compactCodes, cuePosition, instrumentPitches, pianoBank, pianoKeys, pianoPitches } from '../src/moonline/play';

const note = (pitch: number, beat: number) => ({pitch, beat, length: 1, velocity: .8});

describe('Moonline cab keyboards', () => {
  it('keeps only chart pitches in compact mode', () => {
    expect(instrumentPitches([note(61, 0), note(67, 1), note(61, 2)], 0, 4, compactCodes.length)).toEqual([61, 67]);
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

  it('slides the chromatic window for wide parts without splitting the next chord', () => {
    const chart = [note(58, 0), note(60, 0), note(83, 4), note(88, 4), note(94, 5)];
    expect(pianoBank(chart, 0, 8, 8)).toContain(58);
    expect(pianoBank(chart, 0, 8, 8)).not.toContain(83);
    expect(pianoBank(chart, 1, 8, 8)).toEqual(expect.arrayContaining([83, 84, 85, 86, 87, 88]));
    expect(pianoBank([note(60, 0), note(84, .25)], 0, 2, 7, .3)).toEqual(expect.arrayContaining([60, 84]));
    expect(pianoBank([note(40, 0), note(76, 0)], 0, 4, 7)).toEqual(expect.arrayContaining([40, 76]));
    expect(Math.max(...pianoBank([note(127, 0)], 0, 4, 7))).toBe(127);
    expect(Math.min(...pianoBank([note(0, 0)], 0, 4, 7))).toBe(0);
  });
});
