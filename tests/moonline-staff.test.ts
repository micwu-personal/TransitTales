import { describe, expect, it } from 'vitest';
import { approachSeconds } from '../src/moonline/play';
import { createStaff, durationDepths, notate, rhythmicShape, scoreMeter, spellPitch, staffDepth } from '../src/moonline/staff';

const horizon = {x: 180, y: 590};
const strike = 200;
const anchors = new Map([[60, {x: 57, y: strike}], [61, {x: 90, y: strike}], [62, {x: 120, y: strike}]]);
const staff = createStaff(horizon, strike, 350, 71, anchors, false, true);

describe('Moonline staff railway', () => {
  it('uses written steps for both sharp and flat spellings', () => {
    expect(spellPitch(61, 71, false)).toEqual({...spellPitch(60, 71, false), accidental: '♯'});
    expect(spellPitch(61, 71, true)).toEqual({...spellPitch(62, 71, true), accidental: '♭'});
  });

  it('keeps accidentals on the written step up ahead and lands on natural and black keys', () => {
    const step = spellPitch(61, 71, false).step;
    expect(staff.cue(61, .3, 70)).toEqual(staff.rail(step, .3));
    for (const [pitch, key] of anchors) expect(staff.cue(pitch, 1, 70)).toEqual(key);
    const compact = createStaff(horizon, strike, 350, 71, new Map([[61, {x: 201, y: strike}]]), true, true);
    expect(compact.cue(61, 1, 75)).toEqual({x: 201, y: strike});
    expect(staff.cue(61, .5, 90).y).toBe(staff.cue(62, .5, 120).y);
  });

  it('moves at uniform speed and preserves the ratio of rhythmic distances', () => {
    const sample = (seconds: number) => staff.cue(61, staffDepth(seconds), 90).y;
    const [far, mid, near, hit] = [2.5, 1.75, 1, 0].map(sample);
    expect(far).toBe(horizon.y);
    expect(far).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(hit);
    expect(near - mid).toBeCloseTo(mid - far);
    expect(hit).toBe(strike);
    const span = (duration: number) => {
      const [head, tail] = durationDepths(.5, duration);
      return staff.cue(61, head, 90).y - staff.cue(61, tail, 90).y;
    };
    expect(span(1)).toBeCloseTo(2 * span(.5));
  });

  it('keeps ascending pitch left to right and the same scale across the score', () => {
    expect(staff.rail(-4, 0).x).toBeLessThan(staff.rail(0, 0).x);
    expect(staff.rail(0, 0).x).toBeLessThan(staff.rail(4, 0).x);
    for (const step of [-4, -2, 0, 2, 4]) expect(staff.rail(step, 0).x).toBe(staff.rail(step, 1).x);
    expect(staff.cue(60, 0, 57).x).toBe(staff.cue(60, 1, 57).x);
  });

  it('clips spans at the horizon and strike line, keeping held notes until release', () => {
    expect(durationDepths(-.5, 1)).toEqual([1, .8]);
    expect(durationDepths(-1, 1)).toEqual([1, 1]);
    expect(durationDepths(approachSeconds / 2, 9)).toEqual([.5, 0]);
  });

  it('draws distinct rhythmic values, retains pickup timing, and cancels altered notes', () => {
    expect(rhythmicShape(4)).toMatchObject({open: true, stem: false});
    expect(rhythmicShape(1.5)).toMatchObject({open: false, stem: true, dots: 1});
    expect(rhythmicShape(.25)).toMatchObject({open: false, flags: 2});
    expect(rhythmicShape(1/3)).toMatchObject({flags: 1, triplet: true});
    const meter = scoreMeter('chopin-nocturne-op-9-no-2');
    expect(meter).toMatchObject({bar: 6, first: .5, flats: true});
    const notes = [[61, .5], [62, 1.5], [61, 4.5], [62, 6.5]].map(([pitch, beat]) => ({pitch, beat, length: .5, velocity: 80}));
    expect(notate(notes, 71, meter).map(n => n.accidental)).toEqual(['♭', '♮', '♭', '']);
  });
});
