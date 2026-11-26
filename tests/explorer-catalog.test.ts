import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { constellations, destinations, loadCatalog, objectName, solarSystem, type Vec } from '../src/explorer/catalog';

const AU_PER_PC = 648000 / Math.PI;
const DEGREES = 180 / Math.PI;
const KM_PER_PC = 3.08567758149e13;
const norm = (v: Vec) => Math.hypot(...v);
const subtract = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const separation = (a: Vec, b: Vec) => Math.atan2(norm(cross(a, b)), dot(a, b)) * DEGREES;

async function loadFixture() {
  const stars = await readFile(new URL('../public/explorer/stars.json', import.meta.url), 'utf8');
  const fetchStub = vi.fn().mockResolvedValue(new Response(stars));
  vi.stubGlobal('fetch', fetchStub);
  const catalog = await loadCatalog();
  expect(fetchStub).toHaveBeenCalledWith(expect.stringMatching(/\/explorer\/stars\.json$/));
  return new Map(catalog.map(entry => [entry.id, entry]));
}

afterEach(() => vi.unstubAllGlobals());

describe('explorer catalog', () => {
  it('loads genuine stars in equatorial parsecs with their visual photometry', async () => {
    const catalog = await loadFixture();
    const stars = [...catalog.values()].filter(o => o.kind === 'star');
    expect(stars.filter(s => s.mag <= 6.5).length).toBeGreaterThan(8500);
    expect(stars.every(s => s.position.every(Number.isFinite) && norm(s.position) > 0 && norm(s.position) < 100000 &&
      Number.isFinite(s.mag) && s.absolute !== undefined && Math.abs(s.absolute - (s.mag - 5 * Math.log10(norm(s.position) / 10))) < .005)).toBe(true);
    const sirius = catalog.get('hip-32349')!;
    expect(sirius.name).toBe('Sirius');
    expect(sirius.mag).toBe(-1.44);
    expect(sirius.absolute).toBeCloseTo(1.454, 3);
    expect(sirius.bv).toBeCloseTo(.009, 3);
    expect(norm(sirius.position)).toBeCloseTo(2.6371, 3);
    expect(Math.atan2(sirius.position[1], sirius.position[0]) * DEGREES / 15).toBeCloseTo(6.752481, 5);
    expect(Math.asin(sirius.position[2] / norm(sirius.position)) * DEGREES).toBeCloseTo(-16.716116, 4);
    expect(norm(catalog.get('hip-70890')!.position)).toBeCloseTo(1.2959, 3);
    expect(catalog.get('hyg-118720')?.name).toBe('Wolf 359');
  });

  it('localizes sourced star names without replacing English names or designations', async () => {
    const catalog = await loadFixture();
    for (const [id, en, zh] of [
      ['hip-24608', 'Capella', '五车二'],
      ['hip-21421', 'Aldebaran', '毕宿五'],
      ['hip-102098', 'Deneb', '天津四'],
      ['hip-39953', 'Gam2Vel', '天社一'],
      ['hip-11767', 'Polaris', '北极星'],
    ]) {
      const star = catalog.get(id)!;
      expect(star).toMatchObject({ id, name: en, zh });
      expect(objectName(star, 'en')).toBe(en);
      expect(objectName(star, 'zh')).toBe(zh);
    }
    for (const [id, designation] of [['hip-48774', 'Phi Vel'], ['hip-108431', 'Del Ind'], ['hyg-118360', 'Gl 194B']]) {
      const star = catalog.get(id)!;
      expect(star.zh).toBeUndefined();
      expect(objectName(star, 'zh')).toBe(designation);
      expect(objectName(star, 'en')).toBe(designation);
    }
    expect([...catalog.values()].filter(star => star.kind === 'star' && star.zh).length).toBeGreaterThan(2700);
  });

  it('uses only observed star IDs for its 88 representative figures', async () => {
    const catalog = await loadFixture();
    expect(constellations).toHaveLength(88);
    expect(new Set(constellations.map(c => c.id)).size).toBe(88);
    expect(constellations.filter(c => c.id === 'Ser')).toHaveLength(1);
    expect(constellations.find(c => c.id === 'Ori')?.lines.flat()).toEqual(expect.arrayContaining(['hip-27989', 'hip-24436']));
    for (const shape of constellations) {
      expect(shape.zh).toMatch(/座$/);
      expect(shape.lines.length).toBeGreaterThan(0);
      const keys = new Set<string>();
      for (const [a, b] of shape.lines) {
        const key = [a, b].sort().join(':');
        expect(a !== b && !keys.has(key) && catalog.get(a)?.kind === 'star' && catalog.get(b)?.kind === 'star').toBe(true);
        keys.add(key);
      }
    }
  });

  it('links nearby stars, real host markers, and distant tour points', async () => {
    const catalog = await loadFixture();
    expect(destinations[0].id).toBe('earth');
    const solar = solarSystem(new Date('2024-04-08T18:42Z'), 0, 0);
    for (const stop of destinations) {
      const staticObject = catalog.get(stop.id);
      if (staticObject) expect(staticObject.position).toEqual(stop.position);
      else expect(solar.objects.some(object => object.id === stop.id)).toBe(true);
    }
    for (const id of ['proxima-b', 'trappist-1-b', '51-peg-b', 'kepler-186-f']) {
      const planet = catalog.get(id)!;
      expect(planet.kind).toBe('exoplanet');
      expect(planet.name).toMatch(/host marker/);
      expect(planet.radiusKm).toBeUndefined();
    }
    expect(catalog.get('m42')?.kind).toBe('nebula');
    expect(catalog.get('m45')?.kind).toBe('cluster');
    expect(catalog.get('sgr-a')?.mag).toBe(Infinity);
    expect(norm(catalog.get('m31')!.position)).toBeGreaterThan(700000);
    expect(norm(catalog.get('3c273')!.position)).toBeCloseTo(652e6, 0);
  });

  it('rejects missing payloads without preventing a retry', async () => {
    const fetchStub = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response('[]'));
    vi.stubGlobal('fetch', fetchStub);
    await expect(loadCatalog()).rejects.toThrow(/503/);
    await expect(loadCatalog()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'm42' })]));
  });
});

describe('explorer ephemeris', () => {
  const eclipse = new Date('2024-04-08T18:42:00Z');

  it('provides heliocentric geometric positions, physical radii and date-dependent magnitudes', () => {
    const first = solarSystem(eclipse, 32.78, -96.8);
    const later = solarSystem(new Date('2024-07-08T18:42:00Z'), 32.78, -96.8);
    const byId = new Map(first.objects.map(object => [object.id, object]));
    const earth = byId.get('earth')!;
    expect([...byId.keys()].sort()).toEqual(['earth', 'jupiter', 'mars', 'mercury', 'moon', 'neptune', 'saturn', 'sun', 'uranus', 'venus']);
    expect(earth.position).toEqual(first.earth);
    expect(earth.radiusKm).toBe(6371);
    expect(earth.mag).toBe(Infinity);
    expect(norm(first.earth) * AU_PER_PC).toBeCloseTo(1, 1);
    expect(byId.get('sun')!.position).toEqual([0, 0, 0]);
    expect(byId.get('sun')!.mag).toBeCloseTo(-26.7, 0);
    expect(byId.get('moon')!.radiusKm).toBe(1737.4);
    expect(byId.get('moon')!.mag).toBeLessThan(-3);
    expect(norm(subtract(byId.get('moon')!.position, first.earth)) * KM_PER_PC).toBeGreaterThan(350000);
    expect(norm(subtract(byId.get('moon')!.position, first.earth)) * KM_PER_PC).toBeLessThan(410000);
    expect(norm(subtract(first.earth, later.earth)) * AU_PER_PC).toBeGreaterThan(1);
    expect(later.objects.find(o => o.id === 'mars')!.position).not.toEqual(byId.get('mars')!.position);
    expect(later.objects.find(o => o.id === 'moon')!.mag).not.toBeCloseTo(byId.get('moon')!.mag);
  });

  it('retains localized names on the live solar system objects', () => {
    const { objects } = solarSystem(eclipse, 0, 0);
    const byId = new Map(objects.map(object => [object.id, object]));
    for (const [id, en, zh] of [
      ['sun', 'Sun', '太阳'],
      ['moon', 'Moon', '月球'],
      ['earth', 'Earth', '地球'],
      ['jupiter', 'Jupiter', '木星'],
    ]) {
      const body = byId.get(id)!;
      expect(body).toMatchObject({ id, name: en, zh });
      expect(objectName(body, 'en')).toBe(en);
      expect(objectName(body, 'zh')).toBe(zh);
    }
  });

  it('provides an oriented local horizon and resolves lunar parallax', () => {
    const texas = solarSystem(eclipse, 32.78, -96.8);
    const other = solarSystem(eclipse, 32.78, -6.8);
    for (const v of [texas.up, texas.north, texas.east]) expect(norm(v)).toBeCloseTo(1, 10);
    expect(dot(texas.up, texas.north)).toBeCloseTo(0, 10);
    expect(dot(texas.up, texas.east)).toBeCloseTo(0, 10);
    expect(dot(cross(texas.east, texas.north), texas.up)).toBeCloseTo(1, 10);
    const observerOffset = subtract(texas.observer, texas.earth);
    expect(norm(observerOffset) * KM_PER_PC).toBeGreaterThan(6350);
    expect(dot(observerOffset, texas.up) / norm(observerOffset)).toBeGreaterThan(.9999);
    const moon = texas.objects.find(o => o.id === 'moon')!.position;
    const lunarDirection = subtract(moon, texas.observer);
    const sunDirection = subtract([0, 0, 0], texas.observer);
    const sunAltitude = 90 - separation(sunDirection, texas.up);
    expect(sunAltitude).toBeGreaterThan(60);
    expect(sunAltitude).toBeLessThan(70);
    expect(separation(sunDirection, lunarDirection)).toBeLessThan(.3);
    expect(separation(lunarDirection, subtract(moon, other.observer))).toBeGreaterThan(.5);
  });
});
