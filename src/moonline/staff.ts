import { approachSeconds, isBlack } from './play';

type Point = { x: number; y: number };
const lines = [-4, -2, 0, 2, 4];
const junction = .77;
const degrees = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const degree = (pitch: number) => Math.floor(pitch / 12) * 7 + degrees[pitch % 12];
const between = (a: number, b: number, t: number) => a + (b - a) * t;

export function staffStep(pitch: number, center: number) {
  return degree(pitch) - degree(center);
}

export function staffDepth(seconds: number) {
  return Math.max(0, Math.min(1, 1 - seconds / approachSeconds)) ** 1.45;
}

export function staffRail(step: number, depth: number, vanishing: Point, deck: Point, spacing: number): Point {
  return {
    x: between(vanishing.x, deck.x, depth) + step * spacing * between(.08, 1, depth),
    y: between(vanishing.y, deck.y, depth),
  };
}

export function staffCue(step: number, seconds: number, vanishing: Point, deck: Point, spacing: number, key: Point) {
  const depth = staffDepth(seconds);
  if (depth === 1) return { ...key, depth };
  if (depth <= junction) return { ...staffRail(step, depth / junction, vanishing, deck, spacing), depth };
  const exit = staffRail(step, 1, vanishing, deck, spacing);
  const t = (depth - junction) / (1 - junction);
  return { x: between(exit.x, key.x, t * t * (3 - 2 * t)), y: between(exit.y, key.y, t), depth };
}

export function drawStaff(ctx: CanvasRenderingContext2D, vanishing: Point, deck: Point, spacing: number, beat: number, spb: number, moving: boolean, left: number, right: number) {
  const path = (a: Point, b: Point) => { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); };
  const point = (step: number, z: number) => staffRail(step, z, vanishing, deck, spacing);
  const [a, b, c, d] = [point(-5.5, 0), point(5.5, 0), point(5.5, 1), point(-5.5, 1)];
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  ctx.fillStyle = '#241b35c9'; ctx.fill();
  const glow = ctx.createLinearGradient(0, vanishing.y, 0, deck.y);
  glow.addColorStop(0, '#f1c58f48'); glow.addColorStop(1, '#f1c58fbb');
  ctx.beginPath(); lines.forEach(step => path(point(step, 0), point(step, 1)));
  ctx.strokeStyle = glow; ctx.lineWidth = 1.6; ctx.stroke();
  if (moving) {
    for (let next = Math.ceil(beat); (next - beat) * spb <= approachSeconds; next++) {
      const z = staffDepth((next - beat) * spb) / junction;
      if (z > 1) continue;
      ctx.beginPath(); path(point(-4, z), point(4, z));
      ctx.strokeStyle = '#ffeac078'; ctx.lineWidth = .6 + z; ctx.stroke();
    }
  }
  ctx.beginPath(); path({x: left, y: deck.y}, {x: right, y: deck.y});
  ctx.lineWidth = 2; ctx.strokeStyle = '#f2c892'; ctx.stroke();
}

export function drawStaffNote(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, step: number, pitch: number, notated: boolean, spacing: number) {
  if (notated && Math.abs(step) >= 6) {
    // The rotated staff puts ledger lines along the direction of travel.
    ctx.beginPath();
    for (let i = 6; i <= Math.abs(step); i += 2) {
      const line = x + (Math.sign(step) * i - step) * spacing;
      ctx.moveTo(line, y - size * 1.05); ctx.lineTo(line, y + size * 1.05);
    }
    ctx.strokeStyle = '#f4d5a5'; ctx.lineWidth = 1.25; ctx.stroke();
  }
  ctx.fillStyle = '#eeffdc'; ctx.strokeStyle = '#d1f7cb';
  ctx.beginPath(); ctx.ellipse(x, y, size, size * .62, -.32, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + size * .82, y - 1); ctx.lineTo(x + size * .82, y - size * 2.05);
  ctx.lineWidth = Math.max(1, size * .19); ctx.stroke();
  if (notated && isBlack(pitch) && size >= 4) {
    ctx.font = `${Math.max(12, size * 1.7)}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText('♯', x, y - size * .9);
  }
}
