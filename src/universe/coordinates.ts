/**
 * Heliocentric J2000 mean-ecliptic/equinox xyz, in AU (not renderer units).
 * JPL Table 1 elements: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * Units, masses: https://ssd.jpl.nasa.gov/astro_par.html
 * Mean planet radii: https://ssd.jpl.nasa.gov/planets/phys_par.html
 * Moon: https://stjarnhimlen.se/comp/ppcomp.html (unperturbed, low precision).
 * SIMBAD ICRS J2000 directions/parallaxes were checked through its Harvard mirror
 * on 2026-11-02; per-object URLs below identify the numerical records.
 * ICRS is treated as equatorial J2000, ignoring the tiny frame bias. Stellar
 * observer = Sun; no proper motion, parallax displacement, light-time correction,
 * cosmological evolution or ancient/future prediction. Radii of regions are
 * representative extents, not physical surfaces. Colors are illustrative.
 */
export type Vec3 = readonly [number, number, number];
export interface CoordinateSource {
  readonly name: string;
  readonly urls: readonly string[];
  readonly notes: string;
  readonly referenceYear?: number;
  readonly requestedReferenceYear?: number;
  readonly validYears?: readonly [number, number];
}
export interface CoordinateBody {
  readonly id: string;
  readonly position: Vec3;
  readonly radiusAU: number;
  readonly color: string;
  readonly kind: 'planet' | 'star' | 'region' | 'compact' | 'galaxy';
  readonly evidence: 'ephemeris' | 'catalogue' | 'inferred' | 'illustrative';
  readonly source?: CoordinateSource;
}

export const AU_KM = 149597870.7;
export const LIGHT_YEAR_AU = 299792.458 * 86400 * 365.25 / AU_KM;
export const PARSEC_AU = 648000 / Math.PI;
export const DEFAULT_REFERENCE_YEAR = 2026 + 305 / 365.25;
export const J2000_OBLIQUITY_DEGREES = 23.43928;
const RAD = Math.PI / 180;
const JPL = 'https://ssd.jpl.nasa.gov/planets/approx_pos.html';
const PHYSICAL = 'https://ssd.jpl.nasa.gov/planets/phys_par.html';
const LUNAR = 'https://stjarnhimlen.se/comp/ppcomp.html';
const MESSIER = 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/';
const simbad = (name: string) => `https://simbad.cfa.harvard.edu/simbad/sim-id?Ident=${encodeURIComponent(name)}&output.format=ASCII`;
const vector = (x: number, y: number, z: number): Vec3 => Object.freeze([x, y, z] as const);

/** Solve E - e sin(E) = M, in radians; returns the principal eccentric anomaly. */
export function solveKepler(meanAnomaly: number, eccentricity: number): number {
  if (!Number.isFinite(meanAnomaly) || !Number.isFinite(eccentricity) || eccentricity < 0 || eccentricity >= 1) {
    throw new RangeError('Kepler requires a finite anomaly and 0 <= eccentricity < 1');
  }
  const m = Math.atan2(Math.sin(meanAnomaly), Math.cos(meanAnomaly));
  if (m === 0 || eccentricity === 0) return m;
  let low = -Math.PI, high = Math.PI, e = m;
  for (let iteration = 0; iteration < 64; iteration++) {
    const residual = e - eccentricity * Math.sin(e) - m;
    if (Math.abs(residual) < 1e-14) return e;
    if (residual > 0) high = e; else low = e;
    const next = e - residual / (1 - eccentricity * Math.cos(e));
    e = next > low && next < high ? next : (low + high) / 2;
  }
  return e;
}

/** RA and declination in degrees, radial distance in AU; equatorial -> ecliptic. */
export function equatorialToEcliptic(raDegrees: number, decDegrees: number, distanceAU: number): Vec3 {
  if (![raDegrees, decDegrees, distanceAU].every(Number.isFinite) || Math.abs(decDegrees) > 90 || distanceAU < 0) {
    throw new RangeError('Expected finite RA, declination in [-90, 90], and nonnegative AU distance');
  }
  const ra = raDegrees * RAD, dec = decDegrees * RAD, obliquity = J2000_OBLIQUITY_DEGREES * RAD;
  const x = distanceAU * Math.cos(dec) * Math.cos(ra);
  const y = distanceAU * Math.cos(dec) * Math.sin(ra), z = distanceAU * Math.sin(dec);
  return vector(x, y * Math.cos(obliquity) + z * Math.sin(obliquity), -y * Math.sin(obliquity) + z * Math.cos(obliquity));
}

// a, e, I, L, longitude of perihelion, longitude of node; rates per Julian century.
type Elements = readonly [number, number, number, number, number, number];
const PLANETS: readonly (readonly [string, number, string, Elements, Elements])[] = [
  ['mercury', 2439.4, '#ada6a0', [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  ['venus', 6051.8, '#e8c47f', [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  ['earth', 6371.0084, '#4b9ee8', [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
  ['mars', 3389.5, '#df7959', [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  ['jupiter', 69911, '#d6b18a', [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  ['saturn', 58232, '#e6cf93', [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  ['uranus', 25362, '#87d9dc', [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  ['neptune', 24622, '#537edf', [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
];

function orbit(a: number, eccentricity: number, inclination: number, node: number, perihelion: number, meanAnomaly: number): Vec3 {
  const e = solveKepler(meanAnomaly * RAD, eccentricity);
  const x = a * (Math.cos(e) - eccentricity), y = a * Math.sqrt(1 - eccentricity ** 2) * Math.sin(e);
  const i = inclination * RAD, n = node * RAD, w = perihelion * RAD;
  const cn = Math.cos(n), sn = Math.sin(n), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
  return vector((cw * cn - sw * sn * ci) * x + (-sw * cn - cw * sn * ci) * y,
    (cw * sn + sw * cn * ci) * x + (-sw * sn + cw * cn * ci) * y, sw * si * x + cw * si * y);
}

function body(id: string, position: Vec3, radiusAU: number, color: string, kind: CoordinateBody['kind'], evidence: CoordinateBody['evidence'], source: CoordinateSource): CoordinateBody {
  return Object.freeze({ id, position: vector(...position), radiusAU, color, kind, evidence,
    source: Object.freeze({ ...source, urls: Object.freeze([...source.urls]),
      ...(source.validYears ? { validYears: Object.freeze([...source.validYears] as [number, number]) } : {}) }) });
}

const hours = (h: number, m: number, s: number) => 15 * (h + m / 60 + s / 3600);
const degrees = (d: number, m: number, s: number) => Math.sign(d) * (Math.abs(d) + m / 60 + s / 3600);
const fixedNotes = 'Static J2000 direction with approximate distance; no proper motion or ancient/future evolution. Region radius is representative.';
function catalogue(id: string, name: string, ra: number, dec: number, distanceAU: number, radiusAU: number, color: string, kind: CoordinateBody['kind'], urls: readonly string[], notes = ''): CoordinateBody {
  return body(id, equatorialToEcliptic(ra, dec, distanceAU), radiusAU, color, kind, 'catalogue',
    { name, urls: [simbad(name), ...urls], notes: `${fixedNotes} ${notes}`, referenceYear: 2000 });
}

const sgrDirection = [hours(17, 45, 40.03599), degrees(-29, 0, 28.1699)] as const;
const sgrDistance = 8178 * PARSEC_AU;
const proximaDirection = [hours(14, 29, 42.9461331854), degrees(-62, 40, 46.164680672)] as const;
const proximaDistance = 1000 / 768.0665 * PARSEC_AU;
const STATIC_BODIES: readonly CoordinateBody[] = Object.freeze([
  body('sun', vector(0, 0, 0), 700000 / AU_KM, '#ffca62', 'star', 'catalogue',
    { name: 'Sun', urls: ['https://science.nasa.gov/sun/facts/'], notes: 'Heliocentric origin by definition; rounded photospheric radius. Not a future stellar-evolution prediction.' }),
  body('asteroids', vector(2.7, 0, 0), 0.6, '#b4a394', 'region', 'inferred',
    { name: 'Main asteroid belt corridor', urls: ['https://science.nasa.gov/solar-system/asteroids/facts/'], notes: 'Representative 2.1–3.3 AU belt segment along arbitrary +x; not a measured asteroid or the centre of the entire belt.' }),
  body('comet', vector(18, 0, 0), 1, '#a8e5ef', 'region', 'illustrative',
    { name: 'Illustrative comet encounter region', urls: ['https://science.nasa.gov/solar-system/comets/'], notes: 'Arbitrary 18 AU anchor and 1 AU extent; no named comet, measured position, or ephemeris is claimed.' }),
  body('kuiper', vector(40, 0, 0), 10, '#91b9cf', 'region', 'inferred',
    { name: 'Main Kuiper belt corridor', urls: ['https://science.nasa.gov/solar-system/kuiper-belt/facts/'], notes: 'Representative 30–50 AU belt segment along arbitrary +x; not a discrete catalogue object or full annulus.' }),
  body('oort', vector(50000, 0, 0), 45000, '#bfd7e8', 'region', 'inferred',
    { name: 'Oort cloud corridor', urls: ['https://science.nasa.gov/solar-system/oort-cloud/facts/'], notes: 'Inferred shell: inner edge 2000–5000 AU, uncertain outer edge 10000–100000 AU. Arbitrary +x corridor, not an observed target.' }),
  catalogue('proxima', 'alf Cen', hours(14, 39, 36.50), degrees(-60, 50, 2.3), 1000 / 750.81 * PARSEC_AU, 40, '#ff8e6c', 'star', [], 'Alpha Centauri AB system anchor, not Proxima itself; 40 AU representative binary extent. Distance from SIMBAD 750.81 mas parallax.'),
  body('proxima-b', equatorialToEcliptic(...proximaDirection, proximaDistance), 0.05, '#ac8fca', 'planet', 'inferred',
    { name: 'Proxima b host-system anchor', urls: [simbad('Proxima Centauri'), 'https://www.eso.org/public/news/eso1629/'], referenceYear: 2000,
      notes: 'Uses measured Proxima host RA/Dec and 768.0665 mas parallax; planetary orbital phase/orientation and radius are not supplied. 0.05 AU is a representative orbital-region extent, not planet radius. Static host, no proper motion or ancient/future prediction.' }),
  catalogue('nebula', 'M42', hours(5, 35, 16.8), degrees(-5, 23, 15), 1500 * LIGHT_YEAR_AU, 15 * LIGHT_YEAR_AU, '#d98fce', 'region', [`${MESSIER}messier-42/`], 'NASA rounded 1500 ly distance (estimates differ); 15 ly representative region radius.'),
  catalogue('cluster', 'NGC 104', hours(0, 24, 5.359), degrees(-72, 4, 53.20), 1000 / 0.232 * PARSEC_AU, 90 * LIGHT_YEAR_AU, '#8baeff', 'region', [], '47 Tucanae: inverse SIMBAD 0.232 mas parallax is approximate; 90 ly representative extent, not a sharp boundary.'),
  body('neutron', equatorialToEcliptic(120, 20, 1000 * LIGHT_YEAR_AU), 12 / AU_KM, '#c0eaff', 'compact', 'illustrative',
    { name: 'Unidentified representative neutron star', urls: [], notes: 'Arbitrary RA 120°, Dec 20°, 1000 ly distance; nominal 12 km radius. Not a measured catalogue object.' }),
  body('stellar-hole', equatorialToEcliptic(240, -15, 1500 * LIGHT_YEAR_AU), 30 / AU_KM, '#b99cff', 'compact', 'illustrative',
    { name: 'Unidentified representative stellar black hole', urls: [], notes: 'Arbitrary RA 240°, Dec -15°, 1500 ly distance; nominal 30 km event-horizon scale. Not a measured catalogue object.' }),
  catalogue('sagittarius', 'Sgr A*', ...sgrDirection, sgrDistance, 0.08, '#e0a078', 'compact', ['https://arxiv.org/abs/1904.05721'], 'GRAVITY 2019 distance 8178 pc; representative 0.08 AU horizon scale for roughly four million solar masses.'),
  catalogue('milky-way', 'Sgr A*', ...sgrDirection, sgrDistance, 50000 * LIGHT_YEAR_AU, '#9cb5f1', 'galaxy', ['https://arxiv.org/abs/1904.05721'], 'Milky Way centre anchored at Sgr A*, not an external view position. 50000 ly representative disk radius.'),
  catalogue('magellanic', 'LMC', hours(5, 23, 34.6), degrees(-69, 45, 22), 49590 * PARSEC_AU, 7000 * LIGHT_YEAR_AU, '#91d9d7', 'galaxy', ['https://arxiv.org/abs/1903.08096'], 'Pietrzynski et al. 2019 distance 49.59 kpc; 7000 ly representative extent.'),
  catalogue('andromeda', 'M31', hours(0, 42, 44.330), degrees(41, 16, 7.50), 2.5e6 * LIGHT_YEAR_AU, 100000 * LIGHT_YEAR_AU, '#bac8ff', 'galaxy', [`${MESSIER}messier-31/`], 'NASA rounded 2.5 million ly distance; 100000 ly representative disk radius.'),
  body('local-group', equatorialToEcliptic(hours(0, 42, 44.330), degrees(41, 16, 7.50), 1.25e6 * LIGHT_YEAR_AU), 5e6 * LIGHT_YEAR_AU, '#9bcae6', 'region', 'illustrative',
    { name: 'Representative Local Group region', urls: [simbad('M31')], notes: 'Illustrative midpoint towards Andromeda, not a measured Local Group barycentre; 5 million ly representative region extent.' }),
  body('quasar', equatorialToEcliptic(180, 30, 25e9 * LIGHT_YEAR_AU), LIGHT_YEAR_AU, '#eea9f9', 'compact', 'illustrative',
    { name: 'Unidentified representative quasar', urls: [], notes: 'Catalogue names no actual quasar. Arbitrary RA 180°, Dec 30°, 25 billion ly illustrative present-distance anchor; no measured redshift, distance or cosmology fit. 1 ly representative accretion region.' }),
  body('horizon', vector(46.5e9 * LIGHT_YEAR_AU, 0, 0), 1e9 * LIGHT_YEAR_AU, '#f4bf86', 'region', 'illustrative',
    { name: 'Illustrative observable-horizon direction', urls: [], notes: 'Arbitrary +x anchor at educational present observable-radius scale 46.5 billion ly, not a measured target, wall, or traversable boundary. 1 billion ly illustrative region extent.' }),
  body('beyond', vector(50e9 * LIGHT_YEAR_AU, 0, 0), 1e9 * LIGHT_YEAR_AU, '#bca3e8', 'region', 'illustrative',
    { name: 'Unobserved speculative direction', urls: [], notes: 'Arbitrary +x anchor at 50 billion ly; beyond the observable horizon has no measured target point. Position, extent and any encounter are wholly speculative.' }),
  body('pluto', vector(20.04991226189572, -29.33598776798562, -2.659750554079825), 1188.5 / AU_KM, '#d8b7a2', 'planet', 'ephemeris',
    { name: 'Pluto (fixed Horizons reference)', urls: ['https://ssd.jpl.nasa.gov/horizons/', 'https://science.nasa.gov/dwarf-planets/pluto/facts/'], referenceYear: DEFAULT_REFERENCE_YEAR,
      notes: 'JPL Horizons target 999, centre 500@10, ICRF/ecliptic, AU, 2026-11-02 00:00 TDB vector. Fixed present-day snapshot: NOT an ephemeris of any other requested epoch; no extrapolation. Rounded mean radius; surface descriptions grounded in New Horizons imagery.' }),
  catalogue('sirius', 'Sirius', hours(6, 45, 8.91728), degrees(-16, 42, 58.0171), 8.6 * LIGHT_YEAR_AU, 35, '#c5dcff', 'star', ['https://science.nasa.gov/missions/hubble/measuring-a-white-dwarf-star/'], 'Rounded 8.6 ly distance; 35 AU representative binary extent, not stellar radius or a measured companion phase. Two stars: main sequence and white dwarf, not three.'),
  catalogue('betelgeuse', 'Betelgeuse', hours(5, 55, 10.30536), degrees(7, 24, 25.4304), 550 * LIGHT_YEAR_AU, 4, '#ef9567', 'star', ['https://science.nasa.gov/missions/hubble/hubble-finds-that-betelgeuses-mysterious-dimming-is-due-to-a-traumatic-outburst/', 'https://arxiv.org/abs/2006.09837'], 'Distance is uncertain: 550 ly is a rounded educational anchor, not precision navigation; published estimates differ. Rough 4 AU photospheric scale varies with wavelength and stellar pulsation. Dimming involved surface mass loss and dust, not an observed terminal supernova.'),
  catalogue('crab-pulsar', 'PSR J0534+2200', hours(5, 34, 31.94747), degrees(22, 0, 52.1537), 6500 * LIGHT_YEAR_AU, 12 / AU_KM, '#94dcf1', 'compact', [`${MESSIER}messier-1/`], 'NASA rounded 6500 ly distance; nominal 12 km neutron-star radius is illustrative, not a measured surface. The 1054 supernova remnant has rotating beams and a pulsar wind nebula, not wind-fed accretion.'),
  catalogue('cygnus-x1', 'Cyg X-1', hours(19, 58, 21.67574), degrees(35, 12, 5.7845), 7200 * LIGHT_YEAR_AU, 62 / AU_KM, '#e5b9f2', 'compact', ['https://arxiv.org/abs/2102.09091', 'https://blackholes.stardate.org/objects/factsheet-Cygnus-X-1.html'], 'Rounded 2021 distance 7200 ly and mass about 21 Suns. Nominal 62 km nonrotating horizon scale is illustrative: this hole spins. Direction anchors the binary; companion orbit, wind-fed accretion disk and radio jet are not resolved by these coordinates.'),
  catalogue('eta-carinae', 'eta Car', hours(10, 45, 3.545808), degrees(-59, 41, 3.95124), 7500 * LIGHT_YEAR_AU, 10000, '#e7b27e', 'star', ['https://www.nasa.gov/universe/astronomers-bring-the-third-dimension-to-a-doomed-stars-outburst/', 'https://www.nas.nasa.gov/SC14/demos/demo39.html'], 'Rounded 7500 ly distance; 10000 AU representative eruption-region extent, not stellar radius. Massive binary and colliding winds; nineteenth-century ejecta form bipolar Homunculus lobes. Eruption survived, not a terminal supernova.'),
  catalogue('tarantula', 'NGC 2070', hours(5, 38, 42), degrees(-69, 6, 0), 161000 * LIGHT_YEAR_AU, 300 * LIGHT_YEAR_AU, '#e598bb', 'region', ['https://science.nasa.gov/missions/webb/a-cosmic-tarantula-caught-by-nasas-webb/'], '30 Doradus anchored on its central NGC 2070 cluster; NASA rounded 161000 ly LMC distance. 300 ly representative star-forming region radius, not a sharp boundary; gas cavities, dusty pillars and embedded forming stars.'),
  catalogue('m33', 'M33', hours(1, 33, 50.8966), degrees(30, 39, 36.6304), 3e6 * LIGHT_YEAR_AU, 30000 * LIGHT_YEAR_AU, '#a8c7ef', 'galaxy', [`${MESSIER}messier-33/`], 'NASA rounded 3 million ly distance, consistent with the minimap; 30000 ly representative disk radius. Spiral galaxy with the NGC 604 stellar nursery.'),
  catalogue('m87', 'M87', hours(12, 30, 49.4234), degrees(12, 23, 28.0437), 54e6 * LIGHT_YEAR_AU, 50000 * LIGHT_YEAR_AU, '#e6bc98', 'galaxy', [`${MESSIER}messier-87/`], 'NASA rounded 54 million ly distance; 50000 ly representative galactic extent, not black-hole radius. Active central accretion and relativistic jet; emission outside the horizon, unlike dim Sagittarius A*.'),
  catalogue('centaurus-a', 'NGC 5128', hours(13, 25, 27.6152), degrees(-43, 1, 8.8050), 13e6 * LIGHT_YEAR_AU, 50000 * LIGHT_YEAR_AU, '#cfb09b', 'galaxy', ['https://www.eso.org/public/images/eso0005b/', 'https://sci.esa.int/web/xmm-newton/-/50236-centaurus-a-s-far-reaching-jets'], 'Rounded 13 million ly distance: published estimates differ around 10–13 million ly. 50000 ly representative galactic extent, not jet/lobe length. Dust-lane merger signatures, active nucleus, radio jets and lobes; black hole itself emits no light.'),
]);

/** Decimal Julian year relative to J2000 noon; requests outside 1800–2050 clamp. */
export function coordinateBodies(referenceYear = DEFAULT_REFERENCE_YEAR): readonly CoordinateBody[] {
  if (!Number.isFinite(referenceYear)) throw new RangeError('Reference year must be finite');
  const year = Math.max(1800, Math.min(2050, referenceYear)), t = (year - 2000) / 100;
  const d = (year - 2000) * 365.25 + 1.5;
  // Schlyter is ecliptic-of-date. Approximate longitude precession back to J2000;
  // omitted lunar perturbations and plane precession preclude precision claims.
  const precession = 5028.83 / 3600 * t;
  const lunarOffset = orbit(60.2666 * 6378.1366 / AU_KM, 0.0549, 5.1454,
    125.1228 - 0.0529538083 * d - precession, 318.0634 + 0.1643573223 * d, 115.3654 + 13.0649929509 * d);
  const clamped = year !== referenceYear;
  const dateNotes = clamped ? ` Requested year ${referenceYear} is outside 1800–2050: clamped to ${year}; illustrative stand-in, NOT an ephemeris of that requested epoch.` : '';
  const sourceDate = { referenceYear: year, requestedReferenceYear: referenceYear, validYears: [1800, 2050] as const };
  const planets = PLANETS.map(([id, radiusKm, color, base, rate]) => {
    const [a, e, i, l, p, n] = base.map((value, index) => value + rate[index] * t);
    let position = orbit(a, e, i, n, p - n, l - p);
    if (id === 'earth') {
      const fraction = 4902.800118 / (398600.435507 + 4902.800118);
      position = vector(position[0] - fraction * lunarOffset[0], position[1] - fraction * lunarOffset[1], position[2] - fraction * lunarOffset[2]);
    }
    return body(id, position, radiusKm / AU_KM, color, 'planet', clamped ? 'illustrative' : 'ephemeris',
      { name: id === 'earth' ? 'Earth (corrected EM barycentre)' : id, urls: [JPL, PHYSICAL, ...(id === 'earth' ? [LUNAR, 'https://ssd.jpl.nasa.gov/astro_par.html'] : [])], ...sourceDate,
        notes: `Approximate JPL 1800–2050 Keplerian fit, not Horizons; decimal Julian year, no light-time correction.${id === 'earth' ? ' Earth is EM barycentre minus approximate lunar mass-weighted offset.' : ''}${dateNotes}` });
  });
  const earth = planets.find(planet => planet.id === 'earth')!.position;
  const moon = body('moon', vector(earth[0] + lunarOffset[0], earth[1] + lunarOffset[1], earth[2] + lunarOffset[2]), 1740 / AU_KM, '#b7bfce', 'planet', clamped ? 'illustrative' : 'inferred',
    { name: 'Moon (low-precision representative orbit)', urls: [LUNAR, 'https://science.nasa.gov/moon/facts/'], ...sourceDate,
      notes: `Unperturbed Schlyter lunar elements added to Earth, approximate J2000 precession; omitted solar perturbations cause degree-scale errors. Rounded physical radius. Not a precision lunar ephemeris.${dateNotes}` });
  const satellites = [
    ['europa', 'jupiter', 670900, 1560.8, '#d9ccb6', 'https://science.nasa.gov/jupiter/jupiter-moons/europa/europa-facts/'],
    ['titan', 'saturn', 1221865, 2575, '#d8a35d', 'https://science.nasa.gov/saturn/moons/titan/facts/'],
  ] as const;
  const outerMoons = satellites.map(([id, hostId, orbitKm, radiusKm, color, url]) => {
    const host = planets.find(planet => planet.id === hostId)!.position;
    return body(id, vector(host[0] + orbitKm / AU_KM, host[1], host[2]), radiusKm / AU_KM, color, 'planet', 'illustrative',
      { name: `${id} host-relative orbital anchor`, urls: [url, 'https://ssd.jpl.nasa.gov/sats/elem/'], ...sourceDate,
        notes: `Anchored on modeled ${hostId} with real approximate mean orbital radius ${orbitKm} km. Arbitrary fixed +x phase and ecliptic plane, NOT measured moon orientation or an ephemeris. Physical mean moon radius; no ocean or terrain coordinates are supplied.${dateNotes}` });
  });
  return Object.freeze([...planets, moon, ...outerMoons, ...STATIC_BODIES]);
}

/** Unknown IDs throw rather than silently sending a route to the wrong object. */
export function coordinateBody(id: string, referenceYear = DEFAULT_REFERENCE_YEAR): CoordinateBody {
  const found = coordinateBodies(referenceYear).find(candidate => candidate.id === id);
  if (!found) throw new RangeError(`Unknown astronomical destination: ${id}`);
  return found;
}
