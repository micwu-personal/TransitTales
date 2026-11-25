import { describe, expect, it } from 'vitest';
import { angles, apparentMagnitude, camera, cameraRoll, constellationPassage, constellationTour, DEG, direction, dot, flightPassage, length, type Pose, spaceFrame, sub } from '../src/explorer/camera';
import { labelFits, stellarLabelBudget } from '../src/explorer/labels';
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

  it('preserves camera direction and screen roll across the horizon-to-space basis change', () => {
    const frame = { up: [1, 0, 0] as Vec, north: [0, 0, 1] as Vec, east: [0, 1, 0] as Vec };
    const pose: Pose = { position: [0, 0, 0], yaw: 1.2, pitch: .3, zoom: 1 };
    const original = camera(frame, pose.yaw, pose.pitch, 100, 100);
    const converted = cameraRoll(frame, pose, spaceFrame);
    const eye = camera(spaceFrame, converted.yaw, converted.pitch, 100, 100);
    expect(dot(original.forward, eye.forward)).toBeCloseTo(1);
    expect(dot(original.right, eye.right)).toBeCloseTo(Math.cos(converted.roll));
    expect(dot(original.right, eye.up)).toBeCloseTo(Math.sin(converted.roll));
  });

  it('turns before departure and leaves time for close approach and landing', () => {
    const from: Pose = { position: [0, 0, 0], yaw: 2, pitch: .2, zoom: 2 };
    const aim = { ...from, yaw: 1, zoom: 1 };
    const approach: Vec = [0, 0, 1000];
    const to: Pose = { position: [0, 0, 1001], yaw: .5, pitch: 0, zoom: 1 };
    const shot = (t: number) => flightPassage(from, aim, approach, to, t, .1);
    expect(shot(0)).toEqual(from);
    expect(shot(.11).position).toEqual(from.position);
    expect(shot(.11).yaw).toBeCloseTo(1.5);
    expect(shot(.55).position[2]).toBeGreaterThan(900);
    expect(shot(.55).position[2]).toBeLessThan(1000);
    expect(shot(.9).position[2]).toBeGreaterThan(1000);
    expect(shot(1)).toEqual(to);
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

  it('frames the shape before traveling and blends terrain and field opacity in both directions', () => {
    const origin: Pose = { position: [0, 0, 0], yaw: 179 * DEG, pitch: .2, zoom: 1 };
    const bearing: Pose = { ...origin, yaw: -179 * DEG, pitch: -.3, zoom: 1.28 };
    const arrival: Pose = { ...bearing, position: [45, 0, 0], pitch: -.2, zoom: 1.2 };
    const sample = (t: number) => constellationPassage(origin, bearing, arrival, t);
    expect(sample(0)).toEqual({ pose: origin, atmosphere: 1, focus: 0 });
    expect(sample(.19).pose.yaw / DEG).toBeCloseTo(180);
    expect(sample(.38).pose.position).toEqual(origin.position);
    const middle = sample(.49);
    expect(middle.pose.position[0]).toBeGreaterThan(0);
    expect(middle.pose.position[0]).toBeLessThan(45);
    expect(middle.atmosphere).toBeGreaterThan(0);
    expect(middle.atmosphere).toBeLessThan(1);
    expect(middle.focus).toBeGreaterThan(0);
    expect(middle.focus).toBeLessThan(1);
    expect(sample(1)).toEqual({ pose: arrival, atmosphere: 0, focus: 1 });
  });

  it('starts on the Earth-facing side even when a constellation’s depth dwarfs its distance', () => {
    expect(constellationTour([10, 0, 0], [1, 0, 0], 100, 0)[0]).toBeCloseTo(2);
  });

  it('adapts the label budget to screen area and rejects collisions and clipped text', () => {
    expect(stellarLabelBudget(0, 1350, 840)).toBe(0);
    expect(stellarLabelBudget(3, 1350, 840)).toBeGreaterThan(stellarLabelBudget(2, 1350, 840));
    expect(stellarLabelBudget(3, 390, 664)).toBeLessThan(stellarLabelBudget(3, 1350, 840));
    const occupied = [{ x: 80, y: 52, width: 54 }];
    expect(labelFits({ x: 135, y: 56, width: 42 }, occupied, 390, 664)).toBe(false);
    expect(labelFits({ x: 135, y: 73, width: 42 }, occupied, 390, 664)).toBe(true);
    expect(labelFits({ x: 370, y: 56, width: 42 }, occupied, 390, 664)).toBe(false);
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
