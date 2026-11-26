import { Body, GeoMoon, HelioVector, Illumination, MakeTime, Observer, ObserverVector,
  RotateVector, Rotation_HOR_EQJ, Vector } from 'astronomy-engine';
import index from './catalog-index.json';
import { chineseStarNames } from './star-names-zh';

export function objectName(object: { name: string; zh?: string }, locale: 'en' | 'zh'): string {
  return (locale === 'zh' && object.zh) || object.name;
}

export type Vec = readonly [number, number, number];
export type SkyObject = {
  id: string;
  name: string;
  zh?: string;
  kind: 'star' | 'planet' | 'moon' | 'sun' | 'nebula' | 'cluster' | 'black-hole' | 'galaxy' | 'quasar' | 'exoplanet';
  position: Vec;
  mag: number;
  absolute?: number;
  bv?: number;
  radiusKm?: number;
};

type Destination = { id: string; name: string; zh: string; kind: 'earth' | SkyObject['kind']; position: Vec };
type Constellation = { id: string; name: string; zh: string; lines: [string, string][] };
type StarRow = [id: string, name: string, x: number, y: number, z: number, mag: number, absolute: number, bv?: number];
type SolarBody = Omit<SkyObject, 'mag' | 'position' | 'zh'> & { body: Body; zh: string; radiusKm: number };

const AU_PER_PC = 648000 / Math.PI;
const LY_PER_PC = 3.261563777;
const ORIGIN: Vec = [0, 0, 0];
const SUN: SolarBody = { body: Body.Sun, id: 'sun', name: 'Sun', zh: '太阳', kind: 'sun', radiusKm: 695700, absolute: 4.81 };
const MOON: SolarBody = { body: Body.Moon, id: 'moon', name: 'Moon', zh: '月球', kind: 'moon', radiusKm: 1737.4 };
const PLANETS: SolarBody[] = [
  { body: Body.Mercury, id: 'mercury', name: 'Mercury', zh: '水星', kind: 'planet', radiusKm: 2439.7 },
  { body: Body.Venus, id: 'venus', name: 'Venus', zh: '金星', kind: 'planet', radiusKm: 6051.8 },
  { body: Body.Mars, id: 'mars', name: 'Mars', zh: '火星', kind: 'planet', radiusKm: 3389.5 },
  { body: Body.Jupiter, id: 'jupiter', name: 'Jupiter', zh: '木星', kind: 'planet', radiusKm: 69911 },
  { body: Body.Saturn, id: 'saturn', name: 'Saturn', zh: '土星', kind: 'planet', radiusKm: 58232 },
  { body: Body.Uranus, id: 'uranus', name: 'Uranus', zh: '天王星', kind: 'planet', radiusKm: 25362 },
  { body: Body.Neptune, id: 'neptune', name: 'Neptune', zh: '海王星', kind: 'planet', radiusKm: 24622 },
];
const SOLAR_BODIES = [SUN, MOON, ...PLANETS];

function equatorial(raDeg: number, decDeg: number, distancePc: number): Vec {
  const ra = raDeg * Math.PI / 180;
  const dec = decDeg * Math.PI / 180;
  const xy = distancePc * Math.cos(dec);
  return [xy * Math.cos(ra), xy * Math.sin(ra), distancePc * Math.sin(dec)];
}

type Marker = SkyObject & { zh: string };
const landmarks: Marker[] = [
  { id: 'm42', name: 'Orion Nebula (M42)', zh: '猎户座大星云（M42）', kind: 'nebula', position: equatorial(83.8221, -5.3911, 1500 / LY_PER_PC), mag: 4 },
  { id: 'm45', name: 'Pleiades (M45)', zh: '昴星团（M45）', kind: 'cluster', position: equatorial(56.75, 24.1167, 445 / LY_PER_PC), mag: 1.6 },
  { id: 'm1', name: 'Crab Nebula (M1)', zh: '蟹状星云（M1）', kind: 'nebula', position: equatorial(83.6332, 22.0145, 6500 / LY_PER_PC), mag: 8.4 },
  { id: 'sgr-a', name: 'Sagittarius A*', zh: '人马座 A*', kind: 'black-hole', position: equatorial(266.4168, -29.0078, 8178), mag: Infinity },
  { id: 'm31', name: 'Andromeda Galaxy (M31)', zh: '仙女座星系（M31）', kind: 'galaxy', position: equatorial(10.6847, 41.2690, 2500000 / LY_PER_PC), mag: 3.1 },
  { id: 'm33', name: 'Triangulum Galaxy (M33)', zh: '三角座星系（M33）', kind: 'galaxy', position: equatorial(23.4621, 30.6599, 3000000 / LY_PER_PC), mag: 5.7 },
  { id: '3c273', name: 'Quasar 3C 273', zh: '类星体 3C 273', kind: 'quasar', position: equatorial(187.2779, 2.0524, 652e6), mag: 12.9 },
];

function hostMarker(id: string, name: string, zh: string, ra: number, dec: number, distance: number, vmag: number): Marker {
  return { id, name: `${name} (host marker)`, zh: `${zh}（宿主星标记）`, kind: 'exoplanet', position: equatorial(ra, dec, distance), mag: vmag };
}

const exoplanets = [
  hostMarker('proxima-b', 'Proxima Centauri b', '比邻星 b', 217.3934657, -62.6761821, 1.30119, 11.01),
  hostMarker('trappist-1-b', 'TRAPPIST-1 b', 'TRAPPIST-1 b', 346.6263919, -5.0434618, 12.42988881, 17.02),
  hostMarker('51-peg-b', '51 Pegasi b', '飞马座51 b', 344.3675399, 20.7690958, 15.4614, 5.45309),
  hostMarker('kepler-186-f', 'Kepler-186 f', '开普勒-186 f', 298.652736, 43.9549884, 177.594, 15.138),
];

const featured: Destination[] = index.featured.map(({ id, name, zh, position: [x, y, z] }) =>
  ({ id, name, zh, kind: 'star', position: [x, y, z] }));
const featuredStarNames = new Map(featured.map(star => [star.id, star.zh]));
const destination = ({ id, name, zh, kind, position }: Destination): Destination => ({ id, name, zh, kind, position });
export const destinations: Destination[] = [
  { id: 'earth', name: 'Earth', zh: '地球', kind: 'earth', position: ORIGIN },
  ...featured,
  ...SOLAR_BODIES.map(body => destination({ ...body, position: ORIGIN })),
  ...exoplanets.map(destination),
  ...landmarks.map(destination),
];

export const constellations: Constellation[] = index.constellations.map(({ id, name, zh, lines }) =>
  ({ id, name, zh, lines: lines.map(([a, b]) => [a, b]) }));

export const catalogCreditsUrl = `${import.meta.env.BASE_URL}explorer/DATA.md`;

export async function loadCatalog(): Promise<SkyObject[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}explorer/stars.json`);
  if (!response.ok) throw new Error(`Explorer star catalog unavailable (HTTP ${response.status})`);
  const rows: StarRow[] = await response.json();
  const stars = rows.map(([id, name, x, y, z, mag, absolute, bv]): SkyObject =>
    ({ id, name, zh: featuredStarNames.get(id) ?? chineseStarNames[id], kind: 'star', position: [x, y, z], mag, absolute, bv }));
  return [...stars, ...landmarks, ...exoplanets];
}

const xyz = ({ x, y, z }: Vector): Vec => [x, y, z];
const pc = ({ x, y, z }: Vector): Vec => [x / AU_PER_PC, y / AU_PER_PC, z / AU_PER_PC];

export function solarSystem(date: Date, latitude: number, longitude: number): {
  earth: Vec; observer: Vec; objects: SkyObject[]; up: Vec; north: Vec; east: Vec;
} {
  const time = MakeTime(date);
  const site = new Observer(latitude, longitude, 0);
  const siteOffset = ObserverVector(time, site, false);
  const e = HelioVector(Body.Earth, time);
  const obs = new Vector(e.x + siteOffset.x, e.y + siteOffset.y, e.z + siteOffset.z, time);
  const horizon = Rotation_HOR_EQJ(time, site);
  const basis = (x: number, y: number, z: number) => xyz(RotateVector(horizon, new Vector(x, y, z, time)));
  const moon = GeoMoon(time);
  const objects = SOLAR_BODIES.map(({ body, ...data }): SkyObject => {
    const absolute = body === Body.Moon
      ? new Vector(e.x + moon.x, e.y + moon.y, e.z + moon.z, time)
      : HelioVector(body, time);
    const illumination = Illumination(body, time);
    const topocentricAu = Math.hypot(absolute.x - obs.x, absolute.y - obs.y, absolute.z - obs.z);
    const geocentricAu = Math.hypot(absolute.x - e.x, absolute.y - e.y, absolute.z - e.z);
    const mag = illumination.mag + 5 * Math.log10(topocentricAu / geocentricAu);
    return { ...data, position: pc(absolute), mag };
  });
  const earth = pc(e);
  objects.push({ id: 'earth', name: 'Earth', zh: '地球', kind: 'planet', position: earth, radiusKm: 6371, mag: Infinity });
  // Astronomy Engine's horizon basis points North, West, then Up.
  return { earth, observer: pc(obs), objects, north: basis(1, 0, 0), east: basis(0, -1, 0), up: basis(0, 0, 1) };
}
