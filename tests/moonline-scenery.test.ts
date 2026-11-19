import { describe, expect, it } from 'vitest';
import { landscapeProgress, sceneryScale } from '../src/moonline/scenery';

describe('Moonline station perspective', () => {
  it('starts at the illustrated layout and advances faster at nearer depths', () => {
    for (const layer of [0, 1, 2] as const) {
      expect(sceneryScale(0, layer)).toBe(1);
      const halfway = sceneryScale(.5, layer);
      expect(sceneryScale(1, layer) - halfway).toBeGreaterThan(halfway - 1);
    }
    expect(sceneryScale(.5, 2)).toBeGreaterThan(sceneryScale(.5, 1));
    expect(sceneryScale(.5, 1)).toBeGreaterThan(sceneryScale(.5, 0));
  });

  it('keeps travel continuous across adjacent sections using the same artwork', () => {
    const stops = [{ scene: 4, at: 0 }, { scene: 4, at: 16 }, { scene: 1, at: 64 }];
    expect(landscapeProgress(stops, 0, 16, 100)).toBe(.25);
    expect(landscapeProgress(stops, 1, 16, 100)).toBe(.25);
    expect(landscapeProgress(stops, 2, 64, 100)).toBe(0);
    expect(landscapeProgress(stops, 2, 105, 100)).toBe(1);
  });
});
