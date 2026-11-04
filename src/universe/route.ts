import { DESTINATIONS, EPOCHS } from './catalog';
import { coordinateBodies, type Vec3 } from './coordinates';
import { aberratedCosine, angularDoppler, smooth } from './flight';
import { sourceFrequency, cruiseEstimate } from './physics';
import type { SceneKind, UniverseSnapshot } from './view';

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const multiply = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: Vec3): number => Math.hypot(...a);
export const normalize = (a: Vec3): Vec3 => length(a) > 1e-30 ? multiply(a, 1 / length(a)) : [0, 0, 1];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => add(multiply(a, 1 - t), multiply(b, t));
const clamp = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
const catalogue = new Map(DESTINATIONS.map(d => [d.id, d]));
const bodies = coordinateBodies();
const anchors = new Map(bodies.map(body => [body.id, body]));
const coordinateBody = (id: string) => {
  const body = anchors.get(id);
  if (!body) throw new RangeError(`Unknown coordinate body: ${id}`);
  return body;
};

// Guided detours are explicit visits, never objects silently placed on a straight ray.
const solar = ['sun', 'mercury', 'venus', 'earth', 'mars', 'asteroids', 'jupiter', 'saturn', 'uranus', 'neptune', 'kuiper', 'oort'];
export function routeItinerary(from: string, to: string): readonly string[] {
  if (from === to) return [from];
  if ((from === 'earth' && to === 'moon') || (from === 'moon' && to === 'earth')) return [from, to];
  const a = solar.indexOf(from), b = solar.indexOf(to);
  if (a >= 0 && b >= 0) {
    const step = b > a ? 1 : -1, candidates: string[] = [];
    for (let i = a + step; i !== b; i += step) candidates.push(solar[i]);
    // A seven-second flight can present at most two intermediate flybys intelligibly.
    const stops = candidates.length <= 2 ? candidates : [candidates[0], candidates[candidates.length - 1]];
    return [from, ...stops, to];
  }
  if (a >= 0 && catalogue.has(to) && !['earth', 'solar'].includes(catalogue.get(to)!.group)) return [from, ...(a >= solar.indexOf('jupiter') ? [] : ['jupiter']), ...(from === 'oort' ? [] : ['oort']), to];
  return [from, to];
}

const comoving = new Set(['quasar', 'horizon', 'beyond']);
function vantage(id: string, expansion = 1): Vec3 {
  const body = coordinateBody(id);
  const radial = normalize(body.position);
  const side = normalize(cross(radial, Math.abs(radial[2]) > .9 ? [0, 1, 0] : [0, 0, 1]));
  // Fictional protected observation point, outside the physical body/region.
  const clearance = Math.max(body.radiusAU * 4.2, 1e-8);
  return add(comoving.has(id) ? multiply(body.position, expansion) : body.position, multiply(normalize(add(side, [0, 0, .32])), clearance));
}

export interface RouteObject {
  readonly id: string;
  readonly kind: SceneKind;
  readonly color: string;
  readonly evidence: string;
  readonly distanceAU: number;
  readonly direction: Vec3;
  readonly angularRadius: number;
  readonly factor: number;
  readonly srFactor?: number;
  readonly gravitationalFactor?: number;
  readonly cosmologicalFactor?: number;
  readonly brightness: number;
  readonly formed: number;
}
export interface RouteFrame {
  readonly itinerary: readonly string[];
  readonly leg: number;
  readonly legProgress: number;
  readonly cameraAU: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly velocity: Vec3;
  readonly beta: number;
  readonly ageGyr: number;
  readonly epochCoordinate: number;
  readonly expansion: number;
  readonly temperatureK: number;
  readonly structure: number;
  readonly objects: readonly RouteObject[];
}

// Nonuniform *screen time*, not superluminal physical cruise: resolve close views
// at both endpoints without erasing the actual astronomical distance between them.
export function distanceFraction(t: number, distance: number, resolution: number): number {
  const p = clamp(t), k = Math.min(40, Math.max(2, Math.log(Math.max(1, distance / Math.max(1e-20, resolution)))));
  return p <= .5 ? .5 * Math.expm1(2 * p * k) / Math.expm1(k) : 1 - .5 * Math.expm1(2 * (1 - p) * k) / Math.expm1(k);
}

function directionBetween(a: Vec3, b: Vec3, t: number): Vec3 {
  const cosine = Math.max(-1, Math.min(1, dot(a, b)));
  if (cosine > .999) return normalize(mix(a, b, t));
  const angle = Math.acos(cosine);
  const residual = subtract(b, multiply(a, cosine));
  const tangent = length(residual) > 1e-12 ? normalize(residual) : normalize(cross(a, Math.abs(a[2]) > .9 ? [0, 1, 0] : [0, 0, 1]));
  return normalize(add(multiply(a, Math.cos(angle * t)), multiply(tangent, Math.sin(angle * t))));
}

function travelPose(fromId: string, toId: string, t: number, expansion: number) {
  const positionOf = (id: string): Vec3 => comoving.has(id) ? multiply(coordinateBody(id).position, expansion) : coordinateBody(id).position;
  const start = vantage(fromId, expansion), end = vantage(toId, expansion), displacement = subtract(end, start);
  const resolution = Math.min(coordinateBody(fromId).radiusAU, coordinateBody(toId).radiusAU);
  const distance = length(displacement), f = distanceFraction(t, distance, resolution), back = distanceFraction(1 - t, distance, resolution), bend: Vec3 = [0, 0, distance * .08];
  // Compute both small tails directly: 1-f and sin(π*f) lose local precision
  // when a galaxy-scale journey finishes beside a small planetary destination.
  const cameraAU = add(add(multiply(start, back), multiply(end, f)), multiply(bend, Math.sin(Math.PI * (t <= .5 ? f : back))));
  const velocity = normalize(add(displacement, multiply(bend, Math.PI * Math.cos(Math.PI * f))));
  const forward = directionBetween(normalize(subtract(positionOf(fromId), cameraAU)), normalize(subtract(positionOf(toId), cameraAU)), smooth(t));
  return { cameraAU, velocity, forward };
}

const routePoles = new Map<string, Vec3>();
function routePole(itinerary: readonly string[]): Vec3 {
  const key = itinerary.join('>'), cached = routePoles.get(key);
  if (cached) return cached;
  const directions: Vec3[] = [];
  for (let leg = 0; leg < Math.max(1, itinerary.length - 1); leg++) for (let i = 0; i <= 32; i++) {
    directions.push(travelPose(itinerary[leg], itinerary[Math.min(leg + 1, itinerary.length - 1)], i / 32, 1).forward);
  }
  const score = (pole: Vec3) => Math.max(...directions.map(direction => Math.abs(dot(direction, pole))));
  let pole: Vec3 = [0, 0, 1], best = score(pole);
  // Keep one safe reference for the whole route; switching poles mid-flight causes a roll snap.
  if (best > .9) for (const candidate of [[0, 1, 0], [1, 0, 0], [1, 1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, -1]] as const) {
    const normalized = normalize(candidate), value = score(normalized);
    if (value < best) { pole = normalized; best = value; }
  }
  routePoles.set(key, pole);
  return pole;
}

const frameCache = new Map<string, RouteFrame>();
export function routeFrame(snapshot: UniverseSnapshot): RouteFrame {
  const cacheKey = `${snapshot.destinationId}|${snapshot.epoch}|${snapshot.origin?.destinationId}|${snapshot.origin?.epoch}|${snapshot.beta}|${snapshot.progress}|${snapshot.travelling}|${snapshot.coordinateView}|${snapshot.reducedMotion}`;
  const cached = frameCache.get(cacheKey);
  if (cached) return cached;
  const origin = snapshot.coordinateView && !snapshot.travelling ? snapshot : snapshot.origin ?? snapshot;
  const itinerary = routeItinerary(origin.destinationId, snapshot.destinationId);
  // Reduced motion uses discrete stationary observation stops, no sweep or beaming.
  const raw = clamp(snapshot.progress), p = snapshot.reducedMotion ? Math.floor(raw * Math.max(1, itinerary.length - 1)) / Math.max(1, itinerary.length - 1) : raw;
  const count = Math.max(1, itinerary.length - 1), leg = Math.min(count - 1, Math.floor(p * count)), t = Math.min(1, p * count - leg);
  const fromEpoch = Math.max(0, EPOCHS.findIndex(e => e.id === origin.epoch)), toEpoch = Math.max(0, EPOCHS.findIndex(e => e.id === snapshot.epoch));
  const epochCoordinate = fromEpoch + (toEpoch - fromEpoch) * smooth(snapshot.reducedMotion ? p : raw);
  const low = Math.min(EPOCHS.length - 1, Math.floor(epochCoordinate)), high = Math.min(EPOCHS.length - 1, low + 1), eraFraction = epochCoordinate - low;
  const ageGyr = EPOCHS[low].ageGyr + (EPOCHS[high].ageGyr - EPOCHS[low].ageGyr) * eraFraction;
  // Toy expansion, not a measured history or light-cone solution. Local Group
  // galaxies and other gravitationally bound systems do not expand with the field.
  const expansion = ageGyr <= 13.8 ? Math.max(.00025, Math.pow(Math.max(1e-12, ageGyr) / 13.8, 2 / 3)) : Math.exp(Math.min(4, (ageGyr - 13.8) / 16));
  const positionOf = (id: string): Vec3 => comoving.has(id) ? multiply(coordinateBody(id).position, expansion) : coordinateBody(id).position;
  const fromId = itinerary[leg], toId = itinerary[Math.min(leg + 1, itinerary.length - 1)];
  const { cameraAU, velocity, forward } = travelPose(fromId, toId, t, expansion);
  const pole = routePole(itinerary), baseRight = normalize(cross(forward, pole));
  const endpointRoll = (at: number) => {
    const direction = travelPose(fromId, toId, at, expansion).forward;
    const base = normalize(cross(direction, pole)), canonical = normalize(cross(direction, [0, 0, 1]));
    return Math.atan2(dot(cross(base, canonical), direction), dot(base, canonical));
  };
  const startRoll = endpointRoll(0), endRoll = endpointRoll(1);
  const deltaRoll = Math.atan2(Math.sin(endRoll - startRoll), Math.cos(endRoll - startRoll));
  const roll = startRoll + deltaRoll * smooth(t);
  const right = normalize(add(multiply(baseRight, Math.cos(roll)), multiply(cross(forward, baseRight), Math.sin(roll))));
  const up = normalize(cross(right, forward));
  const beta = itinerary.length > 1 && !snapshot.reducedMotion && Number.isFinite(snapshot.beta) ? Math.min(.9999, Math.max(0, snapshot.beta)) * smooth(t / .22) * smooth((1 - t) / .22) : 0;
  const objects = bodies.map(body => {
    const item = catalogue.get(body.id)!;
    // Current catalogue anchors are used ONLY as a labelled reconstruction template.
    const position = positionOf(body.id);
    const delta = subtract(position, cameraAU), distanceAU = Math.max(1e-30, length(delta)), direction = normalize(delta), mu = dot(direction, velocity);
    const srFactor = angularDoppler(beta, mu), observedMu = aberratedCosine(beta, mu);
    const source = sourceFrequency(body.id, item.kind, distanceAU, item.lookbackGyr, ageGyr, length(body.position));
    const factor = srFactor * source.gravitational * source.cosmological;
    const transverse = normalize(subtract(direction, multiply(velocity, mu)));
    const observed = normalize(add(multiply(velocity, observedMu), multiply(transverse, Math.sqrt(Math.max(0, 1 - observedMu * observedMu)))));
    const formed = ageGyr < item.formedGyr ? 0 : smooth((ageGyr - item.formedGyr) / Math.min(.34, Math.max(1e-9, (13.8 - item.formedGyr) * .1)));
    return { id: body.id, kind: item.kind, color: body.color, evidence: body.evidence, distanceAU,
      direction: [dot(observed, right), dot(observed, up), dot(observed, forward)] as Vec3,
      angularRadius: Math.min(.6, Math.asin(Math.min(.95, body.radiusAU / distanceAU)) / srFactor), factor,
      srFactor, gravitationalFactor: source.gravitational, cosmologicalFactor: source.cosmological,
      brightness: Math.min(2, Math.max(.12, factor ** 3)), formed };
  });
  const frame = { itinerary, leg, legProgress: t, cameraAU, forward, right, up, velocity, beta, ageGyr, epochCoordinate, expansion,
    temperatureK: 2.7255 / expansion, structure: smooth((ageGyr - .05) / .25), objects };
  if (frameCache.size >= 12) frameCache.delete(frameCache.keys().next().value!);
  frameCache.set(cacheKey, frame);
  return frame;
}

export function routeTravelEstimate(snapshot: UniverseSnapshot, frame = routeFrame(snapshot)) {
  const origin = snapshot.origin ?? snapshot;
  const itinerary = routeItinerary(origin.destinationId, snapshot.destinationId);
  let distanceAU = 0;
  for (let leg = 0; leg < itinerary.length - 1; leg++) {
    const from = itinerary[leg], to = itinerary[leg + 1];
    const portion = !snapshot.travelling || leg < frame.leg ? 1 : leg === frame.leg
      ? distanceFraction(frame.legProgress, length(subtract(vantage(to, frame.expansion), vantage(from, frame.expansion))), Math.min(coordinateBody(from).radiusAU, coordinateBody(to).radiusAU)) : 0;
    const delta = subtract(vantage(to, frame.expansion), vantage(from, frame.expansion)), displacement = length(delta);
    if (displacement === 0) continue;
    let arc = 0;
    for (let i = 0; i < 64; i++) {
      const bend = .08 * Math.PI * Math.cos(Math.PI * portion * (i + .5) / 64);
      arc += Math.sqrt(1 + 2 * delta[2] / displacement * bend + bend * bend);
    }
    distanceAU += displacement * portion * arc / 64;
  }
  return { distanceAU, ...cruiseEstimate(distanceAU, snapshot.beta) };
}

export function projectDirection(direction: Vec3, focal = 850): { x: number; y: number; visible: boolean } {
  const z = Math.max(.001, direction[2]);
  return { x: 500 + focal * direction[0] / z, y: 310 - focal * direction[1] / z, visible: direction[2] > .02 };
}

// Fixed comoving knots: their separation changes with cosmic scale factor, their
// visibility with first-star formation. Procedural knots are labelled illustration.
export const COSMIC_KNOTS: readonly Vec3[] = Array.from({ length: 96 }, (_, i) => {
  const angle = i * 2.399963229728653, mu = 1 - 2 * (i + .5) / 96, r = 2 + (i % 13) * .8;
  return [Math.cos(angle) * Math.sqrt(1 - mu * mu) * r, Math.sin(angle) * Math.sqrt(1 - mu * mu) * r, mu * r] as Vec3;
});
export function cosmicKnot(point: Vec3, frame: RouteFrame): Vec3 {
  return multiply(point, Math.pow(frame.expansion, .3));
}
