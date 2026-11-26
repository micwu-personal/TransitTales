import { add, clamp, DEG, dot, length, scale, smooth, sub, unit, type camera } from './camera';
import type { Vec } from './catalog';

type Pen = CanvasRenderingContext2D;
type Effect = { normal: Vec; axis: Vec; across: Vec; radius: number; draw: (pen: Pen, t: number) => void };
const TAU = 2 * Math.PI;
const phase = (t: number) => t - Math.floor(t);

/** Display with the arrival UI; color, size and motion are illustrative, not recorded or predicted. */
export const phenomenonDisclaimer = {
  en: 'Observation-inspired illustration · Time-compressed motion · Not telescope imagery or a prediction',
  zh: '观测启发示意图 · 时间压缩动画 · 非实拍影像或预测',
} as const;

// Angles are celestial position angles, north through east. Radius is a framing scale in parsecs,
// not a measurement. The geometries are sketches in the observed tangent plane, not 3D models.
function effect(ra: number, dec: number, pa: number, radius: number, draw: Effect['draw']): Effect {
  ra *= DEG; dec *= DEG; pa *= DEG;
  const normal: Vec = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const north: Vec = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  const east: Vec = [-Math.sin(ra), Math.cos(ra), 0];
  return {
    normal, radius, draw,
    axis: add(scale(north, Math.cos(pa)), scale(east, Math.sin(pa))),
    across: add(scale(north, Math.sin(pa)), scale(east, -Math.cos(pa))),
  };
}

const effects = new Map<string, Effect>([
  // EHT: thick bright ring with a central shadow; no robust azimuthal orientation or confirmed jet.
  // https://eventhorizontelescope.org/blog/astronomers-reveal-first-image-black-hole-heart-our-galaxy
  // https://eventhorizontelescope.org/blog/astronomers-unveil-strong-magnetic-fields-spiraling-edge-milky-way%E2%80%99s-central-black-hole
  ['sgr-a', effect(266.4168, -29.0078, 0, .047, drawAccretion)],
  // Chandra's Crab movie shows a torus, outward-moving wisps and opposing polar jets.
  // Ng & Romani's Chandra torus fit gives a 124° / 304° axis and ~61° inclination (Table 2).
  // https://chandra.harvard.edu/photo/2002/0052/animations.html
  // https://arxiv.org/abs/0710.4168
  ['m1', effect(83.6332, 22.0145, 124, 1.28, drawCrab)],
  // Hubble's one-sided large-scale jet; the optical/radio ridge lies at PA 222.2°.
  // https://science.nasa.gov/missions/hubble/nasas-hubble-takes-the-closest-ever-look-at-a-quasar/
  // https://ned.ipac.caltech.edu/level5/March02/Courvoisier/Cour6.html
  ['3c273', effect(187.2779, 2.0524, 222.2, 60_000, drawQuasar)],
]);

export const phenomenonIds: ReadonlySet<string> = new Set(effects.keys());

/** Call only for the active arrival. target is already relative to the camera; time 0 holds a still. */
export function drawPhenomenon(pen: Pen, id: string, target: Vec, eye: ReturnType<typeof camera>, w: number, h: number, timeSeconds: number): boolean {
  const entry = effects.get(id);
  if (!entry || ![w, h, eye.focal].every(n => Number.isFinite(n) && n > 0) || pen.globalAlpha <= 0) return false;
  const depth = dot(target, eye.forward);
  if (!Number.isFinite(depth) || depth <= 0) return false;
  const x = dot(target, eye.right) / depth, y = -dot(target, eye.up) / depth;
  const sx = w / 2 + eye.focal * x, sy = h / 2 + eye.focal * y;
  const cap = Math.min(124, Math.min(w, h) * .27);
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx + cap <= 0 || sx - cap >= w || sy + cap <= 0 || sy - cap >= h) return false;

  // Perspective Jacobian at the target. Transport the PA basis to the current sightline
  // so camera turns and rolls carry the effect with the sky instead of spinning the jet.
  const toward = unit(target);
  const halfway = add(entry.normal, toward);
  const antipodal = length(halfway) < .001;
  const b = unit(halfway);
  const axis = antipodal ? scale(entry.axis, -1) : sub(entry.axis, scale(b, 2 * dot(entry.axis, b)));
  const across = antipodal ? entry.across : sub(entry.across, scale(b, 2 * dot(entry.across, b)));
  const dz = dot(axis, eye.forward), ez = dot(across, eye.forward);
  const ax = dot(axis, eye.right) - x * dz, ay = -dot(axis, eye.up) - y * dz;
  const bx = dot(across, eye.right) - x * ez, by = -dot(across, eye.up) - y * ez;
  const span = Math.max(Math.hypot(ax, bx), Math.hypot(ay, by));
  if (!Number.isFinite(span) || span <= 0) return false;
  const pixels = Math.min(cap, eye.focal / depth * entry.radius * span);
  if (pixels <= 4) return false;
  // Every brush fits in the unit circle in its local plane.
  if (sx + pixels <= 0 || sx - pixels >= w || sy + pixels <= 0 || sy - pixels >= h) return false;

  const size = pixels / span;
  pen.save();
  pen.globalAlpha *= smooth(clamp((pixels - 4) / 10, 0, 1));
  pen.transform(ax * size, ay * size, bx * size, by * size, sx, sy);
  pen.lineCap = 'round';
  entry.draw(pen, Number.isFinite(timeSeconds) ? timeSeconds : 0);
  pen.restore();
  return true;
}

function arc(pen: Pen, rx: number, ry: number, angle: number, start: number, end: number, width: number, color: string) {
  pen.beginPath();
  pen.ellipse(0, 0, rx, ry, angle, start, end);
  pen.lineWidth = width;
  pen.strokeStyle = color;
  pen.stroke();
}

function spark(pen: Pen, x: number, y: number, rx: number, ry: number, color: string) {
  pen.beginPath();
  pen.ellipse(x, y, rx, ry, 0, 0, TAU);
  pen.fillStyle = color;
  pen.fill();
}

function drawAccretion(pen: Pen, t: number) {
  const light = pen.createRadialGradient(0, 0, .24, 0, 0, .99);
  light.addColorStop(0, 'rgba(255,158,75,0)');
  light.addColorStop(.17, 'rgba(255,179,91,.44)');
  light.addColorStop(.35, 'rgba(247,119,53,.27)');
  light.addColorStop(.62, 'rgba(179,57,52,.13)');
  light.addColorStop(1, 'rgba(179,57,52,0)');
  pen.fillStyle = light;
  pen.fillRect(-1, -1, 2, 2);
  spark(pen, 0, 0, .29, .27, '#070812');
  arc(pen, .38, .35, .08, 0, TAU, .075, 'rgba(239,123,61,.48)');
  for (let i = 0; i < 11; i++) {
    const r = .35 + i * .047;
    const speed = .24 * Math.pow(.35 / r, 1.5);
    const start = TAU * phase(t * speed + i * .618);
    const bright = (.62 + .32 * Math.cos(start - .9)) * (1 - i * .069);
    arc(pen, r, .89 * r, .08, start, start + .62 + .22 * Math.sin(i * 2.4), .038 - i * .0022, `rgba(255,${205 - i * 9},${139 - i * 8},${bright})`);
    if (i < 4) arc(pen, r, .89 * r, .08, start + .33, start + .52, .013, `rgba(255,230,180,${bright * .8})`);
  }
}

function drawCrab(pen: Pen, t: number) {
  const bend = (u: number) => .082 * Math.sin(4.9 * u) * u;
  ribbon(pen, -.48, u => .032 * u, 'rgba(106,149,255,.25)');
  ribbon(pen, .92, bend, 'rgba(86,156,255,.40)');
  ribbon(pen, .91, bend, 'rgba(157,214,255,.67)', .42);
  for (let i = 0; i < 5; i++) {
    const u = phase(t * .46 + i * .2);
    spark(pen, .91 * u, bend(u), .030, .013 + .012 * u, `rgba(181,227,255,${.78 * Math.sin(Math.PI * u)})`);
  }
  const angle = Math.PI / 2, flatten = .48; // cos(61°), obliquity of the projected equatorial torus
  arc(pen, .50, .50 * flatten, angle, 0, TAU, .14, 'rgba(38,96,192,.23)');
  arc(pen, .50, .50 * flatten, angle, 0, TAU, .035, 'rgba(107,175,245,.36)');
  arc(pen, .50, .50 * flatten, angle, .17, 2.79, .055, 'rgba(155,218,255,.60)');
  arc(pen, .28, .28 * flatten, angle, .23, 5.89, .025, 'rgba(143,208,255,.63)');
  for (let i = 0; i < 4; i++) {
    const u = phase(t * .43 + i * .25);
    const r = .29 + .45 * u;
    arc(pen, r, r * flatten, angle, .18 + .11 * i, 2.62 - .1 * i, .025, `rgba(182,226,255,${.58 * Math.sin(Math.PI * u)})`);
  }
  spark(pen, 0, 0, .054, .054, 'rgba(127,195,255,.51)');
  spark(pen, 0, 0, .023, .023, '#e9f7ff');
}

// A tapered sheath: same fixed number of curves at every scale, without blur or particle buffers.
function ribbon(pen: Pen, tip: number, bend: (u: number) => number, tint: string, narrow = 1) {
  const glow = pen.createLinearGradient(0, 0, tip, 0);
  glow.addColorStop(0, 'transparent');
  glow.addColorStop(.28, tint);
  glow.addColorStop(.72, tint);
  glow.addColorStop(1, 'transparent');
  pen.beginPath();
  pen.moveTo(0, 0);
  pen.bezierCurveTo(.25 * tip, .032 * narrow + bend(.25), .65 * tip, .115 * narrow + bend(.65), tip, bend(1));
  pen.bezierCurveTo(.68 * tip, -.10 * narrow + bend(.68), .27 * tip, -.013 * narrow + bend(.27), 0, 0);
  pen.fillStyle = glow;
  pen.fill();
}

const quasarKnots = [.52, .59, .67, .72, .78, .88, .94] as const;

function drawQuasar(pen: Pen, t: number) {
  const bend = (u: number) => .031 * Math.sin(7 * u) * u;
  const tail = pen.createLinearGradient(.38, 0, .99, 0);
  tail.addColorStop(0, 'transparent');
  tail.addColorStop(.43, 'rgba(167,184,232,.26)');
  tail.addColorStop(.85, 'rgba(244,174,117,.26)');
  tail.addColorStop(1, 'transparent');
  pen.beginPath();
  pen.moveTo(.38, bend(.38));
  pen.bezierCurveTo(.56, .026, .82, .081, .99, bend(.99));
  pen.bezierCurveTo(.86, -.046, .62, -.082, .38, bend(.38));
  pen.fillStyle = tail;
  pen.fill();
  for (const [i, u] of quasarKnots.entries()) {
    const sheen = .57 + .17 * Math.cos(TAU * (7 * u - phase(t * .58)));
    const r = .023 + i * .0017;
    spark(pen, u, bend(u), r, .012 + i * .0015, `rgba(255,${221 - i * 5},${182 - i * 7},${sheen})`);
  }
  for (let i = 0; i < 4; i++) {
    const u = phase(t * .38 + i * .25);
    const x = .51 + .46 * u;
    spark(pen, x, bend(x), .019, .006, `rgba(235,224,255,${.72 * Math.sin(Math.PI * u)})`);
  }
  const core = pen.createRadialGradient(0, 0, 0, 0, 0, .21);
  core.addColorStop(0, '#fff4d7');
  core.addColorStop(.17, 'rgba(255,241,211,.97)');
  core.addColorStop(.38, 'rgba(176,177,244,.35)');
  core.addColorStop(1, 'rgba(131,145,219,0)');
  pen.fillStyle = core;
  pen.fillRect(-.21, -.21, .42, .42);
}
