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

export type Pose = { position: Vec; yaw: number; pitch: number; zoom: number };
export type TourShot = { pose: Pose; atmosphere: number; focus: number };

export function blendPose(from: Pose, to: Pose, t: number): Pose {
  return {
    position: lerp(from.position, to.position, t),
    yaw: easeAngle(from.yaw, to.yaw, t),
    pitch: from.pitch + (to.pitch - from.pitch) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
  };
}

// First find the shape from Earth, then move into its depth. The same shot can run backwards.
export function constellationPassage(origin: Pose, bearing: Pose, arrival: Pose, progress: number): TourShot {
  const turn = smooth(clamp(progress / .38, 0, 1));
  const travel = smooth(clamp((progress - .38) / .62, 0, 1));
  const atmosphere = 1 - smooth(clamp((progress - (bearing.pitch < 0 ? .05 : .28)) / .47, 0, 1));
  return {
    pose: progress < .38 ? blendPose(origin, bearing, turn) : blendPose(bearing, arrival, travel),
    atmosphere,
    focus: smooth(clamp((progress - .19) / .72, 0, 1)),
  };
}

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

export function cameraRoll(from: Frame, pose: Pose, to: Frame) {
  const eye = camera(from, pose.yaw, pose.pitch, 1, 1);
  const bearing = angles(to, eye.forward);
  const base = camera(to, bearing.yaw, bearing.pitch, 1, 1);
  return { ...bearing, roll: Math.atan2(dot(eye.right, base.up), dot(eye.right, base.right)) };
}

export function flightPassage(from: Pose, aim: Pose, approach: Vec, to: Pose, progress: number, near: number) {
  const turn = smooth(clamp(progress / .22, 0, 1));
  const cruise = smooth(clamp((progress - .22) / .57, 0, 1));
  const settle = smooth(clamp((progress - .79) / .21, 0, 1));
  const range = length(sub(approach, from.position));
  // Reserve screen time for the last few AU or parsecs rather than rushing past the destination.
  const ratio = Math.min(1e7, range / near);
  const advance = ratio > 1 ? -Math.expm1(-Math.log1p(ratio) * cruise) * (1 + 1 / ratio) : cruise;
  const pose = progress < .22 ? blendPose(from, aim, turn) : blendPose(aim, to, settle);
  pose.position = progress < .79 ? lerp(from.position, approach, advance) : lerp(approach, to.position, settle);
  return pose;
}

export function apparentMagnitude(absolute: number, distancePc: number) {
  return absolute + 5 * Math.log10(Math.max(distancePc, 1e-10) / 10);
}

export function approachRange(viewRadius: number, angle: number) {
  return viewRadius / Math.tan(angle);
}

// Orbit on the incoming side first, then travel inside the group's distance range.
export function constellationTour(center: Vec, radial: Vec, span: number, t: number, earthRange = length(center)): Vec {
  const side = unit(cross(Math.abs(radial[2]) > .92 ? [0, 1, 0] : [0, 0, 1], radial));
  const orbit = smooth(t);
  const angle = orbit * 2.65;
  // Start between Earth and the group, even when distant outliers make its span large.
  const range = Math.min(span * 1.65, earthRange * .8) * (1 - orbit) + span * .67 * orbit;
  return add(center, add(scale(radial, -Math.cos(angle) * range), scale(side, Math.sin(angle) * range)));
}
