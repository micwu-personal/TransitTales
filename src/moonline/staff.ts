import { approachSeconds, isBlack } from './play';
import type { Note } from './score';

export type Point = { x: number; y: number };
const lines = [-4, -2, 0, 2, 4];
const degrees = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const degree = (pitch: number) => Math.floor(pitch / 12) * 7 + degrees[pitch % 12];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function spellPitch(pitch: number, center: number, flats: boolean) {
  const black = isBlack(pitch);
  const natural = pitch + (black ? flats ? 1 : -1 : 0);
  return {step: degree(natural) - degree(center), accidental: black ? flats ? '♭' : '♯' : '', natural};
}

type Meter = { bar: number; first?: number; flats?: boolean };
// Known measure lengths, measured in MIDI quarter-note beats.
const meters: Record<string, Meter> = {
  'ode-to-joy': {bar: 4}, 'ode-to-joy-melody': {bar: 4}, 'ah-vous-dirai-je-maman': {bar: 2},
  'minuet-in-g': {bar: 3}, 'gymnopedie-no-1': {bar: 3}, 'in-the-hall-of-the-mountain-king': {bar: 4},
  'schubert-serenade': {bar: 3, flats: true}, 'chopin-nocturne-op-9-no-2': {bar: 6, first: .5, flats: true},
  'fur-elise': {bar: 1.5, first: .5}, 'mozart-k545-allegro': {bar: 4}, 'bach-air-bwv1068': {bar: 4},
  'brahms-waltz-op39-no15': {bar: 3, flats: true}, 'blue-danube-theme': {bar: 3, first: 1},
};
export const scoreMeter = (id: string): Meter | undefined => meters[id];

const rhythms = [4, 2, 1, .5, .25, .125, .0625].flatMap((base, index) => [
  {length: base, index, dots: 0, triplet: false},
  {length: base * 1.5, index, dots: 1, triplet: false},
  {length: base * 1.75, index, dots: 2, triplet: false},
  {length: base * 2 / 3, index, dots: 0, triplet: true},
]);
export function rhythmicShape(length: number) {
  // MIDI stores performed lengths. Err toward straight values for slightly detached notes.
  const error = (r: typeof rhythms[number]) => Math.abs(r.length - length) / r.length + (r.triplet ? .07 : 0);
  const best = rhythms.reduce((a, b) => error(b) < error(a) ? b : a);
  return {open: best.index < 2, stem: best.index > 0, flags: Math.max(0, best.index - 2), dots: best.dots, triplet: best.triplet};
}

export function notate(notes: Note[], center: number, meter?: Meter) {
  const altered = new Set<number>();
  let previousBar = -Infinity;
  return notes.map(note => {
    const bar = meter ? Math.floor((note.beat - (meter.first ?? 0)) / meter.bar) : 0;
    if (bar !== previousBar) { altered.clear(); previousBar = bar; }
    const pitch = spellPitch(note.pitch, center, Boolean(meter?.flats));
    const accidental = pitch.accidental || (altered.has(pitch.natural) ? '♮' : '');
    if (pitch.accidental) altered.add(pitch.natural); else altered.delete(pitch.natural);
    return {...pitch, accidental, shape: rhythmicShape(note.length)};
  });
}

export const staffDepth = (seconds: number) => clamp(1 - seconds / approachSeconds);
export const durationDepths = (onset: number, duration: number) => [staffDepth(onset), staffDepth(onset + duration)] as const;

export function createStaff(horizon: Point, strikeY: number, width: number, center: number, anchors: ReadonlyMap<number, Point>, flats: boolean, pitched: boolean) {
  const spacing = width / 11;
  const naturals = [...anchors].filter(([pitch]) => !isBlack(pitch))
    .map(([pitch, {x}]) => ({step: spellPitch(pitch, center, flats).step, x})).sort((a, b) => a.step - b.step);
  const origin = naturals.length ? naturals.reduce((sum, p) => sum + p.x - p.step * spacing, 0) / naturals.length : horizon.x;
  const naturalX = (step: number) => {
    const right = naturals.findIndex(p => p.step >= step);
    if (right < 0) {
      const last = naturals.at(-1);
      return last ? last.x + (step - last.step) * spacing : origin + step * spacing;
    }
    const high = naturals[right], low = naturals[right - 1];
    return low ? mix(low.x, high.x, (step - low.step) / (high.step - low.step)) : high.x + (step - high.step) * spacing;
  };
  const bound = (x: number) => Math.max(horizon.x - width / 2, Math.min(horizon.x + width / 2, x));
  const project = (x: number, depth: number) => ({x, y: mix(horizon.y, strikeY, depth)});
  // Octave-clef lines can fall beyond a small bank. Compress only that overhang, never the active key centers.
  const edge = width / 2, inner = edge * .80;
  const soften = (x: number) => {
    const offset = x - horizon.x;
    return Math.abs(offset) <= inner ? x : horizon.x + Math.sign(offset) * (inner + (edge - inner) * (1 - Math.exp(-(Math.abs(offset) - inner) / (edge - inner))));
  };
  const stepX = (step: number) => naturals.find(p => p.step === step)?.x ?? soften(naturalX(step));
  const rail = (step: number, depth: number) => project(pitched ? stepX(step) : horizon.x + step * width / 10, depth);
  const cue = (pitch: number, depth: number, previewX: number) => {
    const {step} = spellPitch(pitch, center, flats);
    const key = anchors.get(pitch);
    const ideal = pitched ? stepX(step) : previewX;
    // Keep the written line until the short docking zone, then route to the physical key.
    const targetX = key?.x ?? bound(previewX);
    if (depth >= 1) return {x: targetX, y: strikeY};
    const split = clamp((depth - .68) / .32);
    return project(mix(ideal, targetX, split * split), depth);
  };
  return {rail, cue, pitched};
}

type Staff = ReturnType<typeof createStaff>;
const segment = (ctx: CanvasRenderingContext2D, a: Point, b: Point) => {
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
};

export function drawStaff(ctx: CanvasRenderingContext2D, staff: Staff, beat: number, spb: number, end: number, meter: Meter | undefined, center: number) {
  const [a, b, c, d] = [staff.rail(-5, 0), staff.rail(5, 0), staff.rail(5, 1), staff.rail(-5, 1)];
  ctx.fillStyle = '#231b34d9'; ctx.fillRect(d.x, d.y, c.x - d.x, a.y - d.y);
  ctx.beginPath(); segment(ctx, d, a); segment(ctx, c, b);
  ctx.strokeStyle = '#bd977d57'; ctx.lineWidth = 1; ctx.stroke();
  const ink = ctx.createLinearGradient(0, a.y, 0, d.y);
  ink.addColorStop(0, '#f4c89794'); ink.addColorStop(1, '#f4c897da');
  ctx.beginPath(); (staff.pitched ? lines : [0]).forEach(step => segment(ctx, staff.rail(step, 0), staff.rail(step, 1)));
  ctx.strokeStyle = ink; ctx.lineWidth = 1.35; ctx.stroke();
  if (meter) {
    const {first = 0, bar} = meter;
    for (let next = first + Math.max(0, Math.ceil((beat - first) / bar)) * bar; next <= end && (next - beat) * spb <= approachSeconds; next += bar) {
      const z = staffDepth((next - beat) * spb);
      ctx.beginPath(); segment(ctx, staff.rail(-4, z), staff.rail(4, z));
      ctx.lineWidth = 1 + z; ctx.stroke();
    }
  }
  ctx.beginPath(); segment(ctx, d, c); ctx.strokeStyle = '#ffe2b5'; ctx.lineWidth = 2; ctx.stroke();
  if (staff.pitched) {
    const clef = staff.rail(0, 0);
    ctx.save(); ctx.translate(clef.x, clef.y + 15); ctx.rotate(Math.PI / 2);
    ctx.font = '23px "Segoe UI Symbol", "Noto Music", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffdbab';
    ctx.fillText(center <= 50 ? '\u{1d122}' : '\u{1d11e}', 0, 0); ctx.restore();
  }
}

export function drawDuration(ctx: CanvasRenderingContext2D, staff: Staff, pitch: number, head: number, tail: number, x: number) {
  const end = staff.cue(pitch, tail, x);
  const start = staff.cue(pitch, head, x);
  ctx.beginPath(); ctx.moveTo(end.x, end.y);
  for (let i = 1; i <= 6; i++) {
    const p = staff.cue(pitch, mix(tail, head, i / 6), x); ctx.lineTo(p.x, p.y);
  }
  ctx.lineWidth = 2 + head * 3; ctx.strokeStyle = '#aee6b486'; ctx.stroke();
  ctx.beginPath(); segment(ctx, {x: end.x - 2, y: end.y}, {x: end.x + 2, y: end.y});
  ctx.lineWidth = 1; ctx.strokeStyle = '#b9ebad'; ctx.stroke();
  return start;
}

export function drawStaffNote(ctx: CanvasRenderingContext2D, staff: Staff, point: Point, depth: number, size: number,
  {step, accidental, shape}: ReturnType<typeof notate>[number]) {
  const {x, y} = point;
  if (staff.pitched && Math.abs(step) >= 6) {
    ctx.beginPath();
    for (let i = 6; i <= Math.abs(step); i += 2) {
      const line = staff.rail(Math.sign(step) * i, depth).x + x - staff.rail(step, depth).x;
      ctx.moveTo(line, y - size * 1.35); ctx.lineTo(line, y + size * 1.35);
    }
    ctx.strokeStyle = '#f4d5a5'; ctx.lineWidth = 1.25; ctx.stroke();
  }
  // Rotate the written axes: later (right) becomes down, higher (up) becomes right.
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2);
  ctx.fillStyle = ctx.strokeStyle = '#ecffdb'; ctx.lineWidth = Math.max(1, size * .19);
  ctx.beginPath();
  if (staff.pitched) ctx.ellipse(0, 0, size, size * .65, -.27, 0, Math.PI * 2);
  else { ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath(); }
  if (shape.open) {
    ctx.fillStyle = '#30223e'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ecffdb';
  } else ctx.fill();
  if (shape.stem) {
    const up = step < 0, direction = up ? -1 : 1, side = up ? .82 : -.82;
    ctx.beginPath(); ctx.moveTo(size * side, 0); ctx.lineTo(size * side, direction * size * 2.7); ctx.stroke();
    for (let i = 0; i < shape.flags; i++) {
      const start = direction * size * (2.7 - i * .5);
      ctx.beginPath(); ctx.moveTo(size * side, start);
      ctx.quadraticCurveTo(size * (side + 1.45), start - direction * size * .65, size * (side + .95), start - direction * size * 1.4);
      ctx.stroke();
    }
  }
  for (let i = 0; i < shape.dots; i++) {
    ctx.beginPath(); ctx.arc(size * (1.48 + i * .62), -size * .38, Math.max(.9, size * .18), 0, Math.PI * 2); ctx.fill();
  }
  if (staff.pitched && accidental) {
    ctx.font = `${Math.max(10, size * 2.4)}px "Segoe UI Symbol", system-ui`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(accidental, -size * 1.1, 0);
  }
  if (shape.triplet) {
    ctx.font = `${Math.max(8, size * 1.4)}px system-ui`;
    ctx.fillText('3', size * .6, size * (step < 0 ? -3.65 : 3.65));
  }
  ctx.restore();
}
