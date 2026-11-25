import type { Vec } from './catalog';

export const DEG = Math.PI / 180;
export const LY = 3.26156;
export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (v: Vec, s: number): Vec => [v[0] * s, v[1] * s, v[2] * s];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec) => Math.hypot(...a);
export const unit = (a: Vec) => scale(a, 1 / (length(a) || 1));
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const lerp = (a: Vec, b: Vec, t: number) => add(scale(a, 1 - t), scale(b, t));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const easeAngle = (a: number, b: number, t: number) => a + wrap(b - a) * t;

export type Frame = { up: Vec; north: Vec; east: Vec };
export const spaceFrame: Frame = { up: [0, 0, 1], north: [1, 0, 0], east: [0, -1, 0] };
export function direction(frame: Frame, yaw: number, pitch: number): Vec {
  return add(scale(frame.up, Math.sin(pitch)), scale(add(scale(frame.north, Math.cos(yaw)), scale(frame.east, Math.sin(yaw))), Math.cos(pitch)));
}

export function angles(frame: Frame, direction: Vec) {
  const v = unit(direction);
  return { yaw: Math.atan2(dot(v, frame.east), dot(v, frame.north)), pitch: Math.asin(clamp(dot(v, frame.up), -1, 1)) };
}

export function camera(frame: Frame, yaw: number, pitch: number, width: number, height: number, zoom = 1) {
  const forward = direction(frame, yaw, pitch);
  const right = direction(frame, yaw + Math.PI / 2, 0);
  const up = direction(frame, yaw, pitch + Math.PI / 2);
  const focal = Math.max(height * .64, width * .345) * zoom;
  return { forward, right, up, focal };
}

export function apparentMagnitude(absolute: number, distancePc: number) {
  return absolute + 5 * Math.log10(Math.max(distancePc, 1e-10) / 10);
}

export function approachRange(viewRadius: number, angle: number) {
  return viewRadius / Math.tan(angle);
}

// Orbit on the incoming side first, then travel inside the group's distance range.
export function constellationTour(center: Vec, radial: Vec, span: number, t: number): Vec {
  const side = unit(cross(Math.abs(radial[2]) > .92 ? [0, 1, 0] : [0, 0, 1], radial));
  const angle = smooth(t) * 2.65;
  const range = span * (1.65 - .98 * smooth(t));
  return add(center, add(scale(radial, -Math.cos(angle) * range), scale(side, Math.sin(angle) * range)));
}
