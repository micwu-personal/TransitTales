import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { add, cross, dot, length, scale, unit } from '../src/explorer/camera';
import { destinationImageRadius, destinationPlates, GALACTIC_X, GALACTIC_Y, GALACTIC_Z, galacticVector, imageCoverage, imageryCredits, plateAxes, plateProjectionFade, surveyU, surveyV, type ImageDestination } from '../src/explorer/imagery';

describe('Night Atlas observing imagery', () => {
  it('frames each retained plate, including its offset from the navigation marker', () => {
    const { m1, m42, m45, m31 } = destinationPlates;
    const uncroppedM31 = Math.hypot((2_500_000 / 3.261563777) * Math.tan(361.93 * Math.PI / 21600), (2_500_000 / 3.261563777) * Math.tan(234.08 * Math.PI / 21600));
    expect(destinationImageRadius('m1')).toBeCloseTo(m1.radius, 8);
    expect(m1.radius).toBeGreaterThan(2.6);
    expect(m42.radius).toBeGreaterThan(3);
    expect(m45.radius).toBeGreaterThan(Math.hypot(m45.hw, m45.hh));
    expect(m31.radius).toBeLessThan(uncroppedM31);
    expect(destinationImageRadius('sgr-a')).toBeUndefined();
    expect(destinationImageRadius('__proto__')).toBeUndefined();
  });

  it('maintains the survey center, north pole, and left-increasing Galactic longitude', () => {
    const [cx, cy, cz] = galacticVector(GALACTIC_X);
    expect(cx).toBeCloseTo(1, 9);
    expect(surveyU(cx, cy)).toBeCloseTo(.5, 9);
    expect(surveyV(cx, cy, cz)).toBeCloseTo(.5, 9);
    const y = galacticVector(GALACTIC_Y);
    const z = galacticVector(GALACTIC_Z);
    expect(surveyU(y[0], y[1])).toBeCloseTo(.25, 9);
    expect(surveyV(...z)).toBeCloseTo(0, 9);
  });

  it('retains the observed orientation from Earth and remains orthogonal during flybys', () => {
    for (const id of Object.keys(imageryCredits) as ImageDestination[]) {
      const { normal, right, up } = destinationPlates[id];
      const observed = plateAxes(id, normal);
      expect(dot(right, observed.right)).toBeCloseTo(1, 9);
      expect(dot(up, observed.up)).toBeCloseTo(1, 9);
      const toward = unit([.22, -.66, .39]);
      const transported = plateAxes(id, toward);
      expect(dot(transported.right, toward)).toBeCloseTo(0, 9);
      expect(dot(transported.up, toward)).toBeCloseTo(0, 9);
      expect(length(transported.right)).toBeCloseTo(1, 9);
      expect(length(transported.up)).toBeCloseTo(1, 9);
    }
  });

  it('rejects offscreen plates before affine projection can stretch them into view', () => {
    const { normal, right, up, hw, hh } = destinationPlates.m31;
    const forward = unit(add(right, scale(normal, .012)));
    const eye = { forward, right: unit(cross(forward, up)), up };
    const center = scale(normal, 766_000);
    const halfRight = scale(right, hw);
    const halfUp = scale(up, hh);
    expect(plateProjectionFade(eye, center, halfRight, halfUp, .38, .78)).toBe(0);
    expect(plateProjectionFade({ forward: normal, right, up }, center, halfRight, halfUp, .38, .78)).toBe(1);
  });

  it('keeps plates that cross the edge, even when their centers are outside', () => {
    const eye = { forward: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] } as const;
    expect(plateProjectionFade(eye, [5.5, 0, 10], [1, 0, 0], [0, 1, 0], .5, .5)).toBe(1);
    expect(plateProjectionFade(eye, [6.5, 0, 10], [1, 0, 0], [0, 1, 0], .5, .5)).toBe(0);
  });

  it('skips sub-resolution imagery and ships five compact local WebPs', () => {
    expect(imageCoverage(7)).toBe(0);
    expect(imageCoverage(18)).toBeCloseTo(.5);
    expect(imageCoverage(30)).toBe(1);
    const bytes = [...Object.keys(imageryCredits), 'milky-way'].map(id => {
      const image = readFileSync(new URL(`../public/explorer/imagery/${id}.webp`, import.meta.url));
      expect(image.toString('ascii', 8, 12)).toBe('WEBP');
      return image.byteLength;
    });
    expect(bytes.reduce((a, b) => a + b)).toBeLessThan(600_000);
  });
});
