import { describe, expect, it } from 'vitest';
import { initialUniverseView, needsSafeStartup } from '../src/universe/render-policy';

describe('safe universe startup', () => {
  it.each([
    { userAgent: 'Mozilla/5.0 (iPad; CPU OS 26_6 like Mac OS X)', maxTouchPoints: 5, coarsePointer: true },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5, coarsePointer: false },
    { userAgent: 'iPad', maxTouchPoints: 0, coarsePointer: false },
    { userAgent: 'Android', maxTouchPoints: 1, coarsePointer: false },
    { userAgent: 'Windows', maxTouchPoints: 0, coarsePointer: true },
  ])('keeps a touch device out of automatic GPU startup: %j', device => {
    expect(needsSafeStartup(device)).toBe(true);
    for (const query of [null, '2d', '3d']) expect(initialUniverseView(true, query)).toBe('2d');
  });
  it('preserves desktop defaults and the explicit lightweight recovery URL', () => {
    expect(needsSafeStartup({ userAgent: 'Macintosh', maxTouchPoints: 0, coarsePointer: false })).toBe(false);
    expect(initialUniverseView(false, null)).toBe('3d');
    expect(initialUniverseView(false, '3d')).toBe('3d');
    expect(initialUniverseView(false, '2d')).toBe('2d');
  });
});
