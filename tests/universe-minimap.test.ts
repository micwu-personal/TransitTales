import { describe, expect, it } from 'vitest';
import { DESTINATIONS, EPOCHS } from '../src/universe/catalog';
import { coordinateBody, LIGHT_YEAR_AU, type Vec3 } from '../src/universe/coordinates';
import { MAP_EXTRA_BODIES, MAP_SCOPES, MAP_SOURCES, interpolateMapViewport, projectMap, universeMap, validateMapRadius, type MapData, type MapScope } from '../src/universe/minimap';
import { length, routeFrame, subtract } from '../src/universe/route';
import type { UniverseSnapshot } from '../src/universe/view';

function snapshot(to = 'earth', progress = 0, from = 'earth', epoch: UniverseSnapshot['epoch'] = 'present', fromEpoch: UniverseSnapshot['epoch'] = 'present'): UniverseSnapshot {
  const a = DESTINATIONS.find(body => body.id === from)!, b = DESTINATIONS.find(body => body.id === to)!;
  return { destinationId: to, kind: b.kind, color: b.color, epoch, origin: { destinationId: from, kind: a.kind, color: a.color, epoch: fromEpoch },
    beta: .65, travelling: true, progress, paused: false, reducedMotion: false };
}
const options = (scope: MapScope = 'adaptive', radiusLy = 5) => ({ scope, radiusLy });
const ids = (data: MapData) => data.markers.map(marker => marker.id);
const contained = (position: Vec3, data: MapData) => length(subtract(position, data.viewport.center)) / data.viewport.radiusAU <= 1 + 1e-12;

function assertFinite(data: MapData) {
  expect([...data.viewport.center, data.viewport.radiusAU, ...data.location, data.ageGyr, data.horizonRadiusAU!].every(Number.isFinite)).toBe(true);
  expect(data.viewport.radiusAU).toBeGreaterThan(0);
  for (const marker of data.markers) {
    expect(marker.position.every(Number.isFinite)).toBe(true);
    expect(contained(marker.position, data)).toBe(true);
    const projected = projectMap(marker.position, data.viewport);
    expect([projected.x, projected.y].every(Number.isFinite)).toBe(true);
    expect(projected.outside).toBe(false);
  }
  const location = projectMap(data.location, data.viewport);
  expect([location.x, location.y].every(Number.isFinite)).toBe(true);
  expect(Math.hypot(location.x, location.y)).toBeLessThanOrEqual(1 + 1e-12);
}

describe('astronomical minimap model', () => {
  it('offers adaptive by default and distinct Virgo and Laniakea scopes', () => {
    expect(MAP_SCOPES).toEqual(['adaptive', 'nearby', 'earth-moon', 'solar', 'milky-way', 'local-group', 'virgo', 'laniakea', 'universe']);
    expect(MAP_EXTRA_BODIES.map(body => body.id)).toEqual(['m33', 'smc', 'virgo-cluster', 'norma-cluster']);
    expect(MAP_SOURCES.every(source => source.name.length > 0 && source.url.startsWith('https://'))).toBe(true);
    expect(MAP_EXTRA_BODIES.every(body => body.source!.urls.length > 0 && body.evidence !== 'illustrative')).toBe(true);
    expect(MAP_EXTRA_BODIES.find(body => body.id === 'norma-cluster')!.source!.notes).toContain('cz/H0');
  });

  it('shows M33 once and uses its destination coordinates rather than the former extra anchor', () => {
    const data = universeMap(snapshot('m33', 1), options('local-group'));
    const markers = data.markers.filter(marker => marker.id === 'm33');
    expect(markers).toHaveLength(1);
    expect(markers[0].position).toEqual(coordinateBody('m33').position);
  });

  it('uses the exact flight camera, including pause and reduced-motion stops', () => {
    for (const to of ['moon', 'neptune', 'andromeda', 'quasar', 'horizon', 'beyond']) for (const progress of [0, .17, .333, .5, .83, 1]) {
      for (const reducedMotion of [false, true]) {
        const current = { ...snapshot(to, progress, 'earth', 'bang'), reducedMotion, paused: true };
        const data = universeMap(current, options());
        expect(data.location).toEqual(routeFrame(current).cameraAU);
        expect(data.ageGyr).toBe(routeFrame(current).ageGyr);
      }
    }
  });

  it('shows the planned extent without moving a stationary actual location to the selected target', () => {
    const current = { ...snapshot('earth'), travelling: false };
    const planned = snapshot('neptune', 0);
    const data = universeMap(current, options(), planned);
    expect(data.location).toEqual(routeFrame({ ...current, origin: undefined, progress: 0 }).cameraAU);
    expect(data.location).not.toEqual(routeFrame(snapshot('neptune', 1)).cameraAU);
    expect(data.path).toBe(universeMap(planned, options()).path);
    expect(data.viewport).toBe(universeMap(planned, options()).viewport);
    const arrived = { ...snapshot('neptune', 1), travelling: false };
    expect(universeMap(arrived, options()).location).toEqual(routeFrame({ ...arrived, origin: undefined, progress: 0 }).cameraAU);
  });

  it('keeps adaptive extent and full guided path cached independent of progress or speed', () => {
    const initial = universeMap(snapshot('neptune'), options());
    expect(ids(initial)).toEqual(expect.arrayContaining(['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']));
    for (let i = 0; i <= 100; i++) {
      const current = { ...snapshot('neptune', i / 100), beta: i / 101, paused: i % 2 === 0, reducedMotion: i % 3 === 0 };
      const data = universeMap(current, options());
      expect(data.viewport).toBe(initial.viewport);
      expect(data.path).toBe(initial.path);
      expect(contained(data.location, data)).toBe(true);
    }
    for (const position of initial.path) expect(contained(position, initial)).toBe(true);
    expect(initial.path.some(position => position[2] > 1)).toBe(true);
    const otherEpoch = universeMap(snapshot('neptune', 0, 'earth', 'bang'), options());
    expect(otherEpoch.path).not.toBe(initial.path);
  });

  it('encloses every guided sample and unsampled camera across cosmological and reconstructed time scales', () => {
    for (const [from, to, fromEpoch, epoch] of [
      ['earth', 'moon', 'present', 'present'], ['earth', 'neptune', 'bang', 'far'],
      ['earth', 'local-group', 'far', 'bang'], ['earth', 'quasar', 'far', 'bang'],
      ['quasar', 'earth', 'bang', 'far'], ['horizon', 'beyond', 'far', 'bang'],
      ['beyond', 'horizon', 'bang', 'far'], ['quasar', 'quasar', 'bang', 'far'],
      ['milky-way', 'andromeda', 'far', 'present'],
    ] as const) {
      const first = universeMap(snapshot(to, 0, from, epoch, fromEpoch), options());
      for (const position of first.path) expect(contained(position, first), `${from} -> ${to}`).toBe(true);
      for (let i = 0; i <= 113; i++) {
        const current = snapshot(to, i / 113, from, epoch, fromEpoch);
        expect(contained(routeFrame(current).cameraAU, first), `${from} -> ${to}, ${i}`).toBe(true);
        expect(universeMap(current, options()).viewport).toBe(first.viewport);
      }
    }
  });

  it('gives Earth–Moon, solar, galactic and group scopes meaningful physical anchor inclusions', () => {
    const current = snapshot();
    const earthMoon = universeMap(current, options('earth-moon'));
    expect(earthMoon.viewport.radiusAU).toBeGreaterThan(.002);
    expect(ids(earthMoon)).toEqual(expect.arrayContaining(['earth', 'moon']));
    expect(ids(earthMoon)).not.toContain('sun');
    for (let i = 0; i <= 60; i++) expect(contained(routeFrame(snapshot('moon', i / 60)).cameraAU, earthMoon)).toBe(true);
    const solar = universeMap(current, options('solar'));
    expect(solar.viewport.radiusAU).toBe(60);
    expect(ids(solar)).toEqual(expect.arrayContaining(['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']));
    expect(ids(solar)).not.toContain('proxima');
    const galaxy = universeMap(current, options('milky-way'));
    expect(galaxy.viewport.center).toEqual(coordinateBody('milky-way').position);
    expect(galaxy.viewport.radiusAU / LIGHT_YEAR_AU).toBe(60000);
    expect(ids(galaxy)).toEqual(expect.arrayContaining(['earth', 'proxima', 'nebula', 'cluster', 'sagittarius', 'milky-way']));
    expect(ids(galaxy)).not.toContain('andromeda');
    const group = universeMap(current, options('local-group'));
    expect(ids(group)).toEqual(expect.arrayContaining(['milky-way', 'andromeda', 'm33', 'magellanic', 'smc']));
    expect(ids(group)).not.toContain('virgo-cluster');
  });

  it('separates the approximate Virgo envelope from the much larger Laniakea envelope', () => {
    const virgo = universeMap(snapshot(), options('virgo')), laniakea = universeMap(snapshot(), options('laniakea'));
    expect(virgo.viewport.radiusAU / LIGHT_YEAR_AU).toBe(55e6);
    expect(laniakea.viewport.radiusAU / LIGHT_YEAR_AU).toBe(260e6);
    expect(ids(virgo)).toEqual(expect.arrayContaining(['earth', 'milky-way', 'andromeda', 'm33', 'virgo-cluster']));
    expect(ids(virgo)).not.toContain('norma-cluster');
    expect(ids(laniakea)).toEqual(expect.arrayContaining(['earth', 'andromeda', 'virgo-cluster', 'norma-cluster']));
    expect(ids(laniakea)).not.toContain('quasar');
  });

  it('centres nearby at the current camera and filters by 3D sphere rather than projected depth', () => {
    const current = snapshot(), frame = routeFrame(current), body = coordinateBody('proxima-b');
    const relative = subtract(body.position, frame.cameraAU), xy = Math.hypot(relative[0], relative[1]), full = length(relative);
    expect(full).toBeGreaterThan(xy);
    const radiusAU = (xy + full) / 2;
    const data = universeMap(current, options('nearby', radiusAU / LIGHT_YEAR_AU));
    expect(data.viewport.center).toEqual(frame.cameraAU);
    expect(projectMap(body.position, data.viewport).outside).toBe(false);
    expect(ids(data)).not.toContain('proxima-b');
    expect(ids(universeMap(current, options('nearby', 5)))).toContain('proxima-b');
    expect(universeMap(snapshot('neptune', .67), options('nearby')).viewport.center).toEqual(routeFrame(snapshot('neptune', .67)).cameraAU);
  });

  it('validates finite numeric nearby radii without coercing strings or infinity', () => {
    for (const value of [NaN, Infinity, -Infinity, '5', '', undefined, null, {}, true]) expect(validateMapRadius(value)).toBe(5);
    expect(validateMapRadius(0)).toBe(.001);
    expect(validateMapRadius(-1)).toBe(.001);
    expect(validateMapRadius(1e12)).toBe(1e11);
    expect(validateMapRadius(.125)).toBe(.125);
  });

  it('keeps bound systems fixed, marks unformed objects as ghosts and omits unmeasured boundaries', () => {
    const now = universeMap(snapshot(), options('universe'));
    const early = universeMap(snapshot('earth', 1, 'earth', 'bang'), options('universe'));
    const future = universeMap(snapshot('earth', 1, 'earth', 'far'), options('universe'));
    expect(early.markers.find(marker => marker.id === 'earth')!.formed).toBe(false);
    expect(early.markers.find(marker => marker.id === 'm33')!.formed).toBe(false);
    expect(now.markers.find(marker => marker.id === 'earth')!.formed).toBe(true);
    expect(now.markers.find(marker => marker.id === 'm33')!.formed).toBe(true);
    const earlyBound = universeMap(snapshot('earth', 1, 'earth', 'bang'), options('laniakea'));
    for (const id of ['earth', 'andromeda', 'm33', 'smc', 'virgo-cluster', 'norma-cluster']) {
      expect(earlyBound.markers.find(marker => marker.id === id)!.position).toEqual(now.markers.find(marker => marker.id === id)!.position);
      expect(future.markers.find(marker => marker.id === id)!.position).toEqual(now.markers.find(marker => marker.id === id)!.position);
    }
    expect(ids(early)).not.toContain('virgo-cluster');
    for (const data of [now, early, future]) {
      expect(ids(data)).not.toContain('beyond');
      expect(ids(data)).not.toContain('horizon');
    }
    expect(now.horizonRadiusAU! / LIGHT_YEAR_AU).toBeCloseTo(46.5e9, 3);
    expect(future.horizonRadiusAU).toBeGreaterThan(now.horizonRadiusAU!);
    expect(early.horizonRadiusAU).toBeLessThan(now.horizonRadiusAU!);
    const outside = universeMap(snapshot('beyond', 1), options('universe'));
    expect(projectMap(outside.location, outside.viewport).outside).toBe(true);
    expect(outside.location).toEqual(routeFrame(snapshot('beyond', 1)).cameraAU);
  });

  it('projects onto a finite normalized circular rim and consistently omits depth', () => {
    const view = { center: [1, 2, 3] as Vec3, radiusAU: 10 };
    expect(projectMap([1, 2, 1e12], view)).toEqual({ x: 0, y: -0, outside: false });
    expect(projectMap([1, 12, 3], view)).toEqual({ x: 0, y: -1, outside: false });
    const outside = projectMap([11, 12, 3], view);
    expect(outside.outside).toBe(true);
    expect(Math.hypot(outside.x, outside.y)).toBeCloseTo(1);
    for (const position of [[1e308, -1e308, 0], [-1e308, 1e308, 0], [NaN, Infinity, 0]] as const) {
      const result = projectMap(position, { center: [-1e308, 1e308, 0], radiusAU: 1e-300 });
      expect([result.x, result.y].every(Number.isFinite)).toBe(true);
    }
  });

  it('interpolates centre continuously and radius logarithmically over every scale', () => {
    const a = { center: [1, 2, 3] as Vec3, radiusAU: .002 }, b = { center: [1e17, -1e17, 2e17] as Vec3, radiusAU: 1e18 };
    expect(interpolateMapViewport(a, b, 0)).toBe(a);
    expect(interpolateMapViewport(a, b, 1)).toBe(b);
    expect(interpolateMapViewport(a, b, NaN)).toBe(a);
    expect(interpolateMapViewport(a, b, -1)).toBe(a);
    expect(interpolateMapViewport(a, b, 2)).toBe(b);
    const middle = interpolateMapViewport(a, b, .5);
    expect(middle.radiusAU / Math.sqrt(a.radiusAU * b.radiusAU)).toBeCloseTo(1, 12);
    expect(middle.center).toEqual([a.center[0] / 2 + b.center[0] / 2, a.center[1] / 2 + b.center[1] / 2, a.center[2] / 2 + b.center[2] / 2]);
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const view = interpolateMapViewport(a, b, i / 100);
      expect([...view.center, view.radiusAU].every(Number.isFinite)).toBe(true);
      expect(view.radiusAU).toBeGreaterThanOrEqual(last);
      last = view.radiusAU;
    }
    const huge = interpolateMapViewport({ center: [1e308, 1e308, 1e308], radiusAU: 1e-300 }, { center: [-1e308, -1e308, -1e308], radiusAU: 1e300 }, .5);
    expect([...huge.center, huge.radiusAU].every(Number.isFinite)).toBe(true);
  });

  it('stays finite for all destinations, eras, scopes and hostile progress/radius inputs', () => {
    for (const destination of DESTINATIONS) for (const epoch of EPOCHS) {
      const current = snapshot(destination.id, .413, 'earth', epoch.id);
      for (const scope of MAP_SCOPES) assertFinite(universeMap(current, options(scope)));
    }
    for (const progress of [NaN, Infinity, -Infinity, -10, 10]) {
      for (const radius of [NaN, Infinity, -Infinity, 0, -5, 1e308]) assertFinite(universeMap(snapshot('horizon', progress), options('nearby', radius)));
    }
  }, 30000);
});
