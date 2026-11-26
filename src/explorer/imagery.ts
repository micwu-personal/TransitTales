import type { Vec } from './catalog';
import { add, clamp, DEG, dot, length, scale, smooth, sub, unit } from './camera';

type Credit = { credit: string; source: string };
type PlateSource = Credit & {
  ra: number; dec: number; field: readonly [number, number]; northRight: number;
  crop?: readonly [number, number];
};

// Source centers in equatorial degrees, full uncropped fields in arcminutes.
export const imageryCredits = {
  m1: {
    ra: 83.6355343, dec: 22.0152411, field: [6.41, 6.41], northRight: 0,
    credit: 'NASA, ESA and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (ESA/Hubble)',
    source: 'https://esahubble.org/images/heic0515a/',
  },
  m42: {
    ra: 83.7905320053, dec: -5.41397796614, field: [30.03, 30.03], northRight: 0,
    credit: 'NASA, ESA, M. Robberto (Space Telescope Science Institute/ESA) and the Hubble Space Telescope Orion Treasury Project Team',
    source: 'https://esahubble.org/images/heic0601a/',
  },
  m45: {
    ra: 57.1511747824, dec: 23.9324875625, field: [130.88, 88.09], northRight: -18,
    credit: 'KPNO/NOIRLab/NSF/AURA/Tad Denton/Adam Block',
    source: 'https://noirlab.edu/public/images/noao-m45denton/',
  },
  m31: {
    ra: 10.7523331482, dec: 41.2596417071, field: [361.93, 234.08], northRight: -1.9,
    crop: [1120 / 1280, 742 / 828],
    credit: 'ESA/Hubble & Digitized Sky Survey 2. Acknowledgment: Davide De Martin (ESA/Hubble)',
    source: 'https://esahubble.org/images/heic1112f/',
  },
} as const satisfies Record<string, PlateSource>;

export const milkyWayCredit = {
  credit: 'NASA’s Scientific Visualization Studio, Ernie Wright',
  source: 'https://svs.gsfc.nasa.gov/4851/',
} satisfies Credit;

export type ImageDestination = keyof typeof imageryCredits;
export const isImageDestination = (id: string): id is ImageDestination => Object.hasOwn(imageryCredits, id);

// Match the catalog's representative solar distance; retain the release's own sky center and roll.
const catalogCenters = {
  m1: [83.6332, 22.0145, 6500], m42: [83.8221, -5.3911, 1500],
  m45: [56.75, 24.1167, 445], m31: [10.6847, 41.2690, 2500000],
} as const;

function equatorial(ra: number, dec: number): Vec {
  return [Math.cos(ra) * Math.cos(dec), Math.sin(ra) * Math.cos(dec), Math.sin(dec)];
}

function makePlate(id: ImageDestination) {
  const image: PlateSource = imageryCredits[id];
  const [raDeg, decDeg, distanceLy] = catalogCenters[id];
  const aim = equatorial(raDeg * DEG, decDeg * DEG);
  const ra = image.ra * DEG, dec = image.dec * DEG;
  const normal = equatorial(ra, dec);
  const distance = distanceLy / 3.261563777;
  const west: Vec = [Math.sin(ra), -Math.cos(ra), 0];
  const north = equatorial(ra, dec + Math.PI / 2);
  const roll = image.northRight * DEG;
  const right = add(scale(west, Math.cos(roll)), scale(north, Math.sin(roll)));
  const up = add(scale(west, -Math.sin(roll)), scale(north, Math.cos(roll)));
  const hw = distance * Math.tan(image.field[0] * DEG / 120) * (image.crop?.[0] ?? 1);
  const hh = distance * Math.tan(image.field[1] * DEG / 120) * (image.crop?.[1] ?? 1);
  // Intersect the catalog bearing with the tangent plate, so surface registration and travel target can differ.
  const offset = sub(scale(normal, distance), scale(aim, distance / dot(aim, normal)));
  const x = dot(offset, right), y = dot(offset, up);
  return { normal, right, up, x, y, hw, hh, radius: Math.hypot(Math.abs(x) + hw, Math.abs(y) + hh) };
}

export const destinationPlates = {
  m1: makePlate('m1'), m42: makePlate('m42'), m45: makePlate('m45'), m31: makePlate('m31'),
};

/** Circumradius in parsecs around the navigation marker, including the retained image's offset and crop. */
export function destinationImageRadius(id: string): number | undefined {
  return isImageDestination(id) ? destinationPlates[id].radius : undefined;
}

// ICRS-to-Galactic basis (Hipparcos/Gaia convention). +X aims at l=0, +Z at the North Galactic Pole.
export const GALACTIC_X: Vec = [-.0548755604, -.8734370902, -.4838350155];
export const GALACTIC_Y: Vec = [.4941094279, -.4448296300, .7469822445];
export const GALACTIC_Z: Vec = [-.8676661490, -.1980763734, .4559837762];
export const galacticVector = (v: Vec): Vec => [dot(v, GALACTIC_X), dot(v, GALACTIC_Y), dot(v, GALACTIC_Z)];

export const surveyU = (x: number, y: number) => .5 - Math.atan2(y, x) / (2 * Math.PI);
export const surveyV = (x: number, y: number, z: number) => .5 - Math.atan2(z, Math.sqrt(x * x + y * y)) / Math.PI;

// Small plates use their authored orientation from Earth and transport that frame for virtual flybys.
// Reflecting through the bisecting plane and then the original plane is the shortest rotation.
export function plateAxes(id: ImageDestination, toward: Vec) {
  const { normal, right, up } = destinationPlates[id];
  const middle = add(normal, toward);
  if (length(middle) < .001) return { right: scale(right, -1), up };
  const b = unit(middle);
  const transport = (v: Vec) => sub(v, scale(b, 2 * dot(v, b)));
  return { right: transport(right), up: transport(up) };
}

/** Reject offscreen plates in camera space before fitting an affine screen transform. */
export function plateProjectionFade(eye: { forward: Vec; right: Vec; up: Vec }, center: Vec, right: Vec, up: Vec, halfX: number, halfY: number) {
  const depth = dot(center, eye.forward);
  const rz = dot(right, eye.forward), uz = dot(up, eye.forward);
  const depthSpread = Math.abs(rz) + Math.abs(uz);
  if (depth <= 0 || depthSpread >= .5 * depth) return 0;
  for (const [axis, edge] of [[eye.right, halfX], [eye.up, halfY]] as const) {
    const centerAxis = dot(center, axis), rightAxis = dot(right, axis), upAxis = dot(up, axis);
    for (const sign of [-1, 1]) {
      const outside = sign * centerAxis - edge * depth;
      const extent = Math.abs(sign * rightAxis - edge * rz) + Math.abs(sign * upAxis - edge * uz);
      if (outside > extent) return 0;
    }
  }
  // The affine fit is only reliable when depth varies little across the plate.
  return 1 - smooth(clamp((depthSpread / depth - .25) / .25, 0, 1));
}

export function imageCoverage(pixels: number): number {
  const t = clamp((pixels - 8) / 20, 0, 1);
  return t * t * (3 - 2 * t);
}
