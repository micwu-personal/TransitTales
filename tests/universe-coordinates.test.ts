import { describe, expect, it } from 'vitest';
import { DESTINATIONS } from '../src/universe/catalog';
import {
  AU_KM, DEFAULT_REFERENCE_YEAR, J2000_OBLIQUITY_DEGREES, LIGHT_YEAR_AU, PARSEC_AU,
  coordinateBodies, coordinateBody, equatorialToEcliptic, solveKepler, type Vec3,
} from '../src/universe/coordinates';

const length = (v: Vec3) => Math.hypot(...v);
const difference = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const PLANET_BOUNDS = [
  ['mercury', 0.30, 0.47], ['venus', 0.71, 0.74], ['earth', 0.98, 1.02], ['mars', 1.37, 1.67],
  ['jupiter', 4.94, 5.46], ['saturn', 9.00, 10.08], ['uranus', 18.2, 20.2], ['neptune', 29.7, 30.4],
] as const;

describe('astronomical coordinate catalogue', () => {
  it('covers every existing destination exactly once with finite AU coordinates and source status', () => {
    const bodies = coordinateBodies();
    expect(bodies).toHaveLength(28);
    expect(new Set(bodies.map(body => body.id)).size).toBe(28);
    expect(bodies.map(body => body.id).sort()).toEqual(DESTINATIONS.map(body => body.id).sort());
    for (const body of bodies) {
      expect(body.position).toHaveLength(3);
      expect(body.position.every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(body.radiusAU)).toBe(true);
      expect(body.radiusAU).toBeGreaterThan(0);
      expect(['planet', 'star', 'region', 'compact', 'galaxy']).toContain(body.kind);
      expect(['ephemeris', 'catalogue', 'inferred', 'illustrative']).toContain(body.evidence);
      expect(body.source?.notes.length).toBeGreaterThan(20);
      expect(body.color).toBe(DESTINATIONS.find(destination => destination.id === body.id)!.color);
      expect(coordinateBody(body.id)).toEqual(body);
    }
    expect(() => coordinateBody('not-an-object')).toThrow(RangeError);
  });

  it('uses physical AU units, not normalized scene units or Earth-centred coordinates', () => {
    expect(AU_KM).toBe(149597870.7);
    expect(LIGHT_YEAR_AU).toBeCloseTo(63241.07708427, 7);
    expect(PARSEC_AU).toBeCloseTo(206264.8062471, 6);
    expect(coordinateBody('sun').position).toEqual([0, 0, 0]);
    expect(coordinateBody('earth').radiusAU * AU_KM).toBeCloseTo(6371.0084, 6);
    expect(coordinateBody('jupiter').radiusAU * AU_KM).toBeCloseTo(69911, 6);
    expect(coordinateBody('moon').radiusAU * AU_KM).toBeCloseTo(1740, 6);
    expect(coordinateBody('neutron').radiusAU * AU_KM).toBeCloseTo(12, 8);
    expect(length(coordinateBody('earth').position)).toBeGreaterThan(0.98);
    expect(length(coordinateBody('earth').position)).toBeLessThan(1.02);
  });

  it.each([1800, 1900, 2000, DEFAULT_REFERENCE_YEAR, 2050])('has plausible planet and lunar distances at %s', year => {
    const bodies = coordinateBodies(year);
    for (const [id, min, max] of PLANET_BOUNDS) {
      const planet = bodies.find(body => body.id === id)!;
      expect(length(planet.position)).toBeGreaterThan(min);
      expect(length(planet.position)).toBeLessThan(max);
      expect(planet.evidence).toBe('ephemeris');
      expect(planet.source?.referenceYear).toBe(year);
    }
    const lunarDistanceKm = length(difference(coordinateBody('moon', year).position, coordinateBody('earth', year).position)) * AU_KM;
    expect(lunarDistanceKm).toBeGreaterThan(360000);
    expect(lunarDistanceKm).toBeLessThan(410000);
  });

  it('places Earth near the known J2000 seasonal direction and models eccentric radial variation', () => {
    const earth = coordinateBody('earth', 2000).position;
    expect(earth[0]).toBeCloseTo(-0.177, 2);
    expect(earth[1]).toBeCloseTo(0.967, 2);
    expect(Math.abs(earth[2])).toBeLessThan(0.0001);
    expect(length(earth)).toBeCloseTo(0.9833, 3);
    expect(length(coordinateBody('earth', 2000.5).position)).toBeCloseTo(1.0167, 3);
    expect(Math.abs(coordinateBody('mercury', 2000).position[2])).toBeGreaterThan(0.01);
  });

  it('is deterministic at the fixed reference date, changes moving bodies, and preserves static J2000 anchors', () => {
    expect(DEFAULT_REFERENCE_YEAR).toBe(2026 + 305 / 365.25);
    expect(coordinateBodies()).toEqual(coordinateBodies(DEFAULT_REFERENCE_YEAR));
    const first = coordinateBodies(2026.5);
    coordinateBodies(2027);
    expect(coordinateBodies(2026.5)).toEqual(first);
    expect(coordinateBody('earth', 2026.5).position).not.toEqual(coordinateBody('earth', 2027).position);
    expect(coordinateBody('moon', 2026.5).position).not.toEqual(coordinateBody('moon', 2026.6).position);
    expect(coordinateBody('andromeda', 2026.5)).toEqual(coordinateBody('andromeda', 2027));
    expect(coordinateBody('proxima', 2026.5).source?.notes).toContain('no proper motion');
  });

  it.each([-13.8e9, 1799, 2051, 5e9])('clamps unsupported epoch %s without pretending it is a measured prediction', requested => {
    const effective = requested < 1800 ? 1800 : 2050;
    const bodies = coordinateBodies(requested);
    for (const id of [...PLANET_BOUNDS.map(([id]) => id), 'moon']) {
      const body = bodies.find(body => body.id === id)!;
      expect(body.position).toEqual(coordinateBody(id, effective).position);
      expect(body.evidence).toBe('illustrative');
      expect(body.source?.requestedReferenceYear).toBe(requested);
      expect(body.source?.referenceYear).toBe(effective);
      expect(body.source?.validYears).toEqual([1800, 2050]);
      expect(body.source?.notes).toContain('NOT an ephemeris');
    }
  });

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite reference year %s', year => {
    expect(() => coordinateBodies(year)).toThrow(RangeError);
    expect(() => coordinateBody('earth', year)).toThrow(RangeError);
  });

  it('distinguishes named catalogue objects, inferred regions, host anchors, and fictional directions', () => {
    for (const id of ['proxima', 'nebula', 'cluster', 'sagittarius', 'milky-way', 'magellanic', 'andromeda']) {
      expect(coordinateBody(id).evidence).toBe('catalogue');
      expect(coordinateBody(id).source?.urls.some(url => url.includes('simbad'))).toBe(true);
    }
    for (const id of ['asteroids', 'kuiper', 'oort', 'moon', 'proxima-b']) expect(coordinateBody(id).evidence).toBe('inferred');
    for (const id of ['comet', 'neutron', 'stellar-hole', 'local-group', 'quasar', 'horizon', 'beyond']) expect(coordinateBody(id).evidence).toBe('illustrative');
    expect(coordinateBody('moon').source?.notes).toContain('omitted solar perturbations');
    expect(coordinateBody('proxima-b').source?.notes).toContain('not planet radius');
    expect(coordinateBody('comet').source?.notes).toContain('no named comet');
    expect(coordinateBody('quasar').source?.notes).toContain('no measured redshift');
    expect(coordinateBody('horizon').source?.notes).toContain('not a measured target');
    expect(coordinateBody('beyond').source?.notes).toContain('no measured target point');
    expect(coordinateBody('asteroids').position).toEqual([2.7, 0, 0]);
    expect(coordinateBody('kuiper').position).toEqual([40, 0, 0]);
    expect(coordinateBody('oort').position).toEqual([50000, 0, 0]);
  });

  it('uses verified stellar parallax distances and a shared real Galactic Centre anchor', () => {
    expect(length(coordinateBody('proxima').position) / PARSEC_AU).toBeCloseTo(1000 / 750.81, 10);
    expect(length(coordinateBody('proxima-b').position) / PARSEC_AU).toBeCloseTo(1000 / 768.0665, 10);
    expect(length(difference(coordinateBody('proxima').position, coordinateBody('proxima-b').position))).toBeGreaterThan(10000);
    expect(coordinateBody('milky-way').position).toEqual(coordinateBody('sagittarius').position);
    expect(length(coordinateBody('sagittarius').position) / PARSEC_AU).toBeCloseTo(8178, 8);
    expect(length(coordinateBody('magellanic').position) / PARSEC_AU).toBeCloseTo(49590, 7);
    expect(length(coordinateBody('andromeda').position) / LIGHT_YEAR_AU).toBeCloseTo(2.5e6, 7);
    const ra = 15 * (17 + 45 / 60 + 40.03599 / 3600), dec = -(29 + 28.1699 / 3600);
    expect(coordinateBody('sagittarius').position).toEqual(equatorialToEcliptic(ra, dec, 8178 * PARSEC_AU));
  });

  it('returns frozen catalogue data so consumers cannot corrupt later routes', () => {
    const bodies = coordinateBodies();
    expect(Object.isFrozen(bodies)).toBe(true);
    for (const body of bodies) {
      expect(Object.isFrozen(body)).toBe(true);
      expect(Object.isFrozen(body.position)).toBe(true);
      expect(Object.isFrozen(body.source)).toBe(true);
      expect(Object.isFrozen(body.source?.urls)).toBe(true);
      if (body.source?.validYears) expect(Object.isFrozen(body.source.validYears)).toBe(true);
    }
  });
});

describe('J2000 coordinate maths', () => {
  it('converts equatorial basis directions with the correct obliquity sign and preserves AU distance', () => {
    const epsilon = J2000_OBLIQUITY_DEGREES * Math.PI / 180;
    expect(equatorialToEcliptic(0, 0, 1)).toEqual([1, 0, 0]);
    const y = equatorialToEcliptic(90, 0, 1), north = equatorialToEcliptic(0, 90, 1);
    expect(y[0]).toBeCloseTo(0, 14);
    expect(y[1]).toBeCloseTo(Math.cos(epsilon), 14);
    expect(y[2]).toBeCloseTo(-Math.sin(epsilon), 14);
    expect(north[1]).toBeCloseTo(Math.sin(epsilon), 14);
    expect(north[2]).toBeCloseTo(Math.cos(epsilon), 14);
    expect(equatorialToEcliptic(0, 0, 0)).toEqual([0, 0, 0]);
    for (const [ra, dec] of [[0, 0], [87, -43], [210, 65], [360, -90]]) {
      const v = equatorialToEcliptic(ra, dec, 15);
      expect(length(v)).toBeCloseTo(15, 12);
      const equatorialY = v[1] * Math.cos(epsilon) - v[2] * Math.sin(epsilon);
      const equatorialZ = v[1] * Math.sin(epsilon) + v[2] * Math.cos(epsilon);
      expect(equatorialY).toBeCloseTo(15 * Math.cos(dec * Math.PI / 180) * Math.sin(ra * Math.PI / 180), 12);
      expect(equatorialZ).toBeCloseTo(15 * Math.sin(dec * Math.PI / 180), 12);
    }
    for (const args of [[NaN, 0, 1], [0, Infinity, 1], [0, 91, 1], [0, -91, 1], [0, 0, -1], [0, 0, Infinity]]) {
      expect(() => equatorialToEcliptic(args[0], args[1], args[2])).toThrow(RangeError);
    }
  });

  it.each([0, 0.0167, 0.2056, 0.9, 0.999999])('solves bounded Kepler iterations for eccentricity %s', eccentricity => {
    for (const m of [-Math.PI, -2, -0.01, -1e-6, 0, 1e-6, 0.01, 1, Math.PI, 25]) {
      const e = solveKepler(m, eccentricity);
      const principal = Math.atan2(Math.sin(m), Math.cos(m));
      expect(Number.isFinite(e)).toBe(true);
      expect(e).toBeGreaterThanOrEqual(-Math.PI);
      expect(e).toBeLessThanOrEqual(Math.PI);
      expect(e - eccentricity * Math.sin(e)).toBeCloseTo(principal, 12);
    }
  });

  it('rejects nonelliptic or invalid Kepler inputs and has circular/perihelion symmetry', () => {
    expect(solveKepler(0.5, 0)).toBeCloseTo(0.5, 14);
    expect(solveKepler(0, 0.99)).toBe(0);
    expect(solveKepler(-1, 0.5)).toBeCloseTo(-solveKepler(1, 0.5), 14);
    for (const eccentricity of [-0.01, 1, 2, NaN, Infinity]) expect(() => solveKepler(0, eccentricity)).toThrow(RangeError);
    for (const anomaly of [NaN, Infinity, -Infinity]) expect(() => solveKepler(anomaly, 0.1)).toThrow(RangeError);
  });
});
