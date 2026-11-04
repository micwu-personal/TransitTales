import { coordinateBodies, coordinateBody, equatorialToEcliptic, LIGHT_YEAR_AU, PARSEC_AU, type CoordinateBody, type Vec3 } from './coordinates';
import { length, routeFrame, routeItinerary, subtract } from './route';
import type { UniverseLocation, UniverseSnapshot } from './view';

export type MapScope = 'adaptive' | 'nearby' | 'earth-moon' | 'solar' | 'milky-way' | 'local-group' | 'virgo' | 'laniakea' | 'universe';
export const MAP_SCOPES: readonly MapScope[] = Object.freeze(['adaptive', 'nearby', 'earth-moon', 'solar', 'milky-way', 'local-group', 'virgo', 'laniakea', 'universe']);
export interface MapViewport { readonly center: Vec3; readonly radiusAU: number }
export interface MapMarker {
  readonly id: string;
  readonly position: Vec3;
  readonly color: string;
  readonly evidence: CoordinateBody['evidence'];
  readonly formed: boolean;
}
export interface MapData {
  readonly viewport: MapViewport;
  readonly location: Vec3;
  readonly ageGyr: number;
  readonly markers: readonly MapMarker[];
  readonly path: readonly Vec3[];
  readonly horizonRadiusAU?: number;
}

const MESSIER = 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/';
const SIMBAD = 'https://simbad.cfa.harvard.edu/simbad/sim-id?Ident=';
export const MAP_SOURCES: readonly { readonly name: string; readonly url: string }[] = Object.freeze([
  { name: 'NASA: Triangulum / M33 (approximately 3 million ly)', url: `${MESSIER}messier-33/` },
  { name: 'NASA: M87 / Virgo cluster (approximately 54 million ly)', url: `${MESSIER}messier-87/` },
  { name: 'ESA/Hubble: Small Magellanic Cloud (approximately 200,000 ly)', url: 'https://esahubble.org/images/potw1642a/' },
  { name: 'SIMBAD: M33 J2000 direction', url: `${SIMBAD}M33&output.format=ASCII` },
  { name: 'SIMBAD: SMC J2000 direction', url: `${SIMBAD}SMC&output.format=ASCII` },
  { name: 'SIMBAD: M87 J2000 direction', url: `${SIMBAD}M87&output.format=ASCII` },
  { name: 'SIMBAD: Norma cluster direction and redshift', url: `${SIMBAD}ACO%203627&output.format=ASCII` },
  { name: 'Tully et al. (2014): Laniakea flow-defined supercluster', url: 'https://arxiv.org/abs/1409.0880' },
  { name: 'NRAO: Laniakea approximately 500 million ly across', url: 'https://public.nrao.edu/news/supercluster-gbt/' },
].map(source => Object.freeze(source)));

/**
 * Sparse present-day reference anchors, NOT a membership catalogue or an ancient
 * galaxy-position/formation prediction. ICRS directions are treated as J2000;
 * all positions use the same Sun-centred ecliptic AU frame as coordinateBodies.
 * SIMBAD directions checked 2026-11-02; distances and region radii are rounded.
 */
function extra(id: string, name: string, ra: number, dec: number, distanceAU: number, radiusLy: number, color: string, evidence: CoordinateBody['evidence'], urls: readonly string[], notes: string): CoordinateBody {
  return Object.freeze({ id, position: Object.freeze(equatorialToEcliptic(ra, dec, distanceAU)), radiusAU: radiusLy * LIGHT_YEAR_AU,
    color, kind: id === 'm33' || id === 'smc' ? 'galaxy' : 'region', evidence,
    source: Object.freeze({ name, urls: Object.freeze([...urls]), referenceYear: 2000,
      notes: `Static approximate present reference; no proper motion or ancient/future evolution. Extent is representative, not a surface. ${notes}` }) });
}
export const MAP_EXTRA_BODIES: readonly CoordinateBody[] = Object.freeze([
  extra('m33', 'Triangulum galaxy / M33', 15 * (1 + 33 / 60 + 50.8966 / 3600), 30 + 39 / 60 + 36.6304 / 3600,
    3e6 * LIGHT_YEAR_AU, 30000, '#a8c7ef', 'catalogue', [MAP_SOURCES[0].url, MAP_SOURCES[3].url], 'NASA rounded 3 million ly; SIMBAD ICRS centre.'),
  extra('smc', 'Small Magellanic Cloud', 15 * (52 / 60 + 38 / 3600), -(72 + 48 / 60 + 1 / 3600),
    200000 * LIGHT_YEAR_AU, 8000, '#8fd9c7', 'catalogue', [MAP_SOURCES[2].url, MAP_SOURCES[4].url], 'ESA/Hubble rounded 200,000 ly; SIMBAD approximate centre.'),
  extra('virgo-cluster', 'Virgo cluster / M87 reference', 15 * (12 + 30 / 60 + 49.4234 / 3600), 12 + 23 / 60 + 28.0437 / 3600,
    54e6 * LIGHT_YEAR_AU, 5e6, '#e0bf96', 'inferred', [MAP_SOURCES[1].url, MAP_SOURCES[5].url], 'Cluster proxy at measured M87 direction and NASA rounded M87 distance; not the Virgo Supercluster centre or its boundary.'),
  extra('norma-cluster', 'Norma cluster / Abell 3627 reference', 15 * (16 + 14 / 60 + 22.5 / 3600), -(60 + 52 / 60 + 7 / 3600),
    (4880.62 / 70) * 1e6 * PARSEC_AU, 5e6, '#d3a4bf', 'inferred', [MAP_SOURCES[6].url, MAP_SOURCES[7].url],
    'Approximate low-redshift distance cz/H0, SIMBAD cz=4880.62 km/s, assumed H0=70 km/s/Mpc. Peculiar velocities matter; not a precision distance. Representative cluster near the Great Attractor, not a measured Great Attractor point or Laniakea barycentre.'),
]);

const destinations = coordinateBodies();
const bodies = Object.freeze([...destinations, ...MAP_EXTRA_BODIES.filter(extra => !destinations.some(destination => destination.id === extra.id))]);
const comoving = new Set(['quasar', 'horizon', 'beyond']);
const solarPlanets = bodies.filter(body => body.evidence === 'ephemeris');
const point = (x: number, y: number, z: number): Vec3 => Object.freeze([x, y, z] as const);
const midpoint = (a: Vec3, b: Vec3): Vec3 => point(a[0] / 2 + b[0] / 2, a[1] / 2 + b[1] / 2, a[2] / 2 + b[2] / 2);
const viewport = (center: Vec3, radiusAU: number): MapViewport => Object.freeze({ center, radiusAU });
const earth = coordinateBody('earth'), moon = coordinateBody('moon');
const fixed: Partial<Record<MapScope, MapViewport>> = {
  'earth-moon': viewport(midpoint(earth.position, moon.position), Math.max(.0021, length(subtract(earth.position, moon.position)) * .9)),
  solar: viewport(point(0, 0, 0), 60),
  'milky-way': viewport(coordinateBody('milky-way').position, 60000 * LIGHT_YEAR_AU),
  'local-group': viewport(coordinateBody('local-group').position, 5e6 * LIGHT_YEAR_AU),
  // Illustrative envelopes, not measured supercluster membership/boundaries.
  // Virgo: ~110 million ly diameter, centre halfway towards its M87 proxy.
  virgo: viewport(midpoint(point(0, 0, 0), MAP_EXTRA_BODIES[2].position), 55e6 * LIGHT_YEAR_AU),
  // Laniakea: ~160 Mpc / 520 million ly diameter order. Norma is a proxy
  // reference centre; the real flow-defined watershed is not a sphere.
  laniakea: viewport(MAP_EXTRA_BODIES[3].position, 260e6 * LIGHT_YEAR_AU),
};

export function validateMapRadius(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(.001, Math.min(1e11, value)) : 5;
}
const fraction = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const validRadius = (value: number) => Number.isFinite(value) && value > 0 ? value : 1;
const finite = (value: number) => Number.isFinite(value) ? value : 0;

/** Fixed ecliptic XY, +Y upwards (negative screen y); depth is omitted visually.
 * Off-map locations project to the circular rim, with outside=true. Ordinary
 * markers are separately filtered by their actual 3D distance, not this disc.
 */
export function projectMap(position: Vec3, view: MapViewport): { x: number; y: number; outside: boolean } {
  const radius = validRadius(view.radiusAU);
  const delta = (a: number, b: number) => {
    const d = finite(a) - finite(b), ratio = Number.isFinite(d) ? d / radius : finite(a) / radius - finite(b) / radius;
    return Number.isFinite(ratio) ? ratio : Math.sign(d) * Number.MAX_VALUE;
  };
  const x = delta(position[0], view.center[0]), y = -delta(position[1], view.center[1]);
  const size = Math.hypot(x, y);
  if (size <= 1) return { x, y, outside: false };
  const scale = Math.max(Math.abs(x), Math.abs(y)), unit = Math.hypot(x / scale, y / scale);
  return { x: x / scale / unit, y: y / scale / unit, outside: true };
}

/** Radius follows a geometric interpolation, avoiding an abrupt all-scale zoom. */
export function interpolateMapViewport(from: MapViewport, to: MapViewport, progress: number): MapViewport {
  const t = fraction(progress);
  if (t === 0) return from;
  if (t === 1) return to;
  return viewport(point(...from.center.map((value, index) => finite(value) * (1 - t) + finite(to.center[index]) * t) as [number, number, number]),
    Math.exp(Math.log(validRadius(from.radiusAU)) * (1 - t) + Math.log(validRadius(to.radiusAU)) * t));
}

function stationary(snapshot: UniverseSnapshot, location: UniverseLocation = snapshot): UniverseSnapshot {
  return { ...snapshot, ...location, origin: undefined, travelling: false, progress: 0, reducedMotion: false };
}
interface JourneyMap { readonly viewport: MapViewport; readonly path: readonly Vec3[] }
const journeys = new Map<string, JourneyMap>();

function journeyMap(snapshot: UniverseSnapshot): JourneyMap {
  const origin = snapshot.origin ?? snapshot;
  const key = `${origin.destinationId}:${origin.epoch}>${snapshot.destinationId}:${snapshot.epoch}`;
  const cached = journeys.get(key);
  if (cached) return cached;
  const itinerary = routeItinerary(origin.destinationId, snapshot.destinationId);
  const points: Vec3[] = [], path: Vec3[] = [];
  let bend = 0;
  // Every endpoint vantage is affine in expansion. Expansion stays between its
  // epoch endpoints. Their convex hull encloses ALL leg positions in XY; a
  // conservative +z bound covers route.ts's .08*leg-distance sinusoidal bend.
  // This is an analytic envelope, not a sampling-only containment claim.
  for (const epoch of [origin.epoch, snapshot.epoch]) {
    const vantages = itinerary.map(destinationId => routeFrame(stationary(snapshot, { ...snapshot, destinationId, epoch })).cameraAU);
    points.push(...vantages);
    for (let i = 1; i < vantages.length; i++) bend = Math.max(bend, length(subtract(vantages[i], vantages[i - 1])) * .08);
  }
  const fromBody = coordinateBody(origin.destinationId), toBody = coordinateBody(snapshot.destinationId);
  if (solarPlanets.some(body => body.id === fromBody.id) && solarPlanets.some(body => body.id === toBody.id)) {
    // Context includes planets with orbital radii between the endpoints, even
    // when the compressed guided itinerary visits only two of them.
    const low = Math.min(length(fromBody.position), length(toBody.position)), high = Math.max(length(fromBody.position), length(toBody.position));
    points.push(...solarPlanets.filter(body => length(body.position) >= low && length(body.position) <= high).map(body => body.position));
  }
  // Include the actual anchors, not only protected camera observation points.
  const startExpansion = routeFrame(stationary(snapshot, origin)).expansion;
  const endExpansion = routeFrame(stationary(snapshot)).expansion;
  for (const id of itinerary) for (const expansion of [startExpansion, endExpansion]) {
    const body = coordinateBody(id);
    if (id !== 'beyond' && id !== 'horizon') points.push(comoving.has(id) ? point(...body.position.map(value => value * expansion) as [number, number, number]) : body.position);
  }
  const low = [0, 1, 2].map(axis => Math.min(...points.map(p => p[axis])));
  const high = [0, 1, 2].map(axis => Math.max(...points.map(p => p[axis])));
  high[2] += bend;
  const center = midpoint(low as unknown as Vec3, high as unknown as Vec3);
  const radius = Math.max(1e-7, Math.hypot(...high.map((value, axis) => (value - low[axis]) / 2)) * 1.15);
  const legs = Math.max(1, itinerary.length - 1), samples = 128 * legs;
  for (let i = 0; i <= samples; i++) path.push(Object.freeze(routeFrame({ ...snapshot, origin, progress: i / samples, reducedMotion: false }).cameraAU));
  const result = Object.freeze({ viewport: viewport(center, radius), path: Object.freeze(path) });
  // Bounded memoization: changing speed, progress, pause, or reduced motion does
  // not rebuild an extent/path, and repeated plans cannot grow memory unbounded.
  if (journeys.size >= 32) journeys.delete(journeys.keys().next().value!);
  journeys.set(key, result);
  return result;
}

/**
 * Scientific scope is a sphere; display is its ecliptic XY projection. Bound
 * systems retain their reference coordinates in every era, matching route.ts.
 * Universe radius = 46.5 Gly * route toy expansion: an observable-universe era
 * SKETCH, NOT true particle-horizon evolution or a finite whole-universe claim.
 * Horizon is a radius, not a catalogue object. Beyond is unobserved/unknown:
 * never publish its fictional route position as a measured map marker. A
 * speculative travelling observer/path may still follow the scene camera.
 */
export function universeMap(snapshot: UniverseSnapshot, options: { scope: MapScope; radiusLy: number }, planned?: UniverseSnapshot): MapData {
  const frame = routeFrame(snapshot.travelling ? snapshot : stationary(snapshot));
  const journey = journeyMap(snapshot.travelling ? snapshot : planned ?? stationary(snapshot));
  const horizonRadiusAU = 46.5e9 * LIGHT_YEAR_AU * frame.expansion;
  const view = options.scope === 'nearby' ? viewport(frame.cameraAU, validateMapRadius(options.radiusLy) * LIGHT_YEAR_AU)
    : options.scope === 'universe' ? viewport(point(0, 0, 0), horizonRadiusAU)
      : fixed[options.scope] ?? journey.viewport;
  const formed = new Map(frame.objects.map(object => [object.id, object.formed > 0]));
  const markers = bodies.flatMap(body => {
    if (body.id === 'beyond' || body.id === 'horizon') return [];
    const position = comoving.has(body.id) ? point(...body.position.map(value => value * frame.expansion) as [number, number, number]) : body.position;
    if (length(subtract(position, view.center)) > view.radiusAU) return [];
    // Extra present-day clusters/galaxies have no fitted formation histories:
    // treat all pre-present appearances as future reference anchors (ghosts).
    return [Object.freeze({ id: body.id, position, color: body.color, evidence: body.evidence,
      formed: formed.get(body.id) ?? frame.ageGyr >= 13.8 })];
  });
  return Object.freeze({ viewport: view, location: frame.cameraAU, ageGyr: frame.ageGyr, markers: Object.freeze(markers), path: journey.path, horizonRadiusAU });
}
