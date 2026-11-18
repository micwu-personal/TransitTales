import { describe, expect, it } from 'vitest';
import { approachSeconds } from '../src/moonline/play';
import { staffCue, staffRail, staffStep } from '../src/moonline/staff';

const horizon = {x: 180, y: 200};
const deck = {x: 180, y: 520};
const spacing = 16;

describe('Moonline staff railway', () => {
  it('uses diatonic spacing, with sharps sharing their natural position', () => {
    expect([60, 61, 62, 64, 65, 67, 69, 71, 72].map(p => staffStep(p, 67)))
      .toEqual([-4, -4, -3, -2, -1, 0, 1, 2, 3]);
  });

  it('carries a note on the perspective line for its pitch before the junction', () => {
    const step = 4, key = {x: 310, y: 590};
    const first = staffCue(step, approachSeconds, horizon, deck, spacing, key);
    expect(first).toEqual({...staffRail(step, 0, horizon, deck, spacing), depth: 0});
    const mid = staffCue(step, approachSeconds / 2, horizon, deck, spacing, key);
    const line = staffRail(step, (mid.y - horizon.y) / (deck.y - horizon.y), horizon, deck, spacing);
    expect(mid.x).toBeCloseTo(line.x);
  });

  it.each([{x: 18, y: 591}, {x: 179.5, y: 588}, {x: 337, y: 603}])(
    'reaches the key at onset, including after a relayout (%o)', key => {
      const early = staffCue(-2, .001, horizon, deck, spacing, key);
      expect(early.y).toBeLessThan(key.y);
      expect(early.x).toBeCloseTo(key.x, 2);
      for (const dt of [0, -.04]) {
        expect(staffCue(-2, dt, horizon, deck, spacing, key)).toEqual({...key, depth: 1});
      }
    });
});
