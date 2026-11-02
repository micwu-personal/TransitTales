import { DESTINATIONS, EPOCHS } from './catalog';
import type { UniverseLocation, UniverseSnapshot } from './view';

const unit = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
const velocity = (v: number) => Math.min(.9999, unit(v));
export const smooth = (v: number): number => { const t = unit(v); return t * t * (3 - 2 * t); };
const formation = new Map(DESTINATIONS.map(d => [d.id, d.formedGyr]));
export interface FlightLayer {
  readonly location: UniverseLocation;
  readonly opacity: number;
  readonly scale: number;
  readonly offset: number;
}
export interface FlightFrame {
  readonly layers: readonly FlightLayer[];
  readonly progress: number;
  readonly visualBeta: number;
  readonly skyTravel: number;
  readonly space: boolean;
  readonly time: boolean;
}

// Angles describe the direction TO a source in the stationary sky, from the
// forward velocity axis. These are exact SR relations, not a spectral renderer.
export function angularDoppler(beta: number, sourceCosine: number): number {
  const b = velocity(beta), mu = Number.isFinite(sourceCosine) ? Math.max(-1, Math.min(1, sourceCosine)) : 0;
  return (1 + b * mu) / Math.sqrt(1 - b * b);
}
export function aberratedCosine(beta: number, sourceCosine: number): number {
  const b = velocity(beta), mu = Number.isFinite(sourceCosine) ? Math.max(-1, Math.min(1, sourceCosine)) : 0;
  return Math.max(-1, Math.min(1, (mu + b) / (1 + b * mu)));
}
// Artistic false-color mapping of frequency ratio, deliberately bounded.
export function dopplerTint(factor: number): readonly [number, number, number] {
  const shift = Math.max(-1, Math.min(1, Math.log2(Math.max(1e-4, factor)) / 3));
  return shift >= 0 ? [1 - .42 * shift, 1 - .12 * shift, 1] : [1, 1 + .32 * shift, 1 + .55 * shift];
}

function eras(location: UniverseLocation, coordinate: number, opacity: number, scale: number, offset: number): FlightLayer[] {
  const low = Math.floor(coordinate), high = Math.min(EPOCHS.length - 1, low + 1), fraction = coordinate - low;
  const start = EPOCHS[low], end = EPOCHS[high];
  const age = start.ageGyr + (end.ageGyr - start.ageGyr) * fraction;
  const formed = formation.get(location.destinationId) ?? 0;
  // Never reveal a modern object before its rounded formation boundary.
  const mix = end.ageGyr > start.ageGyr && formed > start.ageGyr && formed <= end.ageGyr
    ? smooth((age - formed) / (end.ageGyr - formed)) : smooth(fraction);
  const layers: FlightLayer[] = [];
  if (opacity * (1 - mix) > 0) layers.push({ location: { ...location, epoch: start.id }, opacity: opacity * (1 - mix), scale, offset });
  if (opacity * mix > 0) layers.push({ location: { ...location, epoch: end.id }, opacity: opacity * mix, scale, offset });
  return layers;
}

export function flightFrame(snapshot: UniverseSnapshot): FlightFrame {
  const target: UniverseLocation = { destinationId: snapshot.destinationId, kind: snapshot.kind, color: snapshot.color, epoch: snapshot.epoch };
  const origin = snapshot.travelling && snapshot.origin ? snapshot.origin : target;
  const p = snapshot.travelling ? unit(snapshot.progress) : 1;
  const space = origin.destinationId !== target.destinationId, time = origin.epoch !== target.epoch;
  const from = Math.max(0, EPOCHS.findIndex(e => e.id === origin.epoch)), to = Math.max(0, EPOCHS.findIndex(e => e.id === target.epoch));
  // Equal screen-time per cosmic epoch is illustrative, not uniform physical time.
  const coordinate = from + (to - from) * smooth(p);
  const reduced = snapshot.reducedMotion;
  const departure = reduced ? 1 - smooth(p) : 1 - smooth(p / .36);
  const arrival = reduced ? smooth(p) : smooth((p - .62) / .38);
  let layers: FlightLayer[];
  if (!space) layers = eras(target, coordinate, 1, 1, 0);
  else layers = [
    ...eras(origin, coordinate, departure, reduced ? 1 : 1 - .82 * smooth(p / .4), reduced || p === 0 ? 0 : -3.6 * smooth(p / .4)),
    ...eras(target, coordinate, arrival, reduced ? 1 : .16 + .84 * smooth((p - .58) / .42), 0),
  ];
  // Cruise clocks still use the chosen beta. This acceleration envelope and the
  // seven-second camera movement are fictional demonstrations, not trajectories.
  const envelope = space ? smooth(p / .2) * (1 - smooth((p - .8) / .2)) : 0;
  return { layers, progress: p, space, time, visualBeta: reduced || !snapshot.travelling ? 0 : snapshot.origin ? velocity(snapshot.beta) * envelope : velocity(snapshot.beta), skyTravel: space && !reduced ? p : 0 };
}

// A fixed-size deterministic shared sky. Both renderers use the same source
// angles and progress displacement; no accumulated phase or wall-clock drift.
export const FLIGHT_STARS = Object.freeze(Array.from({ length: 160 }, (_, i) => {
  const mu = 1 - 2 * (i + .5) / 160, azimuth = i * 2.399963229728653;
  return Object.freeze({ mu, azimuth, depth: ((i * 73) % 157) / 157, size: .65 + (i % 5) * .23 });
}));
export function flightStar(star: typeof FLIGHT_STARS[number], frame: FlightFrame): { x: number; y: number; z: number; factor: number; trail: number } {
  const mu = aberratedCosine(frame.visualBeta, star.mu), radial = Math.sqrt(Math.max(0, 1 - mu * mu));
  const depth = 1 + ((star.depth - frame.skyTravel * 3) % 1 + 1) % 1;
  return { x: Math.cos(star.azimuth) * radial * depth, y: Math.sin(star.azimuth) * radial * depth, z: mu * depth, factor: angularDoppler(frame.visualBeta, star.mu), trail: frame.skyTravel > 0 && frame.progress < 1 ? frame.visualBeta * .025 : 0 };
}
