import { describe, expect, it } from 'vitest';
import { angles, apparentMagnitude, camera, constellationTour, DEG, direction, dot, length, spaceFrame, sub } from '../src/explorer/camera';
import type { Vec } from '../src/explorer/catalog';

describe('Night Atlas camera', () => {
  it('round trips horizontal coordinates in an Earth frame', () => {
    const frame = { up: [1, 0, 0] as Vec, north: [0, 0, 1] as Vec, east: [0, 1, 0] as Vec };
    const heading = direction(frame, 122 * DEG, 38 * DEG);
    const coords = angles(frame, heading);
    expect(coords.yaw).toBeCloseTo(122 * DEG);
    expect(coords.pitch).toBeCloseTo(38 * DEG);
    const eye = camera(frame, coords.yaw, coords.pitch, 100, 100);
    expect(dot(heading, eye.right)).toBeCloseTo(0);
    expect(dot(heading, eye.up)).toBeCloseTo(0);
    expect(length(eye.forward)).toBeCloseTo(1);
  });

  it('changes the angle between stars as the observer travels in depth', () => {
    const a: Vec = [0, 0, 2], b: Vec = [0, 0, 8];
    expect(angles(spaceFrame, a)).toEqual(angles(spaceFrame, b));
    const position: Vec = [3, 0, 0];
    expect(angles(spaceFrame, sub(a, position)).pitch).not.toBeCloseTo(angles(spaceFrame, sub(b, position)).pitch);
  });

  it('anchors absolute magnitudes at ten parsecs and follows inverse-square falloff', () => {
    expect(apparentMagnitude(4.83, 10)).toBeCloseTo(4.83);
    expect(apparentMagnitude(4.83, 100)).toBeCloseTo(9.83);
    expect(apparentMagnitude(4.83, 1)).toBeCloseTo(-.17);
  });

  it('orbits from the near side into a constellation’s depth', () => {
    const center: Vec = [120, 0, 0], radial: Vec = [1, 0, 0];
    const start = constellationTour(center, radial, 45, 0);
    const finish = constellationTour(center, radial, 45, 1);
    expect(start[0]).toBeLessThan(75);
    expect(finish[0]).toBeGreaterThan(center[0]);
    expect(length(sub(center, finish))).toBeLessThan(45);
  });
});
