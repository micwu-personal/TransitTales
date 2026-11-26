import type { Vec } from './catalog';
import snapshots from './spacecraft-snapshots.json';

// Public domain NASA/JPL Horizons vectors: https://ssd.jpl.nasa.gov/horizons/
// Data rights: https://ssd.jpl.nasa.gov/faq.html. Exact source queries are in the JSON.
// These outbound trajectory segments include modeled/predicted positions, not live telemetry.
const AU_PER_PC = 648000 / Math.PI;
const MS_PER_DAY = 86_400_000;
const catalogEpoch = new Date('2026-01-01T00:00:00Z');
const names = {
  'voyager-1': ['Voyager 1', '旅行者1号'],
  'voyager-2': ['Voyager 2', '旅行者2号'],
  'new-horizons': ['New Horizons', '新视野号'],
} as const;
type SpacecraftId = keyof typeof names;
type State = { time: number; position: Vec; velocity: Vec };

function state([date, x, y, z, vx, vy, vz]: (string | number)[]): State {
  return {
    time: Date.parse(date as string),
    position: [Number(x) / AU_PER_PC, Number(y) / AU_PER_PC, Number(z) / AU_PER_PC],
    velocity: [Number(vx) / AU_PER_PC, Number(vy) / AU_PER_PC, Number(vz) / AU_PER_PC],
  };
}

// NASA records the photograph at 04:48 GMT: https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot/
const paleBlueDot = state(snapshots.historical.samples[0]);
export const paleBlueDotDate = new Date(paleBlueDot.time).toISOString();
export const paleBlueDotPosition: Vec = paleBlueDot.position;

const ids = Object.keys(names) as SpacecraftId[];
const trajectories = new Map<string, State[]>(ids.map(id => [id, snapshots.missions[id].samples.map(state)]));
const voyager1 = trajectories.get('voyager-1')!;
// Use the exact exposure epoch as a knot, not a one-off discontinuity.
voyager1.splice(1, 0, paleBlueDot);

function limitTime(states: State[], date: Date): number {
  return Math.max(states[0].time, Math.min(states[states.length - 1].time, date.getTime()));
}

/** Effective UTC time after clamping to the downloaded trajectory's coverage. */
export function spacecraftEpoch(id: string, date: Date): Date | undefined {
  const states = trajectories.get(id);
  if (!states || !Number.isFinite(date.getTime())) return undefined;
  return new Date(limitTime(states, date));
}

/** Heliocentric ICRF equatorial position in parsecs. Never extrapolates. */
export function spacecraftPosition(id: string, date: Date): Vec | undefined {
  const states = trajectories.get(id);
  if (!states || !Number.isFinite(date.getTime())) return undefined;
  const time = limitTime(states, date);
  const next = states.findIndex(sample => sample.time >= time);
  const b = states[next];
  if (b.time === time) return b.position;
  const a = states[next - 1];
  // Cubic Hermite interpolation uses the Horizons velocity at both endpoints.
  const days = (b.time - a.time) / MS_PER_DAY;
  const u = (time - a.time) / (b.time - a.time);
  const s = u * u * (3 - 2 * u);
  const h0 = days * u * (1 - u) ** 2;
  const h1 = days * u * u * (u - 1);
  const axis = (i: 0 | 1 | 2) => (1 - s) * a.position[i] + s * b.position[i] + h0 * a.velocity[i] + h1 * b.velocity[i];
  return [axis(0), axis(1), axis(2)];
}

export const spacecraftDestinations: { id: SpacecraftId; name: string; zh: string; kind: 'spacecraft'; position: Vec }[] =
  ids.map(id => ({ id, name: names[id][0], zh: names[id][1], kind: 'spacecraft', position: spacecraftPosition(id, catalogEpoch)! }));
